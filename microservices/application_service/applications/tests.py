from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import json

from .models import (
    Application,
    ApplicationDocument,
    SupervisorFeedback,
    ApplicationNote,
    ApplicationStatusHistory
)
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationDetailSerializer,
    ApplicationStatusUpdateSerializer,
    SupervisorFeedbackSerializer
)


class ApplicationModelTest(TestCase):
    """Test cases for Application model"""
    
    def setUp(self):
        """Set up test data"""
        self.application_data = {
            'student_id': 1,
            'internship_id': 1,
            'employer_id': 2,
            'cover_letter': 'Test cover letter',
            'resume': 'path/to/resume.pdf',
            'status': 'pending'
        }
    
    def test_application_creation(self):
        """Test application creation"""
        application = Application.objects.create(**self.application_data)
        
        self.assertEqual(application.student_id, 1)
        self.assertEqual(application.internship_id, 1)
        self.assertEqual(application.status, 'pending')
        self.assertEqual(application.previous_status, '')
        self.assertIsNotNone(application.application_date)
        self.assertEqual(application.priority_score, 50)  # Default value
    
    def test_application_str_method(self):
        """Test string representation"""
        application = Application.objects.create(**self.application_data)
        expected_str = f"Application {application.id} - Student 1 -> Internship 1 (pending)"
        self.assertEqual(str(application), expected_str)
    
    def test_is_active_property(self):
        """Test is_active property"""
        # Active status
        application = Application.objects.create(**self.application_data)
        self.assertTrue(application.is_active)
        
        # Inactive status
        application.status = 'accepted'
        application.save()
        self.assertFalse(application.is_active)
    
    def test_is_final_status_property(self):
        """Test is_final_status property"""
        application = Application.objects.create(**self.application_data)
        
        # Non-final status
        self.assertFalse(application.is_final_status)
        
        # Final status
        application.status = 'accepted'
        application.save()
        self.assertTrue(application.is_final_status)
    
    def test_days_since_application_property(self):
        """Test days_since_application property"""
        application = Application.objects.create(**self.application_data)
        
        # Should be 0 for today
        self.assertEqual(application.days_since_application, 0)
        
        # Test with older date
        application.application_date = timezone.now().date() - timedelta(days=5)
        application.save()
        self.assertEqual(application.days_since_application, 5)
    
    def test_time_in_current_status_property(self):
        """Test time_in_current_status property"""
        application = Application.objects.create(**self.application_data)
        
        # Should be close to 0 for new application
        time_diff = application.time_in_current_status
        self.assertLess(time_diff.total_seconds(), 60)  # Less than 1 minute
    
    def test_can_transition_to_method(self):
        """Test status transition validation"""
        application = Application.objects.create(**self.application_data)
        
        # Valid transitions from pending
        self.assertTrue(application.can_transition_to('under_review'))
        self.assertTrue(application.can_transition_to('withdrawn'))
        
        # Invalid transitions from pending
        self.assertFalse(application.can_transition_to('accepted'))
        self.assertFalse(application.can_transition_to('interview_scheduled'))
    
    def test_status_change_tracking(self):
        """Test status change tracking in save method"""
        application = Application.objects.create(**self.application_data)
        original_status_changed_at = application.status_changed_at
        
        # Change status
        application.status = 'under_review'
        application.save()
        
        self.assertEqual(application.previous_status, 'pending')
        self.assertGreater(application.status_changed_at, original_status_changed_at)
    
    def test_clean_method_validation(self):
        """Test clean method validation"""
        application = Application.objects.create(**self.application_data)
        
        # Test invalid status transition
        application.status = 'accepted'  # Invalid from pending
        
        with self.assertRaises(Exception):
            application.clean()


class ApplicationDocumentModelTest(TestCase):
    """Test cases for ApplicationDocument model"""
    
    def setUp(self):
        """Set up test data"""
        self.application = Application.objects.create(
            student_id=1,
            internship_id=1,
            employer_id=2,
            cover_letter='Test cover letter'
        )
    
    def test_document_creation(self):
        """Test document creation"""
        document = ApplicationDocument.objects.create(
            application=self.application,
            document_type='transcript',
            original_filename='transcript.pdf',
            file_size=1024,
            uploaded_by_id=1
        )
        
        self.assertEqual(document.application, self.application)
        self.assertEqual(document.document_type, 'transcript')
        self.assertEqual(document.file_size, 1024)
        self.assertFalse(document.is_verified)
    
    def test_document_str_method(self):
        """Test string representation"""
        document = ApplicationDocument.objects.create(
            application=self.application,
            document_type='transcript',
            original_filename='transcript.pdf',
            uploaded_by_id=1
        )
        
        expected_str = f"transcript - transcript.pdf (Application {self.application.id})"
        self.assertEqual(str(document), expected_str)


