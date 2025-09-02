#!/usr/bin/env python
import os
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_db_connection():
    """Get database connection using environment variables directly"""
    return psycopg2.connect(
        host=os.getenv('DATABASE_HOST', 'localhost'),
        port=os.getenv('DATABASE_PORT', '5432'),
        database=os.getenv('DATABASE_NAME', 'postgres'),
        user=os.getenv('DATABASE_USER', 'postgres'),
        password=os.getenv('DATABASE_PASSWORD', 'password')
    )

def fix_contenttypes_migration_state():
    """Fix the contenttypes migration state issue"""
    print("=== FIXING CONTENTTYPES MIGRATION STATE ===")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Set schema
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Check current migration state for contenttypes
        cursor.execute("""
            SELECT app, name, applied 
            FROM auth_schema.django_migrations 
            WHERE app = 'contenttypes' 
            ORDER BY applied;
        """)
        migrations = cursor.fetchall()
        print("\n📝 Current contenttypes migrations:")
        for mig in migrations:
            print(f"  {mig[0]}.{mig[1]} - {mig[2]}")
        
        # Check if 0002_remove_content_type_name is already recorded
        has_0002 = any('0002_remove_content_type_name' in mig[1] for mig in migrations)
        print(f"\n✓ contenttypes.0002_remove_content_type_name recorded: {has_0002}")
        
        if has_0002:
            print("\n🔧 Migration is already recorded but Django is trying to run it again.")
            print("This suggests a migration state inconsistency.")
            
            # Check table structure to confirm the migration was actually applied
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'auth_schema' 
                AND table_name = 'django_content_type'
                ORDER BY ordinal_position;
            """)
            columns = [row[0] for row in cursor.fetchall()]
            has_name_column = 'name' in columns
            print(f"✓ Table has 'name' column: {has_name_column}")
            
            if not has_name_column:
                print("\n✅ Migration was actually applied correctly (no 'name' column)")
                print("The issue is that Django's migration loader is confused.")
                
                # The solution is to fake the migration as already applied
                print("\n🔧 Solution: Mark all unapplied migrations as fake-applied")
                return True
            else:
                print("\n❌ Migration was recorded but not actually applied")
                print("Need to manually remove the 'name' column")
                
                # Remove the name column
                cursor.execute("ALTER TABLE auth_schema.django_content_type DROP COLUMN name;")
                conn.commit()
                print("✅ Manually removed 'name' column")
                return True
        else:
            print("\n❌ contenttypes.0002_remove_content_type_name not recorded")
            print("This migration needs to be marked as applied")
            
            # Check if name column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'auth_schema' 
                AND table_name = 'django_content_type'
                ORDER BY ordinal_position;
            """)
            columns = [row[0] for row in cursor.fetchall()]
            has_name_column = 'name' in columns
            
            if has_name_column:
                # Remove the column first
                cursor.execute("ALTER TABLE auth_schema.django_content_type DROP COLUMN name;")
                conn.commit()
                print("✅ Removed 'name' column")
            
            # Mark the migration as applied
            cursor.execute("""
                INSERT INTO auth_schema.django_migrations (app, name, applied)
                VALUES ('contenttypes', '0002_remove_content_type_name', NOW())
                ON CONFLICT (app, name) DO NOTHING;
            """)
            conn.commit()
            print("✅ Marked contenttypes.0002_remove_content_type_name as applied")
            return True
            
    except Exception as e:
        print(f"❌ Error fixing migration state: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def check_all_migration_states():
    """Check the state of all migrations that might be problematic"""
    print("\n=== CHECKING ALL MIGRATION STATES ===")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Set schema
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Get all recorded migrations
        cursor.execute("""
            SELECT app, COUNT(*) as count
            FROM auth_schema.django_migrations 
            GROUP BY app
            ORDER BY app;
        """)
        migration_counts = cursor.fetchall()
        print("\n📊 Migration counts by app:")
        for app, count in migration_counts:
            print(f"  {app}: {count} migrations")
        
        # Check for any problematic core migrations
        problematic_apps = ['contenttypes', 'auth', 'admin', 'sessions']
        for app in problematic_apps:
            cursor.execute("""
                SELECT name, applied 
                FROM auth_schema.django_migrations 
                WHERE app = %s 
                ORDER BY applied;
            """, (app,))
            app_migrations = cursor.fetchall()
            print(f"\n📝 {app} migrations:")
            for name, applied in app_migrations:
                print(f"  {name} - {applied}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking migration states: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def main():
    print(f"Starting migration state fix at: {datetime.now()}")
    print("=" * 60)
    
    # Step 1: Fix contenttypes migration state
    fix_success = fix_contenttypes_migration_state()
    
    if fix_success:
        # Step 2: Check all migration states
        check_success = check_all_migration_states()
        
        if check_success:
            print("\n" + "=" * 50)
            print("✅ MIGRATION STATE FIX COMPLETED")
            print("=" * 50)
            print(f"Completed at: {datetime.now()}")
            print("\n🔧 Next steps:")
            print("1. Try 'python manage.py migrate --fake-initial' to mark initial migrations as applied")
            print("2. Then try 'python manage.py migrate' to apply remaining migrations")
        else:
            print("\n❌ Failed to check migration states")
            return False
    else:
        print("\n❌ Failed to fix migration state")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)