import React, { createContext, useContext, useState, useEffect } from 'react';

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
      const response = await fetch('http://localhost:8000/api/admin/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.email) {
            if (Array.isArray(errorData.email)) {
              errorMessage = errorData.email.join('. ');
            } else {
              errorMessage = errorData.email;
            }
          } else if (errorData.password) {
            if (Array.isArray(errorData.password)) {
              errorMessage = errorData.password.join('. ');
            } else {
              errorMessage = errorData.password;
            }
          } else if (errorData.non_field_errors) {
            if (Array.isArray(errorData.non_field_errors)) {
              errorMessage = errorData.non_field_errors.join('. ');
            } else {
              errorMessage = errorData.non_field_errors;
            }
          }
        } else {
          // Handle non-JSON errors (e.g. 500 HTML page)
          console.error('Non-JSON error response:', response.status, response.statusText);
          errorMessage = `Server Error (${response.status}): Please contact support if the problem persists.`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Validate token structure
      if (!data.tokens || !data.tokens.access) {
        throw new Error('Invalid login response: missing access token');
      }
      
      const { tokens, user } = data;
      const accessToken = tokens.access;

      // Map platform_staff_role to role if present, ensuring RBAC works correctly
      // The backend returns user.role (e.g. 'student') and platform_staff_role (e.g. 'SUPER_ADMIN')
      // We want the admin context to use the platform staff role
      const adminUser = {
        ...user,
        role: user.platform_staff_role || user.role
      };

      // Store in state and localStorage
      setToken(accessToken);
      setAdmin(adminUser);
      
      localStorage.setItem('adminToken', accessToken);
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      localStorage.setItem('adminRole', adminUser.role);
      
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminRole');
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const { token: newToken } = data;

      setToken(newToken);
      localStorage.setItem('adminToken', newToken);
      
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