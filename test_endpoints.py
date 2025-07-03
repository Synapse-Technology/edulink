import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_registration():
    url = f"{BASE_URL}/auth/register/"
    data = {
        "email": "test@example.com",
        "password": "Test@123",
        "institution": "Test University",
        "phone_number": "1234567890",
        "national_id": "12345",
        "first_name": "John",
        "last_name": "Doe",
        "admission_number": "ADM001",
        "academic_year": 2024
    }
    
    response = requests.post(url, json=data)
    print("\nTesting Registration:")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json() if response.status_code == 200 else response.text}")
    return response

def test_login():
    url = f"{BASE_URL}/auth/login/"
    data = {
        "email": "test@example.com",
        "password": "Test@123"
    }
    
    response = requests.post(url, json=data)
    print("\nTesting Login:")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json() if response.status_code == 200 else response.text}")
    return response

def test_student_profile(access_token):
    url = f"{BASE_URL}/users/student/profile/"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(url, headers=headers)
    print("\nTesting Student Profile:")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json() if response.status_code == 200 else response.text}")
    return response

if __name__ == "__main__":
    # Test registration
    reg_response = test_registration()
    
    # Test login
    login_response = test_login()
    if login_response.status_code == 200:
        access_token = login_response.json().get("access")
        
        # Test student profile
        test_student_profile(access_token) 