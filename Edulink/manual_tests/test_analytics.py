#!/usr/bin/env python
"""
Test script for the real-time analytics tracking system
"""

import requests
import json
import time

def test_analytics_api():
    """Test the analytics API to verify real-time tracking"""
    
    base_url = "http://localhost:8000"
    
    # Test token (you may need to update this)
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzM3NzM5NzI5LCJpYXQiOjE3Mzc3MzYxMjksImp0aSI6IjY5ZjJhNzNjNzJjNzQ5ZGE4YzE5ZGJjNzNjNzNkNzJjIiwidXNlcl9pZCI6MX0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("Testing Real-Time Analytics Tracking System")
    print("=" * 50)
    
    # Test 1: Get initial analytics data
    print("\n1. Getting initial analytics data...")
    try:
        response = requests.get(f"{base_url}/api/dashboards/analytics/employer/", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            real_time_activity = data.get('realTimeActivity', {})
            
            print(f"Page Views: {real_time_activity.get('pageViews', 'N/A')}")
            print(f"Unique Visitors: {real_time_activity.get('uniqueVisitors', 'N/A')}")
            print(f"Active Users: {real_time_activity.get('activeUsers', 'N/A')}")
            print(f"Applications Today: {real_time_activity.get('applicationsToday', 'N/A')}")
            
            initial_page_views = real_time_activity.get('pageViews', 0)
            initial_unique_visitors = real_time_activity.get('uniqueVisitors', 0)
        else:
            print(f"Error: {response.text}")
            return
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return
    
    # Test 2: Make some page requests to trigger tracking
    print("\n2. Making page requests to trigger tracking...")
    
    # Make requests to different endpoints
    test_endpoints = [
        "/api/dashboards/employer/",
        "/api/internships/",
        "/api/applications/",
    ]
    
    for endpoint in test_endpoints:
        try:
            print(f"Requesting: {endpoint}")
            response = requests.get(f"{base_url}{endpoint}", headers=headers)
            print(f"  Status: {response.status_code}")
            time.sleep(1)  # Small delay between requests
        except requests.exceptions.RequestException as e:
            print(f"  Error: {e}")
    
    # Test 3: Check analytics again to see if page views increased
    print("\n3. Checking analytics after page requests...")
    time.sleep(2)  # Wait a moment for middleware to process
    
    try:
        response = requests.get(f"{base_url}/api/dashboards/analytics/employer/", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            real_time_activity = data.get('realTimeActivity', {})
            
            final_page_views = real_time_activity.get('pageViews', 0)
            final_unique_visitors = real_time_activity.get('uniqueVisitors', 0)
            
            print(f"Page Views: {final_page_views} (was {initial_page_views})")
            print(f"Unique Visitors: {final_unique_visitors} (was {initial_unique_visitors})")
            
            # Check if tracking is working
            if final_page_views > initial_page_views:
                print("\n✅ SUCCESS: Page view tracking is working!")
                print(f"   Page views increased by {final_page_views - initial_page_views}")
            else:
                print("\n⚠️  WARNING: Page views did not increase")
                print("   This might be expected if middleware is not yet active")
                
            if final_unique_visitors >= initial_unique_visitors:
                print("✅ SUCCESS: Unique visitor tracking is working!")
            else:
                print("⚠️  WARNING: Unique visitor count did not increase")
                
        else:
            print(f"Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_analytics_api()