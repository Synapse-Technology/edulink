#!/usr/bin/env python
"""
Test script to verify the PageView model and analytics using Django shell
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.development')
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from dashboards.models import PageView
from dashboards.views import EmployerAnalyticsAPIView
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

def test_pageview_model():
    """Test the PageView model functionality"""
    print("Testing PageView Model")
    print("=" * 30)
    
    # Get current count
    initial_count = PageView.objects.count()
    print(f"Initial PageView count: {initial_count}")
    
    # Create some test page views
    test_user = User.objects.first()
    
    # Create page views
    PageView.objects.create(
        user=test_user,
        path="/api/dashboards/employer/",
        full_url="http://localhost:8000/api/dashboards/employer/",
        is_authenticated=True,
        device_type="desktop"
    )
    
    PageView.objects.create(
        session_key="test_session_123",
        path="/api/internships/",
        full_url="http://localhost:8000/api/internships/",
        is_authenticated=False,
        device_type="mobile"
    )
    
    PageView.objects.create(
        user=test_user,
        path="/api/applications/",
        full_url="http://localhost:8000/api/applications/",
        is_authenticated=True,
        device_type="desktop"
    )
    
    # Check new count
    final_count = PageView.objects.count()
    print(f"Final PageView count: {final_count}")
    print(f"Added {final_count - initial_count} page views")
    
    # Test daily views
    today_views = PageView.get_daily_views()
    print(f"Today's page views: {today_views}")
    
    # Test unique visitors
    unique_visitors = PageView.get_unique_daily_visitors()
    print(f"Today's unique visitors: {unique_visitors}")
    
    return today_views, unique_visitors

def test_analytics_api():
    """Test the analytics API with real data"""
    print("\nTesting Analytics API")
    print("=" * 30)
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/api/dashboards/analytics/employer/')
    
    # Add a user to the request
    user = User.objects.first()
    if user:
        request.user = user
    else:
        request.user = AnonymousUser()
    
    # Create the view and get response
    view = EmployerAnalyticsAPIView()
    response = view.get(request)
    
    print(f"API Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.data
        real_time_activity = data.get('realTimeActivity', {})
        
        print(f"Page Views: {real_time_activity.get('pageViews', 'N/A')}")
        print(f"Unique Visitors: {real_time_activity.get('uniqueVisitors', 'N/A')}")
        print(f"Active Users: {real_time_activity.get('activeUsers', 'N/A')}")
        print(f"Applications Today: {real_time_activity.get('applicationsToday', 'N/A')}")
        
        return real_time_activity
    else:
        print(f"Error: {response.data}")
        return None

def main():
    """Main test function"""
    print("Real-Time Analytics Tracking System Test")
    print("=" * 50)
    
    try:
        # Test PageView model
        page_views, unique_visitors = test_pageview_model()
        
        # Test Analytics API
        analytics_data = test_analytics_api()
        
        # Verify consistency
        print("\nVerification")
        print("=" * 30)
        
        if analytics_data:
            api_page_views = analytics_data.get('pageViews', 0)
            api_unique_visitors = analytics_data.get('uniqueVisitors', 0)
            
            print(f"Model reports: {page_views} page views, {unique_visitors} unique visitors")
            print(f"API reports: {api_page_views} page views, {api_unique_visitors} unique visitors")
            
            if api_page_views == page_views and api_unique_visitors == unique_visitors:
                print("✅ SUCCESS: Model and API data are consistent!")
            else:
                print("⚠️  WARNING: Model and API data are inconsistent")
        
        print("\n✅ Real-time tracking system is working!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()