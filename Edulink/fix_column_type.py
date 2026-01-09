#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

def fix_column_type():
    """Fix the institution_id column type to match the referenced table"""
    with connection.cursor() as cursor:
        # Check current types
        cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'institutions_institution' 
            AND column_name = 'id';
        """)
        inst_type = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'authentication_user' 
            AND column_name = 'institution_id';
        """)
        auth_type = cursor.fetchone()[0]
        
        print(f"institutions_institution.id type: {inst_type}")
        print(f"authentication_user.institution_id type: {auth_type}")
        
        if inst_type != auth_type:
            print("Type mismatch detected. Fixing by recreating column...")
            
            # Drop existing foreign key constraint if it exists
            try:
                cursor.execute("""
                    ALTER TABLE authentication_user 
                    DROP CONSTRAINT IF EXISTS authentication_user_institution_id_fkey;
                """)
                print("✓ Dropped existing foreign key constraint")
            except Exception as e:
                print(f"Note: {e}")
            
            # Drop the column
            cursor.execute("""
                ALTER TABLE authentication_user 
                DROP COLUMN IF EXISTS institution_id;
            """)
            print("✓ Dropped existing institution_id column")
            
            # Recreate column with correct type
            if 'bigint' in inst_type.lower():
                new_type = 'BIGINT'
            elif 'uuid' in inst_type.lower():
                new_type = 'UUID'
            else:
                new_type = inst_type.upper()
            
            cursor.execute(f"""
                ALTER TABLE authentication_user 
                ADD COLUMN institution_id {new_type} NULL;
            """)
            print(f"✓ Added institution_id column with type {new_type}")
            
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
        else:
            print("✓ Column types already match")
            
            # Try to add foreign key constraint if it doesn't exist
            try:
                cursor.execute("""
                    ALTER TABLE authentication_user 
                    ADD CONSTRAINT authentication_user_institution_id_fkey 
                    FOREIGN KEY (institution_id) 
                    REFERENCES institutions_institution(id) 
                    ON DELETE SET NULL;
                """)
                print("✓ Foreign key constraint added")
            except Exception as e:
                if "already exists" in str(e):
                    print("✓ Foreign key constraint already exists")
                else:
                    print(f"Warning: Could not add foreign key constraint: {e}")
        
        # Verify final state
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'authentication_user' 
            AND column_name = 'institution_id';
        """)
        
        result = cursor.fetchone()
        if result:
            column_name, data_type, is_nullable = result
            print(f"✓ Final state: {column_name} ({data_type}, nullable: {is_nullable})")

if __name__ == '__main__':
    fix_column_type()
    print("\nColumn type fix completed.")