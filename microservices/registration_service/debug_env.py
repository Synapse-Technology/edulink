#!/usr/bin/env python
import os
import sys
from pathlib import Path
import environ

# Test the exact same setup as Django settings
BASE_DIR = Path(__file__).resolve().parent
print(f"BASE_DIR: {BASE_DIR}")
print(f".env file path: {BASE_DIR / '.env'}")
print(f".env file exists: {(BASE_DIR / '.env').exists()}")

# Initialize environ exactly like settings.py
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, 'django-insecure-change-me'),
    DATABASE_URL=(str, ''),
    REDIS_URL=(str, 'redis://localhost:6379/0'),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
    SERVICE_NAME=(str, 'registration'),
    SERVICE_SCHEMA=(str, 'registration_schema'),
)

# Read .env file exactly like settings.py
print(f"\nReading .env file...")
environ.Env.read_env(BASE_DIR / '.env')

print(f"\nAfter reading .env:")
print(f"SERVICE_NAME from env(): {env('SERVICE_NAME')}")
print(f"SERVICE_SCHEMA from env(): {env('SERVICE_SCHEMA')}")
print(f"DATABASE_URL exists: {bool(env('DATABASE_URL'))}")

# Test os.environ directly
print(f"\nDirect os.environ:")
print(f"SERVICE_NAME: {os.environ.get('SERVICE_NAME', 'NOT SET')}")
print(f"SERVICE_SCHEMA: {os.environ.get('SERVICE_SCHEMA', 'NOT SET')}")

# Add shared modules to path
sys.path.append(str(Path(__file__).parent.parent))

# Now test Django settings
print(f"\n=== Testing Django Settings Import ===")
try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
    print(f"Django settings module: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    
    import django
    # This should trigger the debug print in settings.py
    django.setup()
    
    from django.conf import settings
    
    print(f"\n=== Django Settings Values ===")
    print(f"settings.SERVICE_NAME: {getattr(settings, 'SERVICE_NAME', 'NOT SET')}")
    print(f"settings.SERVICE_SCHEMA: {getattr(settings, 'SERVICE_SCHEMA', 'NOT SET')}")
    print(f"DATABASES keys: {list(settings.DATABASES.keys())}")
    print(f"DATABASE_ROUTERS: {settings.DATABASE_ROUTERS}")
    
    # Test the database configuration function directly
    sys.path.append(str(Path(__file__).parent.parent.parent))
    from shared.database.django_settings import get_databases_config
    
    print(f"\n=== Direct Function Test ===")
    print(f"get_databases_config('{env('SERVICE_NAME')}'): {list(get_databases_config(env('SERVICE_NAME')).keys())}")
    
except Exception as e:
    print(f"Error setting up Django: {e}")
    import traceback
    traceback.print_exc()