import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
tables = cursor.fetchall()

print('Existing tables:')
for table in tables:
    print(f'  - {table[0]}')

print(f'\nTotal tables: {len(tables)}')