# Generated initial migration for users app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('institutions', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('role', models.CharField(choices=[('student', 'Student'), ('employer', 'Employer'), ('institution', 'Institution')], max_length=20)),
                ('phone_number', models.CharField(blank=True, max_length=20, null=True)),
                ('national_id', models.CharField(blank=True, max_length=20, null=True)),
                ('institution', models.CharField(blank=True, max_length=255, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_staff', models.BooleanField(default=False)),
                ('is_email_verified', models.BooleanField(default=False)),
                ('date_joined', models.DateTimeField(auto_now_add=True)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ProfileBase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='EmployerProfile',
            fields=[
                ('profilebase_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='users.profilebase')),
                ('company_name', models.CharField(max_length=255)),
                ('company_description', models.TextField(blank=True)),
                ('website', models.URLField(blank=True)),
                ('industry', models.CharField(max_length=100)),
                ('company_size', models.CharField(choices=[('1-10', '1-10 employees'), ('11-50', '11-50 employees'), ('51-200', '51-200 employees'), ('201-500', '201-500 employees'), ('501-1000', '501-1000 employees'), ('1000+', '1000+ employees')], max_length=20)),
                ('location', models.CharField(max_length=255)),
                ('phone_number', models.CharField(max_length=20)),
                ('is_verified', models.BooleanField(default=False)),
                ('email_verified', models.BooleanField(default=False)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='employer_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
            bases=('users.profilebase',),
        ),
        migrations.CreateModel(
            name='InstitutionProfile',
            fields=[
                ('profilebase_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='users.profilebase')),
                ('institution_name', models.CharField(max_length=255)),
                ('institution_type', models.CharField(choices=[('university', 'University'), ('college', 'College'), ('technical', 'Technical Institute'), ('other', 'Other')], max_length=50)),
                ('location', models.CharField(max_length=255)),
                ('phone_number', models.CharField(max_length=20)),
                ('website', models.URLField(blank=True)),
                ('description', models.TextField(blank=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('email_verified', models.BooleanField(default=False)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='institution_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
            bases=('users.profilebase',),
        ),
        migrations.CreateModel(
            name='StudentProfile',
            fields=[
                ('profilebase_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='users.profilebase')),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('phone_number', models.CharField(max_length=20)),
                ('profile_picture', models.ImageField(default='profile_pics/default.jpg', upload_to='profile_pics/')),
                ('phone_verified', models.BooleanField(default=False)),
                ('email_verified', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('last_login_at', models.DateTimeField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('institution_name', models.CharField(blank=True, max_length=255, null=True)),
                ('registration_number', models.CharField(max_length=50, unique=True)),
                ('year_of_study', models.PositiveIntegerField()),
                ('university_verified', models.BooleanField(default=False, help_text='Verified through university system integration')),
                ('last_university_sync', models.DateTimeField(blank=True, help_text='Last time data was synced with university system', null=True)),
                ('national_id', models.CharField(max_length=20, unique=True)),
                ('skills', models.JSONField(blank=True, default=list)),
                ('interests', models.JSONField(blank=True, default=list)),
                ('internship_status', models.CharField(choices=[('not_started', 'Not Started'), ('in_progress', 'In Progress'), ('completed', 'Completed')], default='not_started', max_length=20)),
                ('github_url', models.URLField(blank=True, null=True)),
                ('linkedin_url', models.URLField(blank=True, null=True)),
                ('twitter_url', models.URLField(blank=True, null=True)),
                ('resume', models.FileField(blank=True, null=True, upload_to='resumes/')),
                ('campus', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='institutions.campus')),
                ('course', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='institutions.course')),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='institutions.department')),
                ('institution', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='institutions.institution')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='student_profile', to=settings.AUTH_USER_MODEL))
            ],
            options={
                'abstract': False,
            },
            bases=('users.profilebase',),
        ),
    ]