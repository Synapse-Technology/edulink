from django.contrib import admin
from .models import (
    UserRole,
    StudentProfile,
    InstitutionProfile,
    EmployerProfile
)

class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'institution', 'employer', 'granted_at')
    list_filter = ('role', 'institution', 'employer')
    search_fields = ('user__email', 'role')

class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'institution', 'is_verified')
    list_filter = ('is_verified', 'institution')
    search_fields = ('user__email', 'first_name', 'last_name', 'institution__name')

class InstitutionProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'institution', 'position')
    list_filter = ('institution',)
    search_fields = ('user__email', 'first_name', 'last_name', 'institution__name')

class EmployerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'first_name', 'last_name', 'company_name', 'position')
    list_filter = ('company_name',)
    search_fields = ('user__email', 'first_name', 'last_name', 'company_name')

admin.site.register(UserRole, UserRoleAdmin)
admin.site.register(StudentProfile, StudentProfileAdmin)
admin.site.register(InstitutionProfile, InstitutionProfileAdmin)
admin.site.register(EmployerProfile, EmployerProfileAdmin)
