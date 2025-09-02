from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    Application,
    ApplicationDocument,
    SupervisorFeedback,
    ApplicationNote,
    ApplicationStatusHistory
)
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from service_clients import UserServiceClient, InternshipServiceClient


class ApplicationDocumentInline(admin.TabularInline):
    """Inline admin for application documents"""
    model = ApplicationDocument
    extra = 0
    readonly_fields = ['file_size', 'uploaded_by_display', 'created_at']
    fields = [
        'document_type', 'file', 'original_filename', 'file_size',
        'description', 'is_verified', 'uploaded_by_display', 'created_at'
    ]
    
    def uploaded_by_display(self, obj):
        """Display uploader name"""
        if obj.uploaded_by_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.uploaded_by_id)
                return user_data.get('full_name', f"User {obj.uploaded_by_id}")
            except:
                return f"User {obj.uploaded_by_id}"
        return "-"
    uploaded_by_display.short_description = "Uploaded By"


class ApplicationNoteInline(admin.TabularInline):
    """Inline admin for application notes"""
    model = ApplicationNote
    extra = 0
    readonly_fields = ['author_display', 'created_at']
    fields = ['content', 'note_type', 'is_internal', 'author_display', 'created_at']
    
    def author_display(self, obj):
        """Display author name"""
        if obj.author_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.author_id)
                return user_data.get('full_name', f"User {obj.author_id}")
            except:
                return f"User {obj.author_id}"
        return "-"
    author_display.short_description = "Author"


