from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)

class SecurityEventMiddleware(MiddlewareMixin):
    """
    Middleware to handle security events and logging.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def __call__(self, request):
        response = self.get_response(request)
        return response
    
    def process_request(self, request):
        # Log security-related request information
        if hasattr(request, 'user') and request.user.is_authenticated:
            logger.info(f"Authenticated request from user {request.user.id} to {request.path}")
        return None

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    logger.info(f"User {user.username} logged in from {request.META.get('REMOTE_ADDR')}")

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    if user:
        logger.info(f"User {user.username} logged out")

@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    logger.warning(f"Failed login attempt for {credentials.get('username')} from {request.META.get('REMOTE_ADDR')}")