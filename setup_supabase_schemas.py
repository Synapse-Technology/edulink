#!/usr/bin/env python3
"""
Script to set up database schemas in Supabase for the microservices architecture.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add the microservices directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'microservices'))

def get_database_url():
    """Get database URL from environment or use default Supabase URL."""
    # Try to get from user_service .env file
    env_file = os.path.join(os.path.dirname(__file__), 'microservices', 'user_service', '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    return line.split('=', 1)[1].strip()
    
    # Fallback to environment variable
    return os.getenv('DATABASE_URL')

def create_schemas():
    """Create database schemas for each microservice."""
    database_url = get_database_url()
    if not database_url:
        print("Error: DATABASE_URL not found. Please set it in environment or .env file.")
        return False
    
    # Define schemas to create
    schemas = [
        'auth_schema',
        'user_schema', 
        'notification_schema',
        'application_schema',
        'internship_schema',
        'institution_schema'
    ]
    
    try:
        # Connect to database
        print(f"Connecting to Supabase database...")
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("Creating schemas...")
        
        for schema in schemas:
            try:
                # Create schema if it doesn't exist
                cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema};")
                print(f"✓ Schema '{schema}' created/verified")
                
                # Grant permissions (Supabase handles most permissions automatically)
                cursor.execute(f"GRANT USAGE ON SCHEMA {schema} TO postgres;")
                cursor.execute(f"GRANT CREATE ON SCHEMA {schema} TO postgres;")
                
            except Exception as e:
                print(f"⚠ Warning creating schema '{schema}': {e}")
                continue
        
        # Verify schemas were created
        print("\nVerifying schemas...")
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE '%_schema'
            ORDER BY schema_name;
        """)
        
        existing_schemas = [row[0] for row in cursor.fetchall()]
        print(f"Found schemas: {existing_schemas}")
        
        # Check if all required schemas exist
        missing_schemas = set(schemas) - set(existing_schemas)
        if missing_schemas:
            print(f"⚠ Missing schemas: {missing_schemas}")
        else:
            print("✓ All required schemas are present")
        
        cursor.close()
        conn.close()
        
        print("\n✓ Schema setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Error setting up schemas: {e}")
        return False

if __name__ == '__main__':
    print("Setting up Supabase database schemas...")
    success = create_schemas()
    sys.exit(0 if success else 1)