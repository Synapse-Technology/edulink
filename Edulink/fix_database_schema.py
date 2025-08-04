#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def fix_database_schema():
    """Remove profilebase_ptr_id columns from profile tables"""
    with connection.cursor() as cursor:
        tables_to_fix = [
            'users_employerprofile',
            'users_institutionprofile', 
            'users_studentprofile'
        ]
        
        for table in tables_to_fix:
            try:
                # Check if the column exists
                cursor.execute(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = %s AND column_name = 'profilebase_ptr_id';",
                    [table]
                )
                if cursor.fetchone():
                    print(f"Dropping profilebase_ptr_id column from {table}...")
                    cursor.execute(f"ALTER TABLE {table} DROP COLUMN profilebase_ptr_id CASCADE;")
                    print(f"  Successfully dropped column from {table}")
                else:
                    print(f"Column profilebase_ptr_id does not exist in {table}")
            except Exception as e:
                print(f"Error processing {table}: {e}")
        
        # Also drop the profilebase table if it exists
        try:
            cursor.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_name = 'users_profilebase';"
            )
            if cursor.fetchone():
                print("Dropping users_profilebase table...")
                cursor.execute("DROP TABLE users_profilebase CASCADE;")
                print("  Successfully dropped users_profilebase table")
            else:
                print("users_profilebase table does not exist")
        except Exception as e:
            print(f"Error dropping users_profilebase table: {e}")

if __name__ == '__main__':
    fix_database_schema()
    print("\nDatabase schema fixed. You can now run 'python manage.py migrate' safely.")