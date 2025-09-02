#!/usr/bin/env python
import os
import django
from django.core.management import execute_from_command_line
from django.conf import settings

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')

# Setup Django
django.setup()

from django.db import connection
from django.core.management.commands.showmigrations import Command as ShowMigrationsCommand
from django.core.management.commands.migrate import Command as MigrateCommand

def check_database_state():
    """Check the current database state and migration status."""
    print("=== Database Configuration Check ===")
    
    try:
        # Check database connection
        with connection.cursor() as cursor:
            # Check current search_path
            cursor.execute('SHOW search_path')
            search_path = cursor.fetchone()[0]
            print(f'Current search_path: {search_path}')
            
            # Check which schemas exist
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name IN ('institution_schema', 'auth_schema', 'public')
                ORDER BY schema_name
            """)
            schemas = cursor.fetchall()
            print(f'Available schemas: {[s[0] for s in schemas]}')
            
            # Check django_migrations table in each schema
            for schema in ['institution_schema', 'auth_schema', 'public']:
                try:
                    cursor.execute(f"""
                        SELECT COUNT(*) 
                        FROM information_schema.tables 
                        WHERE table_schema = '{schema}' 
                        AND table_name = 'django_migrations'
                    """)
                    count = cursor.fetchone()[0]
                    print(f'django_migrations table in {schema}: {"exists" if count > 0 else "does not exist"}')
                    
                    if count > 0:
                        # Check migration records in this schema
                        cursor.execute(f'SELECT COUNT(*) FROM {schema}.django_migrations')
                        migration_count = cursor.fetchone()[0]
                        print(f'  - Migration records in {schema}: {migration_count}')
                        
                except Exception as e:
                    print(f'Error checking {schema}: {e}')
            
            # Check if auth_user table exists in any schema
            cursor.execute("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name = 'auth_user'
            """)
            auth_tables = cursor.fetchall()
            print(f'auth_user table found in schemas: {[t[0] for t in auth_tables]}')
            
            # Check all tables in current search path
            cursor.execute("""
                SELECT schemaname, tablename 
                FROM pg_tables 
                WHERE schemaname IN ('institution_schema', 'auth_schema', 'public')
                ORDER BY schemaname, tablename
            """)
            all_tables = cursor.fetchall()
            print(f'\nAll tables found:')
            for schema, table in all_tables:
                print(f'  {schema}.{table}')
                
    except Exception as e:
        print(f'Database connection error: {e}')
        print(f'Database settings: {settings.DATABASES}')

if __name__ == '__main__':
    check_database_state()