import pytest

from edulink.apps.accounts.models import User
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.institutions.models import Cohort, Department, Institution, InstitutionStaff
from edulink.apps.internships.models import (
    ApplicationStatus,
    InternshipApplication,
    InternshipOpportunity,
    OpportunityStatus,
)
from edulink.apps.internships.policies import can_view_application
from edulink.apps.internships.queries import (
    get_active_placements_for_monitoring,
    get_applications_for_user,
)
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Application Visibility University",
        is_verified=True,
        status=Institution.STATUS_ACTIVE,
    )


@pytest.fixture
def department(db, institution):
    return Department.objects.create(
        institution=institution,
        name="Computer Science",
        code="CS",
    )


@pytest.fixture
def cohort(db, department):
    return Cohort.objects.create(
        department=department,
        name="2026",
        start_year=2022,
        end_year=2026,
    )


@pytest.fixture
def employer(db):
    return Employer.objects.create(
        name="Application Visibility Employer",
        trust_level=Employer.TRUST_ACTIVE_HOST,
    )


@pytest.fixture
def institution_admin(db, institution):
    user = User.objects.create_user(
        username="visibility_inst_admin",
        email="visibility.inst@example.com",
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
def employer_admin(db, employer):
    user = User.objects.create_user(
        username="visibility_emp_admin",
        email="visibility.emp@example.com",
        password="password",
        role=User.ROLE_EMPLOYER_ADMIN,
    )
    Supervisor.objects.create(
        employer_id=employer.id,
        user=user,
        role=Supervisor.ROLE_ADMIN,
        is_active=True,
    )
    return user


@pytest.fixture
def affiliated_student(db, institution, department, cohort):
    user = User.objects.create_user(
        username="visibility_student",
        email="visibility.student@example.com",
        password="password",
        role=User.ROLE_STUDENT,
    )
    student = Student.objects.create(
        user_id=user.id,
        email=user.email,
        institution_id=institution.id,
    )
    StudentInstitutionAffiliation.objects.create(
        student_id=student.id,
        institution_id=institution.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
        department_id=department.id,
        cohort_id=cohort.id,
        claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL,
    )
    return student


@pytest.fixture
def institution_application(db, institution, affiliated_student):
    opportunity = InternshipOpportunity.objects.create(
        title="Institution-owned opportunity",
        description="Institution application visibility fixture",
        institution_id=institution.id,
        status=OpportunityStatus.OPEN,
    )
    return InternshipApplication.objects.create(
        opportunity=opportunity,
        student_id=affiliated_student.id,
        status=ApplicationStatus.APPLIED,
        application_snapshot={},
    )


@pytest.fixture
def employer_application(db, employer, affiliated_student):
    opportunity = InternshipOpportunity.objects.create(
        title="Employer-owned opportunity",
        description="Employer application visibility fixture",
        employer_id=employer.id,
        status=OpportunityStatus.OPEN,
    )
    return InternshipApplication.objects.create(
        opportunity=opportunity,
        student_id=affiliated_student.id,
        status=ApplicationStatus.APPLIED,
        application_snapshot={},
    )


@pytest.mark.django_db
def test_institution_application_feed_is_limited_to_institution_owned_opportunities(
    institution_admin,
    institution_application,
    employer_application,
):
    visible_ids = set(
        get_applications_for_user(institution_admin).values_list("id", flat=True)
    )

    assert institution_application.id in visible_ids
    assert employer_application.id not in visible_ids


@pytest.mark.django_db
def test_employer_application_feed_is_limited_to_employer_owned_opportunities(
    employer_admin,
    institution_application,
    employer_application,
):
    visible_ids = set(
        get_applications_for_user(employer_admin).values_list("id", flat=True)
    )

    assert employer_application.id in visible_ids
    assert institution_application.id not in visible_ids


@pytest.mark.django_db
def test_policy_does_not_let_institution_admin_view_external_employer_application(
    institution_admin,
    employer_application,
):
    assert can_view_application(institution_admin, employer_application) is False


@pytest.mark.django_db
def test_policy_lets_institution_admin_view_institution_application(
    institution_admin,
    institution_application,
):
    assert can_view_application(institution_admin, institution_application) is True


@pytest.mark.django_db
def test_institution_placement_monitoring_excludes_application_pipeline_states(
    institution,
    employer,
    affiliated_student,
):
    statuses = [
        ApplicationStatus.APPLIED,
        ApplicationStatus.SHORTLISTED,
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.ACTIVE,
        ApplicationStatus.COMPLETED,
        ApplicationStatus.CERTIFIED,
    ]
    for status in statuses:
        opportunity = InternshipOpportunity.objects.create(
            title=f"{status.title()} placement fixture",
            description="Placement status separation fixture",
            employer_id=employer.id,
            status=OpportunityStatus.OPEN,
        )
        InternshipApplication.objects.create(
            opportunity=opportunity,
            student_id=affiliated_student.id,
            status=status,
            application_snapshot={},
        )

    placements = get_active_placements_for_monitoring(str(institution.id))
    placement_statuses = {placement["status"] for placement in placements}

    assert ApplicationStatus.APPLIED not in placement_statuses
    assert ApplicationStatus.SHORTLISTED not in placement_statuses
    assert ApplicationStatus.ACCEPTED not in placement_statuses
    assert ApplicationStatus.ACTIVE in placement_statuses
    assert ApplicationStatus.COMPLETED in placement_statuses
    assert ApplicationStatus.CERTIFIED in placement_statuses


@pytest.mark.django_db
def test_institution_placement_monitoring_supports_cohort_filter(
    institution,
    department,
    cohort,
    employer,
    affiliated_student,
):
    other_user = User.objects.create_user(
        username="visibility_other_student",
        email="visibility.other.student@example.com",
        password="password",
        role=User.ROLE_STUDENT,
    )
    other_student = Student.objects.create(
        user_id=other_user.id,
        email=other_user.email,
        institution_id=institution.id,
    )
    other_cohort = Cohort.objects.create(
        department=department,
        name="2025",
        start_year=2021,
        end_year=2025,
    )
    StudentInstitutionAffiliation.objects.create(
        student_id=other_student.id,
        institution_id=institution.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
        department_id=department.id,
        cohort_id=other_cohort.id,
        claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL,
    )

    for student, title in [
        (affiliated_student, "Requested cohort placement"),
        (other_student, "Other cohort placement"),
    ]:
        opportunity = InternshipOpportunity.objects.create(
            title=title,
            description="Placement cohort fixture",
            employer_id=employer.id,
            status=OpportunityStatus.OPEN,
        )
        InternshipApplication.objects.create(
            opportunity=opportunity,
            student_id=student.id,
            status=ApplicationStatus.ACTIVE,
            application_snapshot={},
        )

    placements = get_active_placements_for_monitoring(
        str(institution.id),
        cohort_id=str(cohort.id),
    )

    assert {placement["title"] for placement in placements} == {"Requested cohort placement"}
