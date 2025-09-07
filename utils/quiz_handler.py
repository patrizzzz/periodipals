from firebase_admin import credentials, firestore
import firebase_admin

def get_firebase_to_numeric_map():
    """Centralized Firebase ID to numeric ID mapping"""
    return {
        'DL3xA7s2jxcoC3s37jmu': 1,
        '7qcYU7xPE9qkG4bpeHX8': 2,
        'CraoiUsKj7i05qpsuFL4': 3,
        'RT2pE8Vx5mNcY4wS9aZq': 4,
        'YILBwhaERvu3eXoi8oB0': 5,
        '27x7tKGsqhfCknjXqLoT': 6,
        'tnla8thJfkiNfUtwznWU': 7
    }

def get_numeric_to_firebase_map():
    """Reverse mapping for numeric to Firebase IDs"""
    firebase_map = get_firebase_to_numeric_map()
    
    return {v: k for k, v in firebase_map.items()}

def convert_to_numeric_id(module_id):
    """Convert module_id to numeric ID consistently"""
    try:
        return int(module_id)
    except ValueError:
        firebase_map = get_firebase_to_numeric_map()
        return firebase_map.get(module_id)

def get_quiz_data(module_id, quiz_type):
    """Retrieve quiz data from Firebase"""
    try:
        # Initialize Firebase Admin if not already initialized
        if not firebase_admin._apps:
            try:
                cred = credentials.Certificate('menstrual-hygiene-manage-6b0ed-firebase-adminsdk-fbsvc-a3f11dc47f.json')
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"Failed to initialize Firebase: {e}")
                return None

        # Check if this is a pre-quiz and if the user has already completed it
        if quiz_type == 'pre':
            from flask import session
            quiz_key = f'module_{module_id}_pre_quiz'
            if quiz_key in session and session.get(quiz_key, False):
                print(f"User has already completed pre-quiz for module {module_id}")
                return None

        db = firestore.client()
        
        # Query Firebase for quiz data using filter
        # Convert module_id to Firebase ID
        numeric_to_firebase = get_numeric_to_firebase_map()
        try:
            firebase_id = numeric_to_firebase.get(int(module_id))
            if not firebase_id:
                print(f"No Firebase ID mapping found for module {module_id}")
                firebase_id = str(module_id)
        except ValueError:
            print(f"Invalid module_id format: {module_id}")
            firebase_id = str(module_id)

        print(f"Querying with lesson_id: {firebase_id}, type: {quiz_type}")
        quiz_ref = db.collection('quizzes')
        query = quiz_ref.where('lesson_id', '==', firebase_id).where('type', '==', quiz_type)
        quiz_docs = query.stream()  # Use stream() instead of get() for better handling
        
        # Convert to list for checking length
        quiz_docs_list = list(quiz_docs)
        if not quiz_docs_list:
            print(f"No quiz found for module {module_id} (Firebase ID: {firebase_id}) and type {quiz_type}")
            # Return a default quiz structure for testing
            return {
                'title': f'Quiz for Module {module_id}',
                'questions': [
                    {
                        'question': 'What is puberty?',
                        'options': {
                            'A': 'A period of growth and Development',
                            'B': 'A roblox game',
                            'C': 'A holiday',
                            'D': 'A food'
                        },
                        'correct_answer': 'A'
                    },
                    {
                        'question': 'What changes happen during puberty?',
                        'options': {
                            'A': 'Hair turns blue',
                            'B': 'Body grows and develops',
                            'C': 'Nothing changes',
                            'D': 'Skin turns purple'
                        },
                        'correct_answer': 'B'
                    },
                    {
                        'question': 'When should you talk about puberty?',
                        'options': {
                            'A': 'Never',
                            'B': 'Only with friends',
                            'C': 'With trusted adults and healthcare providers',
                            'D': 'On social media'
                        },
                        'correct_answer': 'C'
                    }
                ],
                'type': quiz_type,
                'lesson_id': str(module_id)
            }

        # Get the quiz document from list
        quiz_doc = quiz_docs_list[0].to_dict()
        print(f"Found quiz document: {quiz_doc}")
        
        # Format quiz data for template
        quiz_data = {
            'title': quiz_doc.get('title', f'Quiz for Module {module_id}'),
            'questions': []
        }

        # Process questions based on the new structure
        for question in quiz_doc.get('questions', []):
            options = question.get('options', {})
            # Convert options map to list preserving order A, B, C, D
            options_list = [
                options.get('A', ''),
                options.get('B', ''),
                options.get('C', ''),
                options.get('D', '')
            ]
            
            # Get the correct answer from the document
            correct_letter = question.get('correct_answer')
            if not correct_letter:
                print(f"Warning: No correct answer found for question: {question.get('question')}")
                correct_letter = 'A'  # Fallback only if no answer is found
            
            # Convert letter answer (A, B, C, D) to numeric index (0, 1, 2, 3)
            correct_index = ord(correct_letter) - ord('A')
            
            quiz_data['questions'].append({
                'q': question.get('question', ''),
                'a': options_list,
                'correct': correct_index,
                'feedback': question.get('feedback', {
                    'correct': 'Great job! That\'s correct!',
                    'incorrect': f'The correct answer was {correct_letter}. Keep learning!'
                })
            })

        # Add scoring information
        quiz_data['totalQuestions'] = len(quiz_data['questions'])
        quiz_data['passingScore'] = 70  # 70% to pass
        quiz_data['feedbackMessages'] = {
            'excellent': 'Outstanding! You\'ve mastered this topic! 🌟',
            'good': 'Well done! You\'re doing great! 👏',
            'pass': 'Good job! You\'ve passed the quiz! 👍',
            'fail': 'Keep trying! You\'ll do better next time! 💪'
        }

        return quiz_data

    except Exception as e:
        print(f"Error fetching quiz data: {e}")
        return None