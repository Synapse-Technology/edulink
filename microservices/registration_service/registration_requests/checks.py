from django.core.checks import Error, Warning, register
from django.conf import settings
import re


def check_verification_settings(app_configs, **kwargs):
    """Check registration and verification settings."""
    errors = []
    
    # Check Kenya verification settings
    errors.extend(check_kenya_verification_settings())
    
    # Check email settings
    errors.extend(check_email_settings())
    
    # Check risk assessment settings
    errors.extend(check_risk_assessment_settings())
    
    # Check workflow settings
    errors.extend(check_workflow_settings())
    
    # Check security settings
    errors.extend(check_security_settings())
    
    return errors


def check_kenya_verification_settings():
    """Check Kenya-specific verification settings."""
    errors = []
    
    # Check CUE API settings
    if not hasattr(settings, 'CUE_API_URL') or not settings.CUE_API_URL:
        errors.append(
            Warning(
                'CUE_API_URL is not configured',
                hint='Set CUE_API_URL in settings for Commission for University Education verification',
                id='registration.W001',
            )
        )
    
    if not hasattr(settings, 'CUE_API_KEY') or not settings.CUE_API_KEY:
        errors.append(
            Warning(
                'CUE_API_KEY is not configured',
                hint='Set CUE_API_KEY in settings for CUE API authentication',
                id='registration.W002',
            )
        )
    
    # Check TVETA API settings
    if not hasattr(settings, 'TVETA_API_URL') or not settings.TVETA_API_URL:
        errors.append(
            Warning(
                'TVETA_API_URL is not configured',
                hint='Set TVETA_API_URL in settings for TVETA verification',
                id='registration.W003',
            )
        )
    
    if not hasattr(settings, 'TVETA_API_KEY') or not settings.TVETA_API_KEY:
        errors.append(
            Warning(
                'TVETA_API_KEY is not configured',
                hint='Set TVETA_API_KEY in settings for TVETA API authentication',
                id='registration.W004',
            )
        )
    
    # Check supported domains
    if hasattr(settings, 'SUPPORTED_KENYAN_DOMAINS'):
        domains = settings.SUPPORTED_KENYAN_DOMAINS
        if not isinstance(domains, list):
            errors.append(
                Error(
                    'SUPPORTED_KENYAN_DOMAINS must be a list',
                    hint='Configure SUPPORTED_KENYAN_DOMAINS as a list of domain strings',
                    id='registration.E001',
                )
            )
        else:
            # Validate domain format
            domain_pattern = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$')
            for domain in domains:
                if not domain_pattern.match(domain):
                    errors.append(
                        Error(
                            f'Invalid domain format: {domain}',
                            hint='Domains should be in format: example.com',
                            id='registration.E002',
                        )
                    )
    
    return errors


def check_email_settings():
    """Check email configuration settings."""
    errors = []
    
    # Check basic email settings
    if not hasattr(settings, 'EMAIL_HOST') or not settings.EMAIL_HOST:
        errors.append(
            Error(
                'EMAIL_HOST is not configured',
                hint='Configure EMAIL_HOST for sending verification emails',
                id='registration.E003',
            )
        )
    
    if not hasattr(settings, 'DEFAULT_FROM_EMAIL') or not settings.DEFAULT_FROM_EMAIL:
        errors.append(
            Warning(
                'DEFAULT_FROM_EMAIL is not configured',
                hint='Set DEFAULT_FROM_EMAIL for registration emails',
                id='registration.W005',
            )
        )
    
    # Check email verification settings
    if hasattr(settings, 'EMAIL_VERIFICATION_EXPIRY_HOURS'):
        expiry_hours = settings.EMAIL_VERIFICATION_EXPIRY_HOURS
        if not isinstance(expiry_hours, int) or expiry_hours <= 0:
            errors.append(
                Error(
                    'EMAIL_VERIFICATION_EXPIRY_HOURS must be a positive integer',
                    hint='Set EMAIL_VERIFICATION_EXPIRY_HOURS to number of hours (e.g., 24)',
                    id='registration.E004',
                )
            )
    
    # Check email template settings
    required_templates = [
        'emails/email_verification.html',
        'emails/registration_approved.html',
        'emails/registration_rejected.html',
    ]
    
    for template in required_templates:
        try:
            from django.template.loader import get_template
            get_template(template)
        except Exception:
            errors.append(
                Warning(
                    f'Email template not found: {template}',
                    hint=f'Create email template at {template}',
                    id='registration.W006',
                )
            )
    
    return errors


