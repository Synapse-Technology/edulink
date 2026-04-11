"""
Phase 3.1: Metadata Schema Standardization

Provides strongly-typed metadata schemas for event tracking and audit trails.
Replaces ad-hoc JSONField storage with validated dataclass-based schemas.

Schemas:
- IncidentMetadata: Tracks incident state transitions and investigation events
- EvidenceReviewMetadata: Tracks evidence review approvals and rejections
- SupervisorAssignmentMetadata: Tracks supervisor assignment lifecycle events
"""

from dataclasses import dataclass, asdict, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import json
from enum import Enum


# ============================================================================
# Incident Metadata Schema
# ============================================================================

class IncidentStateTransition(str, Enum):
    """Valid incident state transitions for audit trail"""
    OPEN_TO_ASSIGNED = "OPEN→ASSIGNED"
    ASSIGNED_TO_INVESTIGATING = "ASSIGNED→INVESTIGATING"
    INVESTIGATING_TO_PENDING_APPROVAL = "INVESTIGATING→PENDING_APPROVAL"
    PENDING_APPROVAL_TO_RESOLVED = "PENDING_APPROVAL→RESOLVED"
    PENDING_APPROVAL_TO_DISMISSED = "PENDING_APPROVAL→DISMISSED"
    ANY_TO_DISMISSED = "ANY→DISMISSED"  # Can dismiss from any state


@dataclass
class IncidentMetadata:
    """
    Standardized metadata for incident events.
    
    Usage:
        metadata = IncidentMetadata(
            event_type="INCIDENT_ASSIGNED",
            from_state="OPEN",
            to_state="ASSIGNED",
            actor_id=UUID("..."),
            actor_role="ADMIN",
            actor_name="John Admin",
            reason="Assigned to senior investigator",
            notes="Pending budget approval review"
        )
        incident.metadata = metadata.to_dict()
        incident.save()
    """
    event_type: str  # "INCIDENT_ASSIGNED", "INCIDENT_INVESTIGATION_STARTED", etc.
    from_state: str  # Previous status
    to_state: str  # New status
    actor_id: str  # UUID of who performed action
    actor_role: str  # "ADMIN", "MODERATOR", "COORDINATOR"
    actor_name: str  # Display name for audit trail
    timestamp: datetime  # When action occurred
    reason: Optional[str] = None  # Why (e.g., assignment reason)
    notes: Optional[str] = None  # Private investigation notes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "IncidentMetadata":
        """Deserialize from dict (e.g., from JSONField)"""
        if isinstance(data.get('timestamp'), str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)
    
    def validate(self) -> List[str]:
        """Validate metadata consistency. Returns list of errors (empty if valid)."""
        errors = []
        
        # Validate required fields
        if not self.event_type:
            errors.append("event_type is required")
        if not self.actor_id:
            errors.append("actor_id is required")
        if not self.actor_role or self.actor_role not in ["ADMIN", "MODERATOR", "COORDINATOR", "SYSTEM"]:
            errors.append(f"actor_role must be one of (ADMIN, MODERATOR, COORDINATOR, SYSTEM), got {self.actor_role}")
        
        # Validate state transition
        if self.from_state and self.to_state:
            valid_transitions = [t.value for t in IncidentStateTransition]
            transition = f"{self.from_state}→{self.to_state}"
            if transition not in valid_transitions and not self.to_state == "DISMISSED":
                errors.append(f"Invalid state transition: {transition}")
        
        return errors


# ============================================================================
# Evidence Review Metadata Schema
# ============================================================================

class EvidenceReviewOutcome(str, Enum):
    """Possible outcomes of evidence review"""
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REVISION_REQUIRED = "REVISION_REQUIRED"


