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

def check_table_structure():
    """Check the structure of the master_institutions table"""
    
    with connection.cursor() as cursor:
        # Get column information
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'user_schema' 
            AND table_name = 'master_institutions' 
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print("📋 Table: user_schema.master_institutions")
        print("\nColumns:")
        for col in columns:
            nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col[3]}" if col[3] else ""
            print(f"  - {col[0]:<20} {col[1]:<15} {nullable}{default}")
        
        print(f"\nTotal columns: {len(columns)}")

if __name__ == '__main__':
    try:
        check_table_structure()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()