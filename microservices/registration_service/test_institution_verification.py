#!/usr/bin/env python
"""
Test script for automated institution verification system
"""

import os
import sys
import django
from django.conf import settings

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'registration_service.settings')
django.setup()

from registration_requests.models import RegistrationRequest, RegistrationStatus
from registration_requests.institution_verification import AutomatedInstitutionVerificationService
from registration_requests.services import InstitutionalVerificationService

def test_automated_verification():
    """
    Test the automated institution verification system
    """
    print("Testing Automated Institution Verification System")
    print("=" * 50)
    
    # Test cases with different institution names
    test_cases = [
        {
            'name': 'University of Nairobi',
            'email': 'test@uonbi.ac.ke',
            'expected': True
        },
        {
            'name': 'Kenyatta University',
            'email': 'test@ku.ac.ke', 
            'expected': True
        },
        {
            'name': 'Strathmore University',
            'email': 'test@strathmore.edu',
            'expected': True
        },
        {
            'name': 'Kenya Institute of Management',
            'email': 'test@kim.ac.ke',
            'expected': True
        },
        {
            'name': 'Fake University',
            'email': 'test@fake.com',
            'expected': False
        },
        {
            'name': 'Test College',
            'email': 'test@testcollege.ac.ke',
            'expected': False
        }
    ]
    
    verification_service = AutomatedInstitutionVerificationService()
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['name']}")
        print(f"Email: {test_case['email']}")
        
        # Create a mock registration request
        mock_request = type('MockRequest', (), {
            'organization_name': test_case['name'],
            'email': test_case['email'],
            'institution_name': test_case['name']
        })()
        
        try:
            result = verification_service.verify_institution(mock_request)
            
            if result:
                print(f"✓ Verification successful")
                print(f"  Match type: {result.get('match_type', 'N/A')}")
                print(f"  Confidence: {result.get('confidence_score', 'N/A')}")
                print(f"  Institution ID: {result.get('institution_id', 'N/A')}")
                verified = True
            else:
                print(f"✗ Verification failed")
                verified = False
                
            # Check if result matches expectation
            if verified == test_case['expected']:
                print(f"  Result: PASS (Expected: {test_case['expected']}, Got: {verified})")
            else:
                print(f"  Result: FAIL (Expected: {test_case['expected']}, Got: {verified})")
                
        except Exception as e:
            print(f"✗ Error during verification: {str(e)}")
            print(f"  Result: FAIL (Exception occurred)")
    
    print("\n" + "=" * 50)
    print("Testing complete!")

def test_integration_with_registration_service():
    """
    Test integration with the main registration service
    """
    print("\nTesting Integration with Registration Service")
    print("=" * 50)
    
    # Test the main verification method
    test_institution = {
        'name': 'University of Nairobi',
        'email': 'test@uonbi.ac.ke'
    }
    
    # Create a mock registration request
    mock_request = type('MockRequest', (), {
        'organization_name': test_institution['name'],
        'email': test_institution['email'],
        'institution_name': test_institution['name'],
        'get_verification_authority': lambda: 'CUE'
    })()
    
    try:
        result = InstitutionalVerificationService.verify_institution(mock_request)
        
        print(f"Institution: {test_institution['name']}")
        print(f"Verified: {result.get('verified', False)}")
        print(f"Source: {result.get('source', 'N/A')}")
        print(f"Details: {result.get('details', 'N/A')}")
        
        if result.get('verified'):
            print("✓ Integration test PASSED")
        else:
            print("✗ Integration test FAILED")
            
    except Exception as e:
        print(f"✗ Integration test ERROR: {str(e)}")

if __name__ == '__main__':
    try:
        test_automated_verification()
        test_integration_with_registration_service()
    except Exception as e:
        print(f"Test execution failed: {str(e)}")
        sys.exit(1)