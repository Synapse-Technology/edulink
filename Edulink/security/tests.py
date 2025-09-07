from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import json

from .models import (
    SecurityEvent, UserSession, FailedLoginAttempt,
    SecurityConfiguration, AuditLog, LoginHistory, SecurityLog
)
from .utils import SecurityAnalyzer, ThreatDetector, PasswordValidator
from .serializers import SecurityEventSerializer, UserSessionSerializer

User = get_user_model()


class SecurityModelTests(TestCase):
    """Test cases for security models."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_security_event_creation(self):
        """Test SecurityEvent model creation."""
        event = SecurityEvent.objects.create(
            event_type='login_attempt',
            severity='medium',
            description='User login attempt',
            user=self.user,
            ip_address='192.168.1.1'
        )
        
        self.assertEqual(event.event_type, 'login_attempt')
        self.assertEqual(event.severity, 'medium')
        self.assertEqual(event.user, self.user)
        self.assertFalse(event.resolved)
        self.assertIsNotNone(event.timestamp)
    
    def test_user_session_creation(self):
        """Test UserSession model creation."""
        session = UserSession.objects.create(
            user=self.user,
            session_key='test_session_key_123',
            ip_address='192.168.1.1',
            user_agent='Test Browser'
        )
        
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.session_key, 'test_session_key_123')
        self.assertTrue(session.is_active)
        self.assertIsNotNone(session.created_at)
    
    def test_failed_login_attempt_creation(self):
        """Test FailedLoginAttempt model creation."""
        attempt = FailedLoginAttempt.objects.create(
            email='test@example.com',
            ip_address='192.168.1.1',
            user_agent='Test Browser'
        )
        
        self.assertEqual(attempt.email, 'test@example.com')
        self.assertEqual(attempt.ip_address, '192.168.1.1')
        self.assertIsNotNone(attempt.timestamp)
    
    def test_security_configuration_creation(self):
        """Test SecurityConfiguration model creation."""
        config = SecurityConfiguration.objects.create(
            key='max_login_attempts',
            value='5',
            description='Maximum login attempts before lockout'
        )
        
        self.assertEqual(config.key, 'max_login_attempts')
        self.assertEqual(config.value, '5')
        self.assertTrue(config.is_active)
    
    def test_audit_log_creation(self):
        """Test AuditLog model creation."""
        log = AuditLog.objects.create(
            action='create',
            user=self.user,
            resource_type='User',
            resource_id='1',
            description='User created',
            ip_address='192.168.1.1'
        )
        
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.resource_type, 'User')
        self.assertIsNotNone(log.timestamp)


class SecurityAnalyzerTests(TestCase):
    """Test cases for SecurityAnalyzer utility class."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.analyzer = SecurityAnalyzer()
    
    def test_calculate_security_score(self):
        """Test security score calculation."""
        score = self.analyzer.calculate_security_score()
        self.assertIsInstance(score, float)
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
    
    def test_security_score_with_events(self):
        """Test security score calculation with security events."""
        # Create some security events
        SecurityEvent.objects.create(
            event_type='login_attempt',
            severity='critical',
            user=self.user,
            ip_address='192.168.1.1'
        )
        
        score = self.analyzer.calculate_security_score()
        self.assertIsInstance(score, float)
    
    def test_get_security_score_trend(self):
        """Test security score trend generation."""
        trend = self.analyzer.get_security_score_trend(days=7)
        
        self.assertIsInstance(trend, list)
        self.assertEqual(len(trend), 7)
        
        for day_data in trend:
            self.assertIn('date', day_data)
            self.assertIn('score', day_data)
            self.assertGreaterEqual(day_data['score'], 0)
            self.assertLessEqual(day_data['score'], 100)
    
    def test_generate_report(self):
        """Test security report generation."""
        now = timezone.now()
        start_date = now - timedelta(days=7)
        end_date = now
        
        # Create test data
        SecurityEvent.objects.create(
            event_type='login_attempt',
            severity='medium',
            user=self.user,
            ip_address='192.168.1.1'
        )
        
        report = self.analyzer.generate_report(start_date, end_date)
        
        self.assertIn('start_date', report)
        self.assertIn('end_date', report)
        self.assertIn('event_summary', report)
        self.assertIn('user_activity', report)
        self.assertIn('threat_analysis', report)
        self.assertIn('recommendations', report)


