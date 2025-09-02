import requests
import json

url = 'http://127.0.0.1:8000/api/institutions/all/'

try:
    response = requests.get(url)
    print(f'Status Code: {response.status_code}')
    print(f'Content-Type: {response.headers.get("Content-Type")}')
    print(f'Response Length: {len(response.text)}')
    print('\nResponse Content:')
    
    if response.headers.get('Content-Type', '').startswith('application/json'):
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(response.text)
        
except requests.exceptions.RequestException as e:
    print(f'Request failed: {e}')
except json.JSONDecodeError as e:
    print(f'JSON decode error: {e}')
    print('Raw response:', response.text)