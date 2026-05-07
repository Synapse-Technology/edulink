from datetime import date

import pytest

from edulink.apps.accounts.models import User
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.internships.models import (
    ApplicationStatus,
    InternshipApplication,
    InternshipEvidence,
    InternshipOpportunity,
    OpportunityStatus,
)
from edulink.apps.internships.services import (
    assign_supervisors,
    complete_internship,
    get_completion_readiness,
    review_evidence,
    resubmit_evidence,
    start_internship,
    submit_evidence,
)
from edulink.apps.shared.error_handling import ValidationError
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


@pytest.fixture
def attachment_context(db):
    institution = Institution.objects.create(
        name="Attachment University",
        is_verified=True,
        status=Institution.STATUS_ACTIVE,
    )
    employer = Employer.objects.create(
        name="Attachment Host",
        trust_level=Employer.TRUST_ACTIVE_HOST,
    )
    employer_admin = User.objects.create_user(
        username="attachment_emp_admin",
        email="attachment.emp.admin@example.com",
        password="password",
        role=User.ROLE_EMPLOYER_ADMIN,
    )
    Supervisor.objects.create(
        employer=employer,
        user=employer_admin,
        role=Supervisor.ROLE_ADMIN,
        is_active=True,
    )
    employer_supervisor_user = User.objects.create_user(
        username="attachment_emp_supervisor",
        email="attachment.emp.supervisor@example.com",
        password="password",
        role=User.ROLE_SUPERVISOR,
    )
    employer_supervisor = Supervisor.objects.create(
        employer=employer,
        user=employer_supervisor_user,
        role=Supervisor.ROLE_SUPERVISOR,
        is_active=True,
    )
    institution_admin = User.objects.create_user(
        username="attachment_inst_admin",
        email="attachment.inst.admin@example.com",
        password="password",
        role=User.ROLE_INSTITUTION_ADMIN,
    )
    InstitutionStaff.objects.create(
        institution=institution,
        user=institution_admin,
        role=InstitutionStaff.ROLE_ADMIN,
        is_active=True,
    )
    institution_assessor_user = User.objects.create_user(
        username="attachment_inst_assessor",
        email="attachment.inst.assessor@example.com",
        password="password",
        role=User.ROLE_SUPERVISOR,
    )
    institution_assessor = InstitutionStaff.objects.create(
        institution=institution,
        user=institution_assessor_user,
        role=InstitutionStaff.ROLE_SUPERVISOR,
        is_active=True,
    )
    student_user = User.objects.create_user(
        username="attachment_student",
        email="attachment.student@example.com",
        password="password",
        role=User.ROLE_STUDENT,
    )
    student = Student.objects.create(
        user_id=student_user.id,
        email=student_user.email,
        institution_id=institution.id,
    )
    StudentInstitutionAffiliation.objects.create(
        student_id=student.id,
        institution_id=institution.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
    )

    return {
        "institution": institution,
        "employer": employer,
        "employer_admin": employer_admin,
        "employer_supervisor_user": employer_supervisor_user,
        "employer_supervisor": employer_supervisor,
        "institution_admin": institution_admin,
        "institution_assessor_user": institution_assessor_user,
        "institution_assessor": institution_assessor,
        "student_user": student_user,
        "student": student,
    }


def make_application(context, *, status=ApplicationStatus.ACCEPTED, start_date=None, end_date=None):
    opportunity = InternshipOpportunity.objects.create(
        title="Software Attachment",
        description="Attachment fixture",
        employer_id=context["employer"].id,
        institution_id=context["institution"].id,
        status=OpportunityStatus.CLOSED,
        start_date=start_date,
        end_date=end_date,
    )
    return InternshipApplication.objects.create(
        opportunity=opportunity,
        student_id=context["student"].id,
        status=status,
        application_snapshot={"institution_id": str(context["institution"].id)},
    )


@pytest.mark.django_db
def test_start_internship_requires_dates_and_required_supervisors(attachment_context):
    application = make_application(attachment_context)

    with pytest.raises(ValidationError):
        start_internship(attachment_context["employer_admin"], application.id)

    application.opportunity.start_date = date(2026, 5, 4)
    application.opportunity.end_date = date(2026, 5, 15)
    application.opportunity.save(update_fields=["start_date", "end_date", "updated_at"])
    assign_supervisors(
        attachment_context["employer_admin"],
        application_id=application.id,
        supervisor_id=attachment_context["employer_supervisor_user"].id,
        type="employer",
    )
    assign_supervisors(
        attachment_context["institution_admin"],
        application_id=application.id,
        supervisor_id=attachment_context["institution_assessor_user"].id,
        type="institution",
    )

    application = start_internship(attachment_context["employer_admin"], application.id)

    assert application.status == ApplicationStatus.ACTIVE


