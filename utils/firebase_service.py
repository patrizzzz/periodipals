from firebase_admin import credentials, initialize_app, firestore
import firebase_admin
from typing import Optional, Dict
from datetime import datetime
import os

def get_firestore():
    """Returns a Firestore client, ensuring Firebase is initialized first."""
    _ensure_app()
    return firestore.client()

# Initialize Firebase Admin if not already initialized
def _ensure_app():
    try:
        if not firebase_admin._apps:
            # Prefer service account via env vars
            if os.getenv("FIREBASE_PRIVATE_KEY"):
                cred_dict = {
                    "type": "service_account",
                    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
                }
                firebase_admin.initialize_app(credentials.Certificate(cred_dict))

            else:
                # Fallback: Application Default Credentials (rarely used on Render)
                try:
                    firebase_admin.initialize_app(credentials.ApplicationDefault())
                except Exception:
                    firebase_admin.initialize_app()

    except ValueError:
        # Already initialized, ignore
        pass
    except Exception as e:
        print("Firebase initialization error:", e)

def get_user_progress(uid: str):
    """Return the 'progress' sub-object for the given user id from Firestore.
    Returns a dict mapping module ids to progress objects (as stored in Firestore).
    """
    if not uid:
        return {}
    _ensure_app()
    db = firestore.client()
    doc_ref = db.collection('users').document(uid)
    doc = doc_ref.get()
    if not doc.exists:
        return {}
    data = doc.to_dict() or {}
    # Support both 'progress' and 'modules' field names
    progress = data.get('progress') or data.get('modules') or {}
    # Normalize keys to strings
    try:
        normalized = { str(k): v for k, v in (progress.items() if isinstance(progress, dict) else {}) }
    except Exception:
        normalized = {}
    return normalized

def get_user_data(email: str):
    """Return the first user document matching the given email, or None."""
    if not email:
        return None
    _ensure_app()
    db = firestore.client()
    try:
        users = db.collection('users').where('email', '==', email).limit(1).get()
        if not users:
            return None
        return users[0].to_dict()
    except Exception:
        return None

def create_user_doc(email: str, age_group: str = None, uid: str = None):
    """Create a user document with email, age_group and empty progress if it doesn't exist.
    If uid is provided, use it as the document id so client JS (which uses auth.currentUser.uid)
    maps cleanly to the Firestore document. Returns the created document id or existing doc id.
    """
    if not email and not uid:
        return None
    _ensure_app()
    db = firestore.client()
    try:
        # If uid provided, prefer to create/get the doc by uid so client-side uid matches doc id
        if uid:
            doc_ref = db.collection('users').document(uid)
            if doc_ref.get().exists:
                return uid
            doc_ref.set({
                'email': email,
                'age_group': age_group,
                'progress': {}
            })
            return uid

        # Fallback: look up by email
        users = db.collection('users').where('email', '==', email).limit(1).get()
        if users:
            return users[0].id
        doc_ref = db.collection('users').document()
        doc_ref.set({
            'email': email,
            'age_group': age_group,
            'progress': {}
        })
        return doc_ref.id
    except Exception:
        return None

def update_user_progress(uid: str, module_id: str, progress_update: dict) -> bool:
    """Merge a progress update for a given module into the user's Firestore document.
    Returns True on success, False if user doc missing or on error.
    """
    if not uid or not module_id or not isinstance(progress_update, dict):
        return False
    _ensure_app()
    db = firestore.client()
    doc_ref = db.collection('users').document(uid)
    try:
        snap = doc_ref.get()
        if not snap.exists:
            return False
        data = snap.to_dict() or {}
        progress = data.get('progress') if isinstance(data.get('progress'), dict) else {}

        module_key = str(module_id)
        existing = progress.get(module_key) if isinstance(progress.get(module_key), dict) else {}
        if not isinstance(existing, dict):
            existing = {}

        # Merge existing and update (update takes precedence)
        merged = dict(existing)
        for k, v in progress_update.items():
            merged[k] = v

        # Ensure last_attempt is set server-side
        merged['last_attempt'] = firestore.SERVER_TIMESTAMP

        progress[module_key] = merged

        # Write merged progress back to the document (merge to avoid overwriting other fields)
        doc_ref.set({'progress': progress}, merge=True)
        return True
    except Exception as e:
        # best-effort logging via print to avoid introducing app logger dependency here
        print('update_user_progress error:', e)
        return False

