from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analytics'
    
    def ready(self):
        """Initialize analytics services when Django starts"""
        try:
            # Import signals to register them
            from . import signals
            
            from .services import RealTimeAnalyticsService
            # Initialize the real-time analytics service
            RealTimeAnalyticsService.initialize()
        except Exception as e:
            # Don't fail startup if analytics initialization fails
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to initialize analytics service: {e}")