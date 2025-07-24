from django.apps import AppConfig


class InternshipProgressConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "internship_progress"
    
    def ready(self):
        """Import signals when the app is ready."""
        import internship_progress.signals
