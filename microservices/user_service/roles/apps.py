from django.apps import AppConfig


class RolesConfig(AppConfig):
    """Configuration for the roles app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'roles'
    verbose_name = 'User Roles'
    
    def ready(self):
        """Import signals when the app is ready."""
        import roles.signals