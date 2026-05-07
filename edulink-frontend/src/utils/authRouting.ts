import {
  hasPortalAccess as userHasPortalAccess,
  inferPortalForUser as inferUserPortal,
  isEmployerAdmin,
  isEmployerSupervisor,
  isInstitutionAdmin,
  isInstitutionAssessor,
  type Portal,
  type ProtectedPortal,
} from './roleAccess';

export type { Portal, ProtectedPortal };

export interface AuthRouteUser {
  role: string;
  institution_id?: string;
  employer_id?: string;
}

export const inferPortalForUser = (user: AuthRouteUser | null): Portal | null => {
  return inferUserPortal(user);
};

export const getDashboardPath = (
  user: AuthRouteUser | null,
  currentPortal?: string | null
): string => {
  if (!user) return '/dashboard/student';

  if (isEmployerAdmin(user)) {
    return '/employer/dashboard';
  }
  if (isInstitutionAdmin(user)) {
    return '/institution/dashboard';
  }
  if (user.role === 'supervisor') {
    if (currentPortal === 'employer' && isEmployerSupervisor(user)) {
      return '/employer/supervisor/dashboard';
    }
    if (currentPortal === 'institution' && isInstitutionAssessor(user)) {
      return '/institution/supervisor-dashboard';
    }
    if (isEmployerSupervisor(user) && !isInstitutionAssessor(user)) {
      return '/employer/supervisor/dashboard';
    }
    if (isInstitutionAssessor(user)) {
      return '/institution/supervisor-dashboard';
    }
    return '/login';
  }
  if (user.role === 'system_admin') {
    return '/admin';
  }
  return '/dashboard/student';
};

export const hasPortalAccess = (
  user: AuthRouteUser,
  portal?: ProtectedPortal
): boolean => {
  return userHasPortalAccess(user, portal);
};

export const portalMatchesUser = (
  user: AuthRouteUser,
  portal: Portal
): boolean => {
  if (portal === 'admin') return user.role === 'system_admin';
  if (portal === 'student') return user.role === 'student';
  if (portal === 'employer') {
    return isEmployerAdmin(user) || isEmployerSupervisor(user);
  }
  if (portal === 'institution') {
    return isInstitutionAdmin(user) || isInstitutionAssessor(user);
  }
  return false;
};
