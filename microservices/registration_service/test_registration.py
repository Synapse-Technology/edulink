#!/usr/bin/env python
"""Test script for institution registration API."""

import requests
import json

def test_registration_api():
    """Test the institution registration API endpoint."""
    
    # Test data for institution registration
    test_data = {
        "organization_name": "Test University",
        "organization_type": "university",
        "email": "admin@testuniversity.edu",
        "phone": "+1234567890",
        "address": "123 Test Street, Test City, TC 12345",
        "contact_person_name": "John Doe",
        "contact_person_title": "Administrator",
        "role": "institution_admin",
        "description": "Test university for registration testing",
        "website": "https://testuniversity.edu"
    }
    
    # API endpoints
    direct_url = "http://localhost:8003/api/v1/registration/requests/"
    gateway_url = "http://localhost:8000/api/v1/registration/requests/"
    
    print("Testing Institution Registration API...")
    print("=" * 50)
    
    # Test direct connection to registration service
    print("\n1. Testing direct connection to registration service:")
    try:
        response = requests.post(direct_url, json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:500]}..." if len(response.text) > 500 else f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Direct registration successful!")
        else:
            print("❌ Direct registration failed")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Direct connection error: {e}")
    
    # Test connection through API gateway
    print("\n2. Testing connection through API gateway:")
    try:
        response = requests.post(gateway_url, json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:500]}..." if len(response.text) > 500 else f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Gateway registration successful!")
        else:
            print("❌ Gateway registration failed")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Gateway connection error: {e}")
    
    # Test health check
    print("\n3. Testing service health:")
    try:
        health_url = "http://localhost:8003/health/"
        response = requests.get(health_url, timeout=5)
        print(f"Health check status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Registration service is healthy")
        else:
            print("❌ Registration service health check failed")
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check error: {e}")

if __name__ == "__main__":
    test_registration_api()