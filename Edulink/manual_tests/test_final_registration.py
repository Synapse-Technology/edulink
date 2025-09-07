#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.serializers import UnifiedStudentRegistrationSerializer
from django.test import RequestFactory
import random

def test_registration():
    print("Testing student registration...")
    
    # Generate unique test data
    random_num = random.randint(1000, 9999)
    test_data = {
        "email": f"test{random_num}@example.com",
        "password": "testpass123",
        "password_confirm": "testpass123",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": f"+25471234{random_num}",
        "national_id": f"1234567{random_num}",
        "registration_number": f"TEST-{random_num}/2021",
        "year_of_study": 2,
        "university_code": "EDUJKUAT25-01",
        "registration_method": "university_code"
    }
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.post('/api/auth/register/student/', test_data)
    request.META['REMOTE_ADDR'] = '127.0.0.1'
    
    try:
        # Test serializer validation and save
        serializer = UnifiedStudentRegistrationSerializer(data=test_data, context={'request': request})
        
        if serializer.is_valid():
            print("✅ Serializer validation passed")
            
            # Try to save
            result = serializer.save()
            print(f"✅ SUCCESS: Registration completed successfully!")
            print(f"User: {result.user.email}")
            print(f"Student Profile: {result.first_name} {result.last_name}")
            print(f"Registration Number: {result.registration_number}")
            return True
            
        else:
            print("❌ Serializer validation failed:")
            for field, errors in serializer.errors.items():
                print(f"  {field}: {errors}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR during registration: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_registration()
    sys.exit(0 if success else 1)