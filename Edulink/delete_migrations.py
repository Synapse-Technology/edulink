#!/usr/bin/env python
"""
Delete All Migration Files Script
This script will delete all migration files while preserving __init__.py files.
"""

import os
import glob

def delete_migration_files():
    """Delete all migration files except __init__.py"""
    
    # List of all Django apps with migrations
    apps = [
        'application',
        'authentication', 
        'chatbot',
        'dashboards',
        'employers',
        'institutions',
        'internship',
        'internship_progress',
        'notifications',
        'security',
        'users'
    ]
    
    total_deleted = 0
    
    for app in apps:
        migrations_dir = os.path.join(app, 'migrations')
        
        if os.path.exists(migrations_dir):
            print(f"\nProcessing {app}/migrations/...")
            
            # Find all .py files in migrations directory
            migration_files = glob.glob(os.path.join(migrations_dir, '*.py'))
            
            for file_path in migration_files:
                filename = os.path.basename(file_path)
                
                # Skip __init__.py files
                if filename == '__init__.py':
                    print(f"  Keeping: {filename}")
                    continue
                
                try:
                    os.remove(file_path)
                    print(f"  Deleted: {filename}")
                    total_deleted += 1
                except Exception as e:
                    print(f"  Error deleting {filename}: {e}")
        else:
            print(f"\nSkipping {app} - migrations directory not found")
    
    print(f"\n✅ Total migration files deleted: {total_deleted}")
    return total_deleted

def verify_deletion():
    """Verify that only __init__.py files remain in migrations directories"""
    print("\n" + "="*50)
    print("VERIFICATION - Remaining files in migrations directories:")
    print("="*50)
    
    apps = [
        'application',
        'authentication', 
        'chatbot',
        'dashboards',
        'employers',
        'institutions',
        'internship',
        'internship_progress',
        'notifications',
        'security',
        'users'
    ]
    
    for app in apps:
        migrations_dir = os.path.join(app, 'migrations')
        
        if os.path.exists(migrations_dir):
            remaining_files = os.listdir(migrations_dir)
            print(f"\n{app}/migrations/:")
            
            if remaining_files:
                for file in remaining_files:
                    if file.endswith('.py'):
                        print(f"  - {file}")
            else:
                print("  (empty)")

def main():
    """Main function"""
    print("=" * 60)
    print("DELETE ALL MIGRATION FILES")
    print("=" * 60)
    print("This will delete all migration files except __init__.py")
    print("=" * 60)
    
    # Delete migration files
    deleted_count = delete_migration_files()
    
    # Verify deletion
    verify_deletion()
    
    if deleted_count > 0:
        print(f"\n🎉 Successfully deleted {deleted_count} migration files!")
        print("\n📝 Next steps:")
        print("   1. Run: python manage.py makemigrations")
        print("   2. Run: python manage.py migrate")
    else:
        print("\n✅ No migration files found to delete.")

if __name__ == "__main__":
    main()