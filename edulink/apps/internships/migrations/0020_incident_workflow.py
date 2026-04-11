# Generated migration for Phase 2.3: Incident Resolution Workflow
# Upgrades Incident model from 3-state to 6-state workflow with investigation tracking

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("internships", "0019_supervisorassignment"),
    ]

    operations = [
        # Update STATUS_CHOICES to include new states
        migrations.AlterField(
            model_name="incident",
            name="status",
            field=models.CharField(
                choices=[
                    ("OPEN", "Open / Reported"),
                    ("ASSIGNED", "Assigned to Investigator"),
                    ("INVESTIGATING", "Under Investigation"),
                    ("PENDING_APPROVAL", "Pending Resolution Approval"),
                    ("RESOLVED", "Resolved"),
                    ("DISMISSED", "Dismissed"),
                ],
                default="OPEN",
                max_length=20,
            ),
        ),
        # Add investigation tracking fields
        migrations.AddField(
            model_name="incident",
            name="investigator_id",
            field=models.UUIDField(
                blank=True,
                help_text="Who is investigating this incident",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="incident",
            name="assigned_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When investigator was assigned",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="incident",
            name="investigation_notes",
            field=models.TextField(
                blank=True,
                help_text="Private investigation notes",
            ),
        ),
        migrations.AddField(
            model_name="incident",
            name="metadata",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="History and tracking data",
            ),
        ),
        # Update existing resolution_notes field help_text
        migrations.AlterField(
            model_name="incident",
            name="resolution_notes",
            field=models.TextField(
                blank=True,
                help_text="Public resolution notes visible to all parties",
            ),
        ),
        # Add index on status for workflow queries
        migrations.AddIndex(
            model_name="incident",
            index=models.Index(fields=["status"], name="internship__incident_status_idx"),
        ),
    ]
