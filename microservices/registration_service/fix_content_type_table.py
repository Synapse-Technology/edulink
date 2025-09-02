#!/usr/bin/env python
"""
Script to fix the django_content_type table structure issue.

The issue is that the table exists but is missing the 'name' column
which was removed in contenttypes migration 0002_remove_content_type_name.
"""

import os
import psycopg2
from urllib.parse import urlparse, unquote
from datetime import datetime

def get_db_connection():
    """Get database connection from environment variables."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        parsed = urlparse(database_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=unquote(parsed.password),
            sslmode='require'
        )
    else:
        password = os.getenv('DATABASE_PASSWORD')
        if password and '%' in password:
            password = unquote(password)
        
        return psycopg2.connect(
            host=os.getenv('DATABASE_HOST'),
            port=os.getenv('DATABASE_PORT'),
            database=os.getenv('DATABASE_NAME'),
            user=os.getenv('DATABASE_USER'),
            password=password,
            sslmode='require'
        )

def analyze_content_type_table():
    """Analyze the current structure of django_content_type table."""
    print("=== ANALYZING DJANGO_CONTENT_TYPE TABLE ===")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Check table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'auth_schema' AND table_name = 'django_content_type'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print(f"Current django_content_type structure:")
        for col_name, data_type, nullable, default in columns:
            print(f"  {col_name}: {data_type} (nullable: {nullable}, default: {default})")
        
        # Check current data
        cursor.execute("SELECT COUNT(*) FROM django_content_type;")
        count = cursor.fetchone()[0]
        print(f"\nCurrent records: {count}")
        
        if count > 0:
            cursor.execute("SELECT * FROM django_content_type LIMIT 5;")
            records = cursor.fetchall()
            print("\nSample records:")
            for record in records:
                print(f"  {record}")
        
        cursor.close()
        conn.close()
        return columns
        
    except Exception as e:
        print(f"❌ Error analyzing table: {e}")
        return []

def fix_content_type_table():
    """Fix the django_content_type table structure."""
    print("\n=== FIXING DJANGO_CONTENT_TYPE TABLE ===")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Check if 'name' column exists
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'auth_schema' 
            AND table_name = 'django_content_type' 
            AND column_name = 'name';
        """)
        
        name_column_exists = cursor.fetchone() is not None
        
        if name_column_exists:
            print("✓ 'name' column exists - this is unexpected for modern Django")
            
            # Check migration state for contenttypes
            cursor.execute("""
                SELECT name FROM django_migrations 
                WHERE app = 'contenttypes' 
                ORDER BY applied;
            """)
            
            contenttypes_migrations = [row[0] for row in cursor.fetchall()]
            print(f"Applied contenttypes migrations: {contenttypes_migrations}")
            
            if '0002_remove_content_type_name' in contenttypes_migrations:
                print("⚠️  Migration 0002_remove_content_type_name is marked as applied but 'name' column still exists")
                print("This suggests the migration was faked but not actually executed")
                
                # Remove the name column manually
                print("Removing 'name' column manually...")
                cursor.execute("ALTER TABLE django_content_type DROP COLUMN IF EXISTS name;")
                print("✓ Removed 'name' column")
            
        else:
            print("✓ 'name' column does not exist - table structure is correct")
        
        # Verify the table has the correct structure
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'auth_schema' AND table_name = 'django_content_type'
            ORDER BY ordinal_position;
        """)
        
        final_columns = [row[0] for row in cursor.fetchall()]
        expected_columns = ['id', 'app_label', 'model']
        
        print(f"\nFinal table structure: {final_columns}")
        print(f"Expected structure: {expected_columns}")
        
        if set(final_columns) == set(expected_columns):
            print("✅ Table structure is now correct")
        else:
            print("⚠️  Table structure still doesn't match expected")
        
        # Commit changes
        conn.commit()
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error fixing table: {e}")
        return False

def update_migration_records():
    """Update migration records to reflect the actual state."""
    print("\n=== UPDATING MIGRATION RECORDS ===")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SET search_path TO auth_schema, public;")
        
        # Ensure contenttypes migrations are properly recorded
        contenttypes_migrations = [
            ('contenttypes', '0001_initial'),
            ('contenttypes', '0002_remove_content_type_name'),
        ]
        
        for app, name in contenttypes_migrations:
            cursor.execute(
                "SELECT id FROM django_migrations WHERE app = %s AND name = %s;",
                (app, name)
            )
            
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s);",
                    (app, name, datetime.now())
                )
                print(f"✓ Added migration record: {app}.{name}")
            else:
                print(f"ℹ️  Migration record already exists: {app}.{name}")
        
        conn.commit()
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error updating migration records: {e}")
        return False

def test_django_operations():
    """Test basic Django operations to ensure everything works."""
    print("\n=== TESTING DJANGO OPERATIONS ===")
    
    try:
        import django
        from django.conf import settings
        
        if not settings.configured:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
            django.setup()
        
        from django.contrib.contenttypes.models import ContentType
        
        # Test basic ContentType operations
        print("Testing ContentType model...")
        
        # Try to get all content types
        content_types = ContentType.objects.all()[:5]
        print(f"✓ Found {len(content_types)} content types")
        
        for ct in content_types:
            print(f"  - {ct.app_label}.{ct.model}")
        
        print("✅ Django ContentType operations work correctly")
        return True
        
    except Exception as e:
        print(f"⚠️  Django test error: {e}")
        return False

def main():
    """Main function to fix content type table issues."""
    print("DJANGO_CONTENT_TYPE TABLE FIX")
    print("=" * 50)
    print(f"Started at: {datetime.now()}")
    
    # Step 1: Analyze current table structure
    columns = analyze_content_type_table()
    if not columns:
        print("❌ Could not analyze table structure")
        return 1
    
    # Step 2: Fix table structure
    if not fix_content_type_table():
        print("❌ Failed to fix table structure")
        return 1
    
    # Step 3: Update migration records
    if not update_migration_records():
        print("❌ Failed to update migration records")
        return 1
    
    # Step 4: Test Django operations
    test_django_operations()
    
    print("\n" + "=" * 50)
    print("✅ DJANGO_CONTENT_TYPE TABLE FIX COMPLETED")
    print("=" * 50)
    print(f"Completed at: {datetime.now()}")
    
    return 0

if __name__ == '__main__':
    exit(main())