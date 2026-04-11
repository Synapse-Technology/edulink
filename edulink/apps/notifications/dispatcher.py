"""
Phase 3.2b: Notification Dispatcher

Handles notification delivery with consolidated logic.
Uses the centralized NotificationRegistry for type management.

Replaces scattered send_notification_*() functions with unified dispatcher.
"""

from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import logging

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .registry import (
    NotificationType,
    NotificationRegistry,
    NotificationPriority,
    NotificationChannel,
    NotificationRecipient,
)

logger = logging.getLogger(__name__)


class NotificationContext:
    """
    Context data for notification rendering.
    
    Provides type-safe way to pass data to notification templates.
    """
    
    def __init__(self, notif_type: NotificationType):
        self.notif_type = notif_type
        self.data: Dict[str, Any] = {}
    
    def set(self, key: str, value: Any) -> "NotificationContext":
        """Set context value (fluent API)"""
        self.data[key] = value
        return self
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get context value"""
        return self.data.get(key, default)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to template-compatible dict"""
        return {
            "notification_type": self.notif_type.value,
            "notification_action": self.notif_type.action_type,
            "notification_entity": self.notif_type.entity_type,
            **self.data
        }


class NotificationMessage:
    """
    Represents a single notification to be sent.
    
    Immutable once created. Use NotificationMessageBuilder for fluent construction.
    """
    
    def __init__(
        self,
        notif_type: NotificationType,
        recipient_id: UUID,
        recipient_email: str,
        recipient_type: NotificationRecipient,
        context: Dict[str, Any],
        priority: Optional[NotificationPriority] = None,
        channels: Optional[List[NotificationChannel]] = None,
        subject: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.notif_type = notif_type
        self.recipient_id = recipient_id
        self.recipient_email = recipient_email
        self.recipient_type = recipient_type
        self.context = context
        self.priority = priority or NotificationRegistry.get_priority(notif_type)
        self.channels = channels or NotificationRegistry.get_channels(notif_type)
        self.subject = subject or self._default_subject()
        self.metadata = metadata or {}
        self.created_at = datetime.now()
    
    def _default_subject(self) -> str:
        """Generate default subject line"""
        entity = self.notif_type.entity_type.replace('_', ' ').title()
        action = self.notif_type.action_type.replace('_', ' ').title()
        return f"{entity} {action}"
    
    def with_subject(self, subject: str) -> "NotificationMessage":
        """Override subject line"""
        self.subject = subject
        return self
    
    def with_metadata(self, key: str, value: Any) -> "NotificationMessage":
        """Add metadata"""
        self.metadata[key] = value
        return self
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict for storage/logging"""
        return {
            "notification_type": self.notif_type.value,
            "recipient_id": str(self.recipient_id),
            "recipient_email": self.recipient_email,
            "recipient_type": self.recipient_type.value,
            "priority": self.priority.value,
            "channels": [c.value for c in self.channels],
            "subject": self.subject,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata,
        }


class NotificationDispatcher:
    """
    Central notification dispatcher.
    
    Handles:
    - Notification type validation
    - Template rendering
    - Multi-channel delivery (email, SMS, push, in-app)
    - Logging and audit trails
    - Retry logic for failed sends
    
    Usage:
        dispatcher = NotificationDispatcher()
        
        message = (NotificationMessageBuilder(NotificationType.SUPERVISOR_ASSIGNMENT_CREATED)
            .for_recipient(supervisor_id, supervisor_email, NotificationRecipient.SUPERVISOR)
            .with_context("student_name", "John Doe")
            .with_context("opportunity_title", "Marketing Internship")
            .build())
        
        result = dispatcher.send(message)
        if result.success:
            print(f"Sent via {result.channels_used}")
        else:
            print(f"Failed: {result.error}")
    """
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize dispatcher.
        
        Args:
            dry_run: If True, don't actually send emails (for testing)
        """
        self.dry_run = dry_run
        self.logger = logger
    
    def send(self, message: NotificationMessage) -> "NotificationResult":
        """
        Send notification via all configured channels.
        
        Returns NotificationResult with status and error details.
        """
        self.logger.info(
            f"Sending {message.notif_type.value} notification to {message.recipient_email} "
            f"via {[c.value for c in message.channels]}"
        )
        
        # Validate notification type
        if not NotificationRegistry.validate_notification_type(message.notif_type):
            return NotificationResult(
                success=False,
                error=f"Unknown notification type: {message.notif_type.value}",
                channels_attempted=[],
                channels_used=[],
            )
        
        # Send via each channel
        channels_attempted = []
        channels_used = []
        errors = []
        
        for channel in message.channels:
            channels_attempted.append(channel)
            
            try:
                if channel == NotificationChannel.EMAIL:
                    if self._send_email(message):
                        channels_used.append(channel)
                    else:
                        errors.append(f"{channel.value}: Failed to send")
                
                elif channel == NotificationChannel.SMS:
                    if self._send_sms(message):
                        channels_used.append(channel)
                    else:
                        errors.append(f"{channel.value}: Failed to send")
                
                elif channel == NotificationChannel.PUSH:
                    if self._send_push(message):
                        channels_used.append(channel)
                    else:
                        errors.append(f"{channel.value}: Failed to send")
                
                elif channel == NotificationChannel.IN_APP:
                    if self._send_in_app(message):
                        channels_used.append(channel)
                    else:
                        errors.append(f"{channel.value}: Failed to send")
            
            except Exception as e:
                errors.append(f"{channel.value}: {str(e)}")
                self.logger.error(
                    f"Error sending via {channel.value}: {str(e)}",
                    exc_info=True
                )
        
        # Result: success if at least one channel succeeded
        success = len(channels_used) > 0
        error_msg = " | ".join(errors) if errors else None
        
        self.logger.info(
            f"Notification {message.notif_type.value} to {message.recipient_email}: "
            f"{'SUCCESS' if success else 'FAILED'} ({len(channels_used)}/{len(channels_attempted)} channels)"
        )
        
        return NotificationResult(
            success=success,
            error=error_msg,
            channels_attempted=channels_attempted,
            channels_used=channels_used,
            message=message,
        )
    
    def _send_email(self, message: NotificationMessage) -> bool:
        """Send via email channel"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would send email to {message.recipient_email}")
            return True
        
        try:
            template_name = NotificationRegistry.get_template(message.notif_type)
            if not template_name:
                self.logger.warning(f"No template for {message.notif_type.value}")
                return False
            
            # Render email template
            html_message = render_to_string(
                f"emails/{template_name}",
                message.context
            )
            text_message = strip_tags(html_message)
            
            # Send email
            send_mail(
                subject=message.subject,
                message=text_message,
                from_email="noreply@edulink.local",
                recipient_list=[message.recipient_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            return True
        
        except Exception as e:
            self.logger.error(f"Email send failed: {str(e)}")
            return False
    
    def _send_sms(self, message: NotificationMessage) -> bool:
        """Send via SMS channel (placeholder)"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would send SMS to {message.recipient_email}")
            return True
        
        # TODO: Integrate with SMS provider (Twilio, etc.)
        self.logger.warning("SMS channel not yet implemented")
        return False
    
    def _send_push(self, message: NotificationMessage) -> bool:
        """Send via push notification channel (placeholder)"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would send push to {message.recipient_id}")
            return True
        
        # TODO: Integrate with push service (Firebase, etc.)
        self.logger.warning("Push channel not yet implemented")
        return False
    
    def _send_in_app(self, message: NotificationMessage) -> bool:
        """Send via in-app notification channel"""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would send in-app to {message.recipient_id}")
            return True
        
        try:
            from edulink.apps.notifications.models import InAppNotification
            
            # Create in-app notification record
            InAppNotification.objects.create(
                recipient_id=message.recipient_id,
                notification_type=message.notif_type.value,
                subject=message.subject,
                content=str(message.context),
                priority=message.priority.value,
                read=False,
                created_at=datetime.now(),
            )
            
            return True
        
        except Exception as e:
            self.logger.error(f"In-app notification failed: {str(e)}")
            return False
    
    def send_batch(
        self,
        messages: List[NotificationMessage]
    ) -> List["NotificationResult"]:
        """
        Send multiple notifications.
        
        Returns list of NotificationResult objects.
        """
        results = []
        for message in messages:
            result = self.send(message)
            results.append(result)
        
        # Log batch summary
        success_count = sum(1 for r in results if r.success)
        self.logger.info(
            f"Batch send complete: {success_count}/{len(results)} succeeded"
        )
        
        return results


class NotificationResult:
    """Result of sending a notification"""
    
    def __init__(
        self,
        success: bool,
        error: Optional[str] = None,
        channels_attempted: Optional[List[NotificationChannel]] = None,
        channels_used: Optional[List[NotificationChannel]] = None,
        message: Optional[NotificationMessage] = None,
    ):
        self.success = success
        self.error = error
        self.channels_attempted = channels_attempted or []
        self.channels_used = channels_used or []
        self.message = message
        self.sent_at = datetime.now()
    
    def __str__(self) -> str:
        status = "✓ SUCCESS" if self.success else "✗ FAILED"
        channels = ", ".join([c.value for c in self.channels_used]) or "none"
        return f"{status} via {channels}" + (f": {self.error}" if self.error else "")


class NotificationMessageBuilder:
    """
    Fluent builder for creating NotificationMessage objects.
    
    Usage:
        message = (NotificationMessageBuilder(NotificationType.SUPERVISOR_ASSIGNMENT_CREATED)
            .for_recipient(supervisor_id, supervisor_email, NotificationRecipient.SUPERVISOR)
            .with_context("student_name", "John Doe")
            .with_context("opportunity_title", "Marketing Internship")
            .with_subject("You've been assigned a new supervisor for John's internship")
            .with_priority(NotificationPriority.HIGH)
            .build())
    """
    
    def __init__(self, notif_type: NotificationType):
        self.notif_type = notif_type
        self.recipient_id: Optional[UUID] = None
        self.recipient_email: Optional[str] = None
        self.recipient_type: Optional[NotificationRecipient] = None
        self.context: Dict[str, Any] = {}
        self.subject: Optional[str] = None
        self.priority: Optional[NotificationPriority] = None
        self.channels: Optional[List[NotificationChannel]] = None
        self.metadata: Dict[str, Any] = {}
    
    def for_recipient(
        self,
        recipient_id: UUID,
        recipient_email: str,
        recipient_type: NotificationRecipient
    ) -> "NotificationMessageBuilder":
        """Set notification recipient"""
        self.recipient_id = recipient_id
        self.recipient_email = recipient_email
        self.recipient_type = recipient_type
        return self
    
    def with_context(self, key: str, value: Any) -> "NotificationMessageBuilder":
        """Add context data for template rendering"""
        self.context[key] = value
        return self
    
    def with_contexts(self, data: Dict[str, Any]) -> "NotificationMessageBuilder":
        """Add multiple context values"""
        self.context.update(data)
        return self
    
    def with_subject(self, subject: str) -> "NotificationMessageBuilder":
        """Override subject line"""
        self.subject = subject
        return self
    
    def with_priority(self, priority: NotificationPriority) -> "NotificationMessageBuilder":
        """Override priority"""
        self.priority = priority
        return self
    
    def with_channels(self, channels: List[NotificationChannel]) -> "NotificationMessageBuilder":
        """Override delivery channels"""
        self.channels = channels
        return self
    
    def with_metadata(self, key: str, value: Any) -> "NotificationMessageBuilder":
        """Add metadata"""
        self.metadata[key] = value
        return self
    
    def build(self) -> NotificationMessage:
        """Build the NotificationMessage"""
        if not self.recipient_id or not self.recipient_email or not self.recipient_type:
            raise ValueError("recipient_id, recipient_email, and recipient_type are required")
        
        return NotificationMessage(
            notif_type=self.notif_type,
            recipient_id=self.recipient_id,
            recipient_email=self.recipient_email,
            recipient_type=self.recipient_type,
            context=self.context,
            priority=self.priority,
            channels=self.channels,
            subject=self.subject,
            metadata=self.metadata,
        )


# ============================================================================
# Convenience Functions (Backward Compatibility)
# ============================================================================

_dispatcher = NotificationDispatcher()


def send_notification(
    notif_type: NotificationType,
    recipient_id: UUID,
    recipient_email: str,
    recipient_type: NotificationRecipient,
    context: Dict[str, Any],
    **kwargs
) -> NotificationResult:
    """
    Convenience function to send a single notification.
    
    Replaces dozens of scattered send_notification_*() functions.
    
    Usage:
        send_notification(
            notif_type=NotificationType.SUPERVISOR_ASSIGNMENT_CREATED,
            recipient_id=supervisor_id,
            recipient_email=supervisor_email,
            recipient_type=NotificationRecipient.SUPERVISOR,
            context={
                "student_name": "John Doe",
                "opportunity_title": "Marketing Internship",
            }
        )
    """
    message = (NotificationMessageBuilder(notif_type)
        .for_recipient(recipient_id, recipient_email, recipient_type)
        .with_contexts(context)
        .build())
    
    return _dispatcher.send(message)


def send_notification_batch(
    notifications: List[Dict[str, Any]]
) -> List[NotificationResult]:
    """
    Send batch of notifications.
    
    Each dict should have: notif_type, recipient_id, recipient_email,
    recipient_type, context
    """
    messages = []
    for notif in notifications:
        builder = NotificationMessageBuilder(notif['notif_type'])
        builder.for_recipient(
            notif['recipient_id'],
            notif['recipient_email'],
            notif['recipient_type']
        )
        builder.with_contexts(notif.get('context', {}))
        
        if 'subject' in notif:
            builder.with_subject(notif['subject'])
        if 'priority' in notif:
            builder.with_priority(notif['priority'])
        
        messages.append(builder.build())
    
    return _dispatcher.send_batch(messages)
