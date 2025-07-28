# Generated initial migration for internship app

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SkillTag',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=50, unique=True)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Internship',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('category', models.CharField(max_length=100)),
                ('location', models.CharField(max_length=100)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('stipend', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('skills_required', models.TextField()),
                ('eligibility_criteria', models.TextField(blank=True)),
                ('deadline', models.DateTimeField()),
                ('is_verified', models.BooleanField(default=False)),
                ('visibility', models.CharField(choices=[('public', 'Public'), ('institution-only', 'Institution Only')], default='public', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('verification_date', models.DateTimeField(blank=True, null=True)),
                ('employer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='internships', to='users.employerprofile')),
                ('institution', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='internships', to='users.institutionprofile')),
                ('skill_tags', models.ManyToManyField(blank=True, related_name='internships', to='internship.skilltag')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.institutionprofile')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]