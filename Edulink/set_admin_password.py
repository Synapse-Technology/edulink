#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.models import User

# Set password for admin user
try:
    user = User.objects.get(email='admin@edulink.com')
    user.set_password('admin123')  # Simple password for testing
    user.save()
    print(f"Password set successfully for {user.email}")
    print("You can now login with:")
    print("Email: admin@edulink.com")
    print("Password: admin123")
except User.DoesNotExist:
    print("Admin user not found")