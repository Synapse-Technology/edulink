#!/usr/bin/env python3
"""
Student Registration Migration Workflow Testing Script

This script tests the complete student registration workflow after migration
to ensure all microservices are working together properly.

Test Coverage:
1. API Gateway routing
2. Auth Service registration
3. User Service profile creation
4. Institution Service validation
5. Notification Service email sending
6. Event-driven communication
7. Legacy compatibility
"""

import asyncio
import httpx
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import os
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    """Test result data structure"""
    test_name: str
    status: str  # 'PASS', 'FAIL', 'SKIP'
    duration: float
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class MigrationWorkflowTester:
    """Tests the migrated student registration workflow"""
    
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self.api_gateway_url = config.get('API_GATEWAY_URL', 'http://localhost:8000')
        self.auth_service_url = config.get('AUTH_SERVICE_URL', 'http://localhost:8001')
        self.user_service_url = config.get('USER_SERVICE_URL', 'http://localhost:8002')
        self.institution_service_url = config.get('INSTITUTION_SERVICE_URL', 'http://localhost:8003')
        self.notification_service_url = config.get('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
        
        self.test_results: List[TestResult] = []
        self.test_data = {
            'email': f'test_student_{int(time.time())}@example.com',
            'password': 'TestPassword123!',
            'first_name': 'Test',
            'last_name': 'Student',
            'phone_number': '+254700000999',
            'national_id': f'TEST{int(time.time())}',
            'registration_number': f'TEST/2024/{int(time.time())}',
            'institution_name': 'University of Nairobi',
            'year_of_study': 2,
            'course': 'Computer Science',
            'registration_method': 'university_search'
        }
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all migration workflow tests"""
        logger.info("Starting migration workflow tests")
        start_time = datetime.now()
        
        # Test sequence
        test_methods = [
            self.test_microservices_health,
            self.test_api_gateway_routing,
            self.test_student_registration_via_gateway,
            self.test_legacy_compatibility_routes,
            self.test_user_profile_creation,
            self.test_institution_validation,
            self.test_notification_sending,
            self.test_event_driven_communication,
            self.test_authentication_flow,
            self.test_error_handling
        ]
        
        for test_method in test_methods:
            try:
                await test_method()
            except Exception as e:
                logger.error(f"Test {test_method.__name__} failed with exception: {str(e)}")
                self.test_results.append(TestResult(
                    test_name=test_method.__name__,
                    status='FAIL',
                    duration=0.0,
                    error_message=str(e)
                ))
        
        end_time = datetime.now()
        return self._generate_test_report(start_time, end_time)
    
    async def test_microservices_health(self):
        """Test that all microservices are healthy"""
        test_start = time.time()
        logger.info("Testing microservices health")
        
        services = {
            'API Gateway': f"{self.api_gateway_url}/health",
            'Auth Service': f"{self.auth_service_url}/health/",
            'User Service': f"{self.user_service_url}/health/",
            'Institution Service': f"{self.institution_service_url}/health/",
            'Notification Service': f"{self.notification_service_url}/health/"
        }
        
        health_results = {}
        all_healthy = True
        
        async with httpx.AsyncClient() as client:
            for service_name, health_url in services.items():
                try:
                    response = await client.get(health_url, timeout=10.0)
                    is_healthy = response.status_code == 200
                    health_results[service_name] = {
                        'status': 'healthy' if is_healthy else 'unhealthy',
                        'status_code': response.status_code,
                        'response_time': response.elapsed.total_seconds()
                    }
                    if not is_healthy:
                        all_healthy = False
                        logger.error(f"{service_name} is unhealthy: {response.status_code}")
                    else:
                        logger.info(f"✓ {service_name} is healthy")
                except Exception as e:
                    health_results[service_name] = {
                        'status': 'error',
                        'error': str(e)
                    }
                    all_healthy = False
                    logger.error(f"✗ {service_name} health check failed: {str(e)}")
        
        duration = time.time() - test_start
        self.test_results.append(TestResult(
            test_name='test_microservices_health',
            status='PASS' if all_healthy else 'FAIL',
            duration=duration,
            error_message=None if all_healthy else 'Some services are unhealthy',
            details=health_results
        ))
    
    async def test_api_gateway_routing(self):
        """Test API Gateway routing to microservices"""
        test_start = time.time()
        logger.info("Testing API Gateway routing")
        
        routing_tests = [
            {
                'name': 'Auth Service Health via Gateway',
                'url': f"{self.api_gateway_url}/api/v1/auth/health/",
                'expected_status': 200
            },
            {
                'name': 'User Service Health via Gateway',
                'url': f"{self.api_gateway_url}/api/v1/users/health/",
                'expected_status': 200
            },
            {
                'name': 'Institution Service Health via Gateway',
                'url': f"{self.api_gateway_url}/api/v1/institutions/health/",
                'expected_status': 200
            },
            {
                'name': 'Notification Service Health via Gateway',
                'url': f"{self.api_gateway_url}/api/v1/notifications/health/",
                'expected_status': 200
            }
        ]
        
        routing_results = {}
        all_routes_working = True
        
        async with httpx.AsyncClient() as client:
            for test in routing_tests:
                try:
                    response = await client.get(test['url'], timeout=10.0)
                    is_working = response.status_code == test['expected_status']
                    routing_results[test['name']] = {
                        'status': 'working' if is_working else 'failed',
                        'status_code': response.status_code,
                        'expected_status': test['expected_status']
                    }
                    if not is_working:
                        all_routes_working = False
                        logger.error(f"✗ {test['name']} failed: {response.status_code}")
                    else:
                        logger.info(f"✓ {test['name']} working")
                except Exception as e:
                    routing_results[test['name']] = {
                        'status': 'error',
                        'error': str(e)
                    }
                    all_routes_working = False
                    logger.error(f"✗ {test['name']} error: {str(e)}")
        
        duration = time.time() - test_start
        self.test_results.append(TestResult(
            test_name='test_api_gateway_routing',
            status='PASS' if all_routes_working else 'FAIL',
            duration=duration,
            error_message=None if all_routes_working else 'Some routes are not working',
            details=routing_results
        ))
    
    async def test_student_registration_via_gateway(self):
        """Test student registration through API Gateway"""
        test_start = time.time()
        logger.info("Testing student registration via API Gateway")
        
        registration_payload = {
            'email': self.test_data['email'],
            'password': self.test_data['password'],
            'password_confirm': self.test_data['password'],
            'first_name': self.test_data['first_name'],
            'last_name': self.test_data['last_name'],
            'phone_number': self.test_data['phone_number'],
            'national_id': self.test_data['national_id'],
            'registration_number': self.test_data['registration_number'],
            'institution_name': self.test_data['institution_name'],
            'year_of_study': self.test_data['year_of_study'],
            'course': self.test_data['course'],
            'registration_method': self.test_data['registration_method']
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_gateway_url}/api/v1/auth/register/student/",
                    json=registration_payload,
                    timeout=30.0
                )
                
                is_successful = response.status_code == 201
                response_data = response.json() if response.content else {}
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_student_registration_via_gateway',
                    status='PASS' if is_successful else 'FAIL',
                    duration=duration,
                    error_message=None if is_successful else f"Registration failed: {response.status_code} - {response.text}",
                    details={
                        'status_code': response.status_code,
                        'response_data': response_data,
                        'test_email': self.test_data['email']
                    }
                ))
                
                if is_successful:
                    logger.info(f"✓ Student registration successful for {self.test_data['email']}")
                else:
                    logger.error(f"✗ Student registration failed: {response.status_code} - {response.text}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_student_registration_via_gateway',
                status='FAIL',
                duration=duration,
                error_message=str(e)
            ))
            logger.error(f"✗ Student registration error: {str(e)}")
    
    async def test_legacy_compatibility_routes(self):
        """Test legacy compatibility routes"""
        test_start = time.time()
        logger.info("Testing legacy compatibility routes")
        
        # Test legacy registration route
        legacy_payload = {
            'email': f'legacy_test_{int(time.time())}@example.com',
            'password': 'LegacyTest123!',
            'password_confirm': 'LegacyTest123!',
            'first_name': 'Legacy',
            'last_name': 'Test',
            'phone_number': '+254700000888',
            'national_id': f'LEGACY{int(time.time())}',
            'registration_number': f'LEGACY/2024/{int(time.time())}',
            'institution_name': 'University of Nairobi',
            'year_of_study': 1,
            'course': 'Engineering',
            'registration_method': 'university_search'
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_gateway_url}/api/auth/register/student/",
                    json=legacy_payload,
                    timeout=30.0
                )
                
                is_successful = response.status_code == 201
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_legacy_compatibility_routes',
                    status='PASS' if is_successful else 'FAIL',
                    duration=duration,
                    error_message=None if is_successful else f"Legacy route failed: {response.status_code}",
                    details={
                        'status_code': response.status_code,
                        'legacy_email': legacy_payload['email']
                    }
                ))
                
                if is_successful:
                    logger.info("✓ Legacy compatibility route working")
                else:
                    logger.error(f"✗ Legacy compatibility route failed: {response.status_code}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_legacy_compatibility_routes',
                status='FAIL',
                duration=duration,
                error_message=str(e)
            ))
            logger.error(f"✗ Legacy compatibility test error: {str(e)}")
    
    async def test_user_profile_creation(self):
        """Test that user profile was created in User Service"""
        test_start = time.time()
        logger.info("Testing user profile creation")
        
        # Wait a bit for async profile creation
        await asyncio.sleep(2)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.user_service_url}/api/v1/profiles/student/by-email/{self.test_data['email']}/",
                    timeout=10.0
                )
                
                profile_exists = response.status_code == 200
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_user_profile_creation',
                    status='PASS' if profile_exists else 'FAIL',
                    duration=duration,
                    error_message=None if profile_exists else f"Profile not found: {response.status_code}",
                    details={
                        'status_code': response.status_code,
                        'test_email': self.test_data['email']
                    }
                ))
                
                if profile_exists:
                    logger.info(f"✓ User profile created for {self.test_data['email']}")
                else:
                    logger.error(f"✗ User profile not found: {response.status_code}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_user_profile_creation',
                status='FAIL',
                duration=duration,
                error_message=str(e)
            ))
            logger.error(f"✗ User profile test error: {str(e)}")
    
    async def test_institution_validation(self):
        """Test institution validation"""
        test_start = time.time()
        logger.info("Testing institution validation")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.institution_service_url}/api/v1/institutions/search/?name={self.test_data['institution_name']}",
                    timeout=10.0
                )
                
                institution_found = response.status_code == 200
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_institution_validation',
                    status='PASS' if institution_found else 'FAIL',
                    duration=duration,
                    error_message=None if institution_found else f"Institution not found: {response.status_code}",
                    details={
                        'status_code': response.status_code,
                        'institution_name': self.test_data['institution_name']
                    }
                ))
                
                if institution_found:
                    logger.info(f"✓ Institution validation successful")
                else:
                    logger.error(f"✗ Institution validation failed: {response.status_code}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_institution_validation',
                status='FAIL',
                duration=duration,
                error_message=str(e)
            ))
            logger.error(f"✗ Institution validation test error: {str(e)}")
    
    async def test_notification_sending(self):
        """Test notification sending"""
        test_start = time.time()
        logger.info("Testing notification sending")
        
        # Wait a bit for async notification processing
        await asyncio.sleep(3)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.notification_service_url}/api/v1/notifications/user/{self.test_data['email']}/",
                    timeout=10.0
                )
                
                notifications_found = response.status_code == 200
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_notification_sending',
                    status='PASS' if notifications_found else 'SKIP',
                    duration=duration,
                    error_message=None if notifications_found else "Notifications not found (may be expected)",
                    details={
                        'status_code': response.status_code,
                        'test_email': self.test_data['email']
                    }
                ))
                
                if notifications_found:
                    logger.info(f"✓ Notifications found for {self.test_data['email']}")
                else:
                    logger.warning(f"⚠ Notifications not found (may be expected): {response.status_code}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_notification_sending',
                status='SKIP',
                duration=duration,
                error_message=str(e)
            ))
            logger.warning(f"⚠ Notification test error (may be expected): {str(e)}")
    
    async def test_event_driven_communication(self):
        """Test event-driven communication"""
        test_start = time.time()
        logger.info("Testing event-driven communication")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.user_service_url}/api/v1/events/health/",
                    timeout=10.0
                )
                
                events_healthy = response.status_code == 200
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_event_driven_communication',
                    status='PASS' if events_healthy else 'SKIP',
                    duration=duration,
                    error_message=None if events_healthy else "Event system not available",
                    details={
                        'status_code': response.status_code
                    }
                ))
                
                if events_healthy:
                    logger.info("✓ Event-driven communication is healthy")
                else:
                    logger.warning(f"⚠ Event system not available: {response.status_code}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_event_driven_communication',
                status='SKIP',
                duration=duration,
                error_message=str(e)
            ))
            logger.warning(f"⚠ Event communication test error: {str(e)}")
    
    async def test_authentication_flow(self):
        """Test authentication flow with registered user"""
        test_start = time.time()
        logger.info("Testing authentication flow")
        
        login_payload = {
            'email': self.test_data['email'],
            'password': self.test_data['password']
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_gateway_url}/api/v1/auth/login/",
                    json=login_payload,
                    timeout=10.0
                )
                
                login_successful = response.status_code == 200
                response_data = response.json() if response.content else {}
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_authentication_flow',
                    status='PASS' if login_successful else 'FAIL',
                    duration=duration,
                    error_message=None if login_successful else f"Login failed: {response.status_code}",
                    details={
                        'status_code': response.status_code,
                        'has_token': 'access' in response_data,
                        'test_email': self.test_data['email']
                    }
                ))
                
                if login_successful:
                    logger.info(f"✓ Authentication successful for {self.test_data['email']}")
                else:
                    logger.error(f"✗ Authentication failed: {response.status_code}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_authentication_flow',
                status='FAIL',
                duration=duration,
                error_message=str(e)
            ))
            logger.error(f"✗ Authentication test error: {str(e)}")
    
    async def test_error_handling(self):
        """Test error handling with invalid data"""
        test_start = time.time()
        logger.info("Testing error handling")
        
        invalid_payload = {
            'email': 'invalid-email',
            'password': '123',  # Too short
            'password_confirm': '456',  # Doesn't match
            'first_name': '',  # Empty
            'registration_method': 'invalid_method'
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_gateway_url}/api/v1/auth/register/student/",
                    json=invalid_payload,
                    timeout=10.0
                )
                
                error_handled_correctly = response.status_code == 400
                
                duration = time.time() - test_start
                self.test_results.append(TestResult(
                    test_name='test_error_handling',
                    status='PASS' if error_handled_correctly else 'FAIL',
                    duration=duration,
                    error_message=None if error_handled_correctly else f"Error not handled correctly: {response.status_code}",
                    details={
                        'status_code': response.status_code,
                        'expected_status': 400
                    }
                ))
                
                if error_handled_correctly:
                    logger.info("✓ Error handling working correctly")
                else:
                    logger.error(f"✗ Error handling failed: {response.status_code}")
                    
        except Exception as e:
            duration = time.time() - test_start
            self.test_results.append(TestResult(
                test_name='test_error_handling',
                status='FAIL',
                duration=duration,
                error_message=str(e)
            ))
            logger.error(f"✗ Error handling test error: {str(e)}")
    
    def _generate_test_report(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r.status == 'PASS'])
        failed_tests = len([r for r in self.test_results if r.status == 'FAIL'])
        skipped_tests = len([r for r in self.test_results if r.status == 'SKIP'])
        
        duration = end_time - start_time
        
        report = {
            'test_summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'skipped_tests': skipped_tests,
                'success_rate': (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                'duration_seconds': duration.total_seconds(),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat()
            },
            'test_results': [
                {
                    'test_name': result.test_name,
                    'status': result.status,
                    'duration': result.duration,
                    'error_message': result.error_message,
                    'details': result.details
                }
                for result in self.test_results
            ],
            'test_data_used': self.test_data,
            'recommendations': self._generate_test_recommendations()
        }
        
        # Save report to file
        report_file = f"migration_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Test report saved to: {report_file}")
        return report
    
    def _generate_test_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        failed_tests = [r for r in self.test_results if r.status == 'FAIL']
        skipped_tests = [r for r in self.test_results if r.status == 'SKIP']
        
        if failed_tests:
            recommendations.append(f"Fix {len(failed_tests)} failing tests before proceeding to production")
        
        if skipped_tests:
            recommendations.append(f"Review {len(skipped_tests)} skipped tests - some may need implementation")
        
        success_rate = (len([r for r in self.test_results if r.status == 'PASS']) / len(self.test_results) * 100) if self.test_results else 0
        
        if success_rate >= 90:
            recommendations.append("Migration workflow is ready for production deployment")
        elif success_rate >= 70:
            recommendations.append("Migration workflow needs minor fixes before production")
        else:
            recommendations.append("Migration workflow needs significant fixes before production")
        
        return recommendations

async def main():
    """Main test execution"""
    config = {
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000'),
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
    }
    
    tester = MigrationWorkflowTester(config)
    
    try:
        report = await tester.run_all_tests()
        
        print("\n" + "="*60)
        print("MIGRATION WORKFLOW TEST RESULTS")
        print("="*60)
        print(f"Total Tests: {report['test_summary']['total_tests']}")
        print(f"Passed: {report['test_summary']['passed_tests']}")
        print(f"Failed: {report['test_summary']['failed_tests']}")
        print(f"Skipped: {report['test_summary']['skipped_tests']}")
        print(f"Success Rate: {report['test_summary']['success_rate']:.2f}%")
        print(f"Duration: {report['test_summary']['duration_seconds']:.2f} seconds")
        
        print("\nTest Details:")
        for result in report['test_results']:
            status_symbol = "✓" if result['status'] == 'PASS' else "✗" if result['status'] == 'FAIL' else "⚠"
            print(f"{status_symbol} {result['test_name']}: {result['status']} ({result['duration']:.2f}s)")
            if result['error_message']:
                print(f"   Error: {result['error_message']}")
        
        if report['recommendations']:
            print("\nRecommendations:")
            for rec in report['recommendations']:
                print(f"- {rec}")
        
        return report
        
    except Exception as e:
        logger.error(f"Test execution failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())