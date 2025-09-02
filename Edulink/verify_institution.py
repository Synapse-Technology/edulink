import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from institutions.models import Institution
from authentication.models import User
from users.models import UserRole

def verify_institution():
    """
    Verify the test institution and admin user were created successfully.
    """
    
    try:
        # Check institution
        institution = Institution.objects.get(email='admin@kenyattauniversity.ac.ke')
        print("=== INSTITUTION DETAILS ===")
        print(f"Name: {institution.name}")
        print(f"Type: {institution.institution_type}")
        print(f"Email: {institution.email}")
        print(f"Phone: {institution.phone_number}")
        print(f"Website: {institution.website}")
        print(f"Address: {institution.address}")
        print(f"Registration Number: {institution.registration_number}")
        print(f"Verified: {institution.is_verified}")
        print(f"Created: {institution.created_at}")
        
        # Check admin user
        try:
            user = User.objects.get(email='admin@kenyattauniversity.ac.ke')
            print("\n=== ADMIN USER DETAILS ===")
            print(f"Email: {user.email}")
            print(f"Institution: {user.institution}")
            print(f"Phone: {user.phone_number}")
            print(f"National ID: {user.national_id}")
            print(f"Active: {user.is_active}")
            print(f"Created: {user.date_joined}")
            
            # Check user role
            try:
                role = UserRole.objects.get(user=user)
                print(f"Role: {role.role}")
            except UserRole.DoesNotExist:
                print("Role: Not found")
            
            print("\n=== LOGIN CREDENTIALS ===")
            print(f"Email: {user.email}")
            print(f"Password: admin123")
            print("\n✅ Institution and admin user created successfully!")
            print("You can now use these credentials to test the institution dashboard.")
                
        except User.DoesNotExist:
            print("❌ Admin user not found")
            
    except Institution.DoesNotExist:
        print("❌ Institution not found")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_institution()