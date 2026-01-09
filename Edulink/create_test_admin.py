#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from institutions.models import Institution, Department
from users.models.institution_profile import InstitutionProfile

User = get_user_model()

def create_test_admin():
    try:
        # Get or create institution
        institution, created = Institution.objects.get_or_create(
            name="Test University",
            defaults={
                'code': 'TU001',
                'email': 'admin@testuniversity.edu',
                'phone': '+254700000000',
                'address': 'Test Address',
                'website': 'https://testuniversity.edu',
                'is_active': True
            }
        )
        
        if created:
            print(f"Created institution: {institution.name}")
        else:
            print(f"Using existing institution: {institution.name}")
        
        # Create test admin user
        email = 'admin@testuniversity.edu'
        password = 'testpass123'
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            print(f"User {email} already exists")
        else:
            user = User.objects.create_user(
                email=email,
                password=password,
                role='institution_admin',
                is_active=True,
                is_verified=True
            )
            print(f"Created user: {email}")
        
        # Create or update user profile
        profile, created = InstitutionProfile.objects.get_or_create(
            user=user,
            defaults={
                'first_name': 'Test',
                'last_name': 'Admin',
                'phone_number': '+254700000001',
                'institution': institution
            }
        )
        
        if created:
            print(f"Created profile for: {user.email}")
        else:
            # Update existing profile
            profile.institution = institution
            profile.save()
            print(f"Updated profile for: {user.email}")
        
        print("\n=== Test Admin Credentials ===")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Institution: {institution.name}")
        print("\nYou can now login to the institution dashboard with these credentials.")
        
        return user, institution
        
    except Exception as e:
        print(f"Error creating test admin: {e}")
        import traceback
        traceback.print_exc()
        return None, None

if __name__ == '__main__':
    create_test_admin()