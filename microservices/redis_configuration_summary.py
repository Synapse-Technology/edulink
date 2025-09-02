#!/usr/bin/env python3
"""
Redis Configuration Summary for Edulink Microservices
This script provides a comprehensive overview of Redis configurations across all services.
"""

import os
import redis
from pathlib import Path
from dotenv import load_dotenv

def check_env_file(service_name):
    """Check .env file for Redis configuration"""
    env_path = Path.cwd() / service_name / '.env'
    if not env_path.exists():
        return None
    
    # Load the .env file
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value
    
    return {
        'REDIS_URL': env_vars.get('REDIS_URL', 'Not found'),
        'REDIS_HOST': env_vars.get('REDIS_HOST', 'Not found'),
        'REDIS_PORT': env_vars.get('REDIS_PORT', 'Not found'),
        'REDIS_DB': env_vars.get('REDIS_DB', 'Not found')
    }

def check_django_settings(service_name):
    """Check Django settings for cache configuration"""
    settings_files = [
        f'{service_name}/{service_name}/settings.py',
        f'{service_name}/{service_name}/settings/development.py',
        f'{service_name}/{service_name}/settings/base.py'
    ]
    
    cache_configs = []
    
    for settings_file in settings_files:
        settings_path = Path.cwd() / settings_file
        if settings_path.exists():
            try:
                with open(settings_path, 'r') as f:
                    content = f.read()
                    if 'CACHES' in content:
                        # Extract CACHES configuration
                        lines = content.split('\n')
                        in_caches = False
                        cache_lines = []
                        brace_count = 0
                        
                        for line in lines:
                            if 'CACHES = {' in line:
                                in_caches = True
                                cache_lines.append(line)
                                brace_count += line.count('{') - line.count('}')
                            elif in_caches:
                                cache_lines.append(line)
                                brace_count += line.count('{') - line.count('}')
                                if brace_count <= 0:
                                    break
                        
                        cache_config = '\n'.join(cache_lines)
                        cache_configs.append({
                            'file': settings_file,
                            'config': cache_config
                        })
            except Exception as e:
                cache_configs.append({
                    'file': settings_file,
                    'error': str(e)
                })
    
    return cache_configs

def test_redis_connection():
    """Test connection to Redis Cloud"""
    try:
        redis_url = "redis://default:8vGeHnCVI34G3djDnLYx7RmC9FJVQ42b@redis-15858.crce204.eu-west-2-3.ec2.redns.redis-cloud.com:15858/0"
        r = redis.from_url(redis_url)
        
        # Test connection
        r.ping()
        
        # Get some info
        info = r.info()
        
        return {
            'status': 'Connected',
            'redis_version': info.get('redis_version', 'Unknown'),
            'used_memory_human': info.get('used_memory_human', 'Unknown'),
            'connected_clients': info.get('connected_clients', 'Unknown'),
            'total_keys': len(r.keys('*'))
        }
    except Exception as e:
        return {
            'status': 'Failed',
            'error': str(e)
        }

def main():
    """Main function to generate Redis configuration summary"""
    print("Redis Configuration Summary for Edulink Microservices")
    print("=" * 70)
    
    # List of all microservices
    services = [
        'api_gateway',
        'auth_service',
        'user_service',
        'application_service',
        'notification_service',
        'registration_service',
        'internship_service'
    ]
    
    # Test Redis Cloud connection
    print("\n1. Redis Cloud Connection Status:")
    print("-" * 40)
    redis_status = test_redis_connection()
    if redis_status['status'] == 'Connected':
        print(f"✅ Redis Cloud: {redis_status['status']}")
        print(f"   Version: {redis_status['redis_version']}")
        print(f"   Memory Used: {redis_status['used_memory_human']}")
        print(f"   Connected Clients: {redis_status['connected_clients']}")
        print(f"   Total Keys: {redis_status['total_keys']}")
    else:
        print(f"❌ Redis Cloud: {redis_status['status']}")
        print(f"   Error: {redis_status['error']}")
    
    # Check each service
    print("\n2. Service-by-Service Configuration:")
    print("-" * 40)
    
    for service in services:
        print(f"\n📁 {service.upper()}:")
        
        # Check if service directory exists
        service_path = Path.cwd() / service
        if not service_path.exists():
            print(f"   ❌ Service directory not found")
            continue
        
        # Check .env file
        env_config = check_env_file(service)
        if env_config:
            print(f"   📄 .env file:")
            redis_url = env_config['REDIS_URL']
            if 'redis-cloud.com' in redis_url:
                print(f"      ✅ Redis URL: Redis Cloud configured")
            elif 'localhost' in redis_url:
                print(f"      ⚠️  Redis URL: Still using localhost")
            else:
                print(f"      ❓ Redis URL: {redis_url[:50]}...")
            
            print(f"      📊 Redis DB: {env_config['REDIS_DB']}")
        else:
            print(f"   ❌ .env file not found")
        
        # Check Django settings
        django_configs = check_django_settings(service)
        if django_configs:
            print(f"   ⚙️  Django CACHES configuration:")
            for config in django_configs:
                if 'error' in config:
                    print(f"      ❌ {config['file']}: {config['error']}")
                else:
                    print(f"      📝 {config['file']}:")
                    config_text = config['config']
                    if 'redis-cloud.com' in config_text:
                        print(f"         ✅ Redis Cloud configured")
                    elif 'localhost' in config_text:
                        print(f"         ⚠️  Still using localhost")
                    else:
                        print(f"         ❓ Custom configuration")
                    
                    if f"KEY_PREFIX': '{service}'" in config_text or f'KEY_PREFIX: \'{service}\'' in config_text:
                        print(f"         ✅ Key prefix: {service}")
                    else:
                        print(f"         ⚠️  Key prefix: Not properly set")
        else:
            print(f"   ❌ No Django CACHES configuration found")
    
    # Summary
    print("\n3. Configuration Summary:")
    print("-" * 40)
    
    services_with_redis_cloud = 0
    services_with_key_prefix = 0
    
    for service in services:
        service_path = Path.cwd() / service
        if not service_path.exists():
            continue
            
        env_config = check_env_file(service)
        if env_config and 'redis-cloud.com' in env_config.get('REDIS_URL', ''):
            services_with_redis_cloud += 1
        
        django_configs = check_django_settings(service)
        for config in django_configs:
            if 'config' in config and f"KEY_PREFIX': '{service}'" in config['config']:
                services_with_key_prefix += 1
                break
    
    total_services = len([s for s in services if (Path.cwd() / s).exists()])
    
    print(f"📊 Services with Redis Cloud: {services_with_redis_cloud}/{total_services}")
    print(f"🔑 Services with proper key prefixes: {services_with_key_prefix}/{total_services}")
    
    if services_with_redis_cloud == total_services and services_with_key_prefix == total_services:
        print(f"\n🎉 ALL SERVICES PROPERLY CONFIGURED!")
    elif services_with_redis_cloud == total_services:
        print(f"\n✅ Redis Cloud migration complete, but key prefixes need attention")
    else:
        print(f"\n⚠️  Configuration incomplete - some services still need updates")
    
    print("\n" + "=" * 70)
    print("Configuration summary complete.")

if __name__ == '__main__':
    main()