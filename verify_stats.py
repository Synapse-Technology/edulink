
import os
import django
import sys

sys.path.append(r'c:\Users\bouri\Documents\Projects\Edulink')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edulink.settings')
django.setup()

from django.contrib.auth import get_user_model
from edulink.apps.institutions.models import Institution
from edulink.apps.platform_admin.models import PlatformStaffProfile, StaffInvite
from edulink.apps.platform_admin import queries

User = get_user_model()

print("--- DB Counts ---")
print(f"Total Users: {User.objects.count()}")
print(f"Total Institutions: {Institution.objects.count()}")
print(f"Total Staff: {PlatformStaffProfile.objects.count()}")
print(f"Active Staff: {PlatformStaffProfile.objects.filter(is_active=True).count()}")
print(f"Pending Invites: {StaffInvite.objects.filter(is_accepted=False).count()}")

print("\n--- Queries Function ---")
try:
    analytics = queries.get_system_analytics()
    print(f"Analytics: {analytics}")
except Exception as e:
    print(f"Error in queries.get_system_analytics: {e}")
