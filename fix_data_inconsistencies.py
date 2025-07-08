#!/usr/bin/env python3
"""
Fix data inconsistencies between User and StudentProfile models
"""
import os
import sys
import django

# Add the Django project to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'Edulink'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.models import User
from users.models import StudentProfile
from django.db import transaction

def fix_data_inconsistencies():
    """Fix data inconsistencies between User and StudentProfile models"""
    print("🔧 Fixing data inconsistencies...")
    
    try:
        with transaction.atomic():
            # Get all users with student role
            student_users = User.objects.filter(role='student')
            
            for user in student_users:
                print(f"Processing user: {user.email}")
                
                try:
                    # Get the student profile
                    student_profile = user.student_profile
                    
                    # Update User model with data from StudentProfile
                    user.phone_number = student_profile.phone_number
                    user.national_id = student_profile.national_id
                    user.institution = student_profile.institution_name
                    user.is_email_verified = True  # Set to True for existing users
                    user.save()
                    
                    # Update StudentProfile verification status
                    student_profile.email_verified = True
                    if student_profile.institution and student_profile.institution.is_verified:
                        student_profile.is_verified = True
                    student_profile.save()
                    
                    print(f"✅ Fixed data for user: {user.email}")
                    
                except StudentProfile.DoesNotExist:
                    print(f"❌ No student profile found for user: {user.email}")
                    continue
                except Exception as e:
                    print(f"❌ Error fixing user {user.email}: {e}")
                    continue
            
            print("✅ Data consistency fix completed!")
            
    except Exception as e:
        print(f"❌ Error during data fix: {e}")

def create_test_user_with_correct_data():
    """Create a test user with correct data structure"""
    print("👤 Creating test user with correct data structure...")
    
    try:
        with transaction.atomic():
            from institutions.models import Institution
            from django.utils import timezone
            
            # Create or get test institution
            institution, created = Institution.objects.get_or_create(
                name="Test University",
                defaults={
                    "institution_type": "University",
                    "registration_number": "UNI123456",
                    "email": "contact@testuniversity.edu",
                    "phone_number": "+1234567890",
                    "website": "https://www.testuniversity.edu",
                    "address": "123 University Street, Test City",
                    "is_verified": True,
                    "verified_at": timezone.now()
                }
            )
            
            # Delete existing test user if exists
            User.objects.filter(email="test@example.com").delete()
            
            # Create user with correct data
            user = User.objects.create_user(
                email="test@example.com",
                password="testpass123",
                role="student",
                phone_number="+1234567890",
                national_id="123456788",
                institution="Kenyatta University",
                is_email_verified=True,
            )
            
            # Create student profile with correct data
            student_profile = StudentProfile.objects.create(
                user=user,
                first_name="Test",
                last_name="Student",
                phone_number="+1234567890",
                national_id="123456789",
                registration_number="ADM123",
                academic_year=2024,
                institution=institution,
                institution_name="Kenyatta University",
                year_of_study=2024,
                is_verified=True,  # Institution is verified
                email_verified=True,
            )
            
            print("✅ Test user created with correct data structure!")
            print(f"Email: test@example.com")
            print(f"Password: testpass123")
            print(f"User is_email_verified: {user.is_email_verified}")
            print(f"Profile is_verified: {student_profile.is_verified}")
            print(f"Profile email_verified: {student_profile.email_verified}")
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")

if __name__ == "__main__":
    print("🚀 EduLink Data Consistency Fix")
    print("=" * 50)
    
    # Fix existing data
    fix_data_inconsistencies()
    
    print("\n" + "=" * 50)
    
    # Create new test user with correct structure
    create_test_user_with_correct_data()
    
    print("\n" + "=" * 50)
    print("🏁 Data consistency fix completed!") 