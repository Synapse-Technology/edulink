import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminAuthService } from '../services/auth/adminAuthService';

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

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from localStorage
    const storedToken = localStorage.getItem('adminToken');
    const storedAdmin = localStorage.getItem('adminUser');
    
    if (storedToken && storedAdmin) {
      try {
        const parsedAdmin = JSON.parse(storedAdmin);
        
        // Fix for existing sessions: ensure role uses platform_staff_role if available
        if (parsedAdmin.platform_staff_role && parsedAdmin.role !== parsedAdmin.platform_staff_role) {
          parsedAdmin.role = parsedAdmin.platform_staff_role;
          localStorage.setItem('adminUser', JSON.stringify(parsedAdmin));
        }

        setToken(storedToken);
        setAdmin(parsedAdmin);
      } catch (error) {
        console.error('Error parsing stored admin data:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await adminAuthService.login({ email, password });
      
      const { tokens, user } = data;
      const accessToken = tokens.access;

      // Map platform_staff_role to role if present, ensuring RBAC works correctly
      const adminUser = {
        ...user,
        role: (user as any).platform_staff_role || user.role
      } as AdminUser;

      // Store in state and localStorage (Service handles some storage, but we sync state here)
      setToken(accessToken);
      setAdmin(adminUser);
      
    } catch (error: any) {
      console.error('Admin login error:', error);
      throw error;
    }
  };

  const logout = () => {
    adminAuthService.logout();
    setToken(null);
    setAdmin(null);
  };

  const refreshToken = async () => {
    try {
      const data = await adminAuthService.refreshToken();
      const newToken = data.access;

      setToken(newToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      throw error;
    }
  };

  const value: AdminAuthContextType = {
    admin,
    token,
    isAuthenticated: !!token && !!admin,
    isLoading,
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