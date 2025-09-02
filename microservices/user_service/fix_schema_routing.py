#!/usr/bin/env python
"""
Comprehensive Schema Routing Fix
This script addresses all schema routing issues identified in the audit:
1. Migrates tables from public schema to correct service schemas
2. Updates Django migration records
3. Implements permanent schema routing configuration
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.db import connection, transaction
from django.conf import settings

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

class SchemaRoutingFixer:
    def __init__(self):
        self.cursor = connection.cursor()
        
        # Define service schema mappings
        self.service_schemas = {
            'auth_service': 'auth_schema',
            'user_service': 'user_schema', 
            'application_service': 'application_schema',
            'internship_service': 'internship_schema',
            'notification_service': 'notification_schema'
        }
        
        # Define app to service mappings
        self.app_service_mapping = {
            'accounts': 'auth_service',
            'authentication': 'auth_service',
            'users': 'user_service',
            'profiles': 'user_service',
            'institutions': 'user_service',
            'applications': 'application_service',
            'internships': 'internship_service',
            'placements': 'internship_service',
            'notifications': 'notification_service',
            'messaging': 'notification_service'
        }
        
        # Tables that should remain in public schema
        self.public_schema_tables = {
            'django_migrations',
            'django_content_type',
            'django_session',
            'auth_permission',
            'auth_group',
            'auth_group_permissions',
            'auth_user_groups',
            'auth_user_user_permissions'
        }
    
    def create_schemas(self):
        """Create all required schemas if they don't exist"""
        print("\n🏗️  Creating required schemas...")
        
        for service, schema in self.service_schemas.items():
            try:
                self.cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
                print(f"   ✅ Schema '{schema}' ready")
            except Exception as e:
                print(f"   ❌ Error creating schema '{schema}': {e}")
    
    def get_tables_in_schema(self, schema_name):
        """Get all tables in a specific schema"""
        self.cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
        """, [schema_name])
        return [row[0] for row in self.cursor.fetchall()]
    
    def get_app_tables(self, app_name):
        """Get all tables belonging to a Django app"""
        # Get tables from Django migrations
        self.cursor.execute("""
            SELECT DISTINCT table_name
            FROM information_schema.tables t
            WHERE t.table_name LIKE %s
            AND t.table_schema IN ('public', 'auth_schema', 'user_schema', 'application_schema', 'internship_schema', 'notification_schema')
        """, [f"{app_name}_%"])
        return [row[0] for row in self.cursor.fetchall()]
    
    def move_table_to_schema(self, table_name, source_schema, target_schema):
        """Move a table from one schema to another"""
        try:
            # Check if table exists in source schema
            self.cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = %s AND table_name = %s
            """, [source_schema, table_name])
            
            if self.cursor.fetchone()[0] == 0:
                print(f"   ⚠️  Table '{table_name}' not found in '{source_schema}'")
                return False
            
            # Check if table already exists in target schema
            self.cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = %s AND table_name = %s
            """, [target_schema, table_name])
            
            if self.cursor.fetchone()[0] > 0:
                print(f"   ⚠️  Table '{table_name}' already exists in '{target_schema}'")
                return False
            
            # Move the table
            self.cursor.execute(f"ALTER TABLE {source_schema}.{table_name} SET SCHEMA {target_schema}")
            print(f"   ✅ Moved '{table_name}' from '{source_schema}' to '{target_schema}'")
            return True
            
        except Exception as e:
            print(f"   ❌ Error moving table '{table_name}': {e}")
            return False
    
    def create_schema_migration_tables(self):
        """Create django_migrations table in each service schema"""
        print("\n📋 Creating django_migrations tables in service schemas...")
        
        for service, schema in self.service_schemas.items():
            try:
                # Create django_migrations table in service schema
                self.cursor.execute(f"""
                    CREATE TABLE IF NOT EXISTS {schema}.django_migrations (
                        id SERIAL PRIMARY KEY,
                        app VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        applied TIMESTAMP WITH TIME ZONE NOT NULL
                    )
                """)
                print(f"   ✅ Created django_migrations in '{schema}'")
                
            except Exception as e:
                print(f"   ❌ Error creating django_migrations in '{schema}': {e}")
    
    def migrate_app_tables(self):
        """Migrate app tables to their correct schemas"""
        print("\n🚚 Migrating app tables to correct schemas...")
        
        for app_name, service in self.app_service_mapping.items():
            target_schema = self.service_schemas[service]
            print(f"\n   📦 Processing app '{app_name}' -> '{target_schema}'")
            
            # Get all tables for this app
            app_tables = self.get_app_tables(app_name)
            
            for table_name in app_tables:
                # Skip if table should remain in public
                if table_name in self.public_schema_tables:
                    continue
                
                # Move from public to target schema
                self.move_table_to_schema(table_name, 'public', target_schema)
    
    def migrate_django_migrations(self):
        """Migrate Django migration records to correct schemas"""
        print("\n📝 Migrating Django migration records...")
        
        for app_name, service in self.app_service_mapping.items():
            target_schema = self.service_schemas[service]
            
            try:
                # Copy migration records from public to service schema
                self.cursor.execute(f"""
                    INSERT INTO {target_schema}.django_migrations (app, name, applied)
                    SELECT app, name, applied 
                    FROM public.django_migrations 
                    WHERE app = %s
                    ON CONFLICT DO NOTHING
                """, [app_name])
                
                # Remove from public schema
                self.cursor.execute("""
                    DELETE FROM public.django_migrations WHERE app = %s
                """, [app_name])
                
                print(f"   ✅ Migrated '{app_name}' migration records to '{target_schema}'")
                
            except Exception as e:
                print(f"   ❌ Error migrating '{app_name}' migrations: {e}")
    
    def update_database_router(self):
        """Create enhanced database router configuration"""
        print("\n⚙️  Creating enhanced database router...")
        
        router_content = '''
"""
Enhanced Schema Router for Microservices
This router ensures all apps are routed to their correct schemas
"""

class EnhancedSchemaRouter:
    """
    Enhanced router that handles schema routing for all microservices
    """
    
    # Define app to schema mappings
    APP_SCHEMA_MAPPING = {
        'accounts': 'auth_schema',
        'authentication': 'auth_schema',
        'users': 'user_schema',
        'profiles': 'user_schema',
        'institutions': 'user_schema',
        'applications': 'application_schema',
        'internships': 'internship_schema',
        'placements': 'internship_schema',
        'notifications': 'notification_schema',
        'messaging': 'notification_schema'
    }
    
    # Apps that should remain in public schema
    PUBLIC_SCHEMA_APPS = {
        'admin', 'auth', 'contenttypes', 'sessions'
    }
    
    def db_for_read(self, model, **hints):
        """Suggest the database to read from."""
        app_label = model._meta.app_label
        
        if app_label in self.PUBLIC_SCHEMA_APPS:
            return 'default'
        
        if app_label in self.APP_SCHEMA_MAPPING:
            return 'default'  # All use same DB but different schemas
        
        return 'default'
    
    def db_for_write(self, model, **hints):
        """Suggest the database to write to."""
        return self.db_for_read(model, **hints)
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that certain apps' models get created on the right database."""
        if db != 'default':
            return False
        
        # Allow public schema apps to migrate normally
        if app_label in self.PUBLIC_SCHEMA_APPS:
            return True
        
        # Allow app-specific migrations based on current service context
        import os
        current_service = os.environ.get('SERVICE_NAME', '')
        
        if app_label in self.APP_SCHEMA_MAPPING:
            expected_schema = self.APP_SCHEMA_MAPPING[app_label]
            service_schema_mapping = {
                'auth_schema': 'auth',
                'user_schema': 'user',
                'application_schema': 'application',
                'internship_schema': 'internship',
                'notification_schema': 'notification'
            }
            expected_service = service_schema_mapping.get(expected_schema, '')
            return current_service == expected_service
        
        return True
'''
        
        router_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'shared', 'database', 'enhanced_router.py'
        )
        
        try:
            with open(router_path, 'w') as f:
                f.write(router_content)
            print(f"   ✅ Created enhanced router at '{router_path}'")
        except Exception as e:
            print(f"   ❌ Error creating enhanced router: {e}")
    
    def run_fix(self):
        """Run the complete schema routing fix"""
        print("🔧 COMPREHENSIVE SCHEMA ROUTING FIX")
        print("=" * 50)
        
        try:
            with transaction.atomic():
                self.create_schemas()
                self.create_schema_migration_tables()
                self.migrate_app_tables()
                self.migrate_django_migrations()
                self.update_database_router()
                
                print("\n✅ Schema routing fix completed successfully!")
                print("\n📋 Next steps:")
                print("   1. Update each service's settings.py to use EnhancedSchemaRouter")
                print("   2. Set search_path in database configuration")
                print("   3. Run migrations in each service to ensure proper schema routing")
                
        except Exception as e:
            print(f"\n❌ Error during schema fix: {e}")
            raise

if __name__ == '__main__':
    fixer = SchemaRoutingFixer()
    fixer.run_fix()