@dataclass
class EvidenceReviewMetadata:
    """
    Standardized metadata for evidence reviews and approvals.
    
    Usage:
        metadata = EvidenceReviewMetadata(
            event_type="EVIDENCE_REVIEWED",
            reviewer_id=UUID("..."),
            reviewer_role="MODERATOR",
            reviewer_name="Dr. Sarah",
            review_outcome="APPROVED",
            review_notes="Excellent documentation of hours and activities",
            reviewed_at=datetime.now(),
            evidence_type="LOGBOOK",
            category="LOGBOOK",
        )
        evidence.metadata = metadata.to_dict()
        evidence.save()
    """
    event_type: str  # "EVIDENCE_REVIEWED", "EVIDENCE_APPROVED", "EVIDENCE_REJECTED"
    reviewer_id: str  # UUID of reviewer
    reviewer_role: str  # "ADMIN", "SUPERVISOR", "INSTITUTION_ADMIN"
    reviewer_name: str  # Display name
    review_outcome: str  # "APPROVED", "REJECTED", "REVISION_REQUIRED"
    review_notes: str  # Review comments/feedback
    reviewed_at: datetime  # When reviewed
    evidence_type: Optional[str] = None  # "LOGBOOK", "REPORT", "MILESTONE", "OTHER"
    category: Optional[str] = None  # Additional categorization
    is_final: bool = False  # Whether this is final (no further review)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict"""
        data = asdict(self)
        data['reviewed_at'] = self.reviewed_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EvidenceReviewMetadata":
        """Deserialize from dict"""
        if isinstance(data.get('reviewed_at'), str):
            data['reviewed_at'] = datetime.fromisoformat(data['reviewed_at'])
        return cls(**data)
    
    def validate(self) -> List[str]:
        """Validate metadata consistency"""
        errors = []
        
        if not self.event_type:
            errors.append("event_type is required")
        if not self.reviewer_id:
            errors.append("reviewer_id is required")
        if self.review_outcome not in [e.value for e in EvidenceReviewOutcome]:
            errors.append(f"Invalid review_outcome: {self.review_outcome}")
        if not self.review_notes or len(self.review_notes.strip()) == 0:
            errors.append("review_notes cannot be empty")
        
        return errors


# ============================================================================
# Supervisor Assignment Metadata Schema
# ============================================================================

class SupervisorAssignmentEvent(str, Enum):
    """Types of events in supervisor assignment lifecycle"""
    ASSIGNMENT_CREATED = "ASSIGNMENT_CREATED"
    ASSIGNMENT_ACCEPTED = "ASSIGNMENT_ACCEPTED"
    ASSIGNMENT_REJECTED = "ASSIGNMENT_REJECTED"
    ASSIGNMENT_WITHDRAWN = "ASSIGNMENT_WITHDRAWN"  # Admin cancels
    ASSIGNMENT_EXPIRED = "ASSIGNMENT_EXPIRED"  # Pending too long


@dataclass
class SupervisorAssignmentMetadata:
    """
    Standardized metadata for supervisor assignment workflow.
    
    Usage:
        metadata = SupervisorAssignmentMetadata(
            event_type="ASSIGNMENT_CREATED",
            actor_id=UUID("..."),
            actor_role="ADMIN",
            actor_name="Admin User",
            assignment_type="EMPLOYER",
            reason="Candidate requested employer supervision",
            created_at=datetime.now(),
        )
        assignment.metadata = metadata.to_dict()
        assignment.save()
    """
    event_type: str  # From SupervisorAssignmentEvent enum
    actor_id: str  # UUID of who performed action
    actor_role: str  # "ADMIN", "SUPERVISOR", "SYSTEM"
    actor_name: str  # Display name
    assignment_type: str  # "EMPLOYER" or "INSTITUTION"
    created_at: datetime  # When assignment created
    reason: Optional[str] = None  # Why assigned (for audit)
    rejection_reason: Optional[str] = None  # If rejected, why
    notes: Optional[str] = None  # Private notes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SupervisorAssignmentMetadata":
        """Deserialize from dict"""
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)
    
    def validate(self) -> List[str]:
        """Validate metadata consistency"""
        errors = []
        
        if not self.event_type:
            errors.append("event_type is required")
        if self.event_type not in [e.value for e in SupervisorAssignmentEvent]:
            errors.append(f"Invalid event_type: {self.event_type}")
        if not self.actor_id:
            errors.append("actor_id is required")
        if self.assignment_type not in ["EMPLOYER", "INSTITUTION"]:
            errors.append(f"Invalid assignment_type: {self.assignment_type}")
        
        return errors


# ============================================================================
# Metadata Event Ledger Entry
# ============================================================================

@dataclass
class MetadataEventEntry:
    """
    Immutable ledger entry for audit trail.
    Captures snapshot of who did what, when, and why.
    """
    entry_id: str  # UUID for this ledger entry
    entity_type: str  # "INCIDENT", "EVIDENCE", "SUPERVISOR_ASSIGNMENT"
    entity_id: str  # UUID of the entity being modified
    event_type: str  # What happened
    actor_id: str  # Who did it
    actor_role: str  # Their role at time of action
    actor_name: str  # Their display name
    timestamp: datetime  # When it happened
    metadata: Dict[str, Any]  # Full metadata snapshot
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MetadataEventEntry":
        """Deserialize from dict"""
        if isinstance(data.get('timestamp'), str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)


