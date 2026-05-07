export type UserRole =
  | 'student'
  | 'institution_admin'
  | 'employer_admin'
  | 'supervisor'
  | 'system_admin';

export type Portal = 'student' | 'employer' | 'institution' | 'admin';
export type ProtectedPortal = 'institution' | 'employer';

export interface RoleAccessUser {
  role: string;
  institution_id?: string | null;
  employer_id?: string | null;
}

export const isStudent = (user: RoleAccessUser | null | undefined): boolean =>
  user?.role === 'student';

export const isEmployerAdmin = (user: RoleAccessUser | null | undefined): boolean =>
  user?.role === 'employer_admin';

export const isInstitutionAdmin = (user: RoleAccessUser | null | undefined): boolean =>
  user?.role === 'institution_admin';

export const isSupervisor = (user: RoleAccessUser | null | undefined): boolean =>
  user?.role === 'supervisor';

export const isEmployerSupervisor = (user: RoleAccessUser | null | undefined): boolean =>
  isSupervisor(user) && Boolean(user?.employer_id);

export const isInstitutionAssessor = (user: RoleAccessUser | null | undefined): boolean =>
  isSupervisor(user) && Boolean(user?.institution_id);

export const hasPortalAccess = (
  user: RoleAccessUser | null | undefined,
  portal?: ProtectedPortal
): boolean => {
  if (!user) return false;
  if (!portal) return true;
  if (portal === 'institution') {
    return isInstitutionAdmin(user) || isInstitutionAssessor(user);
  }
  if (portal === 'employer') {
    return isEmployerAdmin(user) || isEmployerSupervisor(user);
  }
  return true;
};

export const inferPortalForUser = (user: RoleAccessUser | null | undefined): Portal | null => {
  if (!user) return null;
  if (user.role === 'system_admin') return 'admin';
  if (isEmployerAdmin(user)) return 'employer';
  if (isInstitutionAdmin(user)) return 'institution';
  if (isEmployerSupervisor(user) && !isInstitutionAssessor(user)) return 'employer';
  if (isInstitutionAssessor(user)) return 'institution';
  return 'student';
};
