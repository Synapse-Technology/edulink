#!/usr/bin/env python3
"""
Comprehensive audit script to identify schema routing issues across all microservices.
This script checks for:
1. Tables created in wrong schemas
2. Migration records in wrong locations
3. Database configuration issues
"""

import os
import sys
import django
from pathlib import Path
import subprocess
from typing import Dict, List, Tuple

# Add shared modules to path
sys.path.append(str(Path(__file__).parent))

def check_microservice_schemas(service_path: str, service_name: str) -> Dict:
    """Check schema issues for a specific microservice."""
    print(f"\n{'='*60}")
    print(f"AUDITING: {service_name.upper()}")
    print(f"{'='*60}")
    
    results = {
        'service_name': service_name,
        'service_path': service_path,
        'has_manage_py': False,
        'database_config': None,
        'apps': [],
        'schema_issues': [],
        'migration_issues': []
    }
    
    # Check if service has manage.py (Django service)
    manage_py_path = os.path.join(service_path, 'manage.py')
    if not os.path.exists(manage_py_path):
        print(f"❌ No manage.py found - not a Django service")
        return results
    
    results['has_manage_py'] = True
    print(f"✅ Django service detected")
    
    # Change to service directory
    original_cwd = os.getcwd()
    os.chdir(service_path)
    
    try:
        # Set Django settings module
        settings_module = f"{service_name}.settings"
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)
        
        # Try to setup Django
        try:
            django.setup()
            from django.conf import settings
            from django.db import connections
            from django.apps import apps
            
            print(f"✅ Django setup successful")
            
            # Check database configuration
            if hasattr(settings, 'DATABASES'):
                results['database_config'] = {
                    'databases': list(settings.DATABASES.keys()),
                    'routers': getattr(settings, 'DATABASE_ROUTERS', [])
                }
                print(f"📊 Databases: {results['database_config']['databases']}")
                print(f"🔀 Routers: {results['database_config']['routers']}")
            
            # Get all installed apps
            installed_apps = [app.label for app in apps.get_app_configs()]
            local_apps = [app for app in installed_apps if not app.startswith('django.') and not app.startswith('rest_framework') and not app.startswith('corsheaders')]
            results['apps'] = local_apps
            print(f"📱 Local apps: {local_apps}")
            
            # Check each database connection and schema
            for db_alias in settings.DATABASES.keys():
                try:
                    conn = connections[db_alias]
                    with conn.cursor() as cursor:
                        # Get current schema
                        cursor.execute("SELECT current_schema()")
                        current_schema = cursor.fetchone()[0]
                        
                        # Get search_path
                        cursor.execute("SHOW search_path")
                        search_path = cursor.fetchone()[0]
                        
                        print(f"\n🔍 Database '{db_alias}':")
                        print(f"   Current schema: {current_schema}")
                        print(f"   Search path: {search_path}")
                        
                        # Check for django_migrations table in current schema
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_schema = current_schema() 
                                AND table_name = 'django_migrations'
                            )
                        """)
                        has_migrations_table = cursor.fetchone()[0]
                        
                        if has_migrations_table:
                            # Check migrations for local apps
                            for app in local_apps:
                                cursor.execute("""
                                    SELECT name, applied 
                                    FROM django_migrations 
                                    WHERE app = %s
                                    ORDER BY applied DESC
                                """, [app])
                                
                                migrations = cursor.fetchall()
                                if migrations:
                                    print(f"   📋 {app} migrations in {current_schema}: {len(migrations)}")
                                    
                                    # Check if this is the expected schema for this app
                                    expected_schema = get_expected_schema(service_name, app)
                                    if expected_schema and current_schema != expected_schema:
                                        issue = {
                                            'type': 'wrong_schema_migrations',
                                            'app': app,
                                            'current_schema': current_schema,
                                            'expected_schema': expected_schema,
                                            'database': db_alias,
                                            'migration_count': len(migrations)
                                        }
                                        results['migration_issues'].append(issue)
                                        print(f"   ⚠️  ISSUE: {app} migrations in {current_schema}, expected {expected_schema}")
                        
                        # Check for tables in different schemas
                        cursor.execute("""
                            SELECT table_schema, table_name 
                            FROM information_schema.tables 
                            WHERE table_type = 'BASE TABLE'
                            AND table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                            ORDER BY table_schema, table_name
                        """)
                        
                        all_tables = cursor.fetchall()
                        schema_tables = {}
                        for schema, table in all_tables:
                            if schema not in schema_tables:
                                schema_tables[schema] = []
                            schema_tables[schema].append(table)
                        
                        print(f"   📊 Tables by schema:")
                        for schema, tables in schema_tables.items():
                            print(f"      {schema}: {len(tables)} tables")
                            
                            # Check for app-specific tables in wrong schemas
                            for app in local_apps:
                                app_tables = [t for t in tables if app in t or any(model_name in t for model_name in get_app_model_names(app))]
                                if app_tables and schema != get_expected_schema(service_name, app):
                                    issue = {
                                        'type': 'wrong_schema_tables',
                                        'app': app,
                                        'current_schema': schema,
                                        'expected_schema': get_expected_schema(service_name, app),
                                        'tables': app_tables
                                    }
                                    results['schema_issues'].append(issue)
                                    print(f"         ⚠️  ISSUE: {app} tables in {schema}, expected {get_expected_schema(service_name, app)}")
                
                except Exception as e:
                    print(f"❌ Error checking database '{db_alias}': {e}")
            
        except Exception as e:
            print(f"❌ Django setup failed: {e}")
            results['django_error'] = str(e)
    
    finally:
        os.chdir(original_cwd)
    
    return results

def get_expected_schema(service_name: str, app_name: str) -> str:
    """Get the expected schema for an app based on service name and routing rules."""
    # Based on the SchemaRouter configuration
    app_to_schema = {
        # Auth service apps
        'auth': 'auth_schema',
        'contenttypes': 'auth_schema',
        'sessions': 'auth_schema',
        'admin': 'auth_schema',
        'authentication': 'auth_schema',
        'security': 'auth_schema',
        # User service apps
        'users': 'user_schema',
        'profiles': 'user_schema',
        'roles': 'user_schema',
        'institutions': 'user_schema',
        'companies': 'user_schema',
        # Other service apps
        'notifications': 'notification_schema',
        'applications': 'application_schema',
        'internships': 'internship_schema',
        'registration_requests': 'registration_schema',
    }
    
    return app_to_schema.get(app_name, f"{service_name}_schema")

def get_app_model_names(app_name: str) -> List[str]:
    """Get common model names for an app to help identify related tables."""
    model_patterns = {
        'institutions': ['institution', 'master_institution', 'department'],
        'users': ['user', 'profile'],
        'applications': ['application', 'internship_application'],
        'notifications': ['notification', 'email'],
        'authentication': ['token', 'session'],
        'companies': ['company', 'supervisor'],
        'internships': ['internship', 'placement']
    }
    
    return model_patterns.get(app_name, [app_name])

def main():
    """Main audit function."""
    print("🔍 MICROSERVICES SCHEMA AUDIT")
    print("=" * 60)
    
    microservices_dir = Path(__file__).parent
    services_to_check = [
        'auth_service',
        'user_service', 
        'application_service',
        'internship_service',
        'notification_service',
        'registration_service'
    ]
    
    all_results = []
    
    for service_name in services_to_check:
        service_path = microservices_dir / service_name
        if service_path.exists():
            results = check_microservice_schemas(str(service_path), service_name)
            all_results.append(results)
        else:
            print(f"⚠️  Service directory not found: {service_path}")
    
    # Summary report
    print(f"\n\n{'='*80}")
    print("📊 AUDIT SUMMARY")
    print(f"{'='*80}")
    
    total_issues = 0
    for result in all_results:
        if result['has_manage_py']:
            service_issues = len(result.get('schema_issues', [])) + len(result.get('migration_issues', []))
            total_issues += service_issues
            
            status = "✅ OK" if service_issues == 0 else f"⚠️  {service_issues} issues"
            print(f"{result['service_name']:<20} {status}")
            
            for issue in result.get('schema_issues', []):
                print(f"  🔴 Schema Issue: {issue['app']} tables in {issue['current_schema']}, expected {issue['expected_schema']}")
            
            for issue in result.get('migration_issues', []):
                print(f"  🟡 Migration Issue: {issue['app']} migrations in {issue['current_schema']}, expected {issue['expected_schema']}")
    
    print(f"\n📈 Total issues found: {total_issues}")
    
    if total_issues > 0:
        print("\n🔧 RECOMMENDED ACTIONS:")
        print("1. Implement permanent schema routing fix")
        print("2. Migrate misplaced tables to correct schemas")
        print("3. Update migration records")
        print("4. Test all microservices after fixes")
    else:
        print("\n🎉 No schema issues detected!")

if __name__ == '__main__':
    main()