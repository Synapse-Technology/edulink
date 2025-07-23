from django.apps import AppConfig


class SecurityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
<<<<<<< HEAD
    name = 'security'
    verbose_name = 'Security'

    def ready(self):
        """Import signal handlers when the app is ready."""
        try:
            import security.signals  # noqa F401
        except ImportError:
            pass
=======
    name = 'security'
>>>>>>> feature/auth
