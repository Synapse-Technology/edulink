import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import config from '../../config';
import { ApiError, NetworkError, ValidationError, AuthenticationError } from '../errors/index';

// config is now the initialized object from the default export

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
}

class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private isRefreshing: boolean = false;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string | null> | null = null;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    config: AxiosRequestConfig;
  }> = [];

  constructor(clientConfig: ApiClientConfig) {
    this.config = clientConfig;
    this.client = this.createClient();
    this.setupInterceptors();
    // Fetch CSRF token on initialization
    this.initializeCsrfToken();
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private initializeCsrfToken(): void {
    // Fetch CSRF token from server since CSRF_COOKIE_HTTPONLY=True prevents JS from reading it
    // This is a GET request, which doesn't require CSRF protection
    if (!this.csrfTokenPromise) {
      this.csrfTokenPromise = this.client
        .get('/api/auth/users/get_csrf_token/')
        .then((response) => {
          this.csrfToken = response.data.csrf_token;
          return this.csrfToken;
        })
        .catch(() => {
          return null;
        });
    }
  }

  private async getCsrfToken(): Promise<string | null> {
    // If token already in memory, return immediately
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If fetch hasn't started, start it now
    if (!this.csrfTokenPromise) {
      this.initializeCsrfToken();
    }
    
    // Wait for the fetch to complete
    if (this.csrfTokenPromise) {
      try {
        const token = await this.csrfTokenPromise;
        return token;
      } catch (err) {
        void err;
        return null;
      }
    }
    
    return null;
  }

  private setupInterceptors(): void {
    // Request interceptor - handle JWT token and CSRF token injection
    this.client.interceptors.request.use(
      async (config) => {
        // Add JWT access token from memory if available
        if (this.accessToken) {
          const skipAuth = config.headers && typeof config.headers.has === 'function' 
            ? config.headers.has('skip-auth') 
            : config.headers?.['skip-auth'];
            
          if (!skipAuth) {
            config.headers = config.headers || {};
            if (typeof config.headers.set === 'function') {
              config.headers.set('Authorization', `Bearer ${this.accessToken}`);
            } else {
              config.headers['Authorization'] = `Bearer ${this.accessToken}`;
            }
          }
        }

        // For POST/PUT/PATCH/DELETE requests, add CSRF token
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
          const csrfToken = await this.getCsrfToken();
          if (csrfToken) {
            if (config.headers && typeof config.headers.set === 'function') {
              config.headers.set('X-CSRFToken', csrfToken);
            } else {
              config.headers = { ...config.headers, 'X-CSRFToken': csrfToken } as any;
            }
          }

          // For FormData, remove Content-Type to let browser set it with boundary
          if (config.data instanceof FormData && config.headers) {
            if (typeof config.headers.delete === 'function') {
              config.headers.delete('Content-Type');
            } else {
              delete (config.headers as any)['Content-Type'];
            }
          }
        }

        // Check for skipAuth header and remove it so it's not sent to the server
        if (config.headers) {
          if (typeof config.headers.delete === 'function') {
            config.headers.delete('skip-auth');
          } else {
            delete (config.headers as any)['skip-auth'];
          }
        }
        
        // Add custom headers if provided
        const customHdrs = config.headers && typeof config.headers.get === 'function'
            ? config.headers.get('custom-headers')
            : (config.headers as any)?.['custom-headers'];

        if (customHdrs) {
          const customHeaders = customHdrs as Record<string, string>;
          Object.entries(customHeaders).forEach(([key, value]) => {
            if (config.headers && typeof config.headers.set === 'function') {
              config.headers.set(key, value);
            } else if (config.headers) {
              (config.headers as any)[key] = value;
            }
          });
          if (config.headers && typeof config.headers.delete === 'function') {
            config.headers.delete('custom-headers');
          } else if (config.headers) {
            delete (config.headers as any)['custom-headers'];
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized or 403 (when credentials missing) - refresh JWT token
        const isAuthError = error.response?.status === 401 || (error.response?.status === 403 && this.extractErrorMessage(error.response.data as any)?.includes('credentials were not provided'));
        if (isAuthError && !originalRequest._retry && !originalRequest.url?.includes('/login/')) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject, config: originalRequest });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
              this.processQueue(error);
              this.clearAuth();
              throw new AuthenticationError('Session expired. Please log in again.');
            }

            const refreshResponse = await this.client.post(
              '/api/auth/token/refresh/',
              { refresh: refreshToken },
              { headers: { 'skip-auth': 'true' } }
            );
            
            // Extract new access token from response
            if (refreshResponse.data.access) {
              this.accessToken = refreshResponse.data.access;
              if (refreshResponse.data.refresh) {
                this.setRefreshToken(refreshResponse.data.refresh);
              }
              this.processQueue(null);
              // Retry original request with new token
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError);
            this.clearAuth();
            throw new AuthenticationError('Session expired. Please log in again.');
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle 403 CSRF token invalid - refresh CSRF token and retry
        if (error.response?.status === 403 && !originalRequest._retry) {
          const errorMsg = this.extractErrorMessage(error.response.data);
          if (errorMsg.includes('CSRF')) {
            originalRequest._retry = true;
            try {
              // Fetch fresh CSRF token
              await this.client.get('/api/auth/users/get_csrf_token/');
              // getCsrfToken() will now return the fresh token
              this.csrfTokenPromise = null; // Reset promise to force refetch
              this.initializeCsrfToken(); // Fetch new token
              // Wait for new token to be available
              await new Promise(resolve => setTimeout(resolve, 50));
              // Retry original request with new token
              return this.client(originalRequest);
            } catch (csrfError) {
              return Promise.reject(this.handleError(error));
            }
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private processQueue(error: any): void {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else {
        this.client(config).then(resolve).catch(reject);
      }
    });
    this.failedQueue = [];
  }

  private handleError(error: AxiosError): ApiError {
    if (!error.response) {
      return new NetworkError('Network error. Please check your connection.');
    }

    const { status, data } = error.response;
    const errorMessage = this.extractErrorMessage(data);

    // Preserve full backend response in data for ParsedErrorResponse
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

  private extractErrorMessage(data: any): string {
    if (typeof data === 'string') return data;
    
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
    
    // Handle field-specific errors
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

  private getToken(): string | null {
    // Try in-memory token first
    if (this.accessToken) {
      return this.accessToken;
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (this.refreshToken) {
      return this.refreshToken;
    }

    try {
      const token = sessionStorage.getItem('refresh_token');
      if (token) {
        this.refreshToken = token;
        return token;
      }
    } catch (e) {
      void e;
    }

    return null;
  }

  private clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;

    try {
      sessionStorage.removeItem('refresh_token');
    } catch (e) {
      void e;
    }
    
    // Clear Zustand storage
    try {
        const authStorageStr = localStorage.getItem('auth-storage');
        if (authStorageStr) {
            const authStorage = JSON.parse(authStorageStr);
            if (authStorage.state) {
                authStorage.state.user = null;
                authStorage.state.admin = null;
                authStorage.state.accessToken = null;
                authStorage.state.refreshToken = null;
                authStorage.state.isAuthenticated = false;
                authStorage.state.isAdmin = false;
                authStorage.state.currentPortal = null;
                localStorage.setItem('auth-storage', JSON.stringify(authStorage));
            }
        }
    } catch (e) {
      void e;
    }
  }

  // Public API methods
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  async upload<T>(url: string, file: File, data?: any, config?: RequestConfig): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    }

    const response = await this.client.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
      },
    });

    return response.data;
  }

  // Utility methods
  setToken(token: string): void {
    this.accessToken = token;
    console.log('🔐 [TOKEN] Access token set');
  }

  clearToken(): void {
    this.accessToken = null;
    console.log('🔐 [TOKEN] Access token cleared');
  }

  setRefreshToken(token: string): void {
    if (!token) {
      this.refreshToken = null;
      try {
        sessionStorage.removeItem('refresh_token');
      } catch (e) {
        void e;
      }
      return;
    }

    this.refreshToken = token;
    try {
      sessionStorage.setItem('refresh_token', token);
    } catch (e) {
      void e;
    }
  }

  setAdminToken(token: string): void {
    // Admin tokens are now stored in HttpOnly cookies by the backend
    // This method is kept for backward compatibility but does nothing
    void token;
  }

  setAdminUser(user: any): void {
    // Admin user data is managed by the store, not stored here
    void user;
  }

  getClient(): AxiosInstance {
    return this.client;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// Create singleton instance
const apiConfig: ApiClientConfig = {
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  retryAttempts: config.api.retryAttempts,
  retryDelay: config.api.retryDelay,
};

export const apiClient = new ApiClient(apiConfig);
export default apiClient;
