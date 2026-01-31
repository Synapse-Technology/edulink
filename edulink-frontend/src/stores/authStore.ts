import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/auth/authService';
import { apiClient } from '../services/api/client';
import type { LoginCredentials, RegisterData } from '../services/auth/authService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution' | 'institution_admin' | 'employer_admin' | 'supervisor' | 'system_admin';
  trustLevel?: number;
  trustPoints?: number;
  institution_id?: string;
  employer_id?: string;
  phone?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  loginEmployer: (credentials: LoginCredentials) => Promise<void>;
  loginInstitution: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  refreshSession: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          // We'll update authService to return the response without setting localStorage
          // For now, we assume authService still does what it does, but we'll capture the result
          const response = await authService.login(credentials);
          
          const mappedUser: User = {
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.first_name,
            lastName: response.user.last_name,
            role: response.user.role as User['role'],
            trustLevel: response.user.trustLevel,
            trustPoints: response.user.trustPoints,
            avatar: response.user.avatar_url || response.user.avatar,
            institution_id: response.user.institution_id,
            employer_id: response.user.employer_id,
          };

          set({
            user: mappedUser,
            accessToken: response.tokens.access,
            refreshToken: response.tokens.refresh,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginEmployer: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authService.loginEmployer(credentials);
          
          const mappedUser: User = {
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.first_name,
            lastName: response.user.last_name,
            role: response.user.role as User['role'],
            trustLevel: response.user.trustLevel,
            trustPoints: response.user.trustPoints,
            avatar: response.user.avatar_url || response.user.avatar,
            institution_id: response.user.institution_id,
            employer_id: response.user.employer_id,
          };

          set({
            user: mappedUser,
            accessToken: response.tokens.access,
            refreshToken: response.tokens.refresh,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginInstitution: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authService.loginInstitution(credentials);
          
          const mappedUser: User = {
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.first_name,
            lastName: response.user.last_name,
            role: response.user.role as User['role'],
            trustLevel: response.user.trustLevel,
            trustPoints: response.user.trustPoints,
            avatar: response.user.avatar_url || response.user.avatar,
            institution_id: response.user.institution_id,
            employer_id: response.user.employer_id,
          };

          set({
            user: mappedUser,
            accessToken: response.tokens.access,
            refreshToken: response.tokens.refresh,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
         // Placeholder as per original AuthContext
         console.warn('AuthStore.register is not fully implemented against backend yet.');
         set({ isLoading: true });
         try {
             const response = await authService.register(data);
             // Assuming similar response structure
             const mappedUser: User = {
                id: response.user.id,
                email: response.user.email,
                firstName: response.user.first_name,
                lastName: response.user.last_name,
                role: response.user.role as User['role'],
                trustLevel: response.user.trustLevel,
                trustPoints: response.user.trustPoints,
                avatar: response.user.avatar_url || response.user.avatar,
                institution_id: response.user.institution_id,
                employer_id: response.user.employer_id,
              };
    
              set({
                user: mappedUser,
                accessToken: response.tokens.access,
                refreshToken: response.tokens.refresh,
                isAuthenticated: true,
                isLoading: false,
              });
         } catch (error) {
             set({ isLoading: false });
             throw error;
         }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.warn('Logout error:', error);
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      updateUser: (data) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      refreshSession: async () => {
        try {
            // We need to pass the refresh token manually if it's not in localStorage anymore
            // But authService might still look for it. We will refactor authService next.
            const { refreshToken } = get();
            if (!refreshToken) throw new Error('No refresh token');

            const response = await authService.refreshToken(refreshToken);
            
            if (response.user) {
                const mappedUser: User = {
                  id: response.user.id,
                  email: response.user.email,
                  firstName: response.user.first_name,
                  lastName: response.user.last_name,
                  role: response.user.role as User['role'],
                };
                
                // If the response includes a new refresh token (rotation), update it
                // Note: The backend response type needs to be checked if it returns 'refresh'
                // The interface in authService.ts says `access: string` and optional `user`.
                // We should check if it returns refresh token too.
                
                set((state) => ({
                    user: mappedUser,
                    accessToken: response.access,
                    // Only update refresh token if a new one is provided (rotation)
                    // If not provided, keep the old one? Or does rotation always provide one?
                    // We need to check the interface.
                    refreshToken: (response as any).refresh || state.refreshToken, 
                }));
            } else {
                set({ accessToken: response.access });
            }
        } catch (error) {
            get().logout();
        }
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({ 
          user: state.user, 
          accessToken: state.accessToken, 
          refreshToken: state.refreshToken, 
          isAuthenticated: state.isAuthenticated 
      }), // Only persist these fields
    }
  )
);

// Register token update callback with API client to sync store state on automatic refresh
apiClient.registerTokenUpdateCallback((access, refresh) => {
  const currentRefresh = useAuthStore.getState().refreshToken;
  // If refresh is null (no rotation), keep current. If current is null, use empty string to satisfy type.
  useAuthStore.getState().setTokens(access, refresh || currentRefresh || '');
});
