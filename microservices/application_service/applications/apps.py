from django.apps import AppConfig

class ApplicationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'applications'
    verbose_name = 'Applications'
    
    def ready(self):
        """Initialize app when Django starts"""
        # Import signal handlers
        try:
            import applications.signals
        except ImportError:
            pass