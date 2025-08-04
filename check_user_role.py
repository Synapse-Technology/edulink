import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
import django
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.filter(email='admin@testuniversity.edu').first()

if user:
    print(f'User found: {user.email}')
    print(f'User role: {user.role}')
    print(f'User first_name: {user.first_name}')
    print(f'User last_name: {user.last_name}')
else:
    print('User not found')