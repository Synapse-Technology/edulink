from uuid import UUID
from edulink.apps.ledger.queries import get_events_for_entity
from edulink.apps.ledger.services import record_event

# Domain Interfaces
from edulink.apps.institutions.queries import get_institution_details_for_trust
from edulink.apps.institutions.services import update_institution_trust_level
from edulink.apps.institutions.constants import (
    STATUS_ACTIVE as INSTITUTION_STATUS_ACTIVE,
    TRUST_REGISTERED as INSTITUTION_TRUST_REGISTERED,
    TRUST_ACTIVE as INSTITUTION_TRUST_ACTIVE,
    TRUST_HIGH as INSTITUTION_TRUST_HIGH,
    TRUST_PARTNER as INSTITUTION_TRUST_PARTNER,
    TRUST_CHOICES as INSTITUTION_TRUST_CHOICES
)

from edulink.apps.employers.queries import get_employer_details_for_trust
from edulink.apps.employers.services import update_employer_trust_level
from edulink.apps.employers.constants import (
    EMPLOYER_STATUS_ACTIVE,
    EMPLOYER_TRUST_UNVERIFIED,
    EMPLOYER_TRUST_VERIFIED,
    EMPLOYER_TRUST_ACTIVE_HOST,
    EMPLOYER_TRUST_PARTNER
)

from edulink.apps.students.queries import get_student_details_for_trust
from edulink.apps.students.services import update_student_trust_level
from edulink.apps.students.constants import TRUST_EVENT_POINTS, TRUST_TIER_THRESHOLDS

from edulink.apps.internships.queries import check_institution_has_internships, count_completed_internships_for_employer

# -----------------------------------------------------------------------------
# Institution Trust
# -----------------------------------------------------------------------------

def compute_institution_trust_tier(*, institution_id: UUID) -> dict:
    """
    Compute institution trust tier based on ledger events and status.
    Updates the institution model if changed.
    
    Tiers (Blueprint):
    - Level 0 (Registered): Signed up but no students verified
    - Level 1 (Active): Verified students or posted internships
    - Level 2 (High Trust): Institution provides internships and bulk verifies students
    - Level 3 (Strategic Partner): Official mandates + historical engagement
    """
    institution = get_institution_details_for_trust(institution_id=institution_id)
    events = get_events_for_entity(entity_id=str(institution_id), entity_type="Institution")
    
    # Base level
    current_level = INSTITUTION_TRUST_REGISTERED
    
    # Level 1: Active
    # Blueprint: "Verified students or posted internships"
    # We use STATUS_ACTIVE as the gate. If active, they are at least L1.
    if institution["status"] == INSTITUTION_STATUS_ACTIVE:
        current_level = max(current_level, INSTITUTION_TRUST_ACTIVE)
        
        # Level 2: High Trust
        # Requirement: "Institution provides internships and bulk verifies students"
        
        # Check for internships created by this institution
        has_internships = check_institution_has_internships(institution_id=institution_id)
        
        # Check for student verifications in ledger
        # We look for 'STUDENT_VERIFIED_BY_INSTITUTION' events
        verification_events = [e for e in events if e.event_type == "STUDENT_VERIFIED_BY_INSTITUTION"]
        has_verifications = len(verification_events) > 0
        
        if has_internships and has_verifications:
            current_level = max(current_level, INSTITUTION_TRUST_HIGH)
            
        # Level 3: Strategic Partner
        # Requirement: "Official mandates + historical engagement"
        # We check for explicit partnership events or manual assignment
        partnership_events = [e for e in events if e.event_type == "INSTITUTION_PARTNERSHIP_ESTABLISHED"]
        if partnership_events:
            current_level = max(current_level, INSTITUTION_TRUST_PARTNER)
    
    # Update if changed
    if institution["trust_level"] != current_level:
        old_level = institution["trust_level"]
        update_institution_trust_level(institution_id=institution_id, new_level=current_level)
        
        record_event(
            event_type="INSTITUTION_TRUST_TIER_UPDATED",
            actor_id=None, # System action
            entity_type="Institution",
            entity_id=UUID(str(institution["id"])),
            payload={
                "old_level": old_level,
                "new_level": current_level
            }
        )
        # Update return value
        institution["trust_level"] = current_level
        # Note: trust_label won't be updated here but that's acceptable for now or we could refetch/map it
        
    return {
        "institution_id": str(institution["id"]),
        "trust_level": current_level,
        "trust_label": institution.get("trust_label") # Might be stale if level changed, but acceptable
    }

