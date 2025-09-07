#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from authentication.models import User

def test_analytics_api_call():
    """Test the analytics API call as the frontend would make it"""
    print("=== Testing Analytics API Call ===")
    
    # Create or get a test user
    try:
        user = User.objects.filter(email='test@example.com').first()
        if not user:
            user = User.objects.create_user(
                email='test@example.com',
                password='testpass123',
                is_active=True
            )
        print(f"Using user: {user.email}")
    except Exception as e:
        print(f"Error creating/getting user: {e}")
        return
    
    # Test with API client (simulates frontend request)
    client = APIClient()
    
    # Generate JWT token
    try:
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        print(f"Generated token: {access_token[:20]}...")
        
        # Set authorization header
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Make the API call
        response = client.get('/api/dashboards/analytics/employer/')
        
        print(f"\nAPI Response Status: {response.status_code}")
        print(f"API Response Data: {json.dumps(response.data, indent=2)}")
        
        # Check if it's using fallback data
        applications_today = response.data.get('realTimeActivity', {}).get('applicationsToday', 'N/A')
        if applications_today == 8:
            print("\n⚠️  ISSUE IDENTIFIED:")
            print("- The API is returning hardcoded fallback value of 8")
            print("- This suggests an exception is being caught in the view")
            print("- The frontend is seeing this fallback data, not real data")
        elif applications_today == 0:
            print("\n✅ API is working correctly:")
            print("- Returning real data (0 applications today)")
            print("- Frontend issue might be caching or different endpoint")
        
    except Exception as e:
        print(f"Error making API call: {e}")
    
    # Test without authentication to see if that triggers fallback
    print("\n=== Testing without authentication ===")
    client_no_auth = APIClient()
    try:
        response_no_auth = client_no_auth.get('/api/dashboards/analytics/employer/')
        print(f"No auth response status: {response_no_auth.status_code}")
        if response_no_auth.status_code == 200:
            print(f"No auth response data: {json.dumps(response_no_auth.data, indent=2)}")
    except Exception as e:
        print(f"Error with no auth call: {e}")

if __name__ == '__main__':
    test_analytics_api_call()