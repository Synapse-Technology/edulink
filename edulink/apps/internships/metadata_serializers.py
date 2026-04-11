"""
Phase 3.1b: Metadata Schema Serializers

Provides REST API serializers for metadata schema validation and serialization.
Integrates with DRF for API request/response handling.
"""

from rest_framework import serializers
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID

from .metadata_schemas import (
    IncidentMetadata,
    IncidentStateTransition,
    EvidenceReviewMetadata,
    EvidenceReviewOutcome,
    SupervisorAssignmentMetadata,
    SupervisorAssignmentEvent,
    MetadataEventEntry,
    MetadataSchemaRegistry,
)


# ============================================================================
# Incident Metadata Serializers
# ============================================================================

class IncidentMetadataSerializer(serializers.Serializer):
    """
    Serializer for IncidentMetadata.
    
    Used to validate and serialize incident event metadata.
    Provides type checking and validation for workflow events.
    """
    event_type = serializers.CharField(max_length=100)
    from_state = serializers.CharField(max_length=50)
    to_state = serializers.CharField(max_length=50)
    actor_id = serializers.UUIDField()
    actor_role = serializers.ChoiceField(
        choices=["ADMIN", "MODERATOR", "COORDINATOR", "SYSTEM"]
    )
    actor_name = serializers.CharField(max_length=255)
    timestamp = serializers.DateTimeField()
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_event_type(self, value):
        """Validate event_type is a known incident event"""
        valid_events = [
            "INCIDENT_CREATED",
            "INCIDENT_ASSIGNED",
            "INCIDENT_INVESTIGATION_STARTED",
            "INCIDENT_RESOLUTION_PROPOSED",
            "INCIDENT_RESOLVED",
            "INCIDENT_DISMISSED",
        ]
        if value not in valid_events:
            raise serializers.ValidationError(
                f"Invalid event_type. Must be one of: {valid_events}"
            )
        return value
    
    def validate(self, data):
        """Validate state transition"""
        try:
            metadata = IncidentMetadata(
                event_type=data['event_type'],
                from_state=data['from_state'],
                to_state=data['to_state'],
                actor_id=str(data['actor_id']),
                actor_role=data['actor_role'],
                actor_name=data['actor_name'],
                timestamp=data['timestamp'],
                reason=data.get('reason'),
                notes=data.get('notes'),
            )
            errors = metadata.validate()
            if errors:
                raise serializers.ValidationError(" | ".join(errors))
        except Exception as e:
            raise serializers.ValidationError(str(e))
        
        return data
    
    def to_representation(self, instance):
        """Convert IncidentMetadata instance to dict"""
        if isinstance(instance, IncidentMetadata):
            return instance.to_dict()
        return super().to_representation(instance)


# ============================================================================
# Evidence Review Metadata Serializers
# ============================================================================

class EvidenceReviewMetadataSerializer(serializers.Serializer):
    """
    Serializer for EvidenceReviewMetadata.
    
    Validates evidence review records with outcome and notes.
    """
    event_type = serializers.CharField(max_length=100)
    reviewer_id = serializers.UUIDField()
    reviewer_role = serializers.ChoiceField(
        choices=["ADMIN", "SUPERVISOR", "INSTITUTION_ADMIN", "MODERATOR"]
    )
    reviewer_name = serializers.CharField(max_length=255)
    review_outcome = serializers.ChoiceField(
        choices=[e.value for e in EvidenceReviewOutcome]
    )
    review_notes = serializers.CharField()
    reviewed_at = serializers.DateTimeField()
    evidence_type = serializers.CharField(max_length=50, required=False)
    category = serializers.CharField(max_length=100, required=False, allow_blank=True)
    is_final = serializers.BooleanField(default=False)
    
    def validate_event_type(self, value):
        """Validate event_type"""
        valid_events = [
            "EVIDENCE_SUBMITTED",
            "EVIDENCE_REVIEWED",
            "EVIDENCE_APPROVED",
            "EVIDENCE_REJECTED",
            "EVIDENCE_REVISION_REQUIRED",
        ]
        if value not in valid_events:
            raise serializers.ValidationError(
                f"Invalid event_type. Must be one of: {valid_events}"
            )
        return value
    
    def validate_review_notes(self, value):
        """Review notes cannot be empty"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Review notes cannot be empty")
        return value
    
    def validate(self, data):
        """Validate evidence metadata"""
        try:
            metadata = EvidenceReviewMetadata(
                event_type=data['event_type'],
                reviewer_id=str(data['reviewer_id']),
                reviewer_role=data['reviewer_role'],
                reviewer_name=data['reviewer_name'],
                review_outcome=data['review_outcome'],
                review_notes=data['review_notes'],
                reviewed_at=data['reviewed_at'],
                evidence_type=data.get('evidence_type'),
                category=data.get('category'),
                is_final=data.get('is_final', False),
            )
            errors = metadata.validate()
            if errors:
                raise serializers.ValidationError(" | ".join(errors))
        except Exception as e:
            raise serializers.ValidationError(str(e))
        
        return data


# ============================================================================
# Supervisor Assignment Metadata Serializers
# ============================================================================

class SupervisorAssignmentMetadataSerializer(serializers.Serializer):
    """
    Serializer for SupervisorAssignmentMetadata.
    
    Validates supervisor assignment workflow events.
    """
    event_type = serializers.ChoiceField(
        choices=[e.value for e in SupervisorAssignmentEvent]
    )
    actor_id = serializers.UUIDField()
    actor_role = serializers.ChoiceField(
        choices=["ADMIN", "SUPERVISOR", "SYSTEM"]
    )
    actor_name = serializers.CharField(max_length=255)
    assignment_type = serializers.ChoiceField(choices=["EMPLOYER", "INSTITUTION"])
    created_at = serializers.DateTimeField()
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate supervisor assignment metadata"""
        try:
            metadata = SupervisorAssignmentMetadata(
                event_type=data['event_type'],
                actor_id=str(data['actor_id']),
                actor_role=data['actor_role'],
                actor_name=data['actor_name'],
                assignment_type=data['assignment_type'],
                created_at=data['created_at'],
                reason=data.get('reason'),
                rejection_reason=data.get('rejection_reason'),
                notes=data.get('notes'),
            )
            errors = metadata.validate()
            if errors:
                raise serializers.ValidationError(" | ".join(errors))
        except Exception as e:
            raise serializers.ValidationError(str(e))
        
        return data


