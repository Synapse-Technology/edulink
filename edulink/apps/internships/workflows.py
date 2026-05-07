from django.db import transaction
from typing import Dict, Any
from edulink.apps.ledger.services import record_event
from .models import InternshipOpportunity, InternshipApplication, OpportunityStatus, ApplicationStatus, InternshipEvidence, Incident, SupervisorAssignment
from .logbook_format import get_logbook_week_start, get_required_week_start_dates
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
        ApplicationStatus.APPLIED: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED, ApplicationStatus.TERMINATED, ApplicationStatus.WITHDRAWN],
        ApplicationStatus.SHORTLISTED: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.TERMINATED, ApplicationStatus.WITHDRAWN],
        ApplicationStatus.ACCEPTED: [ApplicationStatus.ACTIVE, ApplicationStatus.TERMINATED, ApplicationStatus.WITHDRAWN],
        ApplicationStatus.ACTIVE: [ApplicationStatus.COMPLETED, ApplicationStatus.TERMINATED],
        ApplicationStatus.COMPLETED: [ApplicationStatus.CERTIFIED],
        # TERMINALS: REJECTED, TERMINATED, CERTIFIED, WITHDRAWN
    }
    
    EVENTS = {
        ApplicationStatus.SHORTLISTED: "APPLICATION_SHORTLISTED",
        ApplicationStatus.ACCEPTED: "APPLICATION_ACCEPTED",
        ApplicationStatus.REJECTED: "APPLICATION_REJECTED",
        ApplicationStatus.ACTIVE: "INTERNSHIP_STARTED",
        ApplicationStatus.COMPLETED: "INTERNSHIP_COMPLETED",
        ApplicationStatus.CERTIFIED: "INTERNSHIP_CERTIFIED",
        ApplicationStatus.TERMINATED: "INTERNSHIP_TERMINATED",
        ApplicationStatus.WITHDRAWN: "APPLICATION_WITHDRAWN_BY_STUDENT",
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

            required_weeks = get_required_week_start_dates(
                application.opportunity.start_date,
                application.opportunity.end_date,
            )
            if required_weeks:
                accepted_weeks = {
                    week_start
                    for week_start in (
                        get_logbook_week_start(evidence.metadata)
                        for evidence in application.evidence.filter(
                            evidence_type=InternshipEvidence.TYPE_LOGBOOK,
                            status=InternshipEvidence.STATUS_ACCEPTED,
                        )
                    )
                    if week_start
                }
                missing_weeks = [week for week in required_weeks if week not in accepted_weeks]
                if missing_weeks:
                    raise ValueError("Internship cannot be completed until every attachment week has an accepted logbook.")

            open_incident_statuses = [
                Incident.STATUS_OPEN,
                Incident.STATUS_ASSIGNED,
                Incident.STATUS_INVESTIGATING,
                Incident.STATUS_PENDING_APPROVAL,
            ]
            if application.incidents.filter(status__in=open_incident_statuses).exists():
                 raise ValueError("Internship cannot be completed with unresolved incidents.")


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

class EvidenceWorkflow:
    """
    Workflow for Internship Evidence (Submissions like logs, reports, milestones).
    SUBMITTED → REVIEWED (supervisors review)
             → ACCEPTED (both approve)
             → REJECTED (either rejects)
             → REVISION_REQUIRED (feedback for student)
    REVISION_REQUIRED → SUBMITTED (student corrects and resubmits)
    """
    TRANSITIONS = {
        InternshipEvidence.STATUS_SUBMITTED: [
            InternshipEvidence.STATUS_REVISION_REQUIRED,
            InternshipEvidence.STATUS_REVIEWED,
            InternshipEvidence.STATUS_ACCEPTED,
            InternshipEvidence.STATUS_REJECTED,
        ],
        InternshipEvidence.STATUS_REVIEWED: [
            InternshipEvidence.STATUS_ACCEPTED,
            InternshipEvidence.STATUS_REJECTED,
            InternshipEvidence.STATUS_REVISION_REQUIRED,
        ],
        InternshipEvidence.STATUS_REVISION_REQUIRED: [
            InternshipEvidence.STATUS_SUBMITTED,
        ],
        # Terminal states - no further transitions
        # ACCEPTED, REJECTED - no transitions
    }
    
    EVENTS = {
        InternshipEvidence.STATUS_REVIEWED: "EVIDENCE_UNDER_REVIEW",
        InternshipEvidence.STATUS_ACCEPTED: "EVIDENCE_ACCEPTED",
        InternshipEvidence.STATUS_REJECTED: "EVIDENCE_REJECTED",
        InternshipEvidence.STATUS_REVISION_REQUIRED: "EVIDENCE_REVISION_REQUIRED",
    }
    
    def transition(self, *, evidence: InternshipEvidence, target_state: str, actor, payload: Dict[str, Any] = None):
        """
        Transition evidence through the review workflow.
        
        Args:
            evidence: InternshipEvidence object to transition
            target_state: Target status (REVIEWED, ACCEPTED, REJECTED, REVISION_REQUIRED, SUBMITTED)
            actor: User performing the transition
            payload: Additional metadata to record in the ledger
        """
        if payload is None:
            payload = {}
        
        # 1. Validate State Machine
        self._validate_transition_path(evidence.status, target_state)
        
        # 2. Check Authority (delegated to calling service for now)
        # Authority check happens in review_evidence() service
        
        # 3. Execute
        with transaction.atomic():
            old_state = evidence.status
            evidence.status = target_state
            evidence.save()
            
            # 4. Record Ledger
            event_type = self.EVENTS.get(target_state, f"EVIDENCE_TRANSITION_{target_state}")
            record_event(
                event_type=event_type,
                actor_id=actor.id,
                entity_id=evidence.id,
                entity_type="evidence",
                payload={
                    "from_state": old_state,
                    "to_state": target_state,
                    "application_id": str(evidence.application.id),
                    **payload
                }
            )
            
        return evidence
    
    def _validate_transition_path(self, current_state: str, target_state: str):
        allowed = self.TRANSITIONS.get(current_state, [])
        if target_state not in allowed:
            raise ValueError(f"Invalid evidence transition from {current_state} to {target_state}")

class IncidentWorkflow:
    """
    Workflow for Internship Incidents (Issues/misconduct reports).
    OPEN → ASSIGNED → INVESTIGATING → PENDING_APPROVAL → RESOLVED
                                                      ↘ DISMISSED
    """
    TRANSITIONS = {
        Incident.STATUS_OPEN: [
            Incident.STATUS_ASSIGNED,
            Incident.STATUS_RESOLVED,
            Incident.STATUS_DISMISSED,  # Can dismiss immediately if not serious
        ],
        Incident.STATUS_ASSIGNED: [
            Incident.STATUS_INVESTIGATING,
            Incident.STATUS_DISMISSED,  # Can dismiss after review
        ],
        Incident.STATUS_INVESTIGATING: [
            Incident.STATUS_PENDING_APPROVAL,
            Incident.STATUS_DISMISSED,  # Investigation found no issues
        ],
        Incident.STATUS_PENDING_APPROVAL: [
            Incident.STATUS_RESOLVED,
            Incident.STATUS_INVESTIGATING,  # Reopen for more investigation
        ],
        # Terminal states
        Incident.STATUS_RESOLVED: [],
        Incident.STATUS_DISMISSED: [],
    }
    
    EVENTS = {
        Incident.STATUS_ASSIGNED: "INCIDENT_ASSIGNED",
        Incident.STATUS_INVESTIGATING: "INCIDENT_INVESTIGATION_STARTED",
        Incident.STATUS_PENDING_APPROVAL: "INCIDENT_RESOLUTION_PROPOSED",
        Incident.STATUS_RESOLVED: "INCIDENT_RESOLVED",
        Incident.STATUS_DISMISSED: "INCIDENT_DISMISSED",
    }
    
    def transition(self, *, incident: Incident, target_state: str, actor, payload: Dict[str, Any] = None):
        """
        Transition an incident through the resolution workflow.
        
        Args:
            incident: Incident object to transition
            target_state: Target status (ASSIGNED, INVESTIGATING, PENDING_APPROVAL, RESOLVED, DISMISSED)
            actor: User performing the transition (must be admin/supervisor)
            payload: Additional metadata to record
        """
        if payload is None:
            payload = {}
        
        # 1. Validate State Machine
        self._validate_transition_path(incident.status, target_state)
        
        # 2. Authority check happens in service layer (can_resolve_incident policy)
        
        # 3. Execute
        with transaction.atomic():
            old_state = incident.status
            incident.status = target_state
            
            # Track assignment timestamp
            if target_state == Incident.STATUS_ASSIGNED:
                from django.utils import timezone
                incident.assigned_at = timezone.now()
                if payload.get('investigator_id'):
                    incident.investigator_id = payload['investigator_id']
            
            # Track resolution
            if target_state == Incident.STATUS_RESOLVED:
                from django.utils import timezone
                incident.resolved_at = timezone.now()
                incident.resolved_by = actor.id
            
            incident.save()
            
            # 4. Record Ledger
            event_type = self.EVENTS.get(target_state, f"INCIDENT_TRANSITION_{target_state}")
            record_event(
                event_type=event_type,
                actor_id=actor.id,
                entity_id=incident.id,
                entity_type="incident",
                payload={
                    "from_state": old_state,
                    "to_state": target_state,
                    "application_id": str(incident.application.id) if incident.application else None,
                    **payload
                }
            )
            
        return incident
    
    def _validate_transition_path(self, current_state: str, target_state: str):
        allowed = self.TRANSITIONS.get(current_state, [])
        if target_state not in allowed:
            raise ValueError(f"Invalid incident transition from {current_state} to {target_state}")


class SupervisorAssignmentWorkflow:
    """
    Workflow for Supervisor Assignments.
    PENDING → ACCEPTED or REJECTED
    
    Represents supervisor consent process: Admin assigns, supervisor accepts/rejects.
    """
    TRANSITIONS = {
        "PENDING": ["ACCEPTED", "REJECTED"],
        "ACCEPTED": [],  # Terminal state
        "REJECTED": [],  # Terminal state
    }
    
    EVENTS = {
        "ACCEPTED": "SUPERVISOR_ASSIGNMENT_ACCEPTED",
        "REJECTED": "SUPERVISOR_ASSIGNMENT_REJECTED",
    }
    
    def transition(self, *, assignment, target_state: str, actor, payload: Dict[str, Any] = None):
        """
        Transition a supervisor assignment through the acceptance workflow.
        
        Args:
            assignment: SupervisorAssignment object to transition
            target_state: Target status (ACCEPTED or REJECTED)
            actor: User performing the transition (must be the supervisor)
            payload: Additional metadata to record
        """
        if payload is None:
            payload = {}
        
        # 1. Validate state machine
        self._validate_transition_path(assignment.status, target_state)
        
        # 2. Authority check: Only supervisor can accept/reject their own assignment.
        # Assignment IDs are domain profile IDs, not necessarily account user IDs.
        from .policies import can_accept_supervisor_assignment, can_reject_supervisor_assignment
        can_transition = (
            can_accept_supervisor_assignment(actor, assignment)
            if target_state == "ACCEPTED"
            else can_reject_supervisor_assignment(actor, assignment)
        )
        if not can_transition:
            raise PermissionError("Only the assigned supervisor can accept or reject their assignment")
        
        # 3. Execute
        with transaction.atomic():
            old_state = assignment.status
            assignment.status = target_state
            
            # Track acceptance/rejection timestamps
            from django.utils import timezone
            
            if target_state == "ACCEPTED":
                assignment.accepted_at = timezone.now()
                
                # When accepted: update the application to point to this supervisor
                # This completes the assignment process
                from .models import InternshipApplication
                application = assignment.application
                
                if assignment.assignment_type == "EMPLOYER":
                    application.employer_supervisor_id = assignment.supervisor_id
                elif assignment.assignment_type == "INSTITUTION":
                    application.institution_supervisor_id = assignment.supervisor_id
                
                application.save()
            
            elif target_state == "REJECTED":
                assignment.rejected_at = timezone.now()
                assignment.rejection_reason = payload.get("reason", "")
            
            assignment.save()
            
            # 4. Record ledger event
            event_type = self.EVENTS.get(target_state, f"SUPERVISOR_ASSIGNMENT_{target_state}")
            record_event(
                event_type=event_type,
                actor_id=actor.id,
                entity_id=assignment.id,
                entity_type="supervisor_assignment",
                payload={
                    "from_state": old_state,
                    "to_state": target_state,
                    "application_id": str(assignment.application.id),
                    "assignment_type": assignment.assignment_type,
                    "supervisor_id": str(assignment.supervisor_id),
                    **payload
                }
            )
        
        return assignment
    
    def _validate_transition_path(self, current_state: str, target_state: str):
        allowed = self.TRANSITIONS.get(current_state, [])
        if target_state not in allowed:
            raise ValueError(f"Invalid supervisor assignment transition from {current_state} to {target_state}")


# Instances
opportunity_workflow = OpportunityWorkflow()
application_workflow = ApplicationWorkflow()
evidence_workflow = EvidenceWorkflow()
incident_workflow = IncidentWorkflow()
supervisor_assignment_workflow = SupervisorAssignmentWorkflow()


class LegacyApplicationWorkflow:
    """Adapter for older tests/callers that used the `internship` keyword."""

    def transition(self, *, internship=None, application=None, target_state: str, actor, payload=None):
        return application_workflow.transition(
            application=application or internship,
            target_state=target_state,
            actor=actor,
            payload=payload,
        )


workflow = LegacyApplicationWorkflow()
