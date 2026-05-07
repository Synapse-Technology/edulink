/**
 * Centralized Permission Utility
 * 
 * Single source of truth for determining user permissions.
 * Eliminates scattered role checks across components.
 * 
 * Benefits:
 * - Audit: All permissions in one place
 * - Consistency: Same checks everywhere
 * - Maintainability: Change once, applies everywhere
 * - Testing: Single point to test permission logic
 */

import type { User } from '../types';
import {
  isEmployerSupervisor as hasEmployerSupervisorPortal,
  isInstitutionAssessor as hasInstitutionAssessorPortal,
  isSupervisor as hasSupervisorRole,
} from './roleAccess';

/**
 * Admin User Type (from AdminAuthContext)
 */
interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  platform_staff_role?: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}

// ============================================================================
// REGULAR USER PERMISSIONS (Student, Employer, Institution, Supervisors)
// ============================================================================

/**
 * Check if user can apply for an internship opportunity
 * Only students can apply
 */
export const canApplyForInternship = (user: User | null): boolean => {
  return user?.role === 'student';
};

/**
 * Check if user can view internship opportunities
 * All authenticated users can view
 */
export const canViewOpportunities = (user: User | null): boolean => {
  return user !== null && user !== undefined;
};

/**
 * Check if user can withdraw an application
 * Only the student who applied can withdraw
 */
export const canWithdrawApplication = (
  user: User | null,
  studentId: string | undefined
): boolean => {
  return user?.role === 'student' && user?.id === studentId;
};

/**
 * Check if user can review student evidence
 * Supervisors, institution admins, and employers can review
 */
export const canReviewEvidence = (user: User | null): boolean => {
  return user !== null && ['supervisor', 'institution_admin', 'employer_admin'].includes(user?.role);
};

/**
 * Check if user can manage internship applications
 * Employers, institution admins, and supervisors can manage
 */
export const canManageApplications = (user: User | null): boolean => {
  return (
    user !== null &&
    ['employer_admin', 'institution_admin'].includes(user?.role)
  );
};

/**
 * Check if user can create internship opportunities
 * Only employers and institution admins can create
 */
export const canCreateOpportunity = (user: User | null): boolean => {
  return user !== null && ['employer_admin', 'institution_admin'].includes(user?.role);
};

/**
 * Check if user can edit an opportunity
 * Creator or institution admin can edit
 */
export const canEditOpportunity = (
  user: User | null,
  creatorId: string | undefined
): boolean => {
  return (
    user !== null &&
    (user?.id === creatorId || user?.role === 'institution_admin')
  );
};

/**
 * Check if user can publish/unpublish an opportunity
 * Creators and institution admins can manage publication
 */
export const canManageOpportunityPublication = (
  user: User | null,
  creatorId: string | undefined
): boolean => {
  return (
    user !== null &&
    (user?.id === creatorId || user?.role === 'institution_admin')
  );
};

/**
 * Check if user can view employer dashboard
 * Employers and employer admins
 */
export const canViewEmployerDashboard = (user: User | null): boolean => {
  return user !== null && user.role === 'employer_admin';
};

export const canViewEmployerSupervisorDashboard = (user: User | null): boolean => {
  return hasEmployerSupervisorPortal(user);
};

/**
 * Check if user can view institution dashboard
 * Institution staff and admins
 */
export const canViewInstitutionDashboard = (user: User | null): boolean => {
  return user !== null && user.role === 'institution_admin';
};

export const canViewInstitutionAssessorDashboard = (user: User | null): boolean => {
  return hasInstitutionAssessorPortal(user);
};

/**
 * Check if user can view student dashboard/profile
 * Students can only view their own, admins can view all
 */
export const canViewStudentProfile = (
  currentUser: User | null,
  targetStudentId: string | undefined
): boolean => {
  if (!currentUser || !targetStudentId) return false;

  // Students can only view their own profile
  if (currentUser.role === 'student') {
    return currentUser.id === targetStudentId;
  }

  // Institution admins can view their students
  if (
    currentUser.role === 'institution_admin' &&
    currentUser.institution_id === targetStudentId
  ) {
    return true;
  }

  // System admins can view all
  if (currentUser.role === 'system_admin') {
    return true;
  }

  return false;
};

/**
 * Check if user can manage user affiliations
 * Institution admins and system admins
 */
export const canManageAffiliations = (user: User | null): boolean => {
  return user !== null && ['institution_admin', 'system_admin'].includes(user?.role);
};

/**
 * Check if user can assign supervisors
 * Institution admins and employers
 */
export const canAssignSupervisors = (user: User | null): boolean => {
  return user !== null && ['institution_admin', 'employer_admin'].includes(user?.role);
};

/**
 * Check if user is a supervisor (can evaluate internships)
 */
export const isSupervisor = (user: User | null): boolean => {
  return hasSupervisorRole(user);
};

