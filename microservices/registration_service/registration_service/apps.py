from django.apps import AppConfig


class RegistrationServiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'registration_service'
    verbose_name = 'Registration Service'
    
    def ready(self):
        """Initialize service when Django starts."""
        # Import signal handlers
        try:
            from . import signals  # noqa
        except ImportError:
            pass
        
        # Import database signals to ensure search_path is set
        try:
            from . import db_signals  # noqa
        except ImportError:
            pass