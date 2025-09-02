import os
import django
from django.utils import timezone

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from institutions.models import Institution
from users.models import UserRole
from users.models.institution_profile import InstitutionProfile
from authentication.models import User


def create_test_institution():
    """
    Create a test institution with an admin user for testing the institution dashboard.
    """
    
    # Check if institution already exists
    institution_email = "admin@kenyattauniversity.ac.ke"
    if Institution.objects.filter(email=institution_email).exists():
        print(f"Institution with email {institution_email} already exists!")
        institution = Institution.objects.get(email=institution_email)
        print(f"Existing institution: {institution.name}")
        return
    
    # Create the institution
    institution = Institution.objects.create(
        name="Kenyatta University",
        institution_type="University",
        email=institution_email,
        phone_number="+254-20-8710901",
        website="https://www.ku.ac.ke",
        address="43844-00100, Nairobi, Kenya",
        registration_number="KU-REG-001",
        is_verified=True
    )
    
    print(f"Created institution: {institution.name}")
    
    # Check if admin user already exists
    admin_email = "admin@kenyattauniversity.ac.ke"
    if User.objects.filter(email=admin_email).exists():
        print(f"Admin user with email {admin_email} already exists!")
        return
    
    # Create admin user for the institution
    admin_user = User.objects.create_user(
        email=admin_email,
        password="admin123",
        institution="Kenyatta University",
        phone_number="+254-20-8710901",
        national_id="12345678"
    )
    
    print(f"Created admin user: {admin_user.email}")
    
    # Create user role for institution admin
    UserRole.objects.create(
        user=admin_user,
        role='institution_admin'
    )
    
    print("Created institution admin role")
    
    # Create institution profile for the admin
    institution_profile = InstitutionProfile.objects.create(
        user=admin_user,
        institution=institution,
        first_name="John",
        last_name="Doe",
        phone_number="+254-20-8710902",  # Different from user phone to avoid conflicts
        position="Registrar"
    )
    
    print(f"Created institution profile for: {institution_profile.first_name} {institution_profile.last_name}")
    
    print("\n=== Test Institution Created Successfully! ===")
    print(f"Institution: {institution.name}")
    print(f"Type: {institution.institution_type}")
    print(f"Email: {institution.email}")
    print(f"Registration Number: {institution.registration_number}")
    print(f"Verified: {institution.is_verified}")
    print("\n=== Admin Login Credentials ===")
    print(f"Email: {admin_user.email}")
    print(f"Password: admin123")
    print(f"Role: Institution Admin")
    print(f"Position: {institution_profile.position}")
    print("\nYou can now use these credentials to test the institution dashboard!")


if __name__ == "__main__":
    create_test_institution()