class ThreatDetectorTests(TestCase):
    """Test cases for ThreatDetector utility class."""
    
    def setUp(self):
        self.detector = ThreatDetector()
    
    def test_detect_sql_injection(self):
        """Test SQL injection detection."""
        malicious_input = "'; DROP TABLE users; --"
        threats = self.detector.detect_threats(malicious_input, '192.168.1.1')
        
        self.assertGreater(len(threats), 0)
        self.assertTrue(any(threat['type'] == 'sql_injection' for threat in threats))
    
    def test_detect_xss_attempt(self):
        """Test XSS attempt detection."""
        malicious_input = "<script>alert('XSS')</script>"
        threats = self.detector.detect_threats(malicious_input, '192.168.1.1')
        
        self.assertGreater(len(threats), 0)
        self.assertTrue(any(threat['type'] == 'xss' for threat in threats))
    
    def test_detect_path_traversal(self):
        """Test path traversal detection."""
        malicious_input = "../../../etc/passwd"
        threats = self.detector.detect_threats(malicious_input, '192.168.1.1')
        
        self.assertGreater(len(threats), 0)
        self.assertTrue(any(threat['type'] == 'path_traversal' for threat in threats))
    
    def test_check_brute_force(self):
        """Test brute force detection."""
        email = 'test@example.com'
        ip_address = '192.168.1.1'
        
        # Create multiple failed login attempts
        for i in range(15):
            FailedLoginAttempt.objects.create(
                email=email,
                ip_address=ip_address
            )
        
        is_brute_force = self.detector.check_brute_force(email, ip_address)
        self.assertTrue(is_brute_force)
    
    def test_get_top_threats(self):
        """Test top threats retrieval."""
        # Create test security events
        SecurityEvent.objects.create(
            event_type='sql_injection',
            severity='critical',
            ip_address='192.168.1.1'
        )
        
        top_threats = self.detector.get_top_threats(days=7)
        self.assertIsInstance(top_threats, list)
    
    def test_get_active_alerts(self):
        """Test active alerts retrieval."""
        # Create a critical security event
        SecurityEvent.objects.create(
            event_type='data_breach',
            severity='critical',
            description='Potential data breach detected',
            ip_address='192.168.1.1'
        )
        
        alerts = self.detector.get_active_alerts()
        self.assertIsInstance(alerts, list)


class PasswordValidatorTests(TestCase):
    """Test cases for PasswordValidator utility class."""
    
    def setUp(self):
        self.validator = PasswordValidator()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='oldpass123'
        )
    
    def test_strong_password_validation(self):
        """Test validation of a strong password."""
        strong_password = 'StrongP@ssw0rd123!'
        errors = self.validator.validate(strong_password, self.user)
        self.assertEqual(len(errors), 0)
    
    def test_weak_password_validation(self):
        """Test validation of weak passwords."""
        weak_passwords = [
            'weak',  # Too short
            'alllowercase',  # No uppercase
            'ALLUPPERCASE',  # No lowercase
            'NoNumbers!',  # No digits
            'NoSpecialChars123',  # No special characters
            'password',  # Common password
        ]
        
        for password in weak_passwords:
            errors = self.validator.validate(password, self.user)
            self.assertGreater(len(errors), 0)
    
    def test_password_contains_email(self):
        """Test password validation when it contains user email."""
        password = 'test123!A'  # Contains 'test' from email
        errors = self.validator.validate(password, self.user)
        self.assertGreater(len(errors), 0)
        self.assertTrue(any('email' in error for error in errors))


