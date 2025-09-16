from flask import Flask, send_from_directory, session, redirect, url_for, request, render_template
from flask_login import login_required
from routes.main_routes import main_bp
from routes.api_routes import api_bp
from routes.admin_routes import admin_bp
from routes.teacher_routes import teacher_bp
from utils.database import init_db
from utils.quiz_handler import convert_to_numeric_id
import os

quiz_app = QuizApp()
app = quiz_app.app 
class QuizApp:
    """Quiz application class handling all quiz-related functionality"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = 'periodipal_secret_key'
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


if __name__ == '__main__':
    if not os.path.exists('quiz_database.db'):
        print("Creating database...")
        init_db()

    quiz_app = QuizApp()
    app = quiz_app.app
    app.run(host='0.0.0.0', port=5000, debug=True)
