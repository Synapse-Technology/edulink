import { apiClient } from '../api/client';
import { ApiError, AuthenticationError, AuthorizationError } from '../errors';

interface AdminUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}

interface AdminLoginCredentials {
  email: string;
  password: string;
}

/**
 * Updated AdminAuthResponse - Backend now returns user data only
 * Tokens are in HttpOnly cookies (not in response body)
 * 
 * IMPORTANT: This changed with Phase 1 of the auth refactor.
 * Backend admin login endpoint (/api/admin/auth/login/) now matches
 * regular user login pattern - returns user data, tokens in cookies.
 */
interface AdminAuthResponse {
  user: AdminUser;
  message?: string;
}

interface AdminTokenRefreshResponse {
  access: string;
  refresh?: string;
  message?: string;
}

interface CreateAdminUserData {
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  permissions?: string[];
}

interface UpdateAdminUserData {
  email?: string;
  role?: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  permissions?: string[];
}

interface AdminDashboardStats {
  totalUsers: number;
  totalUsersTrend?: number;
  totalStudents: number;
  totalInstitutions: number;
  totalInstitutionsTrend?: number;
  pendingInstitutions: number;
  totalStudentInterests: number;
  totalPlatformStaff: number;
  pendingInvites: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    lastCheck: string;
  };
  recentActions: Array<{
    id: string;
    event_type: string;
    entity_type: string;
    entity_id: string;
    timestamp: string;
    severity?: 'info' | 'warning' | 'error' | 'success';
    details?: string;
    payload?: any;
  }>;
}

export interface InstitutionInterestStats {
  total_requests: number;
  top_requested: Array<{
    name: string;
    request_count: number;
  }>;
  requests_over_time: Array<{
    month: string;
    count: number;
  }>;
  recent_requests: Array<{
    id: string;
    name: string;
    email_domain: string;
    user_email?: string;
    created_at: string;
  }>;
}

class AdminAuthService {
  private client = apiClient;

