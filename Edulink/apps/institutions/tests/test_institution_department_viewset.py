from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from edulink.apps.institutions.models import Institution, Department
import uuid

class InstitutionDepartmentViewSetTest(APITestCase):
    def setUp(self):
        self.institution = Institution.objects.create(
            name="Test University",
            domain="test.edu",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_VERIFIED
        )
        self.institution2 = Institution.objects.create(
            name="Other University",
            domain="other.edu",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_VERIFIED
        )
        
        self.dept1 = Department.objects.create(
            institution=self.institution,
            name="Computer Science",
            code="CS",
            is_active=True
        )
        self.dept2 = Department.objects.create(
            institution=self.institution,
            name="Mathematics",
            code="MATH",
            is_active=True
        )
        self.dept_inactive = Department.objects.create(
            institution=self.institution,
            name="Old Dept",
            is_active=False
        )
        
        self.dept_other = Department.objects.create(
            institution=self.institution2,
            name="Physics",
            is_active=True
        )

        self.url = reverse('institution-department-list')

    def test_list_departments_without_institution_id(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_departments_with_institution_id(self):
        response = self.client.get(self.url, {'institution_id': self.institution.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        names = [d['name'] for d in response.data]
        self.assertIn("Computer Science", names)
        self.assertIn("Mathematics", names)
        self.assertNotIn("Old Dept", names) # Inactive
        self.assertNotIn("Physics", names) # Other institution

    def test_list_departments_with_invalid_institution_id(self):
        response = self.client.get(self.url, {'institution_id': uuid.uuid4()})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_search_departments(self):
        response = self.client.get(self.url, {
            'institution_id': self.institution.id,
            'search': 'Science'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Computer Science")
