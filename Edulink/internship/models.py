import uuid
from django.db import models
from django.utils import timezone

# Core Profile mapped to public.profiles
class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.TextField()
    last_name = models.TextField()
    phone_number = models.TextField()
    role = models.TextField(choices=[
        ('STUDENT', 'Student'),
        ('EMPLOYER', 'Employer'),
        ('INSTITUTION', 'Institution'),
        ('ADMIN', 'Admin')
    ])
    profile_picture_url = models.TextField(blank=True, null=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

# Institutions table
class Institution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    institution_type = models.CharField(max_length=50)
    registration_number = models.CharField(max_length=100, unique=True)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    physical_address = models.TextField()
    county = models.CharField(max_length=100)
    website_url = models.TextField()
    logo_url = models.TextField()
    is_verified = models.BooleanField(default=False)
    verification_documents = models.JSONField(blank=True, null=True)
    subscription_tier = models.CharField(max_length=50, default='basic')
    subscription_expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

# Courses
class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    course_name = models.CharField(max_length=255)
    course_code = models.CharField(max_length=50, blank=True, null=True)
    department = models.CharField(max_length=100)
    level = models.CharField(max_length=50)
    duration_years = models.IntegerField()
    description = models.TextField()
    skills_tags = models.JSONField()
    created_at = models.DateTimeField(default=timezone.now)

# Employers
class Employer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_name = models.CharField(max_length=255)
    industry = models.CharField(max_length=100)
    company_size = models.CharField(max_length=50)
    registration_number = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    physical_address = models.TextField()
    county = models.CharField(max_length=100)
    website_url = models.TextField()
    logo_url = models.TextField()
    description = models.TextField()
    is_verified = models.BooleanField(default=False)
    verification_documents = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

# UserRoles linking Profiles with Institution or Employer
class UserRole(models.Model):
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    role_type = models.TextField(choices=[
        ('STUDENT', 'Student'),
        ('EMPLOYER', 'Employer'),
        ('INSTITUTION_ADMIN', 'Institution Admin'),
        ('SUPER_ADMIN', 'Super Admin')
    ])
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, blank=True, null=True)
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, blank=True, null=True)
    is_primary = models.BooleanField(default=True)
    granted_at = models.DateTimeField(default=timezone.now)
    granted_by = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, related_name='granted_roles')

# StudentProfile
class StudentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    student_id = models.CharField(max_length=50)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    year_of_study = models.IntegerField()
    expected_graduation = models.DateField()
    gpa = models.DecimalField(max_digits=3, decimal_places=2)
    resume_url = models.TextField()
    portfolio_url = models.TextField()
    linkedin_profile = models.TextField()
    github_profile = models.TextField()
    skills = models.JSONField()
    interests = models.JSONField()
    location_preference = models.CharField(max_length=100)
    internship_status = models.CharField(max_length=50, default='seeking')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

# Internship listings
class Internship(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.TextField(blank=True, null=True)
    responsibilities = models.TextField(blank=True, null=True)
    skills_required = models.JSONField()
    location = models.CharField(max_length=255)
    is_remote = models.BooleanField(default=False)
    internship_type = models.CharField(max_length=50)
    duration_months = models.IntegerField()
    stipend_amount = models.DecimalField(max_digits=10, decimal_places=2)
    stipend_currency = models.CharField(max_length=3, default='KES')
    application_deadline = models.DateField()
    start_date = models.DateField()
    max_applicants = models.IntegerField()
    current_applicants = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='active')
    is_verified = models.BooleanField(default=False)
    created_by = models.ForeignKey(Profile, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

# Applications
class Application(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Profile, on_delete=models.CASCADE)
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE)
    cover_letter = models.TextField(blank=True, null=True)
    resume_url = models.TextField(blank=True, null=True)
    portfolio_url = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='submitted')
    institution_approved = models.BooleanField(default=False)
    institution_approved_by = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, related_name='approved_applications')
    institution_approved_at = models.DateTimeField(blank=True, null=True)
    employer_notes = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('student', 'internship')

# Application status history
class ApplicationStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE)
    old_status = models.CharField(max_length=50, blank=True, null=True)
    new_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey(Profile, on_delete=models.CASCADE)
    notes = models.TextField(blank=True, null=True)
    changed_at = models.DateTimeField(default=timezone.now)

# InternshipPlacement
class InternshipPlacement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE)
    student = models.ForeignKey(Profile, on_delete=models.CASCADE)
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE)
    supervisor_name = models.CharField(max_length=255)
    supervisor_email = models.EmailField()
    supervisor_phone = models.CharField(max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    actual_end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, default='active')
    logbook_url = models.TextField(blank=True, null=True)
    final_report_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

# Evaluations
class Evaluation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    placement = models.ForeignKey(InternshipPlacement, on_delete=models.CASCADE)
    evaluator_type = models.CharField(max_length=50)
    evaluator = models.ForeignKey(Profile, on_delete=models.CASCADE)
    overall_rating = models.IntegerField()
    technical_skills_rating = models.IntegerField()
    communication_rating = models.IntegerField()
    professionalism_rating = models.IntegerField()
    feedback_text = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    would_recommend = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

# Auth tokens
class AuthToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=255)
    token_type = models.CharField(max_length=50)
    expires_at = models.DateTimeField()
    is_revoked = models.BooleanField(default=False)
    device_info = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

# User sessions
class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    session_token = models.CharField(max_length=255, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

# Security logs
class SecurityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50, blank=True, null=True)
    resource_id = models.UUIDField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20)
    details = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

# Data processing consents
class DataProcessingConsent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    consent_type = models.CharField(max_length=100)
    consent_given = models.BooleanField()
    consent_text = models.TextField(blank=True, null=True)
    consent_version = models.CharField(max_length=10, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    consented_at = models.DateTimeField(default=timezone.now)
    withdrawn_at = models.DateTimeField(blank=True, null=True)

# Data export requests
class DataExportRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    request_type = models.CharField(max_length=50)
    status = models.CharField(max_length=50, default='pending')
    export_url = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, related_name='processed_exports')
    requested_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(blank=True, null=True)

# Notifications
class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.TextField(blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    read_at = models.DateTimeField(blank=True, null=True)

# Platform analytics
class PlatformAnalytics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_type = models.CharField(max_length=100)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, blank=True, null=True)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, blank=True, null=True)
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, blank=True, null=True)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    metadata = models.JSONField(blank=True, null=True)
    recorded_at = models.DateTimeField(default=timezone.now)

