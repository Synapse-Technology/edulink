import requests
import json

# Test token from test_tokens.json
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUxNzI4MDY0LCJpYXQiOjE3NTE2OTkyNjQsImp0aSI6Ijg3ZDMxMTNkMjM1MzRhMjk4ZTI1M2RhMjQ3NmVlOTA1IiwidXNlcl9pZCI6Ijg5NWFlN2M5LWUzNjAtNDE2ZC05MDg0LTQxZjQ5YmU0NGI4NCJ9.dO6mgG-cbRTNnoCQT_CGFAxTrJszDZ0AfmR5O8lJUMY"

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Test dashboard endpoint
print("Testing dashboard endpoint...")
try:
    response = requests.get('http://localhost:8000/api/dashboards/student/', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Dashboard data structure:")
        print(json.dumps(data, indent=2)[:500] + "...")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test applications endpoint
print("\nTesting applications endpoint...")
try:
    response = requests.get('http://localhost:8000/api/application/my-applications/', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Applications data structure:")
        print(json.dumps(data, indent=2)[:500] + "...")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")