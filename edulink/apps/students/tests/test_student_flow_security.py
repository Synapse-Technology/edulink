from django.test import TestCase
from rest_framework.test import APIClient

from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


class StudentFlowSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_non_student_cannot_create_current_student_profile(self):
        employer_admin = User.objects.create_user(
            username="employer-admin",
            email="admin@company.test",
            password="password",
            role=User.ROLE_EMPLOYER_ADMIN,
        )
        self.client.force_authenticate(user=employer_admin)

        response = self.client.get("/api/students/current/")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Student.objects.filter(user_id=employer_admin.id).exists())

    def test_by_tier_uses_role_scoped_queryset(self):
        employer_admin = User.objects.create_user(
            username="tier-employer-admin",
            email="tier-admin@company.test",
            password="password",
            role=User.ROLE_EMPLOYER_ADMIN,
        )
        student_user = User.objects.create_user(
            username="tier-student",
            email="student@school.test",
            password="password",
            role=User.ROLE_STUDENT,
        )
        Student.objects.create(
            user_id=student_user.id,
            email=student_user.email,
            trust_level=0,
        )
        self.client.force_authenticate(user=employer_admin)

        response = self.client.get("/api/students/by_tier/?tier_level=0")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["students"], [])

    def test_domain_claim_does_not_auto_verify_when_email_domain_mismatches(self):
        student_user = User.objects.create_user(
            username="manual-student",
            email="manual.student@gmail.com",
            password="password",
            role=User.ROLE_STUDENT,
        )
        student = Student.objects.create(
            user_id=student_user.id,
            email=student_user.email,
        )
        institution = Institution.objects.create(
            name="Domain University",
            domain="university.test",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_ACTIVE,
        )
        self.client.force_authenticate(user=student_user)

        response = self.client.post(
            f"/api/students/{student.id}/claim_institution/",
            {"institution_id": str(institution.id), "claimed_via": "domain"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        affiliation = StudentInstitutionAffiliation.objects.get(
            student_id=student.id,
            institution_id=institution.id,
        )
        self.assertEqual(affiliation.status, StudentInstitutionAffiliation.STATUS_PENDING)
        self.assertEqual(affiliation.claimed_via, StudentInstitutionAffiliation.CLAIMED_VIA_MANUAL)

        student.refresh_from_db()
        self.assertFalse(student.is_verified)
        self.assertIsNone(student.institution_id)
