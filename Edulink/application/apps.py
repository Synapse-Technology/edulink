from django.apps import AppConfig


class ApplicationConfig(AppConfig):
    default_auto_field: str = "django.db.models.BigAutoField"  # type: ignore[assignment]
    name = "application"
