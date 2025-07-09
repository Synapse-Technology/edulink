#!/usr/bin/env python3
"""
Test script for authentication workflow
"""
import requests
import json
import os
import sys

# Add the Django project to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'Edulink'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings')

import django
django.setup()

from authentication.models import User
from users.models import StudentProfile, UserRole
from institutions.models import Institution
from django.utils import timezone

def create_test_user():
    """Create a test student user"""
    try:
        # Create test institution
        institution, created = Institution.objects.get_or_create(
            name="Test University",
            defaults={
                "institution_type": "University",
                "registration_number": "UNI123456",
                "email": "contact@testuniversity.edu",
                "phone_number": "+1234567890",
                "website": "https://www.testuniversity.edu",
                "address": "123 University Street, Test City",
                "is_verified": True,
                "verified_at": timezone.now()
            }
        )
        
        # Create test user
        user, created = User.objects.get_or_create(
            email="test@example.com",
            defaults={
                "password": "testpass123",
                "role": "student",
                "is_email_verified": True,
                "is_active": True
            }
        )
        
        if created:
            user.set_password("testpass123")
            user.save()
            
            # Create user role
            UserRole.objects.get_or_create(
                user=user,
                role='student'
            )
            
            # Create student profile
            StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    "first_name": "Test",
                    "last_name": "Student",
                    "phone_number": "+1234567890",
                    "national_id": "123456789",
                    "registration_number": "ADM123",
                    "academic_year": 2024,
                    "institution": institution,
                    "is_verified": True,
                    "institution_name": "Test University"
                }
            )
            
            print("✅ Test user created successfully!")
            print("Email: test@example.com")
            print("Password: testpass123")
        else:
            print("✅ Test user already exists!")
            print("Email: test@example.com")
            print("Password: testpass123")
            
        return True
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        return False

def test_login_endpoint():
    """Test the login endpoint"""
    try:
        url = "http://127.0.0.1:8000/api/auth/login/"
        data = {
            "email": "test@example.com",
            "password": "testpass123"
        }
        
        print("\n🔐 Testing login endpoint...")
        response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Login successful!")
            print(f"Access Token: {result.get('access', 'N/A')[:50]}...")
            print(f"User Role: {result.get('user', {}).get('role', 'N/A')}")
            return result
        else:
            print("❌ Login failed!")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django server is running on port 8000")
        return None
    except Exception as e:
        print(f"❌ Error testing login: {e}")
        return None

def test_protected_endpoint(access_token):
    """Test accessing a protected endpoint"""
    try:
        url = "http://127.0.0.1:8000/api/users/profile/"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        print("\n🔒 Testing protected endpoint...")
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Protected endpoint access successful!")
            return True
        else:
            print("❌ Protected endpoint access failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error testing protected endpoint: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing EduLink Authentication Workflow")
    print("=" * 50)
    
    # Step 1: Create test user
    if create_test_user():
        # Step 2: Test login
        login_result = test_login_endpoint()
        
        if login_result and login_result.get('access'):
            # Step 3: Test protected endpoint
            test_protected_endpoint(login_result['access'])
    
    print("\n" + "=" * 50)
    print("🏁 Authentication workflow test completed!") 