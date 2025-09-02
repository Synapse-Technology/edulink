from django.contrib import admin
from authentication.models import User
from .models import (
    UserRole,
    StudentProfile,
    InstitutionProfile,
    EmployerProfile
)
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin


class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'institution', 'employer')
    list_filter = ('role', 'institution', 'employer')
    search_fields = ('user__email', 'role')


class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'institution', 'is_verified', 'university_verified', 'national_id_verified')
    list_filter = ('institution', 'is_verified', 'university_verified', 'national_id_verified', 'year_of_study')
    search_fields = ('user__email', 'first_name', 'last_name', 'registration_number', 'national_id')
    readonly_fields = ('national_id_verified', 'university_verified', 'last_university_sync')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'first_name', 'last_name', 'phone_number', 'national_id', 'profile_picture')
        }),
        ('Institution Details', {
            'fields': ('institution', 'institution_name', 'registration_number', 'year_of_study', 'course', 'department', 'campus')
        }),
        ('Verification Status', {
            'fields': ('is_verified', 'university_verified', 'national_id_verified', 'phone_verified', 'last_university_sync'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('skills', 'interests', 'internship_status', 'github_url', 'linkedin_url', 'twitter_url', 'resume'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_deleted', 'deleted_at', 'last_login_at'),
            'classes': ('collapse',)
        })
    )


class InstitutionProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'institution')
    search_fields = ('user__email', 'first_name', 'last_name', 'institution__name')


class EmployerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'company_name')
    search_fields = ('user__email', 'first_name', 'last_name', 'company_name')


admin.site.register(UserRole, UserRoleAdmin)
admin.site.register(StudentProfile, StudentProfileAdmin)
admin.site.register(InstitutionProfile, InstitutionProfileAdmin)
admin.site.register(EmployerProfile, EmployerProfileAdmin)
