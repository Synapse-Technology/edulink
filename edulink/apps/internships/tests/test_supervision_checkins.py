import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from edulink.apps.accounts.models import User
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.internships.models import (
    ApplicationStatus,
    InternshipApplication,
    InternshipOpportunity,
    OpportunityStatus,
    SupervisionCheckIn,
)
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Remote Supervision University",
        is_verified=True,
        status=Institution.STATUS_ACTIVE,
    )


@pytest.fixture
def employer(db):
    return Employer.objects.create(
        name="Remote Supervision Host",
        trust_level=Employer.TRUST_ACTIVE_HOST,
    )


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        username="checkin_student",
        email="checkin.student@example.com",
        password="password",
        role=User.ROLE_STUDENT,
    )


@pytest.fixture
def student(db, institution, student_user):
    student = Student.objects.create(
        user_id=student_user.id,
        email=student_user.email,
        institution_id=institution.id,
    )
    StudentInstitutionAffiliation.objects.create(
        student_id=student.id,
        institution_id=institution.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
        claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL,
    )
    return student


@pytest.fixture
def supervisor_user(db, employer):
    user = User.objects.create_user(
        username="checkin_supervisor",
        email="checkin.supervisor@example.com",
        password="password",
        role=User.ROLE_SUPERVISOR,
    )
    supervisor = Supervisor.objects.create(
        employer=employer,
        user=user,
        role=Supervisor.ROLE_SUPERVISOR,
        is_active=True,
    )
    return user, supervisor


@pytest.fixture
def institution_admin(db, institution):
    user = User.objects.create_user(
        username="checkin_inst_admin",
        email="checkin.inst.admin@example.com",
        password="password",
        role=User.ROLE_INSTITUTION_ADMIN,
    )
    InstitutionStaff.objects.create(
        institution=institution,
        user=user,
        role=InstitutionStaff.ROLE_ADMIN,
        is_active=True,
    )
    return user


@pytest.fixture
def application(db, employer, institution, student, supervisor_user):
    _, supervisor = supervisor_user
    opportunity = InternshipOpportunity.objects.create(
        title="Active attachment",
        description="Remote supervision fixture",
        employer_id=employer.id,
        status=OpportunityStatus.OPEN,
    )
    return InternshipApplication.objects.create(
        opportunity=opportunity,
        student_id=student.id,
        employer_supervisor_id=supervisor.id,
        status=ApplicationStatus.ACTIVE,
        application_snapshot={"institution_id": str(institution.id)},
    )


@pytest.mark.django_db
def test_supervisor_schedules_checkin_and_student_cannot_see_private_notes(application, supervisor_user, student_user):
    supervisor_user, _ = supervisor_user
    client = APIClient()
    client.force_authenticate(user=supervisor_user)

    response = client.post(
        f"/api/internships/applications/{application.id}/supervision-checkins/",
        {
            "scheduled_for": (timezone.now() + timezone.timedelta(days=2)).isoformat(),
            "mode": SupervisionCheckIn.MODE_VIRTUAL,
            "meeting_url": "https://meet.example.com/session",
            "supervisor_notes": "Discuss logbook progress.",
            "private_notes": "Student needs closer institution follow-up.",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["private_notes"] == "Student needs closer institution follow-up."

    client.force_authenticate(user=student_user)
    list_response = client.get(f"/api/internships/applications/{application.id}/supervision-checkins/")

    assert list_response.status_code == 200
    assert len(list_response.data) == 1
    assert "private_notes" not in list_response.data[0]


@pytest.mark.django_db
def test_student_confirms_own_checkin(application, supervisor_user, student_user):
    supervisor_user, _ = supervisor_user
    checkin = SupervisionCheckIn.objects.create(
        application=application,
        scheduled_for=timezone.now() + timezone.timedelta(days=1),
        scheduled_by=supervisor_user.id,
        private_notes="Hidden note",
    )

    client = APIClient()
    client.force_authenticate(user=student_user)
    response = client.post(
        f"/api/internships/applications/{application.id}/supervision-checkins/{checkin.id}/confirm/",
        {},
        format="json",
    )

    assert response.status_code == 200
    checkin.refresh_from_db()
    assert checkin.student_confirmed_at is not None
    assert "private_notes" not in response.data


@pytest.mark.django_db
def test_institution_admin_can_monitor_affiliated_student_checkins(application, institution_admin, supervisor_user):
    supervisor_user, _ = supervisor_user
    SupervisionCheckIn.objects.create(
        application=application,
        scheduled_for=timezone.now() + timezone.timedelta(days=1),
        scheduled_by=supervisor_user.id,
        private_notes="Institution-only context",
    )

    client = APIClient()
    client.force_authenticate(user=institution_admin)
    response = client.get(f"/api/internships/applications/{application.id}/supervision-checkins/")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["private_notes"] == "Institution-only context"
    assert response.data[0]["can_cancel"] is False


@pytest.mark.django_db
def test_institution_admin_cannot_cancel_employer_owned_checkin(application, institution_admin, supervisor_user):
    supervisor_user, _ = supervisor_user
    checkin = SupervisionCheckIn.objects.create(
        application=application,
        scheduled_for=timezone.now() + timezone.timedelta(days=1),
        scheduled_by=supervisor_user.id,
        metadata={"owner_side": "EMPLOYER"},
    )

    client = APIClient()
    client.force_authenticate(user=institution_admin)

    response = client.post(
        f"/api/internships/applications/{application.id}/supervision-checkins/{checkin.id}/cancel/",
        {"reason": "Institution wants a different time"},
        format="json",
    )

    assert response.status_code == 403
    checkin.refresh_from_db()
    assert checkin.status == SupervisionCheckIn.STATUS_SCHEDULED


@pytest.mark.django_db
def test_unrelated_student_cannot_view_or_confirm_checkin(application, supervisor_user):
    supervisor_user, _ = supervisor_user
    unrelated = User.objects.create_user(
        username="checkin_other_student",
        email="checkin.other.student@example.com",
        password="password",
        role=User.ROLE_STUDENT,
    )
    checkin = SupervisionCheckIn.objects.create(
        application=application,
        scheduled_for=timezone.now() + timezone.timedelta(days=1),
        scheduled_by=supervisor_user.id,
    )

    client = APIClient()
    client.force_authenticate(user=unrelated)

    list_response = client.get(f"/api/internships/applications/{application.id}/supervision-checkins/")
    confirm_response = client.post(
        f"/api/internships/applications/{application.id}/supervision-checkins/{checkin.id}/confirm/",
        {},
        format="json",
    )

    assert list_response.status_code == 200
    assert list_response.data == []
    assert confirm_response.status_code == 403
