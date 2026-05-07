import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from edulink.apps.institutions.models import Institution
from edulink.apps.internships.models import (
    ApplicationStatus,
    InternshipApplication,
    InternshipOpportunity,
    OpportunityStatus,
)
from edulink.apps.internships.queries import (
    get_export_data,
    get_institution_placement_stats,
    get_time_to_placement_stats,
)
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


@pytest.fixture
def analytics_institution(db):
    return Institution.objects.create(
        name="Analytics University",
        domain=f"analytics-{uuid.uuid4()}-university.ac.ke",
        is_active=True,
        is_verified=True,
        status=Institution.STATUS_ACTIVE,
    )


@pytest.fixture
def analytics_student(db, analytics_institution):
    student = Student.objects.create(
        user_id=uuid.uuid4(),
        institution_id=analytics_institution.id,
        email=f"analytics-{uuid.uuid4()}@students.example.com",
        is_verified=True,
    )
    StudentInstitutionAffiliation.objects.create(
        student_id=student.id,
        institution_id=analytics_institution.id,
        status=StudentInstitutionAffiliation.STATUS_APPROVED,
        claimed_via=StudentInstitutionAffiliation.CLAIMED_VIA_DOMAIN,
    )
    return student


def create_application(*, institution, student, origin, status, days_ago, title):
    opportunity = InternshipOpportunity.objects.create(
        title=title,
        description="Placement",
        institution_id=institution.id if origin != "EMPLOYER_SOURCED" else None,
        employer_id=uuid.uuid4() if origin == "EMPLOYER_SOURCED" else None,
        origin=(
            InternshipOpportunity.ORIGIN_EDULINK_INTERNAL
            if origin != "EXTERNAL_DECLARED"
            else InternshipOpportunity.ORIGIN_EXTERNAL_STUDENT_DECLARED
        ),
        status=OpportunityStatus.OPEN,
        start_date=(timezone.now() + timedelta(days=7)).date(),
    )
    application = InternshipApplication.objects.create(
        opportunity=opportunity,
        student_id=student.id,
        status=status,
    )
    created_at = timezone.now() - timedelta(days=days_ago)
    InternshipApplication.objects.filter(id=application.id).update(created_at=created_at)
    application.refresh_from_db()
    return application


@pytest.mark.django_db
def test_institution_placement_stats_are_date_scoped_and_split_by_source(
    analytics_institution,
    analytics_student,
):
    create_application(
        institution=analytics_institution,
        student=analytics_student,
        origin="MANAGED",
        status=ApplicationStatus.ACTIVE,
        days_ago=5,
        title="Managed Placement",
    )
    create_application(
        institution=analytics_institution,
        student=analytics_student,
        origin="EXTERNAL_DECLARED",
        status=ApplicationStatus.ACTIVE,
        days_ago=6,
        title="External Placement",
    )
    create_application(
        institution=analytics_institution,
        student=analytics_student,
        origin="EMPLOYER_SOURCED",
        status=ApplicationStatus.ACTIVE,
        days_ago=45,
        title="Old Employer Placement",
    )

    today = timezone.now().date()
    stats = get_institution_placement_stats(
        str(analytics_institution.id),
        date_from=(today - timedelta(days=10)).isoformat(),
        date_to=today.isoformat(),
    )

    assert stats["summary"]["total_placements_count"] == 2
    assert stats["source_breakdown"]["managed_edulink"] == 1
    assert stats["source_breakdown"]["external_declared"] == 1
    assert stats["source_breakdown"]["employer_sourced"] == 0


@pytest.mark.django_db
def test_time_to_placement_and_export_respect_date_range(analytics_institution, analytics_student):
    recent = create_application(
        institution=analytics_institution,
        student=analytics_student,
        origin="MANAGED",
        status=ApplicationStatus.ACTIVE,
        days_ago=2,
        title="Recent Placement",
    )
    create_application(
        institution=analytics_institution,
        student=analytics_student,
        origin="EMPLOYER_SOURCED",
        status=ApplicationStatus.ACTIVE,
        days_ago=60,
        title="Old Placement",
    )

    today = timezone.now().date()
    filters = {
        "date_from": (today - timedelta(days=10)).isoformat(),
        "date_to": today.isoformat(),
    }

    time_stats = get_time_to_placement_stats(str(analytics_institution.id), **filters)
    export_rows = list(get_export_data(str(analytics_institution.id), **filters))

    assert time_stats["sample_size"] == 1
    assert export_rows == [recent]
