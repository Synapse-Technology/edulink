#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from institutions.models import Institution, Department, Supervisor
from django.contrib.auth.models import User

def test_supervisor_api():
    try:
        # Test the API endpoints
        base_url = 'http://127.0.0.1:8000/api/institutions'
        
        print("Testing Supervisor API endpoints...")
        
        # Test departments endpoint
        print("\n1. Testing departments endpoint:")
        try:
            response = requests.get(f'{base_url}/departments/')
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Departments found: {len(data)}")
                for dept in data:
                    print(f"  - {dept.get('name', 'Unknown')} (ID: {dept.get('id', 'Unknown')})")
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Error testing departments: {e}")
        
        # Test supervisors endpoint
        print("\n2. Testing supervisors endpoint:")
        try:
            response = requests.get(f'{base_url}/supervisors/')
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Supervisors found: {len(data)}")
                for sup in data:
                    print(f"  - {sup.get('name', 'Unknown')} ({sup.get('email', 'Unknown')}) - Dept: {sup.get('department_name', 'None')}")
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Error testing supervisors: {e}")
        
        # Check database directly
        print("\n3. Checking database directly:")
        institutions = Institution.objects.all()
        print(f"Total institutions: {institutions.count()}")
        
        for inst in institutions:
            print(f"\nInstitution: {inst.name}")
            departments = Department.objects.filter(institution=inst)
            print(f"  Departments: {departments.count()}")
            for dept in departments:
                print(f"    - {dept.name} (ID: {dept.id})")
            
            supervisors = Supervisor.objects.filter(institution=inst)
            print(f"  Supervisors: {supervisors.count()}")
            for sup in supervisors:
                dept_name = sup.department.name if sup.department else 'No Department'
                print(f"    - {sup.name} ({sup.email}) - {dept_name}")
        
        # Check if there are any users
        print("\n4. Checking users:")
        users = User.objects.all()
        print(f"Total users: {users.count()}")
        for user in users[:5]:  # Show first 5 users
            print(f"  - {user.username} ({user.email})")
            if users.count() > 5:
                print(f"  ... and {users.count() - 5} more users")
        
    except Exception as e:
        print(f"Error in test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_supervisor_api()