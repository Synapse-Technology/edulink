# All models must inherit from BaseModel unless explicitly justified.

from django.db import models
from django.contrib.auth.models import AbstractUser
from edulink.shared.db.base_models import BaseModel


class User(AbstractUser, BaseModel):
    """
    Extended Django User model with Edulink-specific roles and profile data.
    Follows architecture rules: stores identity data only, no business logic.
    """
    
    # Role definitions following architecture rule 7.1
    ROLE_STUDENT = "student"
    ROLE_INSTITUTION_ADMIN = "institution_admin"
    ROLE_EMPLOYER_ADMIN = "employer_admin"
    ROLE_SUPERVISOR = "supervisor"
    ROLE_SYSTEM_ADMIN = "system_admin"
    
    ROLE_CHOICES = [
        (ROLE_STUDENT, "Student"),
        (ROLE_INSTITUTION_ADMIN, "Institution Admin"),
        (ROLE_EMPLOYER_ADMIN, "Employer Admin"),
        (ROLE_SUPERVISOR, "Supervisor"),
        (ROLE_SYSTEM_ADMIN, "System Admin"),
    ]
    
    # Core identity fields (no business logic)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    
    phone_number = models.CharField(max_length=20, blank=True)
    avatar_url = models.URLField(blank=True)
    is_email_verified = models.BooleanField(default=False)
    gender = models.CharField(
        max_length=1,
        choices=[
            ("M", "Male"),
            ("F", "Female"),
            ("O", "Other"),
        ],
        blank=True,
    )
    
    # Override to ensure email is used as username
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]  # username is still required but not used for login
    
    class Meta:
        app_label = "accounts"
        db_table = "accounts_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
    
    def __str__(self):
        return f"{self.email} ({self.role})"
    
    # Property methods for role checking (no business logic)
    @property
    def is_student(self):
        return self.role == self.ROLE_STUDENT
    
    @property
    def is_institution_admin(self):
        return self.role == self.ROLE_INSTITUTION_ADMIN
    
    @property
    def is_employer_admin(self):
        return self.role == self.ROLE_EMPLOYER_ADMIN
    
    @property
    def is_supervisor(self):
        return self.role == self.ROLE_SUPERVISOR
    
    @property
    def is_system_admin(self):
        return self.role == self.ROLE_SYSTEM_ADMIN