class SupervisorFeedbackModelTest(TestCase):
    """Test cases for SupervisorFeedback model"""
    
    def setUp(self):
        """Set up test data"""
        self.application = Application.objects.create(
            student_id=1,
            internship_id=1,
            employer_id=2,
            status='accepted'
        )
    
    def test_feedback_creation(self):
        """Test feedback creation"""
        feedback = SupervisorFeedback.objects.create(
            application=self.application,
            supervisor_id=3,
            feedback='Great performance',
            rating=4,
            technical_skills_rating=4,
            communication_rating=5,
            professionalism_rating=4
        )
        
        self.assertEqual(feedback.application, self.application)
        self.assertEqual(feedback.rating, 4)
        self.assertEqual(feedback.average_detailed_rating, 4.33)  # (4+5+4)/3
    
    def test_feedback_validation(self):
        """Test feedback validation"""
        # Test invalid rating
        with self.assertRaises(Exception):
            feedback = SupervisorFeedback(
                application=self.application,
                supervisor_id=3,
                rating=6  # Invalid rating > 5
            )
            feedback.clean()
    
    def test_average_detailed_rating_property(self):
        """Test average detailed rating calculation"""
        feedback = SupervisorFeedback.objects.create(
            application=self.application,
            supervisor_id=3,
            technical_skills_rating=3,
            communication_rating=4,
            professionalism_rating=5
        )
        
        expected_average = (3 + 4 + 5) / 3
        self.assertEqual(feedback.average_detailed_rating, round(expected_average, 2))


class ApplicationSerializerTest(TestCase):
    """Test cases for Application serializers"""
    
    def setUp(self):
        """Set up test data"""
        self.application_data = {
            'internship_id': 1,
            'cover_letter': 'Test cover letter',
            'resume': 'path/to/resume.pdf',
            'custom_answers': {'question1': 'answer1'},
            'source': 'web'
        }
    
    @patch('applications.serializers.InternshipServiceClient')
    def test_application_create_serializer(self, mock_internship_client):
        """Test application creation serializer"""
        # Mock internship service response
        mock_client_instance = MagicMock()
        mock_client_instance.get_internship.return_value = {
            'id': 1,
            'is_active': True,
            'can_apply': True,
            'employer_id': 2
        }
        mock_internship_client.return_value = mock_client_instance
        
        # Mock request
        request = MagicMock()
        request.user.is_authenticated = True
        request.user.id = 1
        
        serializer = ApplicationCreateSerializer(
            data=self.application_data,
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid())
        application = serializer.save()
        
        self.assertEqual(application.student_id, 1)
        self.assertEqual(application.internship_id, 1)
        self.assertEqual(application.status, 'pending')
    
    def test_application_status_update_serializer(self):
        """Test application status update serializer"""
        application = Application.objects.create(
            student_id=1,
            internship_id=1,
            employer_id=2,
            status='pending'
        )
        
        # Mock request
        request = MagicMock()
        request.user.is_authenticated = True
        request.user.id = 2
        
        update_data = {
            'status': 'under_review',
            'review_notes': 'Initial review completed'
        }
        
        serializer = ApplicationStatusUpdateSerializer(
            application,
            data=update_data,
            partial=True,
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid())
        updated_application = serializer.save()
        
        self.assertEqual(updated_application.status, 'under_review')
        self.assertEqual(updated_application.review_notes, 'Initial review completed')
        self.assertEqual(updated_application.status_changed_by_id, 2)


