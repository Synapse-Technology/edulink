from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import LoginHistory, SecurityLog

User = get_user_model()


class SecurityModelsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )

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