from django.apps import AppConfig
from django.db.models.signals import post_migrate
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Global flag to control audit logging
_audit_logging_enabled = False


def enable_audit_logging(sender, **kwargs):
    """Enable audit logging after migrations complete successfully."""
    global _audit_logging_enabled
    _audit_logging_enabled = True
    logger.info("Migrations completed successfully. Audit logging enabled.")


def is_audit_logging_enabled():
    """Check if audit logging is currently enabled."""
    global _audit_logging_enabled
    return _audit_logging_enabled


class SecurityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'security'
    verbose_name = 'Security'

    def ready(self):
        """Import signal handlers and setup post-migrate signal."""
        # Connect post_migrate signal to enable audit logging
        post_migrate.connect(enable_audit_logging, sender=self)
        
        # Import other signal handlers
        try:
            import security.signals  # noqa F401
        except ImportError:
            pass
        
        # Enable audit logging immediately if not in migration context
        # This handles cases where the app starts without running migrations
        if not self._is_migration_context():
            global _audit_logging_enabled
            _audit_logging_enabled = True
            logger.info("Security app ready. Audit logging enabled (no migration context detected).")
    
    def _is_migration_context(self):
        """Check if we're currently in a migration context."""
        import sys
        if len(sys.argv) >= 2:
            command = sys.argv[1]
            migration_commands = ['migrate', 'makemigrations', 'showmigrations', 'sqlmigrate']
            return command in migration_commands
        return False
