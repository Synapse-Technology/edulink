#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def fix_migration_history():
    """Remove problematic migration records from django_migrations table"""
    with connection.cursor() as cursor:
        # Check current migration state
        cursor.execute(
            "SELECT app, name FROM django_migrations WHERE app IN ('users', 'institutions') ORDER BY app, name;"
        )
        migrations = cursor.fetchall()
        print("Current migrations in database:")
        for app, name in migrations:
            print(f"  {app}.{name}")
        
        # Remove the problematic migrations that were deleted from filesystem
        problematic_migrations = [
            ('users', '0007_systemsetting_remove_employerprofile_profilebase_ptr_and_more'),
            ('users', '0008_auto_20250725_2055'),
            ('users', '0009_auto_20250725_2108'),
            ('users', '0010_alter_employerprofile_phone_number'),
        ]
        
        print("\nRemoving problematic migration records...")
        for app, name in problematic_migrations:
            cursor.execute(
                "DELETE FROM django_migrations WHERE app = %s AND name = %s;",
                [app, name]
            )
            print(f"  Removed {app}.{name}")
        
        # Check final state
        cursor.execute(
            "SELECT app, name FROM django_migrations WHERE app IN ('users', 'institutions') ORDER BY app, name;"
        )
        migrations = cursor.fetchall()
        print("\nFinal migrations in database:")
        for app, name in migrations:
            print(f"  {app}.{name}")

if __name__ == '__main__':
    fix_migration_history()
    print("\nMigration history fixed. You can now run 'python manage.py migrate' safely.")