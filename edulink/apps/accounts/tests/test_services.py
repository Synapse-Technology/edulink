from unittest.mock import Mock, patch

from django.test import TestCase

from edulink.apps.accounts.services import create_user, generate_unique_username
from edulink.apps.shared.error_handling import ValidationError


class AccountServiceTests(TestCase):
    def test_generate_unique_username_uses_edulink_prefix(self):
        with patch('edulink.apps.accounts.services.secrets.choice', side_effect=list('ABC123')):
            with patch('edulink.apps.accounts.services.User.objects.filter') as mock_filter:
                mock_filter.return_value.exists.return_value = False

                username = generate_unique_username()

        self.assertEqual(username, 'EDULINK-USR-ABC123')
        self.assertTrue(username.startswith('EDULINK-USR-'))

    def test_create_user_raises_validation_error_for_duplicate_username(self):
        existing = Mock()
        existing.exists.return_value = True

        with patch('edulink.apps.accounts.services.User.objects.filter', return_value=existing):
            with self.assertRaises(ValidationError) as context_manager:
                create_user(
                    email='student@example.com',
                    password='StrongPass123!',
                    username='EDULINK-USR-ABC123',
                )

        self.assertIn('validation_errors', context_manager.exception.context)
        self.assertEqual(
            context_manager.exception.context['validation_errors']['username'],
            ['A user with that username already exists.'],
        )
