import requests
import json

# Test the dashboard API with the actual token
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUzNzM5NDczLCJpYXQiOjE3NTM3MTA2NzMsImp0aSI6ImNiMzYyN2Q5ZDkwMjRiYmY4ZTU2YmVkYjlkNmU0MDRmIiwidXNlcl9pZCI6ImNlM2ExY2RmLTdhZWEtNDE3My05OTljLTVlZGE0NTFkN2M3NiJ9._6gwF3n2utz4p8H4tdpZ9UK5YHI7euLwrRg6pmqI_yY"

headers = {
    'Authorization': f'Bearer {token}',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

url = 'http://127.0.0.1:8000/api/dashboards/student/'

print(f"Testing API call to: {url}")
print(f"Headers: {headers}")
print("\n" + "="*50)

try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Content Type: {response.headers.get('content-type', 'Not specified')}")
    print("\nResponse Content:")
    print("="*30)
    
    # Try to parse as JSON first
    try:
        json_data = response.json()
        print("JSON Response:")
        print(json.dumps(json_data, indent=2))
    except json.JSONDecodeError:
        print("Response is not valid JSON. Raw content:")
        print(response.text[:1000])  # First 1000 characters
        if len(response.text) > 1000:
            print("\n... (truncated)")
            
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")