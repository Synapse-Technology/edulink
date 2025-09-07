import requests
import json

# Test the invite register endpoint
url = 'http://127.0.0.1:8000/api/auth/invite-register/'
params = {'token': 'e049eb59-aba8-49c3-b6c6-e95a92d4be4c'}

# Test data for registration
test_data = {
    'email': 'test@example.com',
    'password': 'testpassword123',
    'first_name': 'Test',
    'last_name': 'User'
}

try:
    # First try GET request to see if the endpoint loads
    print('Testing GET request...')
    response = requests.get(url, params=params)
    print(f'GET Status Code: {response.status_code}')
    print(f'GET Response: {response.text[:500]}...')
    
    # Then try POST request
    print('\nTesting POST request...')
    response = requests.post(url, params=params, json=test_data)
    print(f'POST Status Code: {response.status_code}')
    print(f'POST Response: {response.text[:500]}...')
    
except requests.exceptions.RequestException as e:
    print(f'Request failed: {e}')
except Exception as e:
    print(f'Error: {e}')