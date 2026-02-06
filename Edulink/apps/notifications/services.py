"""
Notification services for Edulink platform.
Handles email notifications, SMS, and other communication channels.
Follows architecture rules: pure business logic, no HTTP handling, triggers events.
"""

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging
from typing import Optional, Dict, Any, List
import uuid

from edulink.apps.ledger.services import record_event
from .models import Notification, EmailVerificationToken, PasswordResetToken

logger = logging.getLogger(__name__)


def create_notification(
    *,
    recipient_id: str,
    type: str,
    title: str,
    body: str,
    channel: str = Notification.CHANNEL_EMAIL,
    template_name: str = "",
    related_entity_type: str = "",
    related_entity_id: Optional[str] = None,
    actor_id: Optional[str] = None,
) -> Notification:
    """
    Create a new notification record.
    Follows architecture rule: no business logic in models, pure data storage.
    
    Args:
        recipient_id: UUID of the recipient user
        type: Notification type from Notification.TYPE_CHOICES
        title: Notification title
        body: Notification body content
        channel: Delivery channel (email, sms, push, in_app)
        template_name: Template name for rendering
        related_entity_type: Type of related entity (e.g., "Internship", "Application")
        related_entity_id: UUID of related entity
        actor_id: UUID of the actor who triggered the notification (optional)
    
    Returns:
        Notification: Created notification instance
    
    Raises:
        ValueError: If invalid notification type or channel
    """
    # Validate notification type
    valid_types = [choice[0] for choice in Notification.TYPE_CHOICES]
    if type not in valid_types:
        raise ValueError(f"Invalid notification type: {type}")
    
    # Validate channel
    valid_channels = [choice[0] for choice in Notification.CHANNEL_CHOICES]
    if channel not in valid_channels:
        raise ValueError(f"Invalid notification channel: {channel}")
    
    notification = Notification.objects.create(
        recipient_id=uuid.UUID(recipient_id),
        type=type,
        channel=channel,
        title=title,
        body=body,
        template_name=template_name,
        related_entity_type=related_entity_type,
        related_entity_id=uuid.UUID(related_entity_id) if related_entity_id else None,
        status=Notification.STATUS_PENDING
    )
    
    # Determine actor_id for ledger event
    # If not provided, we use None as permitted by the ledger model
    ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

    # Record notification creation event
    record_event(
        event_type="NOTIFICATION_CREATED",
        actor_id=ledger_actor_id,
        entity_type="User",
        entity_id=recipient_id,
        payload={
            "notification_id": str(notification.id),
            "type": type,
            "channel": channel,
            "title": title,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "created_at": timezone.now().isoformat()
        }
    )
    
    logger.info(f"Notification created: {notification.id} for user {recipient_id}")
    return notification


def send_employer_request_confirmation(request: Any, actor_id: Optional[str] = None) -> bool:
    """
    Send confirmation email for employer onboarding request.
    """
    context = {
        "name": request.name,
        "official_email": request.official_email,
        "domain": request.domain,
        "tracking_code": request.tracking_code,
    }
    
    return send_email_notification(
        recipient_email=request.official_email,
        subject="Employer Onboarding Request Received - Edulink",
        template_name="employer_request_received",
        context=context,
        actor_id=actor_id
    )


def send_employer_approval_notification(request: Any, raw_token: str, actor_id: Optional[str] = None) -> bool:
    """
    Send approval email with activation link.
    """
    invite_link = f"{settings.FRONTEND_URL}/employer/activate?id={request.employer_invite.id}&token={raw_token}"
    
    context = {
        "name": request.name,
        "invite_link": invite_link,
    }
    
    return send_email_notification(
        recipient_email=request.official_email,
        subject="Employer Request Approved - Activate Your Account",
        template_name="employer_request_approved",
        context=context,
        actor_id=actor_id
    )


def send_employer_rejection_notification(request: Any, actor_id: Optional[str] = None) -> bool:
    """
    Send rejection email.
    """
    context = {
        "name": request.name,
        "rejection_reason": request.rejection_reason,
    }
    
    return send_email_notification(
        recipient_email=request.official_email,
        subject="Update on Your Employer Onboarding Request",
        template_name="employer_request_rejected",
        context=context,
        actor_id=actor_id
    )


def send_admin_new_onboarding_request_notification(
    *,
    request_type: str,
    name: str,
    representative_name: str,
    email: str,
    tracking_code: str,
    review_link: str,
    actor_id: Optional[str] = None
) -> int:
    """
    Send notification to platform admins about a new onboarding request.
    
    Args:
        request_type: Type of request ("Institution" or "Employer")
        name: Name of the organization
        representative_name: Name of the representative
        email: Email of the representative
        tracking_code: Tracking code of the request
        review_link: URL to review the request
        actor_id: Optional actor ID
        
    Returns:
        int: Number of emails sent
    """
    try:
        from edulink.apps.platform_admin.queries import get_active_admins
        
        # Get all active admins (Super Admin or Platform Admin)
        admins = get_active_admins()
        
        sent_count = 0
        for admin_profile in admins:
            if not admin_profile.user or not admin_profile.user.email:
                continue
                
            context = {
                "request_type": request_type,
                "name": name,
                "representative_name": representative_name,
                "email": email,
                "tracking_code": tracking_code,
                "review_link": review_link,
                "user_id": str(admin_profile.user.id)  # For entity_id resolution in send_email_notification
            }
            
            success = send_email_notification(
                recipient_email=admin_profile.user.email,
                subject=f"New {request_type} Onboarding Request - {name}",
                template_name="admin_new_onboarding_request",
                context=context,
                actor_id=actor_id
            )
            
            if success:
                sent_count += 1
                
                # Also create a notification record for the admin
                try:
                    create_notification(
                        recipient_id=str(admin_profile.user.id),
                        type=Notification.TYPE_ADMIN_NEW_ONBOARDING_REQUEST,
                        title=f"New {request_type} Onboarding Request",
                        body=f"{name} has submitted a new onboarding request.",
                        channel=Notification.CHANNEL_EMAIL,
                        related_entity_type="OnboardingRequest", # Generic type, or specific if we had ID
                        related_entity_id=None, # We don't have the request ID passed as UUID here conveniently, skipping for now or I should pass it
                        actor_id=actor_id
                    )
                except Exception as e:
                    logger.error(f"Failed to create notification record for admin {admin_profile.user.email}: {e}")

        return sent_count
    
    except ImportError:
        logger.error("Could not import PlatformStaffProfile. Is platform_admin app installed?")
        return 0
    except Exception as e:
        logger.error(f"Error sending admin onboarding notifications: {e}")
        return 0

def send_certificate_generated_notification(*, student_email: str, student_name: str, position: str, employer_name: str, tracking_code: str, artifact_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification when an internship certificate is generated.
    """
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/student/artifacts"
    
    context = {
        "student_name": student_name,
        "position": position,
        "employer_name": employer_name,
        "tracking_code": tracking_code,
        "dashboard_url": dashboard_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student_email,
        subject=f"Certificate Generated - {position} at {employer_name}",
        template_name="certificate_generated",
        context=context,
        actor_id=actor_id
    )

    if success:
         # Find user ID from email for notification record
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=student_email).first()
        
        if user:
            create_notification(
                recipient_id=str(user.id),
                type=Notification.TYPE_CERTIFICATE_GENERATED,
                title="Certificate Available",
                body=f"Your certificate for {position} at {employer_name} is ready.",
                channel=Notification.CHANNEL_EMAIL,
                related_entity_type="Artifact",
                related_entity_id=artifact_id,
                actor_id=actor_id
            )

    return success

def send_performance_summary_generated_notification(*, student_email: str, student_name: str, employer_name: str, logbooks_count: int, milestones_count: int, artifact_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification when a performance summary is generated.
    """
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/student/artifacts"
    
    context = {
        "student_name": student_name,
        "employer_name": employer_name,
        "logbooks_count": logbooks_count,
        "milestones_count": milestones_count,
        "dashboard_url": dashboard_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student_email,
        subject="Performance Summary Generated",
        template_name="performance_summary_generated",
        context=context,
        actor_id=actor_id
    )

    if success:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=student_email).first()
        
        if user:
            create_notification(
                recipient_id=str(user.id),
                type=Notification.TYPE_PERFORMANCE_SUMMARY_GENERATED,
                title="Performance Summary Available",
                body=f"Your performance summary for {employer_name} is ready.",
                channel=Notification.CHANNEL_EMAIL,
                related_entity_type="Artifact",
                related_entity_id=artifact_id,
                actor_id=actor_id
            )

    return success

