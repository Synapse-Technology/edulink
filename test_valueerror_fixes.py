#!/usr/bin/env python
"""
Simple test to verify ValueError fixes are working.
"""

import requests
import json

# Configuration
BASE_URL = "http://127.0.0.1:8000"

def test_server_health():
    """Test if server is responding"""
    try:
        response = requests.get(f"{BASE_URL}/admin/", timeout=3)
        print(f"✅ Server is responding (status: {response.status_code})")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Server not responding: {e}")
        return False

def test_login():
    """Test login functionality"""
    login_data = {
        "email": "carol.obuyah@student.jkuat.ac.ke",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login/", data=login_data, timeout=10)
        if response.status_code == 200:
            data = response.json()
            token = data.get('access')
            print(f"✅ Login successful, token: {token[:20] if token else 'None'}...")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Login request failed: {e}")
        return None

def test_endpoint_simple(url, token, name):
    """Test endpoint with simple error checking"""
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ {name}: SUCCESS")
            return True
        elif response.status_code == 500:
            # Check if it's a ValueError
            try:
                error_text = response.text
                if 'Must be' in error_text and 'instance' in error_text:
                    print(f"❌ {name}: ValueError still present")
                else:
                    print(f"❌ {name}: 500 error (not ValueError)")
            except:
                print(f"❌ {name}: 500 error")
            return False
        else:
            print(f"⚠️  {name}: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ {name}: Request failed - {e}")
        return False

def main():
    print("Testing ValueError fixes...")
    print("=" * 40)
    
    # Test server health
    if not test_server_health():
        print("Cannot proceed - server not responding")
        return
    
    # Test login
    print("\nTesting login...")
    token = test_login()
    if not token:
        print("Cannot proceed without token")
        return
    
    # Test key endpoints
    print("\nTesting endpoints...")
    endpoints = [
        (f"{BASE_URL}/api/dashboards/student/", "Student Dashboard"),
        (f"{BASE_URL}/api/internships/", "Internships List"),
        (f"{BASE_URL}/api/users/student/profile/", "Student Profile"),
    ]
    
    results = []
    for url, name in endpoints:
        success = test_endpoint_simple(url, token, name)
        results.append(success)
    
    success_count = sum(results)
    print(f"\nResults: {success_count}/{len(results)} endpoints working")
    
    if success_count == len(results):
        print("🎉 All tested endpoints are working!")
    else:
        print("⚠️  Some issues remain")

if __name__ == "__main__":
    main()