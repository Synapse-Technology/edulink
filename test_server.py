#!/usr/bin/env python
import requests

def test_server_connection():
    """Test if Django server is running"""
    try:
        response = requests.get("http://localhost:8000/api/auth/users/", timeout=5)
        print(f"Server response status: {response.status_code}")
        if response.status_code == 200:
            print("✓ Django server is running and accessible")
            return True
        else:
            print(f"Server responded with status {response.status_code}")
            return True  # Server is running, just different response
    except requests.exceptions.ConnectionError:
        print("✗ Could not connect to Django server on localhost:8000")
        print("Please make sure the server is running with: python manage.py runserver")
        return False
    except Exception as e:
        print(f"✗ Error testing server: {e}")
        return False

if __name__ == "__main__":
    test_server_connection()