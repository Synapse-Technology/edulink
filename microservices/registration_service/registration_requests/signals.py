from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings
from celery import current_app

from .models import (
    RegistrationRequest,
    RegistrationRequestLog,
    RegistrationStatus,
    RiskLevel
)
from .services import (
    RiskAssessmentService,
    EmailVerificationService,
    EmailNotificationService
)


@receiver(pre_save, sender=RegistrationRequest)
def generate_request_number(sender, instance, **kwargs):
    """Generate unique request number before saving."""
    if not instance.request_number:
        # Generate request number based on current date and sequence
        today = timezone.now().date()
        date_str = today.strftime('%Y%m%d')
        
        # Get the count of requests created today
        today_count = RegistrationRequest.objects.filter(
            created_at__date=today
        ).count()
        
        # Generate request number: REG-YYYYMMDD-XXXX
        sequence = str(today_count + 1).zfill(4)
        instance.request_number = f"REG-{date_str}-{sequence}"


@receiver(pre_save, sender=RegistrationRequest)
def assess_risk_before_save(sender, instance, **kwargs):
    """Assess risk level before saving the registration request."""
    if not instance.pk:  # Only for new requests
        risk_service = RiskAssessmentService()
        risk_data = risk_service.assess_registration_risk(
            email=instance.email,
            organization_website=instance.organization_website,
            role=instance.role,
            organization_type=instance.organization_type
        )
        
        instance.risk_score = risk_data['risk_score']
        instance.risk_level = risk_data['risk_level']
        instance.risk_factors = risk_data['risk_factors']


@receiver(post_save, sender=RegistrationRequest)
def handle_new_registration_request(sender, instance, created, **kwargs):
    """Handle actions when a new registration request is created."""
    if created:
        # Log the creation
        RegistrationRequestLog.objects.create(
            registration_request=instance,
            action='CREATED',
            notes=f'Registration request created for {instance.email}'
        )
        
        # Note: Email verification is handled explicitly in the view after token generation
        # to avoid race conditions with the post_save signal
        
        # Notify admins for high-risk requests
        if instance.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            try:
                notification_service = EmailNotificationService()
                notification_service.notify_admin_high_risk_registration(instance)
            except Exception as e:
                # Log the error but don't fail the request creation
                RegistrationRequestLog.objects.create(
                    registration_request=instance,
                    action='ADMIN_NOTIFICATION_FAILED',
                    notes=f'Failed to notify admin of high-risk request: {str(e)}'
                )
        
        # Schedule automatic expiration if configured
        if hasattr(settings, 'REGISTRATION_REQUEST_EXPIRY_DAYS'):
            expiry_days = settings.REGISTRATION_REQUEST_EXPIRY_DAYS
            if expiry_days > 0:
                instance.expires_at = timezone.now() + timezone.timedelta(days=expiry_days)
                instance.save(update_fields=['expires_at'])


@receiver(post_save, sender=RegistrationRequest)
def handle_status_changes(sender, instance, created, **kwargs):
    """Handle actions when registration request status changes."""
    if not created:  # Only for updates
        # Get the previous instance to compare status
        try:
            previous = RegistrationRequest.objects.get(pk=instance.pk)
            if hasattr(instance, '_previous_status'):
                previous_status = instance._previous_status
            else:
                # If we can't get previous status, skip status change handling
                return
        except RegistrationRequest.DoesNotExist:
            return
        
        current_status = instance.status
        
        # Handle status transitions
        if previous_status != current_status:
            # Log the status change
            RegistrationRequestLog.objects.create(
                registration_request=instance,
                action='STATUS_CHANGED',
                notes=f'Status changed from {previous_status} to {current_status}'
            )
            
            # Handle specific status transitions
            if current_status == RegistrationStatus.EMAIL_VERIFIED:
                handle_email_verified(instance)
            elif current_status == RegistrationStatus.DOMAIN_VERIFIED:
                handle_domain_verified(instance)
            elif current_status == RegistrationStatus.INSTITUTIONAL_VERIFIED:
                handle_institutional_verified(instance)
            elif current_status == RegistrationStatus.APPROVED:
                handle_request_approved(instance)
            elif current_status == RegistrationStatus.REJECTED:
                handle_request_rejected(instance)
            elif current_status == RegistrationStatus.UNDER_REVIEW:
                handle_under_review(instance)


def handle_email_verified(instance):
    """Handle actions when email is verified."""
    try:
        # Trigger domain verification for institutional users
        if instance.role == 'institution_admin':
            from .services import DomainVerificationService
            domain_service = DomainVerificationService()
            domain_service.initiate_domain_verification(instance.id)
        
        # Send notification email
        notification_service = EmailNotificationService()
        notification_service.send_email_verified_notification(instance)
        
    except Exception as e:
        RegistrationRequestLog.objects.create(
            registration_request=instance,
            action='EMAIL_VERIFIED_HANDLING_FAILED',
            notes=f'Failed to handle email verification: {str(e)}'
        )


