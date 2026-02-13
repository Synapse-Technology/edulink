from typing import List, Optional
from django.db import models
from .models import LedgerEvent

def get_ledger_queryset():
    """
    Returns the base queryset for ledger events.
    """
    return LedgerEvent.objects.all().order_by('-occurred_at')

def get_filtered_ledger_queryset(*, actor_id: str = None, entity_id: str = None, search: str = None):
    """
    Returns a filtered queryset for ledger events.
    """
    queryset = get_ledger_queryset()
    if actor_id:
        queryset = queryset.filter(actor_id=actor_id)
    if entity_id:
        queryset = queryset.filter(entity_id=entity_id)
    if search:
        queryset = queryset.filter(
            models.Q(event_type__icontains=search) |
            models.Q(entity_type__icontains=search) |
            models.Q(payload__icontains=search)
        )
    return queryset

def get_events_for_user_context(*, profile_id: str):
    """
    Returns events related to a specific profile ID (as actor or entity).
    Used by students and employers to see their own audit trail.
    """
    return LedgerEvent.objects.filter(
        models.Q(actor_id=profile_id) | 
        models.Q(entity_id=profile_id) |
        models.Q(payload__icontains=profile_id)
    ).order_by('-occurred_at')

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
