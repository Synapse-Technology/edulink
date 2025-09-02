#!/usr/bin/env python3
"""Script to create database schemas for each microservice."""

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
    
    # Define service schemas
    schemas = [
        'auth_schema',
        'user_schema', 
        'institution_schema',
        'notification_schema',
        'application_schema',
        'internship_schema'
    ]
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=env('DATABASE_HOST'),
            port=env('DATABASE_PORT'),
            database=env('DATABASE_NAME'),
            user=env('DATABASE_USER'),
            password=env('DATABASE_PASSWORD')
        )
        
        # Enable autocommit for schema creation
        conn.autocommit = True
        cur = conn.cursor()
        
        print("=== CREATING SERVICE SCHEMAS ===")
        
        for schema in schemas:
            try:
                # Create schema if it doesn't exist
                cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                    sql.Identifier(schema)
                ))
                print(f"✓ Created/verified schema: {schema}")
                
                # Grant usage permissions
                cur.execute(sql.SQL("GRANT USAGE ON SCHEMA {} TO {}").format(
                    sql.Identifier(schema),
                    sql.Identifier(env('DATABASE_USER'))
                ))
                
                # Grant create permissions
                cur.execute(sql.SQL("GRANT CREATE ON SCHEMA {} TO {}").format(
                    sql.Identifier(schema),
                    sql.Identifier(env('DATABASE_USER'))
                ))
                
            except Exception as e:
                print(f"❌ Error creating schema {schema}: {e}")
        
        # Verify schemas were created
        print("\n=== VERIFYING SCHEMAS ===")
        cur.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE '%_schema'
            AND schema_name NOT IN ('information_schema')
            ORDER BY schema_name
        """)
        
        created_schemas = cur.fetchall()
        for schema in created_schemas:
            print(f"✓ {schema[0]}")
        
        print(f"\n✅ Successfully created {len(created_schemas)} service schemas!")
        print("\nNext steps:")
        print("1. Run migrations for each service to create tables in their respective schemas")
        print("2. Verify tables are created in the correct schemas")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())