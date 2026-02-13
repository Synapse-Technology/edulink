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
  private onTokenUpdate?: (access: string, refresh: string | null) => void;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    config: AxiosRequestConfig;
  }> = [];

  constructor(clientConfig: ApiClientConfig) {
    this.config = clientConfig;
    this.client = this.createClient();
    this.setupInterceptors();
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

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

        const token = this.getToken();
        // Skip auth for login/register endpoints and when explicitly skipped
        const isAuthEndpoint = config.url?.includes('/login/') || config.url?.includes('/register/');
        
        // Check for skipAuth property or skip-auth header and remove it so it's not sent to the server
        const skipAuth = (config as RequestConfig).skipAuth || config.headers?.['skip-auth'];
        if (config.headers && 'skip-auth' in config.headers) {
          delete config.headers['skip-auth'];
        }
        
        if (token && !skipAuth && !isAuthEndpoint) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add custom headers if provided
        if (config.headers?.['custom-headers']) {
          const customHeaders = config.headers['custom-headers'] as Record<string, string>;
          Object.assign(config.headers, customHeaders);
          delete config.headers['custom-headers'];
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

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/login/')) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject, config: originalRequest });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            await this.refreshToken();
            this.processQueue(null);
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError);
            this.clearAuth();
            throw new AuthenticationError('Session expired. Please log in again.');
          } finally {
            this.isRefreshing = false;
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

    switch (status) {
      case 400:
        return new ValidationError(errorMessage, data);
      case 401:
        return new AuthenticationError(errorMessage);
      case 403:
        return new AuthenticationError(errorMessage || 'Access forbidden. Insufficient permissions.');
      case 404:
        return new ApiError(errorMessage, status);
      case 422:
        return new ValidationError(errorMessage, data);
      case 500:
        return new ApiError('Internal server error. Please try again later.', status);
      default:
        return new ApiError(errorMessage, status);
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
    // Return in-memory token if available
    if (this.accessToken) {
      return this.accessToken;
    }

    // Check for admin token first, then regular user token
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      return adminToken;
    }
    
    // For regular users, try getting from Zustand store first
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        if (state && state.accessToken) {
          this.accessToken = state.accessToken; // Sync to memory
          return state.accessToken;
        }
      }
    } catch (e) {
      // Fallback
    }

    return null;
  }

  private getRefreshToken(): string | null {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        if (state && state.refreshToken) {
          return state.refreshToken;
        }
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  private async refreshToken(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      const preLockRefreshToken = this.getRefreshToken();
      const preLockAdminRefreshToken = localStorage.getItem('adminRefreshToken');

      // @ts-ignore
      return navigator.locks.request('auth_refresh_lock', async () => {
        // Admin check
        if (localStorage.getItem('adminToken')) {
          const currentAdminRef = localStorage.getItem('adminRefreshToken');
          if (preLockAdminRefreshToken && currentAdminRef !== preLockAdminRefreshToken) {
            return; // Already refreshed by another tab
          }
        } else {
          // User check
          const currentRef = this.getRefreshToken();
          if (preLockRefreshToken && currentRef !== preLockRefreshToken) {
            // Already refreshed by another tab - update local state
            this.accessToken = null;
            this.getToken(); // Will read from storage
            return; 
          }
        }
        
        await this._performRefreshCall();
      });
    } else {
      await this._performRefreshCall();
    }
  }

  private async _performRefreshCall(): Promise<void> {
    // Check if we have an admin token - use admin refresh endpoint
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      const adminRefreshToken = localStorage.getItem('adminRefreshToken');
      if (adminRefreshToken) {
        try {
          const response = await this.client.post('/api/admin/auth/token/refresh/', {
            refresh: adminRefreshToken,
          }, {
            headers: { 'skip-auth': 'true' }
          });
          
          const { access, refresh } = response.data;
          localStorage.setItem('adminToken', access);
          
          // Update refresh token if rotated
          if (refresh) {
            localStorage.setItem('adminRefreshToken', refresh);
          }
          return;
        } catch (error) {
          this.clearAuth();
          throw new AuthenticationError('Admin session expired. Please log in again.');
        }
      } else {
        this.clearAuth();
        throw new AuthenticationError('Admin session expired. Please log in again.');
      }
    }

    // Regular user token refresh
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    // We need to update the store, but we can't import store here easily due to circular deps (store imports authService -> client).
    // So we will perform the request and update the store via the storage event or manual write.
    // Actually, writing to localStorage 'auth-storage' manually is risky.
    // Ideally, we should let the store handle refresh.
    // But this interceptor logic is inside the client.
    
    // Compromise: We fetch the new token, and write it to localStorage in the format Zustand expects.
    // This allows the store to sync up on next reload or storage event.
    // BUT the running store instance in memory won't know unless we use the store instance.
    
    // To solve circular dependency: 
    // We can inject the store or a "setToken" callback into the client after initialization.
    // For now, let's just do the manual write to localStorage AND legacy keys as fallback, 
    // and maybe the store will pick it up on reload.
    // A better way is if the store handles the refresh logic entirely, but Axios interceptors are lower level.
    
    const response = await this.client.post('/api/auth/token/refresh/', {
      refresh: refreshToken,
    }, {
      headers: { 'skip-auth': 'true' }
    });

    const { access, refresh } = response.data;
    
    // Update in-memory token immediately
    this.accessToken = access;
    
    // Update Zustand storage via callback if registered
    if (this.onTokenUpdate) {
      this.onTokenUpdate(access, refresh || null);
    } else {
      // Fallback: Update Zustand storage manually (legacy behavior)
      try {
        const authStorageStr = localStorage.getItem('auth-storage');
        if (authStorageStr) {
          const authStorage = JSON.parse(authStorageStr);
          if (authStorage.state) {
            authStorage.state.accessToken = access;
            if (refresh) authStorage.state.refreshToken = refresh;
            localStorage.setItem('auth-storage', JSON.stringify(authStorage));
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  private clearAuth(): void {
    this.accessToken = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    
    // Clear Zustand storage
    try {
        const authStorageStr = localStorage.getItem('auth-storage');
        if (authStorageStr) {
            const authStorage = JSON.parse(authStorageStr);
            if (authStorage.state) {
                authStorage.state.user = null;
                authStorage.state.accessToken = null;
                authStorage.state.refreshToken = null;
                authStorage.state.isAuthenticated = false;
                localStorage.setItem('auth-storage', JSON.stringify(authStorage));
            }
        }
    } catch (e) {}
  }

  public registerTokenUpdateCallback(callback: (access: string, refresh: string | null) => void) {
    this.onTokenUpdate = callback;
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
    // We do not set legacy token key anymore.
    // The store should manage persistence.
  }

  setRefreshToken(token: string): void {
    // We do not set legacy refresh token key anymore.
    // Use token variable to satisfy linter or remove it if interface allows.
    // Since this is a public method, we keep the signature but ignore the arg.
    void token;
  }

  setAdminToken(token: string): void {
    localStorage.setItem('adminToken', token);
  }

  setAdminUser(user: any): void {
    localStorage.setItem('adminUser', JSON.stringify(user));
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