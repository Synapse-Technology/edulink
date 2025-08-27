"""Testing framework for microservices architecture."""

import asyncio
import json
import logging
import time
import uuid
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from dataclasses import dataclass, field
from enum import Enum

import redis
import requests
from django.test import TestCase, TransactionTestCase
from django.test.utils import override_settings
from django.core.management import call_command
from django.db import transaction


class TestType(Enum):
    """Types of tests."""
    UNIT = "unit"
    INTEGRATION = "integration"
    END_TO_END = "e2e"
    PERFORMANCE = "performance"
    SYNC = "sync"


class ServiceTestStatus(Enum):
    """Test execution status."""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class TestResult:
    """Test result data."""
    test_name: str
    test_type: TestType
    status: ServiceTestStatus
    duration: float
    error_message: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ServiceTestConfig:
    """Configuration for service testing."""
    service_name: str
    base_url: str
    auth_token: Optional[str] = None
    timeout: int = 30
    retry_count: int = 3
    retry_delay: float = 1.0


class MockEventBus:
    """Mock event bus for testing."""
    
    def __init__(self):
        self.published_events = []
        self.subscribers = {}
        self.is_connected = True
    
    def publish(self, event_type: str, data: Dict[str, Any], correlation_id: str = None):
        """Mock publish method."""
        event = {
            'event_type': event_type,
            'data': data,
            'correlation_id': correlation_id or str(uuid.uuid4()),
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'test_service'
        }
        self.published_events.append(event)
        
        # Trigger subscribers if any
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                try:
                    callback(event)
                except Exception as e:
                    logging.error(f"Error in mock event subscriber: {e}")
    
    def subscribe(self, event_type: str, callback: Callable):
        """Mock subscribe method."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
    
    def get_published_events(self, event_type: str = None) -> List[Dict[str, Any]]:
        """Get published events, optionally filtered by type."""
        if event_type:
            return [e for e in self.published_events if e['event_type'] == event_type]
        return self.published_events.copy()
    
    def clear_events(self):
        """Clear all published events."""
        self.published_events.clear()
    
    def disconnect(self):
        """Mock disconnect."""
        self.is_connected = False
    
    def connect(self):
        """Mock connect."""
        self.is_connected = True


class ServiceTestClient:
    """HTTP client for testing services."""
    
    def __init__(self, config: ServiceTestConfig):
        self.config = config
        self.session = requests.Session()
        
        # Set default headers
        if config.auth_token:
            self.session.headers.update({
                'Authorization': f'Bearer {config.auth_token}'
            })
        
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-Test-Client': 'microservices-test-framework'
        })
    
    def get(self, endpoint: str, params: Dict = None, **kwargs) -> requests.Response:
        """Make GET request."""
        return self._request('GET', endpoint, params=params, **kwargs)
    
    def post(self, endpoint: str, data: Dict = None, **kwargs) -> requests.Response:
        """Make POST request."""
        return self._request('POST', endpoint, json=data, **kwargs)
    
    def put(self, endpoint: str, data: Dict = None, **kwargs) -> requests.Response:
        """Make PUT request."""
        return self._request('PUT', endpoint, json=data, **kwargs)
    
    def patch(self, endpoint: str, data: Dict = None, **kwargs) -> requests.Response:
        """Make PATCH request."""
        return self._request('PATCH', endpoint, json=data, **kwargs)
    
    def delete(self, endpoint: str, **kwargs) -> requests.Response:
        """Make DELETE request."""
        return self._request('DELETE', endpoint, **kwargs)
    
    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with retry logic."""
        url = f"{self.config.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        for attempt in range(self.config.retry_count):
            try:
                response = self.session.request(
                    method, url, timeout=self.config.timeout, **kwargs
                )
                return response
            except requests.exceptions.RequestException as e:
                if attempt == self.config.retry_count - 1:
                    raise
                time.sleep(self.config.retry_delay * (attempt + 1))
        
        raise requests.exceptions.RequestException("Max retries exceeded")


