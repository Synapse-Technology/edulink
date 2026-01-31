from typing import List
from .models import LedgerEvent

def get_events_for_entity(*, entity_id: str, entity_type: str) -> List[LedgerEvent]:
    """
    Retrieve all ledger events for a specific entity.
    """
    return LedgerEvent.objects.filter(entity_id=entity_id, entity_type=entity_type)

def get_recent_ledger_events(*, limit: int = 20):
    """
    Get recent critical system events from the ledger.
    Provides the authoritative audit trail for platform admins.
    """
    return LedgerEvent.objects.all().order_by('-occurred_at')[:limit]

def find_event_by_artifact_id(artifact_id: str) -> LedgerEvent:
    """
    Find the ledger event that recorded the generation of a specific artifact.
    """
    return LedgerEvent.objects.filter(
        payload__artifact_id=artifact_id
    ).first()
