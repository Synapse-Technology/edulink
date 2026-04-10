/**
 * RoleBasedAccess Component
 * 
 * Reusable component for conditional rendering based on user roles/permissions.
 * Eliminates repetitive inline role checks in components.
 * 
 * Usage:
 * <RoleBasedAccess roles={['student']}>
 *   <ApplyButton />
 * </RoleBasedAccess>
 * 
 * <RoleBasedAccess permissions={['review_evidence']} fallback={<LoginPrompt />}>
 *   <ReviewButton />
 * </RoleBasedAccess>
 */

import React from 'react';
import type { User } from '../../types';
import {
  hasRole,
  hasAnyPermission,
  hasAllPermissions,
} from '../../utils/permissions';

interface RoleBasedAccessProps {
  children: React.ReactNode;
  /**
   * Check against specific roles (OR logic - user must have ANY of these roles)
   */
  roles?: string[];
  /**
   * Check against specific permissions (OR logic - user must have ANY of these)
   */
  permissions?: string[];
  /**
   * If true, REQUIRE ALL permissions instead of ANY
   */
  requireAllPermissions?: boolean;
  /**
   * Current user object
   */
  user?: User | null;
  /**
   * Fallback JSX if access denied (default: null - renders nothing)
   */
  fallback?: React.ReactNode;
}

/**
 * RoleBasedAccess Component
 * 
 * Conditionally renders content based on user role or permissions.
 * Prevents repetitive role checks scattered across components.
 * 
 * @example
 * // Restrict to students only
 * <RoleBasedAccess roles={['student']}>
 *   <ApplyButton />
 * </RoleBasedAccess>
 * 
 * @example
 * // Allow supervisors or admins with a fallback
 * <RoleBasedAccess 
 *   roles={['supervisor', 'institution_admin']}
 *   fallback={<p>You don't have permission to review evidence</p>}
 * >
 *   <ReviewEvidenceForm />
 * </RoleBasedAccess>
 * 
 * @example
 * // Require ALL permissions
 * <RoleBasedAccess
 *   permissions={['manage_applications', 'view_analytics']}
 *   requireAllPermissions={true}
 *   fallback={<AccessDenied />}
 * >
 *   <AdminPanel />
 * </RoleBasedAccess>
 */
export const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  children,
  roles,
  permissions,
  requireAllPermissions = false,
  user,
  fallback = null,
}) => {
  // If no access criteria specified, just render children
  if (!roles && !permissions) {
    return <>{children}</>;
  }

  // Check role-based access
  if (roles && roles.length > 0) {
    if (!hasRole(user || null, roles)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAllPermissions
      ? hasAllPermissions(user || null, permissions)
      : hasAnyPermission(user || null, permissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

/**
 * AdminRoleBasedAccess Component
 * 
 * Similar to RoleBasedAccess but for admin users.
 * 
 * @example
 * <AdminRoleBasedAccess roles={['SUPER_ADMIN', 'PLATFORM_ADMIN']}>
 *   <UserManagementPanel />
 * </AdminRoleBasedAccess>
 */
interface AdminRoleBasedAccessProps {
  children: React.ReactNode;
  roles?: string[];
  admin?: any; // AdminUser type
  fallback?: React.ReactNode;
}

import { hasAdminRole } from '../../utils/permissions';

export const AdminRoleBasedAccess: React.FC<AdminRoleBasedAccessProps> = ({
  children,
  roles,
  admin,
  fallback = null,
}) => {
  if (!roles || roles.length === 0) {
    return <>{children}</>;
  }

  if (!hasAdminRole(admin || null, roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * RequireExactRole Component
 * 
 * Strict component that requires EXACT role match (not any in a list).
 * Useful when only one specific role should have access.
 * 
 * @example
 * <RequireExactRole role="supervisor">
 *   <SupervisorOnlyPanel />
 * </RequireExactRole>
 */
interface RequireExactRoleProps {
  children: React.ReactNode;
  role: string;
  user?: User | null;
  fallback?: React.ReactNode;
}

export const RequireExactRole: React.FC<RequireExactRoleProps> = ({
  children,
  role,
  user,
  fallback = null,
}) => {
  if (!user || user.role !== role) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * ProtectedAction Component
 * 
 * Wraps action buttons to disable them when user lacks permissions.
 * Shows a title/tooltip explaining why action is disabled.
 * 
 * @example
 * <ProtectedAction
 *   permission="apply_for_internship"
 *   disabledTooltip="Only students can apply for internships"
 *   user={currentUser}
 * >
 *   <button onClick={handleApply}>Apply Now</button>
 * </ProtectedAction>
 */
interface ProtectedActionProps {
  children: React.ReactElement<any>;
  permission?: string;
  role?: string;
  user?: User | null;
  disabledTooltip?: string;
  className?: string;
}

export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  children,
  permission,
  role,
  user,
  disabledTooltip,
  className,
}) => {
  let hasAccess = true;

  if (role) {
    hasAccess = hasRole(user || null, [role]);
  } else if (permission) {
    hasAccess = hasAnyPermission(user || null, [permission]);
  }

  if (hasAccess) {
    return children;
  }

  // Return disabled version of button with tooltip
  return React.cloneElement(children, {
    disabled: true,
    title: disabledTooltip || 'You do not have permission to perform this action',
    className: `${children.props.className || ''} ${className || ''}`.trim(),
  });
};

/**
 * PermissionGate Component
 * 
 * A gate that shows different content based on permission level.
 * Useful for showing degraded UI to users without full permissions.
 * 
 * @example
 * <PermissionGate
 *   user={currentUser}
 *   full={<AdminPanel />}
 *   partial={<ReadOnlyPanel />}
 *   none={<UpgradePrompt />}
 *   fullRoles={['institution_admin']}
 *   partialRoles={['supervisor']}
 * />
 */
interface PermissionGateProps {
  user?: User | null;
  full?: React.ReactNode;
  partial?: React.ReactNode;
  none?: React.ReactNode;
  fullRoles?: string[];
  partialRoles?: string[];
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  user,
  full,
  partial,
  none,
  fullRoles = [],
  partialRoles = [],
}) => {
  if (fullRoles.length > 0 && hasRole(user || null, fullRoles)) {
    return <>{full}</>;
  }

  if (partialRoles.length > 0 && hasRole(user || null, partialRoles)) {
    return <>{partial}</>;
  }

  return <>{none}</>;
};
