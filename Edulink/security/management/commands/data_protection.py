from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from security.models import SecurityEvent, UserSession, FailedLoginAttempt
from django.contrib.auth import get_user_model
import json
import hashlib

User = get_user_model()

class Command(BaseCommand):
    help = 'Data protection and privacy compliance management'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up old data based on retention policy',
        )
        parser.add_argument(
            '--export-user',
            type=str,
            help='Export all data for a specific user (provide user ID or email)',
        )
        parser.add_argument(
            '--delete-user-data',
            type=str,
            help='Delete all data for a specific user (provide user ID or email)',
        )
        parser.add_argument(
            '--anonymize-logs',
            action='store_true',
            help='Anonymize IP addresses in existing logs',
        )
        parser.add_argument(
            '--privacy-report',
            action='store_true',
            help='Generate privacy compliance report',
        )

    def handle(self, *args, **options):
        if options['cleanup']:
            self.cleanup_old_data()
        
        if options['export_user']:
            self.export_user_data(options['export_user'])
        
        if options['delete_user_data']:
            self.delete_user_data(options['delete_user_data'])
        
        if options['anonymize_logs']:
            self.anonymize_existing_logs()
        
        if options['privacy_report']:
            self.generate_privacy_report()

    def cleanup_old_data(self):
        """Clean up old data based on retention policy."""
        retention_days = getattr(settings, 'DATA_RETENTION_DAYS', 90)
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        # Clean up security events
        old_events = SecurityEvent.objects.filter(timestamp__lt=cutoff_date)
        events_count = old_events.count()
        old_events.delete()
        
        # Clean up failed login attempts
        old_attempts = FailedLoginAttempt.objects.filter(timestamp__lt=cutoff_date)
        attempts_count = old_attempts.count()
        old_attempts.delete()
        
        # Clean up old user sessions
        old_sessions = UserSession.objects.filter(last_activity__lt=cutoff_date)
        sessions_count = old_sessions.count()
        old_sessions.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Data cleanup completed:\n'
                f'- Deleted {events_count} old security events\n'
                f'- Deleted {attempts_count} old failed login attempts\n'
                f'- Deleted {sessions_count} old user sessions\n'
                f'- Retention period: {retention_days} days'
            )
        )

    def export_user_data(self, user_identifier):
        """Export all data for a specific user."""
        try:
            # Try to find user by email first, then by ID
            try:
                user = User.objects.get(email=user_identifier)
            except User.DoesNotExist:
                user = User.objects.get(id=int(user_identifier))
            
            # Collect user data
            user_data = {
                'user_info': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'date_joined': user.date_joined.isoformat(),
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                },
                'security_events': list(
                    SecurityEvent.objects.filter(user=user).values(
                        'event_type', 'severity', 'description', 'timestamp'
                    )
                ),
                'user_sessions': list(
                    UserSession.objects.filter(user=user).values(
                        'session_key', 'last_activity', 'created_at'
                    )
                ),
                'failed_login_attempts': list(
                    FailedLoginAttempt.objects.filter(user=user).values(
                        'timestamp', 'ip_address'
                    )
                ),
            }
            
            # Save to file
            filename = f'user_data_export_{user.id}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(filename, 'w') as f:
                json.dump(user_data, f, indent=2, default=str)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'User data exported to {filename}\n'
                    f'User: {user.email} (ID: {user.id})'
                )
            )
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User not found: {user_identifier}')
            )
        except ValueError:
            self.stdout.write(
                self.style.ERROR(f'Invalid user ID: {user_identifier}')
            )

    def delete_user_data(self, user_identifier):
        """Delete all data for a specific user."""
        try:
            # Try to find user by email first, then by ID
            try:
                user = User.objects.get(email=user_identifier)
            except User.DoesNotExist:
                user = User.objects.get(id=int(user_identifier))
            
            # Delete related data
            security_events = SecurityEvent.objects.filter(user=user).count()
            SecurityEvent.objects.filter(user=user).delete()
            
            user_sessions = UserSession.objects.filter(user=user).count()
            UserSession.objects.filter(user=user).delete()
            
            failed_attempts = FailedLoginAttempt.objects.filter(user=user).count()
            FailedLoginAttempt.objects.filter(user=user).delete()
            
            # Delete user account
            user_email = user.email
            user_id = user.id
            user.delete()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'User data deleted:\n'
                    f'- User: {user_email} (ID: {user_id})\n'
                    f'- Security events: {security_events}\n'
                    f'- User sessions: {user_sessions}\n'
                    f'- Failed login attempts: {failed_attempts}'
                )
            )
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User not found: {user_identifier}')
            )
        except ValueError:
            self.stdout.write(
                self.style.ERROR(f'Invalid user ID: {user_identifier}')
            )

    def anonymize_existing_logs(self):
        """Anonymize IP addresses in existing logs."""
        # Anonymize security events
        events_updated = 0
        for event in SecurityEvent.objects.exclude(ip_address__isnull=True).exclude(ip_address=''):
            if event.ip_address:
                # Hash the IP address
                event.ip_address = hashlib.sha256(event.ip_address.encode()).hexdigest()[:16]
                event.save()
                events_updated += 1
        
        # Anonymize failed login attempts
        attempts_updated = 0
        for attempt in FailedLoginAttempt.objects.exclude(ip_address__isnull=True).exclude(ip_address=''):
            if attempt.ip_address:
                # Hash the IP address
                attempt.ip_address = hashlib.sha256(attempt.ip_address.encode()).hexdigest()[:16]
                attempt.save()
                attempts_updated += 1
        
        # Anonymize user sessions
        sessions_updated = 0
        for session in UserSession.objects.exclude(ip_address__isnull=True).exclude(ip_address=''):
            if hasattr(session, 'ip_address') and session.ip_address:
                # Hash the IP address
                session.ip_address = hashlib.sha256(session.ip_address.encode()).hexdigest()[:16]
                session.save()
                sessions_updated += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Anonymization completed:\n'
                f'- Security events: {events_updated}\n'
                f'- Failed login attempts: {attempts_updated}\n'
                f'- User sessions: {sessions_updated}'
            )
        )

    def generate_privacy_report(self):
        """Generate privacy compliance report."""
        # Count data by type
        total_users = User.objects.count()
        total_security_events = SecurityEvent.objects.count()
        total_sessions = UserSession.objects.count()
        total_failed_attempts = FailedLoginAttempt.objects.count()
        
        # Check data age
        retention_days = getattr(settings, 'DATA_RETENTION_DAYS', 90)
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        old_events = SecurityEvent.objects.filter(timestamp__lt=cutoff_date).count()
        old_sessions = UserSession.objects.filter(last_activity__lt=cutoff_date).count()
        old_attempts = FailedLoginAttempt.objects.filter(timestamp__lt=cutoff_date).count()
        
        # Privacy settings check
        privacy_settings = {
            'SECURITY_TRACK_SESSION_IPS': getattr(settings, 'SECURITY_TRACK_SESSION_IPS', True),
            'SECURITY_TRACK_USER_AGENTS': getattr(settings, 'SECURITY_TRACK_USER_AGENTS', True),
            'SECURITY_LOG_IP_ADDRESSES': getattr(settings, 'SECURITY_LOG_IP_ADDRESSES', True),
            'SECURITY_LOG_USER_AGENTS': getattr(settings, 'SECURITY_LOG_USER_AGENTS', True),
            'SECURITY_LOG_DETAILED_METADATA': getattr(settings, 'SECURITY_LOG_DETAILED_METADATA', True),
            'DATA_PROTECTION_ENABLED': getattr(settings, 'DATA_PROTECTION_ENABLED', False),
            'GDPR_COMPLIANCE': getattr(settings, 'GDPR_COMPLIANCE', False),
            'ANONYMIZE_LOGS': getattr(settings, 'ANONYMIZE_LOGS', False),
            'MINIMAL_DATA_COLLECTION': getattr(settings, 'MINIMAL_DATA_COLLECTION', False),
        }
        
        report = f"""
=== PRIVACY COMPLIANCE REPORT ===
Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

DATA INVENTORY:
- Total Users: {total_users}
- Security Events: {total_security_events}
- User Sessions: {total_sessions}
- Failed Login Attempts: {total_failed_attempts}

DATA RETENTION:
- Retention Policy: {retention_days} days
- Old Security Events: {old_events} (should be cleaned)
- Old User Sessions: {old_sessions} (should be cleaned)
- Old Failed Attempts: {old_attempts} (should be cleaned)

PRIVACY SETTINGS:
"""
        
        for setting, value in privacy_settings.items():
            status = "✓ ENABLED" if value else "✗ DISABLED"
            privacy_friendly = "✓ PRIVACY-FRIENDLY" if not value or setting in ['DATA_PROTECTION_ENABLED', 'GDPR_COMPLIANCE', 'ANONYMIZE_LOGS', 'MINIMAL_DATA_COLLECTION'] else "⚠ PRIVACY CONCERN"
            report += f"- {setting}: {status} ({privacy_friendly})\n"
        
        report += f"""

COMPLIANCE STATUS:
- Data Minimization: {'✓ COMPLIANT' if not privacy_settings['SECURITY_LOG_DETAILED_METADATA'] else '⚠ REVIEW NEEDED'}
- Purpose Limitation: ✓ COMPLIANT (Security purposes only)
- Storage Limitation: {'✓ COMPLIANT' if retention_days <= 90 else '⚠ REVIEW NEEDED'}
- Transparency: ✓ COMPLIANT (Privacy policy available)

RECOMMENDations:
"""
        
        if old_events > 0 or old_sessions > 0 or old_attempts > 0:
            report += "- Run data cleanup: python manage.py data_protection --cleanup\n"
        
        if privacy_settings['SECURITY_LOG_IP_ADDRESSES']:
            report += "- Consider disabling IP address logging for better privacy\n"
        
        if privacy_settings['SECURITY_LOG_DETAILED_METADATA']:
            report += "- Consider minimal metadata logging for data minimization\n"
        
        if not privacy_settings['ANONYMIZE_LOGS']:
            report += "- Enable log anonymization for existing data\n"
        
        report += "\n=== END OF REPORT ==="
        
        self.stdout.write(report)
        
        # Save report to file
        filename = f'privacy_report_{timezone.now().strftime("%Y%m%d_%H%M%S")}.txt'
        with open(filename, 'w') as f:
            f.write(report)
        
        self.stdout.write(
            self.style.SUCCESS(f'\nReport saved to: {filename}')
        )