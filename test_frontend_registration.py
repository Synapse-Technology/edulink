#!/usr/bin/env python3
"""
Test script to simulate institutional registration from frontend
and capture the registration request code.
"""

import requests
import json
import sys

# Configuration
REGISTRATION_API_URL = "http://127.0.0.1:8002/api/v1/registration/requests/"

# Sample institutional registration data (properly mapped to serializer fields)
registration_data = {
    "institution_name": "Nairobi Technical University",
    "institution_type": "university",
    "established_year": 1995,
    "contact_email": "registrar@ntu.ac.ke",
    "contact_phone": "+254712345678",
    "first_name": "John",
    "last_name": "Kamau",
    "address": "123 University Way, Nairobi",
    "city": "Nairobi",
    "county": "Nairobi",
    "website": "https://www.ntu.ac.ke",
    "role": "institution_admin"
}

def test_institutional_registration():
    """
    Test institutional registration and capture the registration request code.
    """
    print("=" * 60)
    print("TESTING INSTITUTIONAL REGISTRATION FROM FRONTEND")
    print("=" * 60)
    
    try:
        print(f"\nSending registration request to: {REGISTRATION_API_URL}")
        print(f"Institution: {registration_data['institution_name']}")
        print(f"Type: {registration_data['institution_type']}")
        print(f"Contact: {registration_data['first_name']} {registration_data['last_name']}")
        print(f"Email: {registration_data['contact_email']}")
        
        # Send POST request to registration API
        response = requests.post(
            REGISTRATION_API_URL,
            json=registration_data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=30
        )
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print("\n✅ REGISTRATION SUCCESSFUL!")
            print(f"Registration ID: {result.get('id', 'N/A')}")
            
            # Look for registration request code
            if 'request_code' in result:
                print(f"\n🎯 REGISTRATION REQUEST CODE: {result['request_code']}")
                print("\n📋 Use this code to check registration status:")
                print(f"   - Code: {result['request_code']}")
                print(f"   - Status: {result.get('status', 'pending')}")
            elif 'reference_number' in result:
                print(f"\n🎯 REFERENCE NUMBER: {result['reference_number']}")
                print("\n📋 Use this reference to check registration status:")
                print(f"   - Reference: {result['reference_number']}")
                print(f"   - Status: {result.get('status', 'pending')}")
            else:
                print("\n📋 Registration Details:")
                for key, value in result.items():
                    if key not in ['created_at', 'updated_at']:
                        print(f"   - {key}: {value}")
            
            print("\n📧 Next Steps:")
            print("   1. Check your email for confirmation")
            print("   2. Wait for verification (2-3 business days)")
            print("   3. You'll receive login credentials once approved")
            
        elif response.status_code == 400:
            error_data = response.json()
            print("\n❌ REGISTRATION FAILED - Validation Errors:")
            if isinstance(error_data, dict):
                for field, errors in error_data.items():
                    if isinstance(errors, list):
                        print(f"   - {field}: {', '.join(errors)}")
                    else:
                        print(f"   - {field}: {errors}")
            else:
                print(f"   - Error: {error_data}")
                
        else:
            print(f"\n❌ REGISTRATION FAILED - HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error response: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("\n❌ CONNECTION ERROR: Could not connect to registration service")
        print("   Make sure the registration service is running on port 8002")
        
    except requests.exceptions.Timeout:
        print("\n❌ TIMEOUT ERROR: Request took too long")
        
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_institutional_registration()