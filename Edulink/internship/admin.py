from django.contrib import admin
from .models.internship import Internship
from .models.application import Application

class InternshipAdmin(admin.ModelAdmin):
    list_display = ('title', 'employer', 'location', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'is_paid', 'employer')
    search_fields = ('title', 'employer__company_name', 'location')

class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('internship', 'student', 'status', 'application_date')
    list_filter = ('status', 'internship__employer')
    search_fields = ('internship__title', 'student__user__email')

admin.site.register(Internship, InternshipAdmin)
admin.site.register(Application, ApplicationAdmin)
