-- Quiz Results Table
CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_id TEXT,
    user_id TEXT NOT NULL,
    quiz_data TEXT NOT NULL,
    synced BOOLEAN DEFAULT 0,
    timestamp TEXT NOT NULL
);

-- User Progress Table
CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_id TEXT,
    user_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    progress INTEGER NOT NULL,
    synced BOOLEAN DEFAULT 0,
    timestamp TEXT NOT NULL
);