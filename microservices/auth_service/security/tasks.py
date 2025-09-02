from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import Count, Q
from datetime import timedelta
import logging
import requests
import json

from .models import (
    SecurityEvent,
    AuditLog,
    UserSession,
    FailedLoginAttempt,
    SecurityConfiguration,
    SecurityEventType,
    SeverityLevel
)

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_security_alert(self, event_id, alert_type='email'):
    """Send security alerts for high-risk events."""
    try:
        event = SecurityEvent.objects.get(id=event_id)
        
        # Prepare alert data
        alert_data = {
            'event_type': event.event_type,
            'severity': event.severity,
            'description': event.description,
            'user_email': event.user.email if event.user else event.user_email,
            'ip_address': event.ip_address,
            'timestamp': event.timestamp.isoformat(),
            'risk_score': event.risk_score,
            'metadata': event.metadata
        }
        
        if alert_type == 'email':
            # Send email alert to security team
            security_emails = getattr(settings, 'SECURITY_ALERT_EMAILS', [])
            if security_emails:
                # Queue email task
                from authentication.tasks import send_email_task
                send_email_task.delay(
                    template_name='security_alert',
                    to_emails=security_emails,
                    context=alert_data,
                    subject=f'Security Alert: {event.get_event_type_display()}'
                )
        
        elif alert_type == 'webhook':
            # Send webhook notification
            webhook_url = getattr(settings, 'SECURITY_WEBHOOK_URL', None)
            if webhook_url:
                response = requests.post(
                    webhook_url,
                    json=alert_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                response.raise_for_status()
        
        # Update event notification status
        event.notification_sent = True
        event.save(update_fields=['notification_sent'])
        
        logger.info(f"Security alert sent for event {event_id}")
        return f"Alert sent successfully for event {event_id}"
        
    except SecurityEvent.DoesNotExist:
        logger.error(f"Security event {event_id} not found")
        return f"Event {event_id} not found"
    
    except Exception as exc:
        logger.error(f"Failed to send security alert for event {event_id}: {exc}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        return f"Failed to send alert after {self.max_retries} retries"


@shared_task
def cleanup_old_security_events():
    """Clean up old security events based on retention policy."""
    try:
        # Get retention period from configuration
        retention_days = SecurityConfiguration.get_value(
            'security_event_retention_days', 
            default=90
        )
        
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        # Delete old events (keep critical events longer)
        deleted_count = SecurityEvent.objects.filter(
            timestamp__lt=cutoff_date,
            severity__in=[SeverityLevel.LOW, SeverityLevel.MEDIUM]
        ).delete()[0]
        
        # Keep critical and high severity events longer
        critical_retention_days = SecurityConfiguration.get_value(
            'critical_event_retention_days',
            default=365
        )
        critical_cutoff_date = timezone.now() - timedelta(days=critical_retention_days)
        
        critical_deleted_count = SecurityEvent.objects.filter(
            timestamp__lt=critical_cutoff_date,
            severity__in=[SeverityLevel.HIGH, SeverityLevel.CRITICAL]
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old security events and {critical_deleted_count} critical events")
        return f"Cleaned up {deleted_count + critical_deleted_count} security events"
        
    except Exception as exc:
        logger.error(f"Failed to cleanup security events: {exc}")
        return f"Cleanup failed: {exc}"


@shared_task
def cleanup_old_audit_logs():
    """Clean up old audit logs based on retention policy."""
    try:
        retention_days = SecurityConfiguration.get_value(
            'audit_log_retention_days',
            default=180
        )
        
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        deleted_count = AuditLog.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old audit logs")
        return f"Cleaned up {deleted_count} audit logs"
        
    except Exception as exc:
        logger.error(f"Failed to cleanup audit logs: {exc}")
        return f"Cleanup failed: {exc}"


@shared_task
def cleanup_expired_sessions():
    """Clean up expired user sessions."""
    try:
        now = timezone.now()
        
        # Mark expired sessions as inactive
        expired_count = UserSession.objects.filter(
            expires_at__lt=now,
            is_active=True
        ).update(
            is_active=False,
            logout_reason='session_expired'
        )
        
        # Delete old inactive sessions
        session_retention_days = SecurityConfiguration.get_value(
            'session_retention_days',
            default=30
        )
        
        cutoff_date = now - timedelta(days=session_retention_days)
        
        deleted_count = UserSession.objects.filter(
            expires_at__lt=cutoff_date,
            is_active=False
        ).delete()[0]
        
        logger.info(f"Expired {expired_count} sessions and deleted {deleted_count} old sessions")
        return f"Processed {expired_count + deleted_count} sessions"
        
    except Exception as exc:
        logger.error(f"Failed to cleanup sessions: {exc}")
        return f"Session cleanup failed: {exc}"


@shared_task
def cleanup_old_failed_attempts():
    """Clean up old failed login attempts."""
    try:
        retention_days = SecurityConfiguration.get_value(
            'failed_attempt_retention_days',
            default=30
        )
        
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        deleted_count = FailedLoginAttempt.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old failed login attempts")
        return f"Cleaned up {deleted_count} failed attempts"
        
    except Exception as exc:
        logger.error(f"Failed to cleanup failed attempts: {exc}")
        return f"Cleanup failed: {exc}"


@shared_task
def detect_suspicious_activity():
    """Detect and flag suspicious activity patterns."""
    try:
        now = timezone.now()
        last_hour = now - timedelta(hours=1)
        last_24_hours = now - timedelta(hours=24)
        
        suspicious_events = []
        
        # Detect multiple failed logins from same IP
        failed_login_ips = FailedLoginAttempt.objects.filter(
            timestamp__gte=last_hour
        ).values('ip_address').annotate(
            count=Count('id')
        ).filter(count__gte=5)
        
        for ip_data in failed_login_ips:
            ip_address = ip_data['ip_address']
            count = ip_data['count']
            
            # Check if already reported recently
            recent_event = SecurityEvent.objects.filter(
                event_type=SecurityEventType.BRUTE_FORCE_ATTEMPT,
                ip_address=ip_address,
                timestamp__gte=last_hour
            ).exists()
            
            if not recent_event:
                event = SecurityEvent.objects.create(
                    event_type=SecurityEventType.BRUTE_FORCE_ATTEMPT,
                    severity=SeverityLevel.HIGH,
                    description=f"Brute force attack detected from IP {ip_address} ({count} attempts in 1 hour)",
                    ip_address=ip_address,
                    metadata={
                        'attempt_count': count,
                        'time_window': '1_hour',
                        'detection_type': 'automated'
                    },
                    service_name='auth_service'
                )
                suspicious_events.append(event.id)
        
        # Detect unusual login patterns
        users_with_multiple_ips = UserSession.objects.filter(
            created_at__gte=last_24_hours,
            is_active=True
        ).values('user').annotate(
            ip_count=Count('ip_address', distinct=True)
        ).filter(ip_count__gte=3)
        
        for user_data in users_with_multiple_ips:
            user_id = user_data['user']
            ip_count = user_data['ip_count']
            
            try:
                user = User.objects.get(id=user_id)
                
                # Check if already reported recently
                recent_event = SecurityEvent.objects.filter(
                    event_type=SecurityEventType.UNUSUAL_LOGIN_PATTERN,
                    user=user,
                    timestamp__gte=last_24_hours
                ).exists()
                
                if not recent_event:
                    event = SecurityEvent.objects.create(
                        event_type=SecurityEventType.UNUSUAL_LOGIN_PATTERN,
                        user=user,
                        severity=SeverityLevel.MEDIUM,
                        description=f"Unusual login pattern: {ip_count} different IPs in 24 hours",
                        metadata={
                            'ip_count': ip_count,
                            'time_window': '24_hours',
                            'detection_type': 'automated'
                        },
                        service_name='auth_service'
                    )
                    suspicious_events.append(event.id)
            
            except User.DoesNotExist:
                continue
        
        # Detect privilege escalation attempts
        role_changes = AuditLog.objects.filter(
            timestamp__gte=last_24_hours,
            action='update',
            resource_type='User',
            changes__has_key='role'
        )
        
        for log in role_changes:
            if 'role' in log.changes:
                old_role = log.changes['role'].get('from')
                new_role = log.changes['role'].get('to')
                
                # Check for privilege escalation
                role_hierarchy = ['student', 'employer', 'institution_admin', 'super_admin']
                
                try:
                    old_level = role_hierarchy.index(old_role)
                    new_level = role_hierarchy.index(new_role)
                    
                    if new_level > old_level:
                        event = SecurityEvent.objects.create(
                            event_type=SecurityEventType.PRIVILEGE_ESCALATION,
                            user=log.user,
                            severity=SeverityLevel.HIGH,
                            description=f"Privilege escalation detected: {old_role} -> {new_role}",
                            metadata={
                                'old_role': old_role,
                                'new_role': new_role,
                                'audit_log_id': str(log.id),
                                'detection_type': 'automated'
                            },
                            service_name='auth_service'
                        )
                        suspicious_events.append(event.id)
                
                except ValueError:
                    # Unknown role, skip
                    continue
        
        # Send alerts for detected events
        for event_id in suspicious_events:
            send_security_alert.delay(event_id)
        
        logger.info(f"Detected {len(suspicious_events)} suspicious activities")
        return f"Detected {len(suspicious_events)} suspicious activities"
        
    except Exception as exc:
        logger.error(f"Failed to detect suspicious activity: {exc}")
        return f"Detection failed: {exc}"


@shared_task
def generate_security_report():
    """Generate daily security report."""
    try:
        now = timezone.now()
        yesterday = now - timedelta(days=1)
        
        # Collect metrics
        total_events = SecurityEvent.objects.filter(
            timestamp__gte=yesterday
        ).count()
        
        events_by_severity = SecurityEvent.objects.filter(
            timestamp__gte=yesterday
        ).values('severity').annotate(count=Count('id'))
        
        events_by_type = SecurityEvent.objects.filter(
            timestamp__gte=yesterday
        ).values('event_type').annotate(count=Count('id')).order_by('-count')[:10]
        
        failed_logins = FailedLoginAttempt.objects.filter(
            timestamp__gte=yesterday
        ).count()
        
        successful_logins = SecurityEvent.objects.filter(
            timestamp__gte=yesterday,
            event_type=SecurityEventType.LOGIN_SUCCESS
        ).count()
        
        new_users = SecurityEvent.objects.filter(
            timestamp__gte=yesterday,
            event_type=SecurityEventType.USER_CREATED
        ).count()
        
        locked_accounts = SecurityEvent.objects.filter(
            timestamp__gte=yesterday,
            event_type=SecurityEventType.ACCOUNT_LOCKED
        ).count()
        
        high_risk_events = SecurityEvent.objects.filter(
            timestamp__gte=yesterday,
            severity__in=[SeverityLevel.HIGH, SeverityLevel.CRITICAL]
        ).count()
        
        # Top IPs by failed attempts
        top_failed_ips = FailedLoginAttempt.objects.filter(
            timestamp__gte=yesterday
        ).values('ip_address').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Active sessions
        active_sessions = UserSession.objects.filter(
            is_active=True
        ).count()
        
        report_data = {
            'date': yesterday.date().isoformat(),
            'total_events': total_events,
            'events_by_severity': {item['severity']: item['count'] for item in events_by_severity},
            'events_by_type': {item['event_type']: item['count'] for item in events_by_type},
            'authentication': {
                'successful_logins': successful_logins,
                'failed_logins': failed_logins,
                'new_users': new_users,
                'locked_accounts': locked_accounts
            },
            'security': {
                'high_risk_events': high_risk_events,
                'top_failed_ips': list(top_failed_ips)
            },
            'sessions': {
                'active_sessions': active_sessions
            }
        }
        
        # Send report to monitoring service
        monitoring_url = getattr(settings, 'MONITORING_WEBHOOK_URL', None)
        if monitoring_url:
            try:
                response = requests.post(
                    monitoring_url,
                    json={
                        'service': 'auth_service',
                        'report_type': 'security_daily',
                        'data': report_data
                    },
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                response.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to send report to monitoring service: {e}")
        
        # Email report to security team
        security_emails = getattr(settings, 'SECURITY_REPORT_EMAILS', [])
        if security_emails:
            from authentication.tasks import send_email_task
            send_email_task.delay(
                template_name='security_daily_report',
                to_emails=security_emails,
                context=report_data,
                subject=f'Daily Security Report - {yesterday.date()}'
            )
        
        logger.info(f"Generated security report for {yesterday.date()}")
        return f"Security report generated for {yesterday.date()}"
        
    except Exception as exc:
        logger.error(f"Failed to generate security report: {exc}")
        return f"Report generation failed: {exc}"


@shared_task
def update_risk_scores():
    """Update risk scores for recent security events."""
    try:
        # Update risk scores for events from last 24 hours
        recent_events = SecurityEvent.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24),
            status='open'
        )
        
        updated_count = 0
        for event in recent_events:
            old_score = event.risk_score
            event.calculate_risk_score()
            
            if event.risk_score != old_score:
                event.save(update_fields=['risk_score'])
                updated_count += 1
                
                # Send alert if risk score increased significantly
                if event.risk_score >= 70 and old_score < 70:
                    send_security_alert.delay(event.id)
        
        logger.info(f"Updated risk scores for {updated_count} events")
        return f"Updated {updated_count} risk scores"
        
    except Exception as exc:
        logger.error(f"Failed to update risk scores: {exc}")
        return f"Risk score update failed: {exc}"


@shared_task
def sync_security_config():
    """Sync security configuration with external systems."""
    try:
        # This could sync with external security management systems
        # For now, just validate and update local configurations
        
        configs = SecurityConfiguration.objects.all()
        updated_count = 0
        
        for config in configs:
            # Validate configuration values
            if config.data_type == 'integer':
                try:
                    int(config.value)
                except ValueError:
                    logger.warning(f"Invalid integer value for {config.key}: {config.value}")
                    continue
            
            elif config.data_type == 'boolean':
                if config.value.lower() not in ['true', 'false']:
                    logger.warning(f"Invalid boolean value for {config.key}: {config.value}")
                    continue
            
            # Update last_updated timestamp
            config.updated_at = timezone.now()
            config.save(update_fields=['updated_at'])
            updated_count += 1
        
        logger.info(f"Synced {updated_count} security configurations")
        return f"Synced {updated_count} configurations"
        
    except Exception as exc:
        logger.error(f"Failed to sync security config: {exc}")
        return f"Config sync failed: {exc}"


@shared_task
def monitor_system_health():
    """Monitor security system health and performance."""
    try:
        now = timezone.now()
        last_hour = now - timedelta(hours=1)
        
        # Check event processing rate
        recent_events = SecurityEvent.objects.filter(
            timestamp__gte=last_hour
        ).count()
        
        # Check for stuck events
        stuck_events = SecurityEvent.objects.filter(
            status='investigating',
            timestamp__lt=now - timedelta(days=7)
        ).count()
        
        # Check failed login rate
        failed_logins = FailedLoginAttempt.objects.filter(
            timestamp__gte=last_hour
        ).count()
        
        # Check active sessions
        active_sessions = UserSession.objects.filter(
            is_active=True
        ).count()
        
        # Check database performance (simplified)
        import time
        start_time = time.time()
        SecurityEvent.objects.filter(timestamp__gte=last_hour).count()
        query_time = time.time() - start_time
        
        health_data = {
            'timestamp': now.isoformat(),
            'metrics': {
                'events_last_hour': recent_events,
                'stuck_events': stuck_events,
                'failed_logins_last_hour': failed_logins,
                'active_sessions': active_sessions,
                'db_query_time': round(query_time, 3)
            },
            'status': 'healthy'
        }
        
        # Determine health status
        if stuck_events > 10 or query_time > 5.0:
            health_data['status'] = 'degraded'
        
        if stuck_events > 50 or query_time > 10.0 or failed_logins > 1000:
            health_data['status'] = 'unhealthy'
        
        # Send health data to monitoring
        monitoring_url = getattr(settings, 'HEALTH_MONITORING_URL', None)
        if monitoring_url:
            try:
                response = requests.post(
                    monitoring_url,
                    json={
                        'service': 'auth_service_security',
                        'health_data': health_data
                    },
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                response.raise_for_status()
            except Exception as e:
                logger.error(f"Failed to send health data: {e}")
        
        logger.info(f"System health check completed: {health_data['status']}")
        return f"Health check completed: {health_data['status']}"
        
    except Exception as exc:
        logger.error(f"Health monitoring failed: {exc}")
        return f"Health monitoring failed: {exc}"