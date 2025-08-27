#!/usr/bin/env python3
"""
Verification script for schema-based architecture implementation.
This script checks that all microservices are properly configured to use
the centralized schema-aware database configuration.
"""

import os
import sys
from pathlib import Path

# Add microservices to path
sys.path.append(str(Path(__file__).parent / 'microservices'))

def test_service_configuration(service_name, service_path):
    """Test that a service can properly import and use schema configuration."""
    print(f"\n=== Testing {service_name} Service ===")
    
    try:
        # Add service and microservices to path
        microservices_path = str(service_path.parent)
        sys.path.insert(0, str(service_path))
        sys.path.insert(0, microservices_path)
        
        # Import the service's settings
        settings_module = f"{service_name}_service.settings"
        settings = __import__(settings_module, fromlist=[''])
        
        # Check if SERVICE_NAME is defined
        if hasattr(settings, 'SERVICE_NAME'):
            print(f"✓ SERVICE_NAME: {settings.SERVICE_NAME}")
        else:
            print("✗ SERVICE_NAME not defined")
            return False
        
        # Check if DATABASES is properly configured
        if hasattr(settings, 'DATABASES'):
            databases = settings.DATABASES
            print(f"✓ DATABASES configured with {len(databases)} database(s)")
            
            # Check for expected database aliases
            expected_aliases = ['default', 'auth_db', 'user_db', 'notification_db', 
                              'application_db', 'internship_db', 'cross_service']
            
            for alias in expected_aliases:
                if alias in databases:
                    db_config = databases[alias]
                    if 'options' in db_config.get('OPTIONS', {}):
                        search_path = db_config['OPTIONS']['options']
                        print(f"  - {alias}: {search_path}")
                    else:
                        print(f"  - {alias}: configured")
        else:
            print("✗ DATABASES not configured")
            return False
        
        # Check if DATABASE_ROUTERS is configured
        if hasattr(settings, 'DATABASE_ROUTERS'):
            routers = settings.DATABASE_ROUTERS
            if routers:
                print(f"✓ DATABASE_ROUTERS: {routers}")
            else:
                print("✗ DATABASE_ROUTERS is empty")
                return False
        else:
            print("✗ DATABASE_ROUTERS not configured")
            return False
        
        print(f"✓ {service_name} service configuration is valid")
        return True
        
    except ImportError as e:
        print(f"✗ Failed to import {service_name} settings: {e}")
        return False
    except Exception as e:
        print(f"✗ Error testing {service_name}: {e}")
        return False
    finally:
        # Clean up path
        if str(service_path) in sys.path:
            sys.path.remove(str(service_path))
        microservices_path = str(service_path.parent)
        if microservices_path in sys.path:
            sys.path.remove(microservices_path)

def test_schema_router():
    """Test that the SchemaRouter is properly configured."""
    print("\n=== Testing SchemaRouter ===")
    
    try:
        from microservices.shared.database.config import SchemaRouter
        
        router = SchemaRouter()
        
        # Test app mappings
        test_mappings = {
            'authentication': 'auth_db',
            'users': 'user_db',
            'profiles': 'user_db',
            'institutions': 'user_db',
            'notifications': 'notification_db',
            'applications': 'application_db',
            'internships': 'internship_db',
        }
        
        print("✓ SchemaRouter imported successfully")
        
        # Create a mock model for testing
        class MockModel:
            class _meta:
                def __init__(self, app_label):
                    self.app_label = app_label
        
        for app_label, expected_db in test_mappings.items():
            mock_model = MockModel()
            mock_model._meta = MockModel._meta(app_label)
            
            suggested_db = router.db_for_read(mock_model)
            if suggested_db == expected_db:
                print(f"  ✓ {app_label} -> {expected_db}")
            else:
                print(f"  ✗ {app_label} -> {suggested_db} (expected {expected_db})")
                return False
        
        print("✓ SchemaRouter mappings are correct")
        return True
        
    except Exception as e:
        print(f"✗ Error testing SchemaRouter: {e}")
        return False

def main():
    """Main verification function."""
    print("Schema-Based Architecture Verification")
    print("=" * 50)
    
    microservices_dir = Path(__file__).parent / 'microservices'
    
    services = [
        ('auth', microservices_dir / 'auth_service'),
        ('user', microservices_dir / 'user_service'),
        ('notification', microservices_dir / 'notification_service'),
        ('application', microservices_dir / 'application_service'),
        ('internship', microservices_dir / 'internship_service'),
    ]
    
    results = []
    
    # Test each service
    for service_name, service_path in services:
        if service_path.exists():
            result = test_service_configuration(service_name, service_path)
            results.append((service_name, result))
        else:
            print(f"\n✗ {service_name} service directory not found: {service_path}")
            results.append((service_name, False))
    
    # Test SchemaRouter
    router_result = test_schema_router()
    results.append(('SchemaRouter', router_result))
    
    # Summary
    print("\n" + "=" * 50)
    print("VERIFICATION SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for component, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{component:15} {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 ALL TESTS PASSED - Schema-based architecture is properly implemented!")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Please review the configuration issues above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())