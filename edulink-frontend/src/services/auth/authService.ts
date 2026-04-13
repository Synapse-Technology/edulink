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

interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}

/**
 * AuthResponse - Backend returns user data + tokens in response body
 * Some endpoints also set HttpOnly cookies (UserViewSet)
 * Frontend stores response-body tokens temporarily as fallback
 */
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
  tokens?: {
    access: string;
    refresh: string;
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

/**
 * AuthService - Handles authentication API calls
 *
 * Cookie-based auth flow:
 * 1. login() → POST /api/students/auth/login/ → backend sets HttpOnly cookies + returns user
 * 2. Subsequent requests: browser includes cookies automatically (withCredentials: true)
 * 3. logout() → POST /api/auth/logout/ → backend clears cookies
 *
 * No token management here - browser and server handle that automatically.
 */
class AuthService {
  private client = apiClient;

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Validate credentials before API call
      const { validateEmail, validateRequired } = await import('../../utils/validation');

      const emailValidation = validateEmail(credentials.email);
      const passwordValidation = validateRequired(credentials.password, 'password');

      if (!emailValidation.isValid) {
        throw new AuthenticationError(emailValidation.errors[0].message);
      }

      if (!passwordValidation.isValid) {
        throw new AuthenticationError(passwordValidation.errors[0].message);
      }
    } catch (validationError) {
      if (validationError instanceof AuthenticationError) {
        throw validationError;
      }
      throw validationError;
    }

    try {
      const response = await this.client.post<AuthResponse>(
        '/api/students/auth/login/',
        credentials
      );

      // 🔐 HYBRID AUTH: Store JWT access token in memory for API requests
      // Backend returns JWT tokens in response (Cloudflare blocks SameSite=None cookies)
      // Access token stored in memory (vulnerable to XSS but caught by CSP)
      // Refresh token stored in HttpOnly cookie by backend (protected from XSS)
      if (response.access) {
        this.client.setToken(response.access);
        console.log('✅ [AUTH] Access token stored from login response');
      }

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

      // 🔐 HYBRID AUTH: Store JWT access token in memory
      if (response.access) {
        this.client.setToken(response.access);
        console.log('✅ [AUTH] Access token stored from institution login');
      }

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

      // 🔐 HYBRID AUTH: Store JWT access token in memory
      if (response.access) {
        this.client.setToken(response.access);
        console.log('✅ [AUTH] Access token stored from employer login');
      }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Validate user data before API call
      const { validateEmail, validatePassword, validateRequired, combineValidationResults } =
        await import('../../utils/validation');

      const results = combineValidationResults(
        validateEmail(userData.email),
        validatePassword(userData.password),
        validateRequired(userData.firstName, 'firstName'),
        validateRequired(userData.lastName, 'lastName'),
        validateRequired(userData.role, 'role'),
        validateRequired(userData.institution, 'institution')
      );

      if (!results.isValid) {
        throw new AuthenticationError(results.errors[0].message);
      }
    } catch (validationError) {
      if (validationError instanceof AuthenticationError) {
        throw validationError;
      }
      throw validationError;
    }

    try {
      // Backend sets HttpOnly cookies + returns user data only
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

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Registration failed. Please try again.');
    }
  }

  /**
   * Logout - POST to backend to clear HttpOnly cookies
   */
  async logout(): Promise<void> {
    try {
      // POST to logout endpoint - backend will clear HttpOnly cookies
      await this.client.post('/api/auth/logout/', {});
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Even if logout endpoint fails, clear local state (cookies are separate)
    } finally {
      // 🔐 HYBRID AUTH: Clear JWT access token from memory
      this.client.clearToken();
      console.log('✅ [AUTH] Logged out, tokens cleared');
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

  async changePassword(data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<void> {
    try {
      await this.client.post('/api/auth/users/change-password/', data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to change password');
    }
  }

  async deactivateAccount(reason: string): Promise<void> {
    try {
      await this.client.post('/api/auth/users/deactivate/', { reason });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to deactivate account');
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await this.client.post('/api/auth/resend-verification-email/', { email });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to resend verification email');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.client.post('/api/auth/password-reset/request/', { email });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to request password reset');
    }
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<void> {
    try {
      await this.client.post('/api/auth/password-reset/confirm/', {
        token,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to reset password');
    }
  }
}

export const authService = new AuthService();
export type { LoginCredentials, RegisterData, AuthResponse, UserProfile, TokenRefreshResponse };
