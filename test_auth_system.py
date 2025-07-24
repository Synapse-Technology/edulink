#!/usr/bin/env python3
"""
Test script for the EduLink authentication system.
This script helps test the frontend-backend connection.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api"

def test_server_connection():
    """Test if the Django server is running"""
    try:
        response = requests.get(f"{BASE_URL}/api/", timeout=5)
        print("✅ Server is running")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start the Django server with:")
        print("   cd Edulink && python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return False

def test_registration():
    """Test user registration"""
    print("\n📝 Testing Registration...")
    
    registration_data = {
        "email": "teststudent@example.com",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "Student",
        "phone_number": "+254700000000",
        "national_id": "12345678",
        "registration_number": "TEST123456",
        "academic_year": 3,
        "institution_name": "Kenyatta University"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/register/",
            json=registration_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            print("✅ Registration successful!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   Response: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return False

def test_login():
    """Test user login"""
    print("\n🔐 Testing Login...")
    
    login_data = {
        "email": "teststudent@example.com",
        "password": "TestPass123!"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login/",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"   Access Token: {data['access'][:50]}...")
            print(f"   User Role: {data['user']['role']}")
            print(f"   User Email: {data['user']['email']}")
            if data['user']['profile']:
                print(f"   User Name: {data['user']['profile']['first_name']} {data['user']['profile']['last_name']}")
            
            # Save tokens for further testing
            with open("test_tokens.json", "w") as f:
                json.dump({
                    "access": data["access"],
                    "refresh": data["refresh"],
                    "user": data["user"]
                }, f, indent=2)
            print("   Tokens saved to test_tokens.json")
            return data
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.json()}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_protected_endpoint():
    """Test accessing a protected endpoint"""
    print("\n🔒 Testing Protected Endpoint...")
    
    try:
        # Load tokens
        with open("test_tokens.json", "r") as f:
            tokens = json.load(f)
        
        headers = {
            "Authorization": f"Bearer {tokens['access']}",
            "Content-Type": "application/json"
        }
        
        # Test a protected endpoint (you can change this to any protected endpoint)
        response = requests.get(
            f"{API_BASE}/users/profile/",
            headers=headers
        )
        
        if response.status_code == 200:
            print("✅ Protected endpoint access successful!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Protected endpoint access failed: {response.status_code}")
            print(f"   Response: {response.json()}")
            return False
            
    except FileNotFoundError:
        print("❌ No tokens found. Please run login test first.")
        return False
    except Exception as e:
        print(f"❌ Protected endpoint error: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 EduLink Authentication System Test")
    print("=" * 50)
    
    # Test server connection
    if not test_server_connection():
        sys.exit(1)
    
    # Test registration
    registration_success = test_registration()
    
    # Test login
    login_result = test_login()
    
    if login_result:
        # Test protected endpoint
        test_protected_endpoint()
    
    print("\n" + "=" * 50)
    print("🎯 Frontend Testing Instructions:")
    print("1. Open Edulink_website/login.html in your browser")
    print("2. Use these credentials to test:")
    print("   Email: teststudent@example.com")
    print("   Password: TestPass123!")
    print("3. After successful login, you should be redirected to the student dashboard")
    print("4. Check the browser console for any errors")
    print("5. Verify that user data is displayed correctly in the dashboard")

if __name__ == "__main__":
    main() 