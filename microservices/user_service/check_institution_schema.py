import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

with connection.cursor() as cursor:
    # Check tables in institution_schema
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'institution_schema'
        ORDER BY table_name;
    """)
    
    tables = cursor.fetchall()
    print("Tables in institution_schema:")
    for table in tables:
        print(f"  - {table[0]}")
    
    if not tables:
        print("  No tables found in institution_schema")
    
    print(f"\nTotal tables in institution_schema: {len(tables)}")
    
    # Check if master_institutions table exists in any schema
    cursor.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE '%institution%'
        ORDER BY table_schema, table_name;
    """)
    
    institution_tables = cursor.fetchall()
    print("\nAll institution-related tables across schemas:")
    for table in institution_tables:
        print(f"  - {table[0]}.{table[1]}")