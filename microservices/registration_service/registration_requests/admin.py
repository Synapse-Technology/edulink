from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count, Q
from django.contrib.admin import SimpleListFilter
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.utils.safestring import mark_safe

from .models import (
    RegistrationRequest,
    RegistrationRequestLog,
    RegistrationRequestAttachment,
    RegistrationStatus,
    UserRole,
    RiskLevel
)
from .services import RegistrationService


class RegistrationStatusFilter(SimpleListFilter):
    """Custom filter for registration status."""
    title = 'Registration Status'
    parameter_name = 'status'

    def lookups(self, request, model_admin):
        return RegistrationStatus.choices

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(status=self.value())
        return queryset


class RiskLevelFilter(SimpleListFilter):
    """Custom filter for risk level."""
    title = 'Risk Level'
    parameter_name = 'risk_level'

    def lookups(self, request, model_admin):
        return RiskLevel.choices

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(risk_level=self.value())
        return queryset


class VerificationStatusFilter(SimpleListFilter):
    """Custom filter for verification status."""
    title = 'Verification Status'
    parameter_name = 'verification_status'

    def lookups(self, request, model_admin):
        return [
            ('email_verified', 'Email Verified'),
            ('domain_verified', 'Domain Verified'),
            ('institutional_verified', 'Institutional Verified'),
            ('all_verified', 'All Verified'),
            ('none_verified', 'None Verified'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'email_verified':
            return queryset.filter(email_verified=True)
        elif self.value() == 'domain_verified':
            return queryset.filter(domain_verified=True)
        elif self.value() == 'institutional_verified':
            return queryset.filter(institutional_verified=True)
        elif self.value() == 'all_verified':
            return queryset.filter(
                email_verified=True,
                domain_verified=True,
                institutional_verified=True
            )
        elif self.value() == 'none_verified':
            return queryset.filter(
                email_verified=False,
                domain_verified=False,
                institutional_verified=False
            )
        return queryset


class RegistrationRequestLogInline(admin.TabularInline):
    """Inline admin for registration request logs."""
    model = RegistrationRequestLog
    extra = 0
    readonly_fields = ('created_at', 'action', 'performed_by', 'old_status', 'new_status', 'notes')
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


class RegistrationRequestAttachmentInline(admin.TabularInline):
    """Inline admin for registration request attachments."""
    model = RegistrationRequestAttachment
    extra = 0
    readonly_fields = ('created_at', 'file_size', 'file_type', 'file_url', 'uploaded_by')
    fields = ('file_name', 'description', 'file_type', 'file_size', 'file_url', 'uploaded_by', 'is_verified', 'created_at')


@admin.register(RegistrationRequest)
class RegistrationRequestAdmin(admin.ModelAdmin):
    """Admin interface for registration requests."""
    
    list_display = [
        'request_number',
        'get_full_name',
        'email',
        'role',
        'organization_name',
        'get_status_badge',
        'get_risk_badge',
        'get_verification_status',
        'created_at',
        'get_actions'
    ]
    
    list_filter = [
        RegistrationStatusFilter,
        RiskLevelFilter,
        VerificationStatusFilter,
        'role',
        'organization_type',
        'email_verified',
        'domain_verified',
        'institutional_verified',
        'created_at',
        'user_account_created'
    ]
    
    search_fields = [
        'request_number',
        'email',
        'first_name',
        'last_name',
        'organization_name',
        'phone_number'
    ]
    
    readonly_fields = [
        'request_number',
        'created_at',
        'updated_at',
        'risk_score',
        'risk_level',
        'email_verification_token',
        'email_verification_sent_at',
        'domain_verification_details',
        'institutional_verification_details',
        'approved_by',
        'rejected_by',
        'ip_address',
        'user_agent'
    ]
    
    fieldsets = [
        ('Basic Information', {
            'fields': [
                'request_number',
                'status',
                'role',
                ('first_name', 'last_name'),
                'email',
                'phone_number',
                'password'
            ]
        }),
        ('Organization Information', {
            'fields': [
                'organization_name',
                'organization_type',
                'organization_website',
                'organization_description'
            ]
        }),
        ('Risk Assessment', {
            'fields': [
                'risk_score',
                'risk_level',
                'risk_factors'
            ],
            'classes': ['collapse']
        }),
        ('Email Verification', {
            'fields': [
                'email_verified',
                'email_verification_token',
                'email_verification_sent_at',
                'email_verified_at'
            ],
            'classes': ['collapse']
        }),
        ('Domain Verification', {
            'fields': [
                'domain_verified',
                'domain_verification_method',
                'domain_verification_token',
                'domain_verification_sent_at',
                'domain_verified_at'
            ],
            'classes': ['collapse']
        }),
        ('Institutional Verification', {
            'fields': [
                'institutional_verified',
                'institutional_verification_source',
                'institutional_verification_data',
                'institutional_verified_at'
            ],
            'classes': ['collapse']
        }),
        ('Review Information', {
            'fields': [
                'assigned_reviewer',
                'review_started_at',
                'review_notes',
                'admin_notes'
            ]
        }),
        ('Approval/Rejection', {
            'fields': [
                'approved_at',
                'approved_by',
                'rejected_at',
                'rejected_by',
                'rejection_reason'
            ],
            'classes': ['collapse']
        }),
        ('User Account', {
            'fields': [
                'user_account_created',
                'user_account_created_at',
                'user_id'
            ],
            'classes': ['collapse']
        }),
        ('Technical Information', {
            'fields': [
                'ip_address',
                'user_agent',
                'created_at',
                'updated_at',
                'expires_at'
            ],
            'classes': ['collapse']
        })
    ]
    
    inlines = [RegistrationRequestLogInline, RegistrationRequestAttachmentInline]
    
    actions = [
        'approve_selected',
        'reject_selected',
        'assign_to_me',
        'send_email_verification',
        'mark_as_under_review'
    ]
    
    def get_full_name(self, obj):
        """Get full name of the registrant."""
        return f"{obj.first_name} {obj.last_name}"
    get_full_name.short_description = 'Full Name'
    
    def get_status_badge(self, obj):
        """Get colored status badge."""
        colors = {
            RegistrationStatus.PENDING: 'orange',
            RegistrationStatus.EMAIL_VERIFICATION_SENT: 'blue',
            RegistrationStatus.EMAIL_VERIFIED: 'lightblue',
            RegistrationStatus.DOMAIN_VERIFICATION_PENDING: 'purple',
            RegistrationStatus.DOMAIN_VERIFIED: 'lightgreen',
            RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING: 'brown',
            RegistrationStatus.INSTITUTIONAL_VERIFIED: 'darkgreen',
            RegistrationStatus.UNDER_REVIEW: 'yellow',
            RegistrationStatus.APPROVED: 'green',
            RegistrationStatus.REJECTED: 'red',
            RegistrationStatus.EXPIRED: 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    get_status_badge.short_description = 'Status'
    
    def get_risk_badge(self, obj):
        """Get colored risk level badge."""
        colors = {
            RiskLevel.LOW: 'green',
            RiskLevel.MEDIUM: 'orange',
            RiskLevel.HIGH: 'red',
            RiskLevel.CRITICAL: 'darkred'
        }
        color = colors.get(obj.risk_level, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_risk_level_display()
        )
    get_risk_badge.short_description = 'Risk Level'
    
    def get_verification_status(self, obj):
        """Get verification status indicators."""
        statuses = []
        if obj.email_verified:
            statuses.append('<span style="color: green;">✓ Email</span>')
        else:
            statuses.append('<span style="color: red;">✗ Email</span>')
            
        if obj.domain_verified:
            statuses.append('<span style="color: green;">✓ Domain</span>')
        else:
            statuses.append('<span style="color: red;">✗ Domain</span>')
            
        if obj.institutional_verified:
            statuses.append('<span style="color: green;">✓ Institution</span>')
        else:
            statuses.append('<span style="color: red;">✗ Institution</span>')
            
        return format_html(' | '.join(statuses))
    get_verification_status.short_description = 'Verification'
    
    def get_actions(self, obj):
        """Get action buttons for each request."""
        actions = []
        
        if obj.status in [RegistrationStatus.UNDER_REVIEW, RegistrationStatus.INSTITUTIONAL_VERIFIED]:
            approve_url = reverse('admin:registration_requests_registrationrequest_approve', args=[obj.pk])
            reject_url = reverse('admin:registration_requests_registrationrequest_reject', args=[obj.pk])
            actions.append(f'<a href="{approve_url}" style="color: green;">Approve</a>')
            actions.append(f'<a href="{reject_url}" style="color: red;">Reject</a>')
        
        if not obj.email_verified and obj.status == RegistrationStatus.PENDING:
            verify_url = reverse('admin:registration_requests_registrationrequest_send_verification', args=[obj.pk])
            actions.append(f'<a href="{verify_url}" style="color: blue;">Send Verification</a>')
        
        return format_html(' | '.join(actions)) if actions else '-'
    get_actions.short_description = 'Actions'
    
    def approve_selected(self, request, queryset):
        """Bulk approve selected requests."""
        service = RegistrationService()
        approved_count = 0
        
        for request_obj in queryset:
            try:
                service.approve_request(
                    request_obj.id,
                    approved_by=request.user.username,
                    admin_notes="Bulk approved via admin interface"
                )
                approved_count += 1
            except Exception as e:
                messages.error(request, f"Failed to approve {request_obj.request_number}: {str(e)}")
        
        if approved_count > 0:
            messages.success(request, f"Successfully approved {approved_count} requests.")
    
    approve_selected.short_description = "Approve selected requests"
    
    def reject_selected(self, request, queryset):
        """Bulk reject selected requests."""
        service = RegistrationService()
        rejected_count = 0
        
        for request_obj in queryset:
            try:
                service.reject_request(
                    request_obj.id,
                    rejected_by=request.user.username,
                    reason="Bulk rejected via admin interface"
                )
                rejected_count += 1
            except Exception as e:
                messages.error(request, f"Failed to reject {request_obj.request_number}: {str(e)}")
        
        if rejected_count > 0:
            messages.success(request, f"Successfully rejected {rejected_count} requests.")
    
    reject_selected.short_description = "Reject selected requests"
    
    def assign_to_me(self, request, queryset):
        """Assign selected requests to current user."""
        updated = queryset.update(
            assigned_reviewer=request.user.username,
            review_started_at=timezone.now()
        )
        messages.success(request, f"Assigned {updated} requests to you for review.")
    
    assign_to_me.short_description = "Assign to me for review"
    
    def send_email_verification(self, request, queryset):
        """Send email verification to selected requests."""
        from .services import EmailVerificationService
        service = EmailVerificationService()
        sent_count = 0
        
        for request_obj in queryset.filter(status=RegistrationStatus.PENDING):
            try:
                service.send_verification_email(request_obj)
                sent_count += 1
            except Exception as e:
                messages.error(request, f"Failed to send verification to {request_obj.email}: {str(e)}")
        
        if sent_count > 0:
            messages.success(request, f"Sent verification emails to {sent_count} requests.")
    
    send_email_verification.short_description = "Send email verification"
    
    def mark_as_under_review(self, request, queryset):
        """Mark selected requests as under review."""
        updated = queryset.filter(
            status__in=[
                RegistrationStatus.EMAIL_VERIFIED,
                RegistrationStatus.DOMAIN_VERIFIED,
                RegistrationStatus.INSTITUTIONAL_VERIFIED
            ]
        ).update(
            status=RegistrationStatus.UNDER_REVIEW,
            review_started_at=timezone.now(),
            assigned_reviewer=request.user.username
        )
        messages.success(request, f"Marked {updated} requests as under review.")
    
    mark_as_under_review.short_description = "Mark as under review"
    
    def get_queryset(self, request):
        """Optimize queryset with select_related and prefetch_related."""
        return super().get_queryset(request).select_related().prefetch_related(
            'logs',
            'attachments'
        )
    
    def changelist_view(self, request, extra_context=None):
        """Add summary statistics to changelist view."""
        extra_context = extra_context or {}
        
        # Get summary statistics
        queryset = self.get_queryset(request)
        
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status=RegistrationStatus.PENDING).count(),
            'under_review': queryset.filter(status=RegistrationStatus.UNDER_REVIEW).count(),
            'approved': queryset.filter(status=RegistrationStatus.APPROVED).count(),
            'rejected': queryset.filter(status=RegistrationStatus.REJECTED).count(),
            'high_risk': queryset.filter(risk_level__in=[RiskLevel.HIGH, RiskLevel.CRITICAL]).count(),
        }
        
        extra_context['registration_stats'] = stats
        
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(RegistrationRequestLog)
class RegistrationRequestLogAdmin(admin.ModelAdmin):
    """Admin interface for registration request logs."""
    
    list_display = [
        'registration_request',
        'action',
        'performed_by',
        'created_at'
    ]
    
    list_filter = [
        'action',
        'created_at',
        'performed_by'
    ]
    
    search_fields = [
        'registration_request__request_number',
        'registration_request__email',
        'action',
        'performed_by'
    ]
    
    readonly_fields = [
        'registration_request',
        'created_at',
        'action',
        'performed_by',
        'old_status',
        'new_status',
        'notes',
        'metadata'
    ]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RegistrationRequestAttachment)
class RegistrationRequestAttachmentAdmin(admin.ModelAdmin):
    """Admin interface for registration request attachments."""
    
    list_display = [
        'registration_request',
        'file_name',
        'description',
        'created_at',
        'file_size',
        'file_type'
    ]
    
    list_filter = [
        'created_at',
        'file_type',
        'is_verified'
    ]
    
    search_fields = [
        'registration_request__request_number',
        'registration_request__email',
        'description'
    ]
    
    readonly_fields = [
        'created_at',
        'file_size',
        'file_type',
        'file_url',
        'uploaded_by'
    ]