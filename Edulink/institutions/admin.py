from django.contrib import admin
from .models import Institution, Course

class InstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution_type', 'email', 'is_verified')
    list_filter = ('institution_type', 'is_verified')
    search_fields = ('name', 'email')

class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'institution', 'is_active')
    list_filter = ('institution', 'is_active')
    search_fields = ('name', 'code', 'institution__name')

admin.site.register(Institution, InstitutionAdmin)
admin.site.register(Course, CourseAdmin)
