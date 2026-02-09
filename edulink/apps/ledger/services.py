from typing import Any, Dict
from uuid import UUID
from django.db import transaction
from django_q.tasks import async_task
from .models import LedgerEvent

def record_event(
    *,
    event_type: str,
    entity_id: UUID,
    entity_type: str,
    actor_id: Any = None,
    actor_role: str = None,
    payload: Dict[str, Any] = None
) -> None:
    """
    Asynchronously records an immutable event in the ledger using Django Q.
    Ensures the task is only enqueued after the current transaction commits.
    """
    # Create a wrapper to capture arguments
    def enqueue():
        async_task(
            'edulink.apps.ledger.services._record_event_sync',
            event_type=event_type,
            entity_id=entity_id,
            entity_type=entity_type,
            actor_id=actor_id,
            actor_role=actor_role,
            payload=payload
        )
    
    transaction.on_commit(enqueue)

def _record_event_sync(
    *,
    event_type: str,
    entity_id: UUID,
    entity_type: str,
    actor_id: Any = None,
    actor_role: str = None,
    payload: Dict[str, Any] = None
) -> LedgerEvent:
    """
    The actual synchronous logic for recording an event.
    Should only be called via record_event (background task).
    """
    if payload is None:
        payload = {}
        
    # Extract actor_id from payload if not provided as top-level argument
    if actor_id is None:
        actor_id = payload.get('actor_id')
        
    # Ensure payload is JSON serializable (convert UUIDs to strings, etc.)
    # We use DjangoJSONEncoder to handle UUIDs/Datetimes, then reload as dict
    # so that the DB adapter receives standard JSON types.
    import json
    from django.core.serializers.json import DjangoJSONEncoder
    payload = json.loads(json.dumps(payload, cls=DjangoJSONEncoder))
        
    # Find previous event for this entity to establish chain
    last_event = LedgerEvent.objects.filter(
        entity_id=entity_id,
        entity_type=entity_type
    ).order_by('-occurred_at').first()
    
    previous_hash = last_event.hash if last_event else None
        
    event = LedgerEvent.objects.create(
        event_type=event_type,
        actor_id=actor_id,
        entity_id=entity_id,
        entity_type=entity_type,
        actor_role=actor_role,
        payload=payload,
        previous_hash=previous_hash
    )
    
    # Calculate hash for immutability
    # We hash critical fields to ensure integrity
    import hashlib
    
    # Sort keys for consistent JSON serialization
    # Use DjangoJSONEncoder to handle UUIDs, Datetimes, etc.
    payload_str = json.dumps(payload, sort_keys=True, cls=DjangoJSONEncoder)
    # Include previous_hash in the current hash calculation to enforce the chain
    prev_hash_str = previous_hash if previous_hash else ""
    role_str = actor_role if actor_role else ""
    data_to_hash = f"{event.id}{prev_hash_str}{event_type}{actor_id}{role_str}{entity_id}{entity_type}{payload_str}{event.occurred_at.isoformat()}"
    event_hash = hashlib.sha256(data_to_hash.encode()).hexdigest()
    
    event.hash = event_hash
    event.save(update_fields=["hash"])
    
    return event

def validate_ledger_chain(*, entity_id: UUID, entity_type: str) -> dict:
    """
    Validates the entire event chain for a specific entity.
    Returns status and any corruption points found.
    """
    import json
    import hashlib
    from django.core.serializers.json import DjangoJSONEncoder
    
    events = LedgerEvent.objects.filter(
        entity_id=entity_id,
        entity_type=entity_type
    ).order_by('occurred_at')
    
    validation_results = []
    is_valid = True
    previous_hash = None
    
    for event in events:
        # 1. Recalculate hash
        payload_str = json.dumps(event.payload, sort_keys=True, cls=DjangoJSONEncoder)
        prev_hash_str = event.previous_hash if event.previous_hash else ""
        role_str = event.actor_role if event.actor_role else ""
        
        data_to_hash = f"{event.id}{prev_hash_str}{event.event_type}{event.actor_id}{role_str}{event.entity_id}{event.entity_type}{payload_str}{event.occurred_at.isoformat()}"
        recalculated_hash = hashlib.sha256(data_to_hash.encode()).hexdigest()
        
        event_status = {
            "event_id": str(event.id),
            "type": event.event_type,
            "hash_match": recalculated_hash == event.hash,
            "chain_match": event.previous_hash == previous_hash
        }
        
        if not event_status["hash_match"] or not event_status["chain_match"]:
            is_valid = False
            
        validation_results.append(event_status)
        previous_hash = event.hash
        
    return {
        "is_valid": is_valid,
        "entity_id": str(entity_id),
        "entity_type": entity_type,
        "event_count": len(validation_results),
        "results": validation_results
    }
