import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT app, name, applied 
        FROM django_migrations 
        WHERE app = 'institutions'
        ORDER BY applied DESC;
    """)
    
    migrations = cursor.fetchall()
    print("Applied migrations for institutions app:")
    for migration in migrations:
        print(f"  - {migration[1]} (applied: {migration[2]})")
    
    if not migrations:
        print("  No migrations found for institutions app")