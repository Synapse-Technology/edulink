import React, { createContext, useContext } from 'react';
import { useAuthStore } from '../stores/authStore';
import { ApiError } from '../services';

/**
 * DEPRECATED: AdminAuthContext is now a thin wrapper around unified Zustand store
 * 
 * Migration path:
 * - Old code using useAdminAuth() still works via this context
 * - New code should use useAuth() from AuthContext instead
 * - Admin tokens now use HttpOnly cookies (same as regular users)
 * - No more localStorage token storage
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

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

/**
 * AdminAuthProvider - Thin wrapper around unified Zustand store
 * Maintains backward compatibility while using the new unified auth system
 */
export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const store = useAuthStore();

  const login = async (email: string, password: string) => {
    try {
      await store.loginAdmin(email, password);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Admin login error:', error);
      throw new Error('Invalid admin email or password');
    }
  };

  const logout = () => {
    store.logout();
  };

  const refreshToken = async () => {
    // Token refresh happens automatically via API client interceptors
    // HttpOnly cookies handle refresh transparently
    console.info('Token refresh is handled automatically via HttpOnly cookies');
  };

  // Map store admin data to context interface for backward compatibility
  const admin: AdminUser | null = store.admin
    ? {
        id: store.admin.id,
        email: store.admin.email,
        first_name: store.admin.firstName,
        last_name: store.admin.lastName,
        role: store.admin.role,
        platform_staff_role: store.admin.role, // Consolidated to single role field
        permissions: store.admin.permissions || [],
        createdAt: new Date().toISOString(), // From store if available
        lastLogin: new Date().toISOString(), // From store if available
      }
    : null;

  const value: AdminAuthContextType = {
    admin,
    token: store.isAdmin ? 'present-in-httponly-cookie' : null, // Token is in HttpOnly cookie, not accessible here
    isAuthenticated: store.isAdmin,
    isLoading: store.isLoading,
    login,
    logout,
    refreshToken,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};