def check_risk_assessment_settings():
    """Check risk assessment configuration."""
    errors = []
    
    # Check risk score thresholds
    if hasattr(settings, 'AUTO_APPROVAL_MAX_RISK_SCORE'):
        max_score = settings.AUTO_APPROVAL_MAX_RISK_SCORE
        if not isinstance(max_score, (int, float)) or max_score < 0 or max_score > 100:
            errors.append(
                Error(
                    'AUTO_APPROVAL_MAX_RISK_SCORE must be between 0 and 100',
                    hint='Set AUTO_APPROVAL_MAX_RISK_SCORE to a value between 0-100',
                    id='registration.E005',
                )
            )
    
    if hasattr(settings, 'FAST_TRACK_MAX_RISK_SCORE'):
        fast_track_score = settings.FAST_TRACK_MAX_RISK_SCORE
        if not isinstance(fast_track_score, (int, float)) or fast_track_score < 0 or fast_track_score > 100:
            errors.append(
                Error(
                    'FAST_TRACK_MAX_RISK_SCORE must be between 0 and 100',
                    hint='Set FAST_TRACK_MAX_RISK_SCORE to a value between 0-100',
                    id='registration.E006',
                )
            )
    
    # Check risk factors configuration
    if hasattr(settings, 'RISK_FACTORS'):
        risk_factors = settings.RISK_FACTORS
        if not isinstance(risk_factors, dict):
            errors.append(
                Error(
                    'RISK_FACTORS must be a dictionary',
                    hint='Configure RISK_FACTORS as a dictionary with factor weights',
                    id='registration.E007',
                )
            )
        else:
            # Validate risk factor weights
            for factor, weight in risk_factors.items():
                if not isinstance(weight, (int, float)) or weight < 0:
                    errors.append(
                        Error(
                            f'Risk factor weight for {factor} must be non-negative number',
                            hint='Set risk factor weights to non-negative numbers',
                            id='registration.E008',
                        )
                    )
    
    return errors


def check_workflow_settings():
    """Check workflow configuration settings."""
    errors = []
    
    # Check admin review timeout
    if hasattr(settings, 'ADMIN_REVIEW_TIMEOUT_DAYS'):
        timeout_days = settings.ADMIN_REVIEW_TIMEOUT_DAYS
        if not isinstance(timeout_days, int) or timeout_days <= 0:
            errors.append(
                Error(
                    'ADMIN_REVIEW_TIMEOUT_DAYS must be a positive integer',
                    hint='Set ADMIN_REVIEW_TIMEOUT_DAYS to number of days (e.g., 7)',
                    id='registration.E009',
                )
            )
    
    # Check registration request expiry
    if hasattr(settings, 'REGISTRATION_REQUEST_EXPIRY_DAYS'):
        expiry_days = settings.REGISTRATION_REQUEST_EXPIRY_DAYS
        if not isinstance(expiry_days, int) or expiry_days <= 0:
            errors.append(
                Error(
                    'REGISTRATION_REQUEST_EXPIRY_DAYS must be a positive integer',
                    hint='Set REGISTRATION_REQUEST_EXPIRY_DAYS to number of days (e.g., 30)',
                    id='registration.E010',
                )
            )
    
    # Check review reminder settings
    if hasattr(settings, 'REGISTRATION_REVIEW_REMINDER_DAYS'):
        reminder_days = settings.REGISTRATION_REVIEW_REMINDER_DAYS
        if not isinstance(reminder_days, int) or reminder_days <= 0:
            errors.append(
                Error(
                    'REGISTRATION_REVIEW_REMINDER_DAYS must be a positive integer',
                    hint='Set REGISTRATION_REVIEW_REMINDER_DAYS to number of days (e.g., 3)',
                    id='registration.E011',
                )
            )
    
    return errors


