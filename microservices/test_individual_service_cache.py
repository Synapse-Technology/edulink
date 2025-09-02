#!/usr/bin/env python3
"""
Test individual service cache behavior.
This script tests one service at a time to avoid Django environment conflicts.
"""

import os
import sys
import django
from pathlib import Path
import redis
from dotenv import load_dotenv

def test_service_cache(service_name):
    """Test cache behavior for a specific service."""
    print(f"Testing {service_name} cache behavior...\n")
    
    # Set up Django environment
    service_path = Path(__file__).parent / service_name
    sys.path.insert(0, str(service_path))
    
    # Set the correct Django settings module for each service
    if service_name == 'registration_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{service_name}.settings.development')
    else:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{service_name}.settings')
    
    try:
        django.setup()
        
        from django.core.cache import cache
        from django.conf import settings
        
        # Print cache configuration
        cache_config = settings.CACHES['default']
        print(f"Cache backend: {cache_config.get('BACKEND')}")
        print(f"Cache location: {cache_config.get('LOCATION')}")
        print(f"Key prefix (top level): {cache_config.get('KEY_PREFIX')}")
        print(f"Version: {cache_config.get('VERSION')}")
        
        options = cache_config.get('OPTIONS', {})
        print(f"Key prefix (in OPTIONS): {options.get('KEY_PREFIX')}")
        print(f"Client class: {options.get('CLIENT_CLASS')}")
        
        # Test cache operations
        test_key = 'isolation_test_key'
        test_value = f'{service_name}_unique_data_{hash(service_name) % 10000}'
        
        print(f"\nTesting cache operations...")
        print(f"Setting: {test_key} = {test_value}")
        
        # Clear any existing value first
        cache.delete(test_key)
        
        # Set value
        cache.set(test_key, test_value, timeout=300)
        
        # Get value
        retrieved_value = cache.get(test_key)
        print(f"Retrieved: {retrieved_value}")
        
        if retrieved_value == test_value:
            print(f"✅ Cache set/get successful for {service_name}")
        else:
            print(f"❌ Cache mismatch for {service_name} - expected '{test_value}', got '{retrieved_value}'")
        
        # Connect directly to Redis to see actual keys
        print(f"\nChecking Redis keys directly...")
        
        # Load Redis URL
        env_file = service_path / '.env'
        load_dotenv(env_file)
        redis_url = os.getenv('REDIS_URL')
        
        if redis_url:
            r = redis.from_url(redis_url)
            
            # Find all keys that might be related to our test
            all_keys = r.keys('*isolation_test_key*')
            print(f"Found {len(all_keys)} keys matching '*isolation_test_key*':")
            
            for key in all_keys:
                try:
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else str(key)
                    value = r.get(key)
                    
                    if value:
                        try:
                            value_str = value.decode('utf-8') if isinstance(value, bytes) else str(value)
                        except UnicodeDecodeError:
                            value_str = f"<binary data: {len(value)} bytes>"
                    else:
                        value_str = "<None>"
                    
                    print(f"  {key_str}: {value_str}")
                    
                    # Check if this key contains our service's data
                    if test_value in str(value_str):
                        print(f"    ✅ This key contains {service_name}'s data")
                        
                        # Analyze the key structure
                        if service_name in key_str:
                            print(f"    ✅ Key contains service name prefix")
                        else:
                            print(f"    ❌ Key does NOT contain service name prefix")
                            
                except Exception as e:
                    print(f"  Error processing key: {e}")
        
        else:
            print("❌ Could not get Redis URL")
        
        print(f"\n{'='*60}")
        print(f"Summary for {service_name}:")
        print(f"- Django cache working: {'✅' if retrieved_value == test_value else '❌'}")
        print(f"- Key prefix configured: {cache_config.get('KEY_PREFIX')} (top) / {options.get('KEY_PREFIX')} (options)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing {service_name}: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Clean up
        if str(service_path) in sys.path:
            sys.path.remove(str(service_path))

def main():
    """Test cache behavior for a specific service."""
    if len(sys.argv) != 2:
        print("Usage: python test_individual_service_cache.py <service_name>")
        print("Available services: auth_service, user_service, application_service, notification_service, internship_service, registration_service")
        return
    
    service_name = sys.argv[1]
    
    # Validate service name
    valid_services = [
        'auth_service',
        'user_service', 
        'application_service',
        'notification_service',
        'internship_service',
        'registration_service'
    ]
    
    if service_name not in valid_services:
        print(f"❌ Invalid service name: {service_name}")
        print(f"Valid services: {', '.join(valid_services)}")
        return
    
    # Check if service directory exists
    service_path = Path(__file__).parent / service_name
    if not service_path.exists():
        print(f"❌ Service directory not found: {service_path}")
        return
    
    test_service_cache(service_name)

if __name__ == '__main__':
    main()