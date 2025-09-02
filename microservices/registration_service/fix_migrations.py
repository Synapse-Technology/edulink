#!/usr/bin/env python
"""
Script to fix Django migrations by manually configuring database settings.
"""

import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line
from django.db import connection

def configure_django_settings():
    """Configure Django settings manually."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    # Get database configuration
    from urllib.parse import urlparse, unquote
    
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        parsed = urlparse(database_url)
        db_config = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path[1:],
            'USER': parsed.username,
            'PASSWORD': unquote(parsed.password) if parsed.password else None,
            'HOST': parsed.hostname,
            'PORT': parsed.port or 5432,
            'OPTIONS': {
                'sslmode': 'require',
                'application_name': 'edulink_registration_service',
                'options': '-c search_path=auth_schema,public'
            },
        }
    else:
        password = os.getenv('DATABASE_PASSWORD')
        if password and '%' in password:
            password = unquote(password)
        
        db_config = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DATABASE_NAME'),
            'USER': os.getenv('DATABASE_USER'),
            'PASSWORD': password,
            'HOST': os.getenv('DATABASE_HOST'),
            'PORT': os.getenv('DATABASE_PORT', 5432),
            'OPTIONS': {
                'sslmode': 'require',
                'application_name': 'edulink_registration_service',
                'options': '-c search_path=auth_schema,public'
            },
        }
    
    # Configure Django settings
    if not settings.configured:
        settings.configure(
            DEBUG=True,
            DATABASES={
                'default': db_config
            },
            INSTALLED_APPS=[
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.admin',
            ],
            SECRET_KEY='temp-key-for-migrations',
            USE_TZ=True,
        )
    
    django.setup()
    print("✓ Django settings configured successfully")

def test_database_connection():
    """Test database connection."""
    try:
        with connection.cursor() as cursor:
            # Check current search_path
            cursor.execute("SHOW search_path;")
            search_path = cursor.fetchone()[0]
            print(f"Current search_path: {search_path}")
            
            # Set search_path to include auth_schema
            cursor.execute("SET search_path TO auth_schema, public;")
            print("✓ Set search_path to auth_schema, public")
            
            # Test if auth_user table is accessible
            cursor.execute("SELECT COUNT(*) FROM auth_user;")
            count = cursor.fetchone()[0]
            print(f"✓ auth_user table accessible: {count} records")
            
            return True
    except Exception as e:
        print(f"Error testing database connection: {e}")
        return False

def run_migrations():
    """Run Django migrations."""
    try:
        print("Running migrations...")
        
        # First, try to fake the initial migrations
        from django.core.management import call_command
        call_command('migrate', '--fake-initial', verbosity=2)
        
        print("✓ Migrations completed successfully")
        return True
    except Exception as e:
        print(f"Error running migrations: {e}")
        return False

def main():
    """Main function."""
    print("Configuring Django settings...")
    
    try:
        configure_django_settings()
    except Exception as e:
        print(f"Error configuring Django: {e}")
        return 1
    
    print("\nTesting database connection...")
    if not test_database_connection():
        return 1
    
    print("\nRunning migrations...")
    if not run_migrations():
        return 1
    
    print("\n✓ All operations completed successfully!")
    return 0

if __name__ == '__main__':
    exit(main())