def check_security_settings():
    """Check security-related settings."""
    errors = []
    
    # Check rate limiting settings
    if hasattr(settings, 'REGISTRATION_RATE_LIMIT'):
        rate_limit = settings.REGISTRATION_RATE_LIMIT
        if not isinstance(rate_limit, dict):
            errors.append(
                Error(
                    'REGISTRATION_RATE_LIMIT must be a dictionary',
                    hint='Configure REGISTRATION_RATE_LIMIT with per_ip and per_email limits',
                    id='registration.E012',
                )
            )
        else:
            required_keys = ['per_ip', 'per_email']
            for key in required_keys:
                if key not in rate_limit:
                    errors.append(
                        Error(
                            f'REGISTRATION_RATE_LIMIT missing {key} configuration',
                            hint=f'Add {key} to REGISTRATION_RATE_LIMIT configuration',
                            id='registration.E013',
                        )
                    )
    
    # Check password validation
    if hasattr(settings, 'AUTH_PASSWORD_VALIDATORS'):
        validators = settings.AUTH_PASSWORD_VALIDATORS
        if not validators:
            errors.append(
                Warning(
                    'No password validators configured',
                    hint='Configure AUTH_PASSWORD_VALIDATORS for better security',
                    id='registration.W007',
                )
            )
    
    # Check CSRF settings
    if not getattr(settings, 'CSRF_COOKIE_SECURE', False):
        errors.append(
            Warning(
                'CSRF_COOKIE_SECURE is not enabled',
                hint='Enable CSRF_COOKIE_SECURE for production',
                id='registration.W008',
            )
        )
    
    # Check session security
    if not getattr(settings, 'SESSION_COOKIE_SECURE', False):
        errors.append(
            Warning(
                'SESSION_COOKIE_SECURE is not enabled',
                hint='Enable SESSION_COOKIE_SECURE for production',
                id='registration.W009',
            )
        )
    
    return errors


def check_celery_settings():
    """Check Celery configuration for async tasks."""
    errors = []
    
    # Check if Celery is configured
    if not hasattr(settings, 'CELERY_BROKER_URL') or not settings.CELERY_BROKER_URL:
        errors.append(
            Warning(
                'CELERY_BROKER_URL is not configured',
                hint='Configure Celery for async email sending and task processing',
                id='registration.W010',
            )
        )
    
    # Check task routing
    if hasattr(settings, 'CELERY_TASK_ROUTES'):
        task_routes = settings.CELERY_TASK_ROUTES
        registration_tasks = [
            'registration_requests.tasks.send_verification_email',
            'registration_requests.tasks.send_review_reminder',
            'registration_requests.tasks.cleanup_expired_request',
        ]
        
        for task in registration_tasks:
            if task not in task_routes:
                errors.append(
                    Warning(
                        f'Task routing not configured for {task}',
                        hint='Configure CELERY_TASK_ROUTES for registration tasks',
                        id='registration.W011',
                    )
                )
    
    return errors


def check_database_settings():
    """Check database configuration."""
    errors = []
    
    # Check if database supports JSON fields (for risk_factors, etc.)
    from django.db import connection
    
    if connection.vendor == 'sqlite':
        errors.append(
            Warning(
                'SQLite detected - JSON field support may be limited',
                hint='Consider using PostgreSQL for production',
                id='registration.W012',
            )
        )
    
    # Check database indexes
    # This would require more complex checking of actual database schema
    # For now, we'll just warn about performance considerations
    errors.append(
        Warning(
            'Ensure database indexes are created for registration queries',
            hint='Run migrations and consider adding custom indexes for performance',
            id='registration.W013',
        )
    )
    
    return errors