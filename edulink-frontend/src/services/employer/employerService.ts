import { apiClient } from '../api/client';
import { ApiError } from '../errors';

export interface EmployerRequestData {
  name: string;
  official_email: string;
  domain: string;
  organization_type: string;
  contact_person: string;
  phone_number: string;
  website_url?: string;
  registration_number?: string;
}

export interface EmployerRequestResponse {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
}

export interface EmployerRequestStatusResponse {
  tracking_code: string;
  status: string;
  name: string;
  submitted_at: string;
  rejection_reason?: string;
}

export interface ValidateInviteResponse {
    valid: boolean;
    email: string;
    employer_name: string;
    contact_person?: string;
    phone_number?: string;
    role?: 'ADMIN' | 'SUPERVISOR';
}

export interface ActivateAccountData {
  invite_id: string;
  token: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  password: string;
}

export interface ActivateAccountResponse {
  message: string;
  email: string;
}

export interface EmployerRequest {
  id: string;
  name: string;
  official_email: string;
  domain: string;
  organization_type: string;
  contact_person: string;
  phone_number: string;
  website_url?: string;
  registration_number?: string;
  status: string;
  tracking_code: string;
  created_at: string;
  rejection_reason?: string;
}

export interface Employer {
  id: string;
  name: string;
  official_email: string;
  domain: string;
  organization_type: string;
  contact_person: string;
  phone_number: string;
  website_url?: string;
  registration_number?: string;
  logo?: string | null;
  status: string;
  trust_level: number;
  is_featured: boolean;
  max_active_students: number;
  supervisor_ratio: number;
  active_internship_count?: number;
  current_supervisor_ratio?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewRequestData {
  action: 'approve' | 'reject';
  rejection_reason_code?: string;
  rejection_reason?: string;
}

export interface Supervisor {
  id: string;
  user: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR';
  is_active: boolean;
}

export interface InviteSupervisorData {
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface EmployerStaffProfileRequest {
  id: string;
  staff: Supervisor;
  employer: string;
  requested_changes: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_feedback?: string;
}

export interface EmployerStaffProfileRequestCreate {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface EmployerStaffProfileRequestAction {
  action: 'approve' | 'reject';
  admin_feedback?: string;
}

class EmployerService {
  private client = apiClient;

  async getRequests(params?: { status?: string; search?: string }): Promise<EmployerRequest[]> {
    try {
      const response = await this.client.get<EmployerRequest[]>('/api/employers/employer-requests/', { params });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to fetch employer requests');
    }
  }

  async getCurrentEmployer(): Promise<Employer> {
    try {
      const response = await this.client.get<Employer>('/api/employers/employers/me/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch current employer details');
    }
  }

  async getTrustProgress(): Promise<any> {
    try {
      const response = await this.client.get<any>('/api/employers/employers/trust_progress/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch trust progress');
    }
  }

  async updateProfile(id: string, data: Partial<Employer> | FormData): Promise<Employer> {
    try {
      const response = await this.client.patch<Employer>(`/api/employers/employers/${id}/`, data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update employer profile');
    }
  }

  async getSupervisors(): Promise<Supervisor[]> {
    try {
      const response = await this.client.get<Supervisor[]>('/api/employers/employer-supervisors/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch supervisors');
    }
  }

  async inviteSupervisor(data: InviteSupervisorData): Promise<Supervisor> {
    try {
      const response = await this.client.post<Supervisor>('/api/employers/employer-supervisors/invite/', data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to invite supervisor');
    }
  }

  async removeSupervisor(id: string): Promise<void> {
    try {
      await this.client.delete(`/api/employers/employer-supervisors/${id}/`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to remove supervisor');
    }
  }

  async submitProfileUpdateRequest(data: EmployerStaffProfileRequestCreate): Promise<EmployerStaffProfileRequest> {
    try {
      const response = await this.client.post<EmployerStaffProfileRequest>('/api/employers/employer-supervisors/profile-update-request/', data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to submit profile update request');
    }
  }

  async getProfileUpdateRequests(status?: string): Promise<EmployerStaffProfileRequest[]> {
    try {
      const params = status ? { status } : {};
      const response = await this.client.get<EmployerStaffProfileRequest[]>('/api/employers/employer-staff-profile-requests/', { params });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch profile update requests');
    }
  }

  async reviewProfileUpdateRequest(requestId: string, data: EmployerStaffProfileRequestAction): Promise<EmployerStaffProfileRequest> {
    try {
      const response = await this.client.post<EmployerStaffProfileRequest>(`/api/employers/employer-staff-profile-requests/${requestId}/review/`, data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to review profile update request');
    }
  }

  async getEmployers(params?: { status?: string; search?: string; is_featured?: boolean }): Promise<Employer[]> {
    try {
      const response = await this.client.get<Employer[]>('/api/employers/employers/', { params });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to fetch employers');
    }
  }

  async getPendingRequests(): Promise<EmployerRequest[]> {
    return this.getRequests({ status: 'PENDING' });
  }

  async reviewRequest(requestId: string, data: ReviewRequestData): Promise<EmployerRequest> {
    try {
      const response = await this.client.post<EmployerRequest>(
        `/api/employers/employer-requests/${requestId}/review/`,
        data
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to review request');
    }
  }

  async submitRequest(data: EmployerRequestData): Promise<EmployerRequestResponse> {
    try {
      const response = await this.client.post<EmployerRequestResponse>(
        '/api/employers/employer-requests/',
        data
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to submit employer request');
    }
  }

  async getRequestStatus(trackingCode: string): Promise<EmployerRequestStatusResponse> {
    try {
      const response = await this.client.get<EmployerRequestStatusResponse>(
        `/api/employers/employer-requests/track/?code=${trackingCode}`
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to track request');
    }
  }

  async validateInviteToken(inviteId: string, token: string): Promise<ValidateInviteResponse> {
    try {
      const response = await this.client.post<ValidateInviteResponse>(
        '/api/employers/employer-invites/validate_token/',
        { invite_id: inviteId, token },
        { headers: { 'skip-auth': 'true' } }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to validate invite token');
    }
  }

  async activateAccount(data: ActivateAccountData): Promise<ActivateAccountResponse> {
    try {
      const response = await this.client.post<ActivateAccountResponse>(
        '/api/employers/employer-invites/activate/',
        data,
        { headers: { 'skip-auth': 'true' } }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to activate account');
    }
  }
}

export const employerService = new EmployerService();
