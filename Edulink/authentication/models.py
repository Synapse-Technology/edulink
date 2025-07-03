import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from datetime import timedelta
from users.roles import RoleChoices

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        extra_fields.setdefault("role", RoleChoices.STUDENT)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", RoleChoices.SUPER_ADMIN)
        if extra_fields.get("role") != RoleChoices.SUPER_ADMIN:
            raise ValueError("Superuser must have role of SUPER_ADMIN.")
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    # Extended fields
    institution = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    national_id = models.CharField(max_length=20, blank=True, null=True)

    # Role-based access
    role = models.CharField(
        max_length=30,
        choices=RoleChoices.CHOICES,
        default=RoleChoices.STUDENT,
    )

    # Custom related names for compatibility
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='custom_user_set',
        related_query_name='custom_user'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_set',
        related_query_name='custom_user'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def profile(self):
        """Get the user's profile based on their role"""
        if self.role == RoleChoices.STUDENT:
            return getattr(self, 'studentprofile', None)
        elif self.role == RoleChoices.INSTITUTION_ADMIN:
            return getattr(self, 'institutionprofile', None)
        elif self.role == RoleChoices.EMPLOYER:
            return getattr(self, 'employerprofile', None)
        return None

class EmailOTP(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)

class Invite(models.Model):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=30, choices=RoleChoices.CHOICES)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    is_used = models.BooleanField(default=False)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_invites'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} - {self.role} ({'Used' if self.is_used else 'Unused'})"

class CustomAdminLog(models.Model):
    action_time = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    content_type = models.ForeignKey(
        'contenttypes.ContentType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    object_id = models.TextField(null=True, blank=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()

    class Meta:
        verbose_name = 'admin log'
        verbose_name_plural = 'admin logs'
        ordering = ['-action_time']

    def __str__(self):
        return f"{self.action_time} - {self.user} - {self.object_repr}"