class ApplicationAPITest(APITestCase):
    """Test cases for Application API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Mock user authentication
        self.user_id = 1
        self.client.force_authenticate(user=MagicMock(id=self.user_id, is_authenticated=True))
        
        # Create test application
        self.application = Application.objects.create(
            student_id=self.user_id,
            internship_id=1,
            employer_id=2,
            cover_letter='Test cover letter'
        )
    
    @patch('applications.views.UserServiceClient')
    def test_list_applications(self, mock_user_client):
        """Test listing applications"""
        # Mock user service response
        mock_client_instance = MagicMock()
        mock_client_instance.get_user.return_value = {'role': 'student'}
        mock_user_client.return_value = mock_client_instance
        
        url = reverse('applications:application-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    @patch('applications.views.UserServiceClient')
    def test_retrieve_application(self, mock_user_client):
        """Test retrieving application details"""
        # Mock user service response
        mock_client_instance = MagicMock()
        mock_client_instance.get_user.return_value = {'role': 'student'}
        mock_client_instance.get_student_details.return_value = {'id': 1, 'name': 'Test Student'}
        mock_user_client.return_value = mock_client_instance
        
        url = reverse('applications:application-detail', kwargs={'pk': self.application.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.application.id)
    
    @patch('applications.views.InternshipServiceClient')
    @patch('applications.views.UserServiceClient')
    def test_create_application(self, mock_user_client, mock_internship_client):
        """Test creating new application"""
        # Mock service responses
        mock_user_instance = MagicMock()
        mock_user_instance.get_user.return_value = {'role': 'student'}
        mock_user_client.return_value = mock_user_instance
        
        mock_internship_instance = MagicMock()
        mock_internship_instance.get_internship.return_value = {
            'id': 2,
            'is_active': True,
            'can_apply': True,
            'employer_id': 3
        }
        mock_internship_client.return_value = mock_internship_instance
        
        url = reverse('applications:application-list')
        data = {
            'internship_id': 2,
            'cover_letter': 'New application cover letter',
            'source': 'web'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Application.objects.count(), 2)
    
    @patch('applications.views.UserServiceClient')
    def test_update_application_status(self, mock_user_client):
        """Test updating application status"""
        # Mock user service response
        mock_client_instance = MagicMock()
        mock_client_instance.get_user.return_value = {'role': 'employer'}
        mock_user_client.return_value = mock_client_instance
        
        # Update application to be owned by the employer
        self.application.employer_id = self.user_id
        self.application.save()
        
        url = reverse('applications:application-update-status', kwargs={'pk': self.application.id})
        data = {
            'status': 'under_review',
            'reason': 'Starting review process'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh from database
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'under_review')
    
    @patch('applications.views.UserServiceClient')
    def test_withdraw_application(self, mock_user_client):
        """Test withdrawing application"""
        # Mock user service response
        mock_client_instance = MagicMock()
        mock_client_instance.get_user.return_value = {'role': 'student'}
        mock_user_client.return_value = mock_client_instance
        
        url = reverse('applications:application-withdraw', kwargs={'pk': self.application.id})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh from database
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'withdrawn')
    
    @patch('applications.views.UserServiceClient')
    def test_schedule_interview(self, mock_user_client):
        """Test scheduling interview"""
        # Mock user service response
        mock_client_instance = MagicMock()
        mock_client_instance.get_user.return_value = {'role': 'employer'}
        mock_user_client.return_value = mock_client_instance
        
        # Update application status and employer
        self.application.status = 'under_review'
        self.application.employer_id = self.user_id
        self.application.save()
        
        url = reverse('applications:application-schedule-interview', kwargs={'pk': self.application.id})
        data = {
            'interview_date': '2024-12-31T10:00:00Z',
            'interview_type': 'video_call',
            'interview_location': 'Zoom meeting'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh from database
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'interview_scheduled')
        self.assertEqual(self.application.interview_type, 'video_call')
    
    @patch('applications.views.UserServiceClient')
    def test_application_stats(self, mock_user_client):
        """Test application statistics endpoint"""
        # Mock user service response
        mock_client_instance = MagicMock()
        mock_client_instance.get_user.return_value = {'role': 'admin'}
        mock_user_client.return_value = mock_client_instance
        
        # Create additional test applications
        Application.objects.create(
            student_id=2,
            internship_id=2,
            employer_id=2,
            status='accepted'
        )
        Application.objects.create(
            student_id=3,
            internship_id=3,
            employer_id=2,
            status='rejected'
        )
        
        url = reverse('applications:application-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_applications'], 3)
        self.assertEqual(response.data['pending_applications'], 1)
        self.assertEqual(response.data['accepted_applications'], 1)
        self.assertEqual(response.data['rejected_applications'], 1)


class SupervisorFeedbackAPITest(APITestCase):
    """Test cases for SupervisorFeedback API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Mock user authentication
        self.user_id = 3  # Supervisor
        self.client.force_authenticate(user=MagicMock(id=self.user_id, is_authenticated=True))
        
        # Create test application
        self.application = Application.objects.create(
            student_id=1,
            internship_id=1,
            employer_id=2,
            status='accepted'
        )
    
    @patch('applications.views.InternshipServiceClient')
    @patch('applications.views.UserServiceClient')
    def test_create_feedback(self, mock_user_client, mock_internship_client):
        """Test creating supervisor feedback"""
        # Mock service responses
        mock_user_instance = MagicMock()
        mock_user_instance.get_user.return_value = {'role': 'supervisor'}
        mock_user_client.return_value = mock_user_instance
        
        mock_internship_instance = MagicMock()
        mock_internship_instance.get_internship.return_value = {
            'supervisors': [self.user_id]
        }
        mock_internship_client.return_value = mock_internship_instance
        
        url = reverse('applications:supervisorfeedback-list')
        data = {
            'application': self.application.id,
            'feedback': 'Excellent work throughout the internship',
            'rating': 5,
            'technical_skills_rating': 5,
            'communication_rating': 4,
            'professionalism_rating': 5,
            'would_recommend': True,
            'strengths': 'Strong technical skills, good communication',
            'improvement_areas': 'Could improve time management'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SupervisorFeedback.objects.count(), 1)
        
        feedback = SupervisorFeedback.objects.first()
        self.assertEqual(feedback.rating, 5)
        self.assertEqual(feedback.supervisor_id, self.user_id)


