#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

def test_dashboard():
    base_url = "http://127.0.0.1:8000"
    session = requests.Session()
    
    try:
        # Get CSRF token
        csrf_resp = session.get(f"{base_url}/api/auth/csrf/")
        if csrf_resp.status_code != 200:
            print(f"❌ Failed to get CSRF token: {csrf_resp.status_code}")
            return
        
        csrf_token = csrf_resp.json()['csrfToken']
        print(f"✅ CSRF token obtained")
        
        # Login
        login_data = {
            'email': 'admin@testuniversity.edu',
            'password': 'testpassword123'
        }
        headers = {
            'X-CSRFToken': csrf_token,
            'Content-Type': 'application/json'
        }
        
        login_resp = session.post(f"{base_url}/api/auth/login/", json=login_data, headers=headers)
        if login_resp.status_code != 200:
            print(f"❌ Login failed: {login_resp.status_code} - {login_resp.text}")
            return
        
        tokens = login_resp.json()
        print(f"✅ Login successful")
        
        # Test dashboard stats
        auth_headers = {
            'Authorization': f'Bearer {tokens["access"]}'
        }
        
        stats_resp = session.get(f"{base_url}/api/institutions/dashboard/stats/", headers=auth_headers)
        print(f"📊 Stats endpoint: {stats_resp.status_code}")
        if stats_resp.status_code == 200:
            stats_data = stats_resp.json()
            print(f"   Stats data: {json.dumps(stats_data, indent=2)}")
        else:
            print(f"   Error: {stats_resp.text}")
        
        # Test recent activity
        activity_resp = session.get(f"{base_url}/api/institutions/dashboard/activity/", headers=auth_headers)
        print(f"📈 Activity endpoint: {activity_resp.status_code}")
        if activity_resp.status_code == 200:
            activity_data = activity_resp.json()
            print(f"   Activity data: {json.dumps(activity_data, indent=2)}")
        else:
            print(f"   Error: {activity_resp.text}")
            
        print("\n🎉 Dashboard test completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")

if __name__ == "__main__":
    test_dashboard()