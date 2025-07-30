#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('C:\\Users\\bouri\\Documents\\Projects\\Edulink\\Edulink')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserRole
from institutions.models import Institution
from django.db import transaction

User = get_user_model()

def create_institution_admin():
    print("Creating Institution Admin User...")
    
    try:
        with transaction.atomic():
            # Check if institution admin already exists
            existing_admin = UserRole.objects.filter(
                role='institution',
                institution__isnull=False
            ).first()
            
            if existing_admin:
                print(f"✅ Institution admin already exists: {existing_admin.user.email}")
                print(f"   Institution: {existing_admin.institution.name}")
                return existing_admin
            
            # Create or get an institution
            institution, created = Institution.objects.get_or_create(
                name="Test University",
                defaults={
                    'university_code': 'TEST001',
                    'institution_type': 'University',
                    'email': 'admin@testuniversity.edu',
                    'phone_number': '+1234567890',
                    'website': 'https://testuniversity.edu',
                    'address': 'Test City, Kenya',
                    'is_verified': True
                }
            )
            
            if created:
                print(f"✅ Created new institution: {institution.name}")
            else:
                print(f"✅ Using existing institution: {institution.name}")
            
            # Create or get admin user
            admin_email = "admin@testuniversity.edu"
            admin_user, user_created = User.objects.get_or_create(
                email=admin_email,
                defaults={
                    'role': 'institution_admin',
                    'is_email_verified': True,
                    'is_active': True
                }
            )
            
            if user_created:
                admin_user.set_password('testpassword123')
                admin_user.save()
                print(f"✅ Created new admin user: {admin_email}")
                print(f"   Password: testpassword123")
            else:
                print(f"✅ Using existing admin user: {admin_email}")
                # Update password to ensure it's known
                admin_user.set_password('testpassword123')
                admin_user.save()
                print(f"   Password updated to: testpassword123")
            
            # Create or get user role
            user_role, role_created = UserRole.objects.get_or_create(
                user=admin_user,
                role='institution_admin',
                defaults={
                    'institution': institution
                }
            )
            
            if role_created:
                print(f"✅ Created institution admin role")
            else:
                print(f"✅ Institution admin role already exists")
                # Update institution if needed
                if not user_role.institution:
                    user_role.institution = institution
                    user_role.save()
                    print(f"   Updated role with institution")
            
            print(f"\n🎉 Institution admin setup complete!")
            print(f"   Email: {admin_email}")
            print(f"   Password: testpassword123")
            print(f"   Institution: {institution.name}")
            print(f"   Institution Code: {institution.university_code}")
            
            return user_role
            
    except Exception as e:
        print(f"❌ Error creating institution admin: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    create_institution_admin()