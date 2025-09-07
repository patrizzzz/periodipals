import sqlite3
import json
import os
from pprint import pprint


def create_database():
    """Create the database and tables for activities"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    # Create activities table if not exists
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        data TEXT NOT NULL,  -- JSON data for the activity
        UNIQUE(module_id, activity_type)
    )
    ''')

    # Create activity completions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS activity_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,  -- If you have user accounts
        activity_id INTEGER NOT NULL,
        responses TEXT,  -- JSON of user responses
        completed_at DATETIME NOT NULL,
        score INTEGER,
        FOREIGN KEY (activity_id) REFERENCES activities(id)
    )
    ''')

    conn.commit()
    conn.close()
    print("Activity tables created successfully!")


def insert_activity(module_id, activity_type, title, description, data):
    """Insert a new activity"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    try:
        cursor.execute('''
        INSERT INTO activities (module_id, activity_type, title, description, data)
        VALUES (?, ?, ?, ?, ?)
        ''', (module_id, activity_type, title, description, json.dumps(data)))

        activity_id = cursor.lastrowid
        conn.commit()
        conn.close()
        print(f"Activity '{title}' inserted successfully with ID: {activity_id}")
        return activity_id
    except sqlite3.IntegrityError:
        conn.close()
        print(f"Activity for Module {module_id} ({activity_type}) already exists!")
        return None


def get_activity_id(module_id, activity_type):
    """Get activity ID for a module and activity type"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    cursor.execute('SELECT id FROM activities WHERE module_id = ? AND activity_type = ?',
                   (module_id, activity_type))
    result = cursor.fetchone()
    conn.close()

    return result[0] if result else None


def view_activity_details(activity_id=None):
    """View detailed information about a specific activity"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    if activity_id is None:
        # Show list of activities to choose from
        cursor.execute('SELECT id, module_id, activity_type, title FROM activities ORDER BY module_id, activity_type')
        activities = cursor.fetchall()

        print("\n=== Available Activities ===")
        for activity in activities:
            print(f"ID: {activity[0]}, Module: {activity[1]}, Type: {activity[2]}, Title: {activity[3]}")

        activity_id = input("\nEnter activity ID to view details (or press Enter to cancel): ")
        if not activity_id:
            conn.close()
            return

    # Get full activity details
    cursor.execute('SELECT * FROM activities WHERE id = ?', (activity_id,))
    activity = cursor.fetchone()

    if not activity:
        print("Activity not found!")
        conn.close()
        return

    print("\n=== Activity Details ===")
    print(f"ID: {activity[0]}")
    print(f"Module ID: {activity[1]}")
    print(f"Type: {activity[2]}")
    print(f"Title: {activity[3]}")
    print(f"Description: {activity[4]}")

    print("\nActivity Data (JSON):")
    try:
        data = json.loads(activity[5])
        pprint(data, indent=2)
    except json.JSONDecodeError:
        print("Invalid JSON data:")
        print(activity[5])

    conn.close()


def view_all_activities_with_data():
    """View all activities with their data"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM activities ORDER BY module_id, activity_type')
    activities = cursor.fetchall()

    print("\n=== All Activities with Data ===")
    for activity in activities:
        print("\n" + "=" * 50)
        print(f"ID: {activity[0]}")
        print(f"Module: {activity[1]}")
        print(f"Type: {activity[2]}")
        print(f"Title: {activity[3]}")
        print(f"Description: {activity[4]}")

        print("\nData:")
        try:
            data = json.loads(activity[5])
            pprint(data, indent=2)
        except json.JSONDecodeError:
            print("Invalid JSON data:")
            print(activity[5])
        print("=" * 50)

    conn.close()


def insert_sample_activities():
    """Insert sample activity data"""
    # Sample matching game
    matching_data = {
        "left_items": [
            {"id": 1, "text": "Puberty"},
            {"id": 2, "text": "Testosterone"},
            {"id": 3, "text": "Menstruation"}
        ],
        "right_items": [
            {"id": 4, "text": "Growth and development phase"},
            {"id": 5, "text": "Male hormone"},
            {"id": 6, "text": "Monthly cycle in females"}
        ],
        "correct_matches": [
            {"left": 1, "right": 4},
            {"left": 2, "right": 5},
            {"left": 3, "right": 6}
        ]
    }

    # Sample drag and drop
    dragdrop_data = {
        "drag_items": [
            {"id": 1, "text": "Ovary", "correct_zone": "1"},
            {"id": 2, "text": "Testis", "correct_zone": "2"},
            {"id": 3, "text": "Uterus", "correct_zone": "1"}
        ],
        "drop_zones": [
            {"id": "1", "title": "Female Reproductive System"},
            {"id": "2", "title": "Male Reproductive System"}
        ]
    }

    # Sample sequencing activity
    sequence_data = {
        "items": [
            {"id": 1, "text": "Puberty begins"},
            {"id": 2, "text": "Growth spurt occurs"},
            {"id": 3, "text": "Secondary sexual characteristics develop"},
            {"id": 4, "text": "Reproductive maturity is reached"}
        ],
        "correct_order": [1, 2, 3, 4]
    }

    sample_activities = [
        # Module 1 activities
        (1, "matching", "Puberty Terms Matching",
         "Match the puberty terms with their correct definitions", matching_data),
        (1, "dragdrop", "Reproductive System Sorting",
         "Drag and drop the organs to the correct reproductive system", dragdrop_data),

        # Module 2 activities
        (2, "sequence", "Puberty Stages Sequence",
         "Put the stages of puberty in the correct order", sequence_data),

        # Module 3 activities
        (3, "matching", "Hygiene Matching",
         "Match hygiene products with their uses", {
             "left_items": [
                 {"id": 1, "text": "Toothbrush"},
                 {"id": 2, "text": "Deodorant"},
                 {"id": 3, "text": "Soap"}
             ],
             "right_items": [
                 {"id": 4, "text": "Cleans teeth"},
                 {"id": 5, "text": "Controls body odor"},
                 {"id": 6, "text": "Cleans skin"}
             ],
             "correct_matches": [
                 {"left": 1, "right": 4},
                 {"left": 2, "right": 5},
                 {"left": 3, "right": 6}
             ]
         })
    ]

    # Insert activities
    for module_id, activity_type, title, description, data in sample_activities:
        insert_activity(module_id, activity_type, title, description, data)


def add_custom_matching_game():
    """Interactive function to add a custom matching game"""
    print("\n=== Add Custom Matching Game ===")
    module_id = int(input("Enter module ID: "))
    title = input("Enter activity title: ")
    description = input("Enter activity description: ")

    left_items = []
    right_items = []
    correct_matches = []

    print("\nAdd left column items (terms to match):")
    while True:
        item_text = input(f"Left item {len(left_items) + 1} (leave empty to finish): ")
        if not item_text:
            break
        left_items.append({
            "id": len(left_items) + 1,
            "text": item_text
        })

    print("\nAdd right column items (matching definitions/items):")
    while True:
        item_text = input(f"Right item {len(right_items) + 1} (leave empty to finish): ")
        if not item_text:
            break
        right_items.append({
            "id": len(left_items) + len(right_items) + 1,  # Ensure unique IDs
            "text": item_text
        })

    print("\nDefine correct matches (left item number to right item number):")
    for i, left_item in enumerate(left_items, 1):
        print(f"{i}. {left_item['text']}")
        right_num = int(input("Matches with right item number: "))
        correct_matches.append({
            "left": left_item["id"],
            "right": right_items[right_num - 1]["id"]
        })

    activity_data = {
        "left_items": left_items,
        "right_items": right_items,
        "correct_matches": correct_matches
    }

    activity_id = insert_activity(module_id, "matching", title, description, activity_data)

    # Ask if user wants to view the inserted data
    if activity_id:
        view = input("\nWould you like to view the inserted activity data? (y/n): ").lower()
        if view == 'y':
            view_activity_details(activity_id)


def add_custom_drag_drop():
    """Interactive function to add a custom drag and drop activity"""
    print("\n=== Add Custom Drag and Drop Activity ===")
    module_id = int(input("Enter module ID: "))
    title = input("Enter activity title: ")
    description = input("Enter activity description: ")

    drag_items = []
    drop_zones = []

    print("\nAdd drag items:")
    while True:
        item_text = input(f"Drag item {len(drag_items) + 1} (leave empty to finish): ")
        if not item_text:
            break

        drag_items.append({
            "id": len(drag_items) + 1,
            "text": item_text,
            "correct_zone": ""  # Will be set after zones are created
        })

    print("\nAdd drop zones:")
    while True:
        zone_title = input(f"Drop zone {len(drop_zones) + 1} (leave empty to finish): ")
        if not zone_title:
            break

        drop_zones.append({
            "id": str(len(drop_zones) + 1),
            "title": zone_title
        })

    print("\nAssign each drag item to the correct drop zone:")
    for i, zone in enumerate(drop_zones, 1):
        print(f"{i}. {zone['title']}")

    for item in drag_items:
        print(f"\nItem: {item['text']}")
        zone_num = int(input("Belongs to zone number: "))
        item["correct_zone"] = drop_zones[zone_num - 1]["id"]

    activity_data = {
        "drag_items": drag_items,
        "drop_zones": drop_zones
    }

    activity_id = insert_activity(module_id, "dragdrop", title, description, activity_data)

    # Ask if user wants to view the inserted data
    if activity_id:
        view = input("\nWould you like to view the inserted activity data? (y/n): ").lower()
        if view == 'y':
            view_activity_details(activity_id)


def add_custom_sequence_activity():
    """Interactive function to add a custom sequencing activity"""
    print("\n=== Add Custom Sequencing Activity ===")
    module_id = int(input("Enter module ID: "))
    title = input("Enter activity title: ")
    description = input("Enter activity description: ")

    items = []

    print("\nAdd items to sequence (in correct order):")
    while True:
        item_text = input(f"Sequence item {len(items) + 1} (leave empty to finish): ")
        if not item_text:
            break
        items.append({
            "id": len(items) + 1,
            "text": item_text
        })

    activity_data = {
        "items": items,
        "correct_order": [item["id"] for item in items]  # Maintain the order they were entered
    }

    activity_id = insert_activity(module_id, "sequence", title, description, activity_data)

    # Ask if user wants to view the inserted data
    if activity_id:
        view = input("\nWould you like to view the inserted activity data? (y/n): ").lower()
        if view == 'y':
            view_activity_details(activity_id)


def view_activities():
    """View all activities in the database"""
    conn = sqlite3.connect('quiz_database.db')
    cursor = conn.cursor()

    cursor.execute('SELECT id, module_id, activity_type, title FROM activities ORDER BY module_id, activity_type')
    activities = cursor.fetchall()

    print("\n=== All Activities ===")
    for activity in activities:
        print(f"ID: {activity[0]}, Module: {activity[1]}, Type: {activity[2]}, Title: {activity[3]}")

    conn.close()


def main():
    """Main menu for the activity data inserter"""
    if not os.path.exists('quiz_database.db'):
        print("Database not found. Please run the quiz data inserter first!")
        return

    # Ensure tables exist
    create_database()

    while True:
        print("\n=== Activity Data Manager ===")
        print("1. Create activity tables")
        print("2. Insert sample activities")
        print("3. Add custom matching game")
        print("4. Add custom drag and drop activity")
        print("5. Add custom sequencing activity")
        print("6. View all activities (brief)")
        print("7. View specific activity details")
        print("8. View all activities with full data")
        print("9. Exit")

        choice = input("\nEnter your choice (1-9): ")

        if choice == '1':
            create_database()
        elif choice == '2':
            insert_sample_activities()
        elif choice == '3':
            add_custom_matching_game()
        elif choice == '4':
            add_custom_drag_drop()
        elif choice == '5':
            add_custom_sequence_activity()
        elif choice == '6':
            view_activities()
        elif choice == '7':
            view_activity_details()
        elif choice == '8':
            view_all_activities_with_data()
        elif choice == '9':
            print("Goodbye!")
            break
        else:
            print("Invalid choice! Please try again.")


if __name__ == '__main__':
    main()