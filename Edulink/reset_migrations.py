#!/usr/bin/env python
import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def reset_migration_history():
    """Clear all migration history from django_migrations table"""
    with connection.cursor() as cursor:
        try:
            cursor.execute("DELETE FROM django_migrations;")
            print("Migration history cleared successfully")
        except Exception as e:
            print(f"Error clearing migration history: {e}")

if __name__ == '__main__':
    reset_migration_history()