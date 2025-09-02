#!/usr/bin/env python
"""
Fix Service Settings - Correct Database Configuration
This script fixes the database configuration in all service settings files
to use the correct function signature and parameters.
"""

import os
import re
from pathlib import Path

class SettingsFixer:
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
    
    def fix_database_config(self, settings_content, service_name):
        """Fix database configuration with correct function signature"""
        service_short_name = service_name.replace('_service', '')
        schema_name = self.service_schemas[service_name]
        
        # Pattern to find incorrect DATABASES configuration
        incorrect_pattern = r"DATABASES\s*=\s*get_databases_config\([^)]*\).*?(?=\n\n|\n#|\nfor|$)"
        
        # Correct configuration
        correct_config = f"""DATABASES = get_databases_config('{service_short_name}')

# Set search path for this service schema
for db_config in DATABASES.values():
    if 'OPTIONS' not in db_config:
        db_config['OPTIONS'] = {{}}
    db_config['OPTIONS']['options'] = f'-c search_path={schema_name},public'"""
        
        # Replace incorrect configuration
        settings_content = re.sub(
            incorrect_pattern,
            correct_config,
            settings_content,
            flags=re.DOTALL
        )
        
        return settings_content
    
    def fix_service_settings(self, service_name):
        """Fix settings for a specific service"""
        print(f"\n🔧 Fixing {service_name} settings...")
        
        settings_path = self.find_settings_file(service_name)
        if not settings_path:
            print(f"   ❌ Settings file not found for {service_name}")
            return False
        
        print(f"   📁 Found settings at: {settings_path}")
        
        try:
            # Read current settings
            with open(settings_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Fix database configuration
            content = self.fix_database_config(content, service_name)
            
            # Write fixed settings
            with open(settings_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"   ✅ Fixed {service_name} settings successfully")
            return True
            
        except Exception as e:
            print(f"   ❌ Error fixing {service_name} settings: {e}")
            return False
    
    def run_fix(self):
        """Run the complete settings fix"""
        print("🔧 FIXING SERVICE SETTINGS - DATABASE CONFIGURATION")
        print("=" * 55)
        
        success_count = 0
        
        for service in self.services:
            if self.fix_service_settings(service):
                success_count += 1
        
        print(f"\n📊 Fix Summary: {success_count}/{len(self.services)} services fixed successfully")
        
        if success_count == len(self.services):
            print("✅ All service settings fixed successfully!")
        else:
            print("⚠️  Some settings fixes failed. Please check the output above.")
        
        print("\n📋 Next steps:")
        print("   1. Test Django setup for each service")
        print("   2. Run schema audit to verify fixes")
        print("   3. Run migrations if needed")

if __name__ == '__main__':
    fixer = SettingsFixer()
    fixer.run_fix()