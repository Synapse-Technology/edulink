import logging
from django.db import transaction
from .models import ContactSubmission
from edulink.apps.ledger.services import record_event

logger = logging.getLogger(__name__)

@transaction.atomic
def create_contact_submission(*, name: str, email: str, subject: str, message: str) -> ContactSubmission:
    """
    Execute the business action of submitting a contact form.
    Handles data persistence, ledger event recording, and notification triggers.
    """
    submission = ContactSubmission.objects.create(
        name=name,
        email=email,
        subject=subject,
        message=message
    )

    # Record the event in the ledger for auditability
    record_event(
        event_type="CONTACT_FORM_SUBMITTED",
        entity_type="ContactSubmission",
        entity_id=submission.id,
        payload={
            "name": name,
            "email": email,
            "subject": subject
        }
    )

    # Trigger notifications (Auto-reply to user and alert to admin)
    from edulink.apps.notifications.services import (
        send_contact_submission_confirmation,
        send_contact_submission_admin_notification
    )
    
    try:
        # Auto-reply to the person who submitted the form
        send_contact_submission_confirmation(submission=submission)
        
        # Notify the internal support/admin team
        send_contact_submission_admin_notification(submission=submission)
    except Exception as e:
        logger.error(f"Failed to trigger contact notifications for submission {submission.id}: {e}")

    return submission


@transaction.atomic
def process_contact_submission(*, submission_id: str, processed_by_id: str, internal_notes: str = "") -> ContactSubmission:
    """
    Mark a contact submission as processed.
    Records the action in the ledger.
    """
    from django.utils import timezone
    try:
        submission = ContactSubmission.objects.get(id=submission_id)
        submission.is_processed = True
        submission.processed_at = timezone.now()
        submission.processed_by_id = processed_by_id
        submission.internal_notes = internal_notes
        submission.save()

        # Record the event in the ledger
        record_event(
            event_type="CONTACT_FORM_PROCESSED",
            actor_id=processed_by_id,
            entity_type="ContactSubmission",
            entity_id=submission.id,
            payload={
                "processed_at": submission.processed_at.isoformat(),
                "internal_notes_length": len(internal_notes)
            }
        )

        return submission
    except ContactSubmission.DoesNotExist:
        raise ValueError(f"Contact submission {submission_id} not found")
