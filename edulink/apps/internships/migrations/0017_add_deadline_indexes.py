# Generated migration to add composite indexes for deadline-related queries

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('internships', '0016_internshipapplication_final_feedback_and_more'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='internshipopportunity',
            index=models.Index(
                fields=['status', 'application_deadline'],
                name='internship_op_status_appdeadline_idx',
                condition=models.Q(('status', 'OPEN'))
            ),
        ),
        migrations.AddIndex(
            model_name='internshipopportunity',
            index=models.Index(
                fields=['application_deadline', 'status'],
                name='internship_op_appdeadline_status_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='internshipopportunity',
            index=models.Index(
                fields=['status', 'application_deadline', '-created_at'],
                name='internship_op_status_deadline_created_idx',
            ),
        ),
    ]