  /**
   * Admin login - tokens now stored in HttpOnly cookies by backend
   * No need to manually manage tokens in localStorage anymore
   */
  async login(credentials: AdminLoginCredentials): Promise<AdminAuthResponse> {
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

      // Backend sets HttpOnly cookies; response body contains only user data
      const response = await this.client.post<AdminAuthResponse>(
        '/api/admin/auth/login/',
        credentials
      );

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Admin login failed. Please check your credentials.');
    }
  }

  /**
   * Refresh admin token - tokens obtained from HttpOnly cookies automatically
   * No need to manually pass refresh token anymore
   */
  async refreshToken(): Promise<AdminTokenRefreshResponse> {
    try {
      // Backend reads refresh_token from HttpOnly cookie automatically
      // No need to send it in request body
      const response = await this.client.post<AdminTokenRefreshResponse>(
        '/api/admin/auth/token/refresh/',
        {}
      );

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Admin token refresh failed. Please log in again.');
    }
  }

  /**
   * Admin logout - clears HttpOnly cookies on backend
   */
  async logout(): Promise<void> {
    try {
      // Backend will use the refresh_token from HttpOnly cookie to blacklist it
      await this.client.post('/api/admin/auth/logout/', {});
    } catch (error) {
      // Logout should not block UI even if API call fails
      console.warn('Admin logout API call failed:', error);
    } finally {
      // Remove legacy localStorage tokens from old sessions (Phase 1 migration)
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminRole');
    }
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const response = await this.client.get<any>('/api/admin/dashboard/stats/');
      
      const systemStats = response.system_stats || response.systemStats || {};
      
      return {
        totalUsers: systemStats.total_users ?? systemStats.totalUsers ?? response.totalUsers ?? response.total_users ?? 0,
        totalUsersTrend: systemStats.total_users_trend ?? systemStats.totalUsersTrend,
        totalStudents: systemStats.total_students ?? systemStats.totalStudents ?? 0,
        totalInstitutions: systemStats.total_institutions ?? systemStats.totalInstitutions ?? response.totalInstitutions ?? response.total_institutions ?? 0,
        totalInstitutionsTrend: systemStats.total_institutions_trend ?? systemStats.totalInstitutionsTrend,
        pendingInstitutions: systemStats.pending_institutions ?? systemStats.pendingInstitutions ?? response.pendingInstitutionsCount ?? response.pending_institutions_count ?? 0,
        totalStudentInterests: systemStats.total_student_interests ?? systemStats.totalStudentInterests ?? 0,
        totalPlatformStaff: systemStats.total_platform_staff ?? systemStats.totalPlatformStaff ?? response.totalPlatformStaff ?? response.total_platform_staff ?? 0,
        pendingInvites: response.pendingInvites ?? response.pending_invites ?? 0,
        systemHealth: response.systemHealth ?? response.system_health ?? {
          status: 'unknown',
          message: 'Status unknown',
          lastCheck: new Date().toISOString()
        },
        recentActions: response.recentActions ?? response.recent_actions ?? []
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch admin dashboard stats');
    }
  }

  async getAdminUsers(params?: {
    page?: number;
    pageSize?: number;
    role?: string;
    search?: string;
    status?: string;
  }): Promise<{
    results: AdminUser[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    try {
      const response = await this.client.get('/api/admin/users/', { params });
      return response as any;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch admin users');
    }
  }

  async getAdminUser(id: string): Promise<AdminUser> {
    try {
      const response = await this.client.get<AdminUser>(`/api/admin/users/${id}/`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch admin user');
    }
  }

  async createAdminUser(userData: CreateAdminUserData): Promise<AdminUser> {
    try {
      const response = await this.client.post<AdminUser>('/api/admin/users/', userData);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to create admin user');
    }
  }

  async updateAdminUser(id: string, userData: UpdateAdminUserData): Promise<AdminUser> {
    try {
      const response = await this.client.patch<AdminUser>(`/api/admin/users/${id}/`, userData);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to update admin user');
    }
  }

  async deleteAdminUser(id: string): Promise<void> {
    try {
      await this.client.delete(`/api/admin/users/${id}/`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to delete admin user');
    }
  }

  async suspendUser(userId: string, reason?: string): Promise<void> {
    try {
      await this.client.post(`/api/admin/users/${userId}/suspend/`, { reason });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to suspend user');
    }
  }

  async reactivateUser(userId: string, reason?: string): Promise<void> {
    try {
      await this.client.post(`/api/admin/users/${userId}/reactivate/`, { reason });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to reactivate user');
    }
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    services: Record<string, 'healthy' | 'warning' | 'error'>;
    uptime: string;
    last_check: string;
  }> {
    try {
      const response = await this.client.get('/api/admin/system/health/');
      return response as any;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch system health');
    }
  }

  async getSystemStats(): Promise<{
    total_users: number;
    total_users_trend: number;
    active_users: number;
    total_institutions: number;
    total_institutions_trend: number;
    total_internships: number;
    total_internships_trend: number;
    total_applications: number;
    total_applications_trend: number;
    system_load: number;
    response_time: number;
    memory_usage: number;
    disk_usage: number;
    api_requests: number;
  }> {
    try {
      const response = await this.client.get('/api/admin/system/stats/');
      return response as any;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch system stats');
    }
  }

  async getSystemActivity(): Promise<Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    details: string;
    severity: 'info' | 'warning' | 'error';
  }>> {
    try {
      const response = await this.client.get('/api/admin/system/activity/');
      return response as any;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch system activity');
    }
  }

  async getSystemLogs(params?: {
    page?: number;
    pageSize?: number;
    level?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    logs: Array<{
      id: string;
      level: string;
      message: string;
      timestamp: string;
      user?: string;
      action?: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const response = await this.client.get('/api/admin/system/logs/', { params });
      return response as any;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch system logs');
    }
  }

  async getSystemSettings(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get('/api/admin/system/settings/');
      return response as any;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch system settings');
    }
  }

  async getInstitutionInterestStats(): Promise<InstitutionInterestStats> {
    try {
      const response = await this.client.get<InstitutionInterestStats>('/api/admin/system/institution-interest/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch institution interest statistics');
    }
  }

  async sendInstitutionInterestOutreach(interestId: string): Promise<void> {
    try {
      await this.client.post('/api/admin/system/institution-interest/outreach/', { interest_id: interestId });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to send outreach email');
    }
  }

  async updateSystemSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    try {
      const response = await this.client.patch('/api/admin/system/settings/', settings);
      return response as any;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to update system settings');
    }
  }

  async inviteStaff(data: { email: string; role: string; message?: string }): Promise<void> {
    try {
      await this.client.post('/api/admin/staff/invites/', data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to send staff invitation');
    }
  }

  async acceptInvite(data: { token: string; password: string; first_name?: string; last_name?: string }): Promise<void> {
    try {
      await this.client.post('/api/admin/staff/accept/', data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthenticationError('Failed to accept invitation');
    }
  }

  async getInstitutions(params?: any): Promise<any> {
    try {
      const response = await this.client.get('/api/admin/institutions/', { params });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch institutions');
    }
  }

  async getPendingInstitutionRequests(): Promise<any> {
    try {
      const response = await this.client.get('/api/admin/institutions/pending/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to fetch pending institution requests');
    }
  }

  async approveInstitutionRequest(requestId: string): Promise<any> {
    try {
      const response = await this.client.post(`/api/admin/institution-requests/${requestId}/review/`, {
        action: 'approve'
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to approve institution request');
    }
  }

  async rejectInstitutionRequest(requestId: string, reasonCode: string, reason: string): Promise<any> {
    try {
      const response = await this.client.post(`/api/admin/institution-requests/${requestId}/review/`, {
        action: 'reject',
        rejection_reason_code: reasonCode,
        rejection_reason: reason
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to reject institution request');
    }
  }

  async exportInstitutions(): Promise<Blob> {
    try {
      // Assuming a standard export endpoint exists or will exist
      const response = await this.client.get('/api/admin/institutions/export/', {
        responseType: 'blob',
        headers: {
          'Accept': 'text/csv'
        }
      });
      return response as unknown as Blob;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new AuthorizationError('Failed to export institutions');
    }
  }

  // Utility methods
  isAdminAuthenticated(): boolean {
    const token = localStorage.getItem('adminToken');
    const admin = localStorage.getItem('adminUser');
    return !!(token && admin);
  }

  getStoredAdmin(): AdminUser | null {
    try {
      const adminData = localStorage.getItem('adminUser');
      return adminData ? JSON.parse(adminData) : null;
    } catch {
      return null;
    }
  }

  getAdminRole(): string | null {
    return localStorage.getItem('adminRole');
  }

  hasPermission(permission: string): boolean {
    const admin = this.getStoredAdmin();
    return admin?.permissions.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    const admin = this.getStoredAdmin();
    return admin?.role === role;
  }

  isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN');
  }

  isPlatformAdmin(): boolean {
    return this.hasRole('PLATFORM_ADMIN');
  }

  isModerator(): boolean {
    return this.hasRole('MODERATOR');
  }

  isAuditor(): boolean {
    return this.hasRole('AUDITOR');
  }

  clearAdminAuth(): void {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminRole');
  }
}

export const adminAuthService = new AdminAuthService();
export default adminAuthService;
export type {
  AdminUser,
  AdminLoginCredentials,
  AdminAuthResponse,
  AdminTokenRefreshResponse,
  CreateAdminUserData,
  UpdateAdminUserData,
  AdminDashboardStats,
};