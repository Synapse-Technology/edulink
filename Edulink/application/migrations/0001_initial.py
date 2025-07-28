# Generated initial migration for application app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('authentication', '0001_initial'),
        ('internship', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Application',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('application_date', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('reviewed', 'Reviewed'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('withdrawn', 'Withdrawn')], default='pending', max_length=20)),
                ('cover_letter', models.TextField(blank=True)),
                ('resume', models.FileField(blank=True, upload_to='resumes/')),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('internship', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='applications', to='internship.internship')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_applications', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='applications', to='authentication.user')),
            ],
            options={
                'ordering': ['-application_date'],
            },
        ),
        migrations.CreateModel(
            name='SupervisorFeedback',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('feedback', models.TextField()),
                ('rating', models.PositiveSmallIntegerField()),
                ('application', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='application.application')),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='application',
            unique_together={('student', 'internship')},
        ),
    ]