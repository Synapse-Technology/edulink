#!/usr/bin/env python3
"""
Simple Schema Audit Script
Inspects database schemas without requiring Django setup
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from urllib.parse import urlparse, unquote

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def get_db_config():
    """Get database configuration from environment"""
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        parsed_url = urlparse(database_url)
        return {
            'host': parsed_url.hostname,
            'port': parsed_url.port or 5432,
            'database': parsed_url.path.lstrip('/'),
            'user': parsed_url.username,
            'password': unquote(parsed_url.password) if parsed_url.password else None
        }
    else:
        return {
            'host': os.getenv('DATABASE_HOST', 'localhost'),
            'port': int(os.getenv('DATABASE_PORT', 5432)),
            'database': os.getenv('DATABASE_NAME', 'postgres'),
            'user': os.getenv('DATABASE_USER', 'postgres'),
            'password': os.getenv('DATABASE_PASSWORD', 'postgres')
        }

# Expected schema mappings based on microservice architecture
EXPECTED_SCHEMAS = {
    'auth_service': 'auth_schema',
    'user_service': 'user_schema', 
    'application_service': 'application_schema',
    'internship_service': 'internship_schema',
    'notification_service': 'notification_schema'
}

def get_db_connection():
    """Get database connection"""
    try:
        config = get_db_config()
        conn = psycopg2.connect(**config)
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return None

def get_schemas(conn):
    """Get all schemas in database"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name
        """)
        return [row['schema_name'] for row in cur.fetchall()]

def get_tables_in_schema(conn, schema_name):
    """Get all tables in a specific schema"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """, (schema_name,))
        return [row['table_name'] for row in cur.fetchall()]

def get_django_migrations(conn, schema_name):
    """Get Django migrations from a specific schema"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        try:
            cur.execute(f"""
                SELECT app, name, applied 
                FROM {schema_name}.django_migrations 
                ORDER BY app, name
            """)
            return cur.fetchall()
        except Exception:
            # django_migrations table doesn't exist in this schema
            return []

def audit_service_schema(conn, service_name, expected_schema):
    """Audit a specific service schema"""
    print(f"\n{'='*60}")
    print(f"AUDITING: {service_name.upper()} -> {expected_schema}")
    print(f"{'='*60}")
    
    issues = []
    
    try:
        # Get all schemas
        schemas = get_schemas(conn)
        print(f"📋 Available schemas: {', '.join(schemas)}")
        
        # Check if expected schema exists
        if expected_schema not in schemas:
            issues.append(f"Expected schema '{expected_schema}' not found")
            print(f"❌ Expected schema '{expected_schema}' not found")
        else:
            print(f"✅ Expected schema '{expected_schema}' exists")
        
        # Check tables in public schema (should be minimal for app tables)
        public_tables = get_tables_in_schema(conn, 'public')
        app_tables = [t for t in public_tables if not t.startswith('django_') and not t.startswith('auth_')]
        
        if app_tables:
            issues.append(f"Application tables found in public schema: {app_tables}")
            print(f"⚠️  Application tables in public schema: {app_tables}")
        else:
            print(f"✅ No application tables in public schema")
        
        # Check tables in expected schema
        if expected_schema in schemas:
            schema_tables = get_tables_in_schema(conn, expected_schema)
            print(f"📊 Tables in {expected_schema}: {len(schema_tables)}")
            if schema_tables:
                print(f"   Tables: {', '.join(schema_tables[:10])}{'...' if len(schema_tables) > 10 else ''}")
        
        # Check Django migrations in different schemas
        public_migrations = get_django_migrations(conn, 'public')
        if public_migrations:
            apps_in_public = set(m['app'] for m in public_migrations)
            print(f"📝 Django migrations in public schema for apps: {', '.join(apps_in_public)}")
            
            # Check if any of these apps should be in the expected schema
            service_apps = {
                'auth_service': ['accounts', 'authentication', 'users'],
                'user_service': ['institutions', 'users', 'profiles'],
                'application_service': ['applications', 'admissions'],
                'internship_service': ['internships', 'placements'],
                'notification_service': ['notifications', 'messaging']
            }
            
            expected_apps = service_apps.get(service_name, [])
            misplaced_apps = apps_in_public.intersection(expected_apps)
            if misplaced_apps:
                issues.append(f"Apps with migrations in public schema should be in {expected_schema}: {misplaced_apps}")
                print(f"❌ Misplaced app migrations: {misplaced_apps}")
        
        if expected_schema in schemas:
            schema_migrations = get_django_migrations(conn, expected_schema)
            if schema_migrations:
                apps_in_schema = set(m['app'] for m in schema_migrations)
                print(f"📝 Django migrations in {expected_schema} for apps: {', '.join(apps_in_schema)}")
            else:
                issues.append(f"No Django migrations found in {expected_schema}")
                print(f"⚠️  No Django migrations found in {expected_schema}")
    
    except Exception as e:
        issues.append(f"Error during audit: {str(e)}")
        print(f"❌ Audit error: {e}")
    
    return issues

def main():
    print("🔍 MICROSERVICES SCHEMA AUDIT")
    print("="*60)
    
    conn = get_db_connection()
    if not conn:
        print("❌ Cannot connect to database. Exiting.")
        return
    
    all_issues = {}
    
    try:
        for service_name, expected_schema in EXPECTED_SCHEMAS.items():
            issues = audit_service_schema(conn, service_name, expected_schema)
            if issues:
                all_issues[service_name] = issues
    
    finally:
        conn.close()
    
    # Summary
    print("\n" + "="*80)
    print("📊 AUDIT SUMMARY")
    print("="*80)
    
    if all_issues:
        print(f"❌ Issues found in {len(all_issues)} services:")
        for service, issues in all_issues.items():
            print(f"\n🔴 {service.upper()}:")
            for issue in issues:
                print(f"   • {issue}")
    else:
        print("🎉 No schema issues detected!")
    
    print(f"\n📈 Total services audited: {len(EXPECTED_SCHEMAS)}")
    print(f"📈 Total issues found: {sum(len(issues) for issues in all_issues.values())}")

if __name__ == "__main__":
    main()