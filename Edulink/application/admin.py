from django.contrib import admin
from .models import Application, SupervisorFeedback

class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('student', 'internship', 'status', 'application_date')
    list_filter = ('status', 'internship__employer')
    search_fields = ('student__user__email', 'internship__title')

admin.site.register(Application, ApplicationAdmin)
admin.site.register(SupervisorFeedback)