def get_user_record(uid: str):
    """Return the full Firestore user document as a dict for the given uid.
    Normalizes common key names (ageGroup -> age_group) and includes the doc id
    under the key '_id'. Returns None if the document does not exist.
    """
    if not uid:
        return None
    _ensure_app()
    db = firestore.client()
    try:
        doc_ref = db.collection('users').document(uid)
        snap = doc_ref.get()
        if not snap.exists:
            return None
        data = snap.to_dict() or {}
        # Normalize age group key from either 'age_group' or 'ageGroup'
        age = data.get('age_group') if data.get('age_group') is not None else data.get('ageGroup')
        if age is not None:
            data['age_group'] = age
        # expose the document id for convenience
        data['_id'] = snap.id
        return data
    except Exception as e:
        print('get_user_record error:', e)
        return None

def _ensure_badges_array(db, user_ref) -> Dict:
    """Fetch user doc and ensure it has a list field 'badges'. Returns doc data dict."""
    snap = user_ref.get()
    data = snap.to_dict() or {}
    if not isinstance(data.get('badges'), list):
        data['badges'] = []
    return data

def has_badge(data: Dict, badge_name: str) -> bool:
    """Check if user data dict already contains a badge with given name."""
    badges = data.get('badges') if isinstance(data.get('badges'), list) else []
    for b in badges:
        if isinstance(b, dict) and str(b.get('name','')).lower() == badge_name.lower():
            return True
        if isinstance(b, str) and b.lower() == badge_name.lower():
            return True
    return False

def award_badge(uid: str, badge_name: str, reason: Optional[str] = None) -> bool:
    """Idempotently append a badge to the user's 'badges' array and set 'badge' as current.
    Stores assignment timestamp server-side. Returns True on success.
    """
    if not uid or not badge_name:
        return False
    _ensure_app()
    db = firestore.client()
    user_ref = db.collection('users').document(uid)
    try:
        snap = user_ref.get()
        if not snap.exists:
            return False
        data = _ensure_badges_array(db, user_ref)
        if has_badge(data, badge_name):
            return True
        new_badge = {
            'name': str(badge_name),
            'reason': str(reason) if reason else '',
            # Firestore cannot store SERVER_TIMESTAMP inside array values reliably via set/merge
            # Use server UTC time from backend instead
            'assigned_at': datetime.utcnow().isoformat()
        }
        # Use arrayUnion-like behavior by reading-modifying-writing; avoid duplicates via has_badge
        badges = data.get('badges') or []
        badges.append(new_badge)
        user_ref.set({
            'badges': badges,
            'badge': str(badge_name),
            'badge_updated_at': firestore.SERVER_TIMESTAMP
        }, merge=True)
        return True
    except Exception as e:
        print('award_badge error:', e)
        return False

def map_module_to_badge(module_id: str) -> Optional[str]:
    """Map module id to badge display name."""
    mid = str(module_id)
    mapping = {
        # 1: Puberty (example requested: Teen Explorer)
        '1': 'Teen Explorer',
        # 2: Reproductive System
        '2': 'Body Systems Scholar',
        # 3: Menstrual Cycle
        '3': 'Cycle Savvy',
        # 5: Personal Hygiene
        '5': 'Hygiene Hero',
        # 6: PMS Lesson
        '6': 'Wellness Watcher',
        # 7: Handwashing
        '7': 'Germ Buster'
    }
    return mapping.get(mid)

def is_module_completed(progress_entry: Dict) -> bool:
    """Determine completion: require both pre and post quiz completed when available."""
    if not isinstance(progress_entry, dict):
        return False
    pre_ok = bool(progress_entry.get('pre_quiz_completed'))
    post_ok = bool(progress_entry.get('post_quiz_completed'))
    # If other progress metric exists (e.g., percent), treat 100 as completed
    percent = progress_entry.get('percent') or progress_entry.get('progress')
    try:
        percent_val = float(percent)
    except Exception:
        percent_val = 0.0
    return (pre_ok and post_ok) or percent_val >= 100.0
