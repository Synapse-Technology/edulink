from __future__ import annotations

from datetime import timedelta
from typing import Iterable

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from edulink.apps.employers.constants import (
    EMPLOYER_STATUS_ACTIVE,
    EMPLOYER_TRUST_ACTIVE_HOST,
    EMPLOYER_TRUST_PARTNER,
)
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.institutions.constants import STATUS_ACTIVE, TRUST_HIGH
from edulink.apps.institutions.models import (
    Cohort,
    Department,
    Institution,
    InstitutionStaff,
)
from edulink.apps.internships.models import (
    ApplicationStatus,
    Incident,
    InternshipApplication,
    InternshipEvidence,
    InternshipOpportunity,
    OpportunityStatus,
    SuccessStory,
)
from edulink.apps.platform_admin.models import PlatformStaffProfile
from edulink.apps.students.models import Student, StudentInstitutionAffiliation


DEMO_PASSWORD = "DemoPass12345!"


class Command(BaseCommand):
    help = "Seed a repeatable demo dataset for prototype walkthroughs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEMO_PASSWORD,
            help="Password assigned to all demo users.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]

        institution = self._institution()
        department = self._department(institution)
        cohort = self._cohort(department)

        employer_greenbyte = self._employer(
            name="GreenByte Labs",
            email="talent@greenbyte.co.ke",
            domain="greenbyte.co.ke",
            contact="Grace Mwangi",
            trust_level=EMPLOYER_TRUST_PARTNER,
        )
        employer_savanna = self._employer(
            name="Savanna Analytics",
            email="careers@savannaanalytics.co.ke",
            domain="savannaanalytics.co.ke",
            contact="Brian Otieno",
            trust_level=EMPLOYER_TRUST_ACTIVE_HOST,
        )

        users = {
            "admin": self._user(
                email="demo.admin@edulink.test",
                username="demo_admin",
                first_name="Amina",
                last_name="Njoroge",
                role="system_admin",
                password=password,
                is_staff=True,
                is_superuser=True,
            ),
            "institution_admin": self._user(
                email="demo.institution@jkuat.ac.ke",
                username="demo_institution_admin",
                first_name="Dr. Peter",
                last_name="Kamau",
                role="institution_admin",
                password=password,
                is_staff=True,
            ),
            "institution_supervisor": self._user(
                email="demo.assessor@jkuat.ac.ke",
                username="demo_institution_supervisor",
                first_name="Dr. Amina",
                last_name="Njeri",
                role="supervisor",
                password=password,
            ),
            "employer_admin": self._user(
                email="demo.employer@greenbyte.co.ke",
                username="demo_employer_admin",
                first_name="Grace",
                last_name="Mwangi",
                role="employer_admin",
                password=password,
                is_staff=True,
            ),
            "supervisor": self._user(
                email="demo.supervisor@greenbyte.co.ke",
                username="demo_employer_supervisor",
                first_name="Kevin",
                last_name="Ochieng",
                role="supervisor",
                password=password,
            ),
            "student": self._user(
                email="demo.student@students.jkuat.ac.ke",
                username="demo_student",
                first_name="Faith",
                last_name="Wanjiku",
                role="student",
                password=password,
            ),
            "alumni": self._user(
                email="demo.alumni@students.jkuat.ac.ke",
                username="demo_alumni",
                first_name="Daniel",
                last_name="Mutua",
                role="student",
                password=password,
            ),
            "pending_student": self._user(
                email="demo.pending@students.jkuat.ac.ke",
                username="demo_pending_student",
                first_name="Linet",
                last_name="Achieng",
                role="student",
                password=password,
            ),
        }

        PlatformStaffProfile.objects.update_or_create(
            user=users["admin"],
            defaults={
                "role": PlatformStaffProfile.ROLE_SUPER_ADMIN,
                "is_active": True,
            },
        )

        InstitutionStaff.objects.update_or_create(
            institution=institution,
            user=users["institution_admin"],
            defaults={"role": InstitutionStaff.ROLE_ADMIN, "is_active": True},
        )
        institution_supervisor, _ = InstitutionStaff.objects.update_or_create(
            institution=institution,
            user=users["institution_supervisor"],
            defaults={
                "role": InstitutionStaff.ROLE_SUPERVISOR,
                "department": department.name,
                "cohort": cohort.name,
                "is_active": True,
            },
        )

        employer_admin = self._supervisor_profile(
            employer_greenbyte,
            users["employer_admin"],
            Supervisor.ROLE_ADMIN,
        )
        employer_supervisor = self._supervisor_profile(
            employer_greenbyte,
            users["supervisor"],
            Supervisor.ROLE_SUPERVISOR,
        )

        students = {
            "student": self._student_profile(
                users["student"],
                institution,
                "SCT221-0123/2024",
                ["React", "Django", "Data visualization"],
                trust_level=2,
                trust_points=245,
            ),
            "alumni": self._student_profile(
                users["alumni"],
                institution,
                "SCT221-0099/2023",
                ["Python", "APIs", "Cloud deployment"],
                trust_level=3,
                trust_points=410,
            ),
            "pending": self._student_profile(
                users["pending_student"],
                institution,
                "SCT221-0441/2025",
                ["Excel", "SQL", "Research"],
                trust_level=1,
                trust_points=95,
            ),
        }

        self._affiliation(students["student"], institution, department, cohort, approved=True)
        self._affiliation(students["alumni"], institution, department, cohort, approved=True)
        self._affiliation(students["pending"], institution, department, cohort, approved=False)

        opportunities = self._opportunities(
            institution=institution,
            employers=[employer_greenbyte, employer_savanna],
        )

        applications = self._applications(
            students=students,
            opportunities=opportunities,
            institution_supervisor_id=institution_supervisor.id,
            employer_supervisor_id=employer_supervisor.id,
        )

        self._evidence(applications["active"], students["student"].id, employer_supervisor.id)
        self._incident(applications["active"], users["institution_admin"].id)
        self._success_stories(applications["certified"], applications["completed"])

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write("Demo accounts:")
        for label, user in users.items():
            self.stdout.write(f"  {label}: {user.email} / {password}")

    def _user(
        self,
        *,
        email: str,
        username: str,
        first_name: str,
        last_name: str,
        role: str,
        password: str,
        is_staff: bool = False,
        is_superuser: bool = False,
    ):
        User = get_user_model()
        user, _ = User.objects.get_or_create(email=email, defaults={"username": username})
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.phone_number = "+254 700 000 000"
        user.is_email_verified = True
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.is_active = True
        user.set_password(password)
        user.save()
        return user

    def _institution(self) -> Institution:
        institution, _ = Institution.objects.update_or_create(
            domain="jkuat.ac.ke",
            defaults={
                "name": "Jomo Kenyatta University of Agriculture and Technology",
                "is_active": True,
                "is_verified": True,
                "status": STATUS_ACTIVE,
                "trust_level": TRUST_HIGH,
                "verification_method": "demo_seed",
                "website_url": "https://www.jkuat.ac.ke",
                "contact_email": "placements@jkuat.ac.ke",
                "contact_phone": "+254 700 111 222",
                "address": "JKUAT Main Campus, Juja, Kenya",
                "description": "Demo institution for verified student placement workflows.",
            },
        )
        return institution

    def _department(self, institution: Institution) -> Department:
        department, _ = Department.objects.update_or_create(
            institution=institution,
            name="Computer Science",
            defaults={
                "code": "CS",
                "aliases": ["Computing", "Software Engineering"],
                "is_active": True,
            },
        )
        return department

    def _cohort(self, department: Department) -> Cohort:
        cohort, _ = Cohort.objects.update_or_create(
            department=department,
            name="Class of 2026",
            defaults={
                "start_year": 2022,
                "end_year": 2026,
                "intake_label": "September Intake",
                "is_active": True,
            },
        )
        return cohort

    def _employer(
        self,
        *,
        name: str,
        email: str,
        domain: str,
        contact: str,
        trust_level: int,
    ) -> Employer:
        employer, _ = Employer.objects.update_or_create(
            domain=domain,
            defaults={
                "name": name,
                "official_email": email,
                "organization_type": "Technology",
                "contact_person": contact,
                "phone_number": "+254 711 222 333",
                "website_url": f"https://{domain}",
                "registration_number": f"DEMO-{domain.split('.')[0].upper()}",
                "status": EMPLOYER_STATUS_ACTIVE,
                "trust_level": trust_level,
                "is_featured": True,
                "max_active_students": 12,
                "supervisor_ratio": 4,
            },
        )
        return employer

    def _supervisor_profile(self, employer: Employer, user, role: str) -> Supervisor:
        supervisor, _ = Supervisor.objects.update_or_create(
            employer=employer,
            user=user,
            defaults={"role": role, "is_active": True},
        )
        return supervisor

    def _student_profile(
        self,
        user,
        institution: Institution,
        registration_number: str,
        skills: Iterable[str],
        *,
        trust_level: int,
        trust_points: int,
    ) -> Student:
        student, _ = Student.objects.update_or_create(
            email=user.email,
            defaults={
                "user_id": user.id,
                "institution_id": institution.id,
                "registration_number": registration_number,
                "is_verified": True,
                "course_of_study": "BSc Computer Science",
                "current_year": "Year 4",
                "skills": list(skills),
                "trust_level": trust_level,
                "trust_points": trust_points,
                "cv_verified": True,
                "admission_letter_verified": True,
                "id_document_verified": True,
            },
        )
        return student

    def _affiliation(
        self,
        student: Student,
        institution: Institution,
        department: Department,
        cohort: Cohort,
        *,
        approved: bool,
    ) -> None:
        StudentInstitutionAffiliation.objects.update_or_create(
            student_id=student.id,
            institution_id=institution.id,
            defaults={
                "status": (
                    StudentInstitutionAffiliation.STATUS_APPROVED
                    if approved
                    else StudentInstitutionAffiliation.STATUS_PENDING
                ),
                "claimed_via": StudentInstitutionAffiliation.CLAIMED_VIA_DOMAIN,
                "department_id": department.id,
                "cohort_id": cohort.id,
                "raw_department_input": department.name,
                "raw_cohort_input": cohort.name,
                "review_notes": "Seeded demo affiliation.",
            },
        )

    def _opportunities(self, *, institution: Institution, employers: list[Employer]):
        now = timezone.now()
        specs = [
            {
                "key": "frontend",
                "title": "Frontend Engineering Intern",
                "employer": employers[0],
                "skills": ["React", "TypeScript", "UI testing"],
                "location": "Nairobi",
                "location_type": InternshipOpportunity.LOCATION_HYBRID,
            },
            {
                "key": "data",
                "title": "Data Analytics Intern",
                "employer": employers[1],
                "skills": ["Python", "SQL", "Dashboards"],
                "location": "Remote",
                "location_type": InternshipOpportunity.LOCATION_REMOTE,
            },
            {
                "key": "backend",
                "title": "Backend API Intern",
                "employer": employers[0],
                "skills": ["Django", "PostgreSQL", "REST APIs"],
                "location": "Nairobi",
                "location_type": InternshipOpportunity.LOCATION_ONSITE,
            },
        ]
        opportunities = {}
        for index, spec in enumerate(specs):
            opportunity, _ = InternshipOpportunity.objects.update_or_create(
                title=spec["title"],
                employer_id=spec["employer"].id,
                defaults={
                    "description": (
                        f"Demo placement for {spec['title'].lower()} with mentoring, "
                        "weekly logbook review, and verified certification."
                    ),
                    "department": "Computer Science",
                    "cohort": "Class of 2026",
                    "skills": spec["skills"],
                    "capacity": 5 + index,
                    "location": spec["location"],
                    "location_type": spec["location_type"],
                    "institution_id": institution.id,
                    "status": OpportunityStatus.OPEN,
                    "start_date": (now + timedelta(days=14 + index)).date(),
                    "end_date": (now + timedelta(days=104 + index)).date(),
                    "duration": "3 months",
                    "application_deadline": now + timedelta(days=21 + index),
                    "is_institution_restricted": False,
                },
            )
            opportunities[spec["key"]] = opportunity
        return opportunities

    def _applications(
        self,
        *,
        students: dict[str, Student],
        opportunities: dict[str, InternshipOpportunity],
        institution_supervisor_id,
        employer_supervisor_id,
    ):
        specs = {
            "active": (
                opportunities["frontend"],
                students["student"],
                ApplicationStatus.ACTIVE,
                "I want to deepen my frontend skills on a verified industry project.",
                4,
            ),
            "certified": (
                opportunities["backend"],
                students["alumni"],
                ApplicationStatus.CERTIFIED,
                "I am ready to contribute to API design and deployment.",
                5,
            ),
            "completed": (
                opportunities["data"],
                students["alumni"],
                ApplicationStatus.COMPLETED,
                "I want to turn institutional data into practical insights.",
                5,
            ),
            "applied": (
                opportunities["data"],
                students["pending"],
                ApplicationStatus.APPLIED,
                "I am looking for my first analytics internship.",
                None,
            ),
        }
        applications = {}
        for key, (opportunity, student, status, cover_letter, rating) in specs.items():
            application, _ = InternshipApplication.objects.update_or_create(
                opportunity=opportunity,
                student_id=student.id,
                defaults={
                    "institution_supervisor_id": institution_supervisor_id,
                    "employer_supervisor_id": employer_supervisor_id,
                    "status": status,
                    "cover_letter": cover_letter,
                    "application_snapshot": {
                        "student_name": student.email,
                        "course": student.course_of_study,
                        "skills": student.skills,
                    },
                    "final_feedback": (
                        "Strong delivery, consistent logbook evidence, and clear professional growth."
                        if rating
                        else ""
                    ),
                    "final_rating": rating,
                },
            )
            applications[key] = application
        return applications

    def _evidence(self, application: InternshipApplication, student_id, supervisor_id) -> None:
        InternshipEvidence.objects.update_or_create(
            application=application,
            title="Week 4 logbook: Dashboard implementation",
            evidence_type=InternshipEvidence.TYPE_LOGBOOK,
            defaults={
                "submitted_by": student_id,
                "description": "Implemented dashboard cards, reviewed API data flow, and documented blockers.",
                "metadata": {
                    "week": 4,
                    "hours": 32,
                    "tasks": ["React dashboard", "API integration", "Supervisor review"],
                },
                "status": InternshipEvidence.STATUS_ACCEPTED,
                "employer_review_status": InternshipEvidence.STATUS_ACCEPTED,
                "employer_reviewed_by": supervisor_id,
                "employer_reviewed_at": timezone.now(),
                "employer_review_notes": "Approved for demo: clear progress and evidence.",
            },
        )

    def _incident(self, application: InternshipApplication, reporter_id) -> None:
        Incident.objects.update_or_create(
            application=application,
            title="Laptop access delay",
            defaults={
                "reported_by": reporter_id,
                "description": "Student reported a temporary delay receiving project hardware.",
                "status": Incident.STATUS_RESOLVED,
                "resolution_notes": "Employer issued a temporary device and updated onboarding checklist.",
                "resolved_at": timezone.now(),
                "resolved_by": reporter_id,
                "metadata": {"demo": True, "severity": "low"},
            },
        )

    def _success_stories(
        self,
        certified_application: InternshipApplication,
        completed_application: InternshipApplication,
    ) -> None:
        stories = [
            (
                certified_application,
                "EduLink helped me prove my work through verified logbooks and a certificate I could share with employers.",
                "Daniel showed strong ownership and shipped production-ready API improvements during the placement.",
            ),
            (
                completed_application,
                "The placement gave me confidence to present real analytics work and understand workplace expectations.",
                "The student translated raw data into dashboards our team could use immediately.",
            ),
        ]
        for application, testimonial, feedback in stories:
            SuccessStory.objects.update_or_create(
                application=application,
                defaults={
                    "student_testimonial": testimonial,
                    "employer_feedback": feedback,
                    "is_published": True,
                },
            )
