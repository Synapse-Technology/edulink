#!/usr/bin/env python
"""
Check and create database schema for registration service
"""

import os
import django
from django.db import connection
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings.development')
django.setup()

def check_and_create_schema():
    """Check if schema exists and create if needed"""
    schema_name = 'institution_schema'
    
    with connection.cursor() as cursor:
        # Check if schema exists
        cursor.execute(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s",
            [schema_name]
        )
        result = cursor.fetchone()
        
        if result:
            print(f"✅ Schema '{schema_name}' already exists")
        else:
            print(f"❌ Schema '{schema_name}' does not exist. Creating...")
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
            print(f"✅ Schema '{schema_name}' created successfully")
        
        # Set search path
        cursor.execute(f"SET search_path TO {schema_name}, public")
        print(f"✅ Search path set to {schema_name}")
        
        # Check current search path
        cursor.execute("SHOW search_path")
        current_path = cursor.fetchone()[0]
        print(f"📍 Current search path: {current_path}")

if __name__ == '__main__':
    try:
        check_and_create_schema()
        print("\n🎉 Schema check completed successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")