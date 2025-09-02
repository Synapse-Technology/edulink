#!/usr/bin/env python3
"""
Test script to verify user service database configuration.
"""

import os
import sys
from pathlib import Path

# Add microservices to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'microservices'))

# Set environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')

try:
    import django
    django.setup()
    
    from django.conf import settings
    
    print("=== User Service Configuration Test ===")
    print(f"SERVICE_NAME: {getattr(settings, 'SERVICE_NAME', 'NOT SET')}")
    print(f"DATABASES: {settings.DATABASES}")
    print(f"DATABASE_ROUTERS: {settings.DATABASE_ROUTERS}")
    
    # Test database connection
    from django.db import connections
    
    for alias, config in settings.DATABASES.items():
        print(f"\nTesting connection to '{alias}':")
        print(f"  Host: {config.get('HOST', 'N/A')}")
        print(f"  Port: {config.get('PORT', 'N/A')}")
        print(f"  Name: {config.get('NAME', 'N/A')}")
        print(f"  User: {config.get('USER', 'N/A')}")
        print(f"  Options: {config.get('OPTIONS', {})}")
        
        try:
            conn = connections[alias]
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                print(f"  ✓ Connection successful: {result}")
        except Exception as e:
            print(f"  ✗ Connection failed: {e}")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()