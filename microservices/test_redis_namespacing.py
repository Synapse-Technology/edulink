#!/usr/bin/env python3
"""
Test script to verify Redis key namespacing for microservices.
This script tests that each service uses its own key namespace to prevent collisions.
"""

import os
import sys
import django
from pathlib import Path
import redis
from dotenv import load_dotenv

def setup_django_for_service(service_name):
    """Setup Django environment for a specific service."""
    service_path = Path(__file__).parent / service_name
    sys.path.insert(0, str(service_path))
    
    # Load environment variables
    env_file = service_path / '.env'
    if env_file.exists():
        load_dotenv(env_file)
    
    # Set Django settings module
    if service_name == 'auth_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth_service.settings')
    elif service_name == 'user_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
    elif service_name == 'application_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'application_service.settings')
    elif service_name == 'notification_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'notification_service.settings')
    elif service_name == 'internship_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'internship_service.settings')
    elif service_name == 'registration_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
    
    django.setup()

def test_cache_namespacing():
    """Test that each service uses its own cache namespace."""
    services = [
        'auth_service',
        'user_service', 
        'application_service',
        'notification_service',
        'internship_service',
        'registration_service'
    ]
    
    print("Testing Redis key namespacing for microservices...\n")
    
    # Test data
    test_key = 'test_key'
    test_values = {
        'auth_service': 'auth_data',
        'user_service': 'user_data',
        'application_service': 'app_data',
        'notification_service': 'notification_data',
        'internship_service': 'internship_data',
        'registration_service': 'registration_data'
    }
    
    # Store data in each service's cache
    for service in services:
        try:
            print(f"Testing {service}...")
            
            # Reset Django setup for each service
            if 'django' in sys.modules:
                del sys.modules['django']
            if hasattr(django, 'apps'):
                django.apps.apps.clear_cache()
            
            setup_django_for_service(service)
            
            from django.core.cache import cache
            
            # Set a value in this service's cache
            cache.set(test_key, test_values[service], timeout=300)
            
            # Verify the value was set
            retrieved_value = cache.get(test_key)
            if retrieved_value == test_values[service]:
                print(f"✅ {service}: Cache set/get successful")
            else:
                print(f"❌ {service}: Cache set/get failed - expected '{test_values[service]}', got '{retrieved_value}'")
            
        except Exception as e:
            print(f"❌ {service}: Error - {str(e)}")
    
    print("\n" + "="*50)
    
    # Now verify that each service only sees its own data
    print("Verifying namespace isolation...\n")
    
    for service in services:
        try:
            setup_django_for_service(service)
            from django.core.cache import cache
            
            retrieved_value = cache.get(test_key)
            expected_value = test_values[service]
            
            if retrieved_value == expected_value:
                print(f"✅ {service}: Namespace isolation working - sees only its own data ('{expected_value}')")
            else:
                print(f"❌ {service}: Namespace isolation failed - expected '{expected_value}', got '{retrieved_value}'")
                
        except Exception as e:
            print(f"❌ {service}: Error during isolation test - {str(e)}")
    
    print("\n" + "="*50)
    
    # Test direct Redis connection to see actual keys
    print("Checking actual Redis keys...\n")
    
    try:
        # Load Redis URL from any service (they all use the same instance)
        load_dotenv(Path(__file__).parent / 'auth_service' / '.env')
        redis_url = os.getenv('REDIS_URL')
        
        if redis_url:
            r = redis.from_url(redis_url)
            
            # Get all keys that match our test pattern
            keys = r.keys('*test_key*')
            
            print(f"Found {len(keys)} keys in Redis:")
            for key in keys:
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                value = r.get(key)
                value_str = value.decode('utf-8') if isinstance(value, bytes) else value
                print(f"  - {key_str}: {value_str}")
            
            if len(keys) == len(services):
                print(f"\n✅ Perfect! Found {len(keys)} namespaced keys for {len(services)} services")
            else:
                print(f"\n⚠️  Expected {len(services)} keys, found {len(keys)}")
        else:
            print("❌ Could not get Redis URL")
            
    except Exception as e:
        print(f"❌ Error checking Redis keys: {str(e)}")
    
    print("\n🎉 Redis key namespacing test completed!")

if __name__ == '__main__':
    test_cache_namespacing()