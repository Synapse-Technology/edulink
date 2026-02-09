import pusher
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def get_pusher_client():
    """
    Initialize and return the Pusher client.
    """
    try:
        return pusher.Pusher(
            app_id=settings.PUSHER_APP_ID,
            key=settings.PUSHER_KEY,
            secret=settings.PUSHER_SECRET,
            cluster=settings.PUSHER_CLUSTER,
            ssl=settings.PUSHER_SSL
        )
    except Exception as e:
        logger.error(f"Failed to initialize Pusher client: {e}")
        return None

def trigger_pusher_event(channel, event_name, data):
    """
    Trigger a Pusher event on a specific channel.
    """
    client = get_pusher_client()
    if client:
        try:
            client.trigger(channel, event_name, data)
            logger.info(f"Pusher event '{event_name}' triggered on channel '{channel}'")
        except Exception as e:
            logger.error(f"Failed to trigger Pusher event: {e}")
