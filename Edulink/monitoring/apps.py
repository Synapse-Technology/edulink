from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    """Configuration for the monitoring app"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'monitoring'
    verbose_name = 'System Monitoring'
    
    def ready(self):
        """Initialize monitoring when Django starts"""
        # Import signal handlers
        try:
            from . import signals
        except ImportError:
            pass
        
        # Initialize monitoring configuration
        try:
            from .models import MonitoringConfiguration
            # Ensure default configuration exists
            MonitoringConfiguration.get_current()
        except Exception:
            # Don't fail if database isn't ready yet
            pass