export const isEmployerSupervisor = (user: User | null): boolean => {
  return hasEmployerSupervisorPortal(user);
};

export const isInstitutionAssessor = (user: User | null): boolean => {
  return hasInstitutionAssessorPortal(user);
};

// ============================================================================
// ADMIN/PLATFORM PERMISSIONS
// ============================================================================

/**
 * Check if admin can access the admin panel
 */
export const canAccessAdminPanel = (admin: AdminUser | null): boolean => {
  return admin !== null && admin !== undefined;
};

/**
 * Check if admin can manage users (create, edit, deactivate)
 * SUPER_ADMIN and PLATFORM_ADMIN only
 */
export const canManageUsers = (admin: AdminUser | null): boolean => {
  return admin !== null && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(admin.role);
};

/**
 * Check if admin can manage institutions
 * SUPER_ADMIN and PLATFORM_ADMIN only
 */
export const canManageInstitutions = (admin: AdminUser | null): boolean => {
  return admin !== null && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(admin.role);
};

/**
 * Check if admin can manage employers
 * SUPER_ADMIN and PLATFORM_ADMIN only
 */
export const canManageEmployers = (admin: AdminUser | null): boolean => {
  return admin !== null && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(admin.role);
};

/**
 * Check if admin can view audit logs
 * SUPER_ADMIN, PLATFORM_ADMIN, and AUDITOR
 */
export const canViewAuditLogs = (admin: AdminUser | null): boolean => {
  return (
    admin !== null &&
    ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'AUDITOR'].includes(admin.role)
  );
};

/**
 * Check if admin can moderate content
 * SUPER_ADMIN, PLATFORM_ADMIN, and MODERATOR
 */
export const canModerateContent = (admin: AdminUser | null): boolean => {
  return (
    admin !== null &&
    ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR'].includes(admin.role)
  );
};

/**
 * Check if admin can manage system settings
 * SUPER_ADMIN only
 */
export const canManageSystemSettings = (admin: AdminUser | null): boolean => {
  return admin?.role === 'SUPER_ADMIN';
};

/**
 * Check if admin can view system analytics
 * SUPER_ADMIN and PLATFORM_ADMIN
 */
export const canViewAnalytics = (admin: AdminUser | null): boolean => {
  return admin !== null && ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(admin.role);
};

/**
 * Get admin display role name
 */
export const getAdminRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrator',
    PLATFORM_ADMIN: 'Platform Administrator',
    MODERATOR: 'Moderator',
    AUDITOR: 'Auditor',
  };
  return roleNames[role] || role;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get array of permissions for a given user
 */
export const getUserPermissions = (user: User | null): string[] => {
  if (!user) return [];

  const permissions: string[] = [];

  if (canApplyForInternship(user)) permissions.push('apply_for_internship');
  if (canReviewEvidence(user)) permissions.push('review_evidence');
  if (canManageApplications(user)) permissions.push('manage_applications');
  if (canCreateOpportunity(user)) permissions.push('create_opportunity');
  if (canViewEmployerDashboard(user)) permissions.push('view_employer_dashboard');
  if (canViewInstitutionDashboard(user)) permissions.push('view_institution_dashboard');
  if (isSupervisor(user)) permissions.push('supervise_internship');
  if (canManageAffiliations(user)) permissions.push('manage_affiliations');

  return permissions;
};

/**
 * Get array of permissions for a given admin
 */
export const getAdminPermissions = (admin: AdminUser | null): string[] => {
  if (!admin) return [];

  const permissions: string[] = [];

  if (canAccessAdminPanel(admin)) permissions.push('access_admin_panel');
  if (canManageUsers(admin)) permissions.push('manage_users');
  if (canManageInstitutions(admin)) permissions.push('manage_institutions');
  if (canManageEmployers(admin)) permissions.push('manage_employers');
  if (canViewAuditLogs(admin)) permissions.push('view_audit_logs');
  if (canModerateContent(admin)) permissions.push('moderate_content');
  if (canViewAnalytics(admin)) permissions.push('view_analytics');
  if (canManageSystemSettings(admin)) permissions.push('manage_system_settings');

  return permissions;
};

/**
 * Check if user has any of the given permissions
 */
export const hasAnyPermission = (
  user: User | null,
  requiredPermissions: string[]
): boolean => {
  const userPermissions = getUserPermissions(user);
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

/**
 * Check if user has all of the given permissions
 */
export const hasAllPermissions = (
  user: User | null,
  requiredPermissions: string[]
): boolean => {
  const userPermissions = getUserPermissions(user);
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

/**
 * Check if user role matches any of the allowed roles
 */
export const hasRole = (user: User | null, allowedRoles: string[]): boolean => {
  return user !== null && allowedRoles.includes(user.role);
};

/**
 * Check if admin role matches any of the allowed roles
 */
export const hasAdminRole = (admin: AdminUser | null, allowedRoles: string[]): boolean => {
  return admin !== null && allowedRoles.includes(admin.role);
};
