from django.utils import timezone
from institutions.models import Institution
from users.models import UserRole, StudentProfile
from authentication.models import User
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings')
django.setup()


def create_test_user():
    # Create a test institution first
    institution = Institution.objects.create(
        name="Test University",
        institution_type="University",
        registration_number="UNI123456",
        email="contact@testuniversity.edu",
        phone_number="+1234567890",
        website="https://www.testuniversity.edu",
        address="123 University Street, Test City",
        is_verified=True,
        verified_at=timezone.now()
    )

    # Create a test user
    user = User.objects.create_user(
        email="test@example.com",
        password="testpass123",
        institution="Test University",
        phone_number="+1234567890",
        national_id="123456789"
    )

    # Create user role
    UserRole.objects.create(
        user=user,
        role='student'
    )

    # Create student profile
    StudentProfile.objects.create(
        user=user,
        first_name="Test",
        last_name="User",
        phone_number="+1234567890",
        national_id="123456789",
        admission_number="ADM123",
        academic_year=2024,
        institution=institution,
        is_verified=True,
        institution_name="Test University"
    )

    print("Test user created successfully!")
    print("Email: test@example.com")
    print("Password: testpass123")


if __name__ == "__main__":
    create_test_user()
