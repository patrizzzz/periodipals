from flask import Blueprint, render_template, session, redirect, url_for, request
from utils.quiz_handler import get_quiz_data, convert_to_numeric_id
from functools import wraps
from flask import flash, abort
from utils.firebase_service import get_user_record

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    return render_template('index.html')

@main_bp.route('/register')
def register():
    return render_template('register.html')

@main_bp.route('/menu')
def menu():
    return render_template('menu.html', ageGroup=session.get('age_group'))
@main_bp.route('/learning-materials')
def learning_materials():
    return render_template('learning_materials.html')
    
@main_bp.route('/quiz/<module_id>/<quiz_type>', methods=['GET', 'POST'])
def quiz(module_id, quiz_type):
    try:
        numeric_id = convert_to_numeric_id(module_id)
        if not numeric_id:
            print(f"Invalid module_id: {module_id}")
            return render_template('404.html'), 404

        print(f"Fetching quiz data for module {numeric_id}, type {quiz_type}")
        quiz_data = get_quiz_data(numeric_id, quiz_type)
        if not quiz_data:
            print(f"No quiz data found for module {numeric_id}, type {quiz_type}")
            return render_template('404.html'), 404
        
        print(f"Successfully loaded quiz data: {quiz_data['title']}")
    except Exception as e:
        print(f"Error loading quiz: {e}")
        return render_template('404.html'), 404

    if request.method == 'POST':
        # Ensure we set the canonical session keys other handlers expect:
        # - pre quizzes use 'module_<id>_pre_quiz'
        # - post quizzes use 'module_<id>_post_quiz'
        sess_key = f'module_{numeric_id}_pre_quiz' if quiz_type == 'pre' else f'module_{numeric_id}_post_quiz'
        session[sess_key] = True
        print(f"Setting session key {sess_key} to True")
        print(f"Current session: {dict(session)}")

        # Also update the structured session['user_progress'] so API /api/progress and
        # client-side guards can rely on a consistent nested shape: { '<module_id>': { 'pre_quiz_completed': True } }
        try:
            up = session.get('user_progress') or {}
            # normalize module key to string
            mid = str(numeric_id)
            mod_entry = up.get(mid) if isinstance(up, dict) else None
            if not isinstance(mod_entry, dict):
                mod_entry = {}
            if quiz_type == 'pre':
                mod_entry['pre_quiz_completed'] = True
            else:
                mod_entry['post_quiz_completed'] = True
            up[mid] = mod_entry
            session['user_progress'] = up
            print('Updated session["user_progress"] for module', mid, session['user_progress'].get(mid))
        except Exception as e:
            print('Failed to update session user_progress:', e)

        # Try to update Firestore server-side progress if we have a uid in session
        try:
            uid = session.get('uid')
            if uid:
                try:
                    from utils.firebase_service import update_user_progress
                    # collect score if present in form
                    score = None
                    try:
                        score = float(request.form.get('score') or request.form.get('score', type=float) or 0)
                    except Exception:
                        # attempt to parse JSON body
                        try:
                            j = request.get_json(silent=True) or {}
                            score = float(j.get('score')) if j.get('score') is not None else None
                        except Exception:
                            score = None

                    progress_update = {}
                    if quiz_type == 'pre':
                        progress_update['pre_quiz_completed'] = True
                        if score is not None:
                            progress_update['pre_quiz_score'] = score
                    else:
                        progress_update['post_quiz_completed'] = True
                        if score is not None:
                            progress_update['post_quiz_score'] = score

                    if progress_update:
                        ok = update_user_progress(uid, numeric_id, progress_update)
                        print('update_user_progress called, result=', ok)
                except Exception as e:
                    print('Failed to call update_user_progress:', e)
        except Exception as e:
            print('Error while attempting Firestore update:', e)

        # Return JSON containing a server-side canonical redirect target so client follows it
        redirect_target = url_for('main.module_page', module_id=numeric_id) if quiz_type == 'pre' else url_for('main.menu')
        return {'status': 'success', 'redirect': redirect_target}

    if quiz_type == 'post' and numeric_id in {1, 2, 3, 5, 6, 7}:
        pre_quiz_key = f'module_{numeric_id}_pre_quiz'
        user_progress = session.get('user_progress', {})
        # Debug log user_progress seen in session
        print('DEBUG: session user_progress type:', type(user_progress), 'content keys sample:', list(user_progress.keys())[:5])
        # Try both string and numeric keys for module progress
        module_progress = user_progress.get(str(numeric_id), user_progress.get(numeric_id, {}))
        print('DEBUG: module_progress for', numeric_id, '->', module_progress)
        pre_quiz_completed = _pre_quiz_completed_from(module_progress)
        print('DEBUG: determined pre_quiz_completed =', pre_quiz_completed)
        if not (session.get(pre_quiz_key, False) or pre_quiz_completed):
            return redirect(url_for('main.quiz', module_id=numeric_id, quiz_type='pre'))

    return render_template('quiz.html', quiz=quiz_data, module_id=numeric_id, quiz_type=quiz_type)

