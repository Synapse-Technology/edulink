#!/usr/bin/env python3
"""
Simple script to test Supabase database connection.
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def test_connection():
    """Test database connection."""
    # Get database URL from user_service .env file
    env_file = os.path.join(os.path.dirname(__file__), 'microservices', 'user_service', '.env')
    database_url = None
    
    print(f"Reading .env file: {env_file}")
    
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    database_url = line.split('=', 1)[1].strip()
                    print(f"Found DATABASE_URL: {database_url[:50]}...")
                    break
    
    if not database_url:
        print("Error: DATABASE_URL not found in .env file")
        return False
    
    try:
        print("Attempting to connect to Supabase...")
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✓ Connected successfully!")
        
        # Test a simple query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"PostgreSQL version: {version}")
        
        # Check existing schemas
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name;
        """)
        
        schemas = [row[0] for row in cursor.fetchall()]
        print(f"Existing schemas: {schemas}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

if __name__ == '__main__':
    print("Testing Supabase database connection...")
    success = test_connection()
    print(f"Connection test: {'SUCCESS' if success else 'FAILED'}")