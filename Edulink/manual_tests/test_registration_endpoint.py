import requests
import json
import random

# Generate unique test data
random_num = random.randint(1000, 9999)
test_data = {
    "email": f"test{random_num}@example.com",
    "password": "testpass123",
    "password_confirm": "testpass123",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": f"+25471234{random_num}",
    "national_id": f"1234567{random_num}",
    "registration_number": f"TEST-{random_num}/2021",
    "year_of_study": 2,
    "university_code": "EDUJKUAT25-01",
    "registration_method": "university_code"
}

try:
    # Make POST request to registration endpoint
    response = requests.post(
        "http://127.0.0.1:8000/api/auth/register/student/",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Content: {response.text}")
    
    if response.status_code == 201:
        print("\n✅ SUCCESS: Student registration completed successfully!")
        response_data = response.json()
        print(f"User ID: {response_data.get('user', {}).get('id')}")
        print(f"Email: {response_data.get('user', {}).get('email')}")
        print(f"Student Profile: {response_data.get('student_profile', {})}")
    else:
        print(f"\n❌ FAILED: Registration failed with status {response.status_code}")
        try:
            error_data = response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        except:
            print(f"Raw error response: {response.text}")
            
except requests.exceptions.ConnectionError:
    print("❌ ERROR: Could not connect to the server. Make sure Django is running.")
except Exception as e:
    print(f"❌ ERROR: {str(e)}")