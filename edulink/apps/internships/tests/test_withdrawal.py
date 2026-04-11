"""
Test suite for internship application withdrawal functionality.
Tests the withdrawal service, policies, and API endpoints.
"""

import pytest
from uuid import uuid4
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone

from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.students.models import Student
from edulink.apps.internships.models import (
    InternshipOpportunity, InternshipApplication, OpportunityStatus, ApplicationStatus
)
from edulink.apps.internships.services import (
    create_internship_opportunity, apply_for_internship, process_application,
    accept_offer, withdraw_application
)
from edulink.apps.internships.policies import can_withdraw_application


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Test Institution",
        is_verified=True,
        status=Institution.STATUS_ACTIVE
    )


@pytest.fixture
def institution_admin(db, institution):
    user = User.objects.create_user(
        username="inst_admin",
        email="inst@test.com",
        password="password",
        role=User.ROLE_INSTITUTION_ADMIN
    )
    InstitutionStaff.objects.create(
        institution=institution,
        user=user,
        role=InstitutionStaff.ROLE_ADMIN
    )
    return user


@pytest.fixture
def employer(db):
    return Employer.objects.create(
        name="Test Employer",
        trust_level=Employer.TRUST_ACTIVE_HOST
    )


@pytest.fixture
def employer_admin(db, employer):
    user = User.objects.create_user(
        username="emp_admin",
        email="emp@test.com",
        password="password",
        role=User.ROLE_EMPLOYER_ADMIN
    )
    Supervisor.objects.create(
        employer=employer,
        user=user,
        role=Supervisor.ROLE_ADMIN,
        is_active=True
    )
    return user


@pytest.fixture
def student(db):
    user = User.objects.create_user(
        username="student_user",
        email="student@test.com",
        password="password",
        role=User.ROLE_STUDENT,
        first_name="John",
        last_name="Doe"
    )
    Student.objects.create(user_id=user.id, email=user.email)
    return user


@pytest.fixture
def opportunity(db, employer):
    return InternshipOpportunity.objects.create(
        title="Test Opportunity",
        description="Test Description",
        employer=employer,
        status=OpportunityStatus.OPEN,
        capacity=10,
        application_deadline=timezone.now() + timezone.timedelta(days=30)
    )


@pytest.fixture
def application(db, student, opportunity):
    return InternshipApplication.objects.create(
        student=student,
        opportunity=opportunity,
        status=ApplicationStatus.APPLIED,
        application_snapshot={
            "skills": [],
            "experience": "test"
        }
    )


@pytest.mark.django_db
class TestWithdrawalPolicies:
    """Test authorization policies for withdrawal."""

    def test_student_can_withdraw_own_application(self, student, application):
        """Student should be able to withdraw their own APPLIED application."""
        assert can_withdraw_application(student, application) is True

    def test_student_cannot_withdraw_active_application(self, student, application):
        """Student should not be able to withdraw ACTIVE application."""
        application.status = ApplicationStatus.ACTIVE
        application.save()
        assert can_withdraw_application(student, application) is False

    def test_student_cannot_withdraw_completed_application(self, student, application):
        """Student should not be able to withdraw COMPLETED application."""
        application.status = ApplicationStatus.COMPLETED
        application.save()
        assert can_withdraw_application(student, application) is False

    def test_student_cannot_withdraw_others_application(self, db, student, opportunity):
        """Student should not be able to withdraw another student's application."""
        other_student = User.objects.create_user(
            username="other_student",
            email="other@test.com",
            password="password",
            role=User.ROLE_STUDENT
        )
        Student.objects.create(user_id=other_student.id, email=other_student.email)
        
        other_application = InternshipApplication.objects.create(
            student=other_student,
            opportunity=opportunity,
            status=ApplicationStatus.APPLIED,
            application_snapshot={}
        )
        
        assert can_withdraw_application(student, other_application) is False

    def test_admin_can_withdraw_any_application(self, db, institution_admin, application):
        """Institution admin should be able to withdraw any application."""
        institution_admin.is_system_admin = True
        institution_admin.save()
        assert can_withdraw_application(institution_admin, application) is True


