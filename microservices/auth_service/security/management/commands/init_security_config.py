from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import logging

from security.models import SecurityConfiguration

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Initialize security configuration with default values'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing configurations'
        )
        
        parser.add_argument(
            '--list',
            action='store_true',
            help='List current configurations'
        )
    
    def get_default_configurations(self):
        """Get default security configurations."""
        return [
            {
                'key': 'security_event_retention_days',
                'value': '90',
                'data_type': 'integer',
                'description': 'Number of days to retain low/medium severity security events'
            },
            {
                'key': 'critical_event_retention_days',
                'value': '365',
                'data_type': 'integer',
                'description': 'Number of days to retain high/critical severity security events'
            },
            {
                'key': 'audit_log_retention_days',
                'value': '180',
                'data_type': 'integer',
                'description': 'Number of days to retain audit logs'
            },
            {
                'key': 'session_retention_days',
                'value': '30',
                'data_type': 'integer',
                'description': 'Number of days to retain inactive user sessions'
            },
            {
                'key': 'failed_attempt_retention_days',
                'value': '30',
                'data_type': 'integer',
                'description': 'Number of days to retain failed login attempts'
            },
            {
                'key': 'max_login_attempts',
                'value': '5',
                'data_type': 'integer',
                'description': 'Maximum failed login attempts before account lockout'
            },
            {
                'key': 'account_lockout_duration_minutes',
                'value': '30',
                'data_type': 'integer',
                'description': 'Duration in minutes for account lockout'
            },
            {
                'key': 'session_timeout_hours',
                'value': '24',
                'data_type': 'integer',
                'description': 'Session timeout in hours'
            },
            {
                'key': 'password_reset_token_expiry_hours',
                'value': '1',
                'data_type': 'integer',
                'description': 'Password reset token expiry in hours'
            },
            {
                'key': 'email_otp_expiry_minutes',
                'value': '10',
                'data_type': 'integer',
                'description': 'Email OTP expiry in minutes'
            },
            {
                'key': 'refresh_token_expiry_days',
                'value': '30',
                'data_type': 'integer',
                'description': 'Refresh token expiry in days'
            },
            {
                'key': 'access_token_expiry_minutes',
                'value': '15',
                'data_type': 'integer',
                'description': 'Access token expiry in minutes'
            },
            {
                'key': 'enable_brute_force_detection',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable automatic brute force attack detection'
            },
            {
                'key': 'brute_force_threshold',
                'value': '5',
                'data_type': 'integer',
                'description': 'Number of failed attempts to trigger brute force detection'
            },
            {
                'key': 'brute_force_window_minutes',
                'value': '15',
                'data_type': 'integer',
                'description': 'Time window in minutes for brute force detection'
            },
            {
                'key': 'enable_suspicious_activity_detection',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable automatic suspicious activity detection'
            },
            {
                'key': 'unusual_login_ip_threshold',
                'value': '3',
                'data_type': 'integer',
                'description': 'Number of different IPs to trigger unusual login pattern alert'
            },
            {
                'key': 'enable_security_alerts',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable security alert notifications'
            },
            {
                'key': 'high_risk_event_threshold',
                'value': '70',
                'data_type': 'integer',
                'description': 'Risk score threshold for high-risk event alerts'
            },
            {
                'key': 'enable_audit_logging',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable comprehensive audit logging'
            },
            {
                'key': 'enable_session_monitoring',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable user session monitoring'
            },
            {
                'key': 'require_email_verification',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Require email verification for new accounts'
            },
            {
                'key': 'enable_two_factor_auth',
                'value': 'false',
                'data_type': 'boolean',
                'description': 'Enable two-factor authentication support'
            },
            {
                'key': 'force_password_change_days',
                'value': '90',
                'data_type': 'integer',
                'description': 'Force password change after specified days (0 to disable)'
            },
            {
                'key': 'min_password_length',
                'value': '8',
                'data_type': 'integer',
                'description': 'Minimum password length requirement'
            },
            {
                'key': 'require_password_complexity',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Require password complexity (uppercase, lowercase, numbers, symbols)'
            },
            {
                'key': 'enable_ip_whitelist',
                'value': 'false',
                'data_type': 'boolean',
                'description': 'Enable IP address whitelist for admin users'
            },
            {
                'key': 'admin_ip_whitelist',
                'value': '',
                'data_type': 'string',
                'description': 'Comma-separated list of allowed IP addresses for admin users'
            },
            {
                'key': 'enable_geolocation_tracking',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable geolocation tracking for security events'
            },
            {
                'key': 'enable_device_tracking',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable device fingerprinting and tracking'
            },
            {
                'key': 'max_concurrent_sessions',
                'value': '5',
                'data_type': 'integer',
                'description': 'Maximum concurrent sessions per user (0 for unlimited)'
            },
            {
                'key': 'enable_security_headers',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable security headers in HTTP responses'
            },
            {
                'key': 'enable_rate_limiting',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable API rate limiting'
            },
            {
                'key': 'api_rate_limit_per_minute',
                'value': '60',
                'data_type': 'integer',
                'description': 'API requests per minute per user'
            },
            {
                'key': 'login_rate_limit_per_minute',
                'value': '5',
                'data_type': 'integer',
                'description': 'Login attempts per minute per IP'
            },
            {
                'key': 'enable_csrf_protection',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable CSRF protection for state-changing operations'
            },
            {
                'key': 'enable_cors_restrictions',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable CORS restrictions'
            },
            {
                'key': 'allowed_cors_origins',
                'value': '',
                'data_type': 'string',
                'description': 'Comma-separated list of allowed CORS origins'
            },
            {
                'key': 'enable_sql_injection_detection',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable SQL injection attempt detection'
            },
            {
                'key': 'enable_xss_detection',
                'value': 'true',
                'data_type': 'boolean',
                'description': 'Enable XSS attempt detection'
            },
            {
                'key': 'security_scan_interval_hours',
                'value': '6',
                'data_type': 'integer',
                'description': 'Interval in hours for automated security scans'
            },
            {
                'key': 'cleanup_interval_hours',
                'value': '24',
                'data_type': 'integer',
                'description': 'Interval in hours for automated data cleanup'
            },
            {
                'key': 'report_generation_hour',
                'value': '2',
                'data_type': 'integer',
                'description': 'Hour of day (0-23) to generate daily security reports'
            }
        ]
    
    def list_configurations(self):
        """List current configurations."""
        configs = SecurityConfiguration.objects.all().order_by('key')
        
        if not configs.exists():
            self.stdout.write(
                self.style.WARNING('No security configurations found.')
            )
            return
        
        self.stdout.write('\nCurrent Security Configurations:')
        self.stdout.write('=' * 50)
        
        for config in configs:
            self.stdout.write(f'\nKey: {config.key}')
            self.stdout.write(f'Value: {config.value}')
            self.stdout.write(f'Type: {config.data_type}')
            self.stdout.write(f'Description: {config.description}')
            self.stdout.write(f'Updated: {config.updated_at}')
            self.stdout.write('-' * 30)
    
    def handle(self, *args, **options):
        if options['list']:
            self.list_configurations()
            return
        
        force = options['force']
        
        self.stdout.write(
            self.style.SUCCESS('Initializing security configurations...')
        )
        
        try:
            default_configs = self.get_default_configurations()
            created_count = 0
            updated_count = 0
            skipped_count = 0
            
            with transaction.atomic():
                for config_data in default_configs:
                    key = config_data['key']
                    
                    try:
                        existing_config = SecurityConfiguration.objects.get(key=key)
                        
                        if force:
                            # Update existing configuration
                            existing_config.value = config_data['value']
                            existing_config.data_type = config_data['data_type']
                            existing_config.description = config_data['description']
                            existing_config.save()
                            updated_count += 1
                            
                            self.stdout.write(
                                f"Updated: {key}"
                            )
                        else:
                            skipped_count += 1
                            self.stdout.write(
                                f"Skipped (exists): {key}"
                            )
                    
                    except SecurityConfiguration.DoesNotExist:
                        # Create new configuration
                        SecurityConfiguration.objects.create(**config_data)
                        created_count += 1
                        
                        self.stdout.write(
                            f"Created: {key}"
                        )
            
            # Summary
            self.stdout.write('\n' + '=' * 50)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Configuration initialization completed:\n"
                    f"  Created: {created_count}\n"
                    f"  Updated: {updated_count}\n"
                    f"  Skipped: {skipped_count}\n"
                    f"  Total: {len(default_configs)}"
                )
            )
            
            if skipped_count > 0 and not force:
                self.stdout.write(
                    self.style.WARNING(
                        "\nSome configurations already exist. "
                        "Use --force to update existing configurations."
                    )
                )
            
            # Log the initialization
            logger.info(
                f'Security configuration initialized: '
                f'{created_count} created, {updated_count} updated'
            )
            
        except Exception as e:
            logger.error(f'Security configuration initialization failed: {e}')
            raise CommandError(f'Initialization failed: {e}')