import pytest

from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.internships.models import (
    ApplicationStatus,
    ExternalPlacementDeclaration,
    InternshipOpportunity,
)
from edulink.apps.internships.policies import can_submit_evidence, can_view_application
from edulink.apps.internships.queries import (
    get_active_placements_for_monitoring,
    get_applications_for_user,
)
from edulink.apps.internships.services import (
    approve_external_placement_declaration,
    declare_external_placement,
)
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="External Placement University",
        is_verified=True,
        status=Institution.STATUS_ACTIVE,
    )


@pytest.fixture
def institution_admin(db, institution):
    user = User.objects.create_user(
        username="external_inst_admin",
        email="external.inst.admin@example.com",
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
def student_user(db, institution):
    user = User.objects.create_user(
        username="external_student",
        email="external.student@example.com",
        password="password",
        role=User.ROLE_STUDENT,
        is_email_verified=True,
    )
    student = Student.objects.create(
        user_id=user.id,
        email=user.email,
        institution_id=institution.id,
        course_of_study="Computer Science",
    )
    StudentInstitutionAffiliation.objects.create(
        student_id=student.id,
        institution_id=institution.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
        claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL,
    )
    return user, student


@pytest.mark.django_db
def test_student_declares_external_placement_for_approved_institution(student_user, institution):
    user, student = student_user

    declaration = declare_external_placement(
        actor=user,
        institution_id=institution.id,
        company_name="External Company",
        role_title="Software Intern",
        start_date="2026-05-01",
        location="Nairobi",
    )

    assert declaration.student_id == student.id
    assert declaration.institution_id == institution.id
    assert declaration.status == ExternalPlacementDeclaration.STATUS_PENDING


@pytest.mark.django_db
def test_external_placement_approval_creates_active_institution_verified_placement(
    student_user,
    institution,
    institution_admin,
):
    user, student = student_user
    declaration = declare_external_placement(
        actor=user,
        institution_id=institution.id,
        company_name="External Company",
        role_title="Software Intern",
        start_date="2026-05-01",
        source_url="https://example.com/internship",
    )

    approved = approve_external_placement_declaration(
        actor=institution_admin,
        declaration_id=declaration.id,
        review_notes="Offer letter verified.",
    )

    assert approved.status == ExternalPlacementDeclaration.STATUS_APPROVED
    assert approved.application is not None
    assert approved.application.status == ApplicationStatus.ACTIVE
    assert approved.application.student_id == student.id
    assert approved.application.opportunity.origin == InternshipOpportunity.ORIGIN_EXTERNAL_STUDENT_DECLARED
    assert approved.application.opportunity.application_mode == InternshipOpportunity.APPLICATION_EXTERNAL
    assert approved.application.opportunity.external_employer_name == "External Company"
    assert approved.application.application_snapshot["employer_review"] == "UNAVAILABLE_UNTIL_EMPLOYER_LINKED"
    assert can_submit_evidence(user, approved.application) is True


@pytest.mark.django_db
def test_external_placement_is_monitoring_visible_but_not_application_workflow_visible(
    student_user,
    institution,
    institution_admin,
):
    user, _ = student_user
    declaration = declare_external_placement(
        actor=user,
        institution_id=institution.id,
        company_name="External Company",
        role_title="Software Intern",
        start_date="2026-05-01",
    )
    approved = approve_external_placement_declaration(
        actor=institution_admin,
        declaration_id=declaration.id,
    )

    application_ids = {str(app.id) for app in get_applications_for_user(institution_admin)}
    placements = get_active_placements_for_monitoring(str(institution.id))

    assert str(approved.application.id) not in application_ids
    assert can_view_application(institution_admin, approved.application) is False
    assert {str(placement["id"]) for placement in placements} == {str(approved.application.id)}