class ApplicationStatusHistoryInline(admin.TabularInline):
    """Inline admin for application status history"""
    model = ApplicationStatusHistory
    extra = 0
    readonly_fields = ['from_status', 'to_status', 'changed_by_display', 'created_at']
    fields = ['from_status', 'to_status', 'reason', 'changed_by_display', 'created_at']
    
    def changed_by_display(self, obj):
        """Display user who changed status"""
        if obj.changed_by_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.changed_by_id)
                return user_data.get('full_name', f"User {obj.changed_by_id}")
            except:
                return f"User {obj.changed_by_id}"
        return "-"
    changed_by_display.short_description = "Changed By"


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    """Admin interface for Application model"""
    
    list_display = [
        'id', 'student_display', 'internship_display', 'status_badge',
        'application_date', 'priority_score', 'days_since_application',
        'time_in_status', 'has_documents', 'has_feedback'
    ]
    
    list_filter = [
        'status', 'application_date', 'status_changed_at',
        'source', 'interview_type', 'created_at'
    ]
    
    search_fields = [
        'student_id', 'internship_id', 'employer_id',
        'cover_letter', 'review_notes', 'interview_notes'
    ]
    
    readonly_fields = [
        'student_display', 'internship_display', 'employer_display',
        'application_date', 'status_changed_at', 'status_changed_by_display',
        'reviewed_by_display', 'reviewed_at', 'days_since_application',
        'time_in_status', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'student_display', 'internship_display', 'employer_display',
                'application_date', 'source', 'priority_score'
            )
        }),
        ('Application Content', {
            'fields': ('cover_letter', 'resume', 'custom_answers')
        }),
        ('Status Information', {
            'fields': (
                'status', 'previous_status', 'status_changed_at',
                'status_changed_by_display', 'days_since_application', 'time_in_status'
            )
        }),
        ('Review Information', {
            'fields': (
                'reviewed_by_display', 'reviewed_at', 'review_notes'
            ),
            'classes': ('collapse',)
        }),
        ('Interview Information', {
            'fields': (
                'interview_date', 'interview_location', 'interview_type', 'interview_notes'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [ApplicationDocumentInline, ApplicationNoteInline, ApplicationStatusHistoryInline]
    
    ordering = ['-application_date']
    date_hierarchy = 'application_date'
    
    actions = [
        'mark_as_under_review', 'mark_as_reviewed', 'mark_as_accepted',
        'mark_as_rejected', 'mark_as_withdrawn', 'recalculate_priority_scores'
    ]
    
    def student_display(self, obj):
        """Display student name with link"""
        user_client = UserServiceClient()
        try:
            user_data = user_client.get_user(obj.student_id)
            name = user_data.get('full_name', f"Student {obj.student_id}")
            return format_html(
                '<a href="#" title="Student ID: {}">{}</a>',
                obj.student_id, name
            )
        except:
            return f"Student {obj.student_id}"
    student_display.short_description = "Student"
    
    def internship_display(self, obj):
        """Display internship title with link"""
        internship_client = InternshipServiceClient()
        try:
            internship_data = internship_client.get_internship(obj.internship_id)
            title = internship_data.get('title', f"Internship {obj.internship_id}")
            return format_html(
                '<a href="#" title="Internship ID: {}">{}</a>',
                obj.internship_id, title[:50] + ('...' if len(title) > 50 else '')
            )
        except:
            return f"Internship {obj.internship_id}"
    internship_display.short_description = "Internship"
    
    def employer_display(self, obj):
        """Display employer name"""
        if obj.employer_id:
            user_client = UserServiceClient()
            try:
                employer_data = user_client.get_employer(obj.employer_id)
                return employer_data.get('company_name', f"Employer {obj.employer_id}")
            except:
                return f"Employer {obj.employer_id}"
        return "-"
    employer_display.short_description = "Employer"
    
    def status_badge(self, obj):
        """Display status with color coding"""
        colors = {
            'pending': '#ffc107',
            'under_review': '#17a2b8',
            'interview_scheduled': '#6f42c1',
            'reviewed': '#007bff',
            'accepted': '#28a745',
            'rejected': '#dc3545',
            'withdrawn': '#6c757d',
            'expired': '#fd7e14'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = "Status"
    
    def status_changed_by_display(self, obj):
        """Display user who changed status"""
        if obj.status_changed_by_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.status_changed_by_id)
                return user_data.get('full_name', f"User {obj.status_changed_by_id}")
            except:
                return f"User {obj.status_changed_by_id}"
        return "-"
    status_changed_by_display.short_description = "Status Changed By"
    
    def reviewed_by_display(self, obj):
        """Display user who reviewed application"""
        if obj.reviewed_by_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.reviewed_by_id)
                return user_data.get('full_name', f"User {obj.reviewed_by_id}")
            except:
                return f"User {obj.reviewed_by_id}"
        return "-"
    reviewed_by_display.short_description = "Reviewed By"
    
    def time_in_status(self, obj):
        """Display time in current status"""
        time_delta = obj.time_in_current_status
        days = time_delta.days
        if days == 0:
            return "Today"
        elif days == 1:
            return "1 day"
        else:
            return f"{days} days"
    time_in_status.short_description = "Time in Status"
    
    def has_documents(self, obj):
        """Check if application has additional documents"""
        return obj.documents.exists()
    has_documents.boolean = True
    has_documents.short_description = "Has Docs"
    
    def has_feedback(self, obj):
        """Check if application has supervisor feedback"""
        return hasattr(obj, 'supervisor_feedback') and obj.supervisor_feedback is not None
    has_feedback.boolean = True
    has_feedback.short_description = "Has Feedback"
    
    # Admin actions
    def mark_as_under_review(self, request, queryset):
        """Mark selected applications as under review"""
        updated = 0
        for application in queryset:
            if application.can_transition_to('under_review'):
                application.status = 'under_review'
                application.status_changed_by_id = request.user.id
                application.save()
                updated += 1
        
        self.message_user(
            request,
            f"{updated} applications marked as under review."
        )
    mark_as_under_review.short_description = "Mark as under review"
    
    def mark_as_reviewed(self, request, queryset):
        """Mark selected applications as reviewed"""
        updated = 0
        for application in queryset:
            if application.can_transition_to('reviewed'):
                application.status = 'reviewed'
                application.reviewed_by_id = request.user.id
                application.reviewed_at = timezone.now()
                application.status_changed_by_id = request.user.id
                application.save()
                updated += 1
        
        self.message_user(
            request,
            f"{updated} applications marked as reviewed."
        )
    mark_as_reviewed.short_description = "Mark as reviewed"
    
    def mark_as_accepted(self, request, queryset):
        """Mark selected applications as accepted"""
        updated = 0
        for application in queryset:
            if application.can_transition_to('accepted'):
                application.status = 'accepted'
                application.status_changed_by_id = request.user.id
                application.save()
                updated += 1
        
        self.message_user(
            request,
            f"{updated} applications marked as accepted."
        )
    mark_as_accepted.short_description = "Mark as accepted"
    
    def mark_as_rejected(self, request, queryset):
        """Mark selected applications as rejected"""
        updated = 0
        for application in queryset:
            if application.can_transition_to('rejected'):
                application.status = 'rejected'
                application.status_changed_by_id = request.user.id
                application.save()
                updated += 1
        
        self.message_user(
            request,
            f"{updated} applications marked as rejected."
        )
    mark_as_rejected.short_description = "Mark as rejected"
    
    def mark_as_withdrawn(self, request, queryset):
        """Mark selected applications as withdrawn"""
        updated = 0
        for application in queryset:
            if application.can_transition_to('withdrawn'):
                application.status = 'withdrawn'
                application.status_changed_by_id = request.user.id
                application.save()
                updated += 1
        
        self.message_user(
            request,
            f"{updated} applications marked as withdrawn."
        )
    mark_as_withdrawn.short_description = "Mark as withdrawn"
    
    def recalculate_priority_scores(self, request, queryset):
        """Recalculate priority scores for selected applications"""
        updated = 0
        for application in queryset:
            # Simplified priority calculation
            # In a real implementation, this would use more complex logic
            base_score = 50
            
            # Adjust based on status
            if application.status == 'pending':
                base_score += 20
            elif application.status == 'under_review':
                base_score += 15
            elif application.status == 'interview_scheduled':
                base_score += 30
            
            # Adjust based on time since application
            days_old = application.days_since_application
            if days_old > 30:
                base_score += 10
            elif days_old > 14:
                base_score += 5
            
            application.priority_score = min(100, max(0, base_score))
            application.save()
            updated += 1
        
        self.message_user(
            request,
            f"Priority scores recalculated for {updated} applications."
        )
    recalculate_priority_scores.short_description = "Recalculate priority scores"


@admin.register(ApplicationDocument)
class ApplicationDocumentAdmin(admin.ModelAdmin):
    """Admin interface for ApplicationDocument model"""
    
    list_display = [
        'id', 'application_link', 'document_type', 'original_filename',
        'file_size_display', 'is_verified', 'uploaded_by_display', 'created_at'
    ]
    
    list_filter = [
        'document_type', 'is_verified', 'created_at', 'verified_at'
    ]
    
    search_fields = [
        'original_filename', 'description', 'application__student_id'
    ]
    
    readonly_fields = [
        'application', 'file_size', 'uploaded_by_display',
        'verified_by_display', 'created_at'
    ]
    
    def application_link(self, obj):
        """Link to related application"""
        url = reverse('admin:applications_application_change', args=[obj.application.id])
        return format_html('<a href="{}">{}</a>', url, obj.application)
    application_link.short_description = "Application"
    
    def file_size_display(self, obj):
        """Display file size in human readable format"""
        if obj.file_size:
            if obj.file_size < 1024:
                return f"{obj.file_size} B"
            elif obj.file_size < 1024 * 1024:
                return f"{obj.file_size / 1024:.1f} KB"
            else:
                return f"{obj.file_size / (1024 * 1024):.1f} MB"
        return "-"
    file_size_display.short_description = "File Size"
    
    def uploaded_by_display(self, obj):
        """Display uploader name"""
        if obj.uploaded_by_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.uploaded_by_id)
                return user_data.get('full_name', f"User {obj.uploaded_by_id}")
            except:
                return f"User {obj.uploaded_by_id}"
        return "-"
    uploaded_by_display.short_description = "Uploaded By"
    
    def verified_by_display(self, obj):
        """Display verifier name"""
        if obj.verified_by_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.verified_by_id)
                return user_data.get('full_name', f"User {obj.verified_by_id}")
            except:
                return f"User {obj.verified_by_id}"
        return "-"
    verified_by_display.short_description = "Verified By"


