#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Add the project directory to Python path
sys.path.append('C:\\Users\\bouri\\Documents\\Projects\\Edulink\\Edulink')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserRole
from institutions.models import Institution

User = get_user_model()

def test_institution_dashboard():
    print("Testing Institution Dashboard Functionality...")
    
    # Test data
    base_url = "http://127.0.0.1:8000"
    
    # Find an institution admin user
    try:
        institution_admin = UserRole.objects.filter(
            role='institution_admin',
            institution__isnull=False
        ).first()
        
        if not institution_admin:
            print("❌ No institution admin found. Please create one first.")
            return
            
        user = institution_admin.user
        print(f"✅ Found institution admin: {user.email}")
        print(f"   Institution: {institution_admin.institution.name}")
        
        # Test login endpoint
        login_url = f"{base_url}/api/auth/login/"
        login_data = {
            "email": user.email,
            "password": "testpassword123"  # You may need to adjust this
        }
        
        print(f"\n🔐 Testing login at {login_url}...")
        
        # Get CSRF token first
        session = requests.Session()
        csrf_url = f"{base_url}/api/auth/csrf/"
        csrf_response = session.get(csrf_url)
        
        if csrf_response.status_code == 200:
            csrf_token = csrf_response.json().get('csrfToken')
            print(f"✅ CSRF token obtained: {csrf_token[:20]}...")
            
            # Add CSRF token to headers
            headers = {
                'X-CSRFToken': csrf_token,
                'Content-Type': 'application/json'
            }
            
            # Attempt login
            login_response = session.post(login_url, 
                                        data=json.dumps(login_data), 
                                        headers=headers)
            
            print(f"Login response status: {login_response.status_code}")
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                access_token = login_result.get('access')
                print(f"✅ Login successful! Token: {access_token[:20]}...")
                
                # Test dashboard stats endpoint
                stats_url = f"{base_url}/api/institutions/dashboard/stats/"
                auth_headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                print(f"\n📊 Testing dashboard stats at {stats_url}...")
                stats_response = session.get(stats_url, headers=auth_headers)
                print(f"Stats response status: {stats_response.status_code}")
                
                if stats_response.status_code == 200:
                    stats_data = stats_response.json()
                    print(f"✅ Dashboard stats retrieved successfully:")
                    print(f"   Total Students: {stats_data.get('total_students', 0)}")
                    print(f"   Total Applications: {stats_data.get('total_applications', 0)}")
                    print(f"   Approved Applications: {stats_data.get('approved_applications', 0)}")
                    print(f"   Pending Applications: {stats_data.get('pending_applications', 0)}")
                else:
                    print(f"❌ Failed to get dashboard stats: {stats_response.text}")
                
                # Test recent activity endpoint
                activity_url = f"{base_url}/api/institutions/dashboard/activity/"
                print(f"\n📋 Testing recent activity at {activity_url}...")
                activity_response = session.get(activity_url, headers=auth_headers)
                print(f"Activity response status: {activity_response.status_code}")
                
                if activity_response.status_code == 200:
                    activity_data = activity_response.json()
                    print(f"✅ Recent activity retrieved successfully:")
                    print(f"   Number of activities: {len(activity_data)}")
                    if activity_data:
                        print(f"   Latest activity: {activity_data[0].get('title', 'N/A')}")
                else:
                    print(f"❌ Failed to get recent activity: {activity_response.text}")
                    
            else:
                print(f"❌ Login failed: {login_response.text}")
        else:
            print(f"❌ Failed to get CSRF token: {csrf_response.text}")
            
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_institution_dashboard()