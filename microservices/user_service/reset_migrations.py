#!/usr/bin/env python
import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

def reset_migrations():
    """Reset migration state by dropping django_migrations table"""
    with connection.cursor() as cursor:
        try:
            # Drop the django_migrations table to reset migration tracking
            cursor.execute("DROP TABLE IF EXISTS django_migrations CASCADE;")
            print("✅ Successfully dropped django_migrations table")
            
            # Also drop all existing tables to start fresh
            cursor.execute("""
                DROP SCHEMA public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO postgres;
                GRANT ALL ON SCHEMA public TO public;
            """)
            print("✅ Successfully reset database schema")
            
        except Exception as e:
            print(f"❌ Error resetting migrations: {e}")
            return False
    
    return True

if __name__ == '__main__':
    if reset_migrations():
        print("\n🎉 Migration state reset successfully!")
        print("Now run: python manage.py migrate")
    else:
        print("\n💥 Failed to reset migration state")