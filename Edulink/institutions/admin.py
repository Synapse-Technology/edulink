from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Institution, Course, MasterInstitution


class MasterInstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution_type', 'accreditation_body', 'is_public', 'last_verified', 'linked_institutions_count')
    list_filter = ('institution_type', 'accreditation_body', 'is_public', 'last_verified')
    search_fields = ('name', 'registration_number')
    readonly_fields = ('last_verified', 'linked_institutions_count')
    
    def linked_institutions_count(self, obj):
        count = obj.institutions.count()
        if count > 0:
            url = reverse('admin:institutions_institution_changelist') + f'?master_institution__id__exact={obj.id}'
            return format_html('<a href="{}">{} linked</a>', url, count)
        return '0 linked'
    linked_institutions_count.short_description = 'Linked Institutions'


class InstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution_type', 'email', 'is_verified', 'master_institution_link', 'registration_date')
    list_filter = ('institution_type', 'is_verified', 'master_institution')
    search_fields = ('name', 'email', 'master_institution__name')
    raw_id_fields = ('master_institution',)
    readonly_fields = ('registration_date',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'institution_type', 'registration_number', 'email', 'phone_number')
        }),
        ('Address & Contact', {
            'fields': ('address', 'website')
        }),
        ('Status & Linking', {
            'fields': ('is_verified', 'master_institution', 'registration_date')
        }),
    )
    
    def master_institution_link(self, obj):
        if obj.master_institution:
            url = reverse('admin:institutions_masterinstitution_change', args=[obj.master_institution.pk])
            return format_html('<a href="{}">{}</a>', url, obj.master_institution.name)
        return format_html('<span style="color: red;">Not linked</span>')
    master_institution_link.short_description = 'Master Institution'
    
    def registration_date(self, obj):
        return obj.created_at if hasattr(obj, 'created_at') else 'N/A'
    registration_date.short_description = 'Registration Date'
    
    actions = ['link_to_master_institution']
    
    def link_to_master_institution(self, request, queryset):
        """
        Admin action to help link institutions to master institutions
        """
        from difflib import SequenceMatcher
        
        linked_count = 0
        for institution in queryset.filter(master_institution__isnull=True):
            # Try to find a matching master institution
            best_match = None
            best_similarity = 0.0
            
            for master_inst in MasterInstitution.objects.all():
                similarity = SequenceMatcher(None, 
                    institution.name.lower().strip(), 
                    master_inst.name.lower().strip()
                ).ratio()
                
                if (master_inst.institution_type and institution.institution_type and
                    institution.institution_type.lower() in master_inst.institution_type.lower()):
                    similarity += 0.1
                
                if similarity > best_similarity and similarity >= 0.85:
                    best_similarity = similarity
                    best_match = master_inst
            
            if best_match:
                institution.master_institution = best_match
                institution.save()
                linked_count += 1
        
        self.message_user(request, f'Successfully linked {linked_count} institutions to master institutions.')
    
    link_to_master_institution.short_description = "Auto-link selected institutions to master institutions"


class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'institution', 'is_active')
    list_filter = ('institution', 'is_active')
    search_fields = ('name', 'code', 'institution__name')


admin.site.register(MasterInstitution, MasterInstitutionAdmin)
admin.site.register(Institution, InstitutionAdmin)
admin.site.register(Course, CourseAdmin)
