#!/usr/bin/env python3
"""
Test script for registration API endpoint.
This script creates a complete registration request with all required fields.
"""

import requests
import json

def test_registration():
    """Test the registration endpoint with proper data."""
    
    # Registration API endpoint
    url = "http://localhost:8002/api/v1/registration/requests/"
    
    # Complete registration data for institution
    registration_data = {
        # Basic user information
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@testuniversity.edu",
        "phone_number": "+254712345678",
        
        # Institution information
        "institution_name": "Test University of Kenya",
        "institution_type": "university",
        "student_count": "101_500",
        "registration_number": "REG123456",
        "faculty_count": 25,
        "website": "https://testuniversity.edu",
        "description": "A leading university in Kenya focused on technology and innovation.",
        
        # Contact information
        "contact_email": "admin@testuniversity.edu",
        "contact_phone": "+254712345679",
        "position": "Registrar",
        
        # Address information
        "address": "123 University Avenue",
        "city": "Nairobi",
        "county": "Nairobi",
        
        # User account (optional for institutions)
        "password": "SecurePass123!",
        "confirm_password": "SecurePass123!",
        
        # Required acceptances (only if password provided)
        "terms_accepted": True,
        "privacy_accepted": True
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("Sending registration request...")
        print(f"URL: {url}")
        print(f"Data: {json.dumps(registration_data, indent=2)}")
        print("-" * 50)
        
        response = requests.post(url, json=registration_data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print("-" * 50)
        
        if response.status_code == 201:
            print("✅ Registration successful!")
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2)}")
            
            # Extract important information
            if 'registration_request' in response_data:
                reg_data = response_data['registration_request']
                print(f"\n📋 Registration Details:")
                print(f"   Request Number: {reg_data.get('request_number')}")
                print(f"   Status: {reg_data.get('status')}")
                print(f"   Email Verification Token: {reg_data.get('email_verification_token')}")
                print(f"   Created: {reg_data.get('created_at')}")
        
        elif response.status_code == 400:
            print("❌ Validation errors:")
            try:
                error_data = response.json()
                print(f"Errors: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw response: {response.text}")
        
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error: Make sure the registration service is running on port 8002")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def test_minimal_institution():
    """Test with minimal required fields for institution."""
    
    url = "http://localhost:8002/api/v1/registration/requests/"
    
    # Minimal data for institution registration (no user account)
    minimal_data = {
        # Required basic info
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@minimal.edu",
        "phone_number": "+254712345680",
        
        # Required institution info
        "institution_name": "Minimal Test College",
        "institution_type": "tvet",
        
        # Required contact info
        "contact_email": "contact@minimal.edu",
        "contact_phone": "+254712345681",
        
        # Required address info
        "address": "456 College Road",
        "city": "Mombasa",
        "county": "Mombasa"
    }
    
    try:
        print("\n" + "=" * 60)
        print("Testing minimal institution registration...")
        print("=" * 60)
        
        response = requests.post(url, json=minimal_data, headers={"Content-Type": "application/json"})
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ Minimal registration successful!")
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2)}")
        else:
            print(f"❌ Failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Errors: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    print("🧪 Testing Registration API")
    print("=" * 60)
    
    # Test full registration
    test_registration()
    
    # Test minimal registration
    test_minimal_institution()
    
    print("\n✨ Test completed!")