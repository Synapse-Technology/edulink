#!/usr/bin/env python3
"""Script to check database schemas and table placement."""

import os
import environ
from pathlib import Path
import psycopg2
from psycopg2 import sql

def main():
    # Load environment variables from auth_service
    env = environ.Env()
    env_path = Path('microservices/auth_service/.env')
    environ.Env.read_env(env_path)
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=env('DATABASE_HOST'),
            port=env('DATABASE_PORT'),
            database=env('DATABASE_NAME'),
            user=env('DATABASE_USER'),
            password=env('DATABASE_PASSWORD')
        )
        
        cur = conn.cursor()
        
        # Check for service schemas (excluding system schemas)
        print("=== SERVICE SCHEMAS ===")
        cur.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE '%_schema' 
            AND schema_name NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schema_name
        """)
        schemas = cur.fetchall()
        
        if schemas:
            for schema in schemas:
                print(f"✓ {schema[0]}")
        else:
            print("❌ No service schemas found")
        
        # Check tables in each service schema (excluding system schemas)
        print("\n=== TABLES BY SERVICE SCHEMA ===")
        cur.execute("""
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema LIKE '%_schema' 
            AND table_schema NOT IN ('information_schema', 'pg_catalog')
            AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name
        """)
        tables = cur.fetchall()
        
        if tables:
            current_schema = None
            for table in tables:
                schema, name, table_type = table
                if schema != current_schema:
                    print(f"\n{schema}:")
                    current_schema = schema
                print(f"  - {name}")
        else:
            print("❌ No tables found in service schemas")
        
        # Check public schema tables (should be minimal)
        print("\n=== PUBLIC SCHEMA TABLES ===")
        cur.execute("""
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name NOT LIKE 'pg_%'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        public_tables = cur.fetchall()
        
        if public_tables:
            print("⚠️  Application tables found in public schema:")
            for table in public_tables:
                print(f"  - {table[0]}")
        else:
            print("✓ No application tables in public schema")
        
        # Summary
        print("\n=== SUMMARY ===")
        schema_count = len(schemas)
        table_count = len(tables)
        public_count = len(public_tables)
        
        print(f"Service schemas: {schema_count}")
        print(f"Tables in service schemas: {table_count}")
        print(f"Application tables in public schema: {public_count}")
        
        if schema_count > 0 and table_count > 0 and public_count == 0:
            print("\n✅ Perfect schema isolation! All tables are in their respective service schemas.")
        elif schema_count > 0 and table_count > 0:
            print("\n⚠️  Schema isolation is partially working, but some tables are in public schema.")
        else:
            print("\n❌ Schema isolation needs attention")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())