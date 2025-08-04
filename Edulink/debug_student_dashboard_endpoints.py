#!/usr/bin/env python3
"""
Debug script to test all student dashboard API endpoints
This script identifies which endpoints are causing 500 errors for users without student_profile
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from users.models.student_profile import StudentProfile
from authentication.models import User

User = get_user_model()

class DashboardEndpointTester:
    def __init__(self):
        self.base_url = 'http://127.0.0.1:8000'
        self.client = APIClient()
        self.test_user = None
        self.access_token = None
        
        # All dashboard endpoints from student_dash.html
        self.endpoints = [
            # Main dashboard data
            '/api/dashboards/student/',
            
            # Progress data
            '/api/dashboards/progress/',
            
            # Internship progress
            '/api/internship-progress/progress/',
            
            # Analytics data
            '/api/dashboards/analytics/',
            
            # Achievements data
            '/api/dashboards/achievements/',
            
            # Calendar events
            '/api/dashboards/calendar-events/upcoming/',
            '/api/dashboards/calendar-events/',
            
            # Additional endpoints that might be called
            '/api/dashboards/insights/',
            '/api/dashboards/student-achievements/',
            '/api/dashboards/analytics-events/',
        ]
        
    def create_test_user_without_profile(self):
        """Create a test user without student_profile"""
        try:
            # Delete existing test user if exists
            User.objects.filter(email='debug_no_profile@test.com').delete()
            
            # Create user without student_profile
            self.test_user = User.objects.create_user(
                email='debug_no_profile@test.com',
                password='Test123!',
                role='student',
                is_active=True,
                is_email_verified=True
            )
            
            # Ensure no student_profile exists
            StudentProfile.objects.filter(user=self.test_user).delete()
            
            print(f"✓ Created test user: {self.test_user.email} (ID: {self.test_user.id})")
            print(f"✓ User has student_profile: {hasattr(self.test_user, 'student_profile')}")
            
            return True
            
        except Exception as e:
            print(f"✗ Error creating test user: {e}")
            return False
    
    def get_access_token(self):
        """Get JWT access token for the test user"""
        try:
            refresh = RefreshToken.for_user(self.test_user)
            self.access_token = str(refresh.access_token)
            print(f"✓ Generated access token: {self.access_token[:20]}...")
            return True
        except Exception as e:
            print(f"✗ Error generating token: {e}")
            return False
    
    def test_endpoint(self, endpoint):
        """Test a single endpoint and return results"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            result = {
                'endpoint': endpoint,
                'status_code': response.status_code,
                'success': response.status_code < 400,
                'response_size': len(response.content),
                'content_type': response.headers.get('content-type', 'unknown')
            }
            
            if response.status_code >= 400:
                try:
                    error_data = response.json()
                    result['error_detail'] = error_data.get('detail', 'No detail provided')
                    result['error_data'] = error_data
                except:
                    result['error_detail'] = response.text[:200]
                    result['error_data'] = response.text
            else:
                try:
                    json_data = response.json()
                    result['data_keys'] = list(json_data.keys()) if isinstance(json_data, dict) else 'non-dict response'
                    result['data_length'] = len(json_data) if isinstance(json_data, (list, dict)) else 'unknown'
                except:
                    result['data_keys'] = 'non-json response'
                    
            return result
            
        except requests.exceptions.RequestException as e:
            return {
                'endpoint': endpoint,
                'status_code': 'ERROR',
                'success': False,
                'error_detail': str(e),
                'error_type': 'RequestException'
            }
        except Exception as e:
            return {
                'endpoint': endpoint,
                'status_code': 'ERROR',
                'success': False,
                'error_detail': str(e),
                'error_type': 'UnknownException'
            }
    
    def test_all_endpoints(self):
        """Test all dashboard endpoints"""
        print("\n" + "="*80)
        print("TESTING ALL STUDENT DASHBOARD ENDPOINTS")
        print("="*80)
        
        results = []
        failed_endpoints = []
        
        for endpoint in self.endpoints:
            print(f"\nTesting: {endpoint}")
            result = self.test_endpoint(endpoint)
            results.append(result)
            
            if result['success']:
                print(f"  ✓ Status: {result['status_code']} - SUCCESS")
                if 'data_keys' in result:
                    print(f"  ✓ Data keys: {result['data_keys']}")
            else:
                print(f"  ✗ Status: {result['status_code']} - FAILED")
                print(f"  ✗ Error: {result['error_detail']}")
                failed_endpoints.append(endpoint)
        
        return results, failed_endpoints
    
    def generate_report(self, results, failed_endpoints):
        """Generate a detailed report of the test results"""
        print("\n" + "="*80)
        print("DETAILED TEST REPORT")
        print("="*80)
        
        total_endpoints = len(results)
        successful_endpoints = len([r for r in results if r['success']])
        failed_count = len(failed_endpoints)
        
        print(f"\nSUMMARY:")
        print(f"  Total endpoints tested: {total_endpoints}")
        print(f"  Successful: {successful_endpoints}")
        print(f"  Failed: {failed_count}")
        print(f"  Success rate: {(successful_endpoints/total_endpoints)*100:.1f}%")
        
        if failed_endpoints:
            print(f"\nFAILED ENDPOINTS (causing 500 errors):")
            for endpoint in failed_endpoints:
                result = next(r for r in results if r['endpoint'] == endpoint)
                print(f"  ✗ {endpoint}")
                print(f"    Status: {result['status_code']}")
                print(f"    Error: {result['error_detail']}")
                if 'error_data' in result:
                    print(f"    Full error: {result['error_data']}")
                print()
        
        print(f"\nSUCCESSFUL ENDPOINTS:")
        for result in results:
            if result['success']:
                print(f"  ✓ {result['endpoint']} - Status: {result['status_code']}")
        
        # Save detailed report to file
        report_file = f"dashboard_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'test_user_email': self.test_user.email if self.test_user else None,
                'test_user_has_profile': hasattr(self.test_user, 'student_profile') if self.test_user else None,
                'summary': {
                    'total_endpoints': total_endpoints,
                    'successful': successful_endpoints,
                    'failed': failed_count,
                    'success_rate': (successful_endpoints/total_endpoints)*100
                },
                'failed_endpoints': failed_endpoints,
                'detailed_results': results
            }, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return failed_endpoints
    
    def cleanup(self):
        """Clean up test data"""
        try:
            if self.test_user:
                self.test_user.delete()
                print(f"\n🧹 Cleaned up test user: {self.test_user.email}")
        except Exception as e:
            print(f"\n⚠️  Error during cleanup: {e}")
    
    def run_full_test(self):
        """Run the complete test suite"""
        print("🚀 Starting Student Dashboard Endpoint Debug Test")
        print(f"⏰ Test started at: {datetime.now()}")
        
        # Step 1: Create test user without profile
        if not self.create_test_user_without_profile():
            print("❌ Failed to create test user. Exiting.")
            return False
        
        # Step 2: Get access token
        if not self.get_access_token():
            print("❌ Failed to get access token. Exiting.")
            self.cleanup()
            return False
        
        # Step 3: Test all endpoints
        try:
            results, failed_endpoints = self.test_all_endpoints()
            
            # Step 4: Generate report
            problematic_endpoints = self.generate_report(results, failed_endpoints)
            
            # Step 5: Provide recommendations
            if problematic_endpoints:
                print("\n" + "="*80)
                print("RECOMMENDATIONS TO FIX THE ISSUES")
                print("="*80)
                print("\nThe following endpoints are causing 500 errors for users without student_profile:")
                for endpoint in problematic_endpoints:
                    print(f"  • {endpoint}")
                
                print("\nTo fix these issues:")
                print("1. Check the corresponding view functions in dashboards/views.py")
                print("2. Add proper validation for student_profile existence")
                print("3. Return appropriate error responses instead of 500 errors")
                print("4. Consider creating student_profile automatically for new users")
                
                return False
            else:
                print("\n🎉 All endpoints are working correctly!")
                return True
                
        except Exception as e:
            print(f"\n❌ Error during testing: {e}")
            return False
        finally:
            self.cleanup()

def main():
    """Main function to run the debug test"""
    tester = DashboardEndpointTester()
    success = tester.run_full_test()
    
    if success:
        print("\n✅ All tests passed! No issues found.")
        sys.exit(0)
    else:
        print("\n❌ Issues found! Check the report above for details.")
        sys.exit(1)

if __name__ == '__main__':
    main()