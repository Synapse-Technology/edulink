import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// User interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution';
  institution?: string;
  phone?: string;
  avatar?: string;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshToken: () => Promise<void>;
}

// Register data interface
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution';
  institution: string;
  phone: string;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Mock authentication service
const mockAuthService = {
  login: async (email: string, _password: string): Promise<{ user: User; token: string }> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock user data
    const mockUser: User = {
      id: '1',
      email,
      firstName: 'John',
      lastName: 'Doe',
      role: 'student',
      institution: 'University of Example',
      phone: '+1234567890',
      avatar: 'https://via.placeholder.com/150'
    };
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    
    return { user: mockUser, token: mockToken };
  },
  
  register: async (userData: RegisterData): Promise<{ user: User; token: string }> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock user data
    const mockUser: User = {
      id: '1',
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      institution: userData.institution,
      phone: userData.phone,
      avatar: 'https://via.placeholder.com/150'
    };
    
    const mockToken = 'mock-jwt-token-' + Date.now();
    
    return { user: mockUser, token: mockToken };
  },
  
  refreshToken: async (): Promise<{ token: string }> => {
    // Simulate token refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newToken = 'refreshed-jwt-token-' + Date.now();
    
    return { token: newToken };
  }
};

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const { user: loggedInUser, token } = await mockAuthService.login(email, password);
      
      setUser(loggedInUser);
      setIsAuthenticated(true);
      
      // Store in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(loggedInUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid email or password');
    }
  };

  // Register function
  const register = async (userData: RegisterData) => {
    try {
      const { user: registeredUser, token } = await mockAuthService.register(userData);
      
      setUser(registeredUser);
      setIsAuthenticated(true);
      
      // Store in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(registeredUser));
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error('Registration failed. Please try again.');
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  };

  // Update user function
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const { token } = await mockAuthService.refreshToken();
      localStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, log out the user
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { User, RegisterData };