@main_bp.route('/module/<module_id>')
def module_page(module_id):
    numeric_id = convert_to_numeric_id(module_id)
    if not numeric_id:
        return redirect(url_for('main.page_not_found'))

    # Check Firebase progress first for pre-quiz completion
    uid = session.get('uid')
    pre_quiz_done = False
    if uid:
        try:
            from utils.firebase_service import get_user_progress
            progress = get_user_progress(uid)
            module_progress = progress.get(str(numeric_id), {})
            if isinstance(module_progress, dict):
                # Check explicit pre_quiz_completed flag or legacy score
                pre_quiz_done = (
                    module_progress.get('pre_quiz_completed') is True or
                    (isinstance(module_progress.get('pre_quiz_score'), (int, float)) and 
                     module_progress['pre_quiz_score'] > 0)
                )
        except Exception as e:
            print(f'Failed to check Firebase progress: {e}')

    # Fallback to session check if not found in Firebase
    if not pre_quiz_done:
        pre_quiz_done = session.get(f'module_{numeric_id}_pre_quiz', False)

    post_quiz_done = session.get(f'module_{numeric_id}_post_quiz', False)
    
    # Check age restriction for AHS module (17+ allowed, supports various stored formats)
    if numeric_id == 7:
        age_val = str(session.get('age_group') or '').strip()
        is_allowed = False
        # Try to parse a leading integer (e.g., "17-19", "18+", "19")
        try:
            num = int(''.join(ch for ch in age_val if ch.isdigit())[:2] or '0')
            if num >= 17:
                is_allowed = True
        except Exception:
            is_allowed = False
        # Fallback: accept common textual forms
        if age_val in {'17-19', '17-18', '18-19', '18+', '19+', '17+', '17', '18', '19'}:
            is_allowed = True
        if not is_allowed:
            return render_template('404.html'), 404

    template_map = {
        1: 'puberty.html',
        2: 'reproductive_system.html',
        3: 'handwashing.html',
        5: 'menstrual_cycle.html',
        6: 'pms_lesson.html',
        7: 'AHS.html'
    }

    module_names = {
        1: 'puberty',
        2: 'reproductive-system',
        3: 'handwashing',
        5: 'menstrual-cycle',
        6: 'pms',
        7: 'ahs'
    }

    template_name = template_map.get(numeric_id)
    if not template_name:
        return render_template('404.html'), 404

    # If pre-quiz not completed, redirect to pre-quiz
    if not pre_quiz_done:
        return redirect(url_for('main.quiz', module_id=numeric_id, quiz_type='pre'))

    module_name = module_names.get(numeric_id, str(numeric_id))
    should_show_quiz = pre_quiz_done and not post_quiz_done
    
    return render_template(
        template_name,
        module_id=module_name,
        post_quiz_available=should_show_quiz
    )

@main_bp.route('/offline')
def offline():
    return render_template('offline.html')

@main_bp.route('/mini-games')
def mini_games():
    return render_template('mini_games.html')

@main_bp.route('/mini-games/handwashing-dragdrop')
def handwashing_dragdrop():
    return render_template('handwashing_dragdrop.html')

@main_bp.route('/mini-games/fourpics')
def fourpics_game():
    return render_template('fourpics.html')

