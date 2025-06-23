# Example: applications/apps.py

from django.apps import AppConfig

class InternshipConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'internship'

    def ready(self):
        # Import signals here if your app uses them, 
        # to ensure they are registered when Django starts.
        try:
            import internship.signals
        except ImportError:
            pass # Signals file might not exist yet or on initial setup