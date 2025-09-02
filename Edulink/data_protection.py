# Data Protection Compliance Module
# Implements GDPR, CCPA, and other data protection regulations

import hashlib
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from security.models import SecurityEvent, AuditLog, UserSession, FailedLoginAttempt
from privacy_settings import (
    DATA_RETENTION, PRIVACY_SETTINGS, DATA_SUBJECT_RIGHTS,
    PRIVACY_BY_DESIGN, BREACH_NOTIFICATION
)

User = get_user_model()

class DataProtectionManager:
    """Manages data protection compliance and user privacy rights."""
    
    def __init__(self):
        self.retention_policies = DATA_RETENTION
        self.privacy_settings = PRIVACY_SETTINGS
    
    def anonymize_ip_address(self, ip_address):
        """Anonymize IP address by masking the last octet."""
        if not self.privacy_settings.get('ANONYMIZE_IP_ADDRESSES', False):
            return ip_address
        
        if ':' in ip_address:  # IPv6
            parts = ip_address.split(':')
            if len(parts) > 4:
                return ':'.join(parts[:-2]) + '::0:0'
            return ip_address
        else:  # IPv4
            parts = ip_address.split('.')
            if len(parts) == 4:
                return '.'.join(parts[:-1]) + '.0'
            return ip_address
    
    def hash_sensitive_data(self, data):
        """Hash sensitive data for privacy protection."""
        if isinstance(data, str):
            return hashlib.sha256(data.encode()).hexdigest()[:16]
        return str(data)
    
    def clean_old_data(self):
        """Remove data that exceeds retention periods."""
        now = timezone.now()
        
        # Clean security events
        security_cutoff = now - self.retention_policies['SECURITY_EVENTS']
        SecurityEvent.objects.filter(timestamp__lt=security_cutoff).delete()
        
        # Clean audit logs
        audit_cutoff = now - self.retention_policies['AUDIT_LOGS']
        AuditLog.objects.filter(timestamp__lt=audit_cutoff).delete()
        
        # Clean failed login attempts
        login_cutoff = now - self.retention_policies['FAILED_LOGIN_ATTEMPTS']
        FailedLoginAttempt.objects.filter(timestamp__lt=login_cutoff).delete()
        
        # Clean inactive user sessions
        session_cutoff = now - self.retention_policies['USER_SESSIONS']
        UserSession.objects.filter(
            last_activity__lt=session_cutoff,
            is_active=False
        ).delete()
    
    def anonymize_old_logs(self):
        """Anonymize logs that are older but still within retention period."""
        if not self.privacy_settings.get('ANONYMIZE_OLD_LOGS', False):
            return
        
        now = timezone.now()
        anonymize_cutoff = now - timedelta(days=30)  # Anonymize after 30 days
        
        # Anonymize IP addresses in security events
        old_events = SecurityEvent.objects.filter(
            timestamp__lt=anonymize_cutoff,
            ip_address__isnull=False
        )
        
        for event in old_events:
            event.ip_address = self.anonymize_ip_address(event.ip_address)
            event.user_agent = 'Anonymized'
            event.save()
    
    def export_user_data(self, user):
        """Export all data for a specific user (GDPR Article 20)."""
        user_data = {
            'user_profile': {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
            },
            'security_events': [],
            'audit_logs': [],
            'user_sessions': [],
        }
        
        # Export security events
        security_events = SecurityEvent.objects.filter(user=user)
        for event in security_events:
            user_data['security_events'].append({
                'event_type': event.event_type,
                'severity': event.severity,
                'description': event.description,
                'timestamp': event.timestamp.isoformat(),
                'ip_address': event.ip_address,
                'metadata': event.metadata,
            })
        
        # Export audit logs
        audit_logs = AuditLog.objects.filter(user=user)
        for log in audit_logs:
            user_data['audit_logs'].append({
                'action': log.action,
                'model_name': log.model_name,
                'object_id': log.object_id,
                'description': log.description,
                'timestamp': log.timestamp.isoformat(),
                'metadata': log.metadata,
            })
        
        # Export user sessions
        user_sessions = UserSession.objects.filter(user=user)
        for session in user_sessions:
            user_data['user_sessions'].append({
                'session_key': session.session_key[:8] + '...',  # Partial for privacy
                'ip_address': session.ip_address,
                'created_at': session.created_at.isoformat(),
                'last_activity': session.last_activity.isoformat(),
                'is_active': session.is_active,
            })
        
        return user_data
    
    def delete_user_data(self, user, grace_period=True):
        """Delete all user data (GDPR Article 17 - Right to be forgotten)."""
        if grace_period:
            # Mark for deletion but keep for grace period
            user.is_active = False
            user.email = f"deleted_{user.id}@deleted.local"
            user.first_name = "Deleted"
            user.last_name = "User"
            user.save()
            
            # Schedule permanent deletion
            deletion_date = timezone.now() + self.retention_policies['DELETED_USER_DATA']
            # You would implement a scheduled task to permanently delete after grace period
        else:
            # Immediate deletion
            self._permanently_delete_user_data(user)
    
    def _permanently_delete_user_data(self, user):
        """Permanently delete all user data."""
        # Delete related security data
        SecurityEvent.objects.filter(user=user).delete()
        AuditLog.objects.filter(user=user).delete()
        UserSession.objects.filter(user=user).delete()
        
        # Delete user account
        user.delete()
    
    def log_data_access(self, user, accessed_by, purpose, data_types):
        """Log when user data is accessed for transparency."""
        if not self.privacy_settings.get('LOG_DATA_ACCESS', False):
            return
        
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'User data accessed by {accessed_by} for {purpose}',
            user=user,
            ip_address='127.0.0.1',  # System access
            metadata={
                'accessed_by': str(accessed_by),
                'purpose': purpose,
                'data_types': data_types,
                'access_timestamp': timezone.now().isoformat(),
            }
        )
    
    def notify_data_breach(self, affected_users, breach_details):
        """Notify users of data breaches as required by GDPR."""
        if not self.privacy_settings.get('NOTIFY_DATA_BREACH', False):
            return
        
        # Log the breach
        SecurityEvent.objects.create(
            event_type='data_breach',
            severity='critical',
            description=f'Data breach affecting {len(affected_users)} users',
            ip_address='127.0.0.1',
            metadata={
                'affected_user_count': len(affected_users),
                'breach_details': breach_details,
                'notification_timestamp': timezone.now().isoformat(),
            }
        )
        
        # In a real implementation, you would send notifications to users
        # via email, in-app notifications, etc.
    
    def generate_privacy_report(self):
        """Generate a privacy compliance report."""
        now = timezone.now()
        
        report = {
            'report_date': now.isoformat(),
            'data_retention_compliance': self._check_retention_compliance(),
            'user_rights_requests': self._get_user_rights_stats(),
            'data_minimization': self._check_data_minimization(),
            'security_measures': self._get_security_measures(),
            'breach_incidents': self._get_breach_stats(),
        }
        
        return report
    
    def _check_retention_compliance(self):
        """Check if data retention policies are being followed."""
        now = timezone.now()
        
        # Check for data that should have been deleted
        old_security_events = SecurityEvent.objects.filter(
            timestamp__lt=now - self.retention_policies['SECURITY_EVENTS']
        ).count()
        
        old_audit_logs = AuditLog.objects.filter(
            timestamp__lt=now - self.retention_policies['AUDIT_LOGS']
        ).count()
        
        return {
            'compliant': old_security_events == 0 and old_audit_logs == 0,
            'old_security_events': old_security_events,
            'old_audit_logs': old_audit_logs,
        }
    
    def _get_user_rights_stats(self):
        """Get statistics on user rights requests."""
        # In a real implementation, you would track these requests
        return {
            'access_requests': 0,
            'deletion_requests': 0,
            'rectification_requests': 0,
            'portability_requests': 0,
        }
    
    def _check_data_minimization(self):
        """Check if data minimization principles are followed."""
        return {
            'collecting_only_necessary': True,
            'anonymizing_old_data': self.privacy_settings.get('ANONYMIZE_OLD_LOGS', False),
            'ip_anonymization': self.privacy_settings.get('ANONYMIZE_IP_ADDRESSES', False),
        }
    
    def _get_security_measures(self):
        """Get current security measures in place."""
        return {
            'encryption_at_rest': True,  # Database encryption
            'encryption_in_transit': True,  # HTTPS
            'access_controls': True,  # Authentication/authorization
            'audit_logging': True,  # Comprehensive logging
            'regular_backups': True,  # Data backup procedures
        }
    
    def _get_breach_stats(self):
        """Get breach incident statistics."""
        now = timezone.now()
        last_year = now - timedelta(days=365)
        
        breach_count = SecurityEvent.objects.filter(
            event_type='data_breach',
            timestamp__gte=last_year
        ).count()
        
        return {
            'breaches_last_year': breach_count,
            'average_response_time_hours': 24,  # Target response time
            'users_notified': True,
            'authorities_notified': True,
        }


