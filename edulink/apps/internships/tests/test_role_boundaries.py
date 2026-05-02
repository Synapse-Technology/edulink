import pytest
from rest_framework.test import APIClient

from edulink.apps.accounts.models import User
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.institutions.policies import is_institution_staff
from edulink.apps.internships.models import (
    ApplicationStatus,
    InternshipApplication,
    InternshipOpportunity,
    OpportunityStatus,
    SupervisorAssignment,
)
from edulink.apps.internships.policies import (
    can_accept_supervisor_assignment,
    can_view_supervisor_assignment,
)
from edulink.apps.students.models import Student


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
