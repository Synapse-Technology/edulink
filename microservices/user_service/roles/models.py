from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import uuid


class RoleChoices(models.TextChoices):
    """Available user roles in the system."""
    STUDENT = 'student', 'Student'
    EMPLOYER = 'employer', 'Employer'
    INSTITUTION_ADMIN = 'institution_admin', 'Institution Admin'
    SUPER_ADMIN = 'super_admin', 'Super Admin'
    SYSTEM = 'system', 'System'


class BaseModel(models.Model):
    """Base model with common fields."""
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class UserRole(BaseModel):
    """User role assignment model."""
    
    user_id = models.IntegerField(
        help_text="User ID from authentication service"
    )
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        help_text="User role in the system"
    )
    
    # Optional organization associations
    institution_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Institution ID for institution-related roles"
    )
    company_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Company ID for employer-related roles"
    )
    
    # Role metadata
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this role assignment is active"
    )
    assigned_by_user_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="User ID who assigned this role"
    )
    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this role was assigned"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this role assignment expires (optional)"
    )
    
    # Additional permissions and metadata
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional role-specific permissions"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional role metadata"
    )
    
    class Meta:
        db_table = 'user_roles'
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['role']),
            models.Index(fields=['institution_id']),
            models.Index(fields=['company_id']),
            models.Index(fields=['is_active']),
            models.Index(fields=['user_id', 'role']),
        ]
        unique_together = [
            ('user_id', 'role', 'institution_id', 'company_id')
        ]
        verbose_name = 'User Role'
        verbose_name_plural = 'User Roles'
    
    def __str__(self):
        org_info = ""
        if self.institution_id:
            org_info = f" (Institution: {self.institution_id})"
        elif self.company_id:
            org_info = f" (Company: {self.company_id})"
        
        return f"User {self.user_id} - {self.get_role_display()}{org_info}"
    
    def clean(self):
        """Validate role assignment rules."""
        # Validate organization associations based on role
        if self.role == RoleChoices.STUDENT:
            if not self.institution_id:
                raise ValidationError({
                    'institution_id': 'Students must be associated with an institution.'
                })
            if self.company_id:
                raise ValidationError({
                    'company_id': 'Students cannot be associated with a company.'
                })
        
        elif self.role == RoleChoices.EMPLOYER:
            if not self.company_id:
                raise ValidationError({
                    'company_id': 'Employers must be associated with a company.'
                })
            if self.institution_id:
                raise ValidationError({
                    'institution_id': 'Employers cannot be associated with an institution.'
                })
        
        elif self.role == RoleChoices.INSTITUTION_ADMIN:
            if not self.institution_id:
                raise ValidationError({
                    'institution_id': 'Institution admins must be associated with an institution.'
                })
            if self.company_id:
                raise ValidationError({
                    'company_id': 'Institution admins cannot be associated with a company.'
                })
        
        elif self.role in [RoleChoices.SUPER_ADMIN, RoleChoices.SYSTEM]:
            if self.institution_id or self.company_id:
                raise ValidationError(
                    'Super admins and system users cannot be associated with organizations.'
                )
        
        # Validate expiration date
        if self.expires_at and self.expires_at <= timezone.now():
            raise ValidationError({
                'expires_at': 'Expiration date must be in the future.'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if role assignment has expired."""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        """Check if role assignment is currently valid."""
        return self.is_active and not self.is_expired
    
    def get_effective_permissions(self):
        """Get effective permissions for this role."""
        base_permissions = self.get_base_permissions()
        custom_permissions = self.permissions or {}
        
        # Merge base and custom permissions
        effective_permissions = {**base_permissions, **custom_permissions}
        return effective_permissions
    
    def get_base_permissions(self):
        """Get base permissions for the role type."""
        permission_map = {
            RoleChoices.STUDENT: {
                'can_view_internships': True,
                'can_apply_internships': True,
                'can_view_own_applications': True,
                'can_update_own_profile': True,
                'can_view_own_progress': True,
            },
            RoleChoices.EMPLOYER: {
                'can_post_internships': True,
                'can_view_applications': True,
                'can_manage_applications': True,
                'can_view_student_profiles': True,
                'can_update_own_profile': True,
                'can_view_company_analytics': True,
            },
            RoleChoices.INSTITUTION_ADMIN: {
                'can_verify_students': True,
                'can_manage_courses': True,
                'can_manage_departments': True,
                'can_view_institution_analytics': True,
                'can_manage_institution_settings': True,
                'can_invite_users': True,
            },
            RoleChoices.SUPER_ADMIN: {
                'can_manage_all_users': True,
                'can_manage_all_institutions': True,
                'can_manage_all_employers': True,
                'can_view_system_analytics': True,
                'can_manage_system_settings': True,
                'can_access_admin_panel': True,
            },
            RoleChoices.SYSTEM: {
                'can_perform_system_operations': True,
                'can_access_internal_apis': True,
            }
        }
        
        return permission_map.get(self.role, {})
    
    def has_permission(self, permission):
        """Check if role has a specific permission."""
        if not self.is_valid:
            return False
        
        effective_permissions = self.get_effective_permissions()
        return effective_permissions.get(permission, False)


class RolePermission(BaseModel):
    """Custom permission definitions for roles."""
    
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Permission name (e.g., 'can_manage_internships')"
    )
    description = models.TextField(
        help_text="Human-readable description of the permission"
    )
    category = models.CharField(
        max_length=50,
        help_text="Permission category (e.g., 'internships', 'users', 'analytics')"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this permission is currently active"
    )
    
    class Meta:
        db_table = 'role_permissions'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = 'Role Permission'
        verbose_name_plural = 'Role Permissions'
    
    def __str__(self):
        return f"{self.name} - {self.description}"


class RoleAssignmentHistory(BaseModel):
    """History of role assignments and changes."""
    
    user_id = models.IntegerField(
        help_text="User ID from authentication service"
    )
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        help_text="Role that was assigned/removed"
    )
    action = models.CharField(
        max_length=20,
        choices=[
            ('assigned', 'Assigned'),
            ('removed', 'Removed'),
            ('updated', 'Updated'),
            ('expired', 'Expired'),
        ],
        help_text="Action performed on the role"
    )
    
    # Organization context
    institution_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Institution ID if applicable"
    )
    employer_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Employer ID if applicable"
    )
    
    # Action context
    performed_by_user_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="User ID who performed the action"
    )
    reason = models.TextField(
        blank=True,
        help_text="Reason for the role change"
    )
    
    # Previous and new values for updates
    previous_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Previous role data (for updates)"
    )
    new_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="New role data (for updates)"
    )
    
    class Meta:
        db_table = 'role_assignment_history'
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['role']),
            models.Index(fields=['action']),
            models.Index(fields=['created_at']),
            models.Index(fields=['user_id', 'created_at']),
        ]
        verbose_name = 'Role Assignment History'
        verbose_name_plural = 'Role Assignment Histories'
    
    def __str__(self):
        return f"User {self.user_id} - {self.role} {self.action} at {self.created_at}"


class RoleInvitation(BaseModel):
    """Invitations for role assignments."""
    
    email = models.EmailField(
        help_text="Email address of the invited user"
    )
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        help_text="Role to be assigned upon acceptance"
    )
    
    # Organization context
    institution_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Institution ID for institution-related roles"
    )
    employer_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Employer ID for employer-related roles"
    )
    
    # Invitation details
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        help_text="Unique invitation token"
    )
    invited_by_user_id = models.IntegerField(
        help_text="User ID who sent the invitation"
    )
    
    # Status tracking
    is_used = models.BooleanField(
        default=False,
        help_text="Whether the invitation has been used"
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the invitation was used"
    )
    used_by_user_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="User ID who used the invitation"
    )
    expires_at = models.DateTimeField(
        help_text="When the invitation expires"
    )
    
    # Additional data
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional permissions to be granted"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional invitation metadata"
    )
    
    class Meta:
        db_table = 'role_invitations'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['token']),
            models.Index(fields=['role']),
            models.Index(fields=['is_used']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['invited_by_user_id']),
        ]
        verbose_name = 'Role Invitation'
        verbose_name_plural = 'Role Invitations'
    
    def __str__(self):
        status = "Used" if self.is_used else ("Expired" if self.is_expired else "Active")
        return f"{self.email} - {self.get_role_display()} ({status})"
    
    @property
    def is_expired(self):
        """Check if invitation has expired."""
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        """Check if invitation is valid for use."""
        return not self.is_used and not self.is_expired
    
    def clean(self):
        """Validate invitation data."""
        # Validate organization associations based on role
        if self.role == RoleChoices.STUDENT and not self.institution_id:
            raise ValidationError({
                'institution_id': 'Student invitations must specify an institution.'
            })
        
        if self.role == RoleChoices.EMPLOYER and not self.employer_id:
            raise ValidationError({
                'employer_id': 'Employer invitations must specify an employer.'
            })
        
        if self.role == RoleChoices.INSTITUTION_ADMIN and not self.institution_id:
            raise ValidationError({
                'institution_id': 'Institution admin invitations must specify an institution.'
            })
        
        # Validate expiration date
        if self.expires_at <= timezone.now():
            raise ValidationError({
                'expires_at': 'Expiration date must be in the future.'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def use_invitation(self, user_id):
        """Mark invitation as used and return role data."""
        if not self.is_valid:
            raise ValidationError("Invitation is not valid for use.")
        
        self.is_used = True
        self.used_at = timezone.now()
        self.used_by_user_id = user_id
        self.save()
        
        return {
            'role': self.role,
            'institution_id': self.institution_id,
            'employer_id': self.employer_id,
            'permissions': self.permissions,
            'metadata': self.metadata
        }