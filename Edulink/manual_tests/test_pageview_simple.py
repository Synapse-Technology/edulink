#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.base')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from dashboards.models import PageView
from authentication.models import User
from django.utils import timezone

print("Testing PageView model functionality...")

# Create a test user if it doesn't exist
test_user, created = User.objects.get_or_create(
    email='test@example.com',
    defaults={'is_active': True}
)
if created:
    print("Created test user")
else:
    print("Using existing test user")

# Create some test PageView records
today = date.today()
print(f"Creating PageView records for {today}")

# Clear existing test data for today
PageView.objects.filter(timestamp__date=today).delete()
print("Cleared existing PageView records for today")

# Create test page views
test_views = [
    {
        'user': test_user,
        'session_key': 'test_session_1',
        'ip_address': '127.0.0.1',
        'user_agent': 'Test Browser 1.0',
        'path': '/dashboard/',
        'full_url': 'http://localhost:8000/dashboard/',
        'is_authenticated': True,
        'device_type': 'desktop'
    },
    {
        'user': None,
        'session_key': 'test_session_2',
        'ip_address': '127.0.0.2',
        'user_agent': 'Test Browser 2.0',
        'path': '/internships/',
        'full_url': 'http://localhost:8000/internships/',
        'is_authenticated': False,
        'device_type': 'mobile'
    },
    {
        'user': test_user,
        'session_key': 'test_session_1',
        'ip_address': '127.0.0.1',
        'user_agent': 'Test Browser 1.0',
        'path': '/profile/',
        'full_url': 'http://localhost:8000/profile/',
        'is_authenticated': True,
        'device_type': 'desktop'
    }
]

for view_data in test_views:
    PageView.objects.create(**view_data)
    print(f"Created PageView: {view_data['path']}")

# Test the model methods
print("\n--- Testing PageView model methods ---")

daily_views = PageView.get_daily_views(today)
print(f"Daily views for {today}: {daily_views}")

unique_visitors = PageView.get_unique_daily_visitors(today)
print(f"Unique daily visitors for {today}: {unique_visitors}")

# Test total counts
total_views = PageView.objects.count()
print(f"Total PageView records: {total_views}")

# Test filtering by authenticated users
auth_views = PageView.objects.filter(is_authenticated=True).count()
print(f"Views by authenticated users: {auth_views}")

# Test device type breakdown
desktop_views = PageView.objects.filter(device_type='desktop').count()
mobile_views = PageView.objects.filter(device_type='mobile').count()
print(f"Desktop views: {desktop_views}, Mobile views: {mobile_views}")

print("\n--- PageView model test completed successfully! ---")