class MicroserviceTestCase(TestCase):
    """Base test case for microservices."""
    
    def setUp(self):
        super().setUp()
        self.mock_event_bus = MockEventBus()
        self.test_results = []
        self.correlation_id = str(uuid.uuid4())
        
        # Patch event bus
        self.event_bus_patcher = patch(
            'shared.events.event_bus.EventBus',
            return_value=self.mock_event_bus
        )
        self.event_bus_patcher.start()
    
    def tearDown(self):
        super().tearDown()
        self.event_bus_patcher.stop()
    
    def assert_event_published(self, event_type: str, expected_data: Dict = None):
        """Assert that an event was published."""
        events = self.mock_event_bus.get_published_events(event_type)
        self.assertTrue(len(events) > 0, f"No events of type '{event_type}' were published")
        
        if expected_data:
            latest_event = events[-1]
            for key, value in expected_data.items():
                self.assertIn(key, latest_event['data'])
                self.assertEqual(latest_event['data'][key], value)
    
    def assert_no_event_published(self, event_type: str):
        """Assert that no event of given type was published."""
        events = self.mock_event_bus.get_published_events(event_type)
        self.assertEqual(len(events), 0, f"Unexpected events of type '{event_type}' were published")
    
    def create_test_user_data(self, **overrides) -> Dict[str, Any]:
        """Create test user data."""
        default_data = {
            'email': f'test_{uuid.uuid4().hex[:8]}@example.com',
            'password': 'TestPassword123!',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'student'
        }
        default_data.update(overrides)
        return default_data
    
    def create_test_institution_data(self, **overrides) -> Dict[str, Any]:
        """Create test institution data."""
        default_data = {
            'name': f'Test Institution {uuid.uuid4().hex[:8]}',
            'type': 'university',
            'country': 'US',
            'website': 'https://test-institution.edu',
            'is_verified': True
        }
        default_data.update(overrides)
        return default_data
    
    def wait_for_event_processing(self, timeout: float = 5.0):
        """Wait for event processing to complete."""
        time.sleep(0.1)  # Give events time to process


class SyncTestCase(TransactionTestCase):
    """Test case for testing data synchronization."""
    
    def setUp(self):
        super().setUp()
        self.mock_event_bus = MockEventBus()
        self.sync_events = []
        
        # Setup event capture
        def capture_sync_event(event):
            self.sync_events.append(event)
        
        self.mock_event_bus.subscribe('user_created', capture_sync_event)
        self.mock_event_bus.subscribe('user_updated', capture_sync_event)
        self.mock_event_bus.subscribe('user_deleted', capture_sync_event)
        self.mock_event_bus.subscribe('profile_created', capture_sync_event)
        self.mock_event_bus.subscribe('profile_updated', capture_sync_event)
        self.mock_event_bus.subscribe('profile_deleted', capture_sync_event)
        
        # Patch event bus
        self.event_bus_patcher = patch(
            'shared.events.event_bus.EventBus',
            return_value=self.mock_event_bus
        )
        self.event_bus_patcher.start()
    
    def tearDown(self):
        super().tearDown()
        self.event_bus_patcher.stop()
    
    def assert_sync_event_triggered(self, event_type: str, entity_id: str):
        """Assert that a sync event was triggered for a specific entity."""
        matching_events = [
            event for event in self.sync_events
            if event['event_type'] == event_type and 
               str(event['data'].get('id')) == str(entity_id)
        ]
        self.assertTrue(
            len(matching_events) > 0,
            f"No sync event '{event_type}' found for entity {entity_id}"
        )
    
    def clear_sync_events(self):
        """Clear captured sync events."""
        self.sync_events.clear()
        self.mock_event_bus.clear_events()


