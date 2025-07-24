import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta, date
from django.core.exceptions import ValidationError

from tests.factories import (
    StudentProfileFactory, EmployerProfileFactory, InternshipFactory,
    ApplicationFactory, LogbookEntryFactory, SupervisorFeedbackFactory
)
from internship_progress.models import LogbookEntry, SupervisorFeedback
from application.models import Application


class LogbookEntryModelTest(TestCase):
    """Test cases for LogbookEntry model"""
    
    def setUp(self):
        self.student = StudentProfileFactory()
        self.internship = InternshipFactory(
            start_date=date.today() - timedelta(days=14),
            end_date=date.today() + timedelta(days=76)
        )
        self.application = ApplicationFactory(
            student=self.student,
            internship=self.internship,
            status='accepted'
        )
    
    def test_logbook_entry_creation(self):
        """Test successful logbook entry creation"""
        entry = LogbookEntryFactory(
            student=self.student,
            internship=self.internship,
            week_number=1
        )
        
        self.assertEqual(entry.student, self.student)
        self.assertEqual(entry.internship, self.internship)
        self.assertEqual(entry.week_number, 1)
        self.assertEqual(entry.status, 'pending')
    
    def test_logbook_entry_str_representation(self):
        """Test string representation of logbook entry"""
        entry = LogbookEntryFactory(
            student=self.student,
            internship=self.internship,
            week_number=2
        )
        
        expected = f"{self.student.user.username} - {self.internship.title} - Week 2"
        self.assertEqual(str(entry), expected)
    
    def test_unique_week_constraint(self):
        """Test that student cannot create duplicate entries for same week"""
        LogbookEntryFactory(
            student=self.student,
            internship=self.internship,
            week_number=1
        )
        
        with self.assertRaises(Exception):
            LogbookEntryFactory(
                student=self.student,
                internship=self.internship,
                week_number=1
            )
    
    def test_is_overdue_property(self):
        """Test is_overdue property calculation"""
        # Create entry for current week (should not be overdue)
        current_week = ((date.today() - self.internship.start_date).days // 7) + 1
        entry = LogbookEntryFactory(
            student=self.student,
            internship=self.internship,
            week_number=current_week,
            status='pending'
        )
        
        # Entry for current week should not be overdue
        self.assertFalse(entry.is_overdue)
        
        # Create entry for past week (should be overdue if pending)
        if current_week > 1:
            past_entry = LogbookEntryFactory(
                student=self.student,
                internship=self.internship,
                week_number=current_week - 1,
                status='pending'
            )
            self.assertTrue(past_entry.is_overdue)


class SupervisorFeedbackModelTest(TestCase):
    """Test cases for SupervisorFeedback model"""
    
    def setUp(self):
        self.student = StudentProfileFactory()
        self.employer = EmployerProfileFactory()
        self.internship = InternshipFactory(employer=self.employer)
        self.application = ApplicationFactory(
            student=self.student,
            internship=self.internship,
            status='accepted'
        )
        self.logbook_entry = LogbookEntryFactory(
            student=self.student,
            internship=self.internship
        )
    
    def test_supervisor_feedback_creation(self):
        """Test successful supervisor feedback creation"""
        feedback = SupervisorFeedbackFactory(
            log_entry=self.logbook_entry,
            company_supervisor=self.employer
        )
        
        self.assertEqual(feedback.log_entry, self.logbook_entry)
        self.assertEqual(feedback.company_supervisor, self.employer)
        self.assertIsNotNone(feedback.public_comment)
        self.assertIsNotNone(feedback.created_at)
    
    def test_supervisor_feedback_str_representation(self):
        """Test string representation of supervisor feedback"""
        feedback = SupervisorFeedbackFactory(
            log_entry=self.logbook_entry,
            company_supervisor=self.employer
        )
        
        expected = f"Feedback for {self.logbook_entry} by {self.employer.company_name}"
        self.assertEqual(str(feedback), expected)


class LogbookEntryAPITest(APITestCase):
    """Test cases for LogbookEntry API endpoints"""
    
    def setUp(self):
        self.student = StudentProfileFactory()
        self.employer = EmployerProfileFactory()
        self.internship = InternshipFactory(
            employer=self.employer,
            start_date=date.today() - timedelta(days=7),
            end_date=date.today() + timedelta(days=83)
        )
        self.application = ApplicationFactory(
            student=self.student,
            internship=self.internship,
            status='accepted'
        )
    
    def test_student_can_create_logbook_entry(self):
        """Test that student can create logbook entry"""
        self.client.force_authenticate(user=self.student.user)
        
        data = {
            'internship': self.internship.id,
            'week_number': 1,
            'activities': 'Completed orientation and setup development environment.'
        }
        
        url = reverse('logbook-entry-list-create')
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LogbookEntry.objects.count(), 1)
    
    def test_student_can_view_own_logbook_entries(self):
        """Test that student can view their own logbook entries"""
        LogbookEntryFactory(
            student=self.student,
            internship=self.internship
        )
        
        self.client.force_authenticate(user=self.student.user)
        
        url = reverse('logbook-entry-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_unauthorized_user_cannot_access_logbook_entries(self):
        """Test that unauthorized users cannot access logbook entries"""
        url = reverse('logbook-entry-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@pytest.mark.django_db
class TestInternshipProgressWorkflow:
    """Integration tests for complete internship progress workflow"""
    
    def test_complete_progress_workflow(self):
        """Test complete workflow from application to progress tracking"""
        # Setup
        student = StudentProfileFactory()
        employer = EmployerProfileFactory()
        internship = InternshipFactory(
            employer=employer,
            start_date=date.today() - timedelta(days=7),
            end_date=date.today() + timedelta(days=83)
        )
        
        # Student applies and gets accepted
        application = ApplicationFactory(
            student=student,
            internship=internship,
            status='accepted'
        )
        
        assert application.is_active
        
        # Student creates logbook entry
        logbook_entry = LogbookEntryFactory(
            student=student,
            internship=internship,
            week_number=1,
            status='pending'
        )
        
        assert logbook_entry.student == student
        assert logbook_entry.internship == internship
        
        # Supervisor provides feedback
        feedback = SupervisorFeedbackFactory(
            log_entry=logbook_entry,
            company_supervisor=employer
        )
        
        assert feedback.log_entry == logbook_entry
        assert feedback.company_supervisor == employer
        
        # Verify relationships
        assert logbook_entry.internship.employer == employer
        assert feedback.log_entry.student == student
