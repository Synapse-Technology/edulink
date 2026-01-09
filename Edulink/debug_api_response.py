#!/usr/bin/env python3
import requests
import json

def test_api_response():
    try:
        url = "http://localhost:8000/api/dashboards/employer/"
        headers = {
            'Content-Type': 'application/json',
        }
        
        print(f"Testing API endpoint: {url}")
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n=== API Response Structure ===")
            print(json.dumps(data, indent=2))
            
            # Check statistics specifically
            if 'statistics' in data:
                print("\n=== Statistics Data ===")
                stats = data['statistics']
                for key, value in stats.items():
                    print(f"{key}: {value} (type: {type(value)})")
                    if isinstance(value, dict):
                        for subkey, subvalue in value.items():
                            print(f"  {subkey}: {subvalue} (type: {type(subvalue)})")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error testing API: {e}")

if __name__ == "__main__":
    test_api_response()