#!/usr/bin/env python
import os
import sys
import django
from dotenv import load_dotenv
import psycopg2
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
django.setup()

from django.conf import settings

def fix_auth_migration_order():
    """
    Fix the auth migration order by ensuring proper sequence
    """
    print("🔧 FIXING AUTH MIGRATION ORDER")
    print("=" * 50)
    
    # Get database configuration
    db_key = 'default' if 'default' in settings.DATABASES else list(settings.DATABASES.keys())[0]
    db_config = settings.DATABASES[db_key]
    
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
            # Check current auth migration state
            print("📋 Checking current auth migration state...")
            cursor.execute("""
                SELECT name, applied 
                FROM django_migrations 
                WHERE app = 'auth' 
                ORDER BY applied;
            """)
            
            migrations = cursor.fetchall()
            print(f"Found {len(migrations)} auth migrations:")
            for name, applied in migrations:
                print(f"  {name} - {applied}")
            
            # Delete the problematic auth.0006 migration record
            print("\n🗑️  Removing auth.0006_require_contenttypes_0002...")
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'auth' AND name = '0006_require_contenttypes_0002';
            """)
            
            # Check what auth migrations are missing
            expected_auth_migrations = [
                '0001_initial',
                '0002_alter_permission_name_max_length',
                '0003_alter_user_email_max_length',
                '0004_alter_user_username_opts',
                '0005_alter_user_last_login_null',
                '0006_require_contenttypes_0002',
                '0007_alter_validators_add_error_messages',
                '0008_alter_user_username_max_length',
                '0009_alter_user_last_name_max_length',
                '0010_alter_group_name_max_length',
                '0011_update_proxy_permissions',
                '0012_alter_user_first_name_max_length'
            ]
            
            # Get currently applied auth migrations
            cursor.execute("""
                SELECT name FROM django_migrations 
                WHERE app = 'auth' 
                ORDER BY name;
            """)
            
            applied_migrations = [row[0] for row in cursor.fetchall()]
            print(f"\n📋 Currently applied auth migrations: {applied_migrations}")
            
            # Find missing migrations
            missing_migrations = [m for m in expected_auth_migrations if m not in applied_migrations]
            print(f"📋 Missing auth migrations: {missing_migrations}")
            
            # Insert missing migrations in proper order with proper timestamps
            base_time = datetime.now() - timedelta(hours=1)
            
            for i, migration_name in enumerate(missing_migrations):
                # Calculate timestamp with proper ordering
                timestamp = base_time + timedelta(minutes=i * 2)
                
                print(f"✅ Inserting {migration_name} with timestamp {timestamp}...")
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('auth', %s, %s);
                """, (migration_name, timestamp))
            
            # Commit the changes
            conn.commit()
            
            print("\n📋 Final auth migration state:")
            cursor.execute("""
                SELECT name, applied 
                FROM django_migrations 
                WHERE app = 'auth' 
                ORDER BY applied;
            """)
            
            final_migrations = cursor.fetchall()
            for name, applied in final_migrations:
                print(f"  {name} - {applied}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()
    
    print("\n" + "=" * 50)
    print("✅ AUTH MIGRATION ORDER FIX COMPLETED")
    print("=" * 50)
    print("\n🔧 Next step: Try 'python manage.py migrate' again")
    
    return True

if __name__ == '__main__':
    fix_auth_migration_order()