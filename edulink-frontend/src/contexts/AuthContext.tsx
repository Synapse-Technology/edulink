import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { ApiError } from '../services';
import type { User } from '../types';

// Extended AdminUser type - matches permissions.ts expectations
interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  permissions?: string[];
  createdAt?: string;
  lastLogin?: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution';
  institution: string;
  phone: string;
  [key: string]: any;
}

interface AuthContextType {
  // User-focused properties
  user: User | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentPortal: 'student' | 'employer' | 'institution' | 'admin' | null;
  isLoading: boolean;
  
  // User-focused actions
  login: (email: string, password: string) => Promise<void>;
  loginEmployer: (email: string, password: string) => Promise<void>;
  loginInstitution: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  
  // Admin-focused actions
  loginAdmin: (email: string, password: string) => Promise<void>;
  
  // Common actions
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  updateAdmin: (adminData: Partial<AdminUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Wraps the app and provides unified auth context
 * Both regular users and admin users share the same underlying Zustand store
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const store = useAuthStore();
  
  // Wrapper for regular user login with error handling
  const login = async (email: string, password: string) => {
    try {
      await store.login({ email, password });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginEmployer = async (email: string, password: string) => {
    try {
      await store.loginEmployer({ email, password });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Employer login failed:', error);
      throw error;
    }
  };

  const loginInstitution = async (email: string, password: string) => {
    try {
      await store.loginInstitution({ email, password });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Institution login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      await store.register(userData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Registration failed:', error);
      throw error;
    }
  };

  // Wrapper for admin login with error handling
  const loginAdmin = async (email: string, password: string) => {
    try {
      await store.loginAdmin(email, password);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Admin login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await store.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user: store.user as User | null,
    admin: store.admin as AdminUser | null,
    isAuthenticated: store.isAuthenticated,
    isAdmin: store.isAdmin,
    currentPortal: store.currentPortal,
    isLoading: store.isLoading,
    login,
    loginEmployer,
    loginInstitution,
    register,
    loginAdmin,
    logout,
    updateUser: (userData: Partial<User>) => store.updateUser(userData),
    updateAdmin: (adminData: Partial<AdminUser>) => store.updateAdmin(adminData),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 * Provides access to both user and admin auth state and methods
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook specifically for interacting with current user (non-admin)
 */
export const useCurrentUser = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  return { user, isAuthenticated, updateUser };
};

/**
 * Hook specifically for interacting with current admin
 */
export const useCurrentAdmin = () => {
  const { admin, isAdmin, updateAdmin } = useAuth();
  return { admin, isAdmin, updateAdmin };
};

export type { User, AdminUser, RegisterData };
