
import pytest
from unittest.mock import patch
from datetime import date
from uuid import uuid4
from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.students.models import Student
from edulink.apps.internships.models import InternshipOpportunity, InternshipApplication, ApplicationStatus
from edulink.apps.internships.services import submit_final_feedback, apply_for_internship
from edulink.apps.notifications.models import Notification
from edulink.apps.shared.error_handling import AuthorizationError

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
    # Associate user with employer (assuming logic exists or manual association)
    # In edulink, usually handled by Supervisor model or similar
    from edulink.apps.employers.models import Supervisor
    Supervisor.objects.create(employer=employer, user=user, role=Supervisor.ROLE_ADMIN, is_active=True)
    return user

@pytest.fixture
def opportunity(institution, employer):
    return InternshipOpportunity.objects.create(
        title="Software Intern",
        description="Code",
        institution_id=institution.id,
        employer_id=employer.id,
        status="OPEN",
        start_date=date(2026, 5, 4),
        end_date=date(2026, 5, 8),
    )

@pytest.fixture
def application(opportunity, student_user, employer_admin):
    # Use service to apply to ensure consistent state
    from edulink.apps.internships.services import assign_supervisors, process_application, start_internship, accept_offer
    
    app = apply_for_internship(student_user, opportunity.id)
    
    # Transition to ACTIVE
    # 1. Shortlist
    process_application(employer_admin, app.id, "shortlist")
    # 2. Accept
    accept_offer(employer_admin, app.id)
    assign_supervisors(
        employer_admin,
        application_id=app.id,
        supervisor_id=Supervisor.objects.get(user=employer_admin).id,
        type="employer",
    )
    assessor_user = User.objects.create_user(
        username="inst_assessor",
        email="inst.assessor@test.com",
        password="password",
        role=User.ROLE_SUPERVISOR,
    )
    assessor = InstitutionStaff.objects.create(
        institution_id=opportunity.institution_id,
        user=assessor_user,
        role=InstitutionStaff.ROLE_SUPERVISOR,
        is_active=True,
    )
    app.institution_supervisor_id = assessor.id
    app.save(update_fields=["institution_supervisor_id", "updated_at"])
    # 3. Start
    app = start_internship(employer_admin, app.id)
    
    return app

@pytest.mark.django_db
class TestFinalFeedback:
    
    def test_submit_final_feedback_triggers_notification(self, employer_admin, application, student_user):
        # Arrange
        feedback = "Great job!"
        rating = 5
        
        # Act
        with patch('edulink.apps.notifications.services.send_email_notification') as mock_send_email:
            mock_send_email.return_value = True
            
            submit_final_feedback(
                actor=employer_admin,
                application_id=application.id,
                feedback=feedback,
                rating=rating
            )
            
            # Assert
            # 1. Check email sent
            mock_send_email.assert_called_once()
            call_args = mock_send_email.call_args[1]
            # application.student_id is a UUID, we need the email from student_user fixture
            assert call_args['recipient_email'] == "student@test.com"
            assert call_args['template_name'] == "internship_final_feedback_submitted"
            assert call_args['context']['feedback'] == feedback
            assert call_args['context']['rating'] == rating
            
            # 2. Check notification record created
            notification = Notification.objects.filter(
                recipient_id=student_user.id,
                type=Notification.TYPE_INTERNSHIP_FINAL_FEEDBACK_SUBMITTED
            ).first()
            assert notification is not None
            assert str(notification.related_entity_id) == str(application.id)

    def test_final_feedback_is_split_by_assessment_role(self, employer_admin, application):
        assessor = User.objects.get(username="inst_assessor")

        submit_final_feedback(
            actor=employer_admin,
            application_id=application.id,
            feedback="Employer confirms strong workplace performance.",
            rating=5,
        )
        submit_final_feedback(
            actor=assessor,
            application_id=application.id,
            feedback="Institution confirms academic attachment requirements.",
            rating=4,
        )

        application.refresh_from_db()
        assert application.employer_final_feedback == "Employer confirms strong workplace performance."
        assert application.employer_final_rating == 5
        assert application.institution_final_feedback == "Institution confirms academic attachment requirements."
        assert application.institution_final_rating == 4
        assert "Employer assessment:" in application.final_feedback
        assert "Institution assessment:" in application.final_feedback
        assert application.final_rating == 4

    def test_assigned_employer_supervisor_writes_employer_assessment_lane(self, application):
        supervisor = Supervisor.objects.get(id=application.employer_supervisor_id)

        submit_final_feedback(
            actor=supervisor.user,
            application_id=application.id,
            feedback="Supervisor confirms workplace requirements were met.",
            rating=5,
        )

        application.refresh_from_db()
        assert application.employer_final_feedback == "Supervisor confirms workplace requirements were met."
        assert application.employer_final_rating == 5
        assert application.employer_final_feedback_by == supervisor.user_id
        assert application.institution_final_feedback == ""

    def test_final_feedback_is_frozen_after_certification(self, employer_admin, application):
        application.status = ApplicationStatus.CERTIFIED
        application.save(update_fields=["status", "updated_at"])

        with pytest.raises(AuthorizationError):
            submit_final_feedback(
                actor=employer_admin,
                application_id=application.id,
                feedback="Late assessment should not mutate certified records.",
                rating=5,
            )
