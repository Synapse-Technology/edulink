import requests
import json

# Test the exact same API call that the frontend makes
url = 'http://127.0.0.1:8000/api/institutions/validate-code/'
data = {'university_code': 'EDUJKUAT25-01'}
headers = {'Content-Type': 'application/json'}

try:
    response = requests.post(url, json=data, headers=headers)
    
    print(f'Status Code: {response.status_code}')
    print(f'Status OK: {response.ok}')
    print(f'Headers: {dict(response.headers)}')
    
    if response.headers.get('content-type', '').startswith('application/json'):
        json_data = response.json()
        print(f'JSON Response: {json.dumps(json_data, indent=2)}')
        print(f'Valid field: {json_data.get("valid", "NOT FOUND")}')
        print(f'Frontend condition (response.ok && data.valid): {response.ok and json_data.get("valid", False)}')
    else:
        print(f'Non-JSON Response: {response.text[:500]}')
        
except Exception as e:
    print(f'Error: {e}')