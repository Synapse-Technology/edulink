import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '../services/auth/authService';
import { adminAuthService } from '../services/auth/adminAuthService';
import type { LoginCredentials, RegisterData } from '../services/auth/authService';
import { inferPortalForUser } from '../utils/authRouting';

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

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  permissions?: string[];
}

type Portal = 'student' | 'employer' | 'institution' | 'admin';

interface AuthState {
  user: User | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentPortal: Portal | null;
  isLoading: boolean;

  // Regular user actions
  login: (credentials: LoginCredentials) => Promise<void>;
  loginEmployer: (credentials: LoginCredentials) => Promise<void>;
  loginInstitution: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  
  // Admin user actions
  loginAdmin: (email: string, password: string) => Promise<void>;
  
  // Common actions
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  updateAdmin: (data: Partial<AdminUser>) => void;
  setLoading: (loading: boolean) => void;
}

const mapAuthUser = (responseUser: any): User => ({
  id: responseUser.id,
  email: responseUser.email,
  firstName: responseUser.first_name,
  lastName: responseUser.last_name,
  role: responseUser.role as User['role'],
  trustLevel: responseUser.trustLevel,
  trustPoints: responseUser.trustPoints,
  avatar: responseUser.avatar_url || responseUser.avatar,
  institution_id: responseUser.institution_id,
  employer_id: responseUser.employer_id,
});

/**
 * Unified Auth Store - Zustand with persisted user + admin data
 *
 * Authentication flow (HttpOnly cookie-based for both regular users and admins):
 * 1. login() / loginAdmin() → service.login() → backend sets HttpOnly cookies → response has user/admin data
 * 2. API client uses withCredentials: true → browser includes cookies automatically
 * 3. On 401: API client auto-refreshes token from HttpOnly cookie
 * 4. logout() → calls service.logout() → backend clears cookies → store clears data
 *
 * Key differences from before:
 * - Admin users now use HttpOnly cookies (Phase 1 backend fix)
 * - Single unified store for both regular and admin users
 * - currentPortal tracks which type of user is logged in
 * - No localStorage token storage for any user type
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      admin: null,
      isAuthenticated: false,
      isAdmin: false,
      currentPortal: null,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(credentials);
          const mappedUser = mapAuthUser(response.user);

          set({
            user: mappedUser,
            admin: null,
            isAuthenticated: true,
            isAdmin: false,
            currentPortal: inferPortalForUser(mappedUser),
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
          const response = await authService.login(credentials);
          const mappedUser = mapAuthUser(response.user);

          set({
            user: mappedUser,
            admin: null,
            isAuthenticated: true,
            isAdmin: false,
            currentPortal: 'employer',
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
          const response = await authService.login(credentials);
          const mappedUser = mapAuthUser(response.user);

          set({
            user: mappedUser,
            admin: null,
            isAuthenticated: true,
            isAdmin: false,
            currentPortal: 'institution',
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authService.register(data);
          const mappedUser = mapAuthUser(response.user);

          set({
            user: mappedUser,
            admin: null,
            isAuthenticated: true,
            isAdmin: false,
            currentPortal: 'student',
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginAdmin: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await adminAuthService.login({ email, password });

          // Map backend response to AdminUser (handle platform_staff_role field)
          const mappedAdmin: AdminUser = {
            id: response.user.id,
            email: response.user.email,
            firstName: (response.user as any).first_name || (response.user as any).firstName || response.user.email.split('@')[0],
            lastName: (response.user as any).last_name || (response.user as any).lastName || '',
            role: (response.user as any).platform_staff_role || response.user.role,
            permissions: (response.user as any).permissions || [],
          };

          set({
            user: null,
            admin: mappedAdmin,
            isAuthenticated: true,
            isAdmin: true,
            currentPortal: 'admin',
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Backend will clear HttpOnly cookies in response headers
          await authService.logout();
        } catch (error) {
          console.warn('Logout error:', error);
        } finally {
          // Clear all auth state
          set({
            user: null,
            admin: null,
            isAuthenticated: false,
            isAdmin: false,
            currentPortal: null,
          });

          // Clear legacy admin tokens from localStorage (fallback for old sessions)
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminRefreshToken');
          localStorage.removeItem('adminUser');

          // Notify other windows/tabs of logout (storage event listeners)
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'auth-storage',
              newValue: null,
              url: window.location.href,
            })
          );
        }
      },

      updateUser: (data) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      updateAdmin: (data) => {
        const { admin } = get();
        if (admin) {
          set({ admin: { ...admin, ...data } });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist user data and admin data - tokens in HttpOnly cookies only
        user: state.user,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        currentPortal: state.currentPortal,
      }),
    }
  )
);
