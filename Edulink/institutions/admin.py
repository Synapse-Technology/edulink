from django.contrib import admin

from .models import Institution

@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution_type', 'is_verified', 'registration_number')
    search_fields = ('name', 'registration_number')
