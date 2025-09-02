#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(project_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

from django.db import connection

def check_master_institutions():
    try:
        cursor = connection.cursor()
        
        # Check total count
        cursor.execute('SELECT COUNT(*) FROM user_schema.master_institutions;')
        result = cursor.fetchone()
        total_count = result[0]
        print(f'Total institutions in master_institutions table: {total_count}')
        
        if total_count > 0:
            # Get sample institutions
            cursor.execute('SELECT name, short_name, institution_type, accreditation_body FROM user_schema.master_institutions LIMIT 10;')
            institutions = cursor.fetchall()
            print('\nSample institutions:')
            for inst in institutions:
                short_name = inst[1] if inst[1] else 'N/A'
                print(f'  - {inst[0]} ({short_name}) - {inst[2]} - {inst[3]}')
        else:
            print('\nNo institutions found in the master_institutions table.')
            
        # Check if Test University exists
        cursor.execute("SELECT COUNT(*) FROM user_schema.master_institutions WHERE name = 'Test University';")
        test_uni_result = cursor.fetchone()
        test_uni_count = test_uni_result[0]
        print(f'\nTest University exists: {"Yes" if test_uni_count > 0 else "No"}')
        
    except Exception as e:
        print(f'Error checking master institutions: {e}')
        
        # Try to check if the table exists at all
        try:
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'user_schema' AND table_name = 'master_institutions';")
            table_exists = cursor.fetchone()
            if table_exists:
                print('Table exists but query failed.')
            else:
                print('Table does not exist.')
        except Exception as table_check_error:
            print(f'Error checking table existence: {table_check_error}')

if __name__ == '__main__':
    check_master_institutions()