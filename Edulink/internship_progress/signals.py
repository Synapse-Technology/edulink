from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from application.models import Application
from dashboards.models import InternshipProgress, AnalyticsEvent
from .models import LogbookEntry
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Application)
def update_progress_on_application_change(sender, instance, created, **kwargs):
    """Update student progress when application status changes."""
    try:
        student = instance.student
        progress, _ = InternshipProgress.objects.get_or_create(student=student)
        
        # Update application counts
        applications = Application.objects.filter(student=student)
        progress.total_applications = applications.count()
        progress.applications_this_month = applications.filter(
            application_date__month=timezone.now().month,
            application_date__year=timezone.now().year
        ).count()
        
        # Update first application date
        if not progress.first_application_date and instance.application_date:
            progress.first_application_date = instance.application_date
        
        # Update acceptance data
        accepted_apps = applications.filter(status='accepted')
        progress.total_acceptances = accepted_apps.count()
        
        if not progress.first_acceptance_date and instance.status == 'accepted':
            progress.first_acceptance_date = instance.application_date
        
        progress.save()
        
        # Create analytics event for status changes
        if not created and instance.status in ['accepted', 'rejected', 'reviewed']:
            AnalyticsEvent.objects.create(
                student=student,
                event_type=f'application_{instance.status}',
                event_data={
                    'application_id': instance.id,
                    'internship_title': instance.internship.title,
                    'company': instance.internship.employer.company_name
                }
            )
    
    except Exception as e:
        # Log error but don't break the application flow
        logger.error(f'Error updating progress for application {instance.id}: {e}', exc_info=True)


@receiver(post_delete, sender=Application)
def update_progress_on_application_delete(sender, instance, **kwargs):
    """Update student progress when application is deleted."""
    try:
        student = instance.student
        progress, _ = InternshipProgress.objects.get_or_create(student=student)
        
        # Recalculate application counts
        applications = Application.objects.filter(student=student)
        progress.total_applications = applications.count()
        progress.applications_this_month = applications.filter(
            application_date__month=timezone.now().month,
            application_date__year=timezone.now().year
        ).count()
        
        # Recalculate acceptance data
        accepted_apps = applications.filter(status='accepted')
        progress.total_acceptances = accepted_apps.count()
        
        # Update first dates if necessary
        if applications.exists():
            first_app = applications.order_by('application_date').first()
            progress.first_application_date = first_app.application_date
            
            if accepted_apps.exists():
                first_acceptance = accepted_apps.order_by('application_date').first()
                progress.first_acceptance_date = first_acceptance.application_date
            else:
                progress.first_acceptance_date = None
        else:
            progress.first_application_date = None
            progress.first_acceptance_date = None
        
        progress.save()
    
    except Exception as e:
        logger.error(f'Error updating progress after application deletion: {e}', exc_info=True)


@receiver(post_save, sender=LogbookEntry)
def update_progress_on_logbook_entry(sender, instance, created, **kwargs):
    """Update analytics when logbook entries are created or updated."""
    try:
        if created:
            AnalyticsEvent.objects.create(
                student=instance.student,
                event_type='logbook_entry_created',
                event_data={
                    'entry_id': instance.id,
                    'week_number': instance.week_number,
                    'internship_title': instance.internship.title
                }
            )
        elif instance.status == 'reviewed':
            AnalyticsEvent.objects.create(
                student=instance.student,
                event_type='logbook_entry_reviewed',
                event_data={
                    'entry_id': instance.id,
                    'week_number': instance.week_number,
                    'internship_title': instance.internship.title
                }
            )
    
    except Exception as e:
        logger.error(f'Error creating analytics event for logbook entry {instance.id}: {e}', exc_info=True)