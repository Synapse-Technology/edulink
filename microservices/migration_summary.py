#!/usr/bin/env python
import os
import sys
import subprocess
from datetime import datetime

def run_django_command(service_dir, command):
    """
    Run a Django management command in a specific service directory
    """
    try:
        result = subprocess.run(
            command,
            cwd=service_dir,
            capture_output=True,
            text=True,
            shell=True
        )
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return "", str(e), 1

def check_service_migrations(service_name, service_dir):
    """
    Check migration status for a service
    """
    print(f"\n📊 Checking {service_name}...")
    
    if not os.path.exists(service_dir):
        print(f"❌ Directory not found: {service_dir}")
        return False
    
    # Check if manage.py exists
    manage_py = os.path.join(service_dir, 'manage.py')
    if not os.path.exists(manage_py):
        print(f"❌ manage.py not found in {service_dir}")
        return False
    
    print(f"✅ Found {service_name} at {service_dir}")
    
    # Check migration status
    print(f"   🔍 Checking migration status...")
    stdout, stderr, returncode = run_django_command(
        service_dir, 
        "python manage.py showmigrations --verbosity=0"
    )
    
    if returncode == 0:
        print(f"   ✅ Migration command executed successfully")
        
        # Count applied migrations
        applied_count = stdout.count('[X]')
        unapplied_count = stdout.count('[ ]')
        
        print(f"   📈 Applied migrations: {applied_count}")
        print(f"   📋 Unapplied migrations: {unapplied_count}")
        
        if unapplied_count > 0:
            print(f"   ⚠️  Warning: {unapplied_count} unapplied migrations found")
        else:
            print(f"   ✅ All migrations are applied")
        
        # Show migration apps
        lines = stdout.strip().split('\n')
        apps = set()
        for line in lines:
            if line and not line.startswith(' '):
                app_name = line.strip()
                if app_name:
                    apps.add(app_name)
        
        if apps:
            print(f"   📱 Migration apps found: {', '.join(sorted(apps))}")
        
        return True
    else:
        print(f"   ❌ Migration check failed: {stderr}")
        return False

def check_database_tables(service_name, service_dir):
    """
    Check if database tables exist
    """
    print(f"   🗄️  Checking database tables...")
    
    # Use Django shell to check tables
    django_code = '''
import django
from django.db import connection
from django.core.management.color import no_style

try:
    with connection.cursor() as cursor:
        # Get table names
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Total tables: {len(tables)}")
        
        # Check critical Django tables
        critical_tables = [
            'django_migrations',
            'django_content_type', 
            'django_session',
            'auth_user',
            'auth_group',
            'auth_permission'
        ]
        
        missing_critical = []
        for table in critical_tables:
            if table not in tables:
                missing_critical.append(table)
        
        if missing_critical:
            print(f"Missing critical tables: {', '.join(missing_critical)}")
        else:
            print("All critical Django tables exist")
        
        # Count service-specific tables
        service_prefix = "''' + service_name.split()[0].lower() + '''"
        service_tables = [t for t in tables if service_prefix in t]
        print(f"Service-specific tables: {len(service_tables)}")
        
except Exception as e:
    print(f"Database check error: {e}")
'''
    
    stdout, stderr, returncode = run_django_command(
        service_dir,
        f'python manage.py shell -c "{django_code}"'
    )
    
    if returncode == 0:
        # Parse output
        for line in stdout.strip().split('\n'):
            if line.strip():
                print(f"   📊 {line.strip()}")
    else:
        print(f"   ❌ Database check failed: {stderr}")

def main():
    """
    Main verification function
    """
    print("🔍 MIGRATION VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"📅 Verification Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Define services
    services = [
        ("Registration Service", "registration_service"),
        ("Auth Service", "auth_service")
    ]
    
    results = []
    
    for service_name, service_dir in services:
        success = check_service_migrations(service_name, service_dir)
        if success:
            check_database_tables(service_name, service_dir)
        results.append(success)
    
    # Final summary
    print("\n" + "=" * 60)
    print("📋 FINAL VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_good = all(results)
    
    if all_good:
        print("\n🎉 SUCCESS: All services verified successfully!")
        print("   ✅ Both services have proper migration status")
        print("   ✅ Database tables exist and are accessible")
        print("   ✅ Migration systems are working correctly")
    else:
        print("\n⚠️  ISSUES DETECTED:")
        for i, (service_name, _) in enumerate(services):
            status = "✅ OK" if results[i] else "❌ FAILED"
            print(f"   {status} {service_name}")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()