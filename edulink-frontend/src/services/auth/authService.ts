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
}

/**
 * AuthResponse - backend returns user data and a short-lived access token.
 * The refresh token is stored by the backend in an HttpOnly cookie and is never
 * persisted by frontend JavaScript.
 */
interface AuthResponse {
  message?: string;
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
  access?: string;
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
 * 1. login() -> backend sets refresh cookie and returns access token + user.
 * 2. API client keeps access token in memory for Authorization headers.
 * 3. Refresh uses the HttpOnly refresh cookie; no refresh token is stored in JS.
 * 4. logout() clears the refresh cookie and local auth state.
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
        '/api/auth/users/login/',
        credentials
      );

      const accessToken = response.access;

      if (accessToken) {
        this.client.setToken(accessToken);
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

      const accessToken = response.access;

      if (accessToken) {
        this.client.setToken(accessToken);
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

      const accessToken = response.access;

      if (accessToken) {
        this.client.setToken(accessToken);
      }

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
      // Registration creates an account. Login is a separate explicit step.
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
      await this.client.post('/api/auth/logout/', {});
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Even if logout endpoint fails, clear local state (cookies are separate)
    } finally {
      this.client.clearToken();
      this.client.setRefreshToken('');
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
      await this.client.post('/api/notifications/email-verification/resend/', { email });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to resend verification email');
    }
  }

  async verifyEmailToken(token: string): Promise<void> {
    try {
      await this.client.post('/api/notifications/email-verification/verify/', { token });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to verify email token');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.client.post('/api/notifications/password-reset/request/', { email });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to request password reset');
    }
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<void> {
    try {
      await this.client.post('/api/notifications/password-reset/reset/', {
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
