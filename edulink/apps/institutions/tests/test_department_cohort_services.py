from django.test import TestCase
from edulink.apps.institutions.models import Institution, Department, Cohort
from edulink.apps.institutions.services import (
    create_department, update_department, delete_department,
    create_cohort, update_cohort, delete_cohort
)
from edulink.apps.ledger.models import LedgerEvent
import uuid

class DepartmentCohortServicesTest(TestCase):
    def setUp(self):
        self.institution = Institution.objects.create(
            name="Test University",
            domain="test.edu",
            is_active=True,
            is_verified=True,
            status=Institution.STATUS_VERIFIED
        )
        self.actor_id = str(uuid.uuid4())

    def test_create_department(self):
        dept = create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            code="CS",
            actor_id=self.actor_id
        )
        self.assertEqual(dept.name, "Computer Science")
        self.assertEqual(dept.code, "CS")
        self.assertTrue(dept.is_active)
        
        # Verify Event
        event = LedgerEvent.objects.filter(event_type="DEPARTMENT_CREATED").last()
        self.assertIsNotNone(event)
        self.assertEqual(event.entity_id, str(dept.id))

    def test_create_department_duplicate_name_case_insensitive(self):
        create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            actor_id=self.actor_id
        )
        with self.assertRaises(ValueError):
            create_department(
                institution_id=self.institution.id,
                name="computer science",
                actor_id=self.actor_id
            )

    def test_update_department(self):
        dept = create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            actor_id=self.actor_id
        )
        updated_dept = update_department(
            department_id=dept.id,
            name="CS & Engineering",
            actor_id=self.actor_id
        )
        self.assertEqual(updated_dept.name, "CS & Engineering")
        
        # Verify Event
        event = LedgerEvent.objects.filter(event_type="DEPARTMENT_UPDATED").last()
        self.assertIsNotNone(event)
        self.assertEqual(event.payload["new_data"]["name"], "CS & Engineering")

    def test_delete_department(self):
        dept = create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            actor_id=self.actor_id
        )
        delete_department(department_id=dept.id, actor_id=self.actor_id)
        
        dept.refresh_from_db()
        self.assertFalse(dept.is_active)
        
        # Verify Event
        event = LedgerEvent.objects.filter(event_type="DEPARTMENT_DELETED").last()
        self.assertIsNotNone(event)
        self.assertFalse(event.payload["is_active"])

    def test_create_cohort(self):
        dept = create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            actor_id=self.actor_id
        )
        cohort = create_cohort(
            department_id=dept.id,
            name="2023 Intake",
            start_year=2023,
            actor_id=self.actor_id
        )
        self.assertEqual(cohort.name, "2023 Intake")
        self.assertEqual(cohort.start_year, 2023)
        
        # Verify Event
        event = LedgerEvent.objects.filter(event_type="COHORT_CREATED").last()
        self.assertIsNotNone(event)

    def test_create_cohort_duplicate_name(self):
        dept = create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            actor_id=self.actor_id
        )
        create_cohort(
            department_id=dept.id,
            name="2023 Intake",
            start_year=2023,
            actor_id=self.actor_id
        )
        with self.assertRaises(ValueError):
            create_cohort(
                department_id=dept.id,
                name="2023 intake",
                start_year=2023,
                actor_id=self.actor_id
            )

    def test_update_cohort(self):
        dept = create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            actor_id=self.actor_id
        )
        cohort = create_cohort(
            department_id=dept.id,
            name="2023 Intake",
            start_year=2023,
            actor_id=self.actor_id
        )
        updated_cohort = update_cohort(
            cohort_id=cohort.id,
            name="2023-2024 Intake",
            actor_id=self.actor_id
        )
        self.assertEqual(updated_cohort.name, "2023-2024 Intake")
        
        # Verify Event
        event = LedgerEvent.objects.filter(event_type="COHORT_UPDATED").last()
        self.assertIsNotNone(event)

    def test_delete_cohort(self):
        dept = create_department(
            institution_id=self.institution.id,
            name="Computer Science",
            actor_id=self.actor_id
        )
        cohort = create_cohort(
            department_id=dept.id,
            name="2023 Intake",
            start_year=2023,
            actor_id=self.actor_id
        )
        delete_cohort(cohort_id=cohort.id, actor_id=self.actor_id)
        
        cohort.refresh_from_db()
        self.assertFalse(cohort.is_active)
        
        # Verify Event
        event = LedgerEvent.objects.filter(event_type="COHORT_DELETED").last()
        self.assertIsNotNone(event)
