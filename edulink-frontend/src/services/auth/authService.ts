import { apiClient } from '../api/client';
import { ApiError, AuthenticationError } from '../errors';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution' | 'institution_admin';
  institution: string;
  phone: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    trustLevel?: number;
    trustPoints?: number;
    avatar_url?: string;
    avatar?: string;
    institution_id?: string;
    employer_id?: string;
  };
  tokens: {
    access: string;
    refresh: string;
  };
}

interface TokenRefreshResponse {
  access: string;
  refresh?: string; // Added optional refresh token
  user?: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    trustLevel?: number;
    trustPoints?: number;
    avatar_url?: string;
    avatar?: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution' | 'institution_admin';
  institution?: string;
  phone?: string;
  avatar?: string;
}

class AuthService {
  private client = apiClient;

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>(
        '/api/students/auth/login/',
        credentials
      );

      // We no longer set tokens here directly in localStorage. 
      // The store handles persistence.
      // But we update the client with the token so subsequent requests in this session work immediately
      // before the store might trigger an update (though synchronous usually).
      this.client.setToken(response.tokens.access);
      // Refresh token is handled by store logic mostly, but good to keep client updated
      this.client.setRefreshToken(response.tokens.refresh);

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Login failed. Please check your credentials.');
    }
  }

  async loginInstitution(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>(
        '/api/institutions/auth/login/',
        credentials
      );

      this.client.setToken(response.tokens.access);
      this.client.setRefreshToken(response.tokens.refresh);

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Login failed. Please check your credentials.');
    }
  }

  async loginEmployer(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>(
        '/api/employers/auth/login/',
        credentials
      );

      this.client.setToken(response.tokens.access);
      this.client.setRefreshToken(response.tokens.refresh);

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Login failed. Please check your credentials.');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>(
        '/api/auth/users/register/',
        {
          email: userData.email,
          password: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          institution: userData.institution,
          phone: userData.phone,
        }
      );

      this.client.setToken(response.tokens.access);
      this.client.setRefreshToken(response.tokens.refresh);

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Registration failed. Please try again.');
    }
  }

  async refreshToken(token: string): Promise<TokenRefreshResponse> {
    try {
      const response = await this.client.post<TokenRefreshResponse>(
        '/api/auth/token/refresh/',
        { refresh: token }
      );
      
      // Update client with new token
      if (response.access) {
        this.client.setToken(response.access);
      }
      
      return response;
    } catch (error) {
      this.logout();
      throw new AuthenticationError('Session expired. Please login again.');
    }
  }

  async logout(): Promise<void> {
    try {
        // Logout logic if backend requires it (e.g. blacklisting refresh token)
        // Since we don't have easy access to the refresh token here without the store,
        // and we are moving away from direct storage access, we might skip the API call 
        // OR rely on the store passing it.
        // For now, since the previous implementation was broken/commented out effectively,
        // we will just ensure the client state is cleared if needed.
        // The store handles the actual state cleanup.
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } 
  }


  async getProfile(): Promise<UserProfile> {
    try {
      const response = await this.client.get<UserProfile>('/api/auth/users/profile/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to fetch user profile');
    }
  }

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await this.client.patch<UserProfile>(
        '/api/auth/users/profile/',
        profileData
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to update user profile');
    }
  }

  async changePassword(data: any): Promise<void> {
    try {
      await this.client.post('/api/auth/users/change_password/', data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to change password');
    }
  }

  async deactivateAccount(reason: string): Promise<void> {
    try {
      await this.client.post('/api/auth/users/deactivate/', { reason });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to deactivate account');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.client.post('/api/auth/users/reset-password/', { email });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to request password reset');
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await this.client.post('/api/auth/users/reset-password-confirm/', { 
        token, 
        new_password: password,
        new_password_confirm: password
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to reset password');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await this.client.post('/api/auth/users/verify-email/', { token });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to verify email');
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await this.client.post('/api/auth/users/resend-verification/', { email });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to resend verification email');
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    // This is now just a helper or deprecated. The store is the source of truth.
    // We'll check the client token for now.
    return this.client.isAuthenticated();
  }

  getStoredUser(): UserProfile | null {
     // Deprecated. Use store.
     return null;
  }

  clearAuth(): void {
    // Deprecated. Use store logout.
  }
}

export const authService = new AuthService();
export default authService;
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  TokenRefreshResponse,
  UserProfile,
};
