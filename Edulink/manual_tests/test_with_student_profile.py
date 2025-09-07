#!/usr/bin/env python
"""
Debug test script for dashboard endpoints with a user who has a student profile.
This tests the same endpoints but with obuyacarol1@gmail.com who should have a student_profile.
"""

import os
import sys
import django
import json
from datetime import datetime
from django.test import Client
from django.contrib.auth import authenticate

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.models import User
from users.models import StudentProfile

def test_dashboard_endpoints_with_student_profile():
    """
    Test dashboard endpoints with a user who has a student profile
    """
    print("\n" + "="*80)
    print("TESTING DASHBOARD ENDPOINTS WITH STUDENT PROFILE USER")
    print("="*80)
    
    # Test credentials
    email = "obuyahcarol1@gmail.com"
    password = "Carol2005"
    
    print(f"\nTesting with user: {email}")
    
    # Check if user exists and has student profile
    try:
        user = User.objects.get(email=email)
        print(f"✓ User found: {user.email}")
        
        # Check for student profile
        try:
            student_profile = user.student_profile
            print(f"✓ Student profile found: {student_profile.first_name} {student_profile.last_name} - {student_profile.registration_number}")
            print(f"  - Registration Number: {student_profile.registration_number}")
            print(f"  - Year of Study: {student_profile.year_of_study}")
            print(f"  - Institution: {student_profile.institution}")
        except Exception as e:
            print(f"✗ No student profile found: {e}")
            return
            
    except User.DoesNotExist:
        print(f"✗ User {email} not found in database")
        return
    
    # Create client and login
    client = Client()
    
    # Test authentication
    print(f"\nTesting authentication...")
    user_auth = authenticate(username=email, password=password)
    if user_auth:
        print(f"✓ Authentication successful")
    else:
        print(f"✗ Authentication failed")
        return
    
    # Login via client
    login_success = client.login(username=email, password=password)
    if login_success:
        print(f"✓ Client login successful")
    else:
        print(f"✗ Client login failed")
        return
    
    # Test endpoints
    endpoints_to_test = [
        '/api/dashboards/student/',
        '/api/dashboards/progress/',
        '/api/dashboards/calendar-events/upcoming/',
        '/api/dashboards/calendar-events/',
        '/api/dashboards/insights/',
        '/api/internship-progress/progress/',
        '/api/dashboards/student-achievements/',
        '/api/dashboards/analytics-events/',
        '/api/dashboards/analytics/',
        '/api/dashboards/achievements/',
    ]
    
    results = []
    
    print(f"\nTesting {len(endpoints_to_test)} endpoints...")
    print("-" * 60)
    
    for endpoint in endpoints_to_test:
        print(f"\nTesting: {endpoint}")
        
        try:
            response = client.get(endpoint)
            status_code = response.status_code
            
            # Try to parse JSON response
            try:
                response_data = response.json()
                error_message = response_data.get('error', response_data.get('detail', 'No error message'))
            except:
                error_message = response.content.decode('utf-8')[:200] + '...' if len(response.content) > 200 else response.content.decode('utf-8')
            
            result = {
                'endpoint': endpoint,
                'status_code': status_code,
                'success': status_code == 200,
                'error_message': error_message if status_code != 200 else None,
                'response_size': len(response.content)
            }
            
            results.append(result)
            
            # Print result
            if status_code == 200:
                print(f"  ✓ SUCCESS (200) - Response size: {len(response.content)} bytes")
            else:
                print(f"  ✗ FAILED ({status_code}) - {error_message[:100]}")
                
        except Exception as e:
            print(f"  ✗ ERROR - {str(e)}")
            results.append({
                'endpoint': endpoint,
                'status_code': 'ERROR',
                'success': False,
                'error_message': str(e),
                'response_size': 0
            })
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    successful = sum(1 for r in results if r['success'])
    total = len(results)
    success_rate = (successful / total) * 100 if total > 0 else 0
    
    print(f"Total endpoints tested: {total}")
    print(f"Successful: {successful}")
    print(f"Failed: {total - successful}")
    print(f"Success rate: {success_rate:.1f}%")
    
    # Detailed results
    print("\nDetailed Results:")
    print("-" * 60)
    for result in results:
        status = "✓ PASS" if result['success'] else "✗ FAIL"
        print(f"{status} {result['endpoint']} ({result['status_code']})")
        if not result['success'] and result['error_message']:
            print(f"    Error: {result['error_message'][:100]}")
    
    # Save results to JSON
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"student_profile_test_report_{timestamp}.json"
    
    report_data = {
        'timestamp': timestamp,
        'test_user': email,
        'has_student_profile': True,
        'total_endpoints': total,
        'successful_endpoints': successful,
        'failed_endpoints': total - successful,
        'success_rate': success_rate,
        'results': results
    }
    
    with open(report_file, 'w') as f:
        json.dump(report_data, f, indent=2)
    
    print(f"\nDetailed report saved to: {report_file}")
    
    if success_rate == 100:
        print("\n🎉 ALL TESTS PASSED! Dashboard endpoints work correctly with student profile.")
    else:
        print(f"\n⚠️  {total - successful} endpoints still have issues.")
    
    return results

if __name__ == '__main__':
    try:
        results = test_dashboard_endpoints_with_student_profile()
        print("\nTest completed successfully.")
    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)