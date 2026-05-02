import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("internships", "0021_remove_supervisorassignment_unique_supervisor_assignment_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="internshipopportunity",
            name="application_mode",
            field=models.CharField(
                choices=[("INTERNAL", "Apply in EduLink"), ("EXTERNAL", "Apply on external site")],
                default="INTERNAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="internshipopportunity",
            name="origin",
            field=models.CharField(
                choices=[
                    ("EDULINK_INTERNAL", "EduLink internal"),
                    ("EXTERNAL_STUDENT_DECLARED", "External student declared"),
                    ("ADMIN_CURATED_EXTERNAL", "Admin curated external"),
                ],
                default="EDULINK_INTERNAL",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="internshipopportunity",
            name="external_employer_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="internshipopportunity",
            name="external_source_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="internshipopportunity",
            name="external_apply_url",
            field=models.URLField(blank=True, max_length=1000),
        ),
        migrations.AddField(
            model_name="internshipopportunity",
            name="external_reference",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="internshipopportunity",
            name="curated_by",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="internshipopportunity",
            name="last_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="ExternalPlacementDeclaration",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("student_id", models.UUIDField()),
                ("institution_id", models.UUIDField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending institution review"),
                            ("CHANGES_REQUESTED", "Changes requested"),
                            ("APPROVED", "Approved"),
                            ("REJECTED", "Rejected"),
                        ],
                        default="PENDING",
                        max_length=30,
                    ),
                ),
                ("company_name", models.CharField(max_length=255)),
                ("company_contact_name", models.CharField(blank=True, max_length=255)),
                ("company_contact_email", models.EmailField(blank=True, max_length=254)),
                ("company_contact_phone", models.CharField(blank=True, max_length=50)),
                ("role_title", models.CharField(max_length=255)),
                ("location", models.CharField(blank=True, max_length=255)),
                (
                    "location_type",
                    models.CharField(
                        choices=[("ONSITE", "On-site"), ("REMOTE", "Remote"), ("HYBRID", "Hybrid")],
                        default="ONSITE",
                        max_length=20,
                    ),
                ),
                ("start_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                ("source_url", models.URLField(blank=True, max_length=1000)),
                (
                    "proof_document",
                    models.FileField(blank=True, upload_to="internships/external_placement_proofs/"),
                ),
                ("student_notes", models.TextField(blank=True)),
                ("review_notes", models.TextField(blank=True)),
                ("reviewed_by", models.UUIDField(blank=True, null=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "application",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="external_declarations",
                        to="internships.internshipapplication",
                    ),
                ),
            ],
            options={
                "db_table": "external_placement_declarations",
                "indexes": [
                    models.Index(fields=["student_id"], name="external_pl_student_b64a9f_idx"),
                    models.Index(fields=["institution_id", "status"], name="external_pl_institu_a7e5b9_idx"),
                    models.Index(fields=["status"], name="external_pl_status_5123f5_idx"),
                ],
            },
        ),
    ]
