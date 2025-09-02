#!/usr/bin/env python
import os
import sys
import django
from dotenv import load_dotenv
import psycopg2
from datetime import datetime

# Load environment variables
load_dotenv()

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
django.setup()

from django.conf import settings

def force_migration_fix():
    """
    Directly mark the problematic contenttypes migration as applied
    without running the actual migration code.
    """
    print("🔧 FORCE MIGRATION FIX")
    print("=" * 50)
    
    # Get database configuration
    print(f"Available databases: {list(settings.DATABASES.keys())}")
    
    # Use the first available database or 'default'
    db_key = 'default' if 'default' in settings.DATABASES else list(settings.DATABASES.keys())[0]
    db_config = settings.DATABASES[db_key]
    print(f"Using database: {db_key}")
    
    # Connect to database
    conn = psycopg2.connect(
        host=db_config['HOST'],
        port=db_config['PORT'],
        database=db_config['NAME'],
        user=db_config['USER'],
        password=db_config['PASSWORD'],
        options=db_config.get('OPTIONS', {}).get('options', '')
    )
    
    try:
        with conn.cursor() as cursor:
            # Check current migration state
            print("📋 Checking current migration state...")
            cursor.execute("""
                SELECT app, name, applied 
                FROM django_migrations 
                WHERE app = 'contenttypes' 
                ORDER BY applied;
            """)
            
            migrations = cursor.fetchall()
            print(f"Found {len(migrations)} contenttypes migrations:")
            for app, name, applied in migrations:
                print(f"  {name} - {applied}")
            
            # Check if the problematic migration is already recorded
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'contenttypes' AND name = '0002_remove_content_type_name';
            """)
            
            exists = cursor.fetchone()[0]
            
            if exists == 0:
                print("\n✅ Inserting migration record for contenttypes.0002_remove_content_type_name...")
                
                # Insert the migration record directly
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('contenttypes', '0002_remove_content_type_name', %s);
                """, (datetime.now(),))
                
                print("✅ Migration record inserted successfully!")
            else:
                print("\n⚠️  Migration record already exists")
            
            # Also check and insert auth.0006_require_contenttypes_0002 if needed
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'auth' AND name = '0006_require_contenttypes_0002';
            """)
            
            auth_exists = cursor.fetchone()[0]
            
            if auth_exists == 0:
                print("\n✅ Inserting migration record for auth.0006_require_contenttypes_0002...")
                
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('auth', '0006_require_contenttypes_0002', %s);
                """, (datetime.now(),))
                
                print("✅ Auth migration record inserted successfully!")
            else:
                print("\n⚠️  Auth migration record already exists")
            
            # Commit the changes
            conn.commit()
            
            print("\n📋 Final migration state:")
            cursor.execute("""
                SELECT app, name, applied 
                FROM django_migrations 
                WHERE app IN ('contenttypes', 'auth') 
                ORDER BY app, applied;
            """)
            
            final_migrations = cursor.fetchall()
            for app, name, applied in final_migrations:
                print(f"  {app}.{name} - {applied}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
    
    print("\n" + "=" * 50)
    print("✅ FORCE MIGRATION FIX COMPLETED")
    print("=" * 50)
    print("\n🔧 Next step: Try 'python manage.py migrate' again")
    
    return True

if __name__ == '__main__':
    force_migration_fix()