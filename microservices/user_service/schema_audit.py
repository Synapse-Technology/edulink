#!/usr/bin/env python3
"""
Django-based Schema Audit Script
Uses Django ORM to inspect database schemas across all microservices
"""

import os
import sys
import django

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')

# Setup Django
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

# Expected schema mappings based on microservice architecture
EXPECTED_SCHEMAS = {
    'auth_service': 'auth_schema',
    'user_service': 'user_schema', 
    'application_service': 'application_schema',
    'internship_service': 'internship_schema',
    'notification_service': 'notification_schema'
}

# Service-specific app mappings
SERVICE_APPS = {
    'auth_service': ['accounts', 'authentication', 'users'],
    'user_service': ['institutions', 'users', 'profiles'],
    'application_service': ['applications', 'admissions'],
    'internship_service': ['internships', 'placements'],
    'notification_service': ['notifications', 'messaging']
}

def get_schemas():
    """Get all schemas in database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name
        """)
        return [row[0] for row in cursor.fetchall()]

def get_tables_in_schema(schema_name):
    """Get all tables in a specific schema"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """, [schema_name])
        return [row[0] for row in cursor.fetchall()]

def get_django_migrations_in_schema(schema_name):
    """Get Django migrations from a specific schema"""
    with connection.cursor() as cursor:
        try:
            cursor.execute(f"""
                SELECT app, name, applied 
                FROM {schema_name}.django_migrations 
                ORDER BY app, name
            """)
            return cursor.fetchall()
        except Exception:
            # django_migrations table doesn't exist in this schema
            return []

def check_table_exists_in_schema(schema_name, table_name):
    """Check if a specific table exists in a schema"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = %s AND table_name = %s
            )
        """, [schema_name, table_name])
        return cursor.fetchone()[0]

def audit_service_schema(service_name, expected_schema):
    """Audit a specific service schema"""
    print(f"\n{'='*60}")
    print(f"AUDITING: {service_name.upper()} -> {expected_schema}")
    print(f"{'='*60}")
    
    issues = []
    
    try:
        # Get all schemas
        schemas = get_schemas()
        print(f"📋 Available schemas: {', '.join(schemas)}")
        
        # Check if expected schema exists
        if expected_schema not in schemas:
            issues.append(f"Expected schema '{expected_schema}' not found")
            print(f"❌ Expected schema '{expected_schema}' not found")
        else:
            print(f"✅ Expected schema '{expected_schema}' exists")
        
        # Check tables in public schema (should be minimal for app tables)
        public_tables = get_tables_in_schema('public')
        app_tables = [t for t in public_tables if not t.startswith('django_') and not t.startswith('auth_')]
        
        if app_tables:
            issues.append(f"Application tables found in public schema: {app_tables}")
            print(f"⚠️  Application tables in public schema: {app_tables}")
        else:
            print(f"✅ No application tables in public schema")
        
        # Check tables in expected schema
        if expected_schema in schemas:
            schema_tables = get_tables_in_schema(expected_schema)
            print(f"📊 Tables in {expected_schema}: {len(schema_tables)}")
            if schema_tables:
                print(f"   Tables: {', '.join(schema_tables[:10])}{'...' if len(schema_tables) > 10 else ''}")
        
        # Check Django migrations in different schemas
        public_migrations = get_django_migrations_in_schema('public')
        if public_migrations:
            apps_in_public = set(m[0] for m in public_migrations)
            print(f"📝 Django migrations in public schema for apps: {', '.join(apps_in_public)}")
            
            # Check if any of these apps should be in the expected schema
            expected_apps = SERVICE_APPS.get(service_name, [])
            misplaced_apps = apps_in_public.intersection(expected_apps)
            if misplaced_apps:
                issues.append(f"Apps with migrations in public schema should be in {expected_schema}: {misplaced_apps}")
                print(f"❌ Misplaced app migrations: {misplaced_apps}")
        
        if expected_schema in schemas:
            schema_migrations = get_django_migrations_in_schema(expected_schema)
            if schema_migrations:
                apps_in_schema = set(m[0] for m in schema_migrations)
                print(f"📝 Django migrations in {expected_schema} for apps: {', '.join(apps_in_schema)}")
            else:
                # Check if this is expected (some services might not have been migrated yet)
                expected_apps = SERVICE_APPS.get(service_name, [])
                if expected_apps:
                    issues.append(f"No Django migrations found in {expected_schema} but expected apps: {expected_apps}")
                    print(f"⚠️  No Django migrations found in {expected_schema}")
        
        # Additional checks for specific known issues
        if service_name == 'user_service':
            # Check if institutions app is properly migrated
            if 'user_schema' in schemas:
                has_institutions_table = check_table_exists_in_schema('user_schema', 'institutions')
                if has_institutions_table:
                    print(f"✅ Institutions table found in user_schema")
                else:
                    issues.append(f"Institutions table not found in user_schema")
                    print(f"❌ Institutions table not found in user_schema")
    
    except Exception as e:
        issues.append(f"Error during audit: {str(e)}")
        print(f"❌ Audit error: {e}")
    
    return issues

