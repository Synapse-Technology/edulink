#!/usr/bin/env python3
"""
Debug script to test all backend URLs used in the student dashboard
and identify which endpoints are causing 500 errors.
"""

import os
import django
import requests
import json
from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.development')
django.setup()

User = get_user_model()

def create_test_user_with_profile():
    """Create a test user with student profile"""
    from users.models.student_profile import StudentProfile
    from institutions.models import Institution
    
    # Create or get test user
    user, created = User.objects.get_or_create(
        email='debug_dashboard@test.com',
        defaults={
            'role': 'student',
            'is_active': True,
            'is_email_verified': True
        }
    )
    
    if created:
        user.set_password('Test123!')
        user.save()
    
    # Create student profile if it doesn't exist
    if not hasattr(user, 'student_profile') or not user.student_profile:
        # Get or create a test institution
        institution, _ = Institution.objects.get_or_create(
            name='Test University',
            defaults={
                'code': 'TEST',
                'is_verified': True,
                'country': 'Kenya'
            }
        )
        
        StudentProfile.objects.create(
            user=user,
            first_name='Debug',
            last_name='User',
            phone_number='+254712345678',
            registration_number='DEBUG/001',
            year_of_study=2,
            national_id='DEBUG001',
            institution=institution
        )
        print(f"Created student profile for user: {user.email}")
    
    return user

def create_test_user_without_profile():
    """Create a test user without student profile"""
    user, created = User.objects.get_or_create(
        email='debug_no_profile@test.com',
        defaults={
            'role': 'student',
            'is_active': True,
            'is_email_verified': True
        }
    )
    
    if created:
        user.set_password('Test123!')
        user.save()
    
    # Ensure no student profile exists
    if hasattr(user, 'student_profile') and user.student_profile:
        user.student_profile.delete()
        print(f"Removed student profile for user: {user.email}")
    
    return user

def get_jwt_token(user):
    """Get JWT token for user"""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)

def test_dashboard_endpoints():
    """Test all dashboard endpoints mentioned in student_dash.html"""
    
    # Dashboard URLs from the frontend
    dashboard_urls = [
        '/api/dashboards/student/',
        '/api/dashboards/progress/',
        '/api/dashboards/analytics/',
        '/api/dashboards/achievements/',
        '/api/dashboards/calendar-events/',
        '/api/dashboards/insights/',
        '/api/dashboards/overview/',
    ]
    
    print("=" * 60)
    print("TESTING DASHBOARD ENDPOINTS")
    print("=" * 60)
    
    # Test with user that has student profile
    print("\n1. Testing with user that HAS student profile:")
    print("-" * 50)
    
    user_with_profile = create_test_user_with_profile()
    token_with_profile = get_jwt_token(user_with_profile)
    
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_with_profile}')
    
    for url in dashboard_urls:
        try:
            response = client.get(url)
            status_code = response.status_code
            
            if status_code == 200:
                print(f"✅ {url} - Status: {status_code} (OK)")
            elif status_code == 404:
                print(f"⚠️  {url} - Status: {status_code} (Not Found - URL might not exist)")
            elif status_code == 500:
                print(f"❌ {url} - Status: {status_code} (INTERNAL SERVER ERROR)")
                print(f"   Error: {response.data if hasattr(response, 'data') else 'No error details'}")
            else:
                print(f"⚠️  {url} - Status: {status_code}")
                
        except Exception as e:
            print(f"❌ {url} - Exception: {str(e)}")
    
    # Test with user that doesn't have student profile
    print("\n2. Testing with user that DOES NOT have student profile:")
    print("-" * 50)
    
    user_without_profile = create_test_user_without_profile()
    token_without_profile = get_jwt_token(user_without_profile)
    
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_without_profile}')
    
    for url in dashboard_urls:
        try:
            response = client.get(url)
            status_code = response.status_code
            
            if status_code == 200:
                print(f"✅ {url} - Status: {status_code} (OK)")
            elif status_code == 400:
                print(f"✅ {url} - Status: {status_code} (Bad Request - Expected for missing profile)")
                print(f"   Response: {response.data if hasattr(response, 'data') else 'No response data'}")
            elif status_code == 404:
                print(f"⚠️  {url} - Status: {status_code} (Not Found - URL might not exist)")
            elif status_code == 500:
                print(f"❌ {url} - Status: {status_code} (INTERNAL SERVER ERROR - NEEDS FIXING)")
                print(f"   Error: {response.data if hasattr(response, 'data') else 'No error details'}")
            else:
                print(f"⚠️  {url} - Status: {status_code}")
                
        except Exception as e:
            print(f"❌ {url} - Exception: {str(e)}")
    
    # Test specific calendar event endpoints
    print("\n3. Testing Calendar Event specific endpoints:")
    print("-" * 50)
    
    calendar_endpoints = [
        '/api/dashboards/calendar-events/upcoming/',
        '/api/dashboards/calendar-events/overdue/',
    ]
    
    # Test with user without profile (should cause 500 if not fixed)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_without_profile}')
    
    for url in calendar_endpoints:
        try:
            response = client.get(url)
            status_code = response.status_code
            
            if status_code == 200:
                print(f"✅ {url} - Status: {status_code} (OK)")
            elif status_code == 400:
                print(f"✅ {url} - Status: {status_code} (Bad Request - Expected for missing profile)")
            elif status_code == 500:
                print(f"❌ {url} - Status: {status_code} (INTERNAL SERVER ERROR - NEEDS FIXING)")
            else:
                print(f"⚠️  {url} - Status: {status_code}")
                
        except Exception as e:
            print(f"❌ {url} - Exception: {str(e)}")