# -----------------------------------------------------------------------------
# Employer Trust
# -----------------------------------------------------------------------------

def compute_employer_trust_tier(*, employer_id: UUID) -> dict:
    """
    Compute employer trust tier based on ledger events and status.
    Updates the employer model if changed.
    
    Tiers (Blueprint):
    - Level 0 (Unverified): Just created account
    - Level 1 (Verified): Email confirmed, basic profile
    - Level 2 (Trusted Employer): Completed 1+ internships successfully
    - Level 3 (High Trust): Institution-backed / partnership OR High volume
    """
    employer = get_employer_details_for_trust(employer_id=employer_id)
    events = get_events_for_entity(entity_id=str(employer_id), entity_type="Employer")
    
    # Base level
    current_level = EMPLOYER_TRUST_UNVERIFIED
    
    # Level 1: Verified Entity
    # Checked via status=ACTIVE (implies email confirmed)
    if employer["status"] == EMPLOYER_STATUS_ACTIVE:
        current_level = max(current_level, EMPLOYER_TRUST_VERIFIED)
        
        # Level 2: Active Host
        # Requirement: "Completed 1+ internships successfully"
        completed_count = count_completed_internships_for_employer(employer_id=employer_id)
        
        if completed_count >= 1:
            current_level = max(current_level, EMPLOYER_TRUST_ACTIVE_HOST)
            
        # Level 3: Trusted Partner
        # Requirement: "Institution-backed / partnership" OR "High volume"
        
        # Check for explicit partnership events
        partnership_events = [e for e in events if e.event_type == "EMPLOYER_PARTNERSHIP_ESTABLISHED"]
        
        # Check for high volume (e.g., 5+)
        is_high_volume = completed_count >= 5
        
        if partnership_events or is_high_volume:
            current_level = max(current_level, EMPLOYER_TRUST_PARTNER)
    
    # Update if changed
    if employer["trust_level"] != current_level:
        old_level = employer["trust_level"]
        update_employer_trust_level(employer_id=employer_id, new_level=current_level)
        
        record_event(
            event_type="EMPLOYER_TRUST_TIER_UPDATED",
            actor_id=None,
            entity_type="Employer",
            entity_id=UUID(str(employer["id"])),
            payload={
                "old_level": old_level,
                "new_level": current_level
            }
        )
        
        # Update return value
        employer["trust_label"] = dict(EMPLOYER_TRUST_CHOICES).get(current_level, "Unknown")
        
    return {
        "employer_id": str(employer["id"]),
        "trust_level": current_level,
        "trust_label": employer.get("trust_label")
    }

# -----------------------------------------------------------------------------
# Student Trust
# -----------------------------------------------------------------------------

from .queries import calculate_student_trust_state

def compute_student_trust_tier(*, student_id: str) -> dict:
    """
    Compute the full student trust tier from ledger events.
    Updates the Student model if the derived state differs from the cached state.
    """
    student_uuid = UUID(str(student_id))
    student = get_student_details_for_trust(student_id=student_uuid)
    
    # Delegate calculation to read-only query
    trust_state = calculate_student_trust_state(student_id=student_id)
    score = trust_state["score"]
    tier_level = trust_state["tier_level"]

    # Update Student model if changed
    updated = False
    current_points = student["trust_points"]
    current_level = student["trust_level"]
    
    if current_points != score:
        updated = True
        
    if current_level != tier_level:
        updated = True
        
        # Log tier change if level changed
        record_event(
            event_type="STUDENT_TRUST_TIER_UPDATED",
            actor_id=None,
            entity_type="Student",
            entity_id=student_uuid,
            payload={
                "old_level": current_level,
                "new_level": tier_level,
                "score": score
            }
        )

    if updated:
        update_student_trust_level(student_id=student_uuid, new_level=tier_level, new_points=score)

    return trust_state
