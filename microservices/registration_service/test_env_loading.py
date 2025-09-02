#!/usr/bin/env python
import os
import environ
from pathlib import Path

print("Testing environment variable loading...")

# Test 1: Check if .env file exists
BASE_DIR = Path(__file__).resolve().parent
env_file = BASE_DIR / '.env'
print(f"BASE_DIR: {BASE_DIR}")
print(f".env file path: {env_file}")
print(f".env file exists: {env_file.exists()}")

if env_file.exists():
    with open(env_file, 'r') as f:
        content = f.read()
    print(f".env file content (first 500 chars):\n{content[:500]}")

# Test 2: Check os.environ before environ setup
print(f"\nBefore environ setup:")
print(f"os.environ.get('SERVICE_NAME'): {os.environ.get('SERVICE_NAME')}")
print(f"os.environ.get('SERVICE_SCHEMA'): {os.environ.get('SERVICE_SCHEMA')}")

# Test 3: Set up environ exactly like in settings.py
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, 'your-secret-key-here'),
    DATABASE_URL=(str, 'postgresql://user:password@localhost:5432/edulink'),
    REDIS_URL=(str, 'redis://localhost:6379/0'),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
    SERVICE_NAME=(str, 'registration'),
    SERVICE_SCHEMA=(str, 'registration_schema'),
)

# Read .env file
environ.Env.read_env(BASE_DIR / '.env')

# Test 4: Check os.environ after environ setup
print(f"\nAfter environ setup:")
print(f"os.environ.get('SERVICE_NAME'): {os.environ.get('SERVICE_NAME')}")
print(f"os.environ.get('SERVICE_SCHEMA'): {os.environ.get('SERVICE_SCHEMA')}")

# Test 5: Check env() calls
print(f"\nUsing env() calls:")
print(f"env('SERVICE_NAME'): {env('SERVICE_NAME')}")
print(f"env('SERVICE_SCHEMA'): {env('SERVICE_SCHEMA')}")

# Test 6: Assign to variables like in settings.py
SERVICE_NAME = env('SERVICE_NAME')
SERVICE_SCHEMA = env('SERVICE_SCHEMA')
print(f"\nAssigned variables:")
print(f"SERVICE_NAME: {SERVICE_NAME}")
print(f"SERVICE_SCHEMA: {SERVICE_SCHEMA}")

print("\nTest completed.")