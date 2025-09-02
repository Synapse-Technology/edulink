#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Add the project directory to the Python path
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
django.setup()

from django.db import connection

print("Testing database connection and search_path...")

# Test raw SQL query
with connection.cursor() as cursor:
    # Check current search_path
    cursor.execute("SHOW search_path;")
    search_path = cursor.fetchone()[0]
    print(f"Current search_path: {search_path}")
    
    # Try to find auth_user table
    cursor.execute("""
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename = 'auth_user'
        ORDER BY schemaname;
    """)
    tables = cursor.fetchall()
    print(f"auth_user tables found: {tables}")
    
    # Try to access auth_user directly
    try:
        cursor.execute("SELECT COUNT(*) FROM auth_user;")
        count = cursor.fetchone()[0]
        print(f"auth_user table accessible, count: {count}")
    except Exception as e:
        print(f"Error accessing auth_user: {e}")
    
    # Try with explicit schema
    try:
        cursor.execute("SELECT COUNT(*) FROM institution_schema.auth_user;")
        count = cursor.fetchone()[0]
        print(f"institution_schema.auth_user accessible, count: {count}")
    except Exception as e:
        print(f"Error accessing institution_schema.auth_user: {e}")
    
    # Check if the signal is working by manually setting search_path
    try:
        cursor.execute("SET search_path TO institution_schema,auth_schema,public;")
        cursor.execute("SELECT COUNT(*) FROM auth_user;")
        count = cursor.fetchone()[0]
        print(f"After manually setting search_path, auth_user accessible, count: {count}")
    except Exception as e:
        print(f"Error after manual search_path: {e}")

print("Test completed.")