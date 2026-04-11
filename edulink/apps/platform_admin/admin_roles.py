"""
Phase 3.3: Admin Role Clarification

Replaces monolithic "is_admin" with nuanced roles:
- COORDINATOR: Assigns supervisors, tracks deadlines, generates reports
- MODERATOR: Reviews incidents, approves evidence, makes judgment calls
- COMPLIANCE: Audits, generates compliance reports, ensures policies
- SYSTEM: Database admin, user management, system config

Each role has explicitly defined permissions.
Audit trails capture which role performed each action.
"""

from enum import Enum
from typing import Dict, Set, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


# ============================================================================
# Admin Role Definitions
# ============================================================================

class AdminRole(Enum):
    """
    Defines four admin roles with clear separation of duties.
    
    Pattern: Each role has specific responsibilities and permissions.
    Mapping to real people:
    - COORDINATOR: Schedules coordinator (senior staff)
    - MODERATOR: Academic moderator or senior supervisor
    - COMPLIANCE: Compliance officer or auditor
    - SYSTEM: IT administrator or devops
    """
    
    COORDINATOR = "COORDINATOR"
    """
    Supervisor assignment & scheduling coordinator.
    Responsible for: Matching supervisors to students, tracking deadlines,
    generating reports, bulk operations.
    
    Example: Jane Smith, Coordinator
    Permissions: assign_supervisor, withdraw_assignment, extend_deadline, generate_reports
    """
    
    MODERATOR = "MODERATOR"
    """
    Academic moderator for incident resolution & evidence review.
    Responsible for: Reviewing incidents, approving/rejecting evidence,
    making judgment calls, resolving disputes.
    
    Example: Dr. John Chen, Academic Moderator
    Permissions: approve_evidence, propose_incident_resolution, dismiss_incident
    """
    
    COMPLIANCE = "COMPLIANCE"
    """
    Compliance & audit officer.
    Responsible for: Audit trails, compliance reporting, policy enforcement,
    data exports, regulatory requirements.
    
    Example: Sarah Johnson, Compliance Officer
    Permissions: view_audit_logs, export_data, generate_compliance_report, override_approval
    """
    
    SYSTEM = "SYSTEM"
    """
    System administrator.
    Responsible for: Database management, user account management,
    system configuration, infrastructure.
    
    Example: Mike Davis, DevOps/IT Admin
    Permissions: manage_users, manage_institutions, manage_employers, configure_settings
    """
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def description(self) -> str:
        """Get role description"""
        descriptions = {
            AdminRole.COORDINATOR: "Supervisor coordination & scheduling",
            AdminRole.MODERATOR: "Incident/evidence review & moderation",
            AdminRole.COMPLIANCE: "Audit & compliance",
            AdminRole.SYSTEM: "System administration",
        }
        return descriptions.get(self, "Unknown role")


# ============================================================================
# Permission Definitions
# ============================================================================

