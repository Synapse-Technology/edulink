export type Portal = 'student' | 'employer' | 'institution' | 'admin';
export type ProtectedPortal = 'institution' | 'employer';

export interface AuthRouteUser {
  role: string;
  institution_id?: string;
  employer_id?: string;
}

export const inferPortalForUser = (user: AuthRouteUser | null): Portal | null => {
  if (!user) return null;

  if (user.role === 'system_admin') {
    return 'admin';
  }
  if (user.role === 'employer' || user.role === 'employer_admin') {
    return 'employer';
  }
  if (user.role === 'institution' || user.role === 'institution_admin') {
    return 'institution';
  }
  if (user.role === 'supervisor') {
    if (user.employer_id && !user.institution_id) {
      return 'employer';
    }
    if (user.institution_id) {
      return 'institution';
    }
  }

  return 'student';
};

export const getDashboardPath = (
  user: AuthRouteUser | null,
  currentPortal?: string | null
): string => {
  if (!user) return '/dashboard/student';

  if (user.role === 'employer' || user.role === 'employer_admin') {
    return '/employer/dashboard';
  }
  if (user.role === 'institution' || user.role === 'institution_admin') {
    return '/institution/dashboard';
  }
  if (user.role === 'supervisor') {
    if (currentPortal === 'employer' && user.employer_id) {
      return '/employer/supervisor/dashboard';
    }
    if (currentPortal === 'institution' && user.institution_id) {
      return '/institution/supervisor-dashboard';
    }
    if (user.employer_id && !user.institution_id) {
      return '/employer/supervisor/dashboard';
    }
    if (user.institution_id) {
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
  if (!portal) return true;
  if (portal === 'institution') {
    return ['institution', 'institution_admin'].includes(user.role) || (user.role === 'supervisor' && Boolean(user.institution_id));
  }
  if (portal === 'employer') {
    return ['employer', 'employer_admin'].includes(user.role) || (user.role === 'supervisor' && Boolean(user.employer_id));
  }
  return true;
};

export const portalMatchesUser = (
  user: AuthRouteUser,
  portal: Portal
): boolean => {
  if (portal === 'admin') return user.role === 'system_admin';
  if (portal === 'student') return user.role === 'student';
  if (portal === 'employer') {
    return ['employer', 'employer_admin'].includes(user.role) || (user.role === 'supervisor' && Boolean(user.employer_id));
  }
  if (portal === 'institution') {
    return ['institution', 'institution_admin'].includes(user.role) || (user.role === 'supervisor' && Boolean(user.institution_id));
  }
  return false;
};
