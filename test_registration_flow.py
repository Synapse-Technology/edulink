#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Add the project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'edulink'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from edulink.apps.institutions.models import Institution
from edulink.apps.accounts.models import User
from edulink.apps.students.models import Student, StudentInstitutionAffiliation

def test_registration_flow():
    print("=== Testing Complete Registration and Affiliation Flow ===")
    
    base_url = "http://localhost:8000"
    
    # Test 1: User Registration
    print("\n1. Testing User Registration...")
    registration_data = {
        "email": "teststudent3@testuniversity.edu",
        "username": "teststudent3",
        "password": "testpass123",
        "password_confirm": "testpass123",
        "first_name": "Test",
        "last_name": "Student",
        "phone_number": "+1234567890",
        "gender": "M",
        "role": "student",
        "registration_number": "TEST2024003"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/users/register/",
            json=registration_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Registration Response Status: {response.status_code}")
        if response.status_code == 201:
            print("✓ User registration successful!")
            user_data = response.json()
            print(f"User ID: {user_data['user']['id']}")
            print(f"User Email: {user_data['user']['email']}")
        else:
            print(f"✗ Registration failed: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Could not connect to server. Make sure Django is running on localhost:8000")
        return False
    except Exception as e:
        print(f"✗ Registration error: {e}")
        return False
    
    # Test 2: Verify Student Profile Creation
    print("\n2. Verifying Student Profile Creation...")
    try:
        # Find the user we just created
        user = User.objects.get(email="teststudent3@testuniversity.edu")
        print(f"✓ User found in database: {user.email}")
        
        # Check if student profile was created
        student = Student.objects.get(user_id=user.id)
        print(f"✓ Student profile created: {student.email}")
        print(f"  Student ID: {student.id}")
        print(f"  Institution ID: {student.institution_id}")
        print(f"  Is Verified: {student.is_verified}")
        
    except User.DoesNotExist:
        print("✗ User not found in database")
        return False
    except Student.DoesNotExist:
        print("✗ Student profile not created")
        return False
    
    # Test 3: Verify Institution Affiliation Claim
    print("\n3. Verifying Institution Affiliation Claim...")
    try:
        # Check if affiliation claim was created
        affiliation = StudentInstitutionAffiliation.objects.get(student_id=student.id)
        print(f"✓ Affiliation claim created!")
        print(f"  Affiliation ID: {affiliation.id}")
        print(f"  Institution ID: {affiliation.institution_id}")
        print(f"  Status: {affiliation.status}")
        print(f"  Claimed Via: {affiliation.claimed_via}")
        
        # Get institution details
        institution = Institution.objects.get(id=affiliation.institution_id)
        print(f"  Institution Name: {institution.name}")
        print(f"  Institution Domain: {institution.domain}")
        
    except StudentInstitutionAffiliation.DoesNotExist:
        print("✗ No affiliation claim found")
        return False
    except Institution.DoesNotExist:
        print("✗ Institution not found")
        return False
    
    # Test 4: Test Admin Login and Pending Affiliations
    print("\n4. Testing Admin Access to Pending Affiliations...")
    try:
        # Admin login
        login_data = {
            "email": "admin@testuniversity.edu",
            "password": "testpass123"
        }
        
        login_response = requests.post(
            f"{base_url}/api/auth/users/login/",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access_token')
            print("✓ Admin login successful")
            
            # Test pending affiliations endpoint
            pending_response = requests.get(
                f"{base_url}/api/students/affiliations/pending/",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            print(f"Pending affiliations response status: {pending_response.status_code}")
            if pending_response.status_code == 200:
                pending_data = pending_response.json()
                print(f"✓ Found {len(pending_data.get('pending_affiliations', []))} pending affiliations")
                
                # Look for our test student
                for aff in pending_data.get('pending_affiliations', []):
                    if aff['student_email'] == "teststudent3@testuniversity.edu":
                        print(f"✓ Found our test student's affiliation claim!")
                        print(f"  Affiliation ID: {aff['id']}")
                        break
            else:
                print(f"✗ Failed to fetch pending affiliations: {pending_response.text}")
        else:
            print(f"✗ Admin login failed: {login_response.text}")
            
    except Exception as e:
        print(f"✗ Admin test error: {e}")
    
    print("\n=== Registration Flow Test Completed ===")
    return True

if __name__ == "__main__":
    test_registration_flow()