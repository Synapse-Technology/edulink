from rest_framework import serializers
from .models import LedgerEvent

class LedgerEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEvent
        fields = [
            'id', 
            'event_type', 
            'actor_id', 
            'actor_role', 
            'entity_id', 
            'entity_type', 
            'payload', 
            'occurred_at', 
            'hash', 
            'previous_hash'
        ]
        read_only_fields = fields
