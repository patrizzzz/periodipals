from flask import Flask, send_from_directory, session, redirect, url_for, request, render_template
from flask_login import login_required
from routes.main_routes import main_bp
from routes.api_routes import api_bp
from routes.admin_routes import admin_bp
from routes.teacher_routes import teacher_bp
from utils.database import init_db
from utils.quiz_handler import convert_to_numeric_id
import os
from firebase_admin import credentials, initialize_app, firestore
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


class QuizApp:
    """Quiz application class handling all quiz-related functionality"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
        self.init_firebase()
        self._register_blueprints()
        self._register_before_request()
        self._register_static_routes()
        self.register_error_handlers()

    def _register_blueprints(self):
        """Register all blueprints"""
        self.app.register_blueprint(main_bp)
        self.app.register_blueprint(api_bp, url_prefix='/api')
        self.app.register_blueprint(admin_bp, url_prefix='/admin')
        self.app.register_blueprint(teacher_bp, url_prefix='/api/teacher')

    def _register_before_request(self):
        """Register before_request handlers"""
        @self.app.before_request
        def enforce_pre_quiz():
            try:
                path = request.path
                # Skip enforcement for certain paths
                skip_paths = ['/quiz', '/menu', '/static', '/offline', '/manifest.json', '/sw.js']
                if any(path.startswith(p) for p in skip_paths):
                    return
                    
                # Check if accessing a module page
                if path.startswith('/module/'):
                    module_id = path.split('/')[2]
                    numeric_id = convert_to_numeric_id(module_id)
                    
                    if not numeric_id:
                        return

                    # Check if module requires pre-quiz
                    if numeric_id in {1, 2, 3, 5, 6}:
                        quiz_key = f'module_{numeric_id}_pre_quiz'
                        
                        # If pre-quiz not completed, redirect to pre-quiz
                        if quiz_key not in session or not session[quiz_key]:
                            print(f"Redirecting to pre-quiz for module {module_id}")
                            return redirect(url_for('main.quiz', module_id=module_id, quiz_type='pre'))
                        else:
                            print(f"Pre-quiz already completed for module {module_id}")

            except Exception as e:
                print(f"Error in enforce_pre_quiz: {e}")

    def _register_static_routes(self):
        """Register static file routes"""
        @self.app.route('/manifest.json')
        def manifest():
            return send_from_directory('static', 'manifest.json')

        @self.app.route('/sw.js')
        def service_worker():
            return send_from_directory('static', 'sw.js')

    def register_error_handlers(self):
        """Register error handlers for the app"""
        @self.app.errorhandler(404)
        def page_not_found(e):
            return render_template('404.html'), 404

        @self.app.errorhandler(500)
        def server_error(e):
            return render_template('500.html'), 500

    def init_firebase(self):
        """Initialize Firebase application"""
        try:
            # Check if Firebase is already initialized
            self.db = firestore.client()
        except:
            # Initialize Firebase with explicit project ID
            firebase_config = {
                "type": "service_account",
                "project_id": "menstrual-hygiene-manage-6b0ed",
                "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
                "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_CERT_URL')
            }
            
            cred = credentials.Certificate(firebase_config)
            initialize_app(cred, {
                'projectId': 'menstrual-hygiene-manage-6b0ed'
            })
            self.db = firestore.client()


# Initialize the application
quiz_app = QuizApp()
app = quiz_app.app

if __name__ == '__main__':
    if not os.path.exists('quiz_database.db'):
        print("Creating database...")
        init_db()
        
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
