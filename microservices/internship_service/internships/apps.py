from django.apps import AppConfig

class InternshipsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'internships'
    verbose_name = 'Internships'
    
    def ready(self):
        """Initialize app when Django starts"""
        # Import signal handlers
        try:
            import internships.signals
        except ImportError:
            pass