#!/usr/bin/env python3
"""
Test Django cache behavior with key prefixes.
This script tests how Django handles cache key prefixes.
"""

import os
import sys
import django
from pathlib import Path

def test_django_cache_for_service(service_name):
    """Test Django cache behavior for a specific service."""
    print(f"\nTesting {service_name} Django cache behavior...")
    
    # Set up Django environment
    service_path = Path(__file__).parent / service_name
    sys.path.insert(0, str(service_path))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{service_name}.settings')
    
    try:
        django.setup()
        
        from django.core.cache import cache
        from django.conf import settings
        
        # Print cache configuration
        cache_config = settings.CACHES['default']
        print(f"  Cache backend: {cache_config.get('BACKEND')}")
        print(f"  Cache location: {cache_config.get('LOCATION')}")
        print(f"  Key prefix (top level): {cache_config.get('KEY_PREFIX')}")
        print(f"  Version: {cache_config.get('VERSION')}")
        
        options = cache_config.get('OPTIONS', {})
        print(f"  Key prefix (in OPTIONS): {options.get('KEY_PREFIX')}")
        
        # Test cache operations
        test_key = 'test_namespace_key'
        test_value = f'{service_name}_data'
        
        # Clear any existing value
        cache.delete(test_key)
        
        # Set value
        cache.set(test_key, test_value, timeout=300)
        print(f"  Set cache: {test_key} = {test_value}")
        
        # Get value
        retrieved_value = cache.get(test_key)
        print(f"  Retrieved: {retrieved_value}")
        
        if retrieved_value == test_value:
            print(f"  ✅ Cache set/get successful")
        else:
            print(f"  ❌ Cache mismatch - expected '{test_value}', got '{retrieved_value}'")
        
        # Test what actual key is used in Redis
        try:
            import redis
            from dotenv import load_dotenv
            
            # Load Redis URL
            env_file = service_path / '.env'
            load_dotenv(env_file)
            redis_url = os.getenv('REDIS_URL')
            
            if redis_url:
                r = redis.from_url(redis_url)
                
                # Find keys that might match our test
                all_keys = r.keys('*test_namespace_key*')
                print(f"  Redis keys matching '*test_namespace_key*': {len(all_keys)}")
                
                for key in all_keys:
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                    value = r.get(key)
                    value_str = value.decode('utf-8') if isinstance(value, bytes) else str(value)
                    print(f"    {key_str}: {value_str}")
                    
                    # Check if this key contains our service's data
                    if test_value in value_str:
                        print(f"    ✅ Found our data in key: {key_str}")
        
        except Exception as e:
            print(f"  ⚠️  Could not check Redis directly: {e}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error setting up {service_name}: {e}")
        return False
    
    finally:
        # Clean up Django setup
        if 'django' in sys.modules:
            django.setup()
        sys.path.remove(str(service_path))

def main():
    """Test Django cache behavior for all services."""
    print("Testing Django cache behavior with key prefixes...\n")
    
    services = [
        'auth_service',
        'user_service', 
        'application_service',
        'notification_service',
        'internship_service',
        'registration_service'
    ]
    
    successful_services = []
    
    for service in services:
        if test_django_cache_for_service(service):
            successful_services.append(service)
    
    print(f"\n" + "="*60)
    print(f"Summary: {len(successful_services)}/{len(services)} services tested successfully")
    
    # Now test cross-service cache access
    print("\n" + "="*60)
    print("Testing cross-service cache isolation...\n")
    
    for service in successful_services:
        print(f"Testing {service} isolation...")
        
        # Set up this service's Django environment
        service_path = Path(__file__).parent / service
        sys.path.insert(0, str(service_path))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{service}.settings')
        
        try:
            django.setup()
            from django.core.cache import cache
            
            # Try to get data that other services might have set
            other_services = [s for s in successful_services if s != service]
            
            for other_service in other_services:
                other_data = f'{other_service}_data'
                retrieved = cache.get('test_namespace_key')
                
                if retrieved == other_data:
                    print(f"  ❌ {service} can see {other_service}'s data: '{retrieved}'")
                elif retrieved and retrieved != f'{service}_data':
                    print(f"  ⚠️  {service} sees unexpected data: '{retrieved}'")
            
            # Check what this service actually sees
            own_data = cache.get('test_namespace_key')
            expected_data = f'{service}_data'
            
            if own_data == expected_data:
                print(f"  ✅ {service} correctly sees its own data: '{own_data}'")
            elif own_data:
                print(f"  ❌ {service} sees wrong data: '{own_data}' (expected '{expected_data}')")
            else:
                print(f"  ⚠️  {service} sees no data")
                
        except Exception as e:
            print(f"  ❌ Error testing {service}: {e}")
        
        finally:
            sys.path.remove(str(service_path))
    
    print("\n🎉 Django cache behavior test completed!")

if __name__ == '__main__':
    main()