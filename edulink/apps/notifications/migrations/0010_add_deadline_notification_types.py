# Generated migration for new notification types
# Adds TYPE_OPPORTUNITY_CLOSED, TYPE_DEADLINE_APPROACHING, TYPE_DEADLINE_URGENT

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0009_notification_idempotency_key_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("email_verification", "Email Verification"),
                    ("password_reset", "Password Reset"),
                    ("login_alert", "Login Alert"),
                    ("submission_deadline", "Submission Deadline"),
                    ("internship_assigned", "Internship Assigned"),
                    ("internship_status_changed", "Internship Status Changed"),
                    ("internship_completed", "Internship Completed"),
                    ("evidence_submitted", "Evidence Submitted"),
                    ("evidence_reviewed", "Evidence Reviewed"),
                    ("supervisor_assigned", "Supervisor Assigned"),
                    ("incident_resolved", "Incident Resolved"),
                    ("incident_reported", "Incident Reported"),
                    ("opportunity_closed", "Opportunity Closed Due to Deadline"),
                    ("deadline_approaching", "Internship Deadline Approaching (24h)"),
                    ("deadline_urgent", "Internship Deadline Urgent (1h)"),
                ],
                default="email_verification",
                max_length=50,
            ),
        ),
    ]
