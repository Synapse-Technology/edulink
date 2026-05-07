import pytest
from rest_framework.test import APIClient

from edulink.apps.accounts.models import User
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.institutions.queries import get_institution_supervisor_by_id
from edulink.apps.institutions.policies import is_institution_staff
from edulink.apps.internships.models import (
    ApplicationStatus,
    Incident,
    InternshipEvidence,
    InternshipApplication,
    InternshipOpportunity,
    OpportunityStatus,
    SupervisorAssignment,
)
from edulink.apps.internships.policies import (
    can_accept_supervisor_assignment,
    can_dismiss_incident,
    can_view_supervisor_assignment,
)
from edulink.apps.internships.serializers import InternshipApplicationSerializer
from edulink.apps.internships.serializers import InternshipEvidenceSerializer
from edulink.apps.internships.services import assign_supervisors
from edulink.apps.shared.error_handling import AuthorizationError
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Role Boundary University",
        is_verified=True,
        status=Institution.STATUS_ACTIVE,
    )


@pytest.fixture
def employer(db):
    return Employer.objects.create(
        name="Role Boundary Employer",
        trust_level=Employer.TRUST_ACTIVE_HOST,
    )


@pytest.fixture
def employer_supervisor_user(db, employer):
    user = User.objects.create_user(
        username="role_emp_supervisor",
        email="role.emp.supervisor@example.com",
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
def institution_assessor_user(db, institution):
    user = User.objects.create_user(
        username="role_inst_assessor",
        email="role.inst.assessor@example.com",
        password="password",
        role=User.ROLE_SUPERVISOR,
    )
    staff = InstitutionStaff.objects.create(
        institution=institution,
        user=user,
        role=InstitutionStaff.ROLE_SUPERVISOR,
        is_active=True,
    )
    return user, staff


@pytest.fixture
def employer_admin(db, employer):
    user = User.objects.create_user(
        username="role_emp_admin",
        email="role.emp.admin@example.com",
        password="password",
        role=User.ROLE_EMPLOYER_ADMIN,
    )
    Supervisor.objects.create(
        employer=employer,
        user=user,
        role=Supervisor.ROLE_ADMIN,
        is_active=True,
    )
    return user


@pytest.fixture
def institution_admin(db, institution):
    user = User.objects.create_user(
        username="role_inst_admin",
        email="role.inst.admin@example.com",
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
def student(db, institution):
    user = User.objects.create_user(
        username="role_student",
        email="role.student@example.com",
        password="password",
        role=User.ROLE_STUDENT,
    )
    return Student.objects.create(
        user_id=user.id,
        email=user.email,
        institution_id=institution.id,
    )


@pytest.fixture
def employer_application(db, employer, student):
    opportunity = InternshipOpportunity.objects.create(
        title="Employer placement",
        description="Role boundary fixture",
        employer_id=employer.id,
        status=OpportunityStatus.OPEN,
    )
    return InternshipApplication.objects.create(
        opportunity=opportunity,
        student_id=student.id,
        status=ApplicationStatus.ACTIVE,
        application_snapshot={"institution_id": str(student.institution_id)},
    )


@pytest.fixture
def institution_application(db, institution, student):
    opportunity = InternshipOpportunity.objects.create(
        title="Institution placement",
        description="Role boundary fixture",
        institution_id=institution.id,
        status=OpportunityStatus.OPEN,
    )
    return InternshipApplication.objects.create(
        opportunity=opportunity,
        student_id=student.id,
        status=ApplicationStatus.ACTIVE,
        application_snapshot={"institution_id": str(institution.id)},
    )


@pytest.mark.django_db
def test_employer_supervisor_is_not_institution_staff(employer_supervisor_user):
    user, _ = employer_supervisor_user

    assert is_institution_staff(user) is False


@pytest.mark.django_db
def test_institution_assessor_is_institution_staff(institution_assessor_user):
    user, _ = institution_assessor_user

    assert is_institution_staff(user) is True


@pytest.mark.django_db
def test_institution_admin_is_not_resolved_as_institution_supervisor(institution_admin):
    admin_staff = InstitutionStaff.objects.get(user=institution_admin)

    assert get_institution_supervisor_by_id(supervisor_id=admin_staff.id) is None
    assert get_institution_supervisor_by_id(supervisor_id=institution_admin.id) is None


@pytest.mark.django_db
def test_student_application_serializer_does_not_show_admin_as_institution_supervisor(
    institution_admin,
    institution_application,
):
    institution_application.institution_supervisor_id = institution_admin.id
    institution_application.save(update_fields=["institution_supervisor_id", "updated_at"])

    data = InternshipApplicationSerializer(institution_application).data

    assert data["institution_supervisor_details"] is None


@pytest.mark.django_db
def test_institution_supervisor_assignment_rejects_admin_staff(
    institution_admin,
    institution_application,
):
    admin_staff = InstitutionStaff.objects.get(user=institution_admin)

    with pytest.raises(AuthorizationError):
        assign_supervisors(
            institution_admin,
            application_id=institution_application.id,
            supervisor_id=admin_staff.id,
            type="institution",
        )


@pytest.mark.django_db
def test_institution_supervisor_assignment_normalizes_user_id_to_staff_profile_id(
    institution_admin,
    institution_application,
    institution_assessor_user,
):
    assessor_user, assessor_staff = institution_assessor_user

    application = assign_supervisors(
        institution_admin,
        application_id=institution_application.id,
        supervisor_id=assessor_user.id,
        type="institution",
    )

    assert application.institution_supervisor_id == assessor_staff.id


@pytest.mark.django_db
def test_assignment_acceptance_uses_domain_profile_id(
    employer_application,
    employer_supervisor_user,
    institution_assessor_user,
):
    employer_user, employer_supervisor = employer_supervisor_user
    institution_user, institution_staff = institution_assessor_user
    employer_assignment = SupervisorAssignment.objects.create(
        application=employer_application,
        supervisor_id=employer_supervisor.id,
        assigned_by_id=employer_user.id,
        assignment_type=SupervisorAssignment.ASSIGNMENT_EMPLOYER,
    )
    institution_assignment = SupervisorAssignment.objects.create(
        application=employer_application,
        supervisor_id=institution_staff.id,
        assigned_by_id=institution_user.id,
        assignment_type=SupervisorAssignment.ASSIGNMENT_INSTITUTION,
    )

    assert can_accept_supervisor_assignment(employer_user, employer_assignment) is True
    assert can_accept_supervisor_assignment(employer_user, institution_assignment) is False
    assert can_accept_supervisor_assignment(institution_user, institution_assignment) is True
    assert can_accept_supervisor_assignment(institution_user, employer_assignment) is False


@pytest.mark.django_db
def test_institution_assessor_can_retrieve_assigned_application_by_profile_id(
    institution_application,
    institution_assessor_user,
):
    assessor_user, assessor_staff = institution_assessor_user
    institution_application.institution_supervisor_id = assessor_staff.id
    institution_application.save(update_fields=["institution_supervisor_id", "updated_at"])

    client = APIClient()
    client.force_authenticate(user=assessor_user)
    response = client.get(f"/api/internships/applications/{institution_application.id}/")

    assert response.status_code == 200
    assert response.data["id"] == str(institution_application.id)


@pytest.mark.django_db
def test_assigned_supervisor_private_notes_are_scoped_by_domain_profile_id(
    employer_application,
    employer_supervisor_user,
    institution_assessor_user,
):
    employer_user, employer_supervisor = employer_supervisor_user
    institution_user, institution_staff = institution_assessor_user
    employer_application.employer_supervisor_id = employer_supervisor.id
    employer_application.institution_supervisor_id = institution_staff.id
    employer_application.save(update_fields=[
        "employer_supervisor_id",
        "institution_supervisor_id",
        "updated_at",
    ])
    evidence = InternshipEvidence.objects.create(
        application=employer_application,
        submitted_by=employer_application.student_id,
        title="Week 1",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        employer_private_notes="Employer-only note",
        institution_private_notes="Institution-only note",
    )

    class Request:
        def __init__(self, user):
            self.user = user

    employer_data = InternshipEvidenceSerializer(
        evidence,
        context={"request": Request(employer_user)},
    ).data
    institution_data = InternshipEvidenceSerializer(
        evidence,
        context={"request": Request(institution_user)},
    ).data

    assert "employer_private_notes" in employer_data
    assert "institution_private_notes" not in employer_data
    assert "institution_private_notes" in institution_data
    assert "employer_private_notes" not in institution_data


@pytest.mark.django_db
def test_organization_admin_private_notes_are_scoped_to_their_lane(
    employer_application,
    employer_admin,
    institution_admin,
    institution,
):
    StudentInstitutionAffiliation.objects.create(
        student_id=employer_application.student_id,
        institution_id=institution.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
        claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL,
    )
    evidence = InternshipEvidence.objects.create(
        application=employer_application,
        submitted_by=employer_application.student_id,
        title="Week 1",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        employer_private_notes="Employer-only note",
        institution_private_notes="Institution-only note",
    )

    class Request:
        def __init__(self, user):
            self.user = user

    employer_data = InternshipEvidenceSerializer(
        evidence,
        context={"request": Request(employer_admin)},
    ).data
    institution_data = InternshipEvidenceSerializer(
        evidence,
        context={"request": Request(institution_admin)},
    ).data

    assert "employer_private_notes" in employer_data
    assert "institution_private_notes" not in employer_data
    assert "institution_private_notes" in institution_data
    assert "employer_private_notes" not in institution_data


@pytest.mark.django_db
def test_employer_admin_incident_authority_is_scoped_to_own_employer(
    employer_application,
    employer_admin,
):
    other_employer = Employer.objects.create(
        name="Other Employer",
        trust_level=Employer.TRUST_ACTIVE_HOST,
    )
    other_admin = User.objects.create_user(
        username="role_other_emp_admin",
        email="role.other.emp.admin@example.com",
        password="password",
        role=User.ROLE_EMPLOYER_ADMIN,
    )
    Supervisor.objects.create(
        employer=other_employer,
        user=other_admin,
        role=Supervisor.ROLE_ADMIN,
        is_active=True,
    )
    incident = Incident.objects.create(
        application=employer_application,
        reported_by=employer_application.student_id,
        title="Workplace incident",
        description="Incident scope fixture",
        status=Incident.STATUS_OPEN,
    )

    assert can_dismiss_incident(employer_admin, incident) is True
    assert can_dismiss_incident(other_admin, incident) is False


@pytest.mark.django_db
def test_pending_evidence_for_assessor_only_includes_active_reviewable_work(
    institution_application,
    institution_assessor_user,
):
    from edulink.apps.internships.queries import get_pending_evidence_for_user

    assessor_user, assessor_staff = institution_assessor_user
    institution_application.institution_supervisor_id = assessor_staff.id
    institution_application.status = ApplicationStatus.ACTIVE
    institution_application.save(update_fields=["institution_supervisor_id", "status", "updated_at"])
    active_evidence = InternshipEvidence.objects.create(
        application=institution_application,
        submitted_by=institution_application.student_id,
        title="Active logbook",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        status=InternshipEvidence.STATUS_SUBMITTED,
    )

    completed_opportunity = InternshipOpportunity.objects.create(
        title="Completed placement",
        description="Completed role boundary fixture",
        institution_id=institution_application.opportunity.institution_id,
        status=OpportunityStatus.OPEN,
    )
    completed_application = InternshipApplication.objects.create(
        opportunity=completed_opportunity,
        student_id=institution_application.student_id,
        institution_supervisor_id=assessor_staff.id,
        status=ApplicationStatus.COMPLETED,
    )
    completed_evidence = InternshipEvidence.objects.create(
        application=completed_application,
        submitted_by=completed_application.student_id,
        title="Completed logbook",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        status=InternshipEvidence.STATUS_SUBMITTED,
    )

    pending_ids = {item.id for item in get_pending_evidence_for_user(assessor_user)}

    assert active_evidence.id in pending_ids
    assert completed_evidence.id not in pending_ids


@pytest.mark.django_db
def test_assignment_view_policy_is_scoped_to_admin_domain(
    employer_admin,
    institution_admin,
    employer_application,
    institution_application,
    employer_supervisor_user,
    institution_assessor_user,
):
    _, employer_supervisor = employer_supervisor_user
    _, institution_staff = institution_assessor_user
    employer_assignment = SupervisorAssignment.objects.create(
        application=employer_application,
        supervisor_id=employer_supervisor.id,
        assigned_by_id=employer_admin.id,
        assignment_type=SupervisorAssignment.ASSIGNMENT_EMPLOYER,
    )
    institution_assignment = SupervisorAssignment.objects.create(
        application=institution_application,
        supervisor_id=institution_staff.id,
        assigned_by_id=institution_admin.id,
        assignment_type=SupervisorAssignment.ASSIGNMENT_INSTITUTION,
    )

    assert can_view_supervisor_assignment(employer_admin, employer_assignment) is True
    assert can_view_supervisor_assignment(employer_admin, institution_assignment) is False
    assert can_view_supervisor_assignment(institution_admin, institution_assignment) is True
    assert can_view_supervisor_assignment(institution_admin, employer_assignment) is False


@pytest.mark.django_db
def test_assignment_list_is_scoped_to_admin_domain(
    employer_admin,
    institution_admin,
    employer_application,
    institution_application,
    employer_supervisor_user,
    institution_assessor_user,
):
    _, employer_supervisor = employer_supervisor_user
    _, institution_staff = institution_assessor_user
    employer_assignment = SupervisorAssignment.objects.create(
        application=employer_application,
        supervisor_id=employer_supervisor.id,
        assigned_by_id=employer_admin.id,
        assignment_type=SupervisorAssignment.ASSIGNMENT_EMPLOYER,
    )
    institution_assignment = SupervisorAssignment.objects.create(
        application=institution_application,
        supervisor_id=institution_staff.id,
        assigned_by_id=institution_admin.id,
        assignment_type=SupervisorAssignment.ASSIGNMENT_INSTITUTION,
    )
    client = APIClient()

    client.force_authenticate(user=employer_admin)
    response = client.get("/api/internships/supervisor-assignments/")
    assert response.status_code == 200
    employer_ids = {item["id"] for item in response.data["results"]} if "results" in response.data else {item["id"] for item in response.data}
    assert str(employer_assignment.id) in employer_ids
    assert str(institution_assignment.id) not in employer_ids

    client.force_authenticate(user=institution_admin)
    response = client.get("/api/internships/supervisor-assignments/")
    assert response.status_code == 200
    institution_ids = {item["id"] for item in response.data["results"]} if "results" in response.data else {item["id"] for item in response.data}
    assert str(institution_assignment.id) in institution_ids
    assert str(employer_assignment.id) not in institution_ids
