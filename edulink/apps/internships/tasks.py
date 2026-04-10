"""
Scheduled tasks for internship lifecycle management.
Handles automatic opportunity closing, deadline reminders, and lifecycle events.

Following architecture rules:
- Business logic only (pure functions)
- Emits events via ledger
- Coordinate with notifications service
- No HTTP handling
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from uuid import UUID

from edulink.apps.ledger.services import record_event
from edulink.apps.notifications.services import (
    send_internship_deadline_closing_notification,
    send_internship_deadline_approaching_24h_notification,
    send_internship_deadline_approaching_1h_notification,
    send_employer_no_applications_notification,
    send_student_opportunity_deadline_alert_notification
)
from .models import InternshipOpportunity, OpportunityStatus
from .workflows import opportunity_workflow

logger = logging.getLogger(__name__)


@transaction.atomic
def close_expired_deadlines():
    """
    Scheduled task: Close (OPEN → CLOSED) all internship opportunities
    whose application_deadline has passed.
    
    Called every 5 minutes by Django-Q2 scheduler.
    Emits ledger event for each closure and notifies employers.
    """
    now = timezone.now()
    
    # Find all OPEN opportunities with passed deadlines
    expired_opportunities = InternshipOpportunity.objects.filter(
        status=OpportunityStatus.OPEN,
        application_deadline__isnull=False,
        application_deadline__lt=now
    )
    
    closed_count = 0
    
    for opportunity in expired_opportunities:
        try:
            # Transition via workflow to ensure business rules are enforced
            opportunity_workflow.transition(
                opportunity,
                target_status=OpportunityStatus.CLOSED,
                actor_role="SYSTEM"
            )
            opportunity.save()
            
            # Record explicit closure event in ledger
            record_event(
                event_type="INTERNSHIP_OPPORTUNITY_CLOSED_BY_DEADLINE",
                entity_id=opportunity.id,
                entity_type="InternshipOpportunity",
                actor_id=None,  # System action
                actor_role="SYSTEM",
                payload={
                    "reason": "application_deadline_passed",
                    "deadline": opportunity.application_deadline.isoformat(),
                    "closed_at": now.isoformat(),
                    "opportunity_title": opportunity.title,
                    "employer_id": str(opportunity.employer_id),
                    "institution_id": str(opportunity.institution_id)
                }
            )
            
            # Enqueue employer notification
            notify_employer_deadline_passed(
                opportunity_id=opportunity.id,
                employer_id=opportunity.employer_id
            )
            
            closed_count += 1
            logger.info(f"Closed expired opportunity: {opportunity.id} ({opportunity.title})")
            
        except Exception as e:
            logger.error(f"Failed to close expired opportunity {opportunity.id}: {e}")
            continue
    
    logger.info(f"Deadline closure task completed. Closed {closed_count} opportunities.")
    return closed_count


@transaction.atomic
def send_deadline_reminders_24h():
    """
    Scheduled task: Send "deadline in 24 hours" reminders to employers.
    
    Called every 1 hour by Django-Q2 scheduler.
    Finds opportunities with deadlines occurring in the next 24-25 hours
    and sends reminder emails if not already sent.
    """
    now = timezone.now()
    reminder_window_start = now + timedelta(hours=24)
    reminder_window_end = now + timedelta(hours=25)
    
    # Find OPEN opportunities within 24-25 hour window
    upcoming_opportunities = InternshipOpportunity.objects.filter(
        status=OpportunityStatus.OPEN,
        application_deadline__gte=reminder_window_start,
        application_deadline__lte=reminder_window_end
    )
    
    reminded_count = 0
    
    for opportunity in upcoming_opportunities:
        try:
            # Check if reminder already sent (idempotency key)
            idempotency_key = f"deadline-reminder-24h-{opportunity.id}"
            
            # Enqueue notification task
            notify_employer_deadline_approaching_24h(
                opportunity_id=opportunity.id,
                employer_id=opportunity.employer_id,
                idempotency_key=idempotency_key
            )
            
            # Record event for audit trail
            record_event(
                event_type="INTERNSHIP_DEADLINE_REMINDER_24H_SENT",
                entity_id=opportunity.id,
                entity_type="InternshipOpportunity",
                actor_id=None,
                actor_role="SYSTEM",
                payload={
                    "opportunity_title": opportunity.title,
                    "deadline": opportunity.application_deadline.isoformat(),
                    "employer_id": str(opportunity.employer_id),
                    "reminder_sent_at": now.isoformat()
                }
            )
            
            reminded_count += 1
            logger.info(f"24h reminder queued for opportunity: {opportunity.id}")
            
        except Exception as e:
            logger.error(f"Failed to send 24h reminder for opportunity {opportunity.id}: {e}")
            continue
    
    logger.info(f"24-hour deadline reminder task completed. Reminded {reminded_count} opportunities.")
    return reminded_count


@transaction.atomic
def send_deadline_reminders_1h():
    """
    Scheduled task: Send "deadline in 1 hour" reminders to employers.
    
    Called every 5 minutes by Django-Q2 scheduler (urgent).
    Finds opportunities with deadlines occurring in the next 1-1.25 hours
    and sends final reminder emails if not already sent.
    """
    now = timezone.now()
    reminder_window_start = now + timedelta(minutes=60)
    reminder_window_end = now + timedelta(minutes=75)
    
    # Find OPEN opportunities within 1-1.25 hour window
    urgent_opportunities = InternshipOpportunity.objects.filter(
        status=OpportunityStatus.OPEN,
        application_deadline__gte=reminder_window_start,
        application_deadline__lte=reminder_window_end
    )
    
    reminded_count = 0
    
    for opportunity in urgent_opportunities:
        try:
            # Check if reminder already sent (idempotency key)
            idempotency_key = f"deadline-reminder-1h-{opportunity.id}"
            
            # Enqueue notification task
            notify_employer_deadline_approaching_1h(
                opportunity_id=opportunity.id,
                employer_id=opportunity.employer_id,
                idempotency_key=idempotency_key
            )
            
            # Record event for audit trail
            record_event(
                event_type="INTERNSHIP_DEADLINE_REMINDER_1H_SENT",
                entity_id=opportunity.id,
                entity_type="InternshipOpportunity",
                actor_id=None,
                actor_role="SYSTEM",
                payload={
                    "opportunity_title": opportunity.title,
                    "deadline": opportunity.application_deadline.isoformat(),
                    "employer_id": str(opportunity.employer_id),
                    "reminder_sent_at": now.isoformat()
                }
            )
            
            reminded_count += 1
            logger.info(f"1h reminder queued for opportunity: {opportunity.id}")
            
        except Exception as e:
            logger.error(f"Failed to send 1h reminder for opportunity {opportunity.id}: {e}")
            continue
    
    logger.info(f"1-hour deadline reminder task completed. Reminded {reminded_count} opportunities.")
    return reminded_count


def notify_employer_deadline_passed(*, opportunity_id: UUID, employer_id: UUID) -> bool:
    """
    Service function: Enqueue email notification for employer when deadline passes.
    
    Called after automatic opportunity closure.
    Fetches opportunity details and triggers async email delivery.
    """
    try:
        opportunity = InternshipOpportunity.objects.get(id=opportunity_id)
        
        # Get employer email from employer app
        from edulink.apps.employers.queries import get_employer_by_id
        employer = get_employer_by_id(employer_id)
        
        if not employer or not employer.user or not employer.user.email:
            logger.warning(f"Cannot send deadline-passed notification: Employer {employer_id} has no email")
            return False
        
        return send_internship_deadline_closing_notification(
            opportunity_id=str(opportunity.id),
            opportunity_title=opportunity.title,
            employer_id=str(employer.id),
            employer_email=employer.user.email,
            total_applications=opportunity.internshipapplication_set.count(),
            deadline=opportunity.application_deadline.strftime("%B %d, %Y %I:%M %p"),
            actor_id=None
        )
        
    except Exception as e:
        logger.error(f"Failed to notify employer about deadline: {e}")
        return False



def notify_employer_deadline_approaching_24h(
    *, opportunity_id: UUID, employer_id: UUID, idempotency_key: str
) -> bool:
    """
    Service function: Enqueue email notification for employer 24 hours before deadline.
    
    Called by send_deadline_reminders_24h scheduled task.
    Provides time for employer to take action if needed (e.g., extend, promote posting).
    """
    try:
        opportunity = InternshipOpportunity.objects.get(id=opportunity_id)
        
        # Get employer email from employer app
        from edulink.apps.employers.queries import get_employer_by_id
        employer = get_employer_by_id(employer_id)
        
        if not employer or not employer.user or not employer.user.email:
            logger.warning(f"Cannot send 24h reminder: Employer {employer_id} has no email")
            return False
        
        return send_internship_deadline_approaching_24h_notification(
            opportunity_id=str(opportunity.id),
            opportunity_title=opportunity.title,
            employer_id=str(employer.id),
            employer_email=employer.user.email,
            current_applications=opportunity.internshipapplication_set.filter(
                status__in=["APPLIED", "SHORTLISTED", "ACCEPTED"]
            ).count(),
            deadline=opportunity.application_deadline.strftime("%B %d, %Y %I:%M %p"),
            actor_id=None,
            idempotency_key=idempotency_key
        )
        
    except Exception as e:
        logger.error(f"Failed to send 24h deadline reminder: {e}")
        return False



def notify_employer_deadline_approaching_1h(
    *, opportunity_id: UUID, employer_id: UUID, idempotency_key: str
) -> bool:
    """
    Service function: Enqueue email notification for employer 1 hour before deadline.
    
    Called by send_deadline_reminders_1h scheduled task.
    Final urgent reminder as deadline fast approaches.
    """
    try:
        opportunity = InternshipOpportunity.objects.get(id=opportunity_id)
        
        # Get employer email from employer app
        from edulink.apps.employers.queries import get_employer_by_id
        employer = get_employer_by_id(employer_id)
        
        if not employer or not employer.user or not employer.user.email:
            logger.warning(f"Cannot send 1h reminder: Employer {employer_id} has no email")
            return False
        
        return send_internship_deadline_approaching_1h_notification(
            opportunity_id=str(opportunity.id),
            opportunity_title=opportunity.title,
            employer_id=str(employer.id),
            employer_email=employer.user.email,
            current_applications=opportunity.internshipapplication_set.filter(
                status__in=["APPLIED", "SHORTLISTED", "ACCEPTED"]
            ).count(),
            deadline=opportunity.application_deadline.strftime("%B %d, %Y %I:%M %p"),
            actor_id=None,
            idempotency_key=idempotency_key
        )
        
    except Exception as e:
        logger.error(f"Failed to send 1h deadline reminder: {e}")
        return False


@transaction.atomic
def send_no_applications_escalation():
    """
    Scheduled task: Send escalation notification to employers who received
    zero applications by their deadline.
    
    Called daily as part of close_expired_deadlines window.
    Identifies opportunities with zero applications and notifies employers
    for potential reposting, process review, or support.
    """
    now = timezone.now()
    
    # Find CLOSED opportunities that just closed with zero applications
    # Look back 2 hours to catch recently closed opportunities
    two_hours_ago = now - timedelta(hours=2)
    
    closed_opportunities = InternshipOpportunity.objects.filter(
        status=OpportunityStatus.CLOSED,
        application_deadline__gte=two_hours_ago,
        application_deadline__lt=now
    )
    
    escalated_count = 0
    
    for opportunity in closed_opportunities:
        try:
            # Count valid applications (exclude withdrawn/cancelled)
            application_count = opportunity.internshipapplication_set.filter(
                status__in=["APPLIED", "SHORTLISTED", "ACCEPTED", "OFFERED", "REJECTED"]
            ).count()
            
            # Only escalate if zero applications received
            if application_count == 0:
                idempotency_key = f"escalation-no-apps-{opportunity.id}"
                
                # Enqueue escalation notification
                notify_employer_no_applications(
                    opportunity_id=opportunity.id,
                    employer_id=opportunity.employer_id,
                    idempotency_key=idempotency_key
                )
                
                # Record event for audit trail
                record_event(
                    event_type="INTERNSHIP_NO_APPLICATIONS_ESCALATION_SENT",
                    entity_id=opportunity.id,
                    entity_type="InternshipOpportunity",
                    actor_id=None,
                    actor_role="SYSTEM",
                    payload={
                        "opportunity_title": opportunity.title,
                        "deadline": opportunity.application_deadline.isoformat(),
                        "employer_id": str(opportunity.employer_id),
                        "escalation_sent_at": now.isoformat()
                    }
                )
                
                escalated_count += 1
                logger.info(f"Escalation notification queued for opportunity with zero applications: {opportunity.id}")
        
        except Exception as e:
            logger.error(f"Failed to send escalation for opportunity {opportunity.id}: {e}")
            continue
    
    logger.info(f"Escalation task completed. Escalated {escalated_count} opportunities with zero applications.")
    return escalated_count


def notify_employer_no_applications(
    *, opportunity_id: UUID, employer_id: UUID, idempotency_key: str
) -> bool:
    """
    Service function: Enqueue escalation notification for employers with zero applications.
    
    Called by send_no_applications_escalation task.
    Provides support and suggestions for employers to improve posting reach.
    """
    try:
        opportunity = InternshipOpportunity.objects.get(id=opportunity_id)
        
        # Get employer email from employer app
        from edulink.apps.employers.queries import get_employer_by_id
        employer = get_employer_by_id(employer_id)
        
        if not employer or not employer.user or not employer.user.email:
            logger.warning(f"Cannot send escalation: Employer {employer_id} has no email")
            return False
        
        return send_employer_no_applications_notification(
            opportunity_id=str(opportunity.id),
            opportunity_title=opportunity.title,
            employer_id=str(employer.id),
            employer_email=employer.user.email,
            deadline=opportunity.application_deadline.strftime("%B %d, %Y %I:%M %p"),
            actor_id=None,
            idempotency_key=idempotency_key
        )
        
    except Exception as e:
        logger.error(f"Failed to send no-applications escalation: {e}")
        return False


@transaction.atomic
def send_student_opportunity_deadline_alerts():
    """
    Scheduled task: Send deadline alerts to students for opportunities expiring soon.
    
    Called daily. Finds opportunities expiring in 24-26 hours and sends
    notification to interested students (those who have viewed/engaged with the opportunity).
    """
    now = timezone.now()
    alert_window_start = now + timedelta(hours=24)
    alert_window_end = now + timedelta(hours=26)
    
    # Get opportunities closing in 24-26 hour window
    closing_soon = InternshipOpportunity.objects.filter(
        status=OpportunityStatus.OPEN,
        application_deadline__gte=alert_window_start,
        application_deadline__lte=alert_window_end
    )
    
    alerted_count = 0
    
    for opportunity in closing_soon:
        try:
            # Get students who have applied to this opportunity
            # These are the most interested students
            students_to_alert = opportunity.applications.values_list(
                'student_id', flat=True
            ).distinct()
            
            for student_id in students_to_alert:
                try:
                    idempotency_key = f"student-deadline-alert-{opportunity.id}-{student_id}"
                    
                    # Get student email
                    from edulink.apps.students.queries import get_student_by_id
                    student = get_student_by_id(student_id)
                    
                    if not student or not student.user or not student.user.email:
                        logger.warning(f"Cannot send alert: Student {student_id} has no email")
                        continue
                    
                    # Enqueue student alert
                    notify_student_deadline_approaching(
                        opportunity_id=opportunity.id,
                        opportunity_title=opportunity.title,
                        student_id=student_id,
                        student_email=student.user.email,
                        student_name=student.user.get_full_name() or student.user.username,
                        deadline=opportunity.application_deadline.strftime("%B %d, %Y %I:%M %p"),
                        idempotency_key=idempotency_key
                    )
                    
                    alerted_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to send deadline alert to student {student_id}: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"Failed to send deadline alerts for opportunity {opportunity.id}: {e}")
            continue
    
    logger.info(f"Student deadline alert task completed. Alerted {alerted_count} student-opportunity pairs.")
    return alerted_count


def notify_student_deadline_approaching(
    *,
    opportunity_id: UUID,
    opportunity_title: str,
    student_id: UUID,
    student_email: str,
    student_name: str,
    deadline: str,
    idempotency_key: str
) -> bool:
    """
    Service function: Enqueue deadline alert for students.
    
    Called by send_student_opportunity_deadline_alerts task.
    Notifies students of opportunities closing in 24 hours they've applied to.
    """
    try:
        context = {
            "student_name": student_name,
            "opportunity_title": opportunity_title,
            "opportunity_id": str(opportunity_id),
            "deadline": deadline,
            "dashboard_url": f"{settings.FRONTEND_URL}/student/applications",
            "opportunity_url": f"{settings.FRONTEND_URL}/opportunities/{opportunity_id}",
            "notification_type": Notification.TYPE_DEADLINE_APPROACHING,
            "related_entity_type": "InternshipOpportunity",
            "related_entity_id": str(opportunity_id)
        }
        
        return send_student_opportunity_deadline_alert_notification(
            opportunity_id=str(opportunity_id),
            opportunity_title=opportunity_title,
            student_email=student_email,
            student_name=student_name,
            deadline=deadline,
            actor_id=None,
            idempotency_key=idempotency_key
        )
        
    except Exception as e:
        logger.error(f"Failed to send deadline alert to student {student_email}: {e}")
        return False
