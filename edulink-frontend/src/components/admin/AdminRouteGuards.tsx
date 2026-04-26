import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const validAdminRoles = [
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
  'MODERATOR',
  'AUDITOR',
];

const isValidAdminRole = (role?: string | null) =>
  !!role && validAdminRoles.includes(role);

// Admin Public Route - redirects to admin dashboard if already authenticated
export const AdminPublicRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { admin, isAdmin } = useAuthStore();

  // If admin is authenticated, redirect to admin dashboard
  if (isAdmin && isValidAdminRole(admin?.role)) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return <>{children}</>;
};

// Admin Protected Route - requires admin authentication
export const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { admin, isAdmin } = useAuthStore();

  // If no active admin session, redirect to admin login.
  // Session validity is enforced by HttpOnly cookies and API 401 handling.
  if (!isAdmin || !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Validate admin role is one of the allowed roles
  if (!isValidAdminRole(admin.role)) {
    // Invalid role, redirect to login
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
