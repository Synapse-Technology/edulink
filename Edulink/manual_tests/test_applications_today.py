#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.utils import timezone
from application.models import Application
from internship.models import Internship
from authentication.models import User

def test_applications_today():
    """Test and analyze applications today metric"""
    print("=== Testing Applications Today Metric ===")
    
    current_date = timezone.now()
    today = current_date.date()
    
    # Get all applications submitted today
    applications_today = Application.objects.filter(
        application_date__date=today
    )
    
    print(f"\nTotal applications submitted today: {applications_today.count()}")
    
    if applications_today.exists():
        print("\nApplications breakdown:")
        for i, app in enumerate(applications_today, 1):
            try:
                internship_title = app.internship.title if app.internship else "No internship"
                company_name = app.internship.employer.company_name if app.internship and app.internship.employer else "No company"
                student_email = app.student.email if app.student else "No student"
                
                print(f"{i}. Student: {student_email}")
                print(f"   Internship: {internship_title}")
                print(f"   Company: {company_name}")
                print(f"   Status: {app.status}")
                print(f"   Applied at: {app.application_date}")
                print()
            except Exception as e:
                print(f"{i}. Error processing application {app.id}: {e}")
    
    # Check active internships
    try:
        active_internships = Internship.objects.filter(is_active=True)
        print(f"\nActive internships on platform: {active_internships.count()}")
        
        if active_internships.exists():
            print("\nActive internships breakdown:")
            for i, internship in enumerate(active_internships, 1):
                try:
                    company_name = internship.employer.company_name if internship.employer else "No company"
                    applications_count = internship.applications.count()
                    applications_today_count = internship.applications.filter(
                        application_date__date=today
                    ).count()
                    
                    print(f"{i}. Title: {internship.title}")
                    print(f"   Company: {company_name}")
                    print(f"   Total applications: {applications_count}")
                    print(f"   Applications today: {applications_today_count}")
                    print(f"   Created: {internship.created_at}")
                    print()
                except Exception as e:
                    print(f"{i}. Error processing internship {internship.id}: {e}")
    except Exception as e:
        print(f"Error accessing internships: {e}")
    
    # Check if there are any employers
    try:
        from users.models.employer_profile import EmployerProfile
        employers = EmployerProfile.objects.all()
        print(f"\nTotal employers on platform: {employers.count()}")
        
        if employers.exists():
            print("\nEmployers breakdown:")
            for i, employer in enumerate(employers, 1):
                try:
                    internships_count = Internship.objects.filter(employer=employer).count()
                    active_internships_count = Internship.objects.filter(
                        employer=employer, is_active=True
                    ).count()
                    
                    print(f"{i}. Company: {employer.company_name}")
                    print(f"   Total internships: {internships_count}")
                    print(f"   Active internships: {active_internships_count}")
                    print()
                except Exception as e:
                    print(f"{i}. Error processing employer {employer.id}: {e}")
    except Exception as e:
        print(f"Error accessing employers: {e}")
    
    # Summary
    print("=== SUMMARY ===")
    print(f"The 'applications today' metric shows {applications_today.count()} because:")
    print("- It counts ALL applications submitted today across the entire platform")
    print("- It does NOT filter by the current employer's internships")
    print("- Applications can be to internships from any employer")
    print("- Applications can even exist for inactive internships")
    
    if applications_today.count() > 0:
        try:
            active_internships_count = Internship.objects.filter(is_active=True).count()
            if active_internships_count == 0:
                print("\n⚠️  ISSUE IDENTIFIED:")
                print("- There are applications today but no active internships")
                print("- This suggests applications to inactive/deleted internships")
                print("- Or test data that doesn't reflect real usage")
        except Exception as e:
            print(f"Error checking active internships: {e}")

if __name__ == '__main__':
    test_applications_today()