import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import config from '../../config';
import { ApiError, NetworkError, ValidationError, AuthenticationError } from '../errors/index';

interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  retryOnFailure?: boolean;
  customHeaders?: Record<string, string>;
  retryCount?: number;
}

// Status codes that can be safely retried
const RETRIABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * ApiClient - Pure cookie-based HTTP client
 * 
 * Authentication flow:
 * 1. Login endpoint sets HttpOnly cookies (access_token, refresh_token)
 * 2. Browser automatically includes cookies in all requests (withCredentials: true)
 * 3. If access_token expires, backend returns 401
 * 4. On 401, redirect to /login (server will validate refresh token from cookie and issue new access_token)
 * 5. Logout endpoint clears cookies
 * 
 * No token management in this client - browser handles cookie storage/transmission automatically.
 */
class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;

  constructor(clientConfig: ApiClientConfig) {
    this.config = clientConfig;
    this.client = this.createClient();
    this.setupInterceptors();
  }

  /**
   * Create Axios instance with cookie-based auth enabled
   */
  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      withCredentials: true, // Include cookies automatically in all requests
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Handle FormData - Remove Content-Type to let browser/axios set it with boundary
        if (config.data instanceof FormData) {
          if (config.headers) {
            delete config.headers['Content-Type'];
          }
        }

        // Add CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
        // Backend sets CSRF token in cookie; we read it and add to header
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
          const csrfToken = this.getCsrfToken();
          if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
          }
        }

        // Clean up any special headers that shouldn't be sent to server
        if (config.headers && 'skip-auth' in config.headers) {
          delete config.headers['skip-auth'];
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data, // Return only response data, not full response
      (error) => this.handleResponseError(error)
    );
  }

  /**
   * Get CSRF token from cookie (Django sets it as 'csrftoken')
   */
  private getCsrfToken(): string | null {
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
    
    return null;
  }

  /**
   * Central error handling for all responses
   */
  private handleResponseError(error: AxiosError): Promise<never> {
    const config = error.config as RequestConfig;

    // 401: Authentication failed - redirect to login
    // Server's refresh_token cookie validation failed or access_token expired
    if (error.response?.status === 401) {
      window.location.href = '/login';
      return Promise.reject(this.parseError(error));
    }

    // Retry retriable errors with exponential backoff
    if (RETRIABLE_STATUS_CODES.includes(error.response?.status || 0)) {
      const retryCount = (config?.retryCount || 0) + 1;

      if (retryCount < (this.config.retryAttempts || 3)) {
        const delay = (this.config.retryDelay || 1000) * Math.pow(2, retryCount - 1);

        return new Promise((resolve) => {
          setTimeout(() => {
            config.retryCount = retryCount;
            resolve(this.client.request(config));
          }, delay);
        });
      }
    }

    return Promise.reject(this.parseError(error));
  }

  /**
   * Convert Axios error to typed ApiError
   */
  private parseError(error: AxiosError): ApiError {
    if (!error.response) {
      return new NetworkError('Network error. Please check your connection.');
    }

    const { status, data } = error.response;
    const errorMessage = this.extractErrorMessage(data);

    // Preserve full backend response in data
    const fullErrorData = typeof data === 'object' ? data : { message: errorMessage };

    switch (status) {
      case 400:
        return new ValidationError(errorMessage, fullErrorData);
      case 401:
        return new AuthenticationError(errorMessage);
      case 403:
        return new AuthenticationError(errorMessage || 'Access forbidden. Insufficient permissions.');
      case 404:
        return new ApiError(errorMessage, status, fullErrorData);
      case 422:
        return new ValidationError(errorMessage, fullErrorData);
      case 500:
        return new ApiError('Internal server error. Please try again later.', status, fullErrorData);
      default:
        return new ApiError(errorMessage, status, fullErrorData);
    }
  }

  /**
   * Extract user-friendly error message from various backend response formats
   */
  private extractErrorMessage(data: any): string {
    if (typeof data === 'string') return data;

    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;

    // Handle field-specific errors (validation errors)
    if (data && typeof data === 'object') {
      const fieldErrors = Object.entries(data)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(', ')}`;
          }
          return `${key}: ${value}`;
        });

      if (fieldErrors.length > 0) {
        return fieldErrors.join('; ');
      }
    }

    return 'An error occurred';
  }

  // ========================================
  // Public HTTP methods
  // ========================================

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.client.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.client.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.client.put(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.client.patch(url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.client.delete(url, config);
  }

  /**
   * Upload file with optional metadata
   */
  async upload<T>(url: string, file: File, data?: any, config?: RequestConfig): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    }

    return this.client.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        // Do NOT set Content-Type for FormData - let browser/axios set it with boundary
      },
    });
  }

  /**
   * Get the underlying Axios instance for advanced use cases
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}

// ========================================
// Initialize and export singleton
// ========================================

const apiConfig: ApiClientConfig = {
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  retryAttempts: config.api.retryAttempts,
  retryDelay: config.api.retryDelay,
};

export const apiClient = new ApiClient(apiConfig);
export default apiClient;
