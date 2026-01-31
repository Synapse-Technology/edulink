from django.apps import AppConfig


class AdminConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "edulink.apps.platform_admin"
    label = "platform_admin"
    verbose_name = "Platform Admin"
