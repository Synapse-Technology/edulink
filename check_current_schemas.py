#!/usr/bin/env python3
"""Check current database schema implementation."""

import os
import psycopg2
from psycopg2 import sql

def check_schemas():
    """Check what tables exist in each schema."""
    try:
        # Connect to database
        conn = psycopg2.connect(
            host='localhost',
            user='postgres',
            database='edulink_db'
        )
        cur = conn.cursor()
        
        # Check existing schemas
        cur.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name IN ('auth_schema', 'user_schema', 'application_schema', 'internship_schema', 'public')
            ORDER BY schema_name;
        """)
        schemas = cur.fetchall()
        print("Existing schemas:")
        for schema in schemas:
            print(f"  - {schema[0]}")
        
        print("\n" + "="*50)
        
        # Check tables in each schema
        for schema in schemas:
            schema_name = schema[0]
            cur.execute("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = %s 
                ORDER BY tablename;
            """, (schema_name,))
            tables = cur.fetchall()
            
            print(f"\nTables in {schema_name}:")
            if tables:
                for table in tables:
                    print(f"  - {table[0]}")
            else:
                print("  (no tables)")
        
        # Check Django's built-in tables specifically
        print("\n" + "="*50)
        print("\nDjango built-in tables location:")
        django_tables = ['auth_user', 'auth_group', 'auth_permission', 'django_admin_log', 'django_content_type', 'django_session']
        
        for table in django_tables:
            cur.execute("""
                SELECT schemaname 
                FROM pg_tables 
                WHERE tablename = %s;
            """, (table,))
            result = cur.fetchone()
            if result:
                print(f"  - {table}: {result[0]}")
            else:
                print(f"  - {table}: NOT FOUND")
        
        conn.close()
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schemas()