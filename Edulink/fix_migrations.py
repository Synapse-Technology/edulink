#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.db import connection
from datetime import datetime

def fix_migration_inconsistency():
    """Fix migration inconsistency by adding missing migration records without affecting data"""
    with connection.cursor() as cursor:
        # Check what migrations are currently recorded
        cursor.execute("SELECT app, name FROM django_migrations ORDER BY app, name;")
        existing_migrations = cursor.fetchall()
        print("Current migrations in database:")
        for app, name in existing_migrations:
            print(f"  {app}.{name}")
        
        # Insert missing core Django migrations if they don't exist
        core_migrations = [
            ('contenttypes', '0001_initial'),
            ('auth', '0001_initial'),
            ('authentication', '0001_initial'),  # Custom authentication app
            ('admin', '0001_initial'),
            ('admin', '0002_logentry_remove_auto_add'),
            ('admin', '0003_logentry_add_action_flag_choices'),
            ('contenttypes', '0002_remove_content_type_name'),
            ('auth', '0002_alter_permission_name_max_length'),
            ('auth', '0003_alter_user_email_max_length'),
            ('auth', '0004_alter_user_username_opts'),
            ('auth', '0005_alter_user_last_login_null'),
            ('auth', '0006_require_contenttypes_0002'),
            ('auth', '0007_alter_validators_add_error_messages'),
            ('auth', '0008_alter_user_username_max_length'),
            ('auth', '0009_alter_user_last_name_max_length'),
            ('auth', '0010_alter_group_name_max_length'),
            ('auth', '0011_update_proxy_permissions'),
            ('auth', '0012_alter_user_first_name_max_length'),
            ('sessions', '0001_initial'),
            ('employers', '0001_initial'),  # Custom employers app
            ('users', '0001_initial'),      # Custom users app
        ]
        
        # Insert missing migrations
        for app, name in core_migrations:
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s;",
                [app, name]
            )
            if cursor.fetchone()[0] == 0:
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s);",
                    [app, name, datetime.now()]
                )
                print(f"Added missing migration: {app}.{name}")
        
        print("Migration records have been synchronized without affecting existing data.")
        print("You can now run 'python manage.py migrate' to apply any remaining migrations.")

if __name__ == '__main__':
    fix_migration_inconsistency()