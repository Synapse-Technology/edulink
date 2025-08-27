#!/usr/bin/env python3
"""
Script to create database schemas for Edulink microservices.
This script reads the PostgreSQL schema setup file and executes it.
"""

import os
import sys
import psycopg2
from pathlib import Path
import environ

# Load environment variables from auth_service .env file
auth_env_path = Path(__file__).parent / 'microservices' / 'auth_service' / '.env'
if auth_env_path.exists():
    environ.Env.read_env(str(auth_env_path))

env = environ.Env()

# Database connection details from environment
DATABASE_HOST = env('DATABASE_HOST', default='localhost')
DATABASE_PORT = env('DATABASE_PORT', default='5432')
DATABASE_NAME = env('DATABASE_NAME', default='postgres')
DATABASE_USER = env('DATABASE_USER', default='postgres')
DATABASE_PASSWORD = env('DATABASE_PASSWORD', default='')

def create_schemas():
    """Create all required schemas in the database."""
    
    # Read the schema setup SQL file
    microservices_dir = Path(__file__).parent / 'microservices'
    sql_file_path = microservices_dir / 'shared' / 'database' / 'postgresql_schema_setup.sql'
    
    if not sql_file_path.exists():
        print(f"Error: SQL file not found at {sql_file_path}")
        return False
    
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Connect to the database
    try:
        connection = psycopg2.connect(
            host=DATABASE_HOST,
            port=DATABASE_PORT,
            database=DATABASE_NAME,
            user=DATABASE_USER,
            password=DATABASE_PASSWORD
        )
        
        cursor = connection.cursor()
        
        print("Connected to database successfully.")
        print("Executing schema setup...")
        
        # Execute the SQL content
        cursor.execute(sql_content)
        connection.commit()
        
        print("✅ Schema setup completed successfully!")
        print("Created schemas:")
        print("  - auth_schema")
        print("  - user_schema")
        print("  - institution_schema")
        print("  - notification_schema")
        print("  - application_schema")
        print("  - internship_schema")
        
        cursor.close()
        connection.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Creating database schemas for Edulink microservices...")
    success = create_schemas()
    
    if success:
        print("\n🎉 All schemas created successfully!")
        print("You can now proceed with running migrations for each microservice.")
    else:
        print("\n❌ Schema creation failed. Please check the error messages above.")
        sys.exit(1)