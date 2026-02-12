"""
ASGI config for Edulink project.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "edulink.config.settings.dev")

application = get_asgi_application()