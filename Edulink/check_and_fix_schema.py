#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def check_and_fix_schema():
    """Check if institution_id column exists and add it if missing"""
    with connection.cursor() as cursor:
        # First check the institutions table id column type
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'institutions_institution' 
            AND column_name = 'id';
        """)
        
        inst_result = cursor.fetchone()
        if inst_result:
            inst_column, inst_type = inst_result
            print(f"institutions_institution.id type: {inst_type}")
        else:
            print("Could not find institutions_institution table")
            return
        
        # Check if institution_id column exists in authentication_user table
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'authentication_user' 
            AND column_name = 'institution_id';
        """)
        
        result = cursor.fetchone()
        
        if result:
            print("✓ institution_id column already exists in authentication_user table")
        else:
            print("✗ institution_id column is missing. Adding it now...")
            
            # Add the institution_id column with the correct type
            if 'bigint' in inst_type.lower():
                column_type = 'BIGINT'
            elif 'uuid' in inst_type.lower():
                column_type = 'UUID'
            else:
                column_type = inst_type.upper()
            
            cursor.execute(f"""
                ALTER TABLE authentication_user 
                ADD COLUMN institution_id {column_type} NULL;
            """)
            
            print(f"✓ institution_id column added with type {column_type}")
            
            # Add foreign key constraint
            try:
                cursor.execute("""
                    ALTER TABLE authentication_user 
                    ADD CONSTRAINT authentication_user_institution_id_fkey 
                    FOREIGN KEY (institution_id) 
                    REFERENCES institutions_institution(id) 
                    ON DELETE SET NULL;
                """)
                print("✓ Foreign key constraint added successfully")
            except Exception as e:
                print(f"Warning: Could not add foreign key constraint: {e}")
        
        # Verify the column exists now
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'authentication_user' 
            AND column_name = 'institution_id';
        """)
        
        result = cursor.fetchone()
        if result:
            column_name, data_type, is_nullable = result
            print(f"✓ Verified: {column_name} ({data_type}, nullable: {is_nullable})")
        else:
            print("✗ Failed to add institution_id column")

if __name__ == '__main__':
    check_and_fix_schema()
    print("\nSchema check and fix completed.")