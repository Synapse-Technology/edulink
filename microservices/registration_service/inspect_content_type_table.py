#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
django.setup()

import psycopg2
from django.conf import settings
from datetime import datetime

def get_db_connection():
    """Get database connection using Django settings"""
    print(f"Available databases: {list(settings.DATABASES.keys())}")
    
    # Try to get the default database, fallback to first available
    if 'default' in settings.DATABASES:
        db_config = settings.DATABASES['default']
    else:
        # Use the first available database
        first_db_key = list(settings.DATABASES.keys())[0]
        print(f"Using {first_db_key} as default database")
        db_config = settings.DATABASES[first_db_key]
    
    print(f"Database config: {db_config}")
    
    return psycopg2.connect(
        host=db_config['HOST'],
        port=db_config['PORT'],
        database=db_config['NAME'],
        user=db_config['USER'],
        password=db_config['PASSWORD'],
        options=db_config.get('OPTIONS', {}).get('options', '')
    )

def inspect_content_type_table():
    """Inspect the django_content_type table structure"""
    print("=== INSPECTING DJANGO_CONTENT_TYPE TABLE ===")
    
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
        
        if table_exists:
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
            
            # Check current data
            cursor.execute("SELECT * FROM auth_schema.django_content_type LIMIT 5;")
            rows = cursor.fetchall()
            print(f"\n📊 Current data ({len(rows)} rows shown):")
            for row in rows:
                print(f"  {row}")
            
            # Check what columns should exist according to Django model
            print("\n🎯 Expected columns for django_content_type:")
            print("  - id (integer, primary key)")
            print("  - app_label (varchar)")
            print("  - model (varchar)")
            print("  Note: 'name' column was removed in Django 1.8 migration contenttypes.0002_remove_content_type_name")
            
            # Check if name column exists (it shouldn't)
            has_name_column = any(col[0] == 'name' for col in columns)
            print(f"\n⚠️  'name' column exists: {has_name_column}")
            
            if has_name_column:
                print("\n🔧 ISSUE FOUND: 'name' column still exists but should have been removed")
                print("This suggests the contenttypes.0002_remove_content_type_name migration didn't run properly")
                
                # Check migration status
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
                
                return True  # Needs fixing
            else:
                print("\n✅ Table structure looks correct")
                return False  # No fixing needed
        
    except Exception as e:
        print(f"❌ Error inspecting table: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def fix_content_type_table():
    """Fix the django_content_type table by removing the name column"""
    print("\n=== FIXING DJANGO_CONTENT_TYPE TABLE ===")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Set schema
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Drop the name column
        print("🔧 Dropping 'name' column from django_content_type...")
        cursor.execute("ALTER TABLE auth_schema.django_content_type DROP COLUMN IF EXISTS name;")
        
        # Commit the change
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
        columns = [row[0] for row in cursor.fetchall()]
        print(f"✓ Current columns: {columns}")
        
        if 'name' not in columns:
            print("✅ 'name' column successfully removed")
            return True
        else:
            print("❌ 'name' column still exists")
            return False
            
    except Exception as e:
        print(f"❌ Error fixing table: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def test_django_operations():
    """Test Django operations after the fix"""
    print("\n=== TESTING DJANGO OPERATIONS ===")
    
    try:
        from django.contrib.contenttypes.models import ContentType
        
        # Test basic ContentType operations
        print("🧪 Testing ContentType model...")
        content_types = ContentType.objects.all()[:5]
        print(f"✓ Found {content_types.count()} content types")
        
        for ct in content_types:
            print(f"  - {ct.app_label}.{ct.model}")
        
        print("✅ Django ContentType operations work correctly")
        return True
        
    except Exception as e:
        print(f"❌ Django operations failed: {e}")
        return False

def main():
    print(f"Starting django_content_type table inspection at: {datetime.now()}")
    print("=" * 60)
    
    # Step 1: Inspect the table
    needs_fixing = inspect_content_type_table()
    
    if needs_fixing:
        # Step 2: Fix the table
        fix_success = fix_content_type_table()
        
        if fix_success:
            # Step 3: Test Django operations
            test_success = test_django_operations()
            
            if test_success:
                print("\n" + "=" * 50)
                print("✅ DJANGO_CONTENT_TYPE TABLE FIX COMPLETED")
                print("=" * 50)
                print(f"Completed at: {datetime.now()}")
            else:
                print("\n❌ Django operations still failing after fix")
                sys.exit(1)
        else:
            print("\n❌ Failed to fix table structure")
            sys.exit(1)
    else:
        # Test Django operations anyway
        test_success = test_django_operations()
        if test_success:
            print("\n✅ Table structure is correct and Django operations work")
        else:
            print("\n❌ Table structure looks correct but Django operations are failing")
            sys.exit(1)

if __name__ == "__main__":
    main()