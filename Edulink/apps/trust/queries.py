from typing import List
from uuid import UUID
from edulink.apps.ledger.queries import get_events_for_entity
from edulink.apps.students.constants import TRUST_EVENT_POINTS, TRUST_TIER_THRESHOLDS

def calculate_student_trust_state(*, student_id: str) -> dict:
    """
    Authoritative calculation of student trust from ledger events.
    Read-only logic. No side effects.
    """
    events = get_events_for_entity(entity_id=student_id, entity_type="Student")
    score = 0
    for event in events:
        score += TRUST_EVENT_POINTS.get(event.event_type, 0)

    tier = {"level": 0, "name": "Self-Registered"}
    for min_score, max_score, level, name in TRUST_TIER_THRESHOLDS:
        if min_score <= score <= max_score:
            tier = {"level": level, "name": name}
            break
            
    return {
        "student_id": student_id,
        "score": score,
        "tier_level": tier["level"],
        "tier_name": tier["name"]
    }
