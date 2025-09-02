#!/usr/bin/env python
import os
import psycopg2
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

print("=== Database Schema Analysis ===")

try:
    # Connect to database
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    # Get all schemas
    cur.execute("""
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name;
    """)
    schemas = cur.fetchall()
    print(f"Available schemas: {[s[0] for s in schemas]}")
    
    # Check specific schemas for tables
    target_schemas = ['auth_schema', 'institution_schema', 'user_schema', 'public']
    
    for schema in target_schemas:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = %s
            ORDER BY table_name;
        """, (schema,))
        tables = cur.fetchall()
        table_names = [t[0] for t in tables]
        print(f"\n{schema} tables ({len(table_names)}):")
        if table_names:
            for table in table_names:
                print(f"  - {table}")
        else:
            print("  (no tables)")
    
    # Check for auth_user specifically
    cur.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name = 'auth_user';
    """)
    auth_user_locations = cur.fetchall()
    print(f"\nauth_user table found in: {auth_user_locations}")
    
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()