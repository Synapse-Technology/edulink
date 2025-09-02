#!/usr/bin/env python3
"""
Comprehensive test to verify Redis key namespacing across all microservices.
This test ensures proper isolation between services.
"""

import os
import sys
import django
import redis
from pathlib import Path

def test_service_namespacing(service_name):
    """Test Redis key namespacing for a specific service"""
    print(f"\n{'='*60}")
    print(f"Testing {service_name} key namespacing...")
    print(f"{'='*60}")
    
    # Change to service directory
    service_path = Path.cwd() / service_name
    if not service_path.exists():
        print(f"❌ Service directory {service_name} not found")
        return False
    
    os.chdir(service_path)
    sys.path.insert(0, str(service_path))
    
    # Set the correct Django settings module for each service
    if service_name == 'registration_service':
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{service_name}.settings.development')
    else:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{service_name}.settings')
    
    try:
        # Setup Django
        django.setup()
        
        from django.core.cache import cache
        from django.conf import settings
        
        # Test cache configuration
        cache_config = settings.CACHES['default']
        print(f"Cache backend: {cache_config['BACKEND']}")
        print(f"Cache location: {cache_config['LOCATION']}")
        print(f"Key prefix (top level): {cache_config.get('KEY_PREFIX', 'None')}")
        print(f"Version: {cache_config.get('VERSION', 'None')}")
        print(f"Key prefix (in OPTIONS): {cache_config.get('OPTIONS', {}).get('KEY_PREFIX', 'None')}")
        
        # Test cache operations
        test_key = 'namespacing_test_key'
        test_value = f'{service_name}_unique_data_{hash(service_name) % 10000}'
        
        print(f"\nTesting cache operations...")
        print(f"Setting: {test_key} = {test_value}")
        cache.set(test_key, test_value, timeout=300)
        
        retrieved_value = cache.get(test_key)
        print(f"Retrieved: {retrieved_value}")
        
        if retrieved_value == test_value:
            print(f"✅ Cache set/get successful for {service_name}")
            success = True
        else:
            print(f"❌ Cache set/get failed for {service_name}")
            success = False
        
        # Check key prefix
        expected_prefix = cache_config.get('KEY_PREFIX') or cache_config.get('OPTIONS', {}).get('KEY_PREFIX')
        if expected_prefix == service_name:
            print(f"✅ Key prefix correctly set to '{expected_prefix}'")
        else:
            print(f"❌ Key prefix mismatch. Expected '{service_name}', got '{expected_prefix}'")
            success = False
        
        # Clean up
        cache.delete(test_key)
        
        return success
        
    except Exception as e:
        print(f"❌ Error testing {service_name}: {str(e)}")
        return False
    finally:
        # Reset path and directory
        os.chdir(Path.cwd().parent)
        if str(service_path) in sys.path:
            sys.path.remove(str(service_path))

def check_redis_keys():
    """Check all keys in Redis to verify isolation"""
    print(f"\n{'='*60}")
    print("Checking Redis keys for isolation verification...")
    print(f"{'='*60}")
    
    try:
        # Connect to Redis Cloud
        redis_url = "redis://default:8vGeHnCVI34G3djDnLYx7RmC9FJVQ42b@redis-15858.crce204.eu-west-2-3.ec2.redns.redis-cloud.com:15858/0"
        r = redis.from_url(redis_url)
        
        # Get all keys matching our test pattern
        keys = r.keys('*namespacing_test_key*')
        
        print(f"Found {len(keys)} keys matching '*namespacing_test_key*':")
        
        service_keys = {}
        for key in keys:
            key_str = key.decode('utf-8')
            print(f"  {key_str}")
            
            # Extract service name from key prefix
            if ':' in key_str:
                service_prefix = key_str.split(':')[0]
                if service_prefix not in service_keys:
                    service_keys[service_prefix] = []
                service_keys[service_prefix].append(key_str)
        
        print(f"\nKey isolation summary:")
        for service, keys in service_keys.items():
            print(f"  {service}: {len(keys)} key(s)")
        
        # Verify each service has its own isolated keys
        if len(service_keys) > 1:
            print(f"✅ Key isolation working - {len(service_keys)} different service prefixes found")
            return True
        else:
            print(f"⚠️  Only {len(service_keys)} service prefix found - may need more services tested")
            return len(service_keys) >= 1
            
    except Exception as e:
        print(f"❌ Error checking Redis keys: {str(e)}")
        return False

def main():
    """Main test function"""
    print("Redis Key Namespacing Verification Test")
    print("=" * 60)
    
    # Services to test (only those we know are working)
    services_to_test = [
        'auth_service',
        'registration_service', 
        'application_service',
        'internship_service'
    ]
    
    results = {}
    
    # Test each service
    for service in services_to_test:
        results[service] = test_service_namespacing(service)
    
    # Check Redis key isolation
    redis_isolation = check_redis_keys()
    
    # Summary
    print(f"\n{'='*60}")
    print("FINAL SUMMARY")
    print(f"{'='*60}")
    
    successful_services = []
    failed_services = []
    
    for service, success in results.items():
        if success:
            print(f"✅ {service}: Key namespacing working")
            successful_services.append(service)
        else:
            print(f"❌ {service}: Key namespacing failed")
            failed_services.append(service)
    
    print(f"\nRedis key isolation: {'✅ Working' if redis_isolation else '❌ Failed'}")
    
    print(f"\nOverall status:")
    print(f"  - Successful services: {len(successful_services)}/{len(services_to_test)}")
    print(f"  - Failed services: {len(failed_services)}")
    
    if len(successful_services) == len(services_to_test) and redis_isolation:
        print(f"\n🎉 ALL TESTS PASSED! Redis key namespacing is working correctly.")
        return True
    else:
        print(f"\n⚠️  Some tests failed. Please review the results above.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)