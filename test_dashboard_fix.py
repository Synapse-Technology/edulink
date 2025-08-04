#!/usr/bin/env python
"""
Test script to verify the dashboard API fix for the ValueError issue.
"""

import requests
import json

def login_and_get_token(email, password):
    """Login and get authentication token"""
    login_url = "http://127.0.0.1:8000/api/auth/login/"
    login_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(login_url, json=login_data)
        print(f"Login Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access')
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_dashboard_endpoints(token):
    """Test dashboard endpoints with authentication"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    endpoints = [
        "/api/dashboards/student/",
        "/api/dashboards/progress/",
        "/api/internship-progress/progress/"
    ]
    
    results = {}
    
    for endpoint in endpoints:
        url = f"http://127.0.0.1:8000{endpoint}"
        try:
            response = requests.get(url, headers=headers)
            results[endpoint] = {
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "error": None if response.status_code == 200 else response.text[:200]
            }
            print(f"✓ {endpoint}: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  Error: {response.text[:200]}")
                
        except Exception as e:
            results[endpoint] = {
                "status_code": None,
                "success": False,
                "error": str(e)
            }
            print(f"✗ {endpoint}: Exception - {e}")
    
    return results

def main():
    print("Testing Dashboard API Fix...")
    print("=" * 50)
    
    # Test with the known user
    email = "obuyahcarol1@gmail.com"
    password = "Test123!"
    
    print(f"Logging in as: {email}")
    token = login_and_get_token(email, password)
    
    if not token:
        print("❌ Failed to get authentication token")
        return
    
    print("✅ Successfully obtained authentication token")
    print("\nTesting dashboard endpoints...")
    
    results = test_dashboard_endpoints(token)
    
    print("\n" + "=" * 50)
    print("SUMMARY:")
    
    all_success = True
    for endpoint, result in results.items():
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"{status} {endpoint} - Status: {result['status_code']}")
        if not result["success"]:
            all_success = False
    
    if all_success:
        print("\n🎉 All dashboard endpoints are working correctly!")
        print("The ValueError issue has been resolved.")
    else:
        print("\n⚠️  Some endpoints still have issues.")
        print("Check the error messages above for details.")

if __name__ == "__main__":
    main()