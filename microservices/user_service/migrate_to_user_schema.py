import os
import django
from django.conf import settings
from django.core.management import execute_from_command_line
from django.db import connections

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

# Get the user_db connection
user_db_conn = connections['user_db']

print("Setting search_path to user_schema for migration...")

# Set the search_path to user_schema before running migrations
with user_db_conn.cursor() as cursor:
    cursor.execute("SET search_path TO user_schema, public")
    cursor.execute("SELECT current_schema()")
    current_schema = cursor.fetchone()[0]
    print(f"Current schema: {current_schema}")
    
    # Check if django_migrations table exists in user_schema
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'user_schema' 
            AND table_name = 'django_migrations'
        )
    """)
    migrations_table_exists = cursor.fetchone()[0]
    print(f"django_migrations table exists in user_schema: {migrations_table_exists}")
    
    if not migrations_table_exists:
        print("Creating django_migrations table in user_schema...")
        cursor.execute("""
            CREATE TABLE django_migrations (
                id SERIAL PRIMARY KEY,
                app VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """)
        print("django_migrations table created in user_schema")
    
    # Clear any existing institution migrations from user_schema
    cursor.execute("DELETE FROM django_migrations WHERE app = 'institutions'")
    print("Cleared existing institution migrations from user_schema")
    
    # Now run the migration
    print("\nRunning migration for institutions app...")
    
# Run the migration with the user_db database
try:
    execute_from_command_line(['manage.py', 'migrate', 'institutions', '--database=user_db'])
    print("Migration completed successfully!")
except Exception as e:
    print(f"Migration failed: {e}")

# Verify the tables were created
with user_db_conn.cursor() as cursor:
    cursor.execute("SET search_path TO user_schema, public")
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'user_schema'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    
    tables = cursor.fetchall()
    print(f"\nTables in user_schema after migration:")
    for table in tables:
        print(f"  - {table[0]}")