class Permission(Enum):
    """
    Fine-grained permissions across the system.
    
    Grouped by concern:
    - SUPERVISOR_* : Supervisor assignment operations
    - EVIDENCE_* : Evidence review operations
    - INCIDENT_* : Incident management operations
    - USER_* : User management operations
    - REPORT_* : Reporting operations
    - SYSTEM_* : System operations
    - AUDIT_* : Audit operations
    """
    
    # ========================================================================
    # Supervisor Assignment Permissions (5)
    # ========================================================================
    ASSIGN_SUPERVISOR = "ASSIGN_SUPERVISOR"
    """Assign supervisor to application (admin proposes match)"""
    
    WITHDRAW_SUPERVISOR_ASSIGNMENT = "WITHDRAW_SUPERVISOR_ASSIGNMENT"
    """Withdraw pending supervisor assignment"""
    
    EXTEND_ASSIGNMENT_DEADLINE = "EXTEND_ASSIGNMENT_DEADLINE"
    """Extend deadline for supervisor to respond to assignment"""
    
    OVERRIDE_SUPERVISOR_ACCEPTANCE = "OVERRIDE_SUPERVISOR_ACCEPTANCE"
    """Force-accept supervisor assignment if needed"""
    
    VIEW_SUPERVISOR_ASSIGNMENTS = "VIEW_SUPERVISOR_ASSIGNMENTS"
    """View all supervisor assignments (not just their own)"""
    
    # ========================================================================
    # Evidence Review Permissions (4)
    # ========================================================================
    APPROVE_EVIDENCE = "APPROVE_EVIDENCE"
    """Approve evidence submission for application"""
    
    REJECT_EVIDENCE = "REJECT_EVIDENCE"
    """Reject evidence as insufficient"""
    
    REQUEST_EVIDENCE_REVISION = "REQUEST_EVIDENCE_REVISION"
    """Request student revise and resubmit evidence"""
    
    VIEW_ALL_EVIDENCE = "VIEW_ALL_EVIDENCE"
    """View all student evidence across system"""
    
    # ========================================================================
    # Incident Management Permissions (6)
    # ========================================================================
    ASSIGN_INCIDENT_INVESTIGATOR = "ASSIGN_INCIDENT_INVESTIGATOR"
    """Assign investigator to incident"""
    
    PROPOSE_INCIDENT_RESOLUTION = "PROPOSE_INCIDENT_RESOLUTION"
    """Propose resolution to incident"""
    
    APPROVE_INCIDENT_RESOLUTION = "APPROVE_INCIDENT_RESOLUTION"
    """Approve proposed incident resolution"""
    
    DISMISS_INCIDENT = "DISMISS_INCIDENT"
    """Dismiss incident without resolution"""
    
    VIEW_ALL_INCIDENTS = "VIEW_ALL_INCIDENTS"
    """View all incidents (including private ones)"""
    
    BULK_CLOSE_INCIDENTS = "BULK_CLOSE_INCIDENTS"
    """Bulk close multiple incidents"""
    
    # ========================================================================
    # User Management Permissions (4)
    # ========================================================================
    MANAGE_USERS = "MANAGE_USERS"
    """Create/edit/delete user accounts"""
    
    MANAGE_ADMIN_USERS = "MANAGE_ADMIN_USERS"
    """Manage other admin accounts (grant/revoke roles)"""
    
    RESET_USER_PASSWORD = "RESET_USER_PASSWORD"
    """Reset user password"""
    
    SUSPEND_USER_ACCOUNT = "SUSPEND_USER_ACCOUNT"
    """Suspend/deactivate user account"""
    
    # ========================================================================
    # Institution/Employer Management Permissions (4)
    # ========================================================================
    MANAGE_INSTITUTIONS = "MANAGE_INSTITUTIONS"
    """Manage institution records"""
    
    MANAGE_EMPLOYERS = "MANAGE_EMPLOYERS"
    """Manage employer records"""
    
    VERIFY_INSTITUTION = "VERIFY_INSTITUTION"
    """Mark institution as verified"""
    
    VERIFY_EMPLOYER = "VERIFY_EMPLOYER"
    """Mark employer as verified"""
    
    # ========================================================================
    # Reporting Permissions (5)
    # ========================================================================
    GENERATE_REPORTS = "GENERATE_REPORTS"
    """Generate standard reports"""
    
    GENERATE_COMPLIANCE_REPORT = "GENERATE_COMPLIANCE_REPORT"
    """Generate compliance audit report"""
    
    EXPORT_DATA = "EXPORT_DATA"
    """Export data in bulk"""
    
    SCHEDULE_REPORTS = "SCHEDULE_REPORTS"
    """Schedule automated report generation"""
    
    VIEW_REPORTS = "VIEW_REPORTS"
    """View all reports (not just generated by them)"""
    
    # ========================================================================
    # Audit Permissions (4)
    # ========================================================================
    VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS"
    """View audit/event logs"""
    
    EXPORT_AUDIT_LOGS = "EXPORT_AUDIT_LOGS"
    """Export audit logs for compliance"""
    
    VIEW_USER_ACTIVITY = "VIEW_USER_ACTIVITY"
    """View what actions specific users performed"""
    
    AUDIT_TRAIL_DELETE = "AUDIT_TRAIL_DELETE"
    """Delete/archive old audit logs (regulatory purge)"""
    
    # ========================================================================
    # System Configuration Permissions (5)
    # ========================================================================
    MANAGE_SETTINGS = "MANAGE_SETTINGS"
    """Manage system settings and configuration"""
    
    CONFIGURE_DEADLINES = "CONFIGURE_DEADLINES"
    """Set system-wide default deadlines"""
    
    CONFIGURE_NOTIFICATIONS = "CONFIGURE_NOTIFICATIONS"
    """Configure notification types and templates"""
    
    VIEW_SYSTEM_LOGS = "VIEW_SYSTEM_LOGS"
    """View system/application logs"""
    
    MANAGE_FEATURE_FLAGS = "MANAGE_FEATURE_FLAGS"
    """Enable/disable features"""
    
    # ========================================================================
    # Override Permissions (2)
    # ========================================================================
    OVERRIDE_POLICY = "OVERRIDE_POLICY"
    """Override standard policy (use sparingly)"""
    
    MANUAL_LEDGER_ENTRY = "MANUAL_LEDGER_ENTRY"
    """Manually create audit ledger entries (emergency only)"""


