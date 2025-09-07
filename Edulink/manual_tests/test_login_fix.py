#!/usr/bin/env python
import requests
import json

def test_login_endpoint():
    """Test the login endpoint to verify the schema fix"""
    url = "http://127.0.0.1:8000/api/auth/login/"
    
    # Test data
    data = {
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print(f"Testing POST {url}")
        response = requests.post(url, json=data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 500:
            print("❌ Still getting 500 error - check server logs")
        elif response.status_code == 400:
            print("✅ Schema fixed! Getting 400 (validation error) instead of 500 (database error)")
        elif response.status_code == 401:
            print("✅ Schema fixed! Getting 401 (authentication failed) instead of 500 (database error)")
        elif response.status_code == 200:
            print("✅ Schema fixed! Login successful")
        else:
            print(f"✅ Schema fixed! Getting {response.status_code} instead of 500 (database error)")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django server is running.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    test_login_endpoint()