@pytest.mark.django_db
def test_revision_resubmission_updates_existing_evidence(attachment_context):
    application = make_application(
        attachment_context,
        status=ApplicationStatus.ACTIVE,
        start_date=date(2026, 5, 4),
        end_date=date(2026, 5, 8),
    )
    assign_supervisors(
        attachment_context["employer_admin"],
        application_id=application.id,
        supervisor_id=attachment_context["employer_supervisor_user"].id,
        type="employer",
    )

    evidence = submit_evidence(
        attachment_context["student_user"],
        application_id=application.id,
        title="Week 1",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        metadata={"week_start_date": "2026-05-04", "entries": {"2026-05-04": "Initial work"}},
    )
    review_evidence(
        attachment_context["employer_supervisor_user"],
        evidence_id=evidence.id,
        application_id=application.id,
        status=InternshipEvidence.STATUS_REVISION_REQUIRED,
        notes="Add detail.",
    )

    resubmitted = resubmit_evidence(
        attachment_context["student_user"],
        application_id=application.id,
        evidence_id=evidence.id,
        title="Week 1 revised",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        metadata={"week_start_date": "2026-05-04", "entries": {"2026-05-04": "Detailed work"}},
    )

    assert resubmitted.id == evidence.id
    assert resubmitted.status == InternshipEvidence.STATUS_SUBMITTED
    assert resubmitted.employer_review_status is None
    assert InternshipEvidence.objects.filter(application=application).count() == 1


@pytest.mark.django_db
def test_affiliated_employer_placement_requires_institution_evidence_review(attachment_context):
    application = make_application(
        attachment_context,
        status=ApplicationStatus.ACTIVE,
        start_date=date(2026, 5, 4),
        end_date=date(2026, 5, 8),
    )
    assign_supervisors(
        attachment_context["employer_admin"],
        application_id=application.id,
        supervisor_id=attachment_context["employer_supervisor_user"].id,
        type="employer",
    )
    evidence = submit_evidence(
        attachment_context["student_user"],
        application_id=application.id,
        title="Week 1",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        metadata={"week_start_date": "2026-05-04", "entries": {"2026-05-04": "Work"}},
    )

    reviewed = review_evidence(
        attachment_context["employer_supervisor_user"],
        evidence_id=evidence.id,
        application_id=application.id,
        status=InternshipEvidence.STATUS_ACCEPTED,
    )

    assert reviewed.status == InternshipEvidence.STATUS_REVIEWED


@pytest.mark.django_db
def test_completion_requires_accepted_logbook_for_every_attachment_week(attachment_context):
    application = make_application(
        attachment_context,
        status=ApplicationStatus.ACTIVE,
        start_date=date(2026, 5, 4),
        end_date=date(2026, 5, 15),
    )
    application.employer_final_feedback = "Employer assessment completed."
    application.employer_final_rating = 5
    application.institution_final_feedback = "Institution assessment completed."
    application.institution_final_rating = 5
    application.final_feedback = "Employer assessment:\nEmployer assessment completed.\n\nInstitution assessment:\nInstitution assessment completed."
    application.final_rating = 5
    application.save(update_fields=[
        "employer_final_feedback",
        "employer_final_rating",
        "institution_final_feedback",
        "institution_final_rating",
        "final_feedback",
        "final_rating",
        "updated_at",
    ])
    InternshipEvidence.objects.create(
        application=application,
        submitted_by=attachment_context["student_user"].id,
        title="Week 1",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        status=InternshipEvidence.STATUS_ACCEPTED,
        metadata={"week_start_date": "2026-05-04"},
    )

    readiness = get_completion_readiness(application)
    assert readiness["can_mark_completed"] is False
    logbook_check = next(check for check in readiness["checks"] if check["key"] == "required_logbook_weeks")
    assert "2026-05-11" in logbook_check["missing_weeks"]

    with pytest.raises(ValidationError):
        complete_internship(attachment_context["employer_admin"], application.id)

    InternshipEvidence.objects.create(
        application=application,
        submitted_by=attachment_context["student_user"].id,
        title="Week 2",
        evidence_type=InternshipEvidence.TYPE_LOGBOOK,
        status=InternshipEvidence.STATUS_ACCEPTED,
        metadata={"week_start_date": "2026-05-11"},
    )

    completed = complete_internship(attachment_context["employer_admin"], application.id)

    assert completed.status == ApplicationStatus.COMPLETED