@admin.register(SupervisorFeedback)
class SupervisorFeedbackAdmin(admin.ModelAdmin):
    """Admin interface for SupervisorFeedback model"""
    
    list_display = [
        'id', 'application_link', 'supervisor_display', 'rating',
        'average_detailed_rating', 'would_recommend', 'created_at'
    ]
    
    list_filter = [
        'rating', 'would_recommend', 'technical_skills_rating',
        'communication_rating', 'professionalism_rating', 'created_at'
    ]
    
    search_fields = [
        'feedback', 'strengths', 'improvement_areas',
        'application__student_id', 'supervisor_id'
    ]
    
    readonly_fields = [
        'application', 'supervisor_display', 'average_detailed_rating', 'created_at', 'updated_at'
    ]
    
    def application_link(self, obj):
        """Link to related application"""
        url = reverse('admin:applications_application_change', args=[obj.application.id])
        return format_html('<a href="{}">{}</a>', url, obj.application)
    application_link.short_description = "Application"
    
    def supervisor_display(self, obj):
        """Display supervisor name"""
        if obj.supervisor_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.supervisor_id)
                return user_data.get('full_name', f"Supervisor {obj.supervisor_id}")
            except:
                return f"Supervisor {obj.supervisor_id}"
        return "-"
    supervisor_display.short_description = "Supervisor"


