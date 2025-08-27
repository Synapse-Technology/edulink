from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count
from .models import (
    Institution, InstitutionDepartment, InstitutionProgram,
    InstitutionSettings, InstitutionInvitation
)


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'institution_type', 'status', 'country', 'city',
        'established_year', 'student_count', 'admin_count',
        'is_verified', 'created_at'
    ]
    list_filter = [
        'status', 'institution_type', 'country', 'established_year',
        'created_at'
    ]
    search_fields = [
        'name', 'email', 'registration_number',
        'city', 'country', 'description'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'name', 'institution_type', 'description', 'website',
                'established_year', 'registration_number'
            )
        }),
        ('Contact Information', {
            'fields': (
                'email', 'phone', 'address', 'city',
                'state', 'country', 'postal_code'
            )
        }),
        ('Status & Verification', {
            'fields': (
                'status', 'verified_at', 'verified_by'
            )
        }),
        ('Media', {
            'fields': ('logo', 'banner'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': (
                'id', 'created_at', 'updated_at',
                'student_count', 'admin_count'
            ),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            student_count=Count('students', distinct=True),
            admin_count=Count('admins', distinct=True)
        ).select_related('verified_by')
    
    def student_count(self, obj):
        return obj.student_count
    student_count.short_description = 'Students'
    student_count.admin_order_field = 'student_count'
    
    def admin_count(self, obj):
        return obj.admin_count
    admin_count.short_description = 'Admins'
    admin_count.admin_order_field = 'admin_count'
    
    def is_verified(self, obj):
        if obj.status == 'VERIFIED':
            return format_html(
                '<span style="color: green;">✓ Verified</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Not Verified</span>'
        )
    is_verified.short_description = 'Verification Status'
    
    actions = ['verify_institutions', 'unverify_institutions', 'activate_institutions', 'suspend_institutions']
    
    def verify_institutions(self, request, queryset):
        updated = queryset.filter(status__in=['PENDING', 'ACTIVE']).update(
            status='VERIFIED',
            verified_at=timezone.now(),
            verified_by=request.user
        )
        self.message_user(
            request,
            f'{updated} institutions were successfully verified.'
        )
    verify_institutions.short_description = 'Verify selected institutions'
    
    def unverify_institutions(self, request, queryset):
        updated = queryset.filter(status='VERIFIED').update(
            status='PENDING',
            verified_at=None,
            verified_by=None
        )
        self.message_user(
            request,
            f'{updated} institutions were unverified.'
        )
    unverify_institutions.short_description = 'Unverify selected institutions'
    
    def activate_institutions(self, request, queryset):
        updated = queryset.exclude(status='ACTIVE').update(status='ACTIVE')
        self.message_user(
            request,
            f'{updated} institutions were activated.'
        )
    activate_institutions.short_description = 'Activate selected institutions'
    
    def suspend_institutions(self, request, queryset):
        updated = queryset.exclude(status='SUSPENDED').update(status='SUSPENDED')
        self.message_user(
            request,
            f'{updated} institutions were suspended.'
        )
    suspend_institutions.short_description = 'Suspend selected institutions'


class InstitutionDepartmentInline(admin.TabularInline):
    model = InstitutionDepartment
    extra = 0
    fields = ['name', 'code', 'description', 'is_active']
    readonly_fields = ['created_at']


class InstitutionProgramInline(admin.TabularInline):
    model = InstitutionProgram
    extra = 0
    fields = ['name', 'code', 'degree_type', 'duration_years', 'is_active']
    readonly_fields = ['created_at']


@admin.register(InstitutionDepartment)
class InstitutionDepartmentAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'institution', 'program_count',
        'is_active', 'created_at'
    ]
    list_filter = [
        'is_active', 'institution__institution_type', 'institution__country',
        'created_at'
    ]
    search_fields = [
        'name', 'code', 'description',
        'institution__name'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at', 'program_count']
    date_hierarchy = 'created_at'
    ordering = ['institution__name', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'institution', 'name', 'code',
                'description', 'is_active'
            )
        }),
        ('Metadata', {
            'fields': (
                'id', 'created_at', 'updated_at', 'program_count'
            ),
            'classes': ('collapse',)
        })
    )
    
    inlines = [InstitutionProgramInline]
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            program_count=Count('programs')
        ).select_related('institution')
    
    def program_count(self, obj):
        return obj.program_count
    program_count.short_description = 'Programs'
    program_count.admin_order_field = 'program_count'
    
    actions = ['activate_departments', 'deactivate_departments']
    
    def activate_departments(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'{updated} departments were activated.'
        )
    activate_departments.short_description = 'Activate selected departments'
    
    def deactivate_departments(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'{updated} departments were deactivated.'
        )
    deactivate_departments.short_description = 'Deactivate selected departments'