def send_logbook_report_generated_notification(*, student_email: str, student_name: str, employer_name: str, logbooks_count: int, tracking_code: str, artifact_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification when a logbook report is generated.
    """
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/student/artifacts"
    
    context = {
        "student_name": student_name,
        "employer_name": employer_name,
        "logbooks_count": logbooks_count,
        "tracking_code": tracking_code,
        "dashboard_url": dashboard_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student_email,
        subject="Logbook Report Generated",
        template_name="logbook_report_generated",
        context=context,
        actor_id=actor_id
    )

    if success:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=student_email).first()
        
        if user:
            create_notification(
                recipient_id=str(user.id),
                type=Notification.TYPE_LOGBOOK_REPORT_GENERATED,
                title="Logbook Report Available",
                body=f"Your logbook report for {employer_name} is ready.",
                channel=Notification.CHANNEL_EMAIL,
                related_entity_type="Artifact",
                related_entity_id=artifact_id,
                actor_id=actor_id
            )

    return success


def send_employer_onboarded_notification(user: Any, employer: Any, actor_id: Optional[str] = None) -> bool:
    """
    Send welcome email after admin activation.
    """
    dashboard_link = f"{settings.FRONTEND_URL}/employer/login"
    
    context = {
        "user_name": f"{user.first_name} {user.last_name}",
        "employer_name": employer.name,
        "dashboard_link": dashboard_link,
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject="Welcome to Edulink - Setup Complete",
        template_name="employer_onboarded",
        context=context,
        actor_id=actor_id
    )


def send_supervisor_assigned_notification(*, supervisor_id: str, student_name: str, opportunity_title: str, role_type: str, assigned_by_name: str, employer_name: str = "", application_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification to supervisor when they are assigned to a student.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        supervisor = User.objects.get(id=supervisor_id)
    except User.DoesNotExist:
        return False
        
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/students"
    
    context = {
        "supervisor_name": supervisor.get_full_name() or supervisor.username,
        "student_name": student_name,
        "opportunity_title": opportunity_title,
        "role_type": role_type.capitalize(), # "Institution" or "Employer"
        "assigned_by": assigned_by_name,
        "employer_name": employer_name,
        "dashboard_url": dashboard_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=supervisor.email,
        subject=f"New Student Assigned: {student_name}",
        template_name="supervisor_assigned",
        context=context,
        actor_id=actor_id
    )

    if success:
        create_notification(
            recipient_id=supervisor_id,
            type=Notification.TYPE_SUPERVISOR_ASSIGNED,
            title="New Student Assigned",
            body=f"You have been assigned as supervisor for {student_name}.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type="InternshipApplication",
            related_entity_id=application_id,
            actor_id=actor_id
        )
    
    return success

def mark_notification_sent(*, notification_id: str) -> bool:
    """
    Mark notification as sent and record the event.
    
    Args:
        notification_id: UUID of the notification
    
    Returns:
        bool: True if successfully marked as sent
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        notification.status = Notification.STATUS_SENT
        notification.sent_at = timezone.now()
        notification.save()
        
        # Record sent event
        record_event(
            event_type="NOTIFICATION_SENT",
            actor_id=None,
            entity_type="User",
            entity_id=str(notification.recipient_id),
            payload={
                "notification_id": notification_id,
                "type": notification.type,
                "channel": notification.channel,
                "sent_at": notification.sent_at.isoformat()
            }
        )
        
        logger.info(f"Notification marked as sent: {notification_id}")
        return True
    except Notification.DoesNotExist:
        logger.error(f"Notification not found: {notification_id}")
        return False


def send_student_affiliation_approved_notification(*, user_id: str, institution_name: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification to student when their institution affiliation is approved.
    
    Args:
        user_id: ID of the student's user account
        institution_name: Name of the institution
        actor_id: Optional ID of the actor performing the action
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for affiliation approval notification")
        return False
        
    context = {
        "student_name": user.get_full_name() or user.username,
        "institution_name": institution_name,
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard",
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject=f"Affiliation Approved - {institution_name}",
        template_name="student_affiliation_approved",
        context=context,
        actor_id=actor_id
    )


def send_student_affiliation_rejected_notification(*, user_id: str, institution_name: str, rejection_reason: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification to student when their institution affiliation is rejected.
    
    Args:
        user_id: ID of the student's user account
        institution_name: Name of the institution
        rejection_reason: Reason for rejection
        actor_id: Optional ID of the actor performing the action
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for affiliation rejection notification")
        return False
        
    context = {
        "student_name": user.get_full_name() or user.username,
        "institution_name": institution_name,
        "rejection_reason": rejection_reason,
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject=f"Affiliation Update - {institution_name}",
        template_name="student_affiliation_rejected",
        context=context,
        actor_id=actor_id
    )


def send_institution_admin_setup_completion_notification(*, admin_user_id: str, institution_name: str, institution_domain: str) -> bool:
    """
    Send notification when institution admin completes setup wizard.
    
    Args:
        admin_user_id: Institution admin user ID
        institution_name: Name of the institution
        institution_domain: Primary domain of the institution
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        admin_user = User.objects.get(id=admin_user_id)
    except User.DoesNotExist:
        logger.error(f"User {admin_user_id} not found for setup completion notification")
        return False
    
    context = {
        "admin_user_id": admin_user_id,
        "institution_name": institution_name,
        "institution_domain": institution_domain,
        "admin_name": admin_user.get_full_name() or admin_user.username,
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL,
        "dashboard_url": f"{settings.SITE_URL}/dashboard",
        "completed_at": timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Send to admin
    success = send_email_notification(
        recipient_email=admin_user.email,
        subject="Institution Setup Complete - Welcome to Edulink!",
        template_name="institution_admin_setup_complete",
        context=context
    )
    
    # Record event regardless of email success
    record_event(
        event_type="INSTITUTION_ADMIN_SETUP_COMPLETED",
        entity_type="User",
        entity_id=admin_user_id,
        payload={
            "institution_name": institution_name,
            "institution_domain": institution_domain,
            "admin_email": admin_user.email,
            "notification_sent": success,
            "completed_at": timezone.now().isoformat()
        }
    )
    
    if not success:
        logger.error(f"Failed to send institution admin setup completion notification to {admin_user.email}")
    
    return success


def send_supervisor_account_activated_notification(*, user: Any, employer: Any, role_display: str, actor_id: Optional[str] = None) -> bool:
    """
    Send confirmation email when a supervisor account is activated/setup is complete.
    """
    dashboard_link = f"{settings.FRONTEND_URL}/employer/login"
    
    context = {
        "user_name": f"{user.first_name} {user.last_name}",
        "organization_name": employer.name,
        "role_display": role_display,
        "login_url": dashboard_link,
        "email": user.email,
        "is_employer": True,
    }
    
    success = send_email_notification(
        recipient_email=user.email,
        subject=f"Account Setup Complete - Welcome to {employer.name}",
        template_name="supervisor_account_activated",
        context=context,
        actor_id=actor_id
    )
    
    # Record event
    ledger_actor_id = uuid.UUID(actor_id) if actor_id else None
    
    record_event(
        event_type="EMPLOYER_SUPERVISOR_ACCOUNT_ACTIVATED_NOTIFICATION_SENT",
        actor_id=ledger_actor_id,
        entity_type="User",
        entity_id=str(user.id),
        payload={
            "employer_name": employer.name,
            "role": role_display,
            "success": success,
            "sent_at": timezone.now().isoformat()
        }
    )
    
    return success


def send_employer_supervisor_invite_notification(*, recipient_email: str, invite_token: str, invite_id: str, role_display: str, employer_name: str, sender_name: str, actor_id: Optional[str] = None) -> bool:
    """
    Send invitation email to new employer supervisor.
    """
    invite_url = f"{settings.FRONTEND_URL}/employer/staff/activate?id={invite_id}&token={invite_token}"
    
    context = {
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL,
        "action_url": invite_url,
        "role_display": role_display,
        "sender_name": sender_name,
        "expires_at": "72 hours",
        "subject": f"Invitation to join {employer_name} on Edulink"
    }
    
    # Reuse staff_invite template as it fits well
    success = send_email_notification(
        recipient_email=recipient_email,
        subject=context["subject"],
        template_name="staff_invite",
        context=context,
        actor_id=actor_id
    )
    
    # Determine actor_id for ledger event
    ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

    record_event(
        event_type="EMPLOYER_SUPERVISOR_INVITE_NOTIFICATION_SENT",
        actor_id=ledger_actor_id,
        entity_type="EmployerInvite",
        entity_id=invite_id,
        payload={
            "recipient_email": recipient_email,
            "employer": employer_name,
            "role": role_display,
            "invited_by": sender_name,
            "success": success,
            "sent_at": timezone.now().isoformat()
        }
    )
    
    return success


def send_staff_invite_notification(*, recipient_email: str, invite_token: str, role_display: str, sender_name: str, expires_at: str) -> bool:
    """
    Send invitation email to new staff member.
    
    Args:
        recipient_email: Email address of the invited staff
        invite_token: The invitation token
        role_display: Human-readable role name (e.g., "Platform Moderator")
        sender_name: Name of the admin who sent the invite
        expires_at: Expiration timestamp string
        
    Returns:
        bool: True if notification was sent successfully
    """
    invite_url = f"{settings.FRONTEND_URL}/admin/accept-invite?token={invite_token}"
    
    context = {
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL,
        "action_url": invite_url,
        "role_display": role_display,
        "sender_name": sender_name,
        "expires_at": expires_at,
        "subject": "Invitation to join Edulink Platform Staff"
    }
    
    # Send email
    success = send_email_notification(
        recipient_email=recipient_email,
        subject=context["subject"],
        template_name="staff_invite",
        context=context
    )
    
    # Record event
    # Generate a deterministic UUID for the invite based on email since StaffInvite doesn't have a UUID field
    invite_uuid = uuid.uuid5(uuid.NAMESPACE_URL, f"mailto:{recipient_email}")
    
    record_event(
        event_type="STAFF_INVITE_NOTIFICATION_SENT",
        entity_type="StaffInvite",
        entity_id=invite_uuid,
        payload={
            "recipient_email": recipient_email,
            "role": role_display,
            "invited_by": sender_name,
            "success": success,
            "sent_at": timezone.now().isoformat()
        }
    )
    
    if not success:
        logger.error(f"Failed to send staff invite notification to {recipient_email}")
        
    return success


def send_institution_staff_invite_notification(*, recipient_email: str, invite_token: str, invite_id: str, role_display: str, institution_name: str, sender_name: str, actor_id: Optional[str] = None) -> bool:
    """
    Send invitation email to new institution staff (e.g. Supervisor).
    """
    invite_url = f"{settings.FRONTEND_URL}/institution/staff/activate?id={invite_id}&token={invite_token}"
    
    context = {
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL,
        "action_url": invite_url,
        "role_display": role_display,
        "sender_name": sender_name,
        "expires_at": "72 hours",
        "subject": f"Invitation to join {institution_name} on Edulink"
    }
    
    # Reuse staff_invite template as it fits well
    success = send_email_notification(
        recipient_email=recipient_email,
        subject=context["subject"],
        template_name="staff_invite",
        context=context,
        actor_id=actor_id
    )
    
    # Determine actor_id for ledger event
    ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

    record_event(
        event_type="INSTITUTION_STAFF_INVITE_NOTIFICATION_SENT",
        actor_id=ledger_actor_id,
        entity_type="InstitutionInvite",
        entity_id=invite_id,
        payload={
            "recipient_email": recipient_email,
            "institution": institution_name,
            "role": role_display,
            "invited_by": sender_name,
            "success": success,
            "sent_at": timezone.now().isoformat()
        }
    )
    
    return success


def send_institution_supervisor_activated_notification(
    *,
    user: Any,
    institution_name: str,
    department: str,
    cohort: str,
    actor_id: Optional[str] = None
) -> bool:
    """
    Send notification when institution supervisor account is activated.
    """
    context = {
        "user_name": user.get_full_name() or user.email,
        "institution_name": institution_name,
        "organization_name": institution_name,
        "email": user.email,
        "department": department,
        "cohort": cohort,
        "login_url": f"{settings.FRONTEND_URL}/login",
        "site_name": "Edulink",
        "is_institution": True,
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject="Supervisor Account Activated - Edulink",
        template_name="supervisor_account_activated",
        context=context,
        actor_id=actor_id
    )


def send_institution_approval_notification(*, institution_request, invite_token: str, invite_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send approval notification to institution representative.
    This initiates the invite-based activation process.
    
    Args:
        institution_request: InstitutionRequest instance that was approved
        invite_token: The raw activation token
        invite_id: The UUID of the invite record
        actor_id: Optional ID of the actor triggering the notification
        
    Returns:
        bool: True if notification was sent successfully
    """
    context = {
        "institution_name": institution_request.institution_name,
        "representative_name": institution_request.representative_name,
        "representative_email": institution_request.representative_email,
        "tracking_code": institution_request.tracking_code,
        "site_name": "Edulink",
        "support_email": settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
        "approved_at": timezone.now().strftime("%B %d, %Y"),
        "setup_url": f"{settings.FRONTEND_URL}/institution/activate?id={invite_id}&token={invite_token}",
        "expires_in_hours": 72,
    }
    
    subject = f"Institution Onboarding Approved - {institution_request.institution_name}"
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #28a745;">Institution Onboarding Approved!</h2>
                
                <p>Dear {institution_request.representative_name},</p>
                
                <p>Great news! Your institution onboarding request for <strong>{institution_request.institution_name}</strong> has been approved.</p>
                
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #155724;">Next Steps</h3>
                    <p>You're just one step away from accessing your institution dashboard. Please complete the setup process to activate your admin account.</p>
                    
                    <p style="text-align: center; margin: 20px 0;">
                        <a href="{context['setup_url']}" 
                           style="background-color: #28a745; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block; 
                                  font-weight: bold;">
                            Complete Setup Now
                        </a>
                    </p>
                </div>
                
                <p><strong>What you'll do next:</strong></p>
                <ul>
                    <li>Set up your admin account password</li>
                    <li>Review and accept institutional responsibilities</li>
                    <li>Configure your institution profile</li>
                    <li>Enable two-factor authentication (recommended)</li>
                </ul>
                
                <p>This setup link is unique to your email address and will expire in {context['expires_in_hours']} hours for security purposes.</p>
                
                <p>If you have any questions during setup, please contact us at {settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL} and reference your tracking code: <strong>{institution_request.tracking_code}</strong>.</p>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                    Welcome to the Edulink community!<br>
                    The Edulink Team
                </p>
            </div>
        </body>
    </html>
    """
    
    plain_message = f"""
    Institution Onboarding Approved!
    
    Dear {institution_request.representative_name},
    
    Great news! Your institution onboarding request for {institution_request.institution_name} has been approved.
    
    NEXT STEPS
    You're just one step away from accessing your institution dashboard. Please complete the setup process to activate your admin account.
    
    Complete Setup: {context['setup_url']}
    
    What you'll do next:
    - Set up your admin account password
    - Review and accept institutional responsibilities  
    - Configure your institution profile
    - Enable two-factor authentication (recommended)
    
    This setup link is unique to your email address and will expire in 7 days for security purposes.
    
    If you have any questions during setup, please contact us at {settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL} and reference your tracking code: {institution_request.tracking_code}.
    
    Welcome to the Edulink community!
    The Edulink Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[institution_request.representative_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record successful approval notification event
        record_event(
            event_type="INSTITUTION_APPROVAL_NOTIFICATION_SENT",
            actor_id=ledger_actor_id,
            entity_type="InstitutionRequest",
            entity_id=str(institution_request.id),
            payload={
                "recipient_email": institution_request.representative_email,
                "institution_name": institution_request.institution_name,
                "setup_url": context['setup_url'],
                "sent_at": timezone.now().isoformat(),
                "success": True
            }
        )
        
        logger.info(f"Institution approval notification sent to {institution_request.representative_email}")
        return True
        
    except Exception as e:
        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record failed notification event
        record_event(
            event_type="INSTITUTION_APPROVAL_NOTIFICATION_FAILED",
            actor_id=ledger_actor_id,
            entity_type="InstitutionRequest",
            entity_id=str(institution_request.id),
            payload={
                "recipient_email": institution_request.representative_email,
                "institution_name": institution_request.institution_name,
                "error": str(e),
                "failed_at": timezone.now().isoformat(),
                "success": False
            }
        )
        
        logger.error(f"Failed to send institution approval notification to {institution_request.representative_email}: {e}")
        return False


def send_institution_rejection_notification(*, institution_request, rejection_reason_code: str | None = None, rejection_reason: str | None = None, actor_id: Optional[str] = None) -> bool:
    """
    Send rejection notification to institution representative.
    Provides clear, actionable feedback without silent rejections.
    
    Args:
        institution_request: InstitutionRequest instance that was rejected
        rejection_reason_code: Structured reason code for rejection
        rejection_reason: Human-readable reason for rejection (optional, for detailed explanation)
        actor_id: Optional ID of the actor triggering the notification
        
    Returns:
        bool: True if notification was sent successfully
    """
    # Build the full rejection reason based on code and text
    if rejection_reason_code:
        # Get the human-readable description for the code
        code_description = dict(institution_request.REJECTION_REASON_CHOICES).get(rejection_reason_code, "")
        if rejection_reason:
            full_rejection_reason = f"{code_description} {rejection_reason}"
        else:
            full_rejection_reason = code_description
    else:
        full_rejection_reason = rejection_reason or "Your institution onboarding request could not be approved at this time."
    
    context = {
        "institution_name": institution_request.institution_name,
        "representative_name": institution_request.representative_name,
        "representative_email": institution_request.representative_email,
        "tracking_code": institution_request.tracking_code,
        "site_name": "Edulink",
        "support_email": settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
        "rejection_reason": full_rejection_reason,
        "rejected_at": timezone.now().strftime("%B %d, %Y"),
        "resubmit_url": f"{settings.FRONTEND_URL}/institution/request",
    }
    
    subject = f"Institution Onboarding Update - {institution_request.institution_name}"
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc3545;">Institution Onboarding Update</h2>
                
                <p>Dear {institution_request.representative_name},</p>
                
                <p>Thank you for your interest in bringing <strong>{institution_request.institution_name}</strong> to Edulink.</p>
                
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #721c24;">Application Status</h3>
                    <p>After careful review, we are unable to approve your institution onboarding request at this time.</p>
                    
                    <p><strong>Reason:</strong></p>
                    <p style="background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; font-style: italic;">
                        {rejection_reason}
                    </p>
                </div>
                
                <p><strong>What you can do next:</strong></p>
                <ul>
                    <li>Review the feedback above and address any issues</li>
                    <li>Gather additional documentation or information</li>
                    <li>Resubmit your application when ready</li>
                </ul>
                
                <p style="text-align: center; margin: 20px 0;">
                    <a href="{context['resubmit_url']}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Resubmit Application
                    </a>
                </p>
                
                <p>We encourage you to resubmit your application once you've addressed the concerns mentioned above. Our team is here to support you through this process.</p>
                
                <p>If you have any questions or need clarification, please contact us at {settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL} and reference your tracking code: <strong>{institution_request.tracking_code}</strong>.</p>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                    Thank you for your interest in Edulink.<br>
                    The Edulink Team
                </p>
            </div>
        </body>
    </html>
    """
    
    plain_message = f"""
    Institution Onboarding Update
    
    Dear {institution_request.representative_name},
    
    Thank you for your interest in bringing {institution_request.institution_name} to Edulink.
    
    APPLICATION STATUS
    After careful review, we are unable to approve your institution onboarding request at this time.
    
    Reason: {full_rejection_reason}
    
    What you can do next:
    - Review the feedback above and address any issues
    - Gather additional documentation or information  
    - Resubmit your application when ready
    
    Resubmit Application: {context['resubmit_url']}
    
    We encourage you to resubmit your application once you've addressed the concerns mentioned above. Our team is here to support you through this process.
    
    If you have any questions or need clarification, please contact us at {settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL} and reference your tracking code: {institution_request.tracking_code}.
    
    Thank you for your interest in Edulink.
    The Edulink Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[institution_request.representative_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record successful rejection notification event
        record_event(
            event_type="INSTITUTION_REJECTION_NOTIFICATION_SENT",
            actor_id=ledger_actor_id,
            entity_type="InstitutionRequest",
            entity_id=str(institution_request.id),
            payload={
                "recipient_email": institution_request.representative_email,
                "institution_name": institution_request.institution_name,
                "rejection_reason_code": rejection_reason_code,
                "sent_at": timezone.now().isoformat(),
                "success": True
            }
        )
        
        logger.info(f"Institution rejection notification sent to {institution_request.representative_email}")
        return True
        
    except Exception as e:
        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record failed notification event
        record_event(
            event_type="INSTITUTION_REJECTION_NOTIFICATION_FAILED",
            actor_id=ledger_actor_id,
            entity_type="InstitutionRequest",
            entity_id=str(institution_request.id),
            payload={
                "recipient_email": institution_request.representative_email,
                "institution_name": institution_request.institution_name,
                "error": str(e),
                "failed_at": timezone.now().isoformat(),
                "success": False
            }
        )
        
        logger.error(f"Failed to send institution rejection notification to {institution_request.representative_email}: {e}")
        return False


def send_institution_admin_setup_completion_notification(*, admin_user_id: str, institution_name: str, institution_domain: str) -> bool:
    """
    Send notification when institution admin completes setup wizard.
    
    Args:
        admin_user_id: Institution admin user ID
        institution_name: Name of the institution
        institution_domain: Primary domain of the institution
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        admin_user = User.objects.get(id=admin_user_id)
    except User.DoesNotExist:
        logger.error(f"User {admin_user_id} not found for setup completion notification")
        return False
    
    context = {
        "admin_user_id": admin_user_id,
        "institution_name": institution_name,
        "institution_domain": institution_domain,
        "admin_name": admin_user.get_full_name() or admin_user.username,
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL,
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard",
        "completed_at": timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    subject = f"Institution Setup Complete - Welcome to Edulink!"
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #28a745;">Welcome to Edulink!</h2>
                
                <p>Dear {context['admin_name']},</p>
                
                <p>Congratulations! You have successfully completed the setup for <strong>{institution_name}</strong>.</p>
                
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #155724;">Account Active</h3>
                    <p>Your institution is now active on the Edulink platform. You can now access your dashboard to manage your institution's profile, staff, and students.</p>
                    
                    <p style="text-align: center; margin: 20px 0;">
                        <a href="{context['dashboard_url']}" 
                           style="background-color: #28a745; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block; 
                                  font-weight: bold;">
                            Go to Dashboard
                        </a>
                    </p>
                </div>
                
                <p><strong>Institution Details:</strong></p>
                <ul>
                    <li>Name: {institution_name}</li>
                    <li>Domain: {institution_domain}</li>
                </ul>
                
                <p>If you have any questions, please contact us at {context['support_email']}.</p>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                    Welcome aboard!<br>
                    The Edulink Team
                </p>
            </div>
        </body>
    </html>
    """
    
    plain_message = f"""
    Welcome to Edulink!
    
    Dear {context['admin_name']},
    
    Congratulations! You have successfully completed the setup for {institution_name}.
    
    ACCOUNT ACTIVE
    Your institution is now active on the Edulink platform. You can now access your dashboard to manage your institution's profile, staff, and students.
    
    Go to Dashboard: {context['dashboard_url']}
    
    Institution Details:
    - Name: {institution_name}
    - Domain: {institution_domain}
    
    If you have any questions, please contact us at {context['support_email']}.
    
    Welcome aboard!
    The Edulink Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin_user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        # Record event
        record_event(
            event_type="INSTITUTION_ADMIN_SETUP_NOTIFICATION_SENT",
            entity_type="User",
            entity_id=admin_user_id,
            payload={
                "institution_name": institution_name,
                "institution_domain": institution_domain,
                "admin_email": admin_user.email,
                "success": True,
                "sent_at": timezone.now().isoformat()
            }
        )
        
        logger.info(f"Institution setup completion notification sent to {admin_user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send institution admin setup completion notification to {admin_user.email}: {e}")
        return False


def send_institution_request_confirmation(*, institution_request, actor_id: Optional[str] = None) -> bool:
    """
    Send confirmation email for institution onboarding request submission.
    This is a separate institution-specific email function to avoid mixing with student emails.
    
    Args:
        institution_request: InstitutionRequest instance
        actor_id: Optional ID of the actor triggering the notification
        
    Returns:
        bool: True if email was sent successfully
    """
    context = {
        "institution_name": institution_request.institution_name,
        "representative_name": institution_request.representative_name,
        "tracking_code": institution_request.tracking_code,
        "site_name": "Edulink",
        "support_email": settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
        "submitted_at": institution_request.created_at.strftime("%B %d, %Y"),
    }
    
    subject = f"Institution Onboarding Request Submitted - {institution_request.tracking_code}"
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5aa0;">Institution Onboarding Request Received</h2>
                
                <p>Dear {institution_request.representative_name},</p>
                
                <p>Thank you for submitting your institution onboarding request for <strong>{institution_request.institution_name}</strong>.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c5aa0;">
                    <h3 style="margin-top: 0; color: #2c5aa0;">Your Tracking Code</h3>
                    <p style="font-size: 24px; font-weight: bold; margin: 10px 0; font-family: monospace; letter-spacing: 2px;">
                        {institution_request.tracking_code}
                    </p>
                    <p style="margin-bottom: 0; font-size: 14px; color: #666;">
                        Please save this code. You'll need it when contacting support or checking status.
                    </p>
                </div>
                
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>Our team will review your submission within 3-5 business days</li>
                    <li>We'll verify your institution's information and domain</li>
                    <li>You'll receive an email notification once a decision is made</li>
                </ul>
                
                <p>If you have any questions, please contact us at {settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL} and reference your tracking code.</p>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                    Best regards,<br>
                    The Edulink Team
                </p>
            </div>
        </body>
    </html>
    """
    
    plain_message = f"""
    Institution Onboarding Request Received
    
    Dear {institution_request.representative_name},
    
    Thank you for submitting your institution onboarding request for {institution_request.institution_name}.
    
    YOUR TRACKING CODE: {institution_request.tracking_code}
    
    Please save this code. You'll need it when contacting support or checking status.
    
    What happens next?
    - Our team will review your submission within 3-5 business days
    - We'll verify your institution's information and domain  
    - You'll receive an email notification once a decision is made
    
    If you have any questions, please contact us at {settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL} and reference your tracking code.
    
    Best regards,
    The Edulink Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[institution_request.representative_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record successful email event
        record_event(
            event_type="INSTITUTION_REQUEST_CONFIRMATION_SENT",
            actor_id=ledger_actor_id,
            entity_type="InstitutionRequest",
            entity_id=str(institution_request.id),
            payload={
                "recipient_email": institution_request.representative_email,
                "tracking_code": institution_request.tracking_code,
                "sent_at": timezone.now().isoformat(),
                "success": True
            }
        )
        
        logger.info(f"Institution request confirmation sent to {institution_request.representative_email} with tracking code {institution_request.tracking_code}")
        return True
        
    except Exception as e:
        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record failed email event
        record_event(
            event_type="INSTITUTION_REQUEST_CONFIRMATION_FAILED",
            actor_id=ledger_actor_id,
            entity_type="InstitutionRequest",
            entity_id=str(institution_request.id),
            payload={
                "recipient_email": institution_request.representative_email,
                "tracking_code": institution_request.tracking_code,
                "error": str(e),
                "failed_at": timezone.now().isoformat(),
                "success": False
            }
        )
        
        logger.error(f"Failed to send institution request confirmation email to {institution_request.representative_email}: {e}")
        return False
        



def notify_institution_interested_users(*, institution_name: str, institution_domain: str) -> int:
    """
    Notify users who expressed interest in an institution when it gets verified.
    
    Args:
        institution_name: Name of the verified institution
        institution_domain: Domain of the verified institution
    
    Returns:
        int: Number of notifications sent
    """
    from edulink.apps.institutions.queries import get_interested_users_for_institution
    
    # Find all interested users who provided their email
    interested_users = get_interested_users_for_institution(institution_name)
    
    notifications_sent = 0
    
    for interest in interested_users:
        try:
            # Send email notification using template
            context = {
                "institution_name": institution_name,
                "dashboard_url": f"{settings.FRONTEND_URL}/login",
                "site_name": "Edulink",
                "support_email": settings.DEFAULT_FROM_EMAIL
            }
            
            send_email_notification(
                recipient_email=interest.user_email,
                subject=f"Good news! {institution_name} is now available on Edulink",
                template_name="institution_available",
                context=context,
                actor_id=None # System action
            )
            
            # Record notification in database
            create_notification(
                recipient_id=str(interest.student_id) if interest.student_id else str(interest.id),
                type="INSTITUTION_ONBOARDED",
                title=f"{institution_name} is now available",
                body=f"{institution_name} has been verified and is now available on Edulink.",
                channel=Notification.CHANNEL_EMAIL,
                related_entity_type="InstitutionInterest",
                related_entity_id=str(interest.id),
            )
            
            notifications_sent += 1
            
        except Exception as e:
            logger.error(f"Failed to notify user {interest.user_email} about institution {institution_name}: {e}")
            continue
    
    logger.info(f"Sent {notifications_sent} notifications for institution {institution_name} verification")
    return notifications_sent


def mark_notification_failed(*, notification_id: str, failure_reason: str) -> bool:
    """
    Mark notification as failed and record the event.
    
    Args:
        notification_id: UUID of the notification
        failure_reason: Reason for failure
    
    Returns:
        bool: True if successfully marked as failed
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        notification.status = Notification.STATUS_FAILED
        notification.failure_reason = failure_reason
        notification.retry_count += 1
        notification.save()
        
        # Record failure event
        record_event(
            event_type="NOTIFICATION_FAILED",
            entity_type="User",
            entity_id=str(notification.recipient_id),
            payload={
                "notification_id": notification_id,
                "type": notification.type,
                "channel": notification.channel,
                "failure_reason": failure_reason,
                "retry_count": notification.retry_count,
                "failed_at": timezone.now().isoformat()
            }
        )
        
        logger.error(f"Notification marked as failed: {notification_id} - {failure_reason}")
        return True
        
    except Notification.DoesNotExist:
        logger.error(f"Notification not found: {notification_id}")
        return False


def mark_notification_delivered(*, notification_id: str) -> bool:
    """
    Mark notification as delivered.
    
    Args:
        notification_id: UUID of the notification
    
    Returns:
        bool: True if successfully marked as delivered
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        notification.status = Notification.STATUS_DELIVERED
        notification.delivered_at = timezone.now()
        notification.save()
        
        # Record delivery event
        record_event(
            event_type="NOTIFICATION_DELIVERED",
            entity_type="User",
            entity_id=str(notification.recipient_id),
            payload={
                "notification_id": notification_id,
                "type": notification.type,
                "channel": notification.channel,
                "delivered_at": notification.delivered_at.isoformat()
            }
        )
        
        logger.info(f"Notification marked as delivered: {notification_id}")
        return True
        
    except Notification.DoesNotExist:
        logger.error(f"Notification not found: {notification_id}")
        return False


def mark_notification_read(*, notification_id: str) -> bool:
    """
    Mark notification as read by the recipient.
    
    Args:
        notification_id: UUID of the notification
    
    Returns:
        bool: True if successfully marked as read
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        notification.status = Notification.STATUS_READ
        notification.read_at = timezone.now()
        notification.save()
        
        # Record read event
        record_event(
            event_type="NOTIFICATION_READ",
            entity_type="User",
            entity_id=str(notification.recipient_id),
            payload={
                "notification_id": notification_id,
                "type": notification.type,
                "channel": notification.channel,
                "read_at": notification.read_at.isoformat()
            }
        )
        
        logger.info(f"Notification marked as read: {notification_id}")
        return True
        
    except Notification.DoesNotExist:
        logger.error(f"Notification not found: {notification_id}")
        return False


def get_user_notifications(*, user_id: str, status: Optional[str] = None, limit: int = 50) -> List[Notification]:
    """
    Get notifications for a specific user.
    
    Args:
        user_id: UUID of the user
        status: Optional status filter
        limit: Maximum number of notifications to return
    
    Returns:
        List[Notification]: List of notifications
    """
    queryset = Notification.objects.filter(recipient_id=user_id)
    
    if status:
        queryset = queryset.filter(status=status)
    
    return queryset.order_by('-created_at')[:limit]


def get_unread_notification_count(*, user_id: str) -> int:
    """
    Get count of unread notifications for a user.
    
    Args:
        user_id: UUID of the user
    
    Returns:
        int: Count of unread notifications
    """
    return Notification.objects.filter(
        recipient_id=user_id,
        status__in=[Notification.STATUS_SENT, Notification.STATUS_DELIVERED]
    ).count()


def send_email_notification(*, recipient_email: str, subject: str, template_name: str, context: dict, actor_id: Optional[str] = None) -> bool:
    """
    Send an email notification using Django's email backend.
    Records EMAIL_SENT event in ledger.
    
    Args:
        recipient_email: Email address of the recipient
        subject: Email subject
        template_name: Template name without extension (assumes .html and .txt)
        context: Context dictionary for template rendering
        actor_id: Optional ID of the actor triggering the notification
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Render HTML and plain text versions
        html_message = render_to_string(f"notifications/emails/{template_name}.html", context)
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        # Determine entity_id (must be UUID)
        entity_id = context.get("user_id")
        if not entity_id:
            # Generate deterministic UUID from email if no user_id is provided
            entity_id = uuid.uuid5(uuid.NAMESPACE_URL, f"mailto:{recipient_email}")
        
        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record successful email event
        record_event(
            event_type="EMAIL_SENT",
            actor_id=ledger_actor_id,
            entity_type="User",
            entity_id=entity_id,
            payload={
                "recipient_email": recipient_email,
                "subject": subject,
                "template": template_name,
                "sent_at": timezone.now().isoformat(),
                "success": True
            }
        )
        
        logger.info(f"Email sent successfully to {recipient_email}")
        return True
        
    except Exception as e:
        # Determine entity_id (must be UUID)
        entity_id = context.get("user_id")
        if not entity_id:
            # Generate deterministic UUID from email if no user_id is provided
            entity_id = uuid.uuid5(uuid.NAMESPACE_URL, f"mailto:{recipient_email}")

        # Determine actor_id for ledger event
        ledger_actor_id = uuid.UUID(actor_id) if actor_id else None

        # Record failed email event
        record_event(
            event_type="EMAIL_FAILED",
            actor_id=ledger_actor_id,
            entity_type="User", 
            entity_id=entity_id,
            payload={
                "recipient_email": recipient_email,
                "subject": subject,
                "template": template_name,
                "error": str(e),
                "failed_at": timezone.now().isoformat()
            }
        )
        
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return False


def send_email_verification_notification(*, user_id: str, email: str, verification_token: str, verification_url: str) -> bool:
    """
    Send email verification notification to user.
    
    Args:
        user_id: User ID
        email: User email address
        verification_token: Email verification token
        verification_url: Complete verification URL
    
    Returns:
        bool: True if notification was sent successfully
    """
    context = {
        "user_id": user_id,
        "email": email,
        "verification_token": verification_token,
        "verification_url": verification_url,
        "site_name": settings.SITE_NAME,
        "support_email": settings.SUPPORT_EMAIL,
        "site_url": settings.SITE_URL
    }
    
    return send_email_notification(
        recipient_email=email,
        subject="Verify your email address - Edulink",
        template_name="email_verification",
        context=context
    )


def send_password_reset_notification(*, user_id: str, email: str, reset_token: str, reset_url: str) -> bool:
    """
    Send password reset notification to user.
    
    Args:
        user_id: User ID
        email: User email address  
        reset_token: Password reset token
        reset_url: Complete password reset URL
    
    Returns:
        bool: True if notification was sent successfully
    """
    context = {
        "user_id": user_id,
        "email": email,
        "reset_token": reset_token,
        "reset_url": reset_url,
        "site_name": settings.SITE_NAME,
        "support_email": settings.SUPPORT_EMAIL,
        "site_url": settings.SITE_URL,
        "expires_hours": settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
    }
    
    return send_email_notification(
        recipient_email=email,
        subject="Reset your password - Edulink",
        template_name="password_reset",
        context=context
    )


def send_welcome_notification(*, user_id: str, email: str, username: str) -> bool:
    """
    Send welcome notification to newly registered user.
    
    Args:
        user_id: User ID
        email: User email address
        username: User username
    
    Returns:
        bool: True if notification was sent successfully
    """
    context = {
        "user_id": user_id,
        "email": email,
        "username": username,
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL,
        "login_url": f"{settings.FRONTEND_URL}/login"
    }
    
    return send_email_notification(
        recipient_email=email,
        subject="Welcome to Edulink!",
        template_name="welcome",
        context=context
    )


def send_password_changed_notification(*, user_id: str, email: str) -> bool:
    """
    Send password changed confirmation notification.
    
    Args:
        user_id: User ID
        email: User email address
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        user_name = user.get_full_name() or user.username
    except User.DoesNotExist:
        user_name = ""

    context = {
        "user_id": user_id,
        "user_name": user_name,
        "email": email,
        "site_name": "Edulink",
        "support_email": settings.DEFAULT_FROM_EMAIL,
        "changed_at": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
        "login_url": f"{settings.FRONTEND_URL}/login"
    }
    
    return send_email_notification(
        recipient_email=email,
        subject="Password Changed Successfully - Edulink",
        template_name="password_changed",
        context=context
    )


def create_email_verification_token(*, user_id: str, email: str) -> str:
    """
    Create an email verification token for the user.
    Records EMAIL_VERIFICATION_TOKEN_CREATED event.
    
    Args:
        user_id: User ID
        email: User email address
    
    Returns:
        str: The verification token
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id, email=email)
    except User.DoesNotExist:
        raise ValueError("User not found")
    
    # Delete any existing token
    EmailVerificationToken.objects.filter(user=user).delete()
    
    # Create new token
    expires_at = timezone.now() + timezone.timedelta(hours=24)  # 24 hours
    token_obj = EmailVerificationToken.objects.create(
        user=user,
        expires_at=expires_at
    )
    
    # Record token creation event
    record_event(
        event_type="EMAIL_VERIFICATION_TOKEN_CREATED",
        actor_id=uuid.UUID(user_id),
        entity_type="User",
        entity_id=user_id,
        payload={
            "email": email,
            "token": str(token_obj.token),
            "expires_at": expires_at.isoformat()
        }
    )
    
    return str(token_obj.token)


def verify_email_token(*, token: str) -> bool:
    """
    Verify an email verification token.
    Records EMAIL_VERIFIED event if successful.
    
    Args:
        token: The verification token
    
    Returns:
        bool: True if verification was successful
    """
    try:
        # Handle potential UUID validation errors
        token_obj = EmailVerificationToken.objects.get(token=token)
    except (EmailVerificationToken.DoesNotExist, ValidationError):
        logger.warning(f"Email verification failed: Token '{token}' not found or invalid format.")
        return False
    
    if token_obj.is_used:
        logger.warning(f"Email verification failed: Token '{token}' already used.")
        return False
        
    if token_obj.is_expired:
        logger.warning(f"Email verification failed: Token '{token}' expired.")
        return False
    
    # Mark token as used
    token_obj.is_used = True
    token_obj.save()
    
    # Update user email verification status
    user = token_obj.user
    user.is_email_verified = True
    user.save()
    
    # Record verification event
    record_event(
        event_type="EMAIL_VERIFIED",
        actor_id=user.id,
        entity_type="User",
        entity_id=str(user.id),
        payload={
            "email": user.email,
            "verified_at": timezone.now().isoformat()
        }
    )
    
    # Send welcome email now that email is verified
    try:
        send_welcome_notification(
            user_id=str(user.id),
            email=user.email,
            username=user.username
        )
    except Exception as e:
        # Don't fail verification if welcome email fails, but log it
        logger.error(f"Failed to send welcome email to {user.email}: {e}")
    
    return True


def create_password_reset_token(*, email: str) -> str:
    """
    Create a password reset token for the user.
    Records PASSWORD_RESET_TOKEN_CREATED event.
    
    Args:
        email: User email address
    
    Returns:
        str: The reset token
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal whether user exists (security)
        return str(uuid.uuid4())  # Return dummy token
    
    # Create new token
    expires_at = timezone.now() + timezone.timedelta(hours=1)  # 1 hour
    token_obj = PasswordResetToken.objects.create(
        user=user,
        expires_at=expires_at
    )
    
    # Record token creation event
    record_event(
        event_type="PASSWORD_RESET_TOKEN_CREATED",
        actor_id=user.id,
        entity_type="User",
        entity_id=str(user.id),
        payload={
            "email": email,
            "token": str(token_obj.token),
            "expires_at": expires_at.isoformat()
        }
    )
    
    return str(token_obj.token)


def verify_password_reset_token(*, token: str) -> bool:
    """
    Verify a password reset token.
    
    Args:
        token: The reset token
    
    Returns:
        bool: True if token is valid and not expired
    """
    try:
        token_obj = PasswordResetToken.objects.get(token=token)
    except PasswordResetToken.DoesNotExist:
        return False
    
    return not token_obj.is_used and not token_obj.is_expired


def use_password_reset_token(*, token: str, new_password: str) -> bool:
    """
    Use a password reset token to change the user's password.
    Records PASSWORD_RESET_COMPLETED event.
    
    Args:
        token: The reset token
        new_password: The new password
    
    Returns:
        bool: True if password was successfully reset
    """
    if not verify_password_reset_token(token=token):
        return False
    
    try:
        token_obj = PasswordResetToken.objects.get(token=token)
    except PasswordResetToken.DoesNotExist:
        return False
    
    user = token_obj.user
    
    # Validate new password
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError
    
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        raise ValueError(f"Invalid password: {', '.join(e.messages)}")
    
    # Change password
    user.set_password(new_password)
    user.save()
    
    # Mark token as used
    token_obj.is_used = True
    token_obj.save()
    
    # Record password reset completion event
    record_event(
        event_type="PASSWORD_RESET_COMPLETED",
        actor_id=user.id,
        entity_type="User",
        entity_id=str(user.id),
        payload={
            "email": user.email,
            "reset_completed_at": timezone.now().isoformat()
        }
    )
    
    return True


def send_student_profile_updated_notification(*, user_id: str, updated_fields: list[str]) -> bool:
    """
    Send notification when student profile is updated.
    
    Args:
        user_id: User ID
        updated_fields: List of fields that were updated
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return False
        
    context = {
        "user_name": user.get_full_name() or user.username,
        "updated_fields": updated_fields,
        "site_name": "Edulink",
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard/profile",
        "support_email": settings.DEFAULT_FROM_EMAIL
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject="Profile Updated - Edulink",
        template_name="student_profile_updated",
        context=context,
        actor_id=user_id
    )


def send_student_profile_completed_notification(*, user_id: str) -> bool:
    """
    Send notification when student profile is 100% complete.
    
    Args:
        user_id: User ID
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return False
        
    context = {
        "user_name": user.get_full_name() or user.username,
        "site_name": "Edulink",
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard",
        "opportunities_url": f"{settings.FRONTEND_URL}/internships"
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject="Profile Complete - You're Ready to Apply!",
        template_name="student_profile_completed",
        context=context,
        actor_id=user_id
    )


def send_document_uploaded_notification(*, user_id: str, document_type: str, file_name: str) -> bool:
    """
    Send notification when a student uploads a document.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return False
        
    context = {
        "user_name": user.get_full_name() or user.username,
        "document_type": document_type.replace('_', ' ').title(),
        "file_name": file_name,
        "site_name": "Edulink",
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard/documents"
    }
    
    success = send_email_notification(
        recipient_email=user.email,
        subject=f"Document Uploaded: {context['document_type']}",
        template_name="document_uploaded",
        context=context,
        actor_id=user_id
    )

    if success:
        create_notification(
            recipient_id=user_id,
            type=Notification.TYPE_DOCUMENT_UPLOADED,
            title="Document Uploaded",
            body=f"Your document {context['document_type']} ({file_name}) has been uploaded successfully.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type="Student", # or Document if we had a model
            related_entity_id=None, # We don't have a document ID, so using None or maybe student ID?
            actor_id=user_id
        )
    
    return success


def send_document_verified_notification(*, user_id: str, document_type: str) -> bool:
    """
    Send notification when a student document is verified.
    
    Args:
        user_id: User ID
        document_type: Type of the document verified
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return False
        
    context = {
        "user_name": user.get_full_name() or user.username,
        "document_type": document_type.replace('_', ' ').title(),
        "site_name": "Edulink",
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard/documents"
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject=f"Document Verified - {context['document_type']}",
        template_name="document_verified",
        context=context
    )


def send_document_rejected_notification(*, user_id: str, document_type: str, reason: str) -> bool:
    """
    Send notification when a student document is rejected.
    
    Args:
        user_id: User ID
        document_type: Type of the document rejected
        reason: Rejection reason
    
    Returns:
        bool: True if notification was sent successfully
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return False
        
    context = {
        "user_name": user.get_full_name() or user.username,
        "document_type": document_type.replace('_', ' ').title(),
        "reason": reason,
        "site_name": "Edulink",
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard/documents"
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject=f"Action Required: Document Rejected - {context['document_type']}",
        template_name="document_rejected",
        context=context
    )


def send_institution_interest_outreach_notification(*, recipient_email: str, institution_name: str, actor_id: Optional[str] = None) -> bool:
    """
    Send an automated outreach email to a student who expressed interest in an institution.
    """
    context = {
        "institution_name": institution_name,
        "site_name": "Edulink",
        "site_url": settings.SITE_URL,
        "support_email": settings.DEFAULT_FROM_EMAIL
    }
    
    success = send_email_notification(
        recipient_email=recipient_email,
        subject=f"We Heard Your Interest in {institution_name}",
        template_name="institution_interest_outreach",
        context=context,
        actor_id=actor_id
    )
    
    if success:
        # Record notification in database if we can find the user or use a dummy ID
        # Since this is interest-based, student_id might be null in the interest record
        # but if we have the email, we can try to find the user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=recipient_email).first()
        
        if user:
            create_notification(
                recipient_id=str(user.id),
                type=Notification.TYPE_INSTITUTION_INTEREST_OUTREACH,
                title=f"Interest in {institution_name} recorded",
                body=f"We've recorded your request for {institution_name} and our team is looking into it.",
                channel=Notification.CHANNEL_EMAIL,
                actor_id=actor_id
            )
            
    return success

def send_certificate_generated_notification(*, student_email: str, student_name: str, position: str, employer_name: str, tracking_code: str, artifact_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification when an internship certificate is generated.
    """
    download_url = f"{settings.FRONTEND_URL}/artifacts/download/{artifact_id}"
    
    context = {
        "student_name": student_name,
        "position": position,
        "employer_name": employer_name,
        "tracking_code": tracking_code,
        "download_url": download_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student_email,
        subject=f"Certificate Generated - {position} at {employer_name}",
        template_name="certificate_generated",
        context=context,
        actor_id=actor_id
    )

    if success:
         # Find user ID from email for notification record
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=student_email).first()
        
        if user:
            create_notification(
                recipient_id=str(user.id),
                type=Notification.TYPE_CERTIFICATE_GENERATED,
                title="Certificate Available",
                body=f"Your certificate for {position} at {employer_name} is ready.",
                channel=Notification.CHANNEL_EMAIL,
                related_entity_type="Artifact",
                related_entity_id=artifact_id,
                actor_id=actor_id
            )

    return success

def send_performance_summary_generated_notification(*, student_email: str, student_name: str, employer_name: str, logbooks_count: int, milestones_count: int, artifact_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification when a performance summary is generated.
    """
    download_url = f"{settings.FRONTEND_URL}/artifacts/download/{artifact_id}"
    
    context = {
        "student_name": student_name,
        "employer_name": employer_name,
        "logbooks_count": logbooks_count,
        "milestones_count": milestones_count,
        "download_url": download_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student_email,
        subject="Performance Summary Generated",
        template_name="performance_summary_generated",
        context=context,
        actor_id=actor_id
    )

    if success:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=student_email).first()
        
        if user:
            create_notification(
                recipient_id=str(user.id),
                type=Notification.TYPE_PERFORMANCE_SUMMARY_GENERATED,
                title="Performance Summary Available",
                body=f"Your performance summary for {employer_name} is ready.",
                channel=Notification.CHANNEL_EMAIL,
                related_entity_type="Artifact",
                related_entity_id=artifact_id,
                actor_id=actor_id
            )

    return success

def send_logbook_report_generated_notification(*, student_email: str, student_name: str, employer_name: str, logbooks_count: int, tracking_code: str, artifact_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification when a logbook report is generated.
    """
    download_url = f"{settings.FRONTEND_URL}/artifacts/download/{artifact_id}"
    
    context = {
        "student_name": student_name,
        "employer_name": employer_name,
        "logbooks_count": logbooks_count,
        "tracking_code": tracking_code,
        "download_url": download_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student_email,
        subject="Logbook Report Generated",
        template_name="logbook_report_generated",
        context=context,
        actor_id=actor_id
    )

    if success:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=student_email).first()
        
        if user:
            create_notification(
                recipient_id=str(user.id),
                type=Notification.TYPE_LOGBOOK_REPORT_GENERATED,
                title="Logbook Report Available",
                body=f"Your logbook report for {employer_name} is ready.",
                channel=Notification.CHANNEL_EMAIL,
                related_entity_type="Artifact",
                related_entity_id=artifact_id,
                actor_id=actor_id
            )

    return success


def send_institution_admin_welcome_notification(
    *,
    user: Any,
    institution_name: str,
    actor_id: Optional[str] = None
) -> bool:
    """
    Send welcome email to institution admin upon activation.
    """
    context = {
        "user_name": user.get_full_name() or user.username,
        "institution_name": institution_name,
        "dashboard_link": f"{settings.FRONTEND_URL}/institution/dashboard",
    }
    
    return send_email_notification(
        recipient_email=user.email,
        subject="Welcome to Edulink - Institution Setup Complete",
        template_name="institution_admin_welcome",
        context=context,
        actor_id=actor_id
    )


def send_internship_application_submitted_notification(*, application_id: str, student_id: str, opportunity_title: str, employer_name: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification to student when they apply for an internship.
    """
    from django.contrib.auth import get_user_model
    from edulink.apps.students.queries import get_student_by_id
    
    student = get_student_by_id(uuid.UUID(student_id))
    if not student:
        return False
        
    context = {
        "student_name": student.user.get_full_name() or student.user.username,
        "opportunity_title": opportunity_title,
        "employer_name": employer_name,
        "dashboard_url": f"{settings.FRONTEND_URL}/internships/applications",
        "site_name": "Edulink"
    }
    
    # Notify Student
    success = send_email_notification(
        recipient_email=student.user.email,
        subject=f"Application Received: {opportunity_title}",
        template_name="internship_application_submitted",
        context=context,
        actor_id=actor_id
    )
    
    if success:
        create_notification(
            recipient_id=str(student.user.id),
            type=Notification.TYPE_INTERNSHIP_APPLICATION_SUBMITTED,
            title="Application Submitted",
            body=f"Your application for {opportunity_title} at {employer_name} has been submitted.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type="InternshipApplication",
            related_entity_id=application_id,
            actor_id=actor_id
        )
    
    return success

def send_internship_application_status_update_notification(*, application_id: str, student_id: str, opportunity_title: str, status: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification to student when their application status changes.
    """
    from edulink.apps.students.queries import get_student_by_id
    
    student = get_student_by_id(uuid.UUID(student_id))
    if not student:
        return False
        
    context = {
        "student_name": student.user.get_full_name() or student.user.username,
        "opportunity_title": opportunity_title,
        "status": status,
        "dashboard_url": f"{settings.FRONTEND_URL}/internships/applications",
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student.user.email,
        subject=f"Application Update: {opportunity_title}",
        template_name="internship_application_status_update",
        context=context,
        actor_id=actor_id
    )
    
    if success:
        # Map status to notification type
        notif_type = Notification.TYPE_INTERNSHIP_APPLICATION_REVIEWED
        if status.upper() == "ACCEPTED":
            notif_type = Notification.TYPE_INTERNSHIP_ACCEPTED
        elif status.upper() == "REJECTED":
            notif_type = Notification.TYPE_INTERNSHIP_REJECTED
            
        create_notification(
            recipient_id=str(student.user.id),
            type=notif_type,
            title=f"Application {status.title()}",
            body=f"Your application for {opportunity_title} has been {status.lower()}.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type="InternshipApplication",
            related_entity_id=application_id,
            actor_id=actor_id
        )
    
    return success

def send_internship_final_feedback_submitted_notification(*, application_id: str, student_id: str, opportunity_title: str, employer_name: str, feedback: str, rating: int = None, actor_id: Optional[str] = None) -> bool:
    """
    Send notification to student when final feedback is submitted.
    """
    from edulink.apps.students.queries import get_student_by_id
    
    student = get_student_by_id(uuid.UUID(student_id))
    if not student:
        return False
        
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/student/artifacts"
    
    context = {
        "student_name": student.user.get_full_name() or student.user.username,
        "opportunity_title": opportunity_title,
        "employer_name": employer_name,
        "feedback": feedback,
        "rating": rating,
        "has_rating": rating is not None,
        "dashboard_url": dashboard_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student.user.email,
        subject=f"Final Feedback Received: {opportunity_title}",
        template_name="internship_final_feedback_submitted",
        context=context,
        actor_id=actor_id
    )

    if success:
        create_notification(
            recipient_id=str(student.user.id),
            type=Notification.TYPE_INTERNSHIP_FINAL_FEEDBACK_SUBMITTED,
            title="Internship Feedback Received",
            body=f"You have received final feedback for your internship at {employer_name}.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type="InternshipApplication",
            related_entity_id=application_id,
            actor_id=actor_id
        )
    
    return success

def send_incident_resolved_notification(*, incident_id: str, recipient_id: str, incident_title: str, resolution_notes: str = "", actor_id: Optional[str] = None) -> bool:
    """
    Send notification when an incident is resolved.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        return False
        
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/incidents"
    
    context = {
        "user_name": user.get_full_name() or user.username,
        "incident_title": incident_title,
        "resolution_notes": resolution_notes,
        "dashboard_url": dashboard_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=user.email,
        subject=f"Incident Resolved: {incident_title}",
        template_name="incident_resolved",
        context=context,
        actor_id=actor_id
    )

    if success:
        create_notification(
            recipient_id=recipient_id,
            type=Notification.TYPE_INCIDENT_RESOLVED, # Needs to be added to models
            title="Incident Resolved",
            body=f"The incident '{incident_title}' has been resolved.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type="Incident",
            related_entity_id=incident_id,
            actor_id=actor_id
        )
    
    return success

def send_trust_tier_changed_notification(*, entity_id: str, entity_type: str, old_level: int, new_level: int, new_level_label: str, recipient_user_id: str, actor_id: Optional[str] = None) -> bool:
    """
    Send notification when trust tier changes.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=recipient_user_id)
    except User.DoesNotExist:
        return False
        
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    
    context = {
        "entity_name": user.get_full_name() or user.username, # Or institution/employer name if passed
        "old_level": old_level,
        "new_level": new_level,
        "new_level_label": new_level_label,
        "dashboard_url": dashboard_url,
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=user.email,
        subject="Trust Tier Updated",
        template_name="trust_tier_changed",
        context=context,
        actor_id=actor_id
    )

    if success:
        create_notification(
            recipient_id=recipient_user_id,
            type=Notification.TYPE_TRUST_TIER_CHANGED,
            title="Trust Tier Updated",
            body=f"Your trust tier has changed to {new_level_label}.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type=entity_type,
            related_entity_id=entity_id,
            actor_id=actor_id
        )
    
    return success

def send_evidence_submitted_notification(*, evidence_id: str, supervisor_ids: List[str], student_name: str, evidence_title: str, actor_id: Optional[str] = None) -> int:
    """
    Notify supervisors when evidence (logbook) is submitted.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    sent_count = 0
    
    for supervisor_id in supervisor_ids:
        if not supervisor_id: 
            continue
            
        try:
            supervisor = User.objects.get(id=supervisor_id)
            
            context = {
                "supervisor_name": supervisor.get_full_name() or supervisor.username,
                "student_name": student_name,
                "evidence_title": evidence_title,
                "review_url": f"{settings.FRONTEND_URL}/dashboard/evidence/{evidence_id}",
                "site_name": "Edulink"
            }
            
            success = send_email_notification(
                recipient_email=supervisor.email,
                subject=f"New Evidence Submitted by {student_name}",
                template_name="evidence_submitted",
                context=context,
                actor_id=actor_id
            )
            
            if success:
                sent_count += 1
                
                # Create notification record
                create_notification(
                    recipient_id=supervisor_id,
                    type=Notification.TYPE_LOGBOOK_SUBMITTED,
                    title="New Evidence Submitted",
                    body=f"{student_name} has submitted new evidence: {evidence_title}",
                    channel=Notification.CHANNEL_EMAIL,
                    related_entity_type="Evidence",
                    related_entity_id=evidence_id,
                    actor_id=actor_id
                )
                
        except User.DoesNotExist:
            continue
            
    return sent_count

def send_evidence_reviewed_notification(*, evidence_id: str, student_id: str, evidence_title: str, status: str, reviewer_name: str, actor_id: Optional[str] = None) -> bool:
    """
    Notify student when evidence is reviewed.
    """
    from edulink.apps.students.queries import get_student_by_id
    
    student = get_student_by_id(uuid.UUID(student_id))
    if not student:
        return False
        
    context = {
        "student_name": student.user.get_full_name() or student.user.username,
        "evidence_title": evidence_title,
        "status": status,
        "reviewer_name": reviewer_name,
        "dashboard_url": f"{settings.FRONTEND_URL}/dashboard/evidence",
        "site_name": "Edulink"
    }
    
    success = send_email_notification(
        recipient_email=student.user.email,
        subject=f"Evidence Reviewed: {evidence_title}",
        template_name="evidence_reviewed",
        context=context,
        actor_id=actor_id
    )
    
    if success:
        create_notification(
            recipient_id=str(student.user.id),
            type=Notification.TYPE_LOGBOOK_REVIEWED,
            title="Evidence Reviewed",
            body=f"Your evidence '{evidence_title}' has been reviewed by {reviewer_name}.",
            channel=Notification.CHANNEL_EMAIL,
            related_entity_type="Evidence",
            related_entity_id=evidence_id,
            actor_id=actor_id
        )
    
    return success

def send_incident_reported_notification(*, incident_id: str, recipient_ids: List[str], title: str, reporter_name: str, actor_id: Optional[str] = None) -> int:
    """
    Notify admins/supervisors about a reported incident.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    sent_count = 0
    
    for recipient_id in recipient_ids:
        if not recipient_id:
            continue
            
        try:
            user = User.objects.get(id=recipient_id)
            
            context = {
                "user_name": user.get_full_name() or user.username,
                "incident_title": title,
                "reporter_name": reporter_name,
                "dashboard_url": f"{settings.FRONTEND_URL}/dashboard/incidents/{incident_id}",
                "site_name": "Edulink"
            }
            
            success = send_email_notification(
                recipient_email=user.email,
                subject=f"Incident Reported: {title}",
                template_name="incident_reported",
                context=context,
                actor_id=actor_id
            )
            
            if success:
                sent_count += 1
                
                # Create notification record
                create_notification(
                    recipient_id=recipient_id,
                    type=Notification.TYPE_INCIDENT_REPORTED,
                    title="Incident Reported",
                    body=f"A new incident has been reported: {title}",
                    channel=Notification.CHANNEL_EMAIL,
                    related_entity_type="Incident",
                    related_entity_id=incident_id,
                    actor_id=actor_id
                )
                
        except User.DoesNotExist:
            continue
            
    return sent_count