@main_bp.route('/mini-games/crossword')
def crossword_game():
    return render_template('crossword.html')

@main_bp.route('/set_age_group', methods=['POST'])
def set_age_group():
    age_group = request.form.get('age_group') or request.json.get('age_group')
    if age_group:
        session['age_group'] = age_group
        print(f"Set session age_group: {age_group}")
        return redirect(url_for('main.menu'))
    return redirect(url_for('main.home'))


@main_bp.route('/logout')
def logout():
    """Clear Flask session fully on logout to prevent stale progress from persisting."""
    session.clear()
    print('Session cleared on logout')
    return redirect(url_for('main.home'))


@main_bp.route('/api/register', methods=['POST'])
def register_user():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        age_group = data.get('age_group')
        role = data.get('role', 'student')  # Default to student if not specified
        
        if not all([email, password, age_group]):
            return {'error': 'Missing required fields'}, 400

        # Store registration data in session
        session['email'] = email
        session['age_group'] = age_group
        session['role'] = role

        # Ensure a Firestore user document exists for this email with empty progress
        try:
            from utils.firebase_service import create_user_doc
            create_user_doc(email, age_group, role=role)
        except Exception as e:
            print('Failed to create user doc in Firestore:', e)

        return {'success': True, 'message': 'Registration successful'}, 200
    except Exception as e:
        return {'error': str(e)}, 500

# Decorators for role-based access
def teacher_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        uid = session.get('uid')
        if not uid:
            flash('Please log in first', 'error')
            return redirect(url_for('main.home'))
        
        user_data = get_user_record(uid)
        if not user_data or user_data.get('role') != 'teacher':
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

@main_bp.route('/student/dashboard')
def student_dashboard():
    return render_template('menu.html', ageGroup=session.get('age_group'))

@main_bp.route('/teacher/dashboard')
@teacher_required
def teacher_dashboard():
    uid = session.get('uid')
    user_data = get_user_record(uid)
    return render_template('teacher/dashboard.html', 
                         teacher_name=user_data.get('email', 'Teacher'),
                         teacher_code=user_data.get('teacher_code', 'No code assigned'),
                         active_page='dashboard')

@main_bp.route('/teacher/resources')
@teacher_required
def teacher_resources():
    uid = session.get('uid')
    user_data = get_user_record(uid)
    return render_template('teacher/resources.html',
                         teacher_name=user_data.get('email', 'Teacher'),
                         active_page='resources')

@main_bp.route('/teacher/quizzes')
@teacher_required
def teacher_quizzes():
    uid = session.get('uid')
    user_data = get_user_record(uid)
    return render_template('teacher/quizzes.html',
                         teacher_name=user_data.get('email', 'Teacher'),
                         active_page='quizzes')

@main_bp.route('/teacher/progress')
@teacher_required
def teacher_progress():
    uid = session.get('uid')
    user_data = get_user_record(uid)
    return render_template('teacher/progress.html',
                         teacher_name=user_data.get('email', 'Teacher'),
                         active_page='progress')

@main_bp.route('/student/profile')
def student_profile():
    uid = session.get('uid')
    if not uid:
        return redirect(url_for('main.home'))
        
    user_data = get_user_record(uid)
    return render_template('student/profile.html', 
                         teacher_name=user_data.get('teacher_name') if user_data else None)

@main_bp.route('/class-activities')
def class_activities():
    if 'uid' not in session:
        return redirect(url_for('main.home'))
    return render_template('class_activities.html')

# Helper: robustly determine if pre-quiz was completed from a module progress object
def _pre_quiz_completed_from(progress_obj):
    try:
        # Only accept an explicit boolean True from server-side progress.
        # This avoids treating missing/undefined/partial objects as completed and prevents redirect loops.
        if isinstance(progress_obj, bool):
            return progress_obj is True
        if not isinstance(progress_obj, dict):
            return False
        # Direct boolean field required
        if 'pre_quiz_completed' in progress_obj and progress_obj.get('pre_quiz_completed') is True:
            return True
        # Also accept legacy field name if it exists and is exactly True
        if 'preQuizCompleted' in progress_obj and progress_obj.get('preQuizCompleted') is True:
            return True
        return False
    except Exception:
        return False