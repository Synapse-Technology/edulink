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
    list_display = ('user', 'first_name', 'last_name', 'institution', 'is_verified')
    list_filter = ('institution', 'is_verified', 'year_of_study')
    search_fields = ('user__email', 'first_name', 'last_name', 'registration_number')

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