@admin.register(ApplicationNote)
class ApplicationNoteAdmin(admin.ModelAdmin):
    """Admin interface for ApplicationNote model"""
    
    list_display = [
        'id', 'application_link', 'note_type', 'is_internal',
        'author_display', 'content_preview', 'created_at'
    ]
    
    list_filter = [
        'note_type', 'is_internal', 'created_at'
    ]
    
    search_fields = [
        'content', 'application__student_id', 'author_id'
    ]
    
    readonly_fields = [
        'application', 'author_display', 'created_at', 'updated_at'
    ]
    
    def application_link(self, obj):
        """Link to related application"""
        url = reverse('admin:applications_application_change', args=[obj.application.id])
        return format_html('<a href="{}">{}</a>', url, obj.application)
    application_link.short_description = "Application"
    
    def author_display(self, obj):
        """Display author name"""
        if obj.author_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.author_id)
                return user_data.get('full_name', f"User {obj.author_id}")
            except:
                return f"User {obj.author_id}"
        return "-"
    author_display.short_description = "Author"
    
    def content_preview(self, obj):
        """Show preview of note content"""
        if obj.content:
            return obj.content[:100] + ('...' if len(obj.content) > 100 else '')
        return "-"
    content_preview.short_description = "Content Preview"


@admin.register(ApplicationStatusHistory)
class ApplicationStatusHistoryAdmin(admin.ModelAdmin):
    """Admin interface for ApplicationStatusHistory model"""
    
    list_display = [
        'id', 'application_link', 'from_status', 'to_status',
        'changed_by_display', 'reason_preview', 'created_at'
    ]
    
    list_filter = [
        'from_status', 'to_status', 'created_at'
    ]
    
    search_fields = [
        'reason', 'application__student_id', 'changed_by_id'
    ]
    
    readonly_fields = [
        'application', 'from_status', 'to_status',
        'changed_by_display', 'created_at'
    ]
    
    def application_link(self, obj):
        """Link to related application"""
        url = reverse('admin:applications_application_change', args=[obj.application.id])
        return format_html('<a href="{}">{}</a>', url, obj.application)
    application_link.short_description = "Application"
    
    def changed_by_display(self, obj):
        """Display user who changed status"""
        if obj.changed_by_id:
            user_client = UserServiceClient()
            try:
                user_data = user_client.get_user(obj.changed_by_id)
                return user_data.get('full_name', f"User {obj.changed_by_id}")
            except:
                return f"User {obj.changed_by_id}"
        return "-"
    changed_by_display.short_description = "Changed By"
    
    def reason_preview(self, obj):
        """Show preview of reason"""
        if obj.reason:
            return obj.reason[:50] + ('...' if len(obj.reason) > 50 else '')
        return "-"
    reason_preview.short_description = "Reason"