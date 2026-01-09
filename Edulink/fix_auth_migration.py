#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def fix_migration_dependency():
    """Mark missing dependency migration as applied to fix inconsistent history"""
    with connection.cursor() as cursor:
        # Check if application.0002_initial is already marked as applied
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app = 'application' AND name = '0002_initial';"
        )
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("Marking application.0002_initial as applied...")
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES ('application', '0002_initial', NOW());"
            )
            print("✓ application.0002_initial marked as applied")
        else:
            print("application.0002_initial is already marked as applied")
        
        # Check if authentication.0002_initial needs to be applied
        cursor.execute(
            "SELECT COUNT(*) FROM django_migrations WHERE app = 'authentication' AND name = '0002_initial';"
        )
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("authentication.0002_initial still needs to be applied after fixing dependency")
        else:
            print("authentication.0002_initial is already applied")

if __name__ == '__main__':
    fix_migration_dependency()
    print("\nDependency issue fixed. Now run 'python manage.py migrate authentication' to apply the authentication migration.")