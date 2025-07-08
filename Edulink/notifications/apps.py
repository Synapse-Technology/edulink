from django.apps import AppConfig


class NotificationConfig(AppConfig):
    default_auto_field: str = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        # Import signals here if you are using them
        pass
