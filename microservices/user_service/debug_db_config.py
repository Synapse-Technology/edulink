import os
import django
from django.conf import settings
from django.db import connections

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

print("=== DATABASE CONFIGURATION ===")
print(f"SERVICE_NAME: {os.getenv('SERVICE_NAME')}")
print(f"Available databases: {list(settings.DATABASES.keys())}")
print(f"Database routers: {settings.DATABASE_ROUTERS}")

print("\n=== DATABASE DETAILS ===")
for alias, config in settings.DATABASES.items():
    print(f"\n{alias}:")
    print(f"  ENGINE: {config.get('ENGINE')}")
    print(f"  NAME: {config.get('NAME')}")
    print(f"  HOST: {config.get('HOST')}")
    print(f"  PORT: {config.get('PORT')}")
    print(f"  USER: {config.get('USER')}")
    if 'OPTIONS' in config:
        print(f"  OPTIONS: {config['OPTIONS']}")

print("\n=== TESTING DATABASE CONNECTIONS ===")
for alias in settings.DATABASES.keys():
    try:
        conn = connections[alias]
        with conn.cursor() as cursor:
            cursor.execute("SELECT current_schema()")
            schema = cursor.fetchone()[0]
            print(f"{alias}: Connected successfully, current schema: {schema}")
    except Exception as e:
        print(f"{alias}: Connection failed - {e}")

print("\n=== TESTING SCHEMA ROUTER ===")
from institutions.models import Institution
from shared.database.config import SchemaRouter

router = SchemaRouter()
db_for_read = router.db_for_read(Institution)
db_for_write = router.db_for_write(Institution)
allow_migrate_default = router.allow_migrate('default', 'institutions', 'Institution')
allow_migrate_user_db = router.allow_migrate('user_db', 'institutions', 'Institution')

print(f"Institution model routing:")
print(f"  db_for_read: {db_for_read}")
print(f"  db_for_write: {db_for_write}")
print(f"  allow_migrate('default', 'institutions'): {allow_migrate_default}")
print(f"  allow_migrate('user_db', 'institutions'): {allow_migrate_user_db}")