# ============================================================================
# Role-Permission Matrix
# ============================================================================

ROLE_PERMISSIONS: Dict[AdminRole, Set[Permission]] = {
    AdminRole.COORDINATOR: {
        # Supervisor assignment (full control)
        Permission.ASSIGN_SUPERVISOR,
        Permission.WITHDRAW_SUPERVISOR_ASSIGNMENT,
        Permission.EXTEND_ASSIGNMENT_DEADLINE,
        Permission.VIEW_SUPERVISOR_ASSIGNMENTS,
        
        # Evidence review (view only)
        Permission.VIEW_ALL_EVIDENCE,
        
        # Incidents (read-only)
        Permission.VIEW_ALL_INCIDENTS,
        
        # Reporting
        Permission.GENERATE_REPORTS,
        Permission.VIEW_REPORTS,
        
        # Settings
        Permission.CONFIGURE_DEADLINES,
    },
    
    AdminRole.MODERATOR: {
        # Supervisor assignment (limited - can override acceptance)
        Permission.OVERRIDE_SUPERVISOR_ACCEPTANCE,
        Permission.VIEW_SUPERVISOR_ASSIGNMENTS,
        
        # Evidence review (full control)
        Permission.APPROVE_EVIDENCE,
        Permission.REJECT_EVIDENCE,
        Permission.REQUEST_EVIDENCE_REVISION,
        Permission.VIEW_ALL_EVIDENCE,
        
        # Incident management (full control)
        Permission.ASSIGN_INCIDENT_INVESTIGATOR,
        Permission.PROPOSE_INCIDENT_RESOLUTION,
        Permission.APPROVE_INCIDENT_RESOLUTION,
        Permission.DISMISS_INCIDENT,
        Permission.VIEW_ALL_INCIDENTS,
        
        # Reporting
        Permission.GENERATE_REPORTS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_AUDIT_LOGS,
    },
    
    AdminRole.COMPLIANCE: {
        # Supervisor assignment (view only)
        Permission.VIEW_SUPERVISOR_ASSIGNMENTS,
        
        # Evidence (view only)
        Permission.VIEW_ALL_EVIDENCE,
        
        # Incidents (view only)
        Permission.VIEW_ALL_INCIDENTS,
        
        # Reporting (specialized)
        Permission.GENERATE_COMPLIANCE_REPORT,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_DATA,
        Permission.SCHEDULE_REPORTS,
        
        # Audit (full control)
        Permission.VIEW_AUDIT_LOGS,
        Permission.EXPORT_AUDIT_LOGS,
        Permission.VIEW_USER_ACTIVITY,
        Permission.AUDIT_TRAIL_DELETE,
    },
    
    AdminRole.SYSTEM: {
        # User management (full control)
        Permission.MANAGE_USERS,
        Permission.MANAGE_ADMIN_USERS,
        Permission.RESET_USER_PASSWORD,
        Permission.SUSPEND_USER_ACCOUNT,
        
        # Institution/Employer management
        Permission.MANAGE_INSTITUTIONS,
        Permission.MANAGE_EMPLOYERS,
        Permission.VERIFY_INSTITUTION,
        Permission.VERIFY_EMPLOYER,
        
        # System configuration (full control)
        Permission.MANAGE_SETTINGS,
        Permission.CONFIGURE_NOTIFICATIONS,
        Permission.VIEW_SYSTEM_LOGS,
        Permission.MANAGE_FEATURE_FLAGS,
        
        # Audit/Reporting (all access)
        Permission.VIEW_AUDIT_LOGS,
        Permission.EXPORT_AUDIT_LOGS,
        Permission.EXPORT_DATA,
        
        # Emergency overrides
        Permission.OVERRIDE_POLICY,
        Permission.MANUAL_LEDGER_ENTRY,
    },
}


