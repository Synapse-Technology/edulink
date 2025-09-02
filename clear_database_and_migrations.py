#!/usr/bin/env python3
"""
Comprehensive Database and Migration Cleanup Script
Clears all database records and migration files across all microservices
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database connection settings
DB_CONFIG = {
    'host': 'aws-0-us-east-1.pooler.supabase.com',
    'port': 6543,
    'user': 'postgres.ixqjqjqjqjqjqjqj',
    'database': 'postgres'
}

# Schema names to clear
SCHEMAS = [
    'auth_schema',
    'user_schema',
    'institution_schema',
    'notification_schema',
    'application_schema',
    'internship_schema'
]

# Migration directories to clear
MIGRATION_DIRS = [
    # Main Edulink app migrations
    'Edulink/application/migrations',
    'Edulink/authentication/migrations',
    'Edulink/chatbot/migrations',
    'Edulink/dashboards/migrations',
    'Edulink/employers/migrations',
    'Edulink/institutions/migrations',
    'Edulink/internship/migrations',
    'Edulink/internship_progress/migrations',
    'Edulink/security/migrations',
    'Edulink/users/migrations',
    
    # Microservices migrations
    'microservices/auth_service/authentication/migrations',
    'microservices/auth_service/security/migrations',
    'microservices/user_service/profiles/migrations',
    'microservices/user_service/roles/migrations',
    'microservices/user_service/institutions/migrations',
    'microservices/user_service/companies/migrations',
    'microservices/application_service/applications/migrations',
    'microservices/internship_service/internships/migrations',
    'microservices/notification_service/notifications/migrations'
]

def get_db_password():
    """Get database password from environment or prompt user"""
    password = os.getenv('DB_PASSWORD')
    if not password:
        import getpass
        password = getpass.getpass("Enter database password: ")
    return password

def connect_to_database():
    """Establish database connection"""
    try:
        password = get_db_password()
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=password,
            database=DB_CONFIG['database']
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def clear_database_schemas(conn):
    """Clear all data from database schemas"""
    cursor = conn.cursor()
    
    print("\n=== Clearing Database Schemas ===")
    
    for schema in SCHEMAS:
        try:
            print(f"Processing schema: {schema}")
            
            # Get all tables in the schema
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = %s AND table_type = 'BASE TABLE'
            """, (schema,))
            
            tables = cursor.fetchall()
            
            if tables:
                # Disable foreign key checks temporarily
                cursor.execute(f"SET session_replication_role = 'replica';")
                
                # Drop all tables in the schema
                for (table_name,) in tables:
                    print(f"  Dropping table: {schema}.{table_name}")
                    cursor.execute(f"DROP TABLE IF EXISTS {schema}.{table_name} CASCADE;")
                
                # Re-enable foreign key checks
                cursor.execute(f"SET session_replication_role = 'origin';")
                
                print(f"  ✓ Cleared {len(tables)} tables from {schema}")
            else:
                print(f"  ✓ No tables found in {schema}")
                
        except Exception as e:
            print(f"  ✗ Error clearing schema {schema}: {e}")
    
    cursor.close()
    print("\n✓ Database schema clearing completed")

def clear_migration_files():
    """Clear all migration files while preserving __init__.py"""
    print("\n=== Clearing Migration Files ===")
    
    base_path = Path.cwd()
    cleared_count = 0
    
    for migration_dir in MIGRATION_DIRS:
        migration_path = base_path / migration_dir
        
        if migration_path.exists():
            print(f"Processing: {migration_dir}")
            
            # Get all Python files except __init__.py
            migration_files = [
                f for f in migration_path.glob('*.py') 
                if f.name != '__init__.py'
            ]
            
            for migration_file in migration_files:
                try:
                    migration_file.unlink()
                    print(f"  ✓ Deleted: {migration_file.name}")
                    cleared_count += 1
                except Exception as e:
                    print(f"  ✗ Error deleting {migration_file.name}: {e}")
            
            # Ensure __init__.py exists
            init_file = migration_path / '__init__.py'
            if not init_file.exists():
                init_file.touch()
                print(f"  ✓ Created: __init__.py")
        else:
            print(f"  ⚠ Directory not found: {migration_dir}")
    
    print(f"\n✓ Cleared {cleared_count} migration files")

def clear_pycache():
    """Clear all __pycache__ directories"""
    print("\n=== Clearing Python Cache ===")
    
    base_path = Path.cwd()
    cache_dirs = list(base_path.rglob('__pycache__'))
    
    cleared_count = 0
    for cache_dir in cache_dirs:
        try:
            shutil.rmtree(cache_dir)
            print(f"  ✓ Deleted: {cache_dir.relative_to(base_path)}")
            cleared_count += 1
        except Exception as e:
            print(f"  ✗ Error deleting {cache_dir}: {e}")
    
    print(f"\n✓ Cleared {cleared_count} cache directories")

def verify_cleanup():
    """Verify that cleanup was successful"""
    print("\n=== Verification ===")
    
    base_path = Path.cwd()
    
    # Check for remaining migration files
    remaining_migrations = []
    for migration_dir in MIGRATION_DIRS:
        migration_path = base_path / migration_dir
        if migration_path.exists():
            migration_files = [
                f for f in migration_path.glob('*.py') 
                if f.name != '__init__.py'
            ]
            if migration_files:
                remaining_migrations.extend(migration_files)
    
    if remaining_migrations:
        print(f"  ⚠ Found {len(remaining_migrations)} remaining migration files:")
        for f in remaining_migrations[:5]:  # Show first 5
            print(f"    - {f}")
        if len(remaining_migrations) > 5:
            print(f"    ... and {len(remaining_migrations) - 5} more")
    else:
        print("  ✓ All migration files cleared successfully")
    
    # Check for remaining cache directories
    remaining_cache = list(base_path.rglob('__pycache__'))
    if remaining_cache:
        print(f"  ⚠ Found {len(remaining_cache)} remaining cache directories")
    else:
        print("  ✓ All cache directories cleared successfully")

def main():
    """Main execution function"""
    print("Edulink Database and Migration Cleanup Script")
    print("=" * 50)
    
    # Confirm with user
    response = input("\nThis will permanently delete all database records and migration files. Continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    try:
        # Step 1: Clear database schemas
        print("\nStep 1: Connecting to database...")
        conn = connect_to_database()
        if conn:
            clear_database_schemas(conn)
            conn.close()
        else:
            print("⚠ Skipping database cleanup due to connection error")
        
        # Step 2: Clear migration files
        print("\nStep 2: Clearing migration files...")
        clear_migration_files()
        
        # Step 3: Clear Python cache
        print("\nStep 3: Clearing Python cache...")
        clear_pycache()
        
        # Step 4: Verify cleanup
        print("\nStep 4: Verifying cleanup...")
        verify_cleanup()
        
        print("\n" + "=" * 50)
        print("✓ Database and migration cleanup completed successfully!")
        print("\nNext steps:")
        print("1. Restructure data models according to best practices")
        print("2. Create new migrations for the restructured models")
        print("3. Implement data synchronization mechanisms")
        
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()