@pytest.mark.django_db
class TestWithdrawalService:
    """Test withdrawal service functionality."""

    def test_withdraw_from_applied_status(self, student, application):
        """Student should successfully withdraw from APPLIED status."""
        assert application.status == ApplicationStatus.APPLIED
        
        withdrawn_app = withdraw_application(
            actor=student,
            application_id=application.id,
            reason="Found another opportunity"
        )
        
        assert withdrawn_app.status == ApplicationStatus.WITHDRAWN
        assert withdrawn_app.metadata.get('withdrawal_reason') == "Found another opportunity"
        assert withdrawn_app.metadata.get('withdrawn_by') == 'student'

    def test_withdraw_from_shortlisted_status(self, db, student, opportunity):
        """Student should successfully withdraw from SHORTLISTED status."""
        app = InternshipApplication.objects.create(
            student=student,
            opportunity=opportunity,
            status=ApplicationStatus.SHORTLISTED,
            application_snapshot={}
        )
        
        withdrawn_app = withdraw_application(
            actor=student,
            application_id=app.id,
            reason="Not interested"
        )
        
        assert withdrawn_app.status == ApplicationStatus.WITHDRAWN

    def test_withdraw_from_accepted_status(self, db, student, opportunity):
        """Student should successfully withdraw from ACCEPTED status."""
        app = InternshipApplication.objects.create(
            student=student,
            opportunity=opportunity,
            status=ApplicationStatus.ACCEPTED,
            application_snapshot={}
        )
        
        withdrawn_app = withdraw_application(
            actor=student,
            application_id=app.id,
            reason="Decided to take another offer"
        )
        
        assert withdrawn_app.status == ApplicationStatus.WITHDRAWN

    def test_cannot_withdraw_from_active_status(self, db, student, opportunity):
        """Student should not be able to withdraw from ACTIVE status."""
        app = InternshipApplication.objects.create(
            student=student,
            opportunity=opportunity,
            status=ApplicationStatus.ACTIVE,
            application_snapshot={}
        )
        
        with pytest.raises(ValueError) as excinfo:
            withdraw_application(
                actor=student,
                application_id=app.id,
                reason="Changed my mind"
            )
        
        assert "Cannot withdraw" in str(excinfo.value)
        assert ApplicationStatus.ACTIVE in str(excinfo.value)

    def test_cannot_withdraw_from_completed_status(self, db, student, opportunity):
        """Student should not be able to withdraw from COMPLETED status."""
        app = InternshipApplication.objects.create(
            student=student,
            opportunity=opportunity,
            status=ApplicationStatus.COMPLETED,
            application_snapshot={}
        )
        
        with pytest.raises(ValueError) as excinfo:
            withdraw_application(
                actor=student,
                application_id=app.id
            )
        
        assert "Cannot withdraw" in str(excinfo.value)

    def test_cannot_withdraw_from_withdrawn_status(self, db, student, opportunity):
        """Student should not be able to withdraw an already withdrawn application."""
        app = InternshipApplication.objects.create(
            student=student,
            opportunity=opportunity,
            status=ApplicationStatus.WITHDRAWN,
            application_snapshot={}
        )
        
        with pytest.raises(ValueError):
            withdraw_application(
                actor=student,
                application_id=app.id
            )

    def test_withdrawal_sets_metadata(self, student, application):
        """Withdrawal should properly set metadata fields."""
        reason = "Changed my mind"
        withdrawn_app = withdraw_application(
            actor=student,
            application_id=application.id,
            reason=reason
        )
        
        assert withdrawn_app.metadata['withdrawal_reason'] == reason
        assert withdrawn_app.metadata['withdrawn_by'] == 'student'
        assert 'withdrawn_at' in withdrawn_app.metadata

    def test_withdrawal_without_reason(self, student, application):
        """Withdrawal should work without providing a reason."""
        withdrawn_app = withdraw_application(
            actor=student,
            application_id=application.id
        )
        
        assert withdrawn_app.status == ApplicationStatus.WITHDRAWN

    def test_unauthorized_withdrawal(self, db, student, opportunity):
        """Unauthorized user should not be able to withdraw application."""
        app = InternshipApplication.objects.create(
            student=student,
            opportunity=opportunity,
            status=ApplicationStatus.APPLIED,
            application_snapshot={}
        )
        
        other_student = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="password",
            role=User.ROLE_STUDENT
        )
        Student.objects.create(user_id=other_student.id, email=other_student.email)
        
        with pytest.raises(PermissionError):
            withdraw_application(
                actor=other_student,
                application_id=app.id
            )


@pytest.mark.django_db
class TestWithdrawalAPI:
    """Test withdrawal API endpoint."""

    def test_student_can_withdraw_via_api(self, api_client, student, application):
        """Student should be able to withdraw application via API."""
        api_client.force_authenticate(user=student)
        
        url = reverse('internshipapplication-withdraw', kwargs={'pk': application.id})
        response = api_client.post(url, {
            'reason': 'Found another opportunity'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == ApplicationStatus.WITHDRAWN

    def test_student_cannot_withdraw_via_api_unauthorized(self, api_client, db, student, opportunity):
        """Student should not be able to withdraw another student's application via API."""
        other_student = User.objects.create_user(
            username="other_student",
            email="other@test.com",
            password="password",
            role=User.ROLE_STUDENT
        )
        Student.objects.create(user_id=other_student.id, email=other_student.email)
        
        app = InternshipApplication.objects.create(
            student=other_student,
            opportunity=opportunity,
            status=ApplicationStatus.APPLIED,
            application_snapshot={}
        )
        
        api_client.force_authenticate(user=student)
        url = reverse('internshipapplication-withdraw', kwargs={'pk': app.id})
        response = api_client.post(url, {'reason': 'Test'}, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_withdrawal_via_api_without_reason(self, api_client, student, application):
        """Withdrawal via API should work without reason."""
        api_client.force_authenticate(user=student)
        
        url = reverse('internshipapplication-withdraw', kwargs={'pk': application.id})
        response = api_client.post(url, {}, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == ApplicationStatus.WITHDRAWN

    def test_cannot_withdraw_active_via_api(self, api_client, db, student, opportunity):
        """API should reject withdrawal from ACTIVE status."""
        app = InternshipApplication.objects.create(
            student=student,
            opportunity=opportunity,
            status=ApplicationStatus.ACTIVE,
            application_snapshot={}
        )
        
        api_client.force_authenticate(user=student)
        url = reverse('internshipapplication-withdraw', kwargs={'pk': app.id})
        response = api_client.post(url, {'reason': 'Test'}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
