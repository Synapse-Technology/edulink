"""
Django-Q2 Scheduler Configuration

Registers all scheduled periodic tasks for the Edulink platform.
This file is loaded by Django-Q2 via the 'schedule_module' setting.

Each entry defines:
- func: The task function to execute
- schedule_type: Type of schedule ('minutes', 'hourly', 'daily', etc.)
- repeats: How often to repeat (-1 = infinite)
- next_run: When to schedule the first execution (optional, defaults to now)
"""

from django_extensions.management.commands import make_qcluster
from django.conf import settings
from datetime import timezone

schedule = [
    # INTERNSHIP DEADLINE MANAGEMENT TASKS
    
    {
        'name': 'Check Expired Internship Deadlines',
        'func': 'edulink.apps.internships.tasks.close_expired_deadlines',
        'schedule_type': 'minutes',
        'repeats': -1,  # Infinite
        'minutes': 480,  # Every 8 hours (3 times per day: 00:00, 08:00, 16:00)
    },
    
    {
        'name': 'Send 24-Hour Deadline Reminders',
        'func': 'edulink.apps.internships.tasks.send_deadline_reminders_24h',
        'schedule_type': 'minutes',
        'repeats': -1,  # Infinite
        'minutes': 60,  # Every 1 hour (unchanged - still needed for accuracy)
    },
    
    {
        'name': 'Send 1-Hour Deadline Reminders',
        'func': 'edulink.apps.internships.tasks.send_deadline_reminders_1h',
        'schedule_type': 'minutes',
        'repeats': -1,  # Infinite
        'minutes': 5,   # Every 5 minutes (unchanged - urgent, needs tight window)
    },
    
    {
        'name': 'Escalate Zero Applications Opportunities',
        'func': 'edulink.apps.internships.tasks.send_no_applications_escalation',
        'schedule_type': 'minutes',
        'repeats': -1,  # Infinite
        'minutes': 480,  # Every 8 hours, aligned with deadline check (runs as part of closure window)
    },
    
    {
        'name': 'Send Student Opportunity Deadline Alerts',
        'func': 'edulink.apps.internships.tasks.send_student_opportunity_deadline_alerts',
        'schedule_type': 'minutes',
        'repeats': -1,  # Infinite
        'minutes': 60,  # Every 1 hour (aligned with 24h reminder for consistency)
    },
]
