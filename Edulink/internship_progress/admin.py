from django.contrib import admin
from .models import LogbookEntry, SupervisorFeedback

@admin.register(LogbookEntry)
class LogbookEntryAdmin(admin.ModelAdmin):
    list_display = ('student', 'internship', 'week_number', 'status', 'date_submitted')
    list_filter = ('status', 'internship')
    search_fields = ('student__user__email', 'internship__title', 'week_number')
    ordering = ('-date_submitted',)

@admin.register(SupervisorFeedback)
class SupervisorFeedbackAdmin(admin.ModelAdmin):
    list_display = ('log_entry', 'company_supervisor', 'institution_supervisor', 'created_at')
    search_fields = ('log_entry__student__user__email', 'company_supervisor__user__email', 'institution_supervisor__user__email')
    ordering = ('-created_at',)
