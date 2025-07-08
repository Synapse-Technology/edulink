from django.contrib import admin
from .models.internship import Internship

class InternshipAdmin(admin.ModelAdmin):
    list_display = ('title', 'employer', 'location', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'is_paid', 'employer')
    search_fields = ('title', 'employer__company_name', 'location')

admin.site.register(Internship, InternshipAdmin)
