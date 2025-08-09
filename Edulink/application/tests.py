import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from tests.factories import (
    UserFactory, StudentProfileFactory, EmployerProfileFactory,
    InstitutionProfileFactory, InternshipFactory, ApplicationFactory
)
from application.models import Application
from internship.models.internship import Internship


class ApplicationModelTest(TestCase):
    """Test cases for Application model"""
    
    def setUp(self):
        self.student = StudentProfileFactory()
        self.internship = InternshipFactory()
        self.application = ApplicationFactory(
            student=self.student,
            internship=self.internship
        )
    
    def test_application_creation(self):
        """Test that application is created successfully"""
        self.assertEqual(self.application.student, self.student)
        self.assertEqual(self.application.internship, self.internship)
        self.assertEqual(self.application.status, 'pending')
        self.assertIsNotNone(self.application.application_date)
    
    def test_application_str_representation(self):
        """Test string representation of application"""
        expected = f"{self.student.user.username} - {self.internship.title}"
        self.assertEqual(str(self.application), expected)
    
    def test_is_active_property(self):
        """Test is_active property for different statuses"""
        # Test accepted application
        self.application.status = 'accepted'
        self.application.save()
        self.assertTrue(self.application.is_active)
        
        # Test rejected application
        self.application.status = 'rejected'
        self.application.save()
        self.assertFalse(self.application.is_active)
        
        # Test pending application
        self.application.status = 'pending'
        self.application.save()
        self.assertFalse(self.application.is_active)
    
    def test_unique_application_constraint(self):
        """Test that student cannot apply twice for same internship"""
        with self.assertRaises(Exception):
            ApplicationFactory(
                student=self.student,
                internship=self.internship
            )


class ApplicationAPITest(APITestCase):
    """Test cases for Application API endpoints"""
    
    def setUp(self):
        self.student = StudentProfileFactory()
        self.employer = EmployerProfileFactory()
        self.internship = InternshipFactory(employer=self.employer)
        self.application = ApplicationFactory(
            student=self.student,
            internship=self.internship
        )
    
    def test_student_can_create_application(self):
        """Test that student can create application"""
        self.client.force_authenticate(user=self.student.user)
        new_internship = InternshipFactory()
        
        data = {
            'internship': new_internship.id,
            'cover_letter': 'I am very interested in this position.'
        }
        
        url = reverse('application-list')
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Application.objects.count(), 2)
    
    def test_student_can_view_own_applications(self):
        """Test that student can view their own applications"""
        self.client.force_authenticate(user=self.student.user)
        
        url = reverse('application-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_employer_can_view_applications_for_their_internships(self):
        """Test that employer can view applications for their internships"""
        self.client.force_authenticate(user=self.employer.user)
        
        url = reverse('application-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_employer_can_update_application_status(self):
        """Test that employer can update application status"""
        self.client.force_authenticate(user=self.employer.user)
        
        data = {'status': 'accepted'}
        url = reverse('application-detail', kwargs={'pk': self.application.pk})
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'accepted')
    
    def test_unauthorized_user_cannot_access_applications(self):
        """Test that unauthorized users cannot access applications"""
        url = reverse('application-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_student_cannot_apply_after_deadline(self):
        """Test that student cannot apply after internship deadline"""
        self.client.force_authenticate(user=self.student.user)
        
        # Create internship with past deadline
        past_internship = InternshipFactory(
            deadline=timezone.now().date() - timedelta(days=1)
        )
        
        data = {
            'internship': past_internship.id,
            'cover_letter': 'Late application'
        }
        
        url = reverse('application-list')
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class InternshipAccessTest(APITestCase):
    """Test cases for internship access permissions"""
    
    def setUp(self):
        self.student = StudentProfileFactory()
        self.employer = EmployerProfileFactory()
        self.internship = InternshipFactory()
    
    def test_student_access_to_internship_list(self):
        """Test that students can access internship list"""
        self.client.force_authenticate(user=self.student.user)
        url = reverse('internship_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_employer_access_to_internship_list(self):
        """Test that employers can access internship list"""
        self.client.force_authenticate(user=self.employer.user)
        url = reverse('internship_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access internship list"""
        url = reverse('internship_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@pytest.mark.django_db
class TestApplicationWorkflow:
    """Integration tests for complete application workflow"""
    
    def test_complete_application_workflow(self):
        """Test complete application workflow from creation to acceptance"""
        # Setup
        student = StudentProfileFactory()
        employer = EmployerProfileFactory()
        internship = InternshipFactory(employer=employer)
        
        # Student applies
        application = ApplicationFactory(
            student=student,
            internship=internship,
            status='pending'
        )
        
        assert application.status == 'pending'
        assert not application.is_active
        
        # Employer accepts
        application.status = 'accepted'
        application.save()
        
        assert application.status == 'accepted'
        assert application.is_active
        
        # Verify application is linked correctly
        assert application.student == student
        assert application.internship == internship
        assert application.internship.employer == employer


# Create your tests here.