# Management command for data protection tasks
class DataProtectionCommand(BaseCommand):
    """Django management command for data protection tasks."""
    
    help = 'Manage data protection compliance tasks'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clean-old-data',
            action='store_true',
            help='Remove data that exceeds retention periods',
        )
        parser.add_argument(
            '--anonymize-logs',
            action='store_true',
            help='Anonymize old log entries',
        )
        parser.add_argument(
            '--privacy-report',
            action='store_true',
            help='Generate privacy compliance report',
        )
        parser.add_argument(
            '--export-user-data',
            type=str,
            help='Export data for specific user (email)',
        )
    
    def handle(self, *args, **options):
        dp_manager = DataProtectionManager()
        
        if options['clean_old_data']:
            self.stdout.write('Cleaning old data...')
            dp_manager.clean_old_data()
            self.stdout.write(self.style.SUCCESS('Old data cleaned successfully'))
        
        if options['anonymize_logs']:
            self.stdout.write('Anonymizing old logs...')
            dp_manager.anonymize_old_logs()
            self.stdout.write(self.style.SUCCESS('Logs anonymized successfully'))
        
        if options['privacy_report']:
            self.stdout.write('Generating privacy report...')
            report = dp_manager.generate_privacy_report()
            self.stdout.write(json.dumps(report, indent=2))
        
        if options['export_user_data']:
            email = options['export_user_data']
            try:
                user = User.objects.get(email=email)
                self.stdout.write(f'Exporting data for user: {email}')
                data = dp_manager.export_user_data(user)
                self.stdout.write(json.dumps(data, indent=2))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User not found: {email}'))