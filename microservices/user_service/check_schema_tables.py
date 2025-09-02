import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

with connection.cursor() as cursor:
    # Check tables in user_schema
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'user_schema'
        ORDER BY table_name;
    """)
    
    tables = cursor.fetchall()
    print("Tables in user_schema:")
    for table in tables:
        print(f"  - {table[0]}")
    
    if not tables:
        print("  No tables found in user_schema")
    
    print(f"\nTotal tables in user_schema: {len(tables)}")
    
    # Also check what schemas exist
    cursor.execute("""
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name;
    """)
    
    schemas = cursor.fetchall()
    print("\nAvailable schemas:")
    for schema in schemas:
        print(f"  - {schema[0]}")