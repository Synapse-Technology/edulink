from django.apps import AppConfig


class SecurityConfig(AppConfig):
    """Configuration for the security app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'security'
    verbose_name = 'Security'
    
    def ready(self):
        """Import signal handlers when the app is ready."""
        import security.signals  # noqa