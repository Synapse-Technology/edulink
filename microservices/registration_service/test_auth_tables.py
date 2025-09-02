#!/usr/bin/env python
"""
Test script to verify auth tables are accessible.
"""

import os
import psycopg2
from urllib.parse import urlparse, unquote

def get_db_connection():
    """Get database connection from environment variables."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        parsed = urlparse(database_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=unquote(parsed.password),
            sslmode='require'
        )
    else:
        password = os.getenv('DATABASE_PASSWORD')
        if password and '%' in password:
            password = unquote(password)
        
        return psycopg2.connect(
            host=os.getenv('DATABASE_HOST'),
            port=os.getenv('DATABASE_PORT'),
            database=os.getenv('DATABASE_NAME'),
            user=os.getenv('DATABASE_USER'),
            password=password,
            sslmode='require'
        )

def test_auth_tables():
    """Test if auth tables are accessible."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Test if auth_schema exists
        cursor.execute("""
            SELECT schema_name FROM information_schema.schemata 
            WHERE schema_name = 'auth_schema';
        """)
        schema_result = cursor.fetchone()
        if schema_result:
            print("✓ auth_schema exists")
        else:
            print("✗ auth_schema does not exist")
            return False
        
        # Test if auth_user table exists in auth_schema
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'auth_schema' AND table_name = 'auth_user';
        """)
        table_result = cursor.fetchone()
        if table_result:
            print("✓ auth_schema.auth_user table exists")
        else:
            print("✗ auth_schema.auth_user table does not exist")
            return False
        
        # Test if we can query the auth_user table
        cursor.execute("SELECT COUNT(*) FROM auth_schema.auth_user;")
        count = cursor.fetchone()[0]
        print(f"✓ auth_schema.auth_user table has {count} records")
        
        # Test search_path
        cursor.execute("SHOW search_path;")
        search_path = cursor.fetchone()[0]
        print(f"Current search_path: {search_path}")
        
        # Set search_path to include auth_schema
        cursor.execute("SET search_path TO auth_schema, public;")
        print("✓ Set search_path to auth_schema, public")
        
        # Test if auth_user is now accessible without schema prefix
        cursor.execute("SELECT COUNT(*) FROM auth_user;")
        count = cursor.fetchone()[0]
        print(f"✓ auth_user table accessible without schema prefix: {count} records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error testing auth tables: {e}")
        return False

def main():
    """Main function."""
    print("Testing auth tables accessibility...")
    
    if test_auth_tables():
        print("\n✓ Auth tables are accessible!")
    else:
        print("\n✗ Auth tables are not accessible.")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())