#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, date
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.base')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from dashboards.models import PageView
from dashboards.views import EmployerAnalyticsAPIView
from django.test import RequestFactory
from authentication.models import User
from django.utils import timezone

print("Testing Analytics API with real PageView data...")

# Get current PageView counts
today = date.today()
daily_views = PageView.get_daily_views(today)
unique_visitors = PageView.get_unique_daily_visitors(today)

print(f"Current PageView data for {today}:")
print(f"  Daily views: {daily_views}")
print(f"  Unique visitors: {unique_visitors}")

# Create a mock request
factory = RequestFactory()
request = factory.get('/api/analytics/employer/')

# Create a test user for the request
test_user, created = User.objects.get_or_create(
    email='analytics_test@example.com',
    defaults={'is_active': True}
)
request.user = test_user

# Test the analytics view
view = EmployerAnalyticsAPIView()
view.request = request

try:
    response = view.get(request)
    
    print("\n--- Analytics API Response ---")
    print(f"Status Code: {response.status_code}")
    
    # Access the data directly from the response
    response_data = response.data
    
    if 'realTimeActivity' in response_data:
        real_time = response_data['realTimeActivity']
        api_page_views = real_time.get('pageViews', 'N/A')
        api_unique_visitors = real_time.get('uniqueVisitors', 'N/A')
        
        print(f"API Page Views: {api_page_views}")
        print(f"API Unique Visitors: {api_unique_visitors}")
        
        # Verify the data matches
        if api_page_views == daily_views:
            print("✓ Page views match between model and API")
        else:
            print(f"✗ Page views mismatch: Model={daily_views}, API={api_page_views}")
            
        if api_unique_visitors == unique_visitors:
            print("✓ Unique visitors match between model and API")
        else:
            print(f"✗ Unique visitors mismatch: Model={unique_visitors}, API={api_unique_visitors}")
    else:
        print("No realTimeActivity data found in response")
        print(f"Response keys: {list(response_data.keys())}")
        
except Exception as e:
    print(f"Error testing analytics API: {e}")
    import traceback
    traceback.print_exc()

print("\n--- Analytics API test completed ---")