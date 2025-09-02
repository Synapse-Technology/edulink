#!/usr/bin/env python
"""
Run migrations for all services in correct order
"""

import os
import subprocess
import sys
from pathlib import Path

def run_service_migrations(service_name):
    """Run migrations for a specific service"""
    print(f"
🔄 Running migrations for {service_name}...")
    
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
    
    print(f"
📊 Migration Summary: {success_count}/{len(services)} services completed successfully")
    
    if success_count == len(services):
        print("✅ All migrations completed successfully!")
    else:
        print("⚠️  Some migrations failed. Please check the output above.")

if __name__ == '__main__':
    main()
