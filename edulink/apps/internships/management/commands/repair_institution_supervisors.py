from django.core.management.base import BaseCommand
from django.db import transaction

from edulink.apps.institutions.models import InstitutionStaff
from edulink.apps.institutions.queries import (
    get_cohort_by_id,
    get_department_by_id,
    get_institution_staff_by_id,
    get_institution_supervisor_by_id,
    get_supervisors_by_affiliation,
)
from edulink.apps.internships.models import (
    ApplicationStatus,
    InternshipApplication,
)
from edulink.apps.students.queries import get_student_approved_affiliation


class Command(BaseCommand):
    help = (
        "Find internship applications whose institution_supervisor_id points to "
        "non-supervisor institution staff, and optionally repair them."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist repairs. Without this flag the command only reports changes.",
        )
        parser.add_argument(
            "--clear-only",
            action="store_true",
            help="Clear invalid assignments instead of assigning a matching supervisor.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        clear_only = options["clear_only"]

        applications = (
            InternshipApplication.objects.select_related("opportunity")
            .filter(
                institution_supervisor_id__isnull=False,
                status__in=[
                    ApplicationStatus.ACCEPTED,
                    ApplicationStatus.ACTIVE,
                    ApplicationStatus.COMPLETED,
                    ApplicationStatus.CERTIFIED,
                ],
            )
            .order_by("id")
        )

        invalid = []
        for application in applications:
            if get_institution_supervisor_by_id(
                supervisor_id=application.institution_supervisor_id
            ):
                continue

            staff = get_institution_staff_by_id(
                staff_id=application.institution_supervisor_id
            )
            if not staff:
                invalid.append((application, None, None))
                continue

            replacement = None if clear_only else self._find_replacement(application)
            invalid.append((application, staff, replacement))

        if not invalid:
            self.stdout.write(self.style.SUCCESS("No invalid institution supervisor assignments found."))
            return

        for application, staff, replacement in invalid:
            current = "unknown staff"
            if staff:
                current = f"{staff.user.email} ({staff.role})"

            if replacement:
                action = f"assign {replacement.user.email}"
            else:
                action = "clear assignment"

            self.stdout.write(
                f"{application.id}: invalid institution supervisor {current}; would {action}"
            )

        if not apply_changes:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run: {len(invalid)} invalid assignment(s) found. Re-run with --apply to persist."
                )
            )
            return

        with transaction.atomic():
            for application, _staff, replacement in invalid:
                application.institution_supervisor_id = replacement.id if replacement else None
                application.save(update_fields=["institution_supervisor_id", "updated_at"])

        self.stdout.write(
            self.style.SUCCESS(f"Repaired {len(invalid)} invalid institution supervisor assignment(s).")
        )

    def _find_replacement(self, application: InternshipApplication):
        affiliation = get_student_approved_affiliation(application.student_id)
        institution_id = application.opportunity.institution_id or (
            affiliation.institution_id if affiliation else None
        )
        if not institution_id:
            return None

        department = application.opportunity.department
        cohort = application.opportunity.cohort

        if affiliation:
            department = department or self._affiliation_department_name(affiliation)
            cohort = cohort or self._affiliation_cohort_name(affiliation)

        if department:
            supervisor = (
                get_supervisors_by_affiliation(
                    institution_id=institution_id,
                    department_name=department,
                    cohort_name=cohort or "",
                )
                .order_by("created_at")
                .first()
            )
            if supervisor:
                return supervisor

        return (
            InstitutionStaff.objects.select_related("user")
            .filter(
                institution_id=institution_id,
                role=InstitutionStaff.ROLE_SUPERVISOR,
                is_active=True,
            )
            .order_by("created_at")
            .first()
        )

    def _affiliation_department_name(self, affiliation):
        if not affiliation.department_id:
            return ""
        try:
            return get_department_by_id(department_id=affiliation.department_id).name
        except Exception:
            return ""

    def _affiliation_cohort_name(self, affiliation):
        if not affiliation.cohort_id:
            return ""
        try:
            return get_cohort_by_id(cohort_id=affiliation.cohort_id).name
        except Exception:
            return ""
