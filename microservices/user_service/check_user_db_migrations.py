import os
import django
from django.conf import settings
from django.db import connections

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

# Check migrations in user_db specifically
user_db_conn = connections['user_db']

with user_db_conn.cursor() as cursor:
    # Check current schema
    cursor.execute("SELECT current_schema()")
    current_schema = cursor.fetchone()[0]
    print(f"Current schema for user_db: {current_schema}")
    
    # Check if django_migrations table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = current_schema() 
            AND table_name = 'django_migrations'
        )
    """)
    migrations_table_exists = cursor.fetchone()[0]
    print(f"django_migrations table exists in current schema: {migrations_table_exists}")
    
    if migrations_table_exists:
        # Check applied migrations for institutions app
        cursor.execute("""
            SELECT app, name, applied 
            FROM django_migrations 
            WHERE app = 'institutions'
            ORDER BY applied DESC
        """)
        
        migrations = cursor.fetchall()
        print(f"\nApplied migrations for institutions app in user_db:")
        for migration in migrations:
            print(f"  - {migration[1]} (applied: {migration[2]})")
        
        if not migrations:
            print("  No migrations found for institutions app")
    
    # Check what tables exist in the current schema
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = current_schema()
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    
    tables = cursor.fetchall()
    print(f"\nTables in current schema ({current_schema}):")
    for table in tables:
        print(f"  - {table[0]}")
    
    # Check if we can manually set the search path
    cursor.execute("SET search_path TO user_schema, public")
    cursor.execute("SELECT current_schema()")
    new_schema = cursor.fetchone()[0]
    print(f"\nAfter setting search_path to user_schema: {new_schema}")
    
    # Check tables in user_schema
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'user_schema'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    
    user_schema_tables = cursor.fetchall()
    print(f"\nTables in user_schema:")
    for table in user_schema_tables:
        print(f"  - {table[0]}")