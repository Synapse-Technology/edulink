import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.serializers import UnifiedStudentRegistrationSerializer
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

test_data = {
    'email': 'debug@test.com',
    'password': 'Test123!',
    'password_confirm': 'Test123!',
    'first_name': 'Test',
    'last_name': 'User',
    'phone_number': '+254712345678',
    'national_id': '99999999',
    'university_code': 'EDUJKUAT25-01',
    'registration_number': 'TEST-001/2021',
    'year_of_study': 3,
    'registration_method': 'university_code'
}

print("Testing registration...")
serializer = UnifiedStudentRegistrationSerializer(data=test_data)
if serializer.is_valid():
    try:
        user = serializer.save()
        print(f"Success: {user}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print(f"Validation errors: {serializer.errors}")