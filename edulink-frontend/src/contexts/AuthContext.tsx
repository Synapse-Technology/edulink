import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { ApiError } from '../services';
import type { User, RegisterData } from '../types';

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

// We don't really use the context provider anymore since we use Zustand
// But to keep compatibility with existing code that wraps the app in AuthProvider
// we'll keep the provider but it won't actually "provide" state down via context if we switch useAuth.
// HOWEVER, to be safe and least invasive, we can make useAuth return values from the store directly.
// But useAuth currently throws if used outside provider.
// Let's implement useAuth to return store state.
// And AuthProvider can just be a shell or perform initialization.

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // We can use the store here to sync or initialize if needed.
  // Zustand persist middleware handles hydration automatically.
  
  // We don't strictly need to pass values via Context anymore if we update useAuth
  // But to strictly follow the interface, let's just render children.
  // Or, we can pass the store state into the context value to keep the pattern valid.
  
  const store = useAuthStore();
  
  // Map store actions to match Context interface
  const login = async (email: string, password: string) => {
    try {
        await store.login({ email, password });
    } catch (error) {
        if (error instanceof ApiError) {
            throw new Error(error.message);
        }
        console.error('Login failed:', error);
        throw new Error('Invalid email or password');
    }
  };

  const register = async (userData: RegisterData) => {
      // Forward to store register
      // Cast userData to any to bypass strict type checking for now since we are migrating types
      await store.register(userData as any);
  };
  
  const logout = () => {
      store.logout();
  };
  
  const updateUser = (userData: Partial<User>) => {
      // Cast userData to any to bypass strict type checking for now
      store.updateUser(userData as any);
  };
  
  const refreshToken = async () => {
      await store.refreshSession();
  };

  const value: AuthContextType = {
    user: store.user as User | null,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  // We can just return the store state directly if we want to bypass Context
  // BUT existing code might rely on being inside AuthProvider (e.g. tests)
  // Let's stick to using the context for now to minimize refactoring risk.
  const context = useContext(AuthContext);
  if (context === undefined) {
     // If we really want to support usage outside provider, we could fallback to store here.
     // But let's keep the constraint.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { User, RegisterData };