# ============================================================================
# Admin User Model
# ============================================================================

@dataclass
class AdminUser:
    """
    Represents an admin user with role and permissions.
    
    Can have multiple roles (e.g., both MODERATOR and COMPLIANCE).
    """
    user_id: str  # UUID
    name: str
    email: str
    roles: Set[AdminRole] = field(default_factory=set)
    assigned_at: datetime = field(default_factory=datetime.now)
    approved_by: Optional[str] = None  # UUID of who approved this admin
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if user has permission"""
        for role in self.roles:
            if permission in ROLE_PERMISSIONS.get(role, set()):
                return True
        return False
    
    def has_any_permission(self, permissions: List[Permission]) -> bool:
        """Check if user has ANY of the permissions"""
        return any(self.has_permission(p) for p in permissions)
    
    def has_all_permissions(self, permissions: List[Permission]) -> bool:
        """Check if user has ALL of the permissions"""
        return all(self.has_permission(p) for p in permissions)
    
    def get_all_permissions(self) -> Set[Permission]:
        """Get all permissions across all roles"""
        all_perms = set()
        for role in self.roles:
            all_perms.update(ROLE_PERMISSIONS.get(role, set()))
        return all_perms
    
    def add_role(self, role: AdminRole) -> None:
        """Grant admin role"""
        self.roles.add(role)
    
    def remove_role(self, role: AdminRole) -> None:
        """Revoke admin role"""
        self.roles.discard(role)
    
    def to_dict(self) -> Dict[str, any]:
        """Convert to dict (for storage/API)"""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "roles": [r.value for r in self.roles],
            "permissions": [p.value for p in self.get_all_permissions()],
            "assigned_at": self.assigned_at.isoformat(),
            "approved_by": self.approved_by,
        }


# ============================================================================
# Authorization Policies Using Admin Roles
# ============================================================================

def can_assign_supervisor(admin: AdminUser) -> bool:
    """Only COORDINATOR can assign supervisors"""
    return admin.has_permission(Permission.ASSIGN_SUPERVISOR)


def can_approve_evidence(admin: AdminUser) -> bool:
    """Only MODERATOR can approve evidence"""
    return admin.has_permission(Permission.APPROVE_EVIDENCE)


def can_propose_incident_resolution(admin: AdminUser) -> bool:
    """Only MODERATOR can propose resolutions"""
    return admin.has_permission(Permission.PROPOSE_INCIDENT_RESOLUTION)


def can_approve_incident_resolution(admin: AdminUser) -> bool:
    """Only MODERATOR can approve resolutions"""
    return admin.has_permission(Permission.APPROVE_INCIDENT_RESOLUTION)


def can_dismiss_incident(admin: AdminUser) -> bool:
    """Only MODERATOR can dismiss incidents"""
    return admin.has_permission(Permission.DISMISS_INCIDENT)


def can_view_all_incidents(admin: AdminUser) -> bool:
    """MODERATOR and COMPLIANCE can view all incidents"""
    return admin.has_permission(Permission.VIEW_ALL_INCIDENTS)


def can_view_audit_logs(admin: AdminUser) -> bool:
    """COMPLIANCE and SYSTEM can view audit logs"""
    return admin.has_permission(Permission.VIEW_AUDIT_LOGS)


def can_manage_users(admin: AdminUser, target_role: AdminRole) -> bool:
    """
    Only SYSTEM can manage users.
    Additional check: Can't promote someone to SYSTEM role without SYSTEM permission.
    """
    if target_role == AdminRole.SYSTEM:
        # Only SYSTEM admins can grant SYSTEM role
        return admin.has_permission(Permission.MANAGE_ADMIN_USERS)
    
    # Other roles can be granted by SYSTEM
    return admin.has_permission(Permission.MANAGE_USERS)


def can_generate_compliance_report(admin: AdminUser) -> bool:
    """Only COMPLIANCE can generate compliance reports"""
    return admin.has_permission(Permission.GENERATE_COMPLIANCE_REPORT)


def can_view_system_logs(admin: AdminUser) -> bool:
    """Only SYSTEM can view system logs"""
    return admin.has_permission(Permission.VIEW_SYSTEM_LOGS)


def can_override_policy(admin: AdminUser) -> bool:
    """Only SYSTEM can override policies (emergency only)"""
    return admin.has_permission(Permission.OVERRIDE_POLICY)


# ============================================================================
# Admin Role Registry
# ============================================================================

class AdminRoleRegistry:
    """
    Central registry for admin roles and permissions.
    
    Usage:
        # Check if user can perform action
        registry = AdminRoleRegistry()
        can_assign = registry.can_perform(admin_user, Permission.ASSIGN_SUPERVISOR)
        
        # List all permissions for role
        coordinator_perms = registry.get_role_permissions(AdminRole.COORDINATOR)
        
        # Get all admins with role
        coordinators = registry.get_users_with_role(AdminRole.COORDINATOR)
    """
    
    @classmethod
    def get_role_permissions(cls, role: AdminRole) -> Set[Permission]:
        """Get all permissions for a role"""
        return ROLE_PERMISSIONS.get(role, set())
    
    @classmethod
    def can_perform(cls, admin: AdminUser, permission: Permission) -> bool:
        """Check if admin has permission"""
        return admin.has_permission(permission)
    
    @classmethod
    def list_roles(cls) -> List[str]:
        """List all available role names"""
        return [r.value for r in AdminRole]
    
    @classmethod
    def list_permissions(cls) -> List[str]:
        """List all available permission names"""
        return [p.value for p in Permission]
    
    @classmethod
    def get_role_description(cls, role: AdminRole) -> str:
        """Get role description"""
        descriptions = {
            AdminRole.COORDINATOR: "Supervisor coordination & scheduling",
            AdminRole.MODERATOR: "Incident/evidence review & moderation",
            AdminRole.COMPLIANCE: "Audit & compliance",
            AdminRole.SYSTEM: "System administration",
        }
        return descriptions.get(role, "Unknown role")
    
    @classmethod
    def permission_requires_role(cls, permission: Permission) -> List[AdminRole]:
        """Get which roles can perform permission"""
        roles_with_perm = []
        for role, perms in ROLE_PERMISSIONS.items():
            if permission in perms:
                roles_with_perm.append(role)
        return roles_with_perm
    
    @classmethod
    def validate_role(cls, role: AdminRole) -> bool:
        """Validate that role exists"""
        return role in AdminRole
    
    @classmethod
    def validate_permission(cls, permission: Permission) -> bool:
        """Validate that permission exists"""
        return permission in Permission


# ============================================================================
# Role Change Audit Trail
# ============================================================================

@dataclass
class RoleChangeEvent:
    """
    Audit event for role changes.
    
    Immutable record of who granted/revoked what role to whom, and why.
    """
    event_id: str  # UUID
    timestamp: datetime
    actor_id: str  # Who made the change (UUID)
    actor_role: AdminRole  # Their role at time of change
    actor_name: str  # Their name
    target_user_id: str  # Whose role changed (UUID)
    target_user_name: str  # Their name
    change_type: str  # "ROLE_GRANTED" or "ROLE_REVOKED"
    role_changed: AdminRole  # Which role was granted/revoked
    reason: Optional[str] = None  # Why
    
    def to_dict(self) -> Dict[str, any]:
        """Convert to dict (for storage/logging)"""
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp.isoformat(),
            "actor_id": self.actor_id,
            "actor_role": self.actor_role.value,
            "actor_name": self.actor_name,
            "target_user_id": self.target_user_id,
            "target_user_name": self.target_user_name,
            "change_type": self.change_type,
            "role_changed": self.role_changed.value,
            "reason": self.reason,
        }