def audit_cross_schema_consistency():
    """Audit cross-schema consistency issues"""
    print(f"\n{'='*60}")
    print(f"CROSS-SCHEMA CONSISTENCY CHECK")
    print(f"{'='*60}")
    
    issues = []
    
    try:
        schemas = get_schemas()
        
        # Check for django_migrations tables in multiple schemas
        migration_schemas = []
        for schema in schemas:
            if check_table_exists_in_schema(schema, 'django_migrations'):
                migration_schemas.append(schema)
        
        print(f"📝 Schemas with django_migrations table: {', '.join(migration_schemas)}")
        
        if len(migration_schemas) > 1:
            print(f"⚠️  Multiple django_migrations tables found - potential migration conflicts")
            
            # Check for duplicate app migrations across schemas
            all_apps = {}
            for schema in migration_schemas:
                migrations = get_django_migrations_in_schema(schema)
                apps_in_schema = set(m[0] for m in migrations)
                for app in apps_in_schema:
                    if app in all_apps:
                        all_apps[app].append(schema)
                    else:
                        all_apps[app] = [schema]
            
            # Report apps with migrations in multiple schemas
            duplicate_apps = {app: schemas for app, schemas in all_apps.items() if len(schemas) > 1}
            if duplicate_apps:
                issues.append(f"Apps with migrations in multiple schemas: {duplicate_apps}")
                print(f"❌ Apps with duplicate migrations: {duplicate_apps}")
            else:
                print(f"✅ No duplicate app migrations across schemas")
    
    except Exception as e:
        issues.append(f"Error during cross-schema audit: {str(e)}")
        print(f"❌ Cross-schema audit error: {e}")
    
    return issues

def main():
    print("🔍 DJANGO-BASED MICROSERVICES SCHEMA AUDIT")
    print("="*60)
    
    all_issues = {}
    
    # Audit each service schema
    for service_name, expected_schema in EXPECTED_SCHEMAS.items():
        issues = audit_service_schema(service_name, expected_schema)
        if issues:
            all_issues[service_name] = issues
    
    # Audit cross-schema consistency
    cross_schema_issues = audit_cross_schema_consistency()
    if cross_schema_issues:
        all_issues['cross_schema'] = cross_schema_issues
    
    # Summary
    print("\n" + "="*80)
    print("📊 AUDIT SUMMARY")
    print("="*80)
    
    if all_issues:
        print(f"❌ Issues found in {len(all_issues)} areas:")
        for area, issues in all_issues.items():
            print(f"\n🔴 {area.upper()}:")
            for issue in issues:
                print(f"   • {issue}")
    else:
        print("🎉 No schema issues detected!")
    
    print(f"\n📈 Total areas audited: {len(EXPECTED_SCHEMAS) + 1}")
    print(f"📈 Total issues found: {sum(len(issues) for issues in all_issues.values())}")
    
    # Recommendations
    if all_issues:
        print("\n" + "="*80)
        print("💡 RECOMMENDATIONS")
        print("="*80)
        
        for area, issues in all_issues.items():
            if 'migrations in public schema' in str(issues):
                print(f"• Migrate {area} apps from public to {EXPECTED_SCHEMAS.get(area, 'appropriate')} schema")
            if 'not found' in str(issues):
                print(f"• Create missing schema for {area}")
            if 'duplicate migrations' in str(issues):
                print(f"• Consolidate duplicate migrations for {area}")

if __name__ == "__main__":
    main()