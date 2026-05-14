from unittest.mock import Mock, patch

from django.test import TestCase
from rest_framework.test import APIClient

from edulink.apps.accounts.models import User
from edulink.apps.ledger.models import LedgerEvent
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


class AccountSecurityViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="StrongPass123!",
            role=User.ROLE_STUDENT,
        )
        self.admin = User.objects.create_user(
            username="sysadmin",
            email="admin@example.com",
            password="StrongPass123!",
            role=User.ROLE_SYSTEM_ADMIN,
        )

    def test_password_reset_request_does_not_return_or_record_token(self):
        response = self.client.post(
            "/api/auth/users/reset-password/",
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("reset_token", response.data)

        event = LedgerEvent.objects.filter(
            event_type="USER_PASSWORD_RESET_REQUESTED",
            entity_id=self.user.id,
        ).latest("occurred_at")
        self.assertNotIn("reset_token", event.payload)

    def test_regular_user_cannot_list_users_or_assign_roles(self):
        self.client.force_authenticate(user=self.user)

        list_response = self.client.get("/api/auth/users/")
        role_response = self.client.post(
            f"/api/auth/users/{self.user.id}/assign_role/",
            {"role": User.ROLE_SYSTEM_ADMIN},
            format="json",
        )

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(role_response.status_code, 403)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.ROLE_STUDENT)

    def test_system_admin_can_assign_role_and_is_recorded_as_actor(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/auth/users/{self.user.id}/assign_role/",
            {"role": User.ROLE_SUPERVISOR},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.ROLE_SUPERVISOR)

        event = LedgerEvent.objects.filter(
            event_type="USER_ROLE_CHANGED",
            entity_id=self.user.id,
        ).latest("occurred_at")
        self.assertEqual(event.actor_id, self.admin.id)
