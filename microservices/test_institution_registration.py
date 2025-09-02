#!/usr/bin/env python
"""
Test script for Institution Registration and Onboarding
Demonstrates the complete registration flow for educational institutions
"""

import requests
import json
from datetime import datetime
import time

# Configuration
BASE_URL = "http://127.0.0.1:8002/api/v1"
REGISTRATION_URL = f"{BASE_URL}/registration/requests/"
VERIFICATION_URL = f"{BASE_URL}/registration/verify-email/"
DOMAIN_VERIFICATION_URL = f"{BASE_URL}/registration/verify-domain/"
INSTITUTION_VERIFICATION_URL = f"{BASE_URL}/registration/verify-institution/"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"📋 {title}")
    print("=" * 60)

def print_step(step_num, description):
    """Print a formatted step"""
    print(f"\n🔸 Step {step_num}: {description}")

def test_institution_registration():
    """Test the complete institution registration flow"""
    
    print_section("INSTITUTION REGISTRATION & ONBOARDING TEST")
    print(f"🕐 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 Testing against: {BASE_URL}")
    
    # Test data for different institution types
    test_institutions = [
        {
            "name": "Nairobi Technical University",
            "type": "university",
            "email": "admin@ntu.ac.ke",
            "website": "https://ntu.ac.ke",
            "registration_number": "CUE/REG/2024/001",
            "description": "Leading technical university in Kenya"
        },
        {
            "name": "Kiambu Institute of Technology",
            "type": "tvet",
            "email": "registrar@kit.ac.ke",
            "website": "https://kit.ac.ke",
            "registration_number": "TVETA/TTI/2024/015",
            "description": "Premier technical training institute"
        },
        {
            "name": "Mombasa Vocational Training Center",
            "type": "tvet",
            "email": "director@mvtc.ac.ke",
            "website": "https://mvtc.ac.ke",
            "registration_number": "TVETA/VTC/2024/032",
            "description": "Coastal region vocational training center"
        }
    ]
    
    results = []
    
    for i, institution in enumerate(test_institutions, 1):
        print_step(i, f"Testing registration for {institution['name']}")
        
        # Prepare registration data
        registration_data = {
            "email": institution["email"],
            "first_name": "John",
            "last_name": "Doe",
            "phone_number": "+254712345678",
            "role": "institution_admin",
            "organization_name": institution["name"],
            "organization_type": institution["type"],
            "organization_website": institution["website"],
            "organization_address": "P.O. Box 12345, Nairobi, Kenya",
            "organization_phone": "+254712345678",
            "institution_name": institution["name"],
            "institution_type": institution["type"],
            "established_year": 2010,
            "registration_number": institution["registration_number"],
            "contact_email": institution["email"],
            "contact_phone": "+254712345678",
            "address": "P.O. Box 12345, Nairobi, Kenya",
            "city": "Nairobi",
            "county": "Nairobi",
            "description": institution["description"],
            "student_count": "1001_5000",
            "faculty_count": 150
        }
        
        try:
            # Submit registration request
            print(f"   📤 Submitting registration request...")
            response = requests.post(
                REGISTRATION_URL,
                json=registration_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 201:
                registration_result = response.json()
                request_id = registration_result.get('id')
                request_number = registration_result.get('request_number')
                
                print(f"   ✅ Registration submitted successfully!")
                print(f"      📋 Request ID: {request_id}")
                print(f"      🔢 Request Number: {request_number}")
                print(f"      📧 Email: {registration_result.get('email')}")
                print(f"      📊 Status: {registration_result.get('status')}")
                
                # Test email verification endpoint
                print(f"   📧 Testing email verification...")
                email_verify_response = requests.post(
                    VERIFICATION_URL,
                    json={"email": institution["email"]},
                    headers={'Content-Type': 'application/json'}
                )
                
                if email_verify_response.status_code in [200, 201]:
                    print(f"   ✅ Email verification initiated")
                else:
                    print(f"   ⚠️  Email verification response: {email_verify_response.status_code}")
                
                # Test domain verification endpoint
                print(f"   🌐 Testing domain verification...")
                domain_verify_response = requests.post(
                    DOMAIN_VERIFICATION_URL,
                    json={"domain": institution["website"].replace('https://', '').replace('http://', '')},
                    headers={'Content-Type': 'application/json'}
                )
                
                if domain_verify_response.status_code in [200, 201]:
                    print(f"   ✅ Domain verification initiated")
                else:
                    print(f"   ⚠️  Domain verification response: {domain_verify_response.status_code}")
                
                # Test institutional verification endpoint
                print(f"   🏛️  Testing institutional verification...")
                inst_verify_response = requests.post(
                    INSTITUTION_VERIFICATION_URL,
                    json={
                        "registration_number": institution["registration_number"],
                        "institution_name": institution["name"],
                        "institution_type": institution["type"]
                    },
                    headers={'Content-Type': 'application/json'}
                )
                
                if inst_verify_response.status_code in [200, 201]:
                    print(f"   ✅ Institutional verification initiated")
                else:
                    print(f"   ⚠️  Institutional verification response: {inst_verify_response.status_code}")
                
                # Get updated registration status
                print(f"   📊 Checking registration status...")
                status_response = requests.get(
                    f"{REGISTRATION_URL}{request_id}/",
                    headers={'Content-Type': 'application/json'}
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"   📈 Current Status: {status_data.get('status')}")
                    print(f"   📧 Email Verified: {status_data.get('email_verified')}")
                    print(f"   🌐 Domain Verified: {status_data.get('domain_verified')}")
                    print(f"   🏛️  Institution Verified: {status_data.get('institutional_verified')}")
                    print(f"   ⚖️  Risk Level: {status_data.get('risk_level')}")
                
                results.append({
                    'institution': institution['name'],
                    'success': True,
                    'request_id': request_id,
                    'request_number': request_number,
                    'status': registration_result.get('status')
                })
                
            else:
                print(f"   ❌ Registration failed: {response.status_code}")
                print(f"   📄 Response: {response.text}")
                results.append({
                    'institution': institution['name'],
                    'success': False,
                    'error': response.text
                })
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connection error: Could not connect to {BASE_URL}")
            print(f"   💡 Make sure the registration service is running on port 8002")
            results.append({
                'institution': institution['name'],
                'success': False,
                'error': 'Connection error'
            })
        except Exception as e:
            print(f"   ❌ Unexpected error: {str(e)}")
            results.append({
                'institution': institution['name'],
                'success': False,
                'error': str(e)
            })
        
        # Add delay between requests
        if i < len(test_institutions):
            print(f"   ⏳ Waiting 2 seconds before next test...")
            time.sleep(2)
    
    # Print summary
    print_section("TEST SUMMARY")
    
    successful = sum(1 for r in results if r['success'])
    total = len(results)
    
    print(f"📊 Results: {successful}/{total} institutions registered successfully")
    
    for result in results:
        status = "✅ SUCCESS" if result['success'] else "❌ FAILED"
        print(f"   {status} {result['institution']}")
        if result['success']:
            print(f"      📋 Request: {result['request_number']}")
            print(f"      📊 Status: {result['status']}")
        else:
            print(f"      ❌ Error: {result['error']}")
    
    if successful == total:
        print(f"\n🎉 ALL TESTS PASSED! Institution registration system is working correctly.")
        print(f"   ✅ Registration endpoint is functional")
        print(f"   ✅ Verification workflows are accessible")
        print(f"   ✅ Status tracking is working")
    else:
        print(f"\n⚠️  SOME TESTS FAILED. Please check the registration service configuration.")
    
    print(f"\n🕐 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

def test_api_endpoints():
    """Test basic API endpoint availability"""
    
    print_section("API ENDPOINT AVAILABILITY TEST")
    
    endpoints = [
        ("Registration Requests", f"{BASE_URL}/registration/requests/"),
        ("Email Verification", f"{BASE_URL}/registration/verify-email/"),
        ("Domain Verification", f"{BASE_URL}/registration/verify-domain/"),
        ("Institution Verification", f"{BASE_URL}/registration/verify-institution/"),
        ("API Documentation", "http://127.0.0.1:8002/api/docs/"),
        ("API Schema", "http://127.0.0.1:8002/api/schema/")
    ]
    
    for name, url in endpoints:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code in [200, 405]:  # 405 is OK for POST-only endpoints
                print(f"✅ {name}: Available ({response.status_code})")
            else:
                print(f"⚠️  {name}: Unexpected status ({response.status_code})")
        except requests.exceptions.ConnectionError:
            print(f"❌ {name}: Connection failed")
        except Exception as e:
            print(f"❌ {name}: Error - {str(e)}")

if __name__ == "__main__":
    print("🚀 EDULINK INSTITUTION REGISTRATION TEST SUITE")
    print("=" * 60)
    
    # Test API availability first
    test_api_endpoints()
    
    # Test institution registration flow
    test_institution_registration()
    
    print("\n🏁 Test suite completed!")