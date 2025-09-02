#!/usr/bin/env python
"""
Comprehensive Database Schema Fix
This script fixes missing columns and schema mismatches in the database.
"""

import os
import sys
import django
from django.db import connection
from django.core.management import execute_from_command_line

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def check_and_add_missing_columns():
    """Check for missing columns and add them manually"""
    with connection.cursor() as cursor:
        # Check if department_id column exists in users_studentprofile
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users_studentprofile' AND column_name='department_id';
        """)
        
        if not cursor.fetchone():
            print("Adding missing department_id column to users_studentprofile...")
            cursor.execute("""
                ALTER TABLE users_studentprofile 
                ADD COLUMN department_id INTEGER NULL;
            """)
            
            cursor.execute("""
                ALTER TABLE users_studentprofile 
                ADD CONSTRAINT users_studentprofile_department_id_fkey 
                FOREIGN KEY (department_id) REFERENCES institutions_department(id);
            """)
            print("✓ Added department_id column")
        else:
            print("✓ department_id column already exists")
            
        # Check if campus_id column exists in users_studentprofile
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users_studentprofile' AND column_name='campus_id';
        """)
        
        if not cursor.fetchone():
            print("Adding missing campus_id column to users_studentprofile...")
            cursor.execute("""
                ALTER TABLE users_studentprofile 
                ADD COLUMN campus_id INTEGER NULL;
            """)
            
            cursor.execute("""
                ALTER TABLE users_studentprofile 
                ADD CONSTRAINT users_studentprofile_campus_id_fkey 
                FOREIGN KEY (campus_id) REFERENCES institutions_campus(id);
            """)
            print("✓ Added campus_id column")
        else:
            print("✓ campus_id column already exists")
            
        # Check other missing columns
        missing_columns = [
            ('university_verified', 'BOOLEAN DEFAULT FALSE'),
            ('national_id_verified', 'BOOLEAN DEFAULT FALSE'),
            ('last_university_sync', 'TIMESTAMP NULL'),
            ('university_code_used', 'VARCHAR(20) NULL')
        ]
        
        for col_name, col_def in missing_columns:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users_studentprofile' AND column_name='{col_name}';
            """)
            
            if not cursor.fetchone():
                print(f"Adding missing {col_name} column to users_studentprofile...")
                cursor.execute(f"""
                    ALTER TABLE users_studentprofile 
                    ADD COLUMN {col_name} {col_def};
                """)
                print(f"✓ Added {col_name} column")
            else:
                print(f"✓ {col_name} column already exists")

def fix_employer_profile_columns():
    """Fix EmployerProfile columns to allow NULL values"""
    with connection.cursor() as cursor:
        # Make first_name and last_name nullable
        try:
            cursor.execute("""
                ALTER TABLE users_employerprofile 
                ALTER COLUMN first_name DROP NOT NULL;
            """)
            print("✓ Made first_name nullable in EmployerProfile")
        except Exception as e:
            print(f"Note: first_name column modification: {e}")
            
        try:
            cursor.execute("""
                ALTER TABLE users_employerprofile 
                ALTER COLUMN last_name DROP NOT NULL;
            """)
            print("✓ Made last_name nullable in EmployerProfile")
        except Exception as e:
            print(f"Note: last_name column modification: {e}")

def main():
    print("Starting comprehensive database schema fix...")
    print("="*50)
    
    try:
        # Fix missing columns
        check_and_add_missing_columns()
        
        # Fix employer profile columns
        fix_employer_profile_columns()
        
        print("\n" + "="*50)
        print("✓ Database schema fix completed successfully!")
        print("\nNow you can run migrations safely:")
        print("python manage.py makemigrations")
        print("python manage.py migrate")
        
    except Exception as e:
        print(f"❌ Error during schema fix: {e}")
        import traceback
        traceback.print_exc()
        return 1
        
    return 0

if __name__ == '__main__':
    sys.exit(main())