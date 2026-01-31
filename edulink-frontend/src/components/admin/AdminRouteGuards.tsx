import React from 'react';
import { Navigate } from 'react-router-dom';

// Admin Public Route - redirects to admin dashboard if already authenticated
export const AdminPublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = localStorage.getItem('adminRole');
  
  // If admin is authenticated, redirect to admin dashboard
  if (adminToken && adminRole) {
    return <Navigate to="/dashboard/admin" replace />;
  }
  
  return <>{children}</>;
};

// Admin Protected Route - requires admin authentication
export const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const adminRole = localStorage.getItem('adminRole');
  
  // If no admin token or role, redirect to admin login
  if (!adminToken || !adminRole) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Additional role validation could be added here
  const validAdminRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'AUDITOR'];
  if (!validAdminRoles.includes(adminRole)) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};