from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import StudentProfile, EmployerProfile, InstitutionProfile, ProfileInvitation


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """Admin interface for StudentProfile."""
    
    list_display = [
        'user_id', 'full_name', 'institution_name', 'registration_number',
        'year_of_study', 'internship_status', 'is_verified', 'profile_completion_display',
        'created_at'
    ]
    list_filter = [
        'is_verified', 'university_verified', 'national_id_verified',
        'internship_status', 'year_of_study', 'gender', 'registration_method',
        'created_at', 'updated_at'
    ]
    search_fields = [
        'user_id', 'first_name', 'last_name', 'registration_number',
        'national_id', 'institution_name', 'course_name'
    ]
    readonly_fields = [
        'user_id', 'profile_completion_score', 'institution_name',
        'course_name', 'department_name', 'campus_name', 'created_at',
        'updated_at', 'last_university_sync'
    ]
    fieldsets = [
        ('Basic Information', {
            'fields': (
                'user_id', 'first_name', 'last_name', 'phone_number',
                'profile_picture', 'phone_verified', 'is_active'
            )
        }),
        ('Academic Information', {
            'fields': (
                'institution_id', 'institution_name', 'registration_number',
                'year_of_study', 'course_id', 'course_name', 'department_id',
                'department_name', 'campus_id', 'campus_name', 'academic_year'
            )
        }),
        ('Personal Information', {
            'fields': (
                'gender', 'date_of_birth', 'national_id', 'address', 'bio'
            )
        }),
        ('Professional Information', {
            'fields': (
                'skills', 'interests', 'internship_status', 'resume'
            )
        }),
        ('Social Media', {
            'fields': (
                'github_url', 'linkedin_url', 'twitter_url', 'portfolio_url'
            ),
            'classes': ('collapse',)
        }),
        ('Verification', {
            'fields': (
                'is_verified', 'university_verified', 'national_id_verified',
                'last_university_sync', 'university_code_used', 'registration_method'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    ]
    
    def get_company_name(self, obj):
        return obj.company.name if obj.company else 'No Company'
    get_company_name.short_description = 'Company'
    
    def get_department_name(self, obj):
        return obj.department.name if obj.department else 'No Department'
    get_department_name.short_description = 'Department'
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()
    full_name.short_description = 'Full Name'
    
    def profile_completion_display(self, obj):
        score = obj.profile_completion_score
        if score >= 80:
            color = 'green'
        elif score >= 60:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} %</span>',
            color, score
        )
    profile_completion_display.short_description = 'Completion'
    
    actions = ['verify_profiles', 'unverify_profiles']
    
    def verify_profiles(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(
            request,
            f'{updated} student profiles were successfully verified.'
        )
    verify_profiles.short_description = 'Verify selected profiles'
    
    def unverify_profiles(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(
            request,
            f'{updated} student profiles were unverified.'
        )
    unverify_profiles.short_description = 'Unverify selected profiles'


@admin.register(EmployerProfile)
class EmployerProfileAdmin(admin.ModelAdmin):
    """Admin interface for EmployerProfile."""
    
    list_display = [
        'user_id', 'full_name', 'get_company_name', 'get_department_name',
        'position', 'is_verified', 'profile_completion_display', 'created_at'
    ]
    list_filter = [
        'is_verified', 'company__industry', 'company__company_size',
        'created_at', 'updated_at'
    ]
    search_fields = [
        'user_id', 'first_name', 'last_name', 'company__name',
        'department__name', 'position'
    ]
    readonly_fields = [
        'user_id', 'profile_completion_score', 'created_at', 'updated_at'
    ]
    fieldsets = [
        ('Basic Information', {
            'fields': (
                'user_id', 'first_name', 'last_name', 'phone_number',
                'profile_picture', 'phone_verified', 'is_active'
            )
        }),
        ('Company & Department', {
            'fields': ('company', 'department', 'position')
        }),
        ('Verification', {
            'fields': ('is_verified', 'verification_documents')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    ]
    
    def get_company_name(self, obj):
        return obj.company.name if obj.company else 'No Company'
    get_company_name.short_description = 'Company'
    
    def get_department_name(self, obj):
        return obj.department.name if obj.department else 'No Department'
    get_department_name.short_description = 'Department'
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()
    full_name.short_description = 'Full Name'
    
    def profile_completion_display(self, obj):
        score = obj.profile_completion_score
        if score >= 80:
            color = 'green'
        elif score >= 60:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} %</span>',
            color, score
        )
    profile_completion_display.short_description = 'Completion'
    
    actions = ['verify_profiles', 'unverify_profiles']
    
    def verify_profiles(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(
            request,
            f'{updated} employer profiles were successfully verified.'
        )
    verify_profiles.short_description = 'Verify selected profiles'
    
    def unverify_profiles(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(
            request,
            f'{updated} employer profiles were unverified.'
        )
    unverify_profiles.short_description = 'Unverify selected profiles'


@admin.register(InstitutionProfile)
class InstitutionProfileAdmin(admin.ModelAdmin):
    """Admin interface for InstitutionProfile."""
    
    list_display = [
        'user_id', 'full_name', 'institution_id', 'position',
        'department', 'profile_completion_display', 'created_at'
    ]
    list_filter = [
        'institution_id', 'can_verify_students', 'can_manage_courses',
        'can_manage_departments', 'can_view_analytics', 'created_at', 'updated_at'
    ]
    search_fields = [
        'user_id', 'first_name', 'last_name', 'position', 'department'
    ]
    readonly_fields = [
        'user_id', 'profile_completion_score', 'created_at', 'updated_at'
    ]
    fieldsets = [
        ('Basic Information', {
            'fields': (
                'user_id', 'first_name', 'last_name', 'phone_number',
                'profile_picture', 'phone_verified', 'is_active'
            )
        }),
        ('Institution Information', {
            'fields': ('institution_id', 'position', 'department')
        }),
        ('Permissions', {
            'fields': (
                'can_verify_students', 'can_manage_courses',
                'can_manage_departments', 'can_view_analytics'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    ]
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()
    full_name.short_description = 'Full Name'
    
    def profile_completion_display(self, obj):
        score = obj.profile_completion_score
        if score >= 80:
            color = 'green'
        elif score >= 60:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} %</span>',
            color, score
        )
    profile_completion_display.short_description = 'Completion'


@admin.register(ProfileInvitation)
class ProfileInvitationAdmin(admin.ModelAdmin):
    """Admin interface for ProfileInvitation."""
    
    list_display = [
        'email', 'profile_type', 'invited_by_user_id', 'is_used',
        'is_expired_display', 'expires_at', 'created_at'
    ]
    list_filter = [
        'profile_type', 'is_used', 'created_at', 'expires_at'
    ]
    search_fields = ['email', 'invited_by_user_id', 'token']
    readonly_fields = [
        'token', 'is_used', 'used_at', 'is_expired', 'created_at'
    ]
    fieldsets = [
        ('Invitation Details', {
            'fields': (
                'email', 'profile_type', 'invited_by_user_id', 'token'
            )
        }),
        ('Organization', {
            'fields': ('institution_id', 'employer_id')
        }),
        ('Status', {
            'fields': ('is_used', 'used_at', 'expires_at', 'is_expired')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    ]
    
    def is_expired_display(self, obj):
        if obj.is_expired:
            return format_html(
                '<span style="color: red; font-weight: bold;">Expired</span>'
            )
        else:
            return format_html(
                '<span style="color: green; font-weight: bold;">Active</span>'
            )
    is_expired_display.short_description = 'Status'
    
    actions = ['resend_invitations']
    
    def resend_invitations(self, request, queryset):
        # Filter only unused and non-expired invitations
        valid_invitations = queryset.filter(
            is_used=False,
            expires_at__gt=timezone.now()
        )
        
        count = 0
        for invitation in valid_invitations:
            try:
                # Here you would integrate with your notification service
                # to resend the invitation email
                count += 1
            except Exception:
                pass
        
        self.message_user(
            request,
            f'{count} invitations were resent successfully.'
        )
    resend_invitations.short_description = 'Resend selected invitations'