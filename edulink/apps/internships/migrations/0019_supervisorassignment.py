# Generated migration for Phase 2.4: Supervisor Assignment Workflow
# Adds SupervisorAssignment model to implement supervisor consent workflow

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("internships", "0018_internshipopportunity_is_deadline_expired"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupervisorAssignment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "supervisor_id",
                    models.UUIDField(
                        help_text="The supervisor being assigned"
                    ),
                ),
                (
                    "assigned_by_id",
                    models.UUIDField(
                        help_text="Who assigned this supervisor (admin)"
                    ),
                ),
                (
                    "assignment_type",
                    models.CharField(
                        choices=[
                            ("EMPLOYER", "Employer Supervisor"),
                            ("INSTITUTION", "Institution Supervisor"),
                        ],
                        help_text="Whether this is employer or institution supervisor",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending Supervisor Review"),
                            ("ACCEPTED", "Supervisor Accepted"),
                            ("REJECTED", "Supervisor Rejected"),
                        ],
                        default="PENDING",
                        help_text="Current state: PENDING (assigned but not reviewed), ACCEPTED (supervisor accepted), REJECTED (supervisor rejected)",
                        max_length=20,
                    ),
                ),
                (
                    "assigned_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        help_text="When supervisor was assigned by admin",
                    ),
                ),
                (
                    "accepted_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When supervisor accepted the assignment",
                        null=True,
                    ),
                ),
                (
                    "rejected_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When supervisor rejected the assignment",
                        null=True,
                    ),
                ),
                (
                    "rejection_reason",
                    models.TextField(
                        blank=True,
                        help_text="Why supervisor rejected (optional)",
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Audit trail and tracking data",
                    ),
                ),
                (
                    "application",
                    models.ForeignKey(
                        help_text="The internship application being assigned",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="supervisor_assignments",
                        to="internships.internshipapplication",
                    ),
                ),
            ],
            options={
                "app_label": "internships",
                "db_table": "internship_supervisor_assignments",
            },
        ),
        migrations.AddIndex(
            model_name="supervisorassignment",
            index=models.Index(fields=["status"], name="internship__status__idx"),
        ),
        migrations.AddIndex(
            model_name="supervisorassignment",
            index=models.Index(
                fields=["application", "assignment_type"],
                name="internship__applicat_assignm__idx",
            ),
        ),
        migrations.AddIndex(
            model_name="supervisorassignment",
            index=models.Index(
                fields=["supervisor_id"],
                name="internship__supervis__idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="supervisorassignment",
            constraint=models.UniqueConstraint(
                fields=("application", "supervisor_id", "assignment_type"),
                name="unique_supervisor_assignment",
            ),
        ),
    ]
