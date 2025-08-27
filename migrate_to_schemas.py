#!/usr/bin/env python3
"""Script to migrate existing tables from public schema to service schemas."""

import os
import environ
from pathlib import Path
import psycopg2
from psycopg2 import sql

def main():
    # Load environment variables from auth_service
    env = environ.Env()
    env_path = Path('microservices/auth_service/.env')
    environ.Env.read_env(env_path)
    
    # Define service-specific tables
    user_service_tables = [
        'companies', 'company_settings', 'departments', 'supervisors'
        # Add more user service tables as they are created
    ]
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=env('DATABASE_HOST'),
            port=env('DATABASE_PORT'),
            database=env('DATABASE_NAME'),
            user=env('DATABASE_USER'),
            password=env('DATABASE_PASSWORD')
        )
        
        # Enable autocommit
        conn.autocommit = True
        cur = conn.cursor()
        
        print("=== MIGRATING USER SERVICE TABLES TO user_schema ===")
        
        # Check what tables exist in public schema
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name NOT LIKE 'pg_%'
            AND table_name NOT LIKE 'django_%'
            AND table_name NOT IN ('audit_log', 'health_check_db_testmodel')
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        public_tables = [row[0] for row in cur.fetchall()]
        
        print(f"Found {len(public_tables)} application tables in public schema")
        
        # Move remaining service tables to their respective schemas
        service_mappings = {
            'institution_schema': ['institutions', 'institution_settings', 'academic_programs', 'courses'],
            'notification_schema': ['notifications', 'notification_settings', 'email_templates', 'sms_templates'],
            'application_schema': ['applications', 'application_status', 'application_documents', 'application_reviews'],
            'internship_schema': ['internships', 'internship_applications', 'internship_progress', 'internship_evaluations']
        }
        
        moved_count = 0
        
        for schema_name, table_list in service_mappings.items():
            schema_moved = 0
            print(f"\n=== MIGRATING TO {schema_name} ===")
            for table in table_list:
                if table in public_tables:
                    try:
                        cur.execute(sql.SQL("ALTER TABLE public.{} SET SCHEMA {}").format(
                            sql.Identifier(table),
                            sql.Identifier(schema_name)
                        ))
                        print(f"✓ Moved {table} to {schema_name}")
                        moved_count += 1
                        schema_moved += 1
                    except Exception as e:
                        print(f"❌ Error moving {table}: {e}")
            
            if schema_moved == 0:
                print(f"No tables found for {schema_name}")
            else:
                print(f"✅ Successfully moved {schema_moved} tables to {schema_name}")
        
        # Check current status
        print("\n=== CURRENT SCHEMA STATUS ===")
        
        # Check auth_schema
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'auth_schema' AND table_type = 'BASE TABLE'
        """)
        auth_count = cur.fetchone()[0]
        print(f"auth_schema: {auth_count} tables")
        
        # Check user_schema
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'user_schema' AND table_type = 'BASE TABLE'
        """)
        user_count = cur.fetchone()[0]
        print(f"user_schema: {user_count} tables")
        
        # Check remaining application tables in public
        cur.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name NOT LIKE 'pg_%'
            AND table_name NOT LIKE 'django_%'
            AND table_name NOT IN ('audit_log', 'health_check_db_testmodel')
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        remaining_app_tables = [row[0] for row in cur.fetchall()]
        
        if remaining_app_tables:
            print(f"\n⚠️  {len(remaining_app_tables)} application tables still in public schema:")
            for table in remaining_app_tables:
                print(f"  - {table}")
        else:
            print("\n✅ All application tables have been moved to service schemas!")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())