def handle_domain_verified(instance):
    """Handle actions when domain is verified."""
    try:
        # Trigger institutional verification
        from .services import InstitutionalVerificationService
        institutional_service = InstitutionalVerificationService()
        institutional_service.verify_institution(instance.id)
        
    except Exception as e:
        RegistrationRequestLog.objects.create(
            registration_request=instance,
            action='DOMAIN_VERIFIED_HANDLING_FAILED',
            notes=f'Failed to handle domain verification: {str(e)}'
        )


def handle_institutional_verified(instance):
    """Handle actions when institution is verified."""
    try:
        # Check if auto-approval is possible
        if should_auto_approve(instance):
            from .services import RegistrationService
            registration_service = RegistrationService()
            registration_service.approve_request(
                instance.id,
                approved_by='system',
                admin_notes='Auto-approved based on verification and risk assessment'
            )
        else:
            # Move to manual review
            instance.status = RegistrationStatus.UNDER_REVIEW
            instance.review_started_at = timezone.now()
            instance.save(update_fields=['status', 'review_started_at'])
            
            # Notify admins for manual review
            notification_service = EmailNotificationService()
            notification_service.notify_admin_review_required(instance)
        
    except Exception as e:
        RegistrationRequestLog.objects.create(
            registration_request=instance,
            action='INSTITUTIONAL_VERIFIED_HANDLING_FAILED',
            notes=f'Failed to handle institutional verification: {str(e)}'
        )


def handle_request_approved(instance):
    """Handle actions when request is approved."""
    try:
        # Create user account
        from .services import RegistrationService
        registration_service = RegistrationService()
        registration_service.create_user_account(instance.id)
        
        # Send approval notification
        notification_service = EmailNotificationService()
        notification_service.send_approval_notification(instance)
        
    except Exception as e:
        RegistrationRequestLog.objects.create(
            registration_request=instance,
            action='APPROVAL_HANDLING_FAILED',
            notes=f'Failed to handle request approval: {str(e)}'
        )


def handle_request_rejected(instance):
    """Handle actions when request is rejected."""
    try:
        # Send rejection notification
        notification_service = EmailNotificationService()
        notification_service.send_rejection_notification(instance)
        
    except Exception as e:
        RegistrationRequestLog.objects.create(
            registration_request=instance,
            action='REJECTION_HANDLING_FAILED',
            notes=f'Failed to handle request rejection: {str(e)}'
        )


def handle_under_review(instance):
    """Handle actions when request is under review."""
    try:
        # Send notification to user about review status
        notification_service = EmailNotificationService()
        notification_service.send_under_review_notification(instance)
        
        # Schedule reminder for admin if review takes too long
        if hasattr(settings, 'REGISTRATION_REVIEW_REMINDER_DAYS'):
            reminder_days = settings.REGISTRATION_REVIEW_REMINDER_DAYS
            if reminder_days > 0:
                # Schedule a Celery task to send reminder
                from .tasks import send_review_reminder
                send_review_reminder.apply_async(
                    args=[instance.id],
                    countdown=reminder_days * 24 * 60 * 60  # Convert days to seconds
                )
        
    except Exception as e:
        RegistrationRequestLog.objects.create(
            registration_request=instance,
            action='UNDER_REVIEW_HANDLING_FAILED',
            notes=f'Failed to handle under review status: {str(e)}'
        )


def should_auto_approve(instance):
    """Determine if a request should be auto-approved."""
    # Auto-approve criteria
    auto_approve_conditions = [
        instance.email_verified,
        instance.domain_verified,
        instance.institutional_verified,
        instance.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM],
        instance.risk_score <= getattr(settings, 'AUTO_APPROVAL_MAX_RISK_SCORE', 30)
    ]
    
    return all(auto_approve_conditions)


@receiver(pre_save, sender=RegistrationRequest)
def store_previous_status(sender, instance, **kwargs):
    """Store previous status for comparison in post_save signal."""
    if instance.pk:
        try:
            previous = RegistrationRequest.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except RegistrationRequest.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


# Cleanup signals for expired requests
@receiver(post_save, sender=RegistrationRequest)
def schedule_cleanup_expired_requests(sender, instance, created, **kwargs):
    """Schedule cleanup of expired requests."""
    if created and instance.expires_at:
        try:
            # Schedule a Celery task to clean up expired request
            from .tasks import cleanup_expired_request
            cleanup_expired_request.apply_async(
                args=[instance.id],
                eta=instance.expires_at
            )
        except Exception as e:
            # Log the error but don't fail the request creation
            RegistrationRequestLog.objects.create(
                registration_request=instance,
                action='CLEANUP_SCHEDULING_FAILED',
                notes=f'Failed to schedule cleanup task: {str(e)}'
            )