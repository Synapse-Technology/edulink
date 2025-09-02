import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%auth%';")
auth_tables = cursor.fetchall()

print('Auth-related tables:')
for table in auth_tables:
    print(f'  - {table[0]}')

print(f'\nTotal auth tables: {len(auth_tables)}')

# Check if auth_user specifically exists
cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_user';")
auth_user_exists = cursor.fetchall()

print(f'\nauth_user table exists: {len(auth_user_exists) > 0}')

# List all tables that contain 'user'
cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%user%';")
user_tables = cursor.fetchall()

print('\nUser-related tables:')
for table in user_tables:
    print(f'  - {table[0]}')