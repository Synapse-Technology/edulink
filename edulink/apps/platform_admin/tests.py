from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from .models import PlatformStaffProfile
from .queries import get_platform_staff_list
from .services import create_staff_invite

User = get_user_model()

class PlatformStaffQueryTests(TestCase):
    def setUp(self):
        # Create users
        self.user1 = User.objects.create_user(
            email='admin@example.com',
            username='admin@example.com',
            password='password123',
            first_name='Admin',
            last_name='User'
        )
        self.user2 = User.objects.create_user(
            email='mod@example.com',
            username='mod@example.com',
            password='password123',
            first_name='Mod',
            last_name='User'
        )
        self.user3 = User.objects.create_user(
            email='inactive@example.com',
            username='inactive@example.com',
            password='password123',
            first_name='Inactive',
            last_name='User'
        )
        
        # Create profiles
        PlatformStaffProfile.objects.create(
            user=self.user1,
            role=PlatformStaffProfile.ROLE_PLATFORM_ADMIN,
            is_active=True
        )
        PlatformStaffProfile.objects.create(
            user=self.user2,
            role=PlatformStaffProfile.ROLE_MODERATOR,
            is_active=True
        )
        PlatformStaffProfile.objects.create(
            user=self.user3,
            role=PlatformStaffProfile.ROLE_MODERATOR,
            is_active=False
        )

    def test_get_all_staff(self):
        staff = get_platform_staff_list()
        self.assertEqual(staff.count(), 3)

    def test_filter_by_role(self):
        admins = get_platform_staff_list(role=PlatformStaffProfile.ROLE_PLATFORM_ADMIN)
        self.assertEqual(admins.count(), 1)
        self.assertEqual(admins.first().user.email, 'admin@example.com')

        mods = get_platform_staff_list(role=PlatformStaffProfile.ROLE_MODERATOR)
        self.assertEqual(mods.count(), 2)

    def test_filter_by_status(self):
        active = get_platform_staff_list(status='active')
        self.assertEqual(active.count(), 2)
        
        inactive = get_platform_staff_list(status='inactive')
        self.assertEqual(inactive.count(), 1)
        self.assertEqual(inactive.first().user.email, 'inactive@example.com')

    def test_search_by_email(self):
        results = get_platform_staff_list(search='admin@')
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().user.email, 'admin@example.com')

    def test_search_by_name(self):
        results = get_platform_staff_list(search='Mod')
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().user.first_name, 'Mod')


class PlatformStaffServiceTests(TestCase):
    def setUp(self):
        self.super_admin_user = User.objects.create_user(
            email='super@example.com',
            username='super@example.com',
            password='password123'
        )
        self.super_admin_profile = PlatformStaffProfile.objects.create(
            user=self.super_admin_user,
            role=PlatformStaffProfile.ROLE_SUPER_ADMIN,
            is_active=True
        )

    @patch('edulink.apps.platform_admin.services.send_staff_invite_notification')
    @patch('edulink.apps.platform_admin.services.record_event')
    def test_create_staff_invite(self, mock_record_event, mock_send_notification):
        mock_send_notification.return_value = True
        
        invite = create_staff_invite(
            email='newstaff@example.com',
            role=PlatformStaffProfile.ROLE_MODERATOR,
            created_by=self.super_admin_user,
            note='Welcome!'
        )
        
        # Verify invite created
        self.assertEqual(invite.email, 'newstaff@example.com')
        self.assertEqual(invite.role, PlatformStaffProfile.ROLE_MODERATOR)
        
        # Verify notification sent
        mock_send_notification.assert_called_once()
        call_args = mock_send_notification.call_args[1]
        self.assertEqual(call_args['recipient_email'], 'newstaff@example.com')
        self.assertIn('invite_token', call_args)
