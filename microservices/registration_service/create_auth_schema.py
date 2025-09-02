#!/usr/bin/env python
"""
Script to create auth_schema and basic auth tables using direct database connection.
"""

import os
import psycopg2
from urllib.parse import urlparse, unquote

def get_db_connection():
    """Get database connection from environment variables."""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        # Parse DATABASE_URL
        parsed = urlparse(database_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],  # Remove leading slash
            user=parsed.username,
            password=unquote(parsed.password),
            sslmode='require'
        )
    else:
        # Use individual environment variables
        password = os.getenv('DATABASE_PASSWORD')
        # Handle URL-encoded passwords
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

def create_auth_schema_and_tables():
    """Create auth_schema and basic auth tables."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create auth_schema if it doesn't exist
        cursor.execute('CREATE SCHEMA IF NOT EXISTS auth_schema;')
        print("✓ Schema 'auth_schema' created or already exists")
        
        # Create auth_user table in auth_schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_schema.auth_user (
                id SERIAL PRIMARY KEY,
                password VARCHAR(128) NOT NULL,
                last_login TIMESTAMP WITH TIME ZONE,
                is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
                username VARCHAR(150) UNIQUE NOT NULL,
                first_name VARCHAR(150) NOT NULL DEFAULT '',
                last_name VARCHAR(150) NOT NULL DEFAULT '',
                email VARCHAR(254) NOT NULL DEFAULT '',
                is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        """)
        print("✓ Table 'auth_user' created in auth_schema")
        
        # Create auth_group table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_schema.auth_group (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) UNIQUE NOT NULL
            );
        """)
        print("✓ Table 'auth_group' created in auth_schema")
        
        # Create auth_permission table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_schema.auth_permission (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                content_type_id INTEGER NOT NULL,
                codename VARCHAR(100) NOT NULL
            );
        """)
        print("✓ Table 'auth_permission' created in auth_schema")
        
        # Create django_content_type table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_schema.django_content_type (
                id SERIAL PRIMARY KEY,
                app_label VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                UNIQUE(app_label, model)
            );
        """)
        print("✓ Table 'django_content_type' created in auth_schema")
        
        # Create django_migrations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_schema.django_migrations (
                id SERIAL PRIMARY KEY,
                app VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        """)
        print("✓ Table 'django_migrations' created in auth_schema")
        
        # Insert basic content types
        cursor.execute("""
            INSERT INTO auth_schema.django_content_type (app_label, model) 
            VALUES 
                ('auth', 'user'),
                ('auth', 'group'),
                ('auth', 'permission'),
                ('contenttypes', 'contenttype')
            ON CONFLICT (app_label, model) DO NOTHING;
        """)
        print("✓ Basic content types inserted")
        
        # Commit the changes
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✓ All tables created successfully in auth_schema")
        
    except Exception as e:
        print(f"Error creating auth schema and tables: {e}")
        return False
    return True

def main():
    """Main function."""
    print("Creating auth_schema and basic auth tables...")
    
    # Load environment variables from .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("Warning: python-dotenv not installed, using system environment variables")
    
    if create_auth_schema_and_tables():
        print("\n✓ Auth schema and tables created successfully!")
        print("You can now run migrations for the registration service.")
    else:
        print("\n✗ Failed to create auth schema and tables.")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())