#!/usr/bin/env python
"""
Database setup script for registration service.
Creates the necessary schema and runs migrations.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.db import connection

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
django.setup()

def create_schema():
    """Create the institution_schema if it doesn't exist."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('CREATE SCHEMA IF NOT EXISTS institution_schema;')
            print("✓ Schema 'institution_schema' created or already exists")
            
            # Grant necessary permissions
            cursor.execute('GRANT USAGE ON SCHEMA institution_schema TO PUBLIC;')
            cursor.execute('GRANT CREATE ON SCHEMA institution_schema TO PUBLIC;')
            print("✓ Permissions granted on institution_schema")
            
    except Exception as e:
        print(f"Error creating schema: {e}")
        return False
    return True

def run_migrations():
    """Run Django migrations."""
    try:
        print("\nRunning migrations...")
        execute_from_command_line(['manage.py', 'migrate', '--verbosity=2'])
        print("✓ Migrations completed successfully")
        return True
    except Exception as e:
        print(f"Error running migrations: {e}")
        return False

def main():
    """Main setup function."""
    print("Setting up database for registration service...")
    
    # Create schema first
    if not create_schema():
        print("Failed to create schema. Exiting.")
        sys.exit(1)
    
    # Run migrations
    if not run_migrations():
        print("Failed to run migrations. Exiting.")
        sys.exit(1)
    
    print("\n✓ Database setup completed successfully!")

if __name__ == '__main__':
    main()