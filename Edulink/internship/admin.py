from django.contrib import admin
from .models.internship import Internship
from application.models import Application
from .models.skill_tag import SkillTag


@admin.register(SkillTag)
class SkillTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active', 'internship_count')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    ordering = ('name',)


@admin.register(Internship)
class InternshipAdmin(admin.ModelAdmin):
    list_display = ('title', 'employer', 'institution', 'category', 'location',
                    'start_date', 'end_date', 'is_verified', 'is_active', 'visibility')
    list_filter = ('is_active', 'is_verified', 'visibility', 'category', 'employer')
    search_fields = ('title', 'employer__company_name', 'institution__name', 'location', 'description')
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ('skill_tags',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category', 'location')
        }),
        ('Relationships', {
            'fields': ('employer', 'institution', 'skill_tags')
        }),
        ('Duration & Compensation', {
            'fields': ('start_date', 'end_date', 'stipend')
        }),
        ('Requirements', {
            'fields': ('skills_required', 'eligibility_criteria')
        }),
        ('Application & Visibility', {
            'fields': ('deadline', 'is_verified', 'visibility')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('internship', 'student', 'status', 'application_date', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'internship__employer', 'internship__category', 'application_date')
    search_fields = ('internship__title', 'student__user__email',
                     'student__user__first_name', 'student__user__last_name')
    readonly_fields = ('application_date', 'created_at', 'updated_at')

    fieldsets = (
        ('Application Details', {
            'fields': ('student', 'internship', 'status', 'application_date')
        }),
        ('Application Materials', {
            'fields': ('cover_letter', 'resume')
        }),
        ('Review Information', {
            'fields': ('reviewed_by', 'reviewed_at', 'review_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'student', 'student__user', 'internship', 'internship__employer', 'reviewed_by'
        )
