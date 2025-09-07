from flask import Blueprint, jsonify, request, session, current_app, redirect, url_for
from datetime import datetime
from utils.database import get_db
from utils.firebase_service import get_firestore
from firebase_admin import storage, firestore
from werkzeug.utils import secure_filename
import os
import sqlite3
import requests
import random
import string

api_bp = Blueprint('api', __name__)

def get_storage_bucket():
    """Get Firebase storage bucket"""
    return storage.bucket('menstrual-hygiene-manage-6b0ed.appspot.com')

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or 'AIzaSyBAcRt9UQnBlHc-k6OG7RNlC22b2tuOqw4'
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

# Student profile routes
@api_bp.route('/student/profile', methods=['GET', 'PUT'])
def student_profile():
    if not session.get('uid'):
        return jsonify({'error': 'Not authorized'}), 401

    db = get_firestore()
    user_ref = db.collection('users').document(session['uid'])
    
    if request.method == 'GET':
        try:
            doc = user_ref.get()
            if not doc.exists:
                return jsonify({'error': 'User not found'}), 404
                
            user_data = doc.to_dict()
            profile_data = {
                'first_name': user_data.get('first_name', ''),
                'middle_initial': user_data.get('middle_initial', ''),
                'last_name': user_data.get('last_name', ''),
                'age': user_data.get('age', ''),
                'teacher_name': user_data.get('teacher_name', '')
            }
            return jsonify({'success': True, 'profile': profile_data})
            
        except Exception as e:
            print('Error fetching profile:', e)
            return jsonify({'error': 'Failed to load profile'}), 500
            
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            updates = {
                'first_name': data.get('firstName', ''),
                'middle_initial': data.get('middleInitial', ''),
                'last_name': data.get('lastName', ''),
                'age': data.get('age', ''),
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            
            user_ref.update(updates)
            return jsonify({'success': True, 'message': 'Profile updated successfully'})
            
        except Exception as e:
            print('Error updating profile:', e)
            return jsonify({'error': 'Failed to update profile'}), 500

@api_bp.route('/student/achievements', methods=['GET'])
def student_achievements():
    """Return badges/achievements assigned to the current student.
    Response shape: { success: True, badges: [...], current_badge: str, updated_at: isoString }
    Supports legacy schema where a single 'badge' string is stored on the user document.
    """
    try:
        if not session.get('uid'):
            return jsonify({'error': 'Not authorized'}), 401

        db = get_firestore()
        user_ref = db.collection('users').document(session['uid'])
        snap = user_ref.get()
        if not snap.exists:
            return jsonify({'success': True, 'badges': []})

        data = snap.to_dict() or {}
        # Support two shapes: single badge string, or badges array of objects
        current_badge = data.get('badge') or data.get('current_badge') or 'none'
        updated_at = data.get('badge_updated_at')
        try:
            # Convert Firestore timestamp to iso string if present
            updated_iso = updated_at.isoformat() if hasattr(updated_at, 'isoformat') else None
        except Exception:
            updated_iso = None

        badges = []
        if isinstance(data.get('badges'), list):
            for b in data.get('badges'):
                if isinstance(b, dict):
                    ts = b.get('assigned_at')
                    try:
                        ts_iso = ts.isoformat() if hasattr(ts, 'isoformat') else (str(ts) if ts else None)
                    except Exception:
                        ts_iso = None
                    badges.append({
                        'name': str(b.get('name', '')),
                        'reason': str(b.get('reason', '')),
                        'assigned_at': ts_iso
                    })
                else:
                    badges.append({'name': str(b)})
        # Always include current_badge as well if set and not already present
        if current_badge and current_badge != 'none':
            exists = any((isinstance(x, dict) and str(x.get('name','')).lower() == str(current_badge).lower()) or (isinstance(x, str) and x.lower() == str(current_badge).lower()) for x in badges)
            if not exists:
                badges.insert(0, {
                    'name': str(current_badge),
                    'reason': 'Awarded by teacher',
                    'assigned_at': updated_iso
                })

        return jsonify({
            'success': True,
            'badges': badges,
            'current_badge': str(current_badge),
            'updated_at': updated_iso
        })
    except Exception as e:
        print('student_achievements error:', e)
        return jsonify({'success': True, 'badges': []})

    db = get_firestore()
    user_ref = db.collection('users').document(session['uid'])
    
    if request.method == 'GET':
        try:
            doc = user_ref.get()
            if not doc.exists:
                return jsonify({'error': 'User not found'}), 404
                
            user_data = doc.to_dict()
            profile_data = {
                'first_name': user_data.get('first_name', ''),
                'middle_initial': user_data.get('middle_initial', ''),
                'last_name': user_data.get('last_name', ''),
                'age': user_data.get('age', ''),
                'teacher_name': user_data.get('teacher_name', '')
            }
            return jsonify({'success': True, 'profile': profile_data})
        except Exception as e:
            print('Error fetching profile:', e)
            return jsonify({'error': 'Failed to load profile'}), 500

    db = get_firestore()
    user_ref = db.collection('users').document(session['uid'])
    
    if request.method == 'GET':
        try:
            user = user_ref.get()
            if not user.exists:
                return jsonify({'error': 'Profile not found'}), 404
                
            data = user.to_dict()
            # Get teacher name if connected
            teacher_name = None
            if data.get('teacher_id'):
                teacher = db.collection('users').document(data['teacher_id']).get()
                if teacher.exists:
                    teacher_name = teacher.to_dict().get('email')

            return jsonify({
                'success': True,
                'profile': {
                    'first_name': data.get('first_name', ''),
                    'middle_initial': data.get('middle_initial', ''),
                    'last_name': data.get('last_name', ''),
                    'age': data.get('age', ''),
                    'teacher_name': teacher_name
                }
            })
        except Exception as e:
            print('Error getting profile:', e)
            return jsonify({'error': 'Failed to load profile'}), 500

    elif request.method == 'PUT':
        try:
            data = request.get_json()
            
            # Validate required fields
            required = ['firstName', 'lastName', 'age']
            if not all(data.get(field) for field in required):
                return jsonify({'error': 'Missing required fields'}), 400

            # Update profile
            update_data = {
                'first_name': data['firstName'],
                'middle_initial': data.get('middleInitial', ''),
                'last_name': data['lastName'],
                'age': int(data['age']),
                'updated_at': firestore.SERVER_TIMESTAMP
            }

            user_ref.update(update_data)
            return jsonify({'success': True, 'message': 'Profile updated successfully'})
            
        except Exception as e:
            print('Error updating profile:', e)
            return jsonify({'error': 'Failed to update profile'}), 500

@api_bp.route('/student/connect', methods=['POST'])
def connect_student_teacher():
    if not session.get('uid'):
        return jsonify({'error': 'Not authorized'}), 401

    try:
        data = request.get_json()
        code = data.get('teacher_code', '').upper()
        
        if not code:
            return jsonify({'error': 'Please provide a teacher code'}), 400

        db = get_firestore()
        # Find teacher by code
        teachers = db.collection('users').where('teacher_code', '==', code).where('role', '==', 'teacher').limit(1).get()
        
        if not teachers:
            return jsonify({'error': 'Invalid teacher code'}), 404

        teacher = teachers[0]
        teacher_data = teacher.to_dict()

        # Update student's teacher_id
        student_ref = db.collection('users').document(session['uid'])
        student_ref.update({
            'teacher_id': teacher.id,
            'teacher_name': teacher_data.get('email'),  # or name if available
            'connected_at': firestore.SERVER_TIMESTAMP
        })

        return jsonify({
            'success': True,
            'teacher_name': teacher_data.get('email'),
            'message': 'Successfully connected to teacher'
        })

    except Exception as e:
        print('Error connecting to teacher:', e)
        return jsonify({'error': 'Failed to connect to teacher'}), 500

def generate_teacher_code():
    """Generate a unique 6-character teacher code"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        # Check if code exists
        db = get_firestore()
        existing = db.collection('users').where('teacher_code', '==', code).get()
        if not existing:
            return code

@api_bp.route('/lesson_info/<module_name>/<organ_name>')
def lesson_info_api(module_name, organ_name):
    try:
        if not os.path.exists('lesson_info.db'):
            return jsonify({"error": "Database not found"}), 500
        
        conn = sqlite3.connect('lesson_info.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT title, description, key_points, icon_class FROM lesson_info
            WHERE LOWER(module_name) = LOWER(?) AND LOWER(organ_name) = LOWER(?)
        ''', (module_name, organ_name))
        row = cursor.fetchone()
        
        conn.close()
        
        if not row:
            return jsonify({"error": "No info found"}), 404
        
        title, description, key_points, icon_class = row
        key_points_list = [point.strip() for point in key_points.split('\n') if point.strip()] if key_points else []
        
        return jsonify({
            "title": title,
            "description": description,
            "key_points": key_points_list,
            "icon_class": icon_class or "fa-info-circle"
        })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/save_quiz', methods=['POST'])
def save_quiz():
    data = request.json
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO quiz_results 
            (firebase_id, user_id, quiz_data, synced, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.get('firebaseId'),
            data.get('userId'),
            str(data.get('quizData')),
            True,
            datetime.now().isoformat()
        ))
        db.commit()
        return jsonify({"success": True, "id": cursor.lastrowid})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@api_bp.route('/get_unsynced_data')
def get_unsynced_data():
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM quiz_results WHERE synced = 0")
        unsynced_quizzes = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM user_progress WHERE synced = 0")
        unsynced_progress = [dict(row) for row in cursor.fetchall()]
        
        result = []
        for quiz in unsynced_quizzes:
            result.append({"type": "quiz", "data": quiz})
        for progress in unsynced_progress:
            result.append({"type": "progress", "data": progress})
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@api_bp.route('/progress', methods=['GET'])
def api_progress():
    try:
        # Prefer authoritative server-side Firestore progress for the logged-in UID
        uid = session.get('uid')
        server_progress = {}
        if uid:
            try:
                from utils.firebase_service import get_user_progress, award_badge, map_module_to_badge
                server_progress = get_user_progress(uid) or {}
                # normalize keys to strings
                if isinstance(server_progress, dict):
                    server_progress = {str(k): v for k, v in server_progress.items()}
                # cache the normalized progress in session for quick access
                session['user_progress'] = server_progress
                # Award badges for any modules that are completed but not yet awarded
                try:
                    for mid, entry in (server_progress.items() if isinstance(server_progress, dict) else []):
                        if not isinstance(entry, dict):
                            continue
                        pre_ok = bool(entry.get('pre_quiz_completed') or entry.get('preQuizCompleted'))
                        post_ok = bool(entry.get('post_quiz_completed') or entry.get('postQuizCompleted'))
                        percent = entry.get('percent') or entry.get('progress')
                        try:
                            pct = float(percent)
                        except Exception:
                            pct = 0.0
                        if (pre_ok and post_ok) or pct >= 100.0:
                            badge_name = map_module_to_badge(str(mid))
                            if badge_name:
                                award_badge(uid, badge_name, reason=f"Completed module {mid} 100%")
                except Exception:
                    pass
                current_app.logger.info('api_progress: returned Firestore progress for uid=%s keys=%s', uid, list(server_progress.keys())[:20])
                return jsonify(server_progress), 200
            except Exception as e:
                current_app.logger.exception('api_progress: failed to read Firestore for uid=%s: %s', uid, e)
                # fall through to return whatever is in session
        # Fallback: return whatever progress is already stored in session
        user_progress = session.get('user_progress', {}) or {}
        current_app.logger.info('api_progress fallback: session uid=%s email=%s; progress_keys=%s', session.get('uid'), session.get('email'), list(user_progress.keys()) if isinstance(user_progress, dict) else str(type(user_progress)))
        return jsonify(user_progress), 200
    except Exception as e:
        current_app.logger.exception('api_progress error: %s', e)
        return jsonify({}), 500

@api_bp.route('/login', methods=['POST'])
def api_login():
    """Login endpoint that accepts JSON { email, password?, uid? } and loads Firestore progress into session.
    Authentication is handled by Firebase client; this maps client identity (uid/email) to a server session
    and loads that user's progress and role from Firestore into session.
    """
    try:
        data = request.get_json() or {}
        email = data.get('email')
        uid = data.get('uid')
        client_progress = data.get('progress') or {}
        if not email and not uid:
            return jsonify({'error': 'Missing email or uid'}), 400

        # Lookup user data, progress and role by uid if available, else by email
        try:
            from utils.firebase_service import get_user_progress, get_user_data, get_user_record
            user_progress = {}
            user_doc = None
            if uid:
                user_progress = get_user_progress(uid) or {}
                user_doc = get_user_record(uid)
            else:
                # fallback: lookup by email
                user_doc = get_user_data(email)
                user_progress = (user_doc.get('progress') if user_doc else {}) or {}
            
            # Get user role from Firestore document, default to 'student'
            user_role = 'student'
            if user_doc:
                user_role = user_doc.get('role', 'student')

            # If Firestore returned a full user document, set session age_group from it
            if not session.get('age_group') and user_doc:
                try:
                    age = user_doc.get('age_group') if user_doc.get('age_group') is not None else user_doc.get('ageGroup')
                    if age:
                        session['age_group'] = age
                        current_app.logger.info('api_login: set session age_group from Firestore: %s', age)
                except Exception:
                    pass
        except Exception as e:
            current_app.logger.exception('Failed to read user progress from Firestore: %s', e)
            user_progress = {}

        # Normalize server-side progress keys to strings
        normalized_server = {}
        try:
            if isinstance(user_progress, dict):
                normalized_server = {str(k): v for k, v in user_progress.items()}
        except Exception:
            normalized_server = {}

        # Merge client-provided progress (client takes precedence)
        try:
            if isinstance(client_progress, dict):
                for k, v in client_progress.items():
                    normalized_server[str(k)] = v
        except Exception:
            current_app.logger.exception('Failed to merge client progress')

        # Ensure explicit per-module pre/post quiz flags for canonical modules
        try:
            module_ids = ['1', '2', '3', '5', '6', '7']
            for mid in module_ids:
                entry = normalized_server.get(mid)
                if isinstance(entry, dict):
                    # Preserve explicit True values; ensure keys exist and are boolean
                    if entry.get('pre_quiz_completed') is True:
                        entry['pre_quiz_completed'] = True
                    else:
                        entry.setdefault('pre_quiz_completed', False)
                    entry.setdefault('post_quiz_completed', False)
                    normalized_server[mid] = entry
                else:
                    # Non-dict entries (or missing) -> normalize to structured dict
                    normalized_server[mid] = {
                        'pre_quiz_completed': True if entry is True else False,
                        'post_quiz_completed': False
                    }
        except Exception:
            current_app.logger.exception('Failed to normalize module progress keys')

        # Store progress and user info in session
        session['user_progress'] = normalized_server
        session['role'] = user_role
        if email:
            session['email'] = email
        if uid:
            session['uid'] = uid

        # Debug: log merged session progress summary
        try:
            keys = list(session['user_progress'].keys()) if isinstance(session['user_progress'], dict) else []
            current_app.logger.info('api_login: set session user_progress keys sample: %s, role: %s', keys[:20], user_role)
        except Exception:
            current_app.logger.info('api_login: session user_progress and role set')

        # After login, award any badges for modules already completed in Firestore
        try:
            if uid and isinstance(session.get('user_progress'), dict):
                from utils.firebase_service import award_badge, map_module_to_badge
                for mid, entry in session['user_progress'].items():
                    if not isinstance(entry, dict):
                        continue
                    pre_ok = bool(entry.get('pre_quiz_completed') or entry.get('preQuizCompleted'))
                    post_ok = bool(entry.get('post_quiz_completed') or entry.get('postQuizCompleted'))
                    percent = entry.get('percent') or entry.get('progress')
                    try:
                        pct = float(percent)
                    except Exception:
                        pct = 0.0
                    if (pre_ok and post_ok) or pct >= 100.0:
                        badge_name = map_module_to_badge(str(mid))
                        if badge_name:
                            award_badge(uid, badge_name, reason=f"Completed module {mid} 100%")
        except Exception:
            pass

        # Return progress and role to client
        return jsonify({
            'success': True,
            'role': user_role,
            'email': email,
            'uid': uid,
            'progress': normalized_server
        }), 200

    except Exception as e:
        current_app.logger.exception('api_login error: %s', e)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/check_pre_quiz/<module_id>')
def api_check_pre_quiz(module_id):
    try:
        user_progress = session.get('user_progress', {}) or {}
        # Normalize access to module key
        module_progress = user_progress.get(str(module_id), user_progress.get(int(module_id) if module_id.isdigit() else module_id, {}))

        completed = False
        # Accept explicit boolean True or explicit pre_quiz_completed True
        if module_progress is True:
            completed = True
        elif isinstance(module_progress, dict) and module_progress.get('pre_quiz_completed') is True:
            completed = True

        return jsonify({'completed': completed}), 200
    except Exception as e:
        current_app.logger.exception('api_check_pre_quiz error: %s', e)
        return jsonify({'completed': False, 'error': str(e)}), 500

@api_bp.route('/sync_quiz_state/<module_id>/<quiz_type>', methods=['POST'])
def sync_quiz_state(module_id, quiz_type):
    """Update session quiz completion state for a module AND persist to Firestore"""
    try:
        # Set the canonical session key
        sess_key = f'module_{module_id}_pre_quiz' if quiz_type == 'pre' else f'module_{module_id}_post_quiz'
        session[sess_key] = True

        # Update structured progress in session
        up = session.get('user_progress', {}) or {}
        mid = str(module_id)
        mod_entry = up.get(mid, {})
        if not isinstance(mod_entry, dict):
            mod_entry = {}
        
        if quiz_type == 'pre':
            mod_entry['pre_quiz_completed'] = True
        else:
            mod_entry['post_quiz_completed'] = True
        
        up[mid] = mod_entry
        session['user_progress'] = up

        # CRITICAL FIX: Also save to Firestore if user is logged in
        uid = session.get('uid')
        if uid:
            from utils.firebase_service import update_user_progress, award_badge, map_module_to_badge
            
            # Prepare the progress update for Firestore
            progress_update = {
                'pre_quiz_completed': mod_entry.get('pre_quiz_completed', False),
                'post_quiz_completed': mod_entry.get('post_quiz_completed', False)
            }
            
            # Save to Firestore
            firestore_success = update_user_progress(uid, module_id, progress_update)
            
            if firestore_success:
                current_app.logger.info(f'Successfully saved quiz completion to Firestore: uid={uid}, module={module_id}, quiz_type={quiz_type}')
                # If both quizzes are now completed, award module badge
                try:
                    if progress_update.get('pre_quiz_completed') and progress_update.get('post_quiz_completed'):
                        badge_name = map_module_to_badge(str(module_id))
                        if badge_name:
                            if award_badge(uid, badge_name, reason=f"Completed module {module_id} 100%"):
                                current_app.logger.info(f"Awarded badge '{badge_name}' to uid={uid} for module {module_id}")
                except Exception as e:
                    current_app.logger.warning(f'Badge award failed for uid={uid}, module={module_id}: {e}')
            else:
                current_app.logger.warning(f'Failed to save quiz completion to Firestore: uid={uid}, module={module_id}, quiz_type={quiz_type}')
        else:
            current_app.logger.warning(f'No uid in session, quiz completion not saved to Firestore: module={module_id}, quiz_type={quiz_type}')

        return jsonify({'success': True}), 200
        
    except Exception as e:
        current_app.logger.exception('sync_quiz_state error: %s', e)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sync_all_progress', methods=['POST'])
def sync_all_progress():
    """Sync all user progress from session to Firestore"""
    try:
        uid = session.get('uid')
        if not uid:
            return jsonify({'error': 'Not logged in'}), 401
        
        user_progress = session.get('user_progress', {})
        if not isinstance(user_progress, dict):
            return jsonify({'success': True, 'message': 'No progress to sync'}), 200
        
        from utils.firebase_service import update_user_progress
        
        sync_results = []
        for module_id, progress_data in user_progress.items():
            if isinstance(progress_data, dict):
                success = update_user_progress(uid, str(module_id), progress_data)
                sync_results.append({
                    'module_id': module_id,
                    'success': success
                })
            else:
                # Handle legacy boolean values
                progress_update = {
                    'pre_quiz_completed': True if progress_data is True else False,
                    'post_quiz_completed': False
                }
                success = update_user_progress(uid, str(module_id), progress_update)
                sync_results.append({
                    'module_id': module_id,
                    'success': success
                })
        
        failed_syncs = [r for r in sync_results if not r['success']]
        
        if failed_syncs:
            current_app.logger.warning(f'Some progress syncs failed: {failed_syncs}')
            return jsonify({
                'success': False,
                'results': sync_results,
                'message': f'{len(failed_syncs)} modules failed to sync'
            }), 207
        else:
            current_app.logger.info(f'All progress synced successfully for uid={uid}')
            return jsonify({
                'success': True,
                'results': sync_results,
                'message': 'All progress synced successfully'
            }), 200
            
    except Exception as e:
        current_app.logger.exception('sync_all_progress error: %s', e)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            current_app.logger.error('Chat endpoint: Missing message in request')
            return jsonify({
                'error': 'Missing message in request',
                'status': 'error'
            }), 400

        user_message = data['message']
        current_app.logger.info(f'Chat endpoint: Received message: {user_message[:100]}...')
        
        # Validate API key exists and is valid
        if not GEMINI_API_KEY:
            current_app.logger.error('Chat endpoint: Missing Gemini API key')
            return jsonify({
                'error': 'AI service not configured: Missing API key',
                'status': 'error'
            }), 500
        
        # Check if API key looks like a valid Gemini key (starts with AIza)
        if not GEMINI_API_KEY.startswith('AIza'):
            current_app.logger.error('Chat endpoint: Invalid Gemini API key format')
            return jsonify({
                'error': 'AI service not configured: Invalid API key format',
                'status': 'error'
            }), 500

        # Format request for Gemini API
        payload = {
            "contents": [{
                "parts":[{
                    "text": f"You are a friendly and helpful learning assistant for teenagers. Answer the following question about health and development in an age-appropriate way: {user_message}"
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
                "topP": 0.8,
                "topK": 40
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH", 
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        }

        headers = {
            "Content-Type": "application/json",
        }

        # Add API key as URL parameter for Gemini 
        url = f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}"
        
        # Log the endpoint being used (without exposing the full API key)
        current_app.logger.info(f'Chat endpoint: Using Gemini endpoint: {GEMINI_ENDPOINT}')

        current_app.logger.info('Chat endpoint: Making request to Gemini API')
        
        try:
            # Add timeout to prevent hanging requests
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            current_app.logger.info(f'Chat endpoint: Gemini API response status: {response.status_code}')
            
            response_text = response.text[:200] if response.text else 'No response text'
            current_app.logger.info(f'Chat endpoint: Gemini API response preview: {response_text}')
            
            if response.status_code == 401:
                current_app.logger.error('Chat endpoint: Gemini API authentication failed')
                return jsonify({
                    'error': 'AI service authentication failed',
                    'status': 'error'
                }), 500
            elif response.status_code == 429:
                current_app.logger.error('Chat endpoint: Gemini API rate limit exceeded')
                return jsonify({
                    'error': 'AI service temporarily unavailable. Please try again later.',
                    'status': 'error'
                }), 500
            elif response.status_code == 503:
                current_app.logger.error('Chat endpoint: Gemini API service unavailable')
                return jsonify({
                    'error': 'AI service is currently unavailable. Please try again in a few moments.',
                    'status': 'error'
                }), 500
            elif response.status_code == 400:
                current_app.logger.error(f'Chat endpoint: Bad request to Gemini API: {response.text}')
                return jsonify({
                    'error': 'Invalid request to AI service. Please try rephrasing your question.',
                    'status': 'error'
                }), 500
            
            response.raise_for_status()
            
            response_data = response.json()
            current_app.logger.info(f'Chat endpoint: Full response structure: {response_data}')
            
            # Improved text extraction with better error handling
            ai_response = ""
            
            try:
                # Check if response has the expected structure
                if 'candidates' in response_data and len(response_data['candidates']) > 0:
                    candidate = response_data['candidates'][0]
                    
                    # Check finish reason first
                    finish_reason = candidate.get('finishReason', '')
                    if finish_reason == 'MAX_TOKENS':
                        current_app.logger.warning('Chat endpoint: Response was truncated due to max tokens')
                    elif finish_reason == 'SAFETY':
                        current_app.logger.error('Chat endpoint: Response blocked by safety filters')
                        return jsonify({
                            'error': 'Content was blocked by safety filters. Please rephrase your question.',
                            'status': 'error'
                        }), 400
                    
                    # Try to extract text from different possible locations
                    if 'content' in candidate:
                        content = candidate['content']
                        
                        # Standard format: content.parts[0].text
                        if 'parts' in content and len(content['parts']) > 0:
                            for part in content['parts']:
                                if 'text' in part and part['text'].strip():
                                    ai_response = part['text'].strip()
                                    break
                        
                        # Alternative: content.text
                        elif 'text' in content and content['text'].strip():
                            ai_response = content['text'].strip()
                    
                    # Fallback: check if text is directly in candidate
                    if not ai_response and 'text' in candidate:
                        ai_response = candidate['text'].strip()
                
                # Last resort: check for alternative response formats
                if not ai_response:
                    # Check for direct text in response
                    if 'text' in response_data:
                        ai_response = response_data['text'].strip()
                    # Check for generated_text field
                    elif 'generated_text' in response_data:
                        ai_response = response_data['generated_text'].strip()
                
                # If we still have no response but finish reason suggests success
                if not ai_response and finish_reason not in ['SAFETY', 'RECITATION']:
                    current_app.logger.error('Chat endpoint: Valid API response but no text content found')
                    current_app.logger.error(f'Chat endpoint: Candidate structure: {candidate}')
                
            except (KeyError, IndexError, TypeError) as parse_error:
                current_app.logger.error(f'Chat endpoint: Error parsing response structure: {parse_error}')
                current_app.logger.error(f'Chat endpoint: Response data keys: {list(response_data.keys()) if isinstance(response_data, dict) else "Not a dict"}')
            
            # Final validation
            if not ai_response or len(ai_response.strip()) == 0:
                current_app.logger.error(f'Chat endpoint: No usable text extracted from response')
                current_app.logger.error(f'Chat endpoint: Full response for debugging: {response_data}')
                return jsonify({
                    'error': 'Empty or incomplete response from AI service',
                    'status': 'error'
                }), 500

            current_app.logger.info(f'Chat endpoint: Successfully extracted response: {ai_response[:100]}...')
            
            return jsonify({
                'response': ai_response,
                'status': 'success'
            })

        except requests.exceptions.Timeout:
            current_app.logger.error('Chat endpoint: Gemini API request timed out')
            return jsonify({
                'error': 'AI service request timed out. Please try again.',
                'status': 'error'
            }), 500
        except requests.exceptions.ConnectionError:
            current_app.logger.error('Chat endpoint: Failed to connect to Gemini API')
            return jsonify({
                'error': 'Unable to connect to AI service. Please check your internet connection.',
                'status': 'error'
            }), 500
        except requests.exceptions.HTTPError as e:
            current_app.logger.error(f'Chat endpoint: Gemini API HTTP error: {e}')
            return jsonify({
                'error': f'AI service error: {response.status_code}',
                'status': 'error'
            }), 500
        except ValueError as e:
            current_app.logger.error(f'Chat endpoint: Failed to parse Gemini API response: {e}')
            return jsonify({
                'error': 'Invalid response format from AI service',
                'status': 'error'
            }), 500

    except Exception as e:
        current_app.logger.exception(f'Chat endpoint unexpected error: {str(e)}')
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@api_bp.route('/sync_quiz_state/<module_id>/progress', methods=['POST'])
def sync_module_progress(module_id):
    """Update module learning progress in session and Firestore"""
    try:
        data = request.get_json()
        if not data or 'progress' not in data:
            return jsonify({'error': 'No progress data provided'}), 400

        progress_data = data['progress']
        
        # Update session progress
        up = session.get('user_progress', {}) or {}
        mid = str(module_id)
        up[mid] = up.get(mid, {})
        up[mid].update(progress_data)
        session['user_progress'] = up

        # Update Firestore if user is logged in
        uid = session.get('uid')
        if uid:
            from utils.firebase_service import update_user_progress, award_badge, map_module_to_badge
            update_user_progress(uid, mid, progress_data)
            # After updating, if progress indicates completion, award badge
            try:
                pre_ok = bool(up[mid].get('pre_quiz_completed'))
                post_ok = bool(up[mid].get('post_quiz_completed'))
                percent = up[mid].get('percent') or up[mid].get('progress')
                pct = 0.0
                try:
                    pct = float(percent)
                except Exception:
                    pct = 0.0
                if (pre_ok and post_ok) or pct >= 100.0:
                    badge_name = map_module_to_badge(mid)
                    if badge_name:
                        if award_badge(uid, badge_name, reason=f"Completed module {mid} 100%"):
                            current_app.logger.info(f"Awarded badge '{badge_name}' to uid={uid} for module {mid}")
            except Exception as e:
                current_app.logger.warning(f'Badge award failed in progress sync for uid={uid}, module={mid}: {e}')
            return jsonify({'status': 'success', 'message': 'Progress synced to Firestore'})
        
        return jsonify({'status': 'success', 'message': 'Progress saved to session'})

    except Exception as e:
        current_app.logger.exception('sync_module_progress error: %s', e)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/student/resources')
def get_student_resources():
    try:
        if 'role' not in session or session['role'] != 'student':
            return jsonify({'error': 'Unauthorized'}), 403

        student_id = session.get('uid')
        db = get_firestore()
        
        # Get student's teacher ID
        student_ref = db.collection('users').document(student_id)
        student = student_ref.get()
        if not student.exists:
            return jsonify({'error': 'Student not found'}), 404
            
        teacher_id = student.to_dict().get('teacher_id')
        if not teacher_id:
            return jsonify({'error': 'No assigned teacher'}), 404
            
        # Get resources from student's teacher
        resources = db.collection('resources')\
            .where('teacher_id', '==', teacher_id)\
            .where('published', '==', True)\
            .stream()
            
        resources_list = []
        for resource in resources:
            data = resource.to_dict()
            # Only include necessary fields for students
            resources_list.append({
                'id': resource.id,
                'title': data.get('title'),
                'description': data.get('description'),
                'type': data.get('type'),
                'url': data.get('url'),
                'content': data.get('content', ''),
                'interactiveElements': data.get('interactiveElements', []),
                'created_at': data.get('created_at')
            })
            
        return jsonify(resources_list), 200
            
    except Exception as e:
        current_app.logger.error(f"Error fetching student resources: {e}")
        return jsonify({'error': 'Failed to fetch resources'}), 500

@api_bp.route('/api/teacher/code/generate', methods=['POST'])
def generate_new_teacher_code():
    """Generate and save a new teacher code for the current teacher"""
    try:
        uid = session.get('uid')
        if not uid:
            return jsonify({'error': 'Not authorized'}), 401
            
        db = get_firestore()
        teacher_ref = db.collection('users').document(uid)
        teacher_doc = teacher_ref.get()
        
        if not teacher_doc.exists or teacher_doc.get('role') != 'teacher':
            return jsonify({'error': 'Not a teacher account'}), 403
        
        # Generate new unique code
        code = generate_teacher_code()
        
        # Save to teacher document
        teacher_ref.update({
            'teacher_code': code,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            'success': True,
            'teacher_code': code
        })
        
    except Exception as e:
        print(f'Error generating teacher code: {e}')
        return jsonify({'error': 'Failed to generate code'}), 500

@api_bp.route('/api/student/connect', methods=['POST'])
def connect_to_teacher():
    """Connect a student to a teacher using a teacher code"""
    try:
        data = request.get_json()
        if not data or 'teacher_code' not in data:
            return jsonify({'error': 'No teacher code provided'}), 400
            
        teacher_code = data['teacher_code'].strip().upper()
        student_uid = session.get('uid')
        
        if not student_uid:
            return jsonify({'error': 'Not authorized'}), 401
            
        db = get_firestore()
        
        # Find teacher by code
        teachers = db.collection('users').where('teacher_code', '==', teacher_code).limit(1).get()
        if not teachers:
            return jsonify({'error': 'Invalid teacher code'}), 404
            
        teacher = teachers[0]
        
        # Update student document with teacher reference
        student_ref = db.collection('users').document(student_uid)
        student_ref.update({
            'teacher_id': teacher.id,
            'teacher_code': teacher_code,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            'success': True,
            'message': 'Successfully connected to teacher'
        })
        
    except Exception as e:
        print(f'Error connecting to teacher: {e}')
        return jsonify({'error': 'Failed to connect to teacher'}), 500