# ============================================================================
# Metadata Event Entry Serializers
# ============================================================================

class MetadataEventEntrySerializer(serializers.Serializer):
    """
    Serializer for MetadataEventEntry.
    
    Immutable audit trail entries for compliance and debugging.
    """
    entry_id = serializers.UUIDField()
    entity_type = serializers.ChoiceField(
        choices=["INCIDENT", "EVIDENCE", "SUPERVISOR_ASSIGNMENT"]
    )
    entity_id = serializers.UUIDField()
    event_type = serializers.CharField(max_length=100)
    actor_id = serializers.UUIDField()
    actor_role = serializers.CharField(max_length=50)
    actor_name = serializers.CharField(max_length=255)
    timestamp = serializers.DateTimeField()
    metadata = serializers.JSONField()
    
    def to_representation(self, instance):
        """Convert MetadataEventEntry to dict"""
        if isinstance(instance, MetadataEventEntry):
            return instance.to_dict()
        return super().to_representation(instance)


# ============================================================================
# Metadata Schema Registry Serializers
# ============================================================================

class MetadataSchemaValidator(serializers.Serializer):
    """
    Generic validator for any metadata schema.
    
    Usage:
        serializer = MetadataSchemaValidator(data={
            "schema_name": "IncidentMetadata",
            "data": {...metadata...}
        })
        if serializer.is_valid():
            # Metadata is valid
        else:
            # serializer.errors contains validation errors
    """
    schema_name = serializers.ChoiceField(
        choices=MetadataSchemaRegistry.list_schemas()
    )
    data = serializers.JSONField()
    
    def validate(self, attrs):
        """Validate metadata against registered schema"""
        schema_name = attrs['schema_name']
        data = attrs['data']
        
        is_valid, errors = MetadataSchemaRegistry.validate_metadata(schema_name, data)
        if not is_valid:
            raise serializers.ValidationError({
                "metadata_errors": errors
            })
        
        return attrs


# ============================================================================
# Composite Serializers (for API responses)
# ============================================================================

class IncidentWithMetadataSerializer(serializers.Serializer):
    """
    Incident with fully typed metadata (for API responses).
    
    Example response:
        {
            "id": "...",
            "status": "ASSIGNED",
            "metadata": {
                "event_type": "INCIDENT_ASSIGNED",
                "from_state": "OPEN",
                "to_state": "ASSIGNED",
                "actor_id": "...",
                "actor_role": "ADMIN",
                "actor_name": "John Admin",
                "timestamp": "2026-04-11T10:00:00Z",
                "reason": "Assigned to senior investigator"
            }
        }
    """
    id = serializers.UUIDField()
    status = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    metadata = IncidentMetadataSerializer(required=False)


class EvidenceWithMetadataSerializer(serializers.Serializer):
    """Evidence with fully typed review metadata"""
    id = serializers.UUIDField()
    status = serializers.CharField()
    evidence_type = serializers.CharField()
    content_url = serializers.URLField(required=False)
    metadata = EvidenceReviewMetadataSerializer(required=False)


class SupervisorAssignmentWithMetadataSerializer(serializers.Serializer):
    """Supervisor assignment with fully typed event metadata"""
    id = serializers.UUIDField()
    status = serializers.CharField()
    supervisor_id = serializers.UUIDField()
    assignment_type = serializers.CharField()
    metadata = SupervisorAssignmentMetadataSerializer(required=False)


# ============================================================================
# Audit Log Serializer
# ============================================================================

class AuditLogSerializer(serializers.Serializer):
    """
    Audit log entry with full context and metadata.
    
    Used for compliance reporting and debugging.
    """
    entry_id = serializers.UUIDField()
    entity_type = serializers.CharField()
    entity_id = serializers.UUIDField()
    event_type = serializers.CharField()
    actor_id = serializers.UUIDField()
    actor_role = serializers.CharField()
    actor_name = serializers.CharField()
    timestamp = serializers.DateTimeField()
    reason = serializers.CharField(required=False)
    notes = serializers.CharField(required=False)
    
    # Full structured metadata
    metadata = serializers.JSONField()
    
    class Meta:
        fields = '__all__'
    
    def to_representation(self, instance):
        """
        Format audit log for human-readable output.
        
        Example:
            {
                "timestamp": "2026-04-11T10:00:00Z",
                "actor": "John Admin (ADMIN)",
                "action": "INCIDENT assigned to Senior Investigator",
                "reason": "Budget concerns flagged",
                "entity_ref": "incident/123e4567-e89b-12d3-a456-426614174000"
            }
        """
        data = super().to_representation(instance)
        
        # Format as human-readable line
        return {
            "timestamp": data['timestamp'],
            "actor": f"{data['actor_name']} ({data['actor_role']})",
            "action": f"{data['entity_type']} {data['event_type'].lower().replace('_', ' ')}",
            "reason": data.get('reason', '-'),
            "entity_ref": f"{data['entity_type'].lower()}/{data['entity_id']}",
            "full_metadata": data['metadata'],
        }
