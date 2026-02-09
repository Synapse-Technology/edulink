from django.db import transaction
from typing import Dict, Any
from edulink.apps.ledger.services import record_event
from .models import InternshipOpportunity, InternshipApplication, OpportunityStatus, ApplicationStatus, InternshipEvidence
from .policies import can_transition_opportunity, can_transition_application

class OpportunityWorkflow:
    """
    Workflow for Internship Opportunities (The Job Post).
    DRAFT -> OPEN -> CLOSED
    """
    TRANSITIONS = {
        OpportunityStatus.DRAFT: [OpportunityStatus.OPEN],
        OpportunityStatus.OPEN: [OpportunityStatus.CLOSED],
        OpportunityStatus.CLOSED: [OpportunityStatus.OPEN], # Re-opening allowed? Let's say yes.
    }
    
    EVENTS = {
        OpportunityStatus.OPEN: "OPPORTUNITY_OPENED",
        OpportunityStatus.CLOSED: "OPPORTUNITY_CLOSED",
    }
    
    def transition(self, *, opportunity: InternshipOpportunity, target_state: str, actor, payload: Dict[str, Any] = None):
        if payload is None:
            payload = {}
            
        # 1. Validate State Machine
        self._validate_transition_path(opportunity.status, target_state)
        
        # 2. Check Authority
        if not can_transition_opportunity(actor, opportunity, target_state):
             raise PermissionError(f"Actor {actor} is not authorized to transition opportunity {opportunity.id} to {target_state}")
             
        # 3. Execute
        with transaction.atomic():
            old_state = opportunity.status
            opportunity.status = target_state
            opportunity.save()
            
            # 4. Record Ledger
            event_type = self.EVENTS.get(target_state, f"OPPORTUNITY_TRANSITION_{target_state}")
            record_event(
                event_type=event_type,
                actor_id=actor.id,
                entity_id=opportunity.id,
                entity_type="internship_opportunity",
                payload={
                    "from_state": old_state,
                    "to_state": target_state,
                    **payload
                }
            )
            
        return opportunity

    def _validate_transition_path(self, current_state: str, target_state: str):
        allowed = self.TRANSITIONS.get(current_state, [])
        if target_state not in allowed:
             raise ValueError(f"Invalid transition from {current_state} to {target_state}")

class ApplicationWorkflow:
    """
    Workflow for Internship Applications (The Engagement).
    APPLIED -> SHORTLISTED -> ACCEPTED -> ACTIVE -> COMPLETED -> CERTIFIED
    """
    TRANSITIONS = {
        ApplicationStatus.APPLIED: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED, ApplicationStatus.TERMINATED],
        ApplicationStatus.SHORTLISTED: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.TERMINATED],
        ApplicationStatus.ACCEPTED: [ApplicationStatus.ACTIVE, ApplicationStatus.TERMINATED],
        ApplicationStatus.ACTIVE: [ApplicationStatus.COMPLETED, ApplicationStatus.TERMINATED],
        ApplicationStatus.COMPLETED: [ApplicationStatus.CERTIFIED],
        # TERMINALS: REJECTED, TERMINATED, CERTIFIED
    }
    
    EVENTS = {
        ApplicationStatus.SHORTLISTED: "APPLICATION_SHORTLISTED",
        ApplicationStatus.ACCEPTED: "APPLICATION_ACCEPTED",
        ApplicationStatus.REJECTED: "APPLICATION_REJECTED",
        ApplicationStatus.ACTIVE: "INTERNSHIP_STARTED",
        ApplicationStatus.COMPLETED: "INTERNSHIP_COMPLETED",
        ApplicationStatus.CERTIFIED: "INTERNSHIP_CERTIFIED",
        ApplicationStatus.TERMINATED: "INTERNSHIP_TERMINATED",
    }
    
    def transition(self, *, application: InternshipApplication, target_state: str, actor, payload: Dict[str, Any] = None):
        if payload is None:
            payload = {}
            
        # 1. Validate State Machine
        self._validate_transition_path(application.status, target_state)
        
        # 2. Check Authority
        if not can_transition_application(actor, application, target_state):
             raise PermissionError(f"Actor {actor} is not authorized to transition application {application.id} to {target_state}")
             
        # 3. Pre-transition Validation
        if target_state == ApplicationStatus.COMPLETED:
            # Enforce evidence requirement: Must have at least one ACCEPTED evidence
            if not application.evidence.filter(status=InternshipEvidence.STATUS_ACCEPTED).exists():
                 raise ValueError("Internship cannot be completed without accepted evidence.")
                 
            # Additional check: Pending reviews should be blocked.
            # While complete_internship service checks this, doing it here in workflow enforces it globally.
            pending_statuses = [
                InternshipEvidence.STATUS_SUBMITTED,
                InternshipEvidence.STATUS_REVIEWED,
                InternshipEvidence.STATUS_REVISION_REQUIRED
            ]
            if application.evidence.filter(status__in=pending_statuses).exists():
                 raise ValueError("Internship cannot be completed with pending evidence reviews.")


        # 4. Execute
        with transaction.atomic():
            old_state = application.status
            application.status = target_state
            application.save()
            
            # 5. Record Ledger
            event_type = self.EVENTS.get(target_state, f"APPLICATION_TRANSITION_{target_state}")
            record_event(
                event_type=event_type,
                actor_id=actor.id,
                entity_id=application.id,
                entity_type="internship_application",
                payload={
                    "from_state": old_state,
                    "to_state": target_state,
                    **payload
                }
            )
            
        return application

    def _validate_transition_path(self, current_state: str, target_state: str):
        allowed = self.TRANSITIONS.get(current_state, [])
        if target_state not in allowed:
             raise ValueError(f"Invalid transition from {current_state} to {target_state}")

# Instances
opportunity_workflow = OpportunityWorkflow()
application_workflow = ApplicationWorkflow()
