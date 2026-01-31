#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'edulink'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from edulink.apps.institutions.models import Institution
from edulink.apps.accounts.models import User

def create_test_data():
    print("Creating test data...")
    
    # Create a test institution
    institution, created = Institution.objects.get_or_create(
        name='Test University',
        domain='testuniversity.edu',
        defaults={
            'is_active': True,
            'is_verified': True,
            'status': 'active',
            'verification_method': 'ADMIN_APPROVED'
        }
    )
    print(f'Institution: {institution.name} (ID: {institution.id})')
    
    # Create a test institution admin user
    admin_user, created = User.objects.get_or_create(
        email='admin@testuniversity.edu',
        defaults={
            'username': 'admin_test',
            'role': 'institution_admin',
            'is_staff': True,
            'is_active': True
        }
    )
    if created:
        admin_user.set_password('testpass123')
        admin_user.save()
    print(f'Admin User: {admin_user.email} (Role: {admin_user.role})')
    
    # Create a test student user
    student_user, created = User.objects.get_or_create(
        email='student@testuniversity.edu',
        defaults={
            'username': 'student_test',
            'role': 'student',
            'is_active': True
        }
    )
    if created:
        student_user.set_password('testpass123')
        student_user.save()
    print(f'Student User: {student_user.email} (Role: {student_user.role})')
    
    print('Test data created successfully!')

if __name__ == '__main__':
    create_test_data()