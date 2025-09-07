#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.models import User
from users.models.employer_profile import EmployerProfile
from rest_framework_simplejwt.tokens import RefreshToken
import requests
import json

def create_test_user():
    """Create a test user and employer for testing"""
    try:
        # Create or get test user
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'is_active': True,
                'user_type': 'employer'
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
            print(f"Created test user: {user.email}")
        else:
            print(f"Test user already exists: {user.email}")
        
        # Create or get test employer
        employer, created = EmployerProfile.objects.get_or_create(
            user=user,
            defaults={
                'company_name': 'Test Company',
                'industry': 'Technology',
                'company_size': '50-100',
                'location': 'Test City'
            }
        )
        
        if created:
            print(f"Created test employer: {employer.company_name}")
        else:
            print(f"Test employer already exists: {employer.company_name}")
        
        return user, employer
    
    except Exception as e:
        print(f"Error creating test user: {e}")
        return None, None

def get_jwt_token(user):
    """Get JWT token for the user"""
    try:
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    except Exception as e:
        print(f"Error getting JWT token: {e}")
        return None

def test_workflow_endpoints(token):
    """Test workflow API endpoints"""
    base_url = 'http://127.0.0.1:8000/api/dashboards'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    endpoints = [
        '/workflows/',
        '/workflow-templates/',
        '/workflows/employer/',
        '/workflows/templates/',
        '/workflows/analytics/employer/'
    ]
    
    for endpoint in endpoints:
        try:
            url = base_url + endpoint
            print(f"\nTesting: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)[:200]}...")
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == '__main__':
    print("Creating test user and testing workflow API...")
    
    user, employer = create_test_user()
    if user:
        token = get_jwt_token(user)
        if token:
            print(f"\nJWT Token: {token[:50]}...")
            test_workflow_endpoints(token)
        else:
            print("Failed to get JWT token")
    else:
        print("Failed to create test user")