from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from monitoring.models import SystemHealthCheck, SystemAlert, MonitoringConfiguration
from monitoring.views import DetailedHealthCheckView
import logging
import json

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run automated system monitoring and health checks'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--check-alerts',
            action='store_true',
            help='Check and process system alerts',
        )
        parser.add_argument(
            '--send-notifications',
            action='store_true',
            help='Send email notifications for critical alerts',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up old monitoring data based on retention settings',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting automated monitoring...'))
        
        # Get monitoring configuration
        config = MonitoringConfiguration.objects.first()
        if not config:
            config = MonitoringConfiguration.objects.create()
            self.stdout.write(self.style.WARNING('Created default monitoring configuration'))
        
        # Run health check if enabled
        if config.health_check_enabled:
            self.run_health_check()
        
        # Check alerts if requested
        if options['check_alerts']:
            self.check_alerts(config)
        
        # Send notifications if requested
        if options['send_notifications']:
            self.send_notifications(config)
        
        # Cleanup old data if requested
        if options['cleanup']:
            self.cleanup_old_data(config)
        
        self.stdout.write(self.style.SUCCESS('Monitoring completed successfully'))
    
    def run_health_check(self):
        """Run detailed health check"""
        try:
            self.stdout.write('Running health check...')
            
            # Create a mock request for the health check view
            from django.test import RequestFactory
            factory = RequestFactory()
            request = factory.get('/monitoring/health/detailed/')
            
            # Run the health check
            health_view = DetailedHealthCheckView()
            response = health_view.get(request)
            
            if response.status_code == 200:
                data = json.loads(response.content)
                self.stdout.write(self.style.SUCCESS(f"Health check completed: {data.get('overall_status', 'unknown')}"))
                
                # Check if we need to create alerts
                self.check_health_thresholds(data)
            else:
                self.stdout.write(self.style.ERROR('Health check failed'))
                
        except Exception as e:
            logger.error(f'Error running health check: {str(e)}')
            self.stdout.write(self.style.ERROR(f'Health check error: {str(e)}'))
    
    def check_health_thresholds(self, health_data):
        """Check health data against configured thresholds and create alerts"""
        config = MonitoringConfiguration.objects.first()
        if not config or not config.alerts_enabled:
            return
        
        # Check CPU usage
        cpu_usage = health_data.get('cpu_usage')
        if cpu_usage and cpu_usage > config.cpu_critical_threshold:
            self.create_alert(
                'critical',
                'High CPU Usage',
                f'CPU usage is {cpu_usage:.1f}%, exceeding critical threshold of {config.cpu_critical_threshold}%',
                'cpu_high'
            )
        elif cpu_usage and cpu_usage > config.cpu_warning_threshold:
            self.create_alert(
                'warning',
                'CPU Usage Warning',
                f'CPU usage is {cpu_usage:.1f}%, exceeding warning threshold of {config.cpu_warning_threshold}%',
                'cpu_warning'
            )
        
        # Check Memory usage
        memory_usage = health_data.get('memory_usage')
        if memory_usage and memory_usage > config.memory_critical_threshold:
            self.create_alert(
                'critical',
                'High Memory Usage',
                f'Memory usage is {memory_usage:.1f}%, exceeding critical threshold of {config.memory_critical_threshold}%',
                'memory_high'
            )
        elif memory_usage and memory_usage > config.memory_warning_threshold:
            self.create_alert(
                'warning',
                'Memory Usage Warning',
                f'Memory usage is {memory_usage:.1f}%, exceeding warning threshold of {config.memory_warning_threshold}%',
                'memory_warning'
            )
        
        # Check Disk usage
        disk_usage = health_data.get('disk_usage')
        if disk_usage and disk_usage > config.disk_critical_threshold:
            self.create_alert(
                'critical',
                'High Disk Usage',
                f'Disk usage is {disk_usage:.1f}%, exceeding critical threshold of {config.disk_critical_threshold}%',
                'disk_high'
            )
        elif disk_usage and disk_usage > config.disk_warning_threshold:
            self.create_alert(
                'warning',
                'Disk Usage Warning',
                f'Disk usage is {disk_usage:.1f}%, exceeding warning threshold of {config.disk_warning_threshold}%',
                'disk_warning'
            )
        
        # Check database and cache status
        if health_data.get('database_status') != 'healthy':
            self.create_alert(
                'critical',
                'Database Connection Issue',
                'Database connection is not healthy',
                'database_error'
            )
        
        if health_data.get('cache_status') != 'healthy':
            self.create_alert(
                'warning',
                'Cache Connection Issue',
                'Cache connection is not healthy',
                'cache_error'
            )
    
    def create_alert(self, severity, title, message, alert_type):
        """Create a system alert if it doesn't already exist"""
        # Check if similar alert already exists and is active
        existing_alert = SystemAlert.objects.filter(
            alert_type=alert_type,
            status__in=['active', 'acknowledged'],
            timestamp__gte=timezone.now() - timezone.timedelta(hours=1)
        ).first()
        
        if not existing_alert:
            alert = SystemAlert.objects.create(
                severity=severity,
                title=title,
                message=message,
                alert_type=alert_type,
                status='active'
            )
            self.stdout.write(self.style.WARNING(f'Created {severity} alert: {title}'))
            logger.warning(f'System alert created: {title} - {message}')
            return alert
        
        return existing_alert
    
    def check_alerts(self, config):
        """Check and process system alerts"""
        if not config.alerts_enabled:
            return
        
        active_alerts = SystemAlert.objects.filter(status='active')
        self.stdout.write(f'Found {active_alerts.count()} active alerts')
        
        for alert in active_alerts:
            # Auto-resolve alerts older than 24 hours if conditions are met
            if alert.timestamp < timezone.now() - timezone.timedelta(hours=24):
                # Check if the condition that caused the alert is still present
                if self.should_auto_resolve_alert(alert):
                    alert.status = 'resolved'
                    alert.resolved_at = timezone.now()
                    alert.resolution_notes = 'Auto-resolved: condition no longer present'
                    alert.save()
                    self.stdout.write(self.style.SUCCESS(f'Auto-resolved alert: {alert.title}'))
    
    def should_auto_resolve_alert(self, alert):
        """Check if an alert should be auto-resolved"""
        # Get latest health check
        latest_health = SystemHealthCheck.objects.order_by('-timestamp').first()
        if not latest_health:
            return False
        
        config = MonitoringConfiguration.objects.first()
        if not config:
            return False
        
        # Check if the condition that caused the alert is resolved
        if alert.alert_type == 'cpu_high' and latest_health.cpu_usage:
            return latest_health.cpu_usage < config.cpu_critical_threshold
        elif alert.alert_type == 'cpu_warning' and latest_health.cpu_usage:
            return latest_health.cpu_usage < config.cpu_warning_threshold
        elif alert.alert_type == 'memory_high' and latest_health.memory_usage:
            return latest_health.memory_usage < config.memory_critical_threshold
        elif alert.alert_type == 'memory_warning' and latest_health.memory_usage:
            return latest_health.memory_usage < config.memory_warning_threshold
        elif alert.alert_type == 'disk_high' and latest_health.disk_usage:
            return latest_health.disk_usage < config.disk_critical_threshold
        elif alert.alert_type == 'disk_warning' and latest_health.disk_usage:
            return latest_health.disk_usage < config.disk_warning_threshold
        elif alert.alert_type == 'database_error':
            return latest_health.database_status == 'healthy'
        elif alert.alert_type == 'cache_error':
            return latest_health.cache_status == 'healthy'
        
        return False
    
    def send_notifications(self, config):
        """Send email notifications for critical alerts"""
        if not config.email_notifications or not hasattr(settings, 'EMAIL_HOST'):
            return
        
        # Get unnotified critical alerts
        critical_alerts = SystemAlert.objects.filter(
            severity='critical',
            status='active',
            notification_sent=False
        )
        
        if not critical_alerts.exists():
            return
        
        # Prepare email content
        subject = f'[CRITICAL] System Alerts - {len(critical_alerts)} active'
        message_lines = [
            'Critical system alerts have been detected:',
            ''
        ]
        
        for alert in critical_alerts:
            message_lines.extend([
                f'Alert: {alert.title}',
                f'Severity: {alert.severity.upper()}',
                f'Time: {alert.timestamp.strftime("%Y-%m-%d %H:%M:%S")}',
                f'Message: {alert.message}',
                ''
            ])
        
        message_lines.append('Please check the admin dashboard for more details.')
        message = '\n'.join(message_lines)
        
        try:
            # Send email to admins
            admin_emails = [admin[1] for admin in getattr(settings, 'ADMINS', [])]
            if admin_emails:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    admin_emails,
                    fail_silently=False
                )
                
                # Mark alerts as notified
                critical_alerts.update(notification_sent=True)
                self.stdout.write(self.style.SUCCESS(f'Sent notifications for {len(critical_alerts)} critical alerts'))
            else:
                self.stdout.write(self.style.WARNING('No admin emails configured for notifications'))
                
        except Exception as e:
            logger.error(f'Error sending email notifications: {str(e)}')
            self.stdout.write(self.style.ERROR(f'Failed to send notifications: {str(e)}'))
    
    def cleanup_old_data(self, config):
        """Clean up old monitoring data based on retention settings"""
        retention_days = config.metrics_retention_days
        cutoff_date = timezone.now() - timezone.timedelta(days=retention_days)
        
        # Clean up old health checks
        old_health_checks = SystemHealthCheck.objects.filter(timestamp__lt=cutoff_date)
        health_count = old_health_checks.count()
        old_health_checks.delete()
        
        # Clean up old API metrics
        from monitoring.models import APIMetrics
        old_api_metrics = APIMetrics.objects.filter(timestamp__lt=cutoff_date)
        api_count = old_api_metrics.count()
        old_api_metrics.delete()
        
        # Clean up resolved alerts older than retention period
        old_alerts = SystemAlert.objects.filter(
            status='resolved',
            resolved_at__lt=cutoff_date
        )
        alert_count = old_alerts.count()
        old_alerts.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Cleaned up old data: {health_count} health checks, '
                f'{api_count} API metrics, {alert_count} resolved alerts'
            )
        )