class IntegrationTestRunner:
    """Runner for integration tests across services."""
    
    def __init__(self, service_configs: Dict[str, ServiceTestConfig]):
        self.service_configs = service_configs
        self.clients = {}
        self.test_results = []
        
        # Create clients for each service
        for service_name, config in service_configs.items():
            self.clients[service_name] = ServiceTestClient(config)
    
    def run_health_checks(self) -> List[TestResult]:
        """Run health checks for all services."""
        results = []
        
        for service_name, client in self.clients.items():
            start_time = time.time()
            
            try:
                response = client.get('/health/')
                duration = time.time() - start_time
                
                if response.status_code == 200:
                    status = ServiceTestStatus.PASSED
                    error_message = None
                else:
                    status = ServiceTestStatus.FAILED
                    error_message = f"Health check failed with status {response.status_code}"
                
                result = TestResult(
                    test_name=f"{service_name}_health_check",
                    test_type=TestType.INTEGRATION,
                    status=status,
                    duration=duration,
                    error_message=error_message,
                    details={'status_code': response.status_code}
                )
                
            except Exception as e:
                duration = time.time() - start_time
                result = TestResult(
                    test_name=f"{service_name}_health_check",
                    test_type=TestType.INTEGRATION,
                    status=ServiceTestStatus.FAILED,
                    duration=duration,
                    error_message=str(e)
                )
            
            results.append(result)
        
        return results
    
    def run_authentication_flow(self) -> List[TestResult]:
        """Test authentication flow across services."""
        results = []
        
        if 'auth' not in self.clients:
            return [TestResult(
                test_name="authentication_flow",
                test_type=TestType.INTEGRATION,
                status=ServiceTestStatus.SKIPPED,
                duration=0,
                error_message="Auth service not configured"
            )]
        
        auth_client = self.clients['auth']
        start_time = time.time()
        
        try:
            # Test user registration
            user_data = {
                'email': f'test_{uuid.uuid4().hex[:8]}@example.com',
                'password': 'TestPassword123!',
                'first_name': 'Test',
                'last_name': 'User'
            }
            
            register_response = auth_client.post('/api/v1/auth/register', user_data)
            
            if register_response.status_code not in [200, 201]:
                raise Exception(f"Registration failed: {register_response.text}")
            
            # Test user login
            login_data = {
                'email': user_data['email'],
                'password': user_data['password']
            }
            
            login_response = auth_client.post('/api/v1/auth/login', login_data)
            
            if login_response.status_code != 200:
                raise Exception(f"Login failed: {login_response.text}")
            
            login_result = login_response.json()
            access_token = login_result.get('access_token')
            
            if not access_token:
                raise Exception("No access token received")
            
            # Test token validation
            validation_response = auth_client.post(
                '/api/v1/auth/validate',
                {'token': access_token}
            )
            
            if validation_response.status_code != 200:
                raise Exception(f"Token validation failed: {validation_response.text}")
            
            duration = time.time() - start_time
            
            result = TestResult(
                test_name="authentication_flow",
                test_type=TestType.INTEGRATION,
                status=ServiceTestStatus.PASSED,
                duration=duration,
                details={
                    'user_email': user_data['email'],
                    'token_received': bool(access_token)
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            result = TestResult(
                test_name="authentication_flow",
                test_type=TestType.INTEGRATION,
                status=ServiceTestStatus.FAILED,
                duration=duration,
                error_message=str(e)
            )
        
        results.append(result)
        return results
    
    def run_data_sync_test(self) -> List[TestResult]:
        """Test data synchronization between services."""
        results = []
        
        # This would require setting up test data and verifying sync
        # Implementation depends on specific sync mechanisms
        
        result = TestResult(
            test_name="data_sync_test",
            test_type=TestType.SYNC,
            status=ServiceTestStatus.SKIPPED,
            duration=0,
            error_message="Data sync test not implemented yet"
        )
        
        results.append(result)
        return results
    
    def generate_report(self, results: List[TestResult]) -> Dict[str, Any]:
        """Generate test report."""
        total_tests = len(results)
        passed_tests = len([r for r in results if r.status == ServiceTestStatus.PASSED])
        failed_tests = len([r for r in results if r.status == ServiceTestStatus.FAILED])
        skipped_tests = len([r for r in results if r.status == ServiceTestStatus.SKIPPED])
        
        total_duration = sum(r.duration for r in results)
        
        return {
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'skipped': skipped_tests,
                'success_rate': (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                'total_duration': total_duration
            },
            'results': [
                {
                    'test_name': r.test_name,
                    'test_type': r.test_type.value,
                    'status': r.status.value,
                    'duration': r.duration,
                    'error_message': r.error_message,
                    'details': r.details,
                    'timestamp': r.timestamp.isoformat()
                }
                for r in results
            ],
            'generated_at': datetime.utcnow().isoformat()
        }


class PerformanceTestRunner:
    """Runner for performance tests."""
    
    def __init__(self, client: ServiceTestClient):
        self.client = client
    
    def run_load_test(
        self,
        endpoint: str,
        concurrent_requests: int = 10,
        total_requests: int = 100,
        request_data: Dict = None
    ) -> TestResult:
        """Run load test on an endpoint."""
        start_time = time.time()
        
        try:
            # Simple load test implementation
            # In a real scenario, you'd use tools like locust or artillery
            
            response_times = []
            error_count = 0
            
            for i in range(total_requests):
                request_start = time.time()
                
                try:
                    if request_data:
                        response = self.client.post(endpoint, request_data)
                    else:
                        response = self.client.get(endpoint)
                    
                    request_duration = time.time() - request_start
                    response_times.append(request_duration)
                    
                    if response.status_code >= 400:
                        error_count += 1
                        
                except Exception:
                    error_count += 1
                    request_duration = time.time() - request_start
                    response_times.append(request_duration)
            
            total_duration = time.time() - start_time
            
            # Calculate statistics
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            min_response_time = min(response_times) if response_times else 0
            
            error_rate = (error_count / total_requests) * 100
            requests_per_second = total_requests / total_duration
            
            status = ServiceTestStatus.PASSED if error_rate < 5 else ServiceTestStatus.FAILED
            
            return TestResult(
                test_name=f"load_test_{endpoint.replace('/', '_')}",
                test_type=TestType.PERFORMANCE,
                status=status,
                duration=total_duration,
                details={
                    'total_requests': total_requests,
                    'error_count': error_count,
                    'error_rate': error_rate,
                    'avg_response_time': avg_response_time,
                    'max_response_time': max_response_time,
                    'min_response_time': min_response_time,
                    'requests_per_second': requests_per_second
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name=f"load_test_{endpoint.replace('/', '_')}",
                test_type=TestType.PERFORMANCE,
                status=ServiceTestStatus.FAILED,
                duration=duration,
                error_message=str(e)
            )


# Utility functions for test setup

def setup_test_database():
    """Setup test database with clean state."""
    call_command('migrate', verbosity=0, interactive=False)


def cleanup_test_data():
    """Cleanup test data after tests."""
    # Implementation depends on specific models
    pass


def create_test_service_configs() -> Dict[str, ServiceTestConfig]:
    """Create test service configurations."""
    return {
        'auth': ServiceTestConfig(
            service_name='auth_service',
            base_url='http://localhost:8001'
        ),
        'user': ServiceTestConfig(
            service_name='user_service',
            base_url='http://localhost:8002'
        ),
        'institution': ServiceTestConfig(
            service_name='institution_service',
            base_url='http://localhost:8003'
        ),
        'application': ServiceTestConfig(
            service_name='application_service',
            base_url='http://localhost:8004'
        ),
        'notification': ServiceTestConfig(
            service_name='notification_service',
            base_url='http://localhost:8005'
        ),
        'internship': ServiceTestConfig(
            service_name='internship_service',
            base_url='http://localhost:8006'
        )
    }