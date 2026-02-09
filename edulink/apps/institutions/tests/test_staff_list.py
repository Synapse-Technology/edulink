from rest_framework.test import APITestCase
from rest_framework import status
from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution, InstitutionStaff

class InstitutionStaffListTest(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(
            name="Test University",
            domain="test.edu",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_VERIFIED
        )
        self.admin_user = User.objects.create_user(
            username="inst_admin",
            email="admin@test.edu",
            password="password",
            role=User.ROLE_INSTITUTION_ADMIN
        )
        self.staff_member = InstitutionStaff.objects.create(
            institution=self.institution,
            user=self.admin_user,
            role=InstitutionStaff.ROLE_ADMIN
        )
        
        # Add another staff member
        self.other_user = User.objects.create_user(
            username="other_staff",
            email="staff@test.edu",
            password="password"
        )
        self.other_staff = InstitutionStaff.objects.create(
            institution=self.institution,
            user=self.other_user,
            role=InstitutionStaff.ROLE_MEMBER
        )
        
        self.client.force_authenticate(user=self.admin_user)

    def test_list_staff(self):
        url = "/api/institutions/institution-staff/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Verify fields
        s = response.data[0]
        self.assertIn('first_name', s)
        self.assertIn('email', s)
        self.assertIn('role_display', s)
        self.assertEqual(s['status'], 'Active')

    def test_remove_staff(self):
        # Try to remove other staff
        url = f"/api/institutions/institution-staff/{self.other_staff.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Reload and check is_active
        self.other_staff.refresh_from_db()
        self.assertFalse(self.other_staff.is_active)
        # Should NOT be deleted from DB
        self.assertTrue(InstitutionStaff.objects.filter(id=self.other_staff.id).exists())

    def test_remove_self_fail(self):
        # Try to remove self
        url = f"/api/institutions/institution-staff/{self.staff_member.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(InstitutionStaff.objects.filter(id=self.staff_member.id).exists())
