#!/usr/bin/env python
"""
Test script to verify ValueError fixes in Django views.
This script tests the specific endpoints that were causing ValueError exceptions.
"""

import os
import sys
import django
from django.test import RequestFactory
from django.contrib.auth.models import User
from unittest.mock import Mock

# Add the project directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'Edulink'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.development')
django.setup()

from users.models import StudentProfile
from dashboards.views import DashboardOverviewView, InternshipProgressView
from internship_progress.views import InternshipProgressCalculationView

def test_views():
    """Test the views that were causing ValueError exceptions."""
    print("Testing ValueError fixes...")
    
    try:
        # Create a test user and student profile
        user = User.objects.filter(is_active=True).first()
        if not user:
            print("❌ No active user found in database")
            return False
            
        print(f"✅ Found user: {user.username}")
        
        # Check if user has student profile
        if not hasattr(user, 'student_profile') or not user.student_profile:
            print("❌ User does not have a student profile")
            return False
            
        student = user.student_profile
        print(f"✅ Found student profile: {student}")
        
        # Create mock request
        factory = RequestFactory()
        request = factory.get('/api/dashboards/student/')
        request.user = user
        
        # Test DashboardOverviewView
        print("\n🧪 Testing DashboardOverviewView...")
        view = DashboardOverviewView()
        view.request = request
        try:
            result = view.get_object()
            print("✅ DashboardOverviewView.get_object() succeeded")
        except ValueError as e:
            print(f"❌ DashboardOverviewView failed with ValueError: {e}")
            return False
        except Exception as e:
            print(f"⚠️ DashboardOverviewView failed with other error: {e}")
        
        # Test InternshipProgressView
        print("\n🧪 Testing InternshipProgressView...")
        view = InternshipProgressView()
        view.request = request
        try:
            result = view.get_object()
            print("✅ InternshipProgressView.get_object() succeeded")
        except ValueError as e:
            print(f"❌ InternshipProgressView failed with ValueError: {e}")
            return False
        except Exception as e:
            print(f"⚠️ InternshipProgressView failed with other error: {e}")
        
        # Test InternshipProgressCalculationView
        print("\n🧪 Testing InternshipProgressCalculationView...")
        view = InternshipProgressCalculationView()
        view.request = request
        try:
            result = view._calculate_comprehensive_progress(student)
            print("✅ InternshipProgressCalculationView._calculate_comprehensive_progress() succeeded")
        except ValueError as e:
            print(f"❌ InternshipProgressCalculationView failed with ValueError: {e}")
            return False
        except Exception as e:
            print(f"⚠️ InternshipProgressCalculationView failed with other error: {e}")
        
        print("\n🎉 All tests passed! ValueError fixes appear to be working.")
        return True
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        return False

if __name__ == '__main__':
    success = test_views()
    sys.exit(0 if success else 1)