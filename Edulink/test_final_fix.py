#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from application.models import Application
from dashboards.views import DashboardOverviewView
from django.test import RequestFactory

User = get_user_model()

try:
    # Get a user with student profile
    user = User.objects.filter(student_profile__isnull=False).first()
    if not user:
        print("❌ No users with student profiles found")
        exit(1)
    
    print(f"Testing with user: {user}")
    print(f"Student profile: {user.student_profile}")
    print(f"Student profile user field: {user.student_profile.user}")
    print(f"Student profile user_instance property: {user.student_profile.user_instance}")
    
    # Verify the relationship
    assert user.student_profile.user == user, "StudentProfile.user should point back to the User"
    assert user.student_profile.user_instance == user, "StudentProfile.user_instance should return the User"
    
    print("\n✅ User-StudentProfile relationship verified correctly")
    
    # Test Application queries
    print("\nTesting Application queries...")
    
    # Test direct user query
    apps_direct = Application.objects.filter(student=user)
    print(f"✅ Application.objects.filter(student=user): {apps_direct.count()} applications")
    
    # Test via student profile user field
    apps_via_profile = Application.objects.filter(student=user.student_profile.user)
    print(f"✅ Application.objects.filter(student=user.student_profile.user): {apps_via_profile.count()} applications")
    
    # Test via student profile user_instance property
    apps_via_instance = Application.objects.filter(student=user.student_profile.user_instance)
    print(f"✅ Application.objects.filter(student=user.student_profile.user_instance): {apps_via_instance.count()} applications")
    
    # Verify all queries return the same results
    assert apps_direct.count() == apps_via_profile.count() == apps_via_instance.count(), "All queries should return same count"
    
    # Test the dashboard view
    print("\nTesting dashboard view...")
    
    factory = RequestFactory()
    request = factory.get('/api/dashboards/student/')
    request.user = user
    
    view = DashboardOverviewView()
    view.request = request
    
    result = view.get_object()
    print(f"✅ Dashboard view get_object() works: {type(result)}")
    
    print("\n🎉 ALL TESTS PASSED!")
    print("✅ The implementation is correct and ValueError is resolved!")
            
except Exception as e:
    print(f"❌ Exception occurred: {e}")
    print(f"Exception type: {type(e)}")
    import traceback
    traceback.print_exc()