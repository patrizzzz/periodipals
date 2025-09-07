import sqlite3

def get_db():
    """Get database connection"""
    return sqlite3.connect('quiz_database.db')

def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Create quiz_results table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firebase_id TEXT,
            user_id TEXT,
            quiz_data TEXT,
            synced BOOLEAN,
            timestamp TEXT
        )
    ''')
    
    # Create user_progress table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firebase_id TEXT,
            user_id TEXT,
            module_id TEXT,
            progress INTEGER,
            synced BOOLEAN,
            timestamp TEXT
        )
    ''')
    
    conn.commit()
    conn.close()