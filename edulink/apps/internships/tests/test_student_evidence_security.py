from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from edulink.apps.accounts.models import User
from edulink.apps.students.models import Student
from edulink.apps.internships.models import (
    InternshipEvidence,
    InternshipOpportunity,
    InternshipApplication,
    ApplicationStatus,
)


class StudentEvidenceSecurityTests(TestCase):
    def test_student_cannot_fetch_another_students_evidence(self):
        owner_user = User.objects.create_user(
            username="evidence-owner",
            email="owner@student.test",
            password="password",
            role=User.ROLE_STUDENT,
        )
        other_user = User.objects.create_user(
            username="evidence-other",
            email="other@student.test",
            password="password",
            role=User.ROLE_STUDENT,
        )
        owner = Student.objects.create(user_id=owner_user.id, email=owner_user.email)
        Student.objects.create(user_id=other_user.id, email=other_user.email)
        opportunity = InternshipOpportunity.objects.create(
            title="Evidence Guard Attachment",
            description="Placement",
            status="OPEN",
            start_date=date(2026, 5, 4),
            end_date=date(2026, 5, 8),
        )
        application = InternshipApplication.objects.create(
            student_id=owner.id,
            opportunity=opportunity,
            status=ApplicationStatus.ACTIVE,
        )
        InternshipEvidence.objects.create(
            application=application,
            submitted_by=owner_user.id,
            title="Private logbook",
            description="Private evidence",
            evidence_type=InternshipEvidence.TYPE_LOGBOOK,
            status=InternshipEvidence.STATUS_SUBMITTED,
        )

        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.get(f"/api/internships/applications/{application.id}/evidence/")

        self.assertEqual(response.status_code, 404)
