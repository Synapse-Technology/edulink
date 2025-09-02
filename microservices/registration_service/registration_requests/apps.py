from django.apps import AppConfig


class RegistrationRequestsConfig(AppConfig):
    """Configuration for the registration_requests app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'registration_requests'
    verbose_name = 'Registration Requests'
    
    def ready(self):
        """Import signal handlers when the app is ready."""
        try:
            import registration_requests.signals  # noqa F401
        except ImportError:
            pass
        
        # Register any custom checks
        from django.core.checks import register
        from .checks import check_verification_settings
        
        register(check_verification_settings, 'registration')