# ============================================================================
# Metadata Schema Registry
# ============================================================================

class MetadataSchemaRegistry:
    """
    Central registry for all metadata schema types.
    Enables validation, serialization, and discovery.
    """
    
    _schemas = {
        "IncidentMetadata": IncidentMetadata,
        "EvidenceReviewMetadata": EvidenceReviewMetadata,
        "SupervisorAssignmentMetadata": SupervisorAssignmentMetadata,
        "MetadataEventEntry": MetadataEventEntry,
    }
    
    @classmethod
    def get_schema(cls, schema_name: str):
        """Get schema class by name"""
        return cls._schemas.get(schema_name)
    
    @classmethod
    def validate_metadata(cls, schema_name: str, data: Dict[str, Any]) -> tuple[bool, List[str]]:
        """
        Validate metadata against schema.
        
        Returns: (is_valid, error_list)
        """
        schema_class = cls.get_schema(schema_name)
        if not schema_class:
            return False, [f"Unknown schema: {schema_name}"]
        
        try:
            instance = schema_class.from_dict(data)
            errors = instance.validate()
            return len(errors) == 0, errors
        except Exception as e:
            return False, [str(e)]
    
    @classmethod
    def list_schemas(cls) -> List[str]:
        """List all available schema names"""
        return list(cls._schemas.keys())


# ============================================================================
# Backward Compatibility Utilities
# ============================================================================

def migrate_incident_metadata(old_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Migrate old untyped incident metadata to new typed format.
    
    Old format:
        {"from_state": "OPEN", "to_state": "ASSIGNED"}
    
    New format:
        IncidentMetadata(from_state="OPEN", to_state="ASSIGNED", ...)
    """
    # Provide defaults for required fields
    return IncidentMetadata(
        event_type=old_metadata.get("event_type", "INCIDENT_STATE_CHANGE"),
        from_state=old_metadata.get("from_state", "UNKNOWN"),
        to_state=old_metadata.get("to_state", "UNKNOWN"),
        actor_id=old_metadata.get("actor_id", "00000000-0000-0000-0000-000000000000"),
        actor_role=old_metadata.get("actor_role", "UNKNOWN"),
        actor_name=old_metadata.get("actor_name", "Unknown Actor"),
        timestamp=datetime.fromisoformat(old_metadata.get("timestamp", datetime.now().isoformat())),
        reason=old_metadata.get("reason"),
        notes=old_metadata.get("notes"),
    ).to_dict()


def migrate_evidence_metadata(old_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate old evidence metadata to new typed format"""
    return EvidenceReviewMetadata(
        event_type=old_metadata.get("event_type", "EVIDENCE_LOGGED"),
        reviewer_id=old_metadata.get("reviewer_id", "00000000-0000-0000-0000-000000000000"),
        reviewer_role=old_metadata.get("reviewer_role", "ADMIN"),
        reviewer_name=old_metadata.get("reviewer_name", "Unknown"),
        review_outcome=old_metadata.get("review_outcome", "APPROVED"),
        review_notes=old_metadata.get("review_notes", ""),
        reviewed_at=datetime.fromisoformat(old_metadata.get("reviewed_at", datetime.now().isoformat())),
        evidence_type=old_metadata.get("evidence_type"),
        category=old_metadata.get("category"),
    ).to_dict()


def migrate_supervisor_assignment_metadata(old_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate old supervisor assignment metadata to new typed format"""
    return SupervisorAssignmentMetadata(
        event_type=old_metadata.get("event_type", "ASSIGNMENT_CREATED"),
        actor_id=old_metadata.get("actor_id", "00000000-0000-0000-0000-000000000000"),
        actor_role=old_metadata.get("actor_role", "ADMIN"),
        actor_name=old_metadata.get("actor_name", "Unknown"),
        assignment_type=old_metadata.get("assignment_type", "EMPLOYER"),
        created_at=datetime.fromisoformat(old_metadata.get("created_at", datetime.now().isoformat())),
        reason=old_metadata.get("reason"),
        rejection_reason=old_metadata.get("rejection_reason"),
        notes=old_metadata.get("notes"),
    ).to_dict()
