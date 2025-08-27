#!/usr/bin/env python
"""
Script to fix migration conflicts and schema routing issues.
This script will:
1. Reset problematic migrations
2. Create new migrations with proper BaseModel inheritance
3. Apply migrations to correct schemas
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.db import connection

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

def reset_migrations():
    """Reset problematic migrations."""
    print("Resetting problematic migrations...")
    
    # Remove the problematic migration file
    migration_file = 'profiles/migrations/0003_remove_profilebase_basemodel_ptr_and_more.py'
    if os.path.exists(migration_file):
        os.remove(migration_file)
        print(f"Removed {migration_file}")
    
    # Reset migration state in database
    with connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM django_migrations WHERE app = 'profiles' AND name = '0003_remove_profilebase_basemodel_ptr_and_more'"
        )
        print("Removed migration record from database")

def create_new_migrations():
    """Create new migrations with proper BaseModel inheritance."""
    print("Creating new migrations...")
    
    # Create migrations for profiles app
    execute_from_command_line([
        'manage.py', 'makemigrations', 'profiles', 
        '--name', 'fix_basemodel_inheritance'
    ])
    
def apply_migrations():
    """Apply migrations to correct schemas."""
    print("Applying migrations...")
    
    # Apply migrations
    execute_from_command_line(['manage.py', 'migrate', 'profiles'])
    
def main():
    """Main function to fix migration conflicts."""
    print("Starting migration conflict fix...")
    
    try:
        reset_migrations()
        create_new_migrations()
        apply_migrations()
        print("Migration conflicts fixed successfully!")
    except Exception as e:
        print(f"Error fixing migrations: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()