class ApplicationFilterTest(TestCase):
    """Test cases for Application filters"""
    
    def setUp(self):
        """Set up test data"""
        # Create test applications with different statuses and dates
        self.app1 = Application.objects.create(
            student_id=1,
            internship_id=1,
            employer_id=2,
            status='pending',
            application_date=timezone.now().date()
        )
        
        self.app2 = Application.objects.create(
            student_id=2,
            internship_id=2,
            employer_id=2,
            status='under_review',
            application_date=timezone.now().date() - timedelta(days=5)
        )
        
        self.app3 = Application.objects.create(
            student_id=3,
            internship_id=3,
            employer_id=3,
            status='accepted',
            application_date=timezone.now().date() - timedelta(days=10)
        )
    
    def test_status_filter(self):
        """Test filtering by status"""
        from .filters import ApplicationFilter
        
        # Filter by pending status
        filter_set = ApplicationFilter({'status': 'pending'}, queryset=Application.objects.all())
        filtered_qs = filter_set.qs
        
        self.assertEqual(filtered_qs.count(), 1)
        self.assertEqual(filtered_qs.first(), self.app1)
    
    def test_date_range_filter(self):
        """Test filtering by date range"""
        from .filters import ApplicationFilter
        
        # Filter applications from last week
        week_ago = timezone.now().date() - timedelta(days=7)
        filter_set = ApplicationFilter(
            {'application_date_after': week_ago},
            queryset=Application.objects.all()
        )
        filtered_qs = filter_set.qs
        
        self.assertEqual(filtered_qs.count(), 2)  # app1 and app2
    
    def test_search_filter(self):
        """Test text search filter"""
        from .filters import ApplicationFilter
        
        # Add cover letter to one application
        self.app1.cover_letter = 'Looking for software engineering internship'
        self.app1.save()
        
        filter_set = ApplicationFilter(
            {'search': 'software engineering'},
            queryset=Application.objects.all()
        )
        filtered_qs = filter_set.qs
        
        self.assertEqual(filtered_qs.count(), 1)
        self.assertEqual(filtered_qs.first(), self.app1)
    
    def test_is_active_filter(self):
        """Test active status filter"""
        from .filters import ApplicationFilter
        
        # Filter active applications (not in final status)
        filter_set = ApplicationFilter(
            {'is_active': True},
            queryset=Application.objects.all()
        )
        filtered_qs = filter_set.qs
        
        self.assertEqual(filtered_qs.count(), 2)  # app1 and app2 (not app3 which is accepted)