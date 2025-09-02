#!/usr/bin/env python3

import requests
import json

# Registration API endpoint
REGISTRATION_API_URL = "http://127.0.0.1:8002/api/v1/registration/requests/"

# Simple institutional registration data
registration_data = {
    "institution_name": "Nairobi Technical University",
    "institution_type": "university",
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

print("Testing Institutional Registration...")
print(f"Institution: {registration_data['institution_name']}")
print(f"Contact: {registration_data['first_name']} {registration_data['last_name']}")
print(f"Email: {registration_data['contact_email']}")
print()

try:
    # Send POST request
    response = requests.post(
        REGISTRATION_API_URL,
        json=registration_data,
        headers={'Content-Type': 'application/json'},
        timeout=30
    )
    
    print(f"Response Status: {response.status_code}")
    
    if response.status_code == 201:
        # Success - extract registration request code
        response_data = response.json()
        request_number = response_data.get('request_number')
        
        print("✅ REGISTRATION SUCCESSFUL!")
        print(f"Registration Request Code: {request_number}")
        print(f"Request ID: {response_data.get('id')}")
        print(f"Status: {response_data.get('status')}")
        print(f"Organization: {response_data.get('organization_name')}")
        
    elif response.status_code == 400:
        # Validation errors
        try:
            error_data = response.json()
            print("❌ VALIDATION ERRORS:")
            for field, errors in error_data.items():
                if isinstance(errors, list):
                    for error in errors:
                        print(f"   - {field}: {error}")
                else:
                    print(f"   - {field}: {errors}")
        except:
            print(f"❌ VALIDATION ERROR: {response.text}")
            
    else:
        # Other errors
        print(f"❌ REGISTRATION FAILED - HTTP {response.status_code}")
        print(f"Response: {response.text[:500]}...")
        
except requests.exceptions.RequestException as e:
    print(f"❌ REQUEST FAILED: {e}")
except Exception as e:
    print(f"❌ UNEXPECTED ERROR: {e}")

print("\nTest completed.")