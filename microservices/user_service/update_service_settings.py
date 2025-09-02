#!/usr/bin/env python
"""
Update Service Settings for Enhanced Schema Routing
This script updates all microservice settings to use the enhanced schema router
and configure proper search paths for database connections.
"""

import os
import re
from pathlib import Path

class ServiceSettingsUpdater:
    def __init__(self):
        self.microservices_root = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        self.services = [
            'auth_service',
            'user_service', 
            'application_service',
            'internship_service',
            'notification_service'
        ]
        
        self.service_schemas = {
            'auth_service': 'auth_schema',
            'user_service': 'user_schema',
            'application_service': 'application_schema', 
            'internship_service': 'internship_schema',
            'notification_service': 'notification_schema'
        }
    
    def find_settings_file(self, service_name):
        """Find the settings.py file for a service"""
        service_dir = self.microservices_root / service_name
        
        # Common locations for settings.py
        possible_paths = [
            service_dir / f"{service_name}" / "settings.py",
            service_dir / "settings.py",
            service_dir / "config" / "settings.py",
            service_dir / "src" / "settings.py"
        ]
        
        for path in possible_paths:
            if path.exists():
                return path
        
        return None
    
    def update_database_router(self, settings_content, service_name):
        """Update DATABASE_ROUTERS setting"""
        # Remove existing DATABASE_ROUTERS if present
        settings_content = re.sub(
            r'DATABASE_ROUTERS\s*=\s*\[.*?\]',
            '',
            settings_content,
            flags=re.DOTALL
        )
        
        # Add enhanced router
        router_config = "\n# Enhanced Schema Router\nDATABASE_ROUTERS = ['shared.database.enhanced_router.EnhancedSchemaRouter']\n"
        
        # Insert before DATABASES configuration or at the end
        if 'DATABASES' in settings_content:
            settings_content = settings_content.replace(
                'DATABASES',
                router_config + '\nDATABASES'
            )
        else:
            settings_content += router_config
        
        return settings_content
    
    def update_database_config(self, settings_content, service_name):
        """Update database configuration with proper search path"""
        schema_name = self.service_schemas[service_name]
        
        # Pattern to find DATABASES configuration
        databases_pattern = r"(DATABASES\s*=\s*get_databases_config\(.*?\))"
        
        if re.search(databases_pattern, settings_content):
            # Update existing get_databases_config call
            updated_config = f"""DATABASES = get_databases_config(
    service_name='{service_name.replace('_service', '')}',
    service_schema='{schema_name}',
    cross_service_access=['auth', 'user', 'application', 'internship', 'notification']
)

# Set search path for this service
for db_config in DATABASES.values():
    if 'OPTIONS' not in db_config:
        db_config['OPTIONS'] = {{}}
    db_config['OPTIONS']['options'] = f'-c search_path={schema_name},public'"""
            
            settings_content = re.sub(
                databases_pattern,
                updated_config,
                settings_content,
                flags=re.DOTALL
            )
        
        return settings_content
    
    def add_service_environment(self, settings_content, service_name):
        """Add SERVICE_NAME environment variable"""
        service_env = f"\n# Service identification\nos.environ.setdefault('SERVICE_NAME', '{service_name.replace('_service', '')}')\n"
        
        # Add after imports
        if 'import os' in settings_content:
            settings_content = settings_content.replace(
                'import os',
                'import os' + service_env
            )
        else:
            settings_content = 'import os' + service_env + '\n' + settings_content
        
        return settings_content
    
    def update_service_settings(self, service_name):
        """Update settings for a specific service"""
        print(f"\n📝 Updating {service_name} settings...")
        
        settings_path = self.find_settings_file(service_name)
        if not settings_path:
            print(f"   ❌ Settings file not found for {service_name}")
            return False
        
        print(f"   📁 Found settings at: {settings_path}")
        
        try:
            # Read current settings
            with open(settings_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Make updates
            content = self.add_service_environment(content, service_name)
            content = self.update_database_router(content, service_name)
            content = self.update_database_config(content, service_name)
            
            # Write updated settings
            with open(settings_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"   ✅ Updated {service_name} settings successfully")
            return True
            
        except Exception as e:
            print(f"   ❌ Error updating {service_name} settings: {e}")
            return False
    
    def create_migration_script(self):
        """Create a script to run migrations in correct order"""
        script_content = '''#!/usr/bin/env python
"""
Run migrations for all services in correct order
"""

import os
import subprocess
import sys
from pathlib import Path

def run_service_migrations(service_name):
    """Run migrations for a specific service"""
    print(f"\n🔄 Running migrations for {service_name}...")
    
    service_dir = Path(__file__).parent.parent / service_name
    
    if not service_dir.exists():
        print(f"   ❌ Service directory not found: {service_dir}")
        return False
    
    try:
        # Change to service directory
        os.chdir(service_dir)
        
        # Run makemigrations
        result = subprocess.run(
            [sys.executable, 'manage.py', 'makemigrations'],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"   ⚠️  Makemigrations warning for {service_name}: {result.stderr}")
        
        # Run migrate
        result = subprocess.run(
            [sys.executable, 'manage.py', 'migrate'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"   ✅ Migrations completed for {service_name}")
            return True
        else:
            print(f"   ❌ Migration failed for {service_name}: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error running migrations for {service_name}: {e}")
        return False

def main():
    """Run migrations for all services"""
    services = [
        'auth_service',
        'user_service',
        'application_service', 
        'internship_service',
        'notification_service'
    ]
    
    print("🚀 Running migrations for all services...")
    
    success_count = 0
    for service in services:
        if run_service_migrations(service):
            success_count += 1
    
    print(f"\n📊 Migration Summary: {success_count}/{len(services)} services completed successfully")
    
    if success_count == len(services):
        print("✅ All migrations completed successfully!")
    else:
        print("⚠️  Some migrations failed. Please check the output above.")

if __name__ == '__main__':
    main()
'''
        
        script_path = self.microservices_root / 'run_all_migrations.py'
        
        try:
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(script_content)
            print(f"   ✅ Created migration script at: {script_path}")
        except Exception as e:
            print(f"   ❌ Error creating migration script: {e}")
    
    def run_update(self):
        """Run the complete settings update"""
        print("⚙️  UPDATING SERVICE SETTINGS FOR ENHANCED SCHEMA ROUTING")
        print("=" * 60)
        
        success_count = 0
        
        for service in self.services:
            if self.update_service_settings(service):
                success_count += 1
        
        print(f"\n📊 Update Summary: {success_count}/{len(self.services)} services updated successfully")
        
        # Create migration script
        print("\n🔧 Creating migration script...")
        self.create_migration_script()
        
        print("\n✅ Service settings update completed!")
        print("\n📋 Next steps:")
        print("   1. Review updated settings files")
        print("   2. Run migrations using: python run_all_migrations.py")
        print("   3. Test each service to ensure proper schema routing")

if __name__ == '__main__':
    updater = ServiceSettingsUpdater()
    updater.run_update()