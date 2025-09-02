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
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth_service.settings')
django.setup()

from django.conf import settings

def verify_migrations():
    """
    Verify that all migrations have been applied and tables exist in both schemas
    """
    print("🔍 VERIFYING MIGRATIONS AND DATABASE STATE")
    print("=" * 60)
    
    # Get database configuration
    db_key = 'default' if 'default' in settings.DATABASES else list(settings.DATABASES.keys())[0]
    db_config = settings.DATABASES[db_key]
    
    print(f"📊 Database: {db_config['NAME']}")
    print(f"🏠 Host: {db_config['HOST']}:{db_config['PORT']}")
    print(f"👤 User: {db_config['USER']}")
    
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
            print("\n" + "=" * 60)
            print("📋 MIGRATION RECORDS VERIFICATION")
            print("=" * 60)
            
            # Check all applied migrations
            cursor.execute("""
                SELECT app, name, applied 
                FROM django_migrations 
                ORDER BY app, applied;
            """)
            
            migrations = cursor.fetchall()
            print(f"\n✅ Total migrations applied: {len(migrations)}")
            
            # Group by app
            apps = {}
            for app, name, applied in migrations:
                if app not in apps:
                    apps[app] = []
                apps[app].append((name, applied))
            
            for app, app_migrations in apps.items():
                print(f"\n📱 {app.upper()} ({len(app_migrations)} migrations):")
                for name, applied in app_migrations:
                    print(f"  ✓ {name} - {applied}")
            
            print("\n" + "=" * 60)
            print("🗄️  DATABASE TABLES VERIFICATION")
            print("=" * 60)
            
            # Check tables in public schema
            print("\n📊 PUBLIC SCHEMA TABLES:")
            cursor.execute("""
                SELECT table_name, table_type
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            
            public_tables = cursor.fetchall()
            print(f"Found {len(public_tables)} tables in public schema:")
            for table_name, table_type in public_tables:
                print(f"  📋 {table_name} ({table_type})")
            
            # Check tables in auth_schema if it exists
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = 'auth_schema';
            """)
            
            auth_schema_exists = cursor.fetchone()
            
            if auth_schema_exists:
                print("\n📊 AUTH_SCHEMA TABLES:")
                cursor.execute("""
                    SELECT table_name, table_type
                    FROM information_schema.tables 
                    WHERE table_schema = 'auth_schema' 
                    ORDER BY table_name;
                """)
                
                auth_tables = cursor.fetchall()
                print(f"Found {len(auth_tables)} tables in auth_schema:")
                for table_name, table_type in auth_tables:
                    print(f"  📋 {table_name} ({table_type})")
            else:
                print("\n⚠️  auth_schema does not exist")
            
            print("\n" + "=" * 60)
            print("🔍 CRITICAL TABLES VERIFICATION")
            print("=" * 60)
            
            # Check critical Django tables
            critical_tables = [
                'django_migrations',
                'django_content_type',
                'django_session',
                'auth_user',
                'auth_group',
                'auth_permission',
                'django_admin_log'
            ]
            
            print("\n🔑 Checking critical Django tables:")
            for table in critical_tables:
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_name = %s AND table_schema = 'public';
                """, (table,))
                
                exists = cursor.fetchone()[0] > 0
                status = "✅ EXISTS" if exists else "❌ MISSING"
                print(f"  {status} {table}")
                
                if exists:
                    # Get row count
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    print(f"    📊 Rows: {count}")
            
            # Check registration service specific tables
            print("\n📝 Checking registration service tables:")
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%registration%'
                ORDER BY table_name;
            """)
            
            reg_tables = cursor.fetchall()
            if reg_tables:
                for (table_name,) in reg_tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                    count = cursor.fetchone()[0]
                    print(f"  ✅ {table_name} - {count} rows")
            else:
                print("  ⚠️  No registration-specific tables found")
            
            print("\n" + "=" * 60)
            print("🔗 FOREIGN KEY CONSTRAINTS VERIFICATION")
            print("=" * 60)
            
            # Check foreign key constraints
            cursor.execute("""
                SELECT 
                    tc.table_name, 
                    tc.constraint_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_schema = 'public'
                ORDER BY tc.table_name;
            """)
            
            fk_constraints = cursor.fetchall()
            print(f"\n🔗 Found {len(fk_constraints)} foreign key constraints:")
            
            current_table = None
            for table_name, constraint_name, column_name, foreign_table, foreign_column in fk_constraints:
                if table_name != current_table:
                    print(f"\n  📋 {table_name}:")
                    current_table = table_name
                print(f"    🔗 {column_name} → {foreign_table}.{foreign_column}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        conn.close()
    
    print("\n" + "=" * 60)
    print("✅ MIGRATION VERIFICATION COMPLETED")
    print("=" * 60)
    
    return True

if __name__ == '__main__':
    verify_migrations()