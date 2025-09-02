import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

with connection.cursor() as cursor:
    # Delete migration records for institutions app
    cursor.execute("""
        DELETE FROM django_migrations 
        WHERE app = 'institutions';
    """)
    
    print(f"Deleted {cursor.rowcount} migration records for institutions app")
    
    # Verify deletion
    cursor.execute("""
        SELECT COUNT(*) FROM django_migrations 
        WHERE app = 'institutions';
    """)
    
    count = cursor.fetchone()[0]
    print(f"Remaining migration records for institutions: {count}")