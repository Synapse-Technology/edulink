#!/usr/bin/env python3
"""
Test Redis Cloud connections for all microservices
"""

import os
import sys
import redis
from pathlib import Path

# Add each service to Python path for testing
service_dirs = [
    'auth_service',
    'user_service', 
    'application_service',
    'notification_service',
    'internship_service'
]

def load_env_file(service_path):
    """Load environment variables from .env file"""
    env_file = service_path / '.env'
    env_vars = {}
    
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    return env_vars

def test_redis_connection(service_name, redis_url):
    """Test Redis connection for a service"""
    try:
        # Parse Redis URL
        r = redis.from_url(redis_url)
        
        # Test connection
        r.ping()
        
        # Test basic operations
        test_key = f"test_{service_name}_connection"
        r.set(test_key, "test_value", ex=10)  # Expire in 10 seconds
        value = r.get(test_key)
        r.delete(test_key)
        
        if value == b"test_value":
            print(f"✅ {service_name}: Redis connection successful")
            return True
        else:
            print(f"❌ {service_name}: Redis connection failed - value mismatch")
            return False
            
    except Exception as e:
        print(f"❌ {service_name}: Redis connection failed - {str(e)}")
        return False

def test_celery_urls(service_name, broker_url, result_backend_url):
    """Test Celery Redis URLs"""
    try:
        # Test broker URL
        broker_redis = redis.from_url(broker_url)
        broker_redis.ping()
        
        # Test result backend URL
        result_redis = redis.from_url(result_backend_url)
        result_redis.ping()
        
        print(f"✅ {service_name}: Celery Redis URLs are valid")
        return True
        
    except Exception as e:
        print(f"❌ {service_name}: Celery Redis URLs failed - {str(e)}")
        return False

def main():
    """Main test function"""
    print("Testing Redis Cloud connections for all microservices...\n")
    
    microservices_path = Path(__file__).parent
    results = []
    
    for service_dir in service_dirs:
        service_path = microservices_path / service_dir
        
        if not service_path.exists():
            print(f"⚠️  {service_dir}: Service directory not found")
            continue
            
        print(f"Testing {service_dir}...")
        
        # Load environment variables
        env_vars = load_env_file(service_path)
        
        if not env_vars:
            print(f"❌ {service_dir}: No .env file found")
            results.append(False)
            continue
            
        # Test Redis URL
        redis_url = env_vars.get('REDIS_URL')
        if redis_url:
            redis_success = test_redis_connection(service_dir, redis_url)
        else:
            print(f"❌ {service_dir}: REDIS_URL not found in .env")
            redis_success = False
            
        # Test Celery URLs
        broker_url = env_vars.get('CELERY_BROKER_URL')
        result_backend_url = env_vars.get('CELERY_RESULT_BACKEND')
        
        if broker_url and result_backend_url:
            celery_success = test_celery_urls(service_dir, broker_url, result_backend_url)
        else:
            print(f"❌ {service_dir}: Celery URLs not found in .env")
            celery_success = False
            
        service_success = redis_success and celery_success
        results.append(service_success)
        
        print(f"{'✅' if service_success else '❌'} {service_dir}: Overall result\n")
    
    # Summary
    print("=" * 50)
    print("SUMMARY:")
    successful_services = sum(results)
    total_services = len(results)
    
    print(f"Successful: {successful_services}/{total_services}")
    
    if successful_services == total_services:
        print("🎉 All microservices are successfully connected to Redis Cloud!")
        return 0
    else:
        print("⚠️  Some microservices have Redis connection issues.")
        return 1

if __name__ == "__main__":
    sys.exit(main())