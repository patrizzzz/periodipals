#!/usr/bin/env python3
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import argparse

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        cred = credentials.Certificate("menstrual-hygiene-manage-6b0ed-firebase-adminsdk-fbsvc-a3f11dc47f.json")
        firebase_admin.initialize_app(cred)
    except ValueError:
        # App already initialized
        pass
    return firestore.client()

def migrate_roles(teacher_emails=None, dry_run=True):
    """
    Migrate user documents to include role field.
    Args:
        teacher_emails: List of email addresses to mark as teachers
        dry_run: If True, only print changes without applying them
    """
    db = init_firebase()
    users_ref = db.collection('users')
    users = users_ref.stream()
    
    teacher_emails = set(email.lower() for email in (teacher_emails or []))
    updates = 0
    teachers_set = 0

    for user in users:
        data = user.to_dict()
        needs_update = False
        
        # Check if role field is missing
        if 'role' not in data:
            needs_update = True
            # Assign teacher role if email is in teacher list
            if data.get('email', '').lower() in teacher_emails:
                data['role'] = 'teacher'
                teachers_set += 1
            else:
                data['role'] = 'student'
            
            print(f"{'[DRY RUN] ' if dry_run else ''}Setting role={data['role']} for user {data.get('email')}")
            
            if not dry_run:
                user.reference.update({'role': data['role']})
            updates += 1

    print(f"\nMigration complete:")
    print(f"- Total documents processed: {updates}")
    print(f"- Teacher roles set: {teachers_set}")
    print(f"- {'No changes applied (dry run)' if dry_run else 'Changes applied successfully'}")

def main():
    parser = argparse.ArgumentParser(description='Migrate Firestore user documents to include roles')
    parser.add_argument('--teachers', type=str, nargs='+', help='Email addresses to mark as teachers')
    parser.add_argument('--apply', action='store_true', help='Apply changes (without this flag, runs in dry-run mode)')
    args = parser.parse_args()

    if args.teachers:
        print(f"Will mark the following emails as teachers: {', '.join(args.teachers)}")
    
    if not args.apply:
        print("Running in dry-run mode. Use --apply to make actual changes.")
    
    try:
        migrate_roles(teacher_emails=args.teachers, dry_run=not args.apply)
    except Exception as e:
        print(f"Error during migration: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())