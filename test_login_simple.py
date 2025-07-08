#!/usr/bin/env python3
"""
Simple test for login endpoint
"""
import requests
import json

def test_login():
    """Test the login endpoint"""
    url = "http://127.0.0.1:8000/api/auth/login/"
    
    # Test data
    data = {
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    print("🔐 Testing login endpoint...")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    print("-" * 50)
    
    try:
        response = requests.post(
            url, 
            json=data, 
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Login successful!")
            print(f"Access Token: {result.get('access', 'N/A')[:50]}...")
            print(f"User Role: {result.get('user', {}).get('role', 'N/A')}")
            print(f"User Email: {result.get('user', {}).get('email', 'N/A')}")
            return True
        else:
            print(f"\n❌ Login failed with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django server is running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing EduLink Login Endpoint")
    print("=" * 50)
    
    # First, let's check if the server is running
    try:
        response = requests.get("http://127.0.0.1:8000/")
        print("✅ Server is running")
    except:
        print("❌ Server is not running. Please start Django server first:")
        print("   cd Edulink")
        print("   python manage.py runserver 8000")
        exit(1)
    
    # Test login
    success = test_login()
    
    if success:
        print("\n🎉 Login test completed successfully!")
        print("You can now test the frontend login page.")
    else:
        print("\n💡 Troubleshooting tips:")
        print("1. Make sure Django server is running")
        print("2. Check if test user exists (run create_test_user.py)")
        print("3. Verify the login endpoint URL is correct")
        print("4. Check Django logs for any errors") 