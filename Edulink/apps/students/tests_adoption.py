from django.test import TestCase
from edulink.apps.students.models import Student, StudentInstitutionAffiliation
from edulink.apps.institutions.models import Institution, Department, Cohort
from edulink.apps.students.services import bulk_verify_students
from edulink.apps.ledger.models import LedgerEvent
import uuid

from edulink.apps.employers.models import Employer
from edulink.apps.internships.models import InternshipOpportunity, InternshipApplication, ApplicationStatus, OpportunityStatus
from edulink.apps.trust.services import compute_employer_trust_tier

class AdoptionLoopTests(TestCase):
    def setUp(self):
        self.institution = Institution.objects.create(
            name="Test Uni",
            domain="test.edu",
            status=Institution.STATUS_ACTIVE
        )
        self.department = Department.objects.create(
            institution=self.institution,
            name="Computer Science"
        )
        self.cohort = Cohort.objects.create(
            department=self.department,
            name="2024",
            start_year=2024
        )
        self.student = Student.objects.create(
            user_id=uuid.uuid4(),
            email="student@test.edu",
            is_verified=False
        )
        self.employer = Employer.objects.create(
            name="Tech Corp",
            official_email="hr@techcorp.com",
            status=Employer.STATUS_ACTIVE,
            trust_level=Employer.TRUST_VERIFIED
        )

    def test_departmental_adoption_trigger(self):
        """
        Verify that bulk verification can assign students to specific departments/cohorts,
        supporting the 'Departmental Pilot' adoption trigger.
        """
        verified_students = bulk_verify_students(
            student_entries=[{'student_id': str(self.student.id), 'registration_number': 'REG123'}],
            institution_id=str(self.institution.id),
            department_id=str(self.department.id),
            cohort_id=str(self.cohort.id),
            actor_id=str(uuid.uuid4())
        )

        self.assertEqual(len(verified_students), 1)
        student = verified_students[0]
        self.assertTrue(student.is_verified)
        self.assertEqual(str(student.institution_id), str(self.institution.id))

        # Check Affiliation
        affiliation = StudentInstitutionAffiliation.objects.get(
            student_id=student.id,
            institution_id=self.institution.id
        )
        self.assertEqual(affiliation.status, StudentInstitutionAffiliation.STATUS_APPROVED)
        self.assertEqual(affiliation.department_id, self.department.id)
        self.assertEqual(affiliation.cohort_id, self.cohort.id)

        # Check Ledger
        event = LedgerEvent.objects.filter(entity_id=student.id, event_type="STUDENT_VERIFIED_BY_INSTITUTION").first()
        self.assertIsNotNone(event)
        self.assertEqual(event.payload['department_id'], str(self.department.id))

    def test_employer_credibility_loop(self):
        """
        Verify that successful internship completions increase employer trust tier,
        supporting the 'Employer -> Institution' loop.
        """
        # Create 1 completed internship
        opp = InternshipOpportunity.objects.create(
            title="Dev Intern",
            institution_id=self.institution.id,
            employer_id=self.employer.id,
            status=OpportunityStatus.OPEN,
            start_date="2024-01-01",
            end_date="2024-03-01"
        )
        
        InternshipApplication.objects.create(
            opportunity=opp,
            student_id=self.student.id,
            status=ApplicationStatus.COMPLETED
        )
        
        result = compute_employer_trust_tier(employer_id=self.employer.id)
        self.assertEqual(result["trust_level"], Employer.TRUST_ACTIVE_HOST) # Level 2
        
        # Create 4 more (Total 5)
        for i in range(4):
             opp_i = InternshipOpportunity.objects.create(
                title=f"Intern {i}",
                institution_id=self.institution.id,
                employer_id=self.employer.id,
                status=OpportunityStatus.OPEN,
                start_date="2024-01-01",
                end_date="2024-03-01"
            )
             
             InternshipApplication.objects.create(
                opportunity=opp_i,
                student_id=uuid.uuid4(), # Different students
                status=ApplicationStatus.COMPLETED 
            )
            
        result = compute_employer_trust_tier(employer_id=self.employer.id)
        self.assertEqual(result["trust_level"], Employer.TRUST_PARTNER) # Level 3
