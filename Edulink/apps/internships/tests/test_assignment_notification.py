
import pytest
from unittest.mock import patch
from uuid import uuid4
from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution
from edulink.apps.employers.models import Employer
from edulink.apps.students.models import Student
from edulink.apps.internships.models import InternshipOpportunity
from edulink.apps.internships.services import assign_supervisors, apply_for_internship, process_application, accept_offer
from edulink.apps.notifications.models import Notification

@pytest.fixture
def institution():
    return Institution.objects.create(name="Test Inst", is_verified=True)

@pytest.fixture
def employer():
    return Employer.objects.create(name="Test Emp")

@pytest.fixture
def student_user(institution):
    user = User.objects.create_user(username="student", email="student@test.com", password="password", role=User.ROLE_STUDENT)
    Student.objects.create(user_id=user.id, institution_id=institution.id, email=user.email)
    return user

@pytest.fixture
def employer_admin(employer):
    user = User.objects.create_user(username="emp_admin", email="emp@test.com", password="password", role=User.ROLE_EMPLOYER_ADMIN)
    from edulink.apps.employers.models import Supervisor
    Supervisor.objects.create(employer=employer, user=user, role=Supervisor.ROLE_ADMIN, is_active=True)
    return user

@pytest.fixture
def supervisor_user(employer):
    user = User.objects.create_user(username="supervisor", email="sup@test.com", password="password", role=User.ROLE_EMPLOYER_ADMIN)
    from edulink.apps.employers.models import Supervisor
    Supervisor.objects.create(employer=employer, user=user, role=Supervisor.ROLE_SUPERVISOR, is_active=True)
    return user

@pytest.fixture
def opportunity(institution, employer):
    return InternshipOpportunity.objects.create(
        title="Software Intern",
        description="Code",
        institution_id=institution.id,
        employer_id=employer.id,
        status="OPEN"
    )

@pytest.fixture
def application(opportunity, student_user, employer_admin):
    app = apply_for_internship(student_user, opportunity.id)
    # Transition to ACCEPTED (usually when assignment happens)
    process_application(employer_admin, app.id, "shortlist")
    accept_offer(employer_admin, app.id)
    return app

@pytest.mark.django_db
class TestAssignmentNotification:
    
    def test_assign_supervisor_triggers_notification(self, employer_admin, application, supervisor_user):
        # Act
        with patch('edulink.apps.notifications.services.send_email_notification') as mock_send_email:
            mock_send_email.return_value = True
            
            assign_supervisors(
                actor=employer_admin,
                application_id=application.id,
                supervisor_id=supervisor_user.id,
                type="employer"
            )
            
            # Assert
            # 1. Check email sent
            mock_send_email.assert_called_once()
            call_args = mock_send_email.call_args[1]
            assert call_args['recipient_email'] == supervisor_user.email
            assert call_args['template_name'] == "supervisor_assigned"
            assert call_args['context']['student_name'] in ["student", ""] or "student" in call_args['context']['student_name']
            
            # 2. Check notification record created
            notification = Notification.objects.filter(
                recipient_id=supervisor_user.id,
                type=Notification.TYPE_SUPERVISOR_ASSIGNED
            ).first()
            assert notification is not None
            assert str(notification.related_entity_id) == str(application.id)
