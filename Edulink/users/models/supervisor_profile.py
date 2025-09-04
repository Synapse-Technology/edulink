from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator
from users.roles import RoleChoices
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from authentication.models import User
    from institutions.models import Institution, Department
    from employers.models import EmployerProfile


class SupervisorProfile(models.Model):
    """Base profile for all supervisor types"""
    
    # User relationship
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='supervisor_profile')
    
    # Basic information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True, default='profile_pics/default.jpg')
    phone_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Supervisor type
    supervisor_type = models.CharField(
        max_length=30,
        choices=[
            (RoleChoices.COMPANY_SUPERVISOR, 'Company Supervisor'),
            (RoleChoices.INSTITUTION_SUPERVISOR, 'Institution Supervisor'),
        ]
    )
    
    # Professional information
    title = models.CharField(max_length=100, blank=True, help_text="Professional title (e.g., Dr., Prof., Mr., Ms.)")
    specialization = models.CharField(max_length=200, blank=True, help_text="Area of expertise or specialization")
    years_of_experience = models.PositiveIntegerField(null=True, blank=True, help_text="Years of professional experience")
    
    # Contact information
    office_phone = models.CharField(
        max_length=20, 
        blank=True,
        validators=[RegexValidator(r'^[+]?[0-9\s\-\(\)]+$', 'Enter a valid phone number')]
    )
    office_location = models.CharField(max_length=200, blank=True, help_text="Office location or address")
    
    # Supervision capacity
    max_students = models.PositiveIntegerField(default=10, help_text="Maximum number of students this supervisor can handle")
    current_students = models.PositiveIntegerField(default=0, help_text="Current number of students being supervised")
    
    # Availability
    is_available = models.BooleanField(default=True, help_text="Whether supervisor is available for new assignments")
    availability_notes = models.TextField(blank=True, help_text="Notes about availability or scheduling preferences")
    
    # Performance tracking
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00, help_text="Average rating from student feedback")
    total_ratings = models.PositiveIntegerField(default=0, help_text="Total number of ratings received")
    
    class Meta:
        verbose_name = "Supervisor Profile"
        verbose_name_plural = "Supervisor Profiles"
        indexes = [
            models.Index(fields=['supervisor_type']),
            models.Index(fields=['is_available']),
            models.Index(fields=['specialization']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.get_supervisor_type_display()}"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def can_take_more_students(self):
        """Check if supervisor can take more students"""
        return self.is_available and self.current_students < self.max_students
    
    @property
    def available_slots(self):
        """Number of available slots for new students"""
        return max(0, self.max_students - self.current_students)
    
    def update_rating(self, new_rating):
        """Update average rating with new rating"""
        total_score = self.average_rating * self.total_ratings + new_rating
        self.total_ratings += 1
        self.average_rating = total_score / self.total_ratings
        self.save(update_fields=['average_rating', 'total_ratings'])


class CompanySupervisorProfile(SupervisorProfile):
    """Profile for company/employer supervisors"""
    
    # Link to employer profile
    employer = models.ForeignKey(
        'users.EmployerProfile',
        on_delete=models.CASCADE,
        related_name='supervisors',
        help_text="The company/employer this supervisor works for"
    )
    
    # Company-specific information
    department = models.CharField(max_length=200, blank=True, help_text="Department within the company")
    job_title = models.CharField(max_length=200, blank=True, help_text="Job title within the company")
    employee_id = models.CharField(max_length=50, blank=True, help_text="Employee ID within the company")
    
    # Supervision areas
    supervision_areas = models.JSONField(
        default=list,
        blank=True,
        help_text="List of areas this supervisor can oversee (e.g., ['Software Development', 'Data Analysis'])"
    )
    
    class Meta:
        verbose_name = "Company Supervisor Profile"
        verbose_name_plural = "Company Supervisor Profiles"
    
    def save(self, *args, **kwargs):
        self.supervisor_type = RoleChoices.COMPANY_SUPERVISOR
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.get_full_name()} - {self.employer.company_name}"


class InstitutionSupervisorProfile(SupervisorProfile):
    """Profile for institution/academic supervisors"""
    
    # Link to institution
    institution = models.ForeignKey(
        'institutions.Institution',
        on_delete=models.CASCADE,
        related_name='supervisors',
        help_text="The institution this supervisor works for"
    )
    
    # Academic information
    department = models.ForeignKey(
        'institutions.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervisors',
        help_text="Academic department"
    )
    academic_rank = models.CharField(
        max_length=100,
        blank=True,
        choices=[
            ('lecturer', 'Lecturer'),
            ('senior_lecturer', 'Senior Lecturer'),
            ('associate_professor', 'Associate Professor'),
            ('professor', 'Professor'),
            ('assistant_professor', 'Assistant Professor'),
            ('instructor', 'Instructor'),
            ('other', 'Other'),
        ],
        help_text="Academic rank or position"
    )
    
    # Academic credentials
    highest_qualification = models.CharField(
        max_length=200,
        blank=True,
        help_text="Highest academic qualification (e.g., PhD in Computer Science)"
    )
    research_interests = models.JSONField(
        default=list,
        blank=True,
        help_text="List of research interests or areas of expertise"
    )
    
    # Teaching and supervision
    courses_taught = models.JSONField(
        default=list,
        blank=True,
        help_text="List of courses currently teaching"
    )
    
    class Meta:
        verbose_name = "Institution Supervisor Profile"
        verbose_name_plural = "Institution Supervisor Profiles"
    
    def save(self, *args, **kwargs):
        self.supervisor_type = RoleChoices.INSTITUTION_SUPERVISOR
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.get_full_name()} - {self.institution.name}"


class SupervisorAssignment(models.Model):
    """Model to track supervisor-student assignments"""
    
    supervisor = models.ForeignKey(
        SupervisorProfile,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    student = models.ForeignKey(
        'users.StudentProfile',
        on_delete=models.CASCADE,
        related_name='supervisor_assignments'
    )
    internship = models.ForeignKey(
        'internship.Internship',
        on_delete=models.CASCADE,
        related_name='supervisor_assignments'
    )
    
    # Assignment details
    assigned_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Assignment type
    assignment_type = models.CharField(
        max_length=20,
        choices=[
            ('primary', 'Primary Supervisor'),
            ('secondary', 'Secondary Supervisor'),
            ('mentor', 'Mentor'),
        ],
        default='primary'
    )
    
    # Notes and feedback
    assignment_notes = models.TextField(blank=True, help_text="Notes about this assignment")
    
    class Meta:
        verbose_name = "Supervisor Assignment"
        verbose_name_plural = "Supervisor Assignments"
        unique_together = ['supervisor', 'student', 'internship']
        indexes = [
            models.Index(fields=['supervisor', 'is_active']),
            models.Index(fields=['student', 'is_active']),
            models.Index(fields=['internship', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.supervisor} supervising {self.student} for {self.internship}"