def test_direct_view_access():
    """Test direct access to dashboard views"""
    print("\n" + "=" * 60)
    print("TESTING DIRECT VIEW ACCESS")
    print("=" * 60)
    
    from dashboards.views import (
        StudentDashboardAPIView, DashboardOverviewView, InternshipProgressView,
        ProgressUpdateView, StudentAchievementView, AnalyticsEventView,
        CalendarEventViewSet, DashboardInsightView
    )
    from django.test import RequestFactory
    from rest_framework.request import Request
    
    factory = RequestFactory()
    
    # Test with user without student profile
    user_without_profile = create_test_user_without_profile()
    
    views_to_test = [
        ('StudentDashboardAPIView', StudentDashboardAPIView),
        ('DashboardOverviewView', DashboardOverviewView),
        ('InternshipProgressView', InternshipProgressView),
        ('ProgressUpdateView', ProgressUpdateView),
        ('StudentAchievementView', StudentAchievementView),
        ('DashboardInsightView', DashboardInsightView),
    ]
    
    for view_name, view_class in views_to_test:
        try:
            request = factory.get('/')
            request.user = user_without_profile
            
            view = view_class()
            view.request = Request(request)
            
            # Try to call get_object or get_queryset
            if hasattr(view, 'get_object'):
                result = view.get_object()
                print(f"✅ {view_name}.get_object() - Success")
            elif hasattr(view, 'get_queryset'):
                result = view.get_queryset()
                print(f"✅ {view_name}.get_queryset() - Success")
            else:
                print(f"⚠️  {view_name} - No get_object or get_queryset method")
                
        except Exception as e:
            if "student profile" in str(e).lower():
                print(f"✅ {view_name} - Properly handles missing profile: {str(e)}")
            else:
                print(f"❌ {view_name} - Unexpected error: {str(e)}")

if __name__ == '__main__':
    print("Dashboard URL Debug Script")
    print("This script tests all backend URLs used in the student dashboard")
    print("to identify which endpoints are causing 500 errors.\n")
    
    try:
        test_dashboard_endpoints()
        test_direct_view_access()
        
        print("\n" + "=" * 60)
        print("DEBUG SUMMARY")
        print("=" * 60)
        print("✅ = Working correctly")
        print("⚠️  = Warning (might be expected behavior)")
        print("❌ = Error that needs fixing")
        print("\nIf you see 500 errors, those endpoints need the student_profile")
        print("validation fix applied to prevent AttributeError.")
        
    except Exception as e:
        print(f"Script failed with error: {str(e)}")
        import traceback
        traceback.print_exc()