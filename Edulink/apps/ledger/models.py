from django.db import models
from shared.db.base_models import BaseModel

class LedgerEvent(BaseModel):
    event_type = models.CharField(max_length=100)
    
    # The actor who triggered the event
    actor_id = models.UUIDField(null=True)
    actor_role = models.CharField(max_length=50, null=True, blank=True)
    
    # The target entity (e.g., Internship ID, Student ID)
    entity_id = models.UUIDField()
    entity_type = models.CharField(max_length=100) # e.g. "internship", "student"
    
    # Payload for immutable history
    payload = models.JSONField(default=dict)
    
    # Metadata
    occurred_at = models.DateTimeField(auto_now_add=True)
    
    # Hash for integrity
    previous_hash = models.CharField(max_length=256, blank=True, null=True)
    hash = models.CharField(max_length=256, blank=True)

    class Meta:
        app_label = "ledger"
        db_table = "ledger_events"
        ordering = ["occurred_at"]
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["entity_id"]),
            models.Index(fields=["actor_id"]),
        ]
