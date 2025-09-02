#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
sys.path.append(str(project_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection
from django.conf import settings

def reset_database():
    """Completely reset the database by dropping and recreating it"""
    print("Starting complete database reset...")
    
    try:
        # Get database name from settings
        db_name = settings.DATABASES['default']['NAME']
        print(f"Database: {db_name}")
        
        with connection.cursor() as cursor:
            # Drop all tables
            print("Dropping all tables...")
            cursor.execute("""
                DO $$ DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                    END LOOP;
                END $$;
            """)
            
            # Drop all sequences
            print("Dropping all sequences...")
            cursor.execute("""
                DO $$ DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
                    END LOOP;
                END $$;
            """)
            
        print("Database cleared successfully!")
        
        # Run migrations from scratch
        print("Running migrations from scratch...")
        execute_from_command_line(['manage.py', 'migrate'])
        
        print("Database reset completed successfully!")
        
    except Exception as e:
        print(f"Error during database reset: {e}")
        return False
    
    return True

if __name__ == '__main__':
    success = reset_database()
    if success:
        print("\n✅ Database reset completed successfully!")
        print("You can now run your application.")
    else:
        print("\n❌ Database reset failed. Please check the errors above.")
        sys.exit(1)