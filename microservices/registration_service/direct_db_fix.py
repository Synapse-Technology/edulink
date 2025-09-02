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

def inspect_and_fix_content_type_table():
    """Inspect and fix the django_content_type table"""
    print("=== INSPECTING AND FIXING DJANGO_CONTENT_TYPE TABLE ===")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Set schema
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'auth_schema' 
                AND table_name = 'django_content_type'
            );
        """)
        table_exists = cursor.fetchone()[0]
        print(f"✓ Table exists in auth_schema: {table_exists}")
        
        if not table_exists:
            print("❌ django_content_type table does not exist")
            return False
        
        # Get table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'auth_schema' 
            AND table_name = 'django_content_type'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print("\n📋 Current table structure:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]}) nullable={col[2]} default={col[3]}")
        
        # Check if name column exists (it shouldn't)
        has_name_column = any(col[0] == 'name' for col in columns)
        print(f"\n⚠️  'name' column exists: {has_name_column}")
        
        if has_name_column:
            print("\n🔧 FIXING: Removing 'name' column from django_content_type...")
            
            # Drop the name column
            cursor.execute("ALTER TABLE auth_schema.django_content_type DROP COLUMN name;")
            conn.commit()
            print("✅ Successfully dropped 'name' column")
            
            # Verify the fix
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'auth_schema' 
                AND table_name = 'django_content_type'
                ORDER BY ordinal_position;
            """)
            columns_after = [row[0] for row in cursor.fetchall()]
            print(f"✓ Columns after fix: {columns_after}")
            
            if 'name' not in columns_after:
                print("✅ 'name' column successfully removed")
            else:
                print("❌ 'name' column still exists after attempted removal")
                return False
        else:
            print("✅ Table structure is already correct (no 'name' column)")
        
        # Check current data
        cursor.execute("SELECT id, app_label, model FROM auth_schema.django_content_type LIMIT 5;")
        rows = cursor.fetchall()
        print(f"\n📊 Sample data ({len(rows)} rows):")
        for row in rows:
            print(f"  {row[0]}: {row[1]}.{row[2]}")
        
        # Check migration status for contenttypes
        cursor.execute("""
            SELECT app, name, applied 
            FROM auth_schema.django_migrations 
            WHERE app = 'contenttypes' 
            ORDER BY applied;
        """)
        migrations = cursor.fetchall()
        print("\n📝 Contenttypes migrations:")
        for mig in migrations:
            print(f"  {mig[0]}.{mig[1]} - {mig[2]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def test_table_access():
    """Test direct table access"""
    print("\n=== TESTING DIRECT TABLE ACCESS ===")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Set schema
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Test simple select
        cursor.execute("SELECT COUNT(*) FROM auth_schema.django_content_type;")
        count = cursor.fetchone()[0]
        print(f"✓ Total content types: {count}")
        
        # Test select with specific columns
        cursor.execute("SELECT id, app_label, model FROM auth_schema.django_content_type LIMIT 3;")
        rows = cursor.fetchall()
        print("✓ Sample content types:")
        for row in rows:
            print(f"  {row[0]}: {row[1]}.{row[2]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Direct table access failed: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def main():
    print(f"Starting direct database fix at: {datetime.now()}")
    print("=" * 60)
    
    # Step 1: Inspect and fix the table
    fix_success = inspect_and_fix_content_type_table()
    
    if fix_success:
        # Step 2: Test direct table access
        test_success = test_table_access()
        
        if test_success:
            print("\n" + "=" * 50)
            print("✅ DJANGO_CONTENT_TYPE TABLE FIX COMPLETED")
            print("=" * 50)
            print(f"Completed at: {datetime.now()}")
            print("\n🔧 Next step: Try running 'python manage.py migrate' again")
        else:
            print("\n❌ Direct table access still failing")
            return False
    else:
        print("\n❌ Failed to fix table")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)