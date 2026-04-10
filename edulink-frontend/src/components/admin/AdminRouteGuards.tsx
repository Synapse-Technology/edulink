import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Extracts the admin role from the adminUser JSON stored in localStorage
 * BUGFIX: Previously looked for 'adminRole' key which was never stored
 * Now correctly extracts from 'adminUser' JSON object
 */
const getAdminRole = (): string | null => {
  try {
    const adminUserStr = localStorage.getItem('adminUser');
    if (!adminUserStr) return null;
    
    const adminUser = JSON.parse(adminUserStr);
    return adminUser.role || adminUser.platform_staff_role || null;
  } catch (error) {
    console.warn('Failed to parse adminUser from localStorage:', error);
    return null;
  }
};

// Admin Public Route - redirects to admin dashboard if already authenticated
export const AdminPublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = getAdminRole();
  
  // If admin is authenticated, redirect to admin dashboard
  if (adminToken && adminRole) {
    return <Navigate to="/dashboard/admin" replace />;
  }
  
  return <>{children}</>;
};

// Admin Protected Route - requires admin authentication
export const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = getAdminRole();
  
  // If no admin token or role, redirect to admin login
  if (!adminToken || !adminRole) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Validate admin role is one of the allowed roles
  const validAdminRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'AUDITOR'];
  if (!validAdminRoles.includes(adminRole)) {
    // Invalid role, redirect to login
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};