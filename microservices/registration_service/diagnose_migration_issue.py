#!/usr/bin/env python
"""
Diagnostic script to analyze migration inconsistency between auth_service and registration_service.
"""

import os
import psycopg2
from urllib.parse import urlparse, unquote
from datetime import datetime

def get_db_connection():
    """Get database connection from environment variables."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        parsed = urlparse(database_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=unquote(parsed.password),
            sslmode='require'
        )
    else:
        password = os.getenv('DATABASE_PASSWORD')
        if password and '%' in password:
            password = unquote(password)
        
        return psycopg2.connect(
            host=os.getenv('DATABASE_HOST'),
            port=os.getenv('DATABASE_PORT'),
            database=os.getenv('DATABASE_NAME'),
            user=os.getenv('DATABASE_USER'),
            password=password,
            sslmode='require'
        )

def check_schemas_and_tables():
    """Check what schemas and tables exist in the database."""
    print("=== SCHEMA AND TABLE ANALYSIS ===")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check existing schemas
        cursor.execute("""
            SELECT schema_name FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name;
        """)
        schemas = cursor.fetchall()
        print(f"\nExisting schemas: {[s[0] for s in schemas]}")
        
        # Check tables in each relevant schema
        for schema in ['auth_schema', 'institution_schema', 'public']:
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = %s
                ORDER BY table_name;
            """, (schema,))
            tables = cursor.fetchall()
            if tables:
                print(f"\nTables in {schema}: {[t[0] for t in tables]}")
            else:
                print(f"\nNo tables found in {schema}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error checking schemas and tables: {e}")
        return False

def check_migration_records():
    """Check django_migrations table in different schemas."""
    print("\n=== MIGRATION RECORDS ANALYSIS ===")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check migration records in different schemas
        for schema in ['auth_schema', 'institution_schema', 'public']:
            try:
                cursor.execute(f"SET search_path TO {schema}, public;")
                
                # Check if django_migrations table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = %s AND table_name = 'django_migrations'
                    );
                """, (schema,))
                
                table_exists = cursor.fetchone()[0]
                
                if table_exists:
                    print(f"\n--- Migration records in {schema} ---")
                    
                    # Get all migration records
                    cursor.execute("""
                        SELECT app, name, applied 
                        FROM django_migrations 
                        ORDER BY applied, app, name;
                    """)
                    
                    migrations = cursor.fetchall()
                    
                    if migrations:
                        print(f"Total migrations: {len(migrations)}")
                        
                        # Group by app
                        apps = {}
                        for app, name, applied in migrations:
                            if app not in apps:
                                apps[app] = []
                            apps[app].append((name, applied))
                        
                        for app, migs in apps.items():
                            print(f"\n{app}: {len(migs)} migrations")
                            for name, applied in migs[:3]:  # Show first 3
                                print(f"  - {name} (applied: {applied})")
                            if len(migs) > 3:
                                print(f"  ... and {len(migs) - 3} more")
                        
                        # Check for problematic dependencies
                        print("\n--- Checking for dependency issues ---")
                        
                        # Check if admin.0001_initial exists
                        cursor.execute("""
                            SELECT applied FROM django_migrations 
                            WHERE app = 'admin' AND name = '0001_initial';
                        """)
                        admin_initial = cursor.fetchone()
                        
                        # Check if authentication.0001_initial exists
                        cursor.execute("""
                            SELECT applied FROM django_migrations 
                            WHERE app = 'authentication' AND name = '0001_initial';
                        """)
                        auth_initial = cursor.fetchone()
                        
                        if admin_initial and auth_initial:
                            print(f"admin.0001_initial applied: {admin_initial[0]}")
                            print(f"authentication.0001_initial applied: {auth_initial[0]}")
                            
                            if admin_initial[0] < auth_initial[0]:
                                print("⚠️  ISSUE: admin.0001_initial was applied BEFORE authentication.0001_initial")
                            else:
                                print("✓ Migration order is correct")
                        elif admin_initial and not auth_initial:
                            print("⚠️  ISSUE: admin.0001_initial exists but authentication.0001_initial is missing")
                        elif not admin_initial and auth_initial:
                            print("ℹ️  authentication.0001_initial exists but admin.0001_initial is missing")
                        else:
                            print("ℹ️  Neither admin.0001_initial nor authentication.0001_initial found")
                    
                    else:
                        print(f"No migration records found in {schema}")
                else:
                    print(f"\nNo django_migrations table in {schema}")
                    
            except Exception as e:
                print(f"Error checking {schema}: {e}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error checking migration records: {e}")
        return False

def analyze_auth_tables():
    """Analyze the state of auth tables."""
    print("\n=== AUTH TABLES ANALYSIS ===")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check auth tables in different schemas
        auth_tables = ['auth_user', 'auth_group', 'auth_permission', 'django_content_type']
        
        for schema in ['auth_schema', 'institution_schema', 'public']:
            print(f"\n--- Auth tables in {schema} ---")
            cursor.execute(f"SET search_path TO {schema}, public;")
            
            for table in auth_tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    print(f"✓ {table}: {count} records")
                except Exception as e:
                    print(f"✗ {table}: {str(e).split(':')[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error analyzing auth tables: {e}")
        return False

def check_service_configurations():
    """Check how services are configured."""
    print("\n=== SERVICE CONFIGURATION ANALYSIS ===")
    
    # Check registration service config
    print("\n--- Registration Service Config ---")
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        service_name = os.getenv('SERVICE_NAME', 'unknown')
        service_schema = os.getenv('SERVICE_SCHEMA', 'unknown')
        
        print(f"SERVICE_NAME: {service_name}")
        print(f"SERVICE_SCHEMA: {service_schema}")
        
    except Exception as e:
        print(f"Error reading registration service config: {e}")
    
    # Check shared database config
    print("\n--- Shared Database Config ---")
    try:
        import sys
        sys.path.append('C:\\Users\\bouri\\Documents\\Projects\\Edulink\\microservices\\shared')
        
        from database.config import SERVICE_SCHEMAS
        
        print("SERVICE_SCHEMAS mapping:")
        for service, schema in SERVICE_SCHEMAS.items():
            print(f"  {service}: {schema}")
            
    except Exception as e:
        print(f"Error reading shared database config: {e}")

def main():
    """Main diagnostic function."""
    print("DJANGO MIGRATION INCONSISTENCY DIAGNOSTIC")
    print("=" * 50)
    print(f"Analysis started at: {datetime.now()}")
    
    # Run all diagnostic checks
    checks = [
        ("Schema and Table Check", check_schemas_and_tables),
        ("Migration Records Check", check_migration_records),
        ("Auth Tables Analysis", analyze_auth_tables),
        ("Service Configuration Check", check_service_configurations),
    ]
    
    results = {}
    
    for check_name, check_func in checks:
        print(f"\n{'='*20} {check_name} {'='*20}")
        try:
            results[check_name] = check_func()
        except Exception as e:
            print(f"Error in {check_name}: {e}")
            results[check_name] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("DIAGNOSTIC SUMMARY")
    print("=" * 50)
    
    for check_name, success in results.items():
        status = "✓ PASSED" if success else "✗ FAILED"
        print(f"{check_name}: {status}")
    
    print(f"\nAnalysis completed at: {datetime.now()}")
    
    return 0 if all(results.values()) else 1

if __name__ == '__main__':
    exit(main())