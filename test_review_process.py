#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the path
sys.path.insert(0, r'c:\Users\bouri\Documents\Projects\Edulink\edulink')

# Set up Django with correct settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from uuid import UUID
from edulink.apps.institutions.models import InstitutionRequest, Institution
from edulink.apps.institutions.services import review_institution_request

# Test the review process
print("=== Testing Institution Request Review Process ===")

# Find pending requests
pending_requests = InstitutionRequest.objects.filter(status='pending')
print(f"Found {pending_requests.count()} pending requests")

if pending_requests.exists():
    request = pending_requests.first()
    print(f"\nTesting with request: {request.institution_name} (ID: {request.id})")
    print(f"Current status: {request.status}")
    print(f"Representative: {request.representative_name}")
    print(f"Email: {request.representative_email}")
    
    # Test approval
    try:
        print("\n--- Testing APPROVAL ---")
        reviewed_request = review_institution_request(
            request_id=request.id,
            action='approve',
            reviewer_id='admin-123'
        )
        print(f"Request approved successfully!")
        print(f"New status: {reviewed_request.status}")
        
        # Check if institution was created
        if Institution.objects.filter(name=request.institution_name).exists():
            institution = Institution.objects.get(name=request.institution_name)
            print(f"Institution created: {institution.name} (ID: {institution.id})")
            print(f"Domain: {institution.domain}")
            print(f"Verified: {institution.is_verified}")
            print(f"Active: {institution.is_active}")
        else:
            print("ERROR: Institution was not created!")
            
    except Exception as e:
        print(f"Error during approval: {e}")
        
else:
    print("No pending requests found. Creating a test request...")
    
    # Create a test request
    from edulink.apps.institutions.services import submit_institution_request
    
    test_request = submit_institution_request(
        institution_name="Test University for Review",
        website_url="https://testuniversity.edu",
        requested_domains=["testuniversity.edu", "student.testuniversity.edu"],
        representative_name="Test Representative",
        representative_email="rep@testuniversity.edu",
        representative_role="IT Administrator",
        representative_phone="+1234567890",
        department="Information Technology",
        notes="Test institution for review process"
    )
    
    print(f"Created test request: {test_request.institution_name}")
    print(f"Tracking code: {test_request.tracking_code}")
    print(f"Status: {test_request.status}")
    
    # Now test rejection
    print("\n--- Testing REJECTION ---")
    try:
        reviewed_request = review_institution_request(
            request_id=test_request.id,
            action='reject',
            reviewer_id='admin-123',
            rejection_reason='Test rejection - insufficient documentation provided'
        )
        print(f"Request rejected successfully!")
        print(f"New status: {reviewed_request.status}")
        print(f"Rejection reason: {reviewed_request.rejection_reason}")
        
    except Exception as e:
        print(f"Error during rejection: {e}")