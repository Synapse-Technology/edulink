from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("internships", "0023_split_final_assessments"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupervisionCheckIn",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("scheduled_for", models.DateTimeField()),
                ("mode", models.CharField(choices=[("VIRTUAL", "Virtual session"), ("PHONE", "Phone call"), ("ONSITE", "On-site visit"), ("OTHER", "Other")], default="VIRTUAL", max_length=20)),
                ("status", models.CharField(choices=[("SCHEDULED", "Scheduled"), ("COMPLETED", "Completed"), ("MISSED", "Missed"), ("CANCELLED", "Cancelled")], default="SCHEDULED", max_length=20)),
                ("scheduled_by", models.UUIDField()),
                ("completed_by", models.UUIDField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("student_confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("meeting_url", models.URLField(blank=True, max_length=1000)),
                ("supervisor_notes", models.TextField(blank=True)),
                ("private_notes", models.TextField(blank=True)),
                ("cancellation_reason", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("application", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="supervision_checkins", to="internships.internshipapplication")),
            ],
            options={
                "db_table": "supervision_checkins",
            },
        ),
        migrations.AddIndex(
            model_name="supervisioncheckin",
            index=models.Index(fields=["application", "status"], name="supervision_applica_e4cbf5_idx"),
        ),
        migrations.AddIndex(
            model_name="supervisioncheckin",
            index=models.Index(fields=["scheduled_for"], name="supervision_schedul_841b39_idx"),
        ),
        migrations.AddIndex(
            model_name="supervisioncheckin",
            index=models.Index(fields=["scheduled_by"], name="supervision_schedul_4304cb_idx"),
        ),
    ]
