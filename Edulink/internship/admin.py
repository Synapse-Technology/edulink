# Example: applications/admin.py

from django.contrib import admin
# Assuming your Application model is in core.models
from internship.models import Application

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('student_user', 'internship', 'application_date', 'status', 'institution_approved')
    list_filter = ('status', 'institution_approved', 'application_date')
    search_fields = ('student_user__email', 'internship__title')
    raw_id_fields = ('student_user', 'internship') # Useful for ForeignKey fields to avoid dropdowns for many objects
    actions = ['mark_as_accepted', 'mark_as_rejected']

    def mark_as_accepted(self, request, queryset):
        queryset.update(status='accepted')
    mark_as_accepted.short_description = "Mark selected applications as accepted"

    def mark_as_rejected(self, request, queryset):
        queryset.update(status='rejected')
    mark_as_rejected.short_description = "Mark selected applications as rejected"

# Register your models here.