class SecurityAPITests(APITestCase):
    """Test cases for security API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            is_superuser=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_security_dashboard_view(self):
        """Test security dashboard API endpoint."""
        url = reverse('security:security-dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_events', response.data)
        self.assertIn('unresolved_events', response.data)
        self.assertIn('recent_events', response.data)
    
    def test_security_events_list(self):
        """Test security events list API endpoint."""
        # Create test security event
        SecurityEvent.objects.create(
            event_type='login_attempt',
            severity='medium',
            user=self.user,
            ip_address='192.168.1.1'
        )
        
        url = reverse('security:security-events-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)
    
    def test_create_security_event(self):
        """Test creating security event via API."""
        url = reverse('security:security-events-list')
        data = {
            'event_type': 'suspicious_activity',
            'severity': 'high',
            'description': 'Suspicious user activity detected',
            'ip_address': '192.168.1.1'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SecurityEvent.objects.count(), 1)
    
    def test_user_sessions_list(self):
        """Test user sessions list API endpoint."""
        # Create test user session
        UserSession.objects.create(
            user=self.user,
            session_key='test_session_123',
            ip_address='192.168.1.1'
        )
        
        url = reverse('security:user-sessions-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)
    
    def test_terminate_session(self):
        """Test session termination API endpoint."""
        # Create test user session
        session = UserSession.objects.create(
            user=self.user,
            session_key='test_session_123',
            ip_address='192.168.1.1'
        )
        
        url = reverse('security:terminate-session', kwargs={'pk': session.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertFalse(session.is_active)
    
    def test_security_metrics(self):
        """Test security metrics API endpoint."""
        url = reverse('security:security-metrics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('security_score', response.data)
        self.assertIn('threat_level', response.data)
    
    def test_failed_logins_list(self):
        """Test failed login attempts list API endpoint."""
        # Create test failed login attempt
        FailedLoginAttempt.objects.create(
            email='test@example.com',
            ip_address='192.168.1.1'
        )
        
        url = reverse('security:failed-logins-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)
    
    def test_security_reports(self):
        """Test security reports API endpoint."""
        url = reverse('security:security-reports')
        response = self.client.get(url, {
            'start_date': '2023-01-01',
            'end_date': '2023-12-31'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('event_summary', response.data)
        self.assertIn('threat_analysis', response.data)
    
    def test_security_alerts(self):
        """Test security alerts API endpoint."""
        url = reverse('security:security-alerts')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('alerts', response.data)


class SecurityMiddlewareTests(TestCase):
    """Test cases for security middleware."""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    @patch('security.utils.SecurityMiddleware._check_request_security')
    def test_middleware_threat_detection(self, mock_check):
        """Test middleware threat detection."""
        # This would test the middleware's threat detection
        # In a real scenario, you'd test with actual malicious requests
        pass
    
    def test_security_headers_added(self):
        """Test that security headers are added to responses."""
        # This would test that security headers are properly added
        # You'd need to configure the middleware in test settings
        pass


class SecurityIntegrationTests(TestCase):
    """Integration tests for security features."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.client = Client()
    
    def test_failed_login_tracking(self):
        """Test that failed login attempts are properly tracked."""
        # Attempt login with wrong password
        response = self.client.post('/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        
        # Check if failed login attempt was recorded
        # This would depend on your authentication implementation
        pass
    
    def test_security_event_creation_on_suspicious_activity(self):
        """Test security event creation on suspicious activity."""
        # This would test end-to-end security event creation
        # when suspicious activity is detected
        pass
    
    def test_session_management(self):
        """Test session management and tracking."""
        # Login user
        self.client.login(email='test@example.com', password='testpass123')
        
        # Check if session is tracked
        # This would depend on your session management implementation
        pass


class SecuritySerializerTests(TestCase):
    """Test cases for security serializers."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_security_event_serializer(self):
        """Test SecurityEvent serializer."""
        event = SecurityEvent.objects.create(
            event_type='login_attempt',
            severity='medium',
            user=self.user,
            ip_address='192.168.1.1'
        )
        
        serializer = SecurityEventSerializer(event)
        data = serializer.data
        
        self.assertEqual(data['event_type'], 'login_attempt')
        self.assertEqual(data['severity'], 'medium')
        self.assertEqual(data['ip_address'], '192.168.1.1')
    
    def test_user_session_serializer(self):
        """Test UserSession serializer."""
        session = UserSession.objects.create(
            user=self.user,
            session_key='test_session_123',
            ip_address='192.168.1.1'
        )
        
        serializer = UserSessionSerializer(session)
        data = serializer.data
        
        self.assertEqual(data['session_key'], 'test_session_123')
        self.assertEqual(data['ip_address'], '192.168.1.1')
        self.assertTrue(data['is_active'])


class SecurityConfigurationTests(TestCase):
    """Test cases for security configuration management."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123'
        )
    
    def test_security_configuration_retrieval(self):
        """Test retrieving security configuration values."""
        config = SecurityConfiguration.objects.create(
            key='max_login_attempts',
            value='5',
            description='Maximum login attempts'
        )
        
        retrieved_config = SecurityConfiguration.objects.get(key='max_login_attempts')
        self.assertEqual(retrieved_config.value, '5')
        self.assertTrue(retrieved_config.is_active)
    
    def test_security_configuration_update(self):
        """Test updating security configuration values."""
        config = SecurityConfiguration.objects.create(
            key='session_timeout',
            value='3600',
            description='Session timeout in seconds'
        )
        
        config.value = '7200'
        config.save()
        
        updated_config = SecurityConfiguration.objects.get(key='session_timeout')
        self.assertEqual(updated_config.value, '7200')

    def test_login_history_creation(self):
        login_history = LoginHistory.objects.create(
            user=self.user,
            ip_address='127.0.0.1',
            user_agent='Test Browser'
        )
        self.assertEqual(login_history.user, self.user)
        self.assertEqual(login_history.ip_address, '127.0.0.1')

    def test_security_log_creation(self):
        security_log = SecurityLog.objects.create(
            user=self.user,
            action='LOGIN',
            description='User logged in successfully',
            ip_address='127.0.0.1'
        )
        self.assertEqual(security_log.user, self.user)
        self.assertEqual(security_log.action, 'LOGIN')