@admin.register(InstitutionProgram)
class InstitutionProgramAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'institution', 'department',
        'degree_type', 'duration_months', 'credits_required',
        'is_active', 'created_at'
    ]
    list_filter = [
        'degree_type', 'is_active',
        'institution__country', 'duration_months', 'created_at'
    ]
    search_fields = [
        'name', 'code', 'description',
        'institution__name', 'department__name'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    ordering = ['institution__name', 'department__name', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'institution', 'department', 'name', 'code',
                'description', 'is_active'
            )
        }),
        ('Program Details', {
            'fields': (
                'degree_type', 'duration_months', 'credits_required'
            )
        }),
        ('Metadata', {
            'fields': (
                'id', 'created_at', 'updated_at'
            ),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('institution', 'department')
    
    actions = ['activate_programs', 'deactivate_programs']
    
    def activate_programs(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'{updated} programs were activated.'
        )
    activate_programs.short_description = 'Activate selected programs'
    
    def deactivate_programs(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'{updated} programs were deactivated.'
        )
    deactivate_programs.short_description = 'Deactivate selected programs'


@admin.register(InstitutionSettings)
class InstitutionSettingsAdmin(admin.ModelAdmin):
    list_display = [
        'institution', 'academic_year_start_month',
        'grading_system', 'min_internship_duration_weeks',
        'max_internship_duration_weeks', 'allow_internships',
        'updated_at'
    ]
    list_filter = [
        'grading_system', 'allow_internships',
        'require_internship_approval', 'academic_year_start_month',
        'updated_at'
    ]
    search_fields = ['institution__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['institution__name']
    
    fieldsets = (
        ('Institution', {
            'fields': ('institution',)
        }),
        ('Academic Settings', {
            'fields': (
                'academic_year_start_month', 'grading_system',
                'default_language', 'timezone'
            )
        }),
        ('Internship Settings', {
            'fields': (
                'min_internship_duration_weeks', 'max_internship_duration_weeks',
                'allow_internships', 'require_internship_approval'
            )
        }),
        ('Notification Settings', {
            'fields': (
                'email_notifications', 'sms_notifications',
                'push_notifications'
            )
        }),
        ('Metadata', {
            'fields': (
                'id', 'created_at', 'updated_at'
            ),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('institution')


@admin.register(InstitutionInvitation)
class InstitutionInvitationAdmin(admin.ModelAdmin):
    list_display = [
        'institution_name', 'contact_person_email', 'invited_by_user_id',
        'is_used', 'is_expired', 'expires_at', 'created_at'
    ]
    list_filter = [
        'is_used', 'created_at', 'expires_at'
    ]
    search_fields = [
        'institution_name', 'contact_person_email',
        'contact_person_name'
    ]
    readonly_fields = [
        'id', 'token', 'created_at', 'updated_at',
        'used_at', 'is_expired'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Invitation Details', {
            'fields': (
                'institution_name', 'contact_person_email',
                'invitation_message', 'expires_at'
            )
        }),
        ('Status', {
            'fields': (
                'is_used', 'used_at'
            )
        }),
        ('Metadata', {
            'fields': (
                'id', 'token', 'invited_by_user_id',
                'created_at', 'updated_at', 'is_expired'
            ),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('created_by', 'used_by')
    
    def is_expired(self, obj):
        if obj.expires_at < timezone.now():
            return format_html(
                '<span style="color: red;">✗ Expired</span>'
            )
        return format_html(
            '<span style="color: green;">✓ Valid</span>'
        )
    is_expired.short_description = 'Status'
    
    actions = ['resend_invitations', 'extend_invitations']
    
    def resend_invitations(self, request, queryset):
        # This would trigger the signal to resend emails
        count = 0
        for invitation in queryset.filter(is_used=False):
            if invitation.expires_at > timezone.now():
                invitation.save()  # Trigger signal
                count += 1
        
        self.message_user(
            request,
            f'{count} invitations were resent.'
        )
    resend_invitations.short_description = 'Resend selected invitations'
    
    def extend_invitations(self, request, queryset):
        from datetime import timedelta
        
        updated = queryset.filter(
            is_used=False,
            expires_at__gt=timezone.now()
        ).update(
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        self.message_user(
            request,
            f'{updated} invitations were extended by 7 days.'
        )
    extend_invitations.short_description = 'Extend selected invitations by 7 days'
    
    def has_add_permission(self, request):
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser