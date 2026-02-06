import { apiClient } from '../api/client';
import { ApiError } from '../errors';

interface ValidateTokenResponse {
  valid: boolean;
  email: string;
  institution_name: string;
  representative_name?: string;
  website_url?: string;
  contact_phone?: string;
  role?: string;
}

interface ActivateAccountData {
  invite_id: string;
  token: string;
  first_name: string;
  last_name: string;
  password: string;
  phone_number?: string;
}

interface ActivateAccountResponse {
  message: string;
  email: string;
}

export interface AffiliatedStudent {
  id: string;
  student_id: string;
  student_email: string;
  student_registration_number?: string;
  student_trust_level: number;
  department_id?: string;
  cohort_id?: string;
  department_name?: string;
  cohort_name?: string;
  supervisor_name?: string;
  supervisor_email?: string;
  status: string;
  created_at: string;
}

export interface InstitutionRequestData {
  institution_name: string;
  website_url: string;
  requested_domains: string[];
  representative_name: string;
  representative_email: string;
  representative_role: string;
  representative_phone: string;
  department: string;
  notes: string;
}

interface InstitutionRequestResponse {
  tracking_code: string;
}

interface RecordInterestData {
  raw_name: string;
  user_email: string;
  email_domain: string;
}

export interface SupervisorProfileUpdateRequest {
  id: string;
  staff: string;
  staff_name: string;
  staff_email: string;
  requested_changes: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  status: string;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  admin_feedback?: string;
  created_at: string;
}

export interface InstitutionProfile {
  id: string;
  name: string;
  domain: string;
  logo?: string | null;
  is_active: boolean;
  is_verified: boolean;
  status: string;
  verification_method: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  description?: string;
  trust_level?: number;
  created_at?: string;
}

export interface PlacementStats {
  summary: {
    total_students: number;
    total_placements: number;
    placement_rate: number;
    total_applications: number;
    total_trend: number;
  };
  funnel: {
    applied: number;
    shortlisted: number;
    accepted: number;
    active: number;
    completed: number;
    certified: number;
  };
  departments: Array<{
    name: string;
    placements: number;
    certified: number;
    total_students: number;
    placement_rate: number;
  }>;
  quality_control: {
    evidence_count: number;
    avg_evidence_per_placement: number;
    total_incidents: number;
    unresolved_incidents: number;
    audit_readiness_score: number;
  };
}

export interface TimeToPlacementStats {
    average_days: number;
    median_days: number;
}

class InstitutionService {
  private client = apiClient;

  async getProfile(): Promise<InstitutionProfile> {
    try {
      const response = await this.client.get<InstitutionProfile>('/api/institutions/institutions/profile/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch institution profile');
    }
  }

  async getTrustProgress(): Promise<any> {
    try {
      const response = await this.client.get<any>('/api/institutions/institutions/trust_progress/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch trust progress');
    }
  }

  async updateProfile(data: Partial<InstitutionProfile> | FormData): Promise<InstitutionProfile> {
    try {
      const response = await this.client.patch<InstitutionProfile>('/api/institutions/institutions/profile/', data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update institution profile');
    }
  }

  async getStudents(params?: { department_id?: string; cohort_id?: string }): Promise<AffiliatedStudent[]> {
    try {
      const response = await this.client.get<AffiliatedStudent[]>('/api/institutions/institutions/students/', { params });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch affiliated students');
    }
  }

  async getPlacementSuccessStats(): Promise<PlacementStats> {
    try {
      const response = await this.client.get<PlacementStats>('/api/institutions/institution-reports/placement-success/');
      return response;
    } catch (error) {
       if (error instanceof ApiError) throw error;
       throw new Error('Failed to fetch placement stats');
    }
  }

  async getTimeToPlacementStats(): Promise<TimeToPlacementStats> {
    try {
      const response = await this.client.get<TimeToPlacementStats>('/api/institutions/institution-reports/time-to-placement/');
      return response;
    } catch (error) {
       if (error instanceof ApiError) throw error;
       throw new Error('Failed to fetch time to placement stats');
    }
  }

  async exportReport(): Promise<Blob> {
    try {
        const response = await this.client.get<Blob>('/api/institutions/institution-reports/export/', {
            responseType: 'blob'
        });
        return response;
    } catch (error) {
       if (error instanceof ApiError) throw error;
       throw new Error('Failed to export report');
    }
  }

  async getPublicList(query?: string): Promise<any[]> {
    try {
      const params = query ? { q: query } : {};
      const response = await this.client.get<any>('/api/institutions/institutions/public_list/', { params });
      return response.results || response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch institutions');
    }
  }

  async recordInterest(data: RecordInterestData): Promise<void> {
    try {
      await this.client.post('/api/institutions/institutions/record_interest/', data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to record institution interest');
    }
  }

  async requestSupervisorProfileUpdate(
    data: { first_name?: string; last_name?: string; email?: string }
  ): Promise<SupervisorProfileUpdateRequest> {
    try {
      const response = await this.client.post<SupervisorProfileUpdateRequest>(
        '/api/institutions/institution-staff/request_profile_update/',
        data
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to submit profile update request');
    }
  }

  async validateInviteToken(inviteId: string, token: string): Promise<ValidateTokenResponse> {
    try {
      const response = await this.client.post<ValidateTokenResponse>(
        '/api/institutions/institution-invites/validate_token/',
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
        '/api/institutions/institution-invites/activate/',
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

  async activateSupervisorAccount(data: ActivateAccountData): Promise<ActivateAccountResponse> {
    try {
      const response = await this.client.post<ActivateAccountResponse>(
        '/api/institutions/institution-invites/activate_supervisor/',
        data,
        { headers: { 'skip-auth': 'true' } }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to activate supervisor account');
    }
  }

  async submitRequest(data: InstitutionRequestData): Promise<InstitutionRequestResponse> {
    try {
      const response = await this.client.post<InstitutionRequestResponse>(
        '/api/institutions/institution-requests/',
        data
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to submit institution request');
    }
  }

  async getPendingVerifications(): Promise<PendingVerification[]> {
    try {
      const response = await this.client.get<PendingVerification[]>('/api/institutions/institution-verifications/pending/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch pending verifications');
    }
  }

  async approveVerification(id: string, departmentId?: string, cohortId?: string): Promise<void> {
    try {
      await this.client.post(`/api/institutions/institution-verifications/${id}/approve/`, {
        department_id: departmentId,
        cohort_id: cohortId
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to approve verification');
    }
  }

  async rejectVerification(id: string, reason: string): Promise<void> {
    try {
      await this.client.post(`/api/institutions/institution-verifications/${id}/reject/`, { reason });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to reject verification');
    }
  }

  async bulkPreview(file: File): Promise<BulkPreviewResult[]> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await this.client.post<BulkPreviewResult[]>('/api/institutions/institution-verifications/bulk-preview/', formData);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to upload bulk verification file');
    }
  }

  async bulkConfirm(entries: { student_id?: string; email: string; registration_number?: string }[], departmentId?: string, cohortId?: string): Promise<BulkConfirmResponse> {
    try {
      const payload: any = { entries };
      if (departmentId) payload.department_id = departmentId;
      if (cohortId) payload.cohort_id = cohortId;
      
      const response = await this.client.post<BulkConfirmResponse>('/api/institutions/institution-verifications/bulk-confirm/', payload);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to confirm bulk verification');
    }
  }

  async getPlacements(params?: { status?: string; department?: string }): Promise<any[]> {
    try {
      const response = await this.client.get<any[]>('/api/institutions/institution-placements/', { params });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch placements');
    }
  }

  async getStaffList(params?: { search?: string; role?: string }): Promise<InstitutionStaffMember[]> {
    try {
      const response = await this.client.get<any>('/api/institutions/institution-staff/', { params });
      return response.results || response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch staff list');
    }
  }

  async getStaffProfileRequests(
    params?: { status?: string }
  ): Promise<SupervisorProfileUpdateRequest[]> {
    try {
      const response = await this.client.get<any>(
        '/api/institutions/institution-staff-profile-requests/',
        { params }
      );
      return response.results || response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch profile update requests');
    }
  }

  async reviewStaffProfileRequest(
    requestId: string,
    data: { action: 'approve' | 'reject'; admin_feedback?: string }
  ): Promise<SupervisorProfileUpdateRequest> {
    try {
      const response = await this.client.post<SupervisorProfileUpdateRequest>(
        `/api/institutions/institution-staff-profile-requests/${requestId}/review/`,
        data
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to review profile update request');
    }
  }

  async inviteSupervisor(data: InviteSupervisorData): Promise<void> {
    try {
      await this.client.post('/api/institutions/institution-staff/invite_supervisor/', data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to invite supervisor');
    }
  }

  async removeStaff(staffId: string): Promise<void> {
    try {
      await this.client.delete(`/api/institutions/institution-staff/${staffId}/`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to remove staff');
    }
  }

  async updateStudentAffiliation(
    studentId: string, 
    data: { department_id?: string; cohort_id?: string }
  ): Promise<void> {
    try {
      await this.client.patch(`/api/institutions/institutions/students/${studentId}/update_affiliation/`, data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update student affiliation');
    }
  }

  async updateStaffPersonalDetails(
    staffId: string, 
    data: { first_name?: string; last_name?: string; email?: string }
  ): Promise<void> {
    try {
      await this.client.patch(`/api/institutions/institution-staff/${staffId}/update-personal-details/`, data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update staff details');
    }
  }

  async bulkAssignSupervisors(data: {
    institution_id: string;
    department_id: string;
    cohort_id?: string;
  }): Promise<{ assigned_count: number; message: string }> {
    try {
      const response = await this.client.post<{ assigned_count: number; message: string }>(
        '/api/internships/applications/bulk-assign-supervisors/',
        data
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to bulk assign supervisors');
    }
  }

  async resendInvite(inviteId: string): Promise<void> {
    try {
      await this.client.post(`/api/institutions/institution-invites/${inviteId}/resend/`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to resend invite');
    }
  }

  async getSupervisorProfile(): Promise<SupervisorProfile> {
    try {
      const response = await this.client.get<SupervisorProfile>('/api/institutions/institution-staff/me/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch supervisor profile');
    }
  }

  async getDepartments(): Promise<Department[]> {
    try {
      const response = await this.client.get<any>('/api/institutions/departments/');
      return response.results || response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch departments');
    }
  }

  async createDepartment(data: CreateDepartmentPayload): Promise<Department> {
    try {
      const response = await this.client.post<Department>('/api/institutions/departments/', data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to create department');
    }
  }

  async updateDepartment(id: string, data: Partial<CreateDepartmentPayload>): Promise<Department> {
    try {
      const response = await this.client.patch<Department>(`/api/institutions/departments/${id}/`, data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update department');
    }
  }

  async deleteDepartment(id: string): Promise<void> {
    try {
      await this.client.delete(`/api/institutions/departments/${id}/`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to delete department');
    }
  }

  async getCohorts(departmentId?: string): Promise<Cohort[]> {
    try {
      const params = departmentId ? { department: departmentId } : {};
      const response = await this.client.get<any>('/api/institutions/cohorts/', { params });
      return response.results || response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch cohorts');
    }
  }

  async createCohort(data: CreateCohortPayload): Promise<Cohort> {
    try {
      const response = await this.client.post<Cohort>('/api/institutions/cohorts/', data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to create cohort');
    }
  }

  async updateCohort(id: string, data: Partial<CreateCohortPayload>): Promise<Cohort> {
    try {
      const response = await this.client.patch<Cohort>(`/api/institutions/cohorts/${id}/`, data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update cohort');
    }
  }

  async deleteCohort(id: string): Promise<void> {
    try {
      await this.client.delete(`/api/institutions/cohorts/${id}/`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to delete cohort');
    }
  }
}

export interface Department {
  id: string;
  name: string;
  code: string;
  aliases: string[];
  is_active: boolean;
}

export interface CreateDepartmentPayload {
  name: string;
  code?: string;
  aliases?: string[];
  is_active?: boolean;
}

export interface Cohort {
  id: string;
  department_id: string;
  name: string;
  start_year: number;
  end_year?: number;
  intake_label?: string;
}

export interface CreateCohortPayload {
  department_id: string;
  name: string;
  start_year: number;
  end_year?: number;
  intake_label?: string;
}

export interface SupervisorProfile {
  id: string;
  role: string;
  department: string;
  cohort: string;
  institution_id: string;
  institution_name: string;
}

export interface PendingVerification {
  id: string;
  student_id: string;
  student_name?: string;
  institution_id: string;
  status: string;
  claimed_via: string;
  institution_name?: string;
  student_email?: string;
  student_trust_level?: number;
  created_at: string;
  raw_department_input?: string;
  raw_cohort_input?: string;
}

export interface BulkPreviewResult {
  email: string;
  registration_number: string;
  status: 'ready' | 'already_verified' | 'ready_domain_match' | 'conflict' | 'not_found' | 'unknown';
  student_id: string | null;
  name: string;
  message: string;
}

export interface BulkConfirmResponse {
  count: number;
  message: string;
}

export interface InstitutionStaffMember {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  role_display: string;
  status: string;
  department?: string;
  cohort?: string;
  last_active?: string;
  invite_id?: string;
}

export interface InviteSupervisorData {
  email: string;
  department_id: string;
  cohort_id?: string;
}

export const institutionService = new InstitutionService();
