import sqlite3
import os


def create_database():
    """Create the database and tables"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL,
        quiz_type TEXT NOT NULL,
        title TEXT NOT NULL,
        UNIQUE(module_id, quiz_type)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        correct_answer INTEGER NOT NULL,
        question_order INTEGER NOT NULL,
        FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS answer_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        option_text TEXT NOT NULL,
        option_order INTEGER NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions (id)
    )
    ''')

    conn.commit()
    conn.close()
    print("Database and tables created successfully!")


def insert_quiz(module_id, quiz_type, title):
    """Insert a new quiz"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    try:
        cursor.execute('''
        INSERT INTO quizzes (module_id, quiz_type, title)
        VALUES (?, ?, ?)
        ''', (module_id, quiz_type, title))

        quiz_id = cursor.lastrowid
        conn.commit()
        conn.close()
        print(f"Quiz '{title}' inserted successfully with ID: {quiz_id}")
        return quiz_id
    except sqlite3.IntegrityError:
        conn.close()
        print(f"Quiz for Module {module_id} ({quiz_type}) already exists!")
        return None


def insert_question(quiz_id, question_text, correct_answer, question_order, answer_options):
    """Insert a question with its answer options"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    # Insert question
    cursor.execute('''
    INSERT INTO questions (quiz_id, question_text, correct_answer, question_order)
    VALUES (?, ?, ?, ?)
    ''', (quiz_id, question_text, correct_answer, question_order))

    question_id = cursor.lastrowid

    # Insert answer options
    for i, option in enumerate(answer_options):
        cursor.execute('''
        INSERT INTO answer_options (question_id, option_text, option_order)
        VALUES (?, ?, ?)
        ''', (question_id, option, i))

    conn.commit()
    conn.close()
    print(f"Question '{question_text}' inserted successfully")


def get_quiz_id(module_id, quiz_type):
    """Get quiz ID for a module and quiz type"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    cursor.execute('SELECT id FROM quizzes WHERE module_id = ? AND quiz_type = ?', (module_id, quiz_type))
    result = cursor.fetchone()
    conn.close()

    return result[0] if result else None


def insert_sample_data():
    """Insert sample quiz data"""
    # Clear any existing data for module 5 (Menstrual Cycle)
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM quizzes WHERE module_id = 5')
    conn.commit()
    conn.close()

    # Sample quizzes
    sample_quizzes = [
        (5, 'pre', 'Menstrual Cycle Pre-Quiz'),
        (5, 'post', 'Menstrual Cycle Post-Quiz')
    ]

    # Insert quizzes
    for module_id, quiz_type, title in sample_quizzes:
        insert_quiz(module_id, quiz_type, title)

    # Sample questions and answers
    sample_data = [
        # Pre-Quiz
        (5, 'pre', 'What is the menstrual cycle?', 0, 0, 
            ['A monthly process involving hormones and the uterus', 'A daily routine', 'A digestive system process', 'A yearly event']),
        (5, 'pre', 'Which organ is primarily involved in the menstrual cycle?', 1, 1, 
            ['Heart', 'Uterus', 'Lungs', 'Stomach']),
        (5, 'pre', 'How often does the menstrual cycle typically occur?', 1, 2, 
            ['Once a year', 'Every month', 'Every week', 'Every day']),
        (5, 'pre', 'What is menstruation?', 2, 3, 
            ['Growth of hair', 'Change in voice', 'Monthly bleeding', 'Weight gain']),
        (5, 'pre', 'Which phase comes first in the menstrual cycle?', 0, 4, 
            ['Menstrual phase', 'Luteal phase', 'Ovulation phase', 'Follicular phase']),

        # Post-Quiz
        (5, 'post', 'What marks the first day of the menstrual cycle?', 1, 0, 
            ['Ovulation', 'Menstrual bleeding', 'End of the cycle', 'Hormone release']),
        (5, 'post', 'Which hormone triggers ovulation?', 1, 1, 
            ['Insulin', 'Luteinizing hormone (LH)', 'Adrenaline', 'Testosterone']),
        (5, 'post', 'What is the average length of a menstrual cycle?', 2, 2, 
            ['7 days', '14 days', '28 days', '45 days']),
        (5, 'post', 'During which phase does the egg release from the ovary?', 2, 3, 
            ['Menstrual phase', 'Follicular phase', 'Ovulation phase', 'Luteal phase']),
        (5, 'post', 'What happens during the luteal phase?', 1, 4, 
            ['Egg is released', 'Uterine lining thickens', 'Menstruation occurs', 'Hormones decrease'])
    ]

    # Insert questions
    for module_id, quiz_type, question_text, correct_answer, question_order, options in sample_data:
        quiz_id = get_quiz_id(module_id, quiz_type)
        if quiz_id:
            insert_question(quiz_id, question_text, correct_answer, question_order, options)


def add_custom_quiz():
    """Interactive function to add a custom quiz"""
    print("\n=== Add Custom Quiz ===")
    module_id = int(input("Enter module ID: "))
    quiz_type = input("Enter quiz type (pre/post): ").lower()
    title = input("Enter quiz title: ")

    quiz_id = insert_quiz(module_id, quiz_type, title)
    if not quiz_id:
        return

    print(f"\nNow add questions for '{title}'")
    question_order = 0

    while True:
        question_text = input(f"\nQuestion {question_order + 1}: ")
        if not question_text:
            break

        print("Enter answer options (press Enter on empty line to finish):")
        options = []
        while True:
            option = input(f"Option {len(options) + 1}: ")
            if not option:
                break
            options.append(option)

        if len(options) < 2:
            print("Need at least 2 options!")
            continue

        correct_answer = int(input(f"Correct answer (1-{len(options)}): ")) - 1

        insert_question(quiz_id, question_text, correct_answer, question_order, options)
        question_order += 1

        if input("Add another question? (y/n): ").lower() != 'y':
            break


def view_quizzes():
    """View all quizzes in the database"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM quizzes ORDER BY module_id, quiz_type')
    quizzes = cursor.fetchall()

    print("\n=== All Quizzes ===")
    for quiz in quizzes:
        print(f"ID: {quiz[0]}, Module: {quiz[1]}, Type: {quiz[2]}, Title: {quiz[3]}")

    conn.close()


def main():
    """Main menu for the quiz data inserter"""
    if not os.path.exists('quiz_database.db'):
        create_database()

    while True:
        print("\n=== Quiz Data Manager ===")
        print("1. Create database and tables")
        print("2. Insert sample data")
        print("3. Add custom quiz")
        print("4. View all quizzes")
        print("5. Exit")

        choice = input("\nEnter your choice (1-5): ")

        if choice == '1':
            create_database()
        elif choice == '2':
            insert_sample_data()
        elif choice == '3':
            add_custom_quiz()
        elif choice == '4':
            view_quizzes()
        elif choice == '5':
            print("Goodbye!")
            break
        else:
            print("Invalid choice! Please try again.")


if __name__ == '__main__':
    main()