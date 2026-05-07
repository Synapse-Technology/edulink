from dataclasses import dataclass
from typing import Optional
from uuid import UUID


@dataclass(frozen=True)
class SupervisorScope:
    employer_supervisor_id: Optional[UUID] = None
    institution_supervisor_id: Optional[UUID] = None

    @property
    def has_employer_scope(self) -> bool:
        return self.employer_supervisor_id is not None

    @property
    def has_institution_scope(self) -> bool:
        return self.institution_supervisor_id is not None


def get_actor_supervisor_scope(actor) -> SupervisorScope:
    """
    Resolve the domain supervisor profile IDs for a global supervisor user.
    This is the canonical bridge between accounts.User.role=supervisor and
    employer/institution supervisor profile records.
    """
    employer_supervisor_id = None
    institution_supervisor_id = None

    if not getattr(actor, "is_authenticated", False):
        return SupervisorScope()

    if getattr(actor, "is_supervisor", False):
        from edulink.apps.employers.queries import get_supervisor_id_for_user
        from edulink.apps.institutions.queries import get_institution_staff_id_for_user

        employer_supervisor_id = get_supervisor_id_for_user(actor.id)
        institution_supervisor_id = get_institution_staff_id_for_user(str(actor.id))

    return SupervisorScope(
        employer_supervisor_id=employer_supervisor_id,
        institution_supervisor_id=institution_supervisor_id,
    )


def is_assigned_employer_supervisor(actor, application) -> bool:
    if not application.employer_supervisor_id:
        return False

    scope = get_actor_supervisor_scope(actor)
    assigned_ids = {str(application.employer_supervisor_id)}
    actor_ids = {str(actor.id)}
    if scope.employer_supervisor_id:
        actor_ids.add(str(scope.employer_supervisor_id))

    return bool(assigned_ids & actor_ids)


def is_assigned_institution_supervisor(actor, application) -> bool:
    if not application.institution_supervisor_id:
        return False

    scope = get_actor_supervisor_scope(actor)
    assigned_ids = {str(application.institution_supervisor_id)}
    actor_ids = {str(actor.id)}
    if scope.institution_supervisor_id:
        actor_ids.add(str(scope.institution_supervisor_id))

    return bool(assigned_ids & actor_ids)


def is_assigned_supervisor(actor, application) -> bool:
    return (
        is_assigned_employer_supervisor(actor, application)
        or is_assigned_institution_supervisor(actor, application)
    )
