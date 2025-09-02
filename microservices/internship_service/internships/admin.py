from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import Internship, SkillTag


@admin.register(SkillTag)
class SkillTagAdmin(admin.ModelAdmin):
    """Admin interface for SkillTag model"""
    list_display = ['name', 'description', 'is_active', 'internship_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at', 'internship_count']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'internship_count'),
            'classes': ('collapse',)
        }),
    )
    
    def internship_count(self, obj):
        """Display count of internships using this skill tag"""
        return obj.internship_count
    internship_count.short_description = 'Internships Count'


@admin.register(Internship)
class InternshipAdmin(admin.ModelAdmin):
    """Admin interface for Internship model"""
    list_display = [
        'title', 'employer_display', 'category', 'location_type', 
        'status_display', 'deadline', 'is_verified', 'is_featured', 'created_at'
    ]
    list_filter = [
        'category', 'location_type', 'experience_level', 'is_active', 
        'is_verified', 'is_featured', 'visibility', 'created_at'
    ]
    search_fields = [
        'title', 'description', 'location', 'required_skills', 
        'preferred_skills', 'employer_id'
    ]
    ordering = ['-created_at']
    readonly_fields = [
        'created_at', 'updated_at', 'application_count', 'spots_remaining',
        'is_expired_display'
    ]
    filter_horizontal = ['skill_tags']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'title', 'description', 'employer_id', 'category', 
                'location', 'location_type'
            )
        }),
        ('Requirements', {
            'fields': (
                'experience_level', 'min_gpa', 'required_year_of_study',
                'required_majors', 'required_skills', 'preferred_skills',
                'skill_tags'
            )
        }),
        ('Timeline & Compensation', {
            'fields': (
                'start_date', 'end_date', 'duration_weeks', 'deadline',
                'stipend', 'benefits'
            )
        }),
        ('Application Settings', {
            'fields': (
                'max_applications', 'application_instructions',
                'visibility'
            )
        }),
        ('Status & Verification', {
            'fields': (
                'is_active', 'is_verified', 'verified_by_id', 'verification_date',
                'is_featured', 'partner_institution_id'
            )
        }),
        ('Metadata', {
            'fields': (
                'created_at', 'updated_at', 'application_count', 
                'spots_remaining', 'is_expired_display'
            ),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_verified', 'mark_unverified', 'mark_featured', 'mark_unfeatured', 'mark_active', 'mark_inactive']
    
    def employer_display(self, obj):
        """Display employer information"""
        # In a real implementation, this would fetch employer name from user service
        return f"Employer ID: {obj.employer_id}"
    employer_display.short_description = 'Employer'
    
    def status_display(self, obj):
        """Display internship status with color coding"""
        if not obj.is_active:
            return format_html('<span style="color: red;">Inactive</span>')
        elif obj.deadline < timezone.now().date():
            return format_html('<span style="color: orange;">Expired</span>')
        elif obj.is_verified:
            return format_html('<span style="color: green;">Active & Verified</span>')
        else:
            return format_html('<span style="color: blue;">Active & Pending</span>')
    status_display.short_description = 'Status'
    
    def application_count(self, obj):
        """Display application count"""
        # This would call the application service to get the count
        return "N/A (External Service)"
    application_count.short_description = 'Applications'
    
    def spots_remaining(self, obj):
        """Display remaining spots"""
        # This would call the application service to calculate remaining spots
        if obj.max_applications:
            return f"{obj.max_applications} (max)"
        return "Unlimited"
    spots_remaining.short_description = 'Spots Remaining'
    
    def is_expired_display(self, obj):
        """Display if internship is expired"""
        return obj.is_expired()
    is_expired_display.short_description = 'Is Expired'
    is_expired_display.boolean = True
    
    # Admin actions
    def mark_verified(self, request, queryset):
        """Mark selected internships as verified"""
        updated = queryset.update(
            is_verified=True,
            verification_date=timezone.now(),
            verified_by_id=request.user.id  # Simplified
        )
        self.message_user(request, f'{updated} internships marked as verified.')
    mark_verified.short_description = 'Mark selected internships as verified'
    
    def mark_unverified(self, request, queryset):
        """Mark selected internships as unverified"""
        updated = queryset.update(
            is_verified=False,
            verification_date=None,
            verified_by_id=None
        )
        self.message_user(request, f'{updated} internships marked as unverified.')
    mark_unverified.short_description = 'Mark selected internships as unverified'
    
    def mark_featured(self, request, queryset):
        """Mark selected internships as featured"""
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} internships marked as featured.')
    mark_featured.short_description = 'Mark selected internships as featured'
    
    def mark_unfeatured(self, request, queryset):
        """Mark selected internships as unfeatured"""
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'{updated} internships marked as unfeatured.')
    mark_unfeatured.short_description = 'Mark selected internships as unfeatured'
    
    def mark_active(self, request, queryset):
        """Mark selected internships as active"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} internships marked as active.')
    mark_active.short_description = 'Mark selected internships as active'
    
    def mark_inactive(self, request, queryset):
        """Mark selected internships as inactive"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} internships marked as inactive.')
    mark_inactive.short_description = 'Mark selected internships as inactive'