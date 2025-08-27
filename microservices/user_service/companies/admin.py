from django.contrib import admin
from .models import Company, Department, CompanySettings, Supervisor


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'industry', 'location', 'company_size', 'is_verified', 'is_active', 'created_at']
    list_filter = ['industry', 'company_size', 'is_verified', 'is_active']
    search_fields = ['name', 'industry', 'location']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'industry', 'website')
        }),
        ('Location & Contact', {
            'fields': ('location', 'phone', 'email')
        }),
        ('Company Details', {
            'fields': ('company_size', 'founded_year')
        }),
        ('Legal & Verification', {
            'fields': ('registration_number', 'tax_id', 'is_verified', 'verification_documents')
        }),
        ('Status', {
            'fields': ('is_active', 'status')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'parent_department', 'is_active', 'created_at']
    list_filter = ['company', 'is_active']
    search_fields = ['name', 'company__company_name', 'department_code']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'name', 'description', 'department_code')
        }),
        ('Hierarchy', {
            'fields': ('parent_department', 'department_head')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ['company', 'default_visibility', 'default_require_cover_letter', 'created_at']
    list_filter = ['default_visibility', 'default_require_cover_letter']
    search_fields = ['company__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Company', {
            'fields': ('company',)
        }),
        ('Visual Settings', {
            'fields': ('company_logo', 'logo_alt_text')
        }),
        ('Default Settings', {
            'fields': ('default_visibility', 'default_require_cover_letter')
        }),
        ('Work Preferences', {
            'fields': ('allow_remote_work', 'timezone', 'business_hours_start', 'business_hours_end')
        }),
        ('Notifications', {
            'fields': ('notification_preferences',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Supervisor)
class SupervisorAdmin(admin.ModelAdmin):
    list_display = ['supervision_type', 'is_active', 'start_date', 'end_date']  # Temporarily removed supervisor, supervisee
    list_filter = ['supervision_type', 'is_active', 'can_approve_leave', 'can_conduct_reviews']
    # search_fields = ['supervisor__user__first_name', 'supervisor__user__last_name', 'supervisee__user__first_name', 'supervisee__user__last_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Relationship', {
            'fields': ('supervision_type',)  # Temporarily removed supervisor, supervisee
        }),
        ('Permissions', {
            'fields': ('can_approve_leave', 'can_conduct_reviews', 'can_assign_tasks', 'can_view_performance')
        }),
        ('Status & Dates', {
            'fields': ('is_active', 'start_date', 'end_date')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
