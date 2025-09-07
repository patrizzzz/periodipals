from flask import Blueprint, jsonify, request, session
from flask import Response
from firebase_admin import firestore, storage
from datetime import datetime
from utils.firebase_service import get_firestore
from functools import wraps
import string
import random
from werkzeug.utils import secure_filename

teacher_bp = Blueprint('teacher', __name__)

def teacher_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session or session['role'] != 'teacher':
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def validate_teacher_ownership(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session or session['role'] != 'teacher':
            return jsonify({'error': 'Unauthorized'}), 401

        resource_id = kwargs.get('resource_id')
        if resource_id:
            db = get_firestore()
            doc = db.collection('resources').document(resource_id).get()
            if not doc.exists or doc.to_dict().get('teacher_id') != session.get('uid'):
                return jsonify({'error': 'Resource not found or unauthorized'}), 404
        
        return f(*args, **kwargs)
    return decorated_function

def generate_teacher_code():
    """Generate a unique 8-character teacher code with prefix"""
    chars = string.ascii_uppercase + string.digits
    prefix = 'TCH'  # Teacher code prefix
    timestamp = datetime.now().strftime('%y%m')  # YearMonth
    
    while True:
        # Generate 3 random characters
        random_part = ''.join(random.choices(chars, k=3))
        code = f"{prefix}{timestamp}{random_part}"
        
        db = get_firestore()
        # Check if code already exists
        existing = db.collection('users').where('teacher_code', '==', code).get()
        if not len(list(existing)):
            # Index the code for faster lookups
            teacher_codes_ref = db.collection('teacher_codes')
            teacher_codes_ref.document(code).set({
                'created_at': firestore.SERVER_TIMESTAMP,
                'active': True
            })
            return code

@teacher_bp.route('/code/generate', methods=['POST'])
@teacher_required
def generate_new_code():
    """Generate a new teacher code for the current teacher"""
    try:
        db = get_firestore()
        teacher_id = session.get('uid')
        if not teacher_id:
            return jsonify({'error': 'Not authenticated'}), 401
            
        new_code = generate_teacher_code()
        teacher_ref = db.collection('users').document(teacher_id)
        
        # Update teacher document with new code
        teacher_ref.update({
            'teacher_code': new_code,
            'code_generated_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        
        # Store code in session for quick access
        session['teacher_code'] = new_code
        
        return jsonify({
            'success': True,
            'code': new_code
        })
    except Exception as e:
        print('Error generating teacher code:', e)
        return jsonify({'error': 'Failed to generate code'}), 500

@teacher_bp.route('/code/validate', methods=['POST'])
def validate_teacher_code():
    """Validate a teacher code and connect student to teacher"""
    try:
        data = request.get_json()
        if not data or 'code' not in data:
            return jsonify({'error': 'Please enter a teacher code'}), 400
            
        code = data['code'].strip()
        if not code:
            return jsonify({'error': 'Please enter a valid teacher code'}), 400

        db = get_firestore()
        
        # Check if code matches either teacher_code or username
        teachers = db.collection('users').where('role', '==', 'teacher')
        teachers = teachers.where('teacher_code', '==', code).get()
        
        if not list(teachers):
            # Try finding by username if no match for teacher_code
            teachers = db.collection('users').where('role', '==', 'teacher').where('username', '==', code).get()
        
        teacher_list = list(teachers)
        if not teacher_list:
            return jsonify({'error': 'Teacher not found. Please check the code/username and try again'}), 404
            
        teacher = teacher_list[0]
        teacher_data = teacher.to_dict()
        
        # If this is a student validating the code, link them to the teacher
        student_id = session.get('uid')
        if student_id and session.get('role') == 'student':
            student_ref = db.collection('users').document(student_id)
            student_ref.update({
                'teacher_id': teacher.id,
                'teacher_code': teacher_data.get('teacher_code'),
                'enrolled_at': firestore.SERVER_TIMESTAMP
            })
        
        return jsonify({
            'success': True,
            'teacher': {
                'id': teacher.id,
                'name': f"{teacher_data.get('firstName', '')} {teacher_data.get('lastName', '')}".strip() or teacher_data.get('username'),
                'email': teacher_data.get('email'),
                'code': teacher_data.get('teacher_code')
            }
        })
        
    except Exception as e:
        print('Error validating teacher code:', e)
        return jsonify({'error': 'Failed to validate code'}), 500

@teacher_bp.route('/students', methods=['GET'])
@teacher_required
def get_connected_students():
    """Get all students connected to current teacher"""
    try:
        db = get_firestore()
        teacher_id = session.get('uid')
        
        students = db.collection('users').where('teacher_id', '==', teacher_id).get()
        student_list = []
        
        for student in students:
            student_data = student.to_dict()
            student_list.append({
                'id': student.id,
                'name': f"{student_data.get('firstName', '')} {student_data.get('lastName', '')}".strip() or student_data.get('email', 'Unknown Student'),
                'email': student_data.get('email'),
                'lastActive': student_data.get('lastLogin', None),
                'progress': student_data.get('progress', {}),
                'age_group': student_data.get('age_group')
            })
            
        return jsonify({
            'success': True,
            'students': student_list
        })
    except Exception as e:
        print('Error fetching students:', e)
        return jsonify({
            'success': False,
            'error': 'Failed to fetch students',
            'students': []
        })

@teacher_bp.route('/students/progress', methods=['GET'])
@teacher_required
def get_students_progress():
    """Return detailed module-based progress per connected student.
    Response: { success: True, students: [ {id,name,email,badge,overall,modules:{moduleId: percent}} ] }
    """
    try:
        db = get_firestore()
        teacher_id = session.get('uid')
        students = db.collection('users').where('teacher_id', '==', teacher_id).get()

        def entry_to_percent(entry):
            try:
                if isinstance(entry, dict):
                    if entry.get('post_quiz_completed') is True:
                        return 100
                    if entry.get('percent') is not None:
                        return max(0, min(100, round(float(entry.get('percent') or 0))))
                    if entry.get('score') is not None:
                        return max(0, min(100, round(float(entry.get('score') or 0))))
                    if entry.get('pre_quiz_completed') is True:
                        return 50
                else:
                    return max(0, min(100, round(float(entry))))
            except Exception:
                return 0
            return 0

        results = []
        for s in students:
            data = s.to_dict() or {}
            prog = data.get('moduleProgress') or data.get('progress') or {}
            modules = {}
            if isinstance(prog, dict):
                for mk, mv in prog.items():
                    modules[str(mk)] = entry_to_percent(mv)
            vals = list(modules.values())
            overall = round(sum(vals)/len(vals)) if vals else 0
            results.append({
                'id': s.id,
                'name': f"{data.get('firstName','')} {data.get('lastName','')}".strip() or data.get('email',''),
                'email': data.get('email'),
                'badge': data.get('badge', 'none'),
                'overall': overall,
                'modules': modules
            })
        return jsonify({'success': True, 'students': results})
    except Exception as e:
        print('Error get_students_progress:', e)
        return jsonify({'success': True, 'students': []})

@teacher_bp.route('/students/progress/export', methods=['GET'])
@teacher_required
def export_students_progress_csv():
    """Export connected students' progress as CSV (Excel-compatible)."""
    try:
        db = get_firestore()
        teacher_id = session.get('uid')
        students = db.collection('users').where('teacher_id', '==', teacher_id).get()

        # Build rows
        rows = []
        header = ['Student Name', 'Email', 'Overall %', 'Badge', 'Modules JSON']
        # Map module ids to human-readable names
        module_names = {
            '1': 'Puberty Basics',
            '2': 'Reproductive System',
            '3': 'Hygiene & Health',
            '5': 'Menstrual Cycle',
            '6': 'Pre Menstrual Syndrome',
            '7': 'Adolescent Health'
        }
        for s in students:
            data = s.to_dict() or {}
            # Compute overall similar to get_students_progress
            prog = data.get('moduleProgress') or data.get('progress') or {}
            def entry_to_percent(entry):
                try:
                    if isinstance(entry, dict):
                        if entry.get('post_quiz_completed') is True:
                            return 100
                        if entry.get('percent') is not None:
                            return max(0, min(100, round(float(entry.get('percent') or 0))))
                        if entry.get('score') is not None:
                            return max(0, min(100, round(float(entry.get('score') or 0))))
                        if entry.get('pre_quiz_completed') is True:
                            return 50
                    else:
                        return max(0, min(100, round(float(entry))))
                except Exception:
                    return 0
                return 0
            modules = {}
            if isinstance(prog, dict):
                for mk, mv in prog.items():
                    modules[str(mk)] = entry_to_percent(mv)
            vals = list(modules.values())
            overall = round(sum(vals)/len(vals)) if vals else 0
            # Convert module ids to names for export readability
            modules_named = {}
            for mk, pct in modules.items():
                key = module_names.get(str(mk), f'Module {mk}')
                modules_named[key] = pct
            name = f"{data.get('firstName','')} {data.get('lastName','')}".strip() or data.get('email','')
            email = data.get('email','')
            badge = data.get('badge','none')
            import json as _json
            rows.append([name, email, str(overall), badge, _json.dumps(modules_named, ensure_ascii=False)])

        # Serialize CSV
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(header)
        for r in rows:
            writer.writerow(r)
        csv_data = output.getvalue()
        output.close()

        filename = 'students_progress_report.csv'
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename={filename}'
            }
        )
    except Exception as e:
        print('export_students_progress_csv error:', e)
        return jsonify({'error': 'Failed to generate report'}), 500

@teacher_bp.route('/quizzes', methods=['GET'])
@teacher_required
def list_teacher_quizzes():
    """Return quizzes created by the current teacher for dashboard stats.
    Response: { success: True, quizzes: [ {id, status, passingScore, createdAt} ] }
    """
    try:
        db = get_firestore()
        teacher_id = session.get('uid')
        quizzes_ref = db.collection('activities').where('teacherId', '==', teacher_id).where('type', '==', 'quiz')
        quizzes = []
        for d in quizzes_ref.stream():
            q = d.to_dict() or {}
            quizzes.append({
                'id': d.id,
                'status': q.get('status', 'draft'),
                'passingScore': int(q.get('passingScore') or 0),
                'createdAt': q.get('createdAt').isoformat() if hasattr(q.get('createdAt'), 'isoformat') else str(q.get('createdAt'))
            })
        return jsonify({'success': True, 'quizzes': quizzes})
    except Exception as e:
        print('Error list_teacher_quizzes:', e)
        return jsonify({'success': True, 'quizzes': []})

@teacher_bp.route('/students/badge', methods=['POST'])
@teacher_required
def assign_student_badge():
    try:
        db = get_firestore()
        data = request.get_json(silent=True) or {}
        student_id = str(data.get('student_id', '')).strip()
        badge = str(data.get('badge', 'none')).strip()
        if not student_id:
            return jsonify({'success': False, 'error': 'student_id required'}), 400
        ref = db.collection('users').document(student_id)
        # Fetch existing to append to badges history
        snap = ref.get()
        if not snap.exists:
            return jsonify({'success': False, 'error': 'student not found'}), 404

        doc = snap.to_dict() or {}
        badges_hist = doc.get('badges') if isinstance(doc.get('badges'), list) else []
        # Append teacher assignment to history (keep history even if same level assigned repeatedly)
        from datetime import datetime
        new_entry = {
            'name': badge,
            'reason': 'Awarded by teacher',
            'assigned_at': datetime.utcnow().isoformat()
        }
        badges_hist.append(new_entry)

        ref.set({
            'badge': badge,
            'badge_updated_at': firestore.SERVER_TIMESTAMP,
            'badges': badges_hist
        }, merge=True)
        return jsonify({'success': True})
    except Exception as e:
        print('Error assign_student_badge:', e)
        return jsonify({'success': False}), 500

@teacher_bp.route('/resources', methods=['GET'])
@teacher_required
def get_teacher_resources():
    try:
        db = get_firestore()
        uid = session.get('uid')
        student_teacher_id = None
        
        # If student is requesting, get their teacher_id
        if session.get('role') == 'student':
            student_doc = db.collection('users').document(uid).get()
            if student_doc.exists:
                student_data = student_doc.to_dict()
                student_teacher_id = student_data.get('teacher_id')
        
        resources_ref = db.collection('resources')
        resources = []
        
        # If we have a teacher ID (either from student's teacher or current teacher)
        teacher_id = student_teacher_id or uid
        print('Checking resources for teacher_id:', teacher_id)
        if teacher_id:
            query = resources_ref.where('teacher_id', '==', teacher_id)
            for doc in query.stream():
                resource_data = doc.to_dict()
                # Ensure all fields are properly typed
                resource = {
                    'id': doc.id,
                    'title': str(resource_data.get('title', '')),
                    'description': str(resource_data.get('description', '')),
                    'type': str(resource_data.get('type', 'file')),
                    'url': str(resource_data.get('url', '')),
                    'file_url': str(resource_data.get('file_url', '')),
                    'content': str(resource_data.get('content', '')),
                    'interactiveElements': resource_data.get('interactiveElements', []),
                    'interactiveContent': resource_data.get('interactiveContent', {}),
                    'quizzes': resource_data.get('quizzes', []),
                    'polls': resource_data.get('polls', []),
                    'teacher_id': str(resource_data.get('teacher_id', '')),
                    'created_at': resource_data.get('created_at', '').isoformat() if isinstance(resource_data.get('created_at'), datetime) else str(resource_data.get('created_at', '')),
                    'published': bool(resource_data.get('published', False)),
                    'visible_to': resource_data.get('visible_to', [])
                }
                resources.append(resource)
            print(f'Found resource: {resources[0]["title"] if resources else "No resources"} for teacher {teacher_id}')
            return jsonify({'success': True, 'resources': resources})
        else:
            return jsonify({'success': False, 'error': 'No teacher ID found'}), 400
            
    except Exception as e:
        print('Error fetching resources:', e)
        return jsonify({'success': False, 'error': str(e)}), 500

@teacher_bp.route('/resources', methods=['POST'])
@teacher_required
def create_teacher_resource():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Debug: Log the received data
        print('Received resource data:', data)
        print('Interactive elements received:', data.get('interactiveElements', []))
        print('Type of interactive elements:', type(data.get('interactiveElements', [])))
        print('Length of interactive elements:', len(data.get('interactiveElements', [])))
            
        required_fields = ['title', 'type', 'content']
        missing = [field for field in required_fields if field not in data or not str(data[field]).strip()]
        if missing:
            return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

        if data['type'] == 'link' and (not data.get('url') or not data['url'].strip()):
            return jsonify({'error': 'URL is required for link type resources'}), 400

        resource = {
            'teacher_id': session.get('uid'),
            'title': data['title'].strip(),
            'description': data.get('description', '').strip(),
            'content': data['content'].strip(),
            'type': data['type'],
            'url': data.get('url', '').strip() if data['type'] == 'link' else '',
            # Default to draft on creation
            'published': bool(data.get('published', False)),
            # Students this resource is visible to (empty means not assigned)
            'visible_to': data.get('visible_to', []),
            'interactiveElements': data.get('interactiveElements', []),
            'interactiveContent': data.get('interactiveContent', {}),
            'quizzes': data.get('quizzes', []),
            'polls': data.get('polls', []),
            'created_at': firestore.SERVER_TIMESTAMP
        }

        # Debug: Log the interactive elements being saved
        print('Saving interactive elements:', data.get('interactiveElements', []))

        # Save to Firestore
        db = get_firestore()
        doc_ref = db.collection('resources').document()
        doc_ref.set(resource)

        resource['id'] = doc_ref.id
        resource['created_at'] = datetime.now().isoformat()

        # Create notifications for linked students (draft created)
        try:
            teacher_id = session.get('uid')
            students = db.collection('users').where('teacher_id', '==', teacher_id).get()
            for s in students:
                nref = db.collection('notifications').document()
                nref.set({
                    'user_id': s.id,
                    'teacher_id': teacher_id,
                    'type': 'resource_created',
                    'title': resource['title'],
                    'resource_id': doc_ref.id,
                    'read': False,
                    'created_at': firestore.SERVER_TIMESTAMP
                })
        except Exception as nerr:
            print('Notification create error:', nerr)

        return jsonify({'success': True, 'resource': resource})

    except Exception as e:
        print('Error creating resource:', e)
        return jsonify({'error': str(e)}), 500

@teacher_bp.route('/resources/<resource_id>', methods=['PUT'])
@teacher_required
@validate_teacher_ownership
def update_teacher_resource(resource_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No update data provided'}), 400

        db = get_firestore()
        doc_ref = db.collection('resources').document(resource_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({'error': 'Resource not found'}), 404
            
        resource = doc.to_dict()
        
        update_data = {
            'title': data.get('title', resource['title']),
            'description': data.get('description', resource.get('description', '')),
            'type': data.get('type', resource['type']),
            'url': data.get('url', resource.get('url', '')),
            'published': data.get('published', resource.get('published', False)),
            'visible_to': data.get('visible_to', resource.get('visible_to', [])),
            'updated_at': firestore.SERVER_TIMESTAMP
        }

        doc_ref.update(update_data)
        
        update_data['id'] = resource_id
        update_data['created_at'] = resource.get('created_at')
        update_data['updated_at'] = datetime.now().isoformat()

        return jsonify({
            'message': 'Resource updated successfully',
            'resource': update_data
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teacher_bp.route('/notifications', methods=['GET'])
def get_notifications():
    try:
        db = get_firestore()
        uid = session.get('uid')
        if not uid:
            return jsonify({'success': True, 'notifications': []})
        query = db.collection('notifications').where('user_id', '==', uid).order_by('created_at', direction=firestore.Query.DESCENDING).limit(20)
        items = []
        for doc in query.stream():
            d = doc.to_dict()
            items.append({
                'id': doc.id,
                'type': d.get('type'),
                'title': d.get('title'),
                'resource_id': d.get('resource_id'),
                'read': bool(d.get('read', False)),
                'created_at': d.get('created_at', '').isoformat() if isinstance(d.get('created_at'), datetime) else str(d.get('created_at', '')),
            })
        return jsonify({'success': True, 'notifications': items})
    except Exception as e:
        print('Error fetching notifications:', e)
        return jsonify({'success': True, 'notifications': []})

@teacher_bp.route('/notifications/<notif_id>/read', methods=['POST'])
def mark_notification_read(notif_id):
    try:
        db = get_firestore()
        uid = session.get('uid')
        if not uid:
            return jsonify({'success': False}), 401
        ref = db.collection('notifications').document(notif_id)
        ref.update({'read': True, 'updated_at': firestore.SERVER_TIMESTAMP})
        return jsonify({'success': True})
    except Exception as e:
        print('Error marking notification read:', e)
        return jsonify({'success': False}), 500

@teacher_bp.route('/resources/<resource_id>', methods=['DELETE'])
@teacher_required
@validate_teacher_ownership
def delete_teacher_resource(resource_id):
    try:
        db = get_firestore()
        doc_ref = db.collection('resources').document(resource_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({'error': 'Resource not found'}), 404

        doc_ref.delete()

        return jsonify({
            'message': 'Resource deleted successfully',
            'id': resource_id
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teacher_bp.route('/resources/<resource_id>/publish', methods=['POST'])
@teacher_required
@validate_teacher_ownership
def publish_resource(resource_id):
    try:
        data = request.get_json(silent=True) or {}
        student_ids = data.get('student_ids', [])
        if not isinstance(student_ids, list):
            student_ids = []
        # Coerce to strings and dedupe
        student_ids = [str(sid) for sid in student_ids if sid]
        student_ids = list(dict.fromkeys(student_ids))

        db = get_firestore()
        doc_ref = db.collection('resources').document(resource_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({'error': 'Resource not found'}), 404

        update_data = {
            'published': True,
            'visible_to': student_ids,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        # Ensure fields exist even if previously missing
        doc_ref.update(update_data)

        # Notify assigned students
        try:
            for sid in student_ids:
                nref = db.collection('notifications').document()
                nref.set({
                    'user_id': sid,
                    'type': 'resource_published',
                    'resource_id': resource_id,
                    'read': False,
                    'created_at': firestore.SERVER_TIMESTAMP
                })
        except Exception as nerr:
            print('Notification publish error:', nerr)

        # Build a JSON-safe payload (avoid returning Firestore sentinels)
        return jsonify({'success': True, 'resource': {
            'id': resource_id,
            'published': True,
            'visible_to': student_ids,
            'updated_at': datetime.now().isoformat()
        }})
    except Exception as e:
        print('Error publishing resource:', e)
        return jsonify({'error': 'Failed to publish resource'}), 500

@teacher_bp.route('/quizzes', methods=['GET'])
@teacher_required
def get_teacher_quizzes():
    try:
        db = get_firestore()
        uid = session.get('uid')
        
        quizzes = db.collection('quizzes').where('teacher_id', '==', uid).get()
        quiz_list = []
        
        for quiz in quizzes:
            data = quiz.to_dict()
            quiz_list.append({
                'id': quiz.id,
                **data
            })
            
        return jsonify({
            'success': True,
            'quizzes': quiz_list
        })
    except Exception as e:
        print('Error fetching quizzes:', e)
        return jsonify({
            'success': False,
            'error': 'Failed to fetch quizzes',
            'quizzes': []
        })

@teacher_bp.route('/quizzes/<quiz_id>/stats', methods=['GET'])
@teacher_required
def get_quiz_statistics(quiz_id):
    try:
        db = get_firestore()
        quiz_ref = db.collection('activities').document(quiz_id)
        quiz = quiz_ref.get()
        
        if not quiz.exists:
            return jsonify({'error': 'Quiz not found'}), 404
            
        quiz_data = quiz.to_dict()
        submissions = quiz_data.get('submissions', [])
        
        # Calculate statistics
        total_attempts = len(submissions)
        passed_count = sum(1 for sub in submissions if sub.get('score', 0) >= quiz_data.get('passingScore', 70))
        avg_score = sum(sub.get('score', 0) for sub in submissions) / total_attempts if total_attempts > 0 else 0
        
        return jsonify({
            'success': True,
            'stats': {
                'totalAttempts': total_attempts,
                'passedCount': passed_count,
                'averageScore': round(avg_score, 2),
                'latestSubmission': sorted([sub.get('submittedAt') for sub in submissions])[-1] if submissions else None
            }
        })
        
    except Exception as e:
        print('Error fetching quiz statistics:', e)
        return jsonify({'error': str(e)}), 500