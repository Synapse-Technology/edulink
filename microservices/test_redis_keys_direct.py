#!/usr/bin/env python3
"""
Direct Redis test to verify key namespacing.
This script directly connects to Redis and tests key prefixes.
"""

import redis
import os
from dotenv import load_dotenv
from pathlib import Path

def test_redis_keys_direct():
    """Test Redis key prefixes directly."""
    print("Testing Redis key namespacing directly...\n")
    
    # Load Redis configuration
    env_file = Path(__file__).parent / 'auth_service' / '.env'
    load_dotenv(env_file)
    redis_url = os.getenv('REDIS_URL')
    
    if not redis_url:
        print("❌ Could not get Redis URL")
        return
    
    try:
        # Connect to Redis
        r = redis.from_url(redis_url)
        
        # Test connection
        r.ping()
        print("✅ Redis connection successful\n")
        
        # Clear any existing test keys
        existing_keys = r.keys('*test_namespace*')
        if existing_keys:
            r.delete(*existing_keys)
            print(f"Cleared {len(existing_keys)} existing test keys\n")
        
        # Test different key prefixes
        services = {
            'auth_service': 'auth_data',
            'user_service': 'user_data',
            'application_service': 'app_data',
            'notification_service': 'notification_data',
            'internship_service': 'internship_data',
            'registration_service': 'registration_data'
        }
        
        # Set keys with service prefixes
        for service, data in services.items():
            key = f"{service}:1:test_namespace_key"
            r.set(key, data, ex=300)  # 5 minute expiry
            print(f"✅ Set key: {key} = {data}")
        
        print("\n" + "="*50)
        print("Verifying key isolation...\n")
        
        # Verify each service can only see its own keys
        for service, expected_data in services.items():
            # Try to get this service's key
            key = f"{service}:1:test_namespace_key"
            value = r.get(key)
            
            if value:
                value_str = value.decode('utf-8') if isinstance(value, bytes) else value
                if value_str == expected_data:
                    print(f"✅ {service}: Found correct data ('{value_str}')")
                else:
                    print(f"❌ {service}: Wrong data - expected '{expected_data}', got '{value_str}'")
            else:
                print(f"❌ {service}: No data found for key '{key}'")
        
        print("\n" + "="*50)
        print("All keys in Redis:")
        
        # Show all test keys
        all_keys = r.keys('*test_namespace*')
        for key in all_keys:
            key_str = key.decode('utf-8') if isinstance(key, bytes) else key
            value = r.get(key)
            value_str = value.decode('utf-8') if isinstance(value, bytes) else value
            print(f"  {key_str}: {value_str}")
        
        print(f"\n✅ Total namespaced keys: {len(all_keys)}")
        
        # Test cross-service key access
        print("\n" + "="*50)
        print("Testing cross-service key access...\n")
        
        for service in services.keys():
            # Try to access other services' keys
            other_services = [s for s in services.keys() if s != service]
            accessible_keys = 0
            
            for other_service in other_services:
                other_key = f"{other_service}:1:test_namespace_key"
                value = r.get(other_key)
                if value:
                    accessible_keys += 1
            
            if accessible_keys == 0:
                print(f"✅ {service}: Cannot access other services' keys (good isolation)")
            else:
                print(f"⚠️  {service}: Can access {accessible_keys} other services' keys")
        
        # Clean up
        test_keys = r.keys('*test_namespace*')
        if test_keys:
            r.delete(*test_keys)
            print(f"\n🧹 Cleaned up {len(test_keys)} test keys")
        
        print("\n🎉 Direct Redis key namespacing test completed!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == '__main__':
    test_redis_keys_direct()