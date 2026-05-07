import { apiClient } from '../api/client';
import { ApiError } from '../errors';
import type { Employer } from '../employer/employerService';

export interface SuccessStory {
  id: string;
  application: string; // Changed from internship
  student_testimonial: string;
  employer_feedback: string;
  is_published: boolean;
  created_at: string;
  student_name: string;
  employer_name: string;
}

export interface InternshipOpportunity {
  id: string;
  title: string;
  description: string;
  department: string;
  skills: string[];
  capacity: number;
  location: string;
  location_type: 'ONSITE' | 'REMOTE' | 'HYBRID';
  institution_id?: string;
  employer_id?: string;
  employer_details?: Employer;
  status: string; // DRAFT, OPEN, CLOSED
  start_date?: string;
  end_date?: string;
  duration?: string;
  application_deadline?: string;
  is_deadline_expired?: boolean; // Backend computed field for deadline validation
  is_institution_restricted?: boolean;
  application_mode?: 'INTERNAL' | 'EXTERNAL';
  origin?: 'EDULINK_INTERNAL' | 'EXTERNAL_STUDENT_DECLARED' | 'ADMIN_CURATED_EXTERNAL';
  external_employer_name?: string;
  external_source_name?: string;
  external_apply_url?: string;
  external_reference?: string;
  curated_by?: string;
  last_verified_at?: string;
  created_at?: string;
  updated_at?: string;
  student_has_applied?: boolean;

  // Supervisors might still be relevant on Opportunity level?
  // No, supervisors are assigned to Applications (Engagements).
}

export interface InternshipApplication {
  id: string;
  status: string; // APPLIED, SHORTLISTED, ACCEPTED, ACTIVE, COMPLETED, CERTIFIED, REJECTED, TERMINATED
  student_id: string;
  opportunity: string | { status?: string; [key: string]: any }; // UUID or full object if returned by backend

  // Flattened Opportunity Fields
  title: string;
  description: string;
  department: string;
  skills: string[];
  location: string;
  location_type: 'ONSITE' | 'REMOTE' | 'HYBRID';
  start_date?: string;
  end_date?: string;
  duration?: string;
  employer_id?: string;
  institution_id?: string;
  employer_details?: Employer;

  created_at: string;
  updated_at: string;

  student_info?: {
    id: string;
    name: string;
    email: string;
    trust_level?: number;
    trust_points?: number;
  };

  employer_supervisor_id?: string;
  employer_supervisor_details?: {
    id: string;
    user_id?: string;
    name: string;
    email: string;
  };

  institution_supervisor_id?: string;
  institution_supervisor_details?: {
    id: string;
    user_id?: string;
    name: string;
    email: string;
  };

  logbook_count?: number;
  can_complete?: boolean;
  can_feedback?: boolean;
  final_feedback?: string;
  final_rating?: number;
  employer_final_feedback?: string;
  employer_final_rating?: number | null;
  employer_final_feedback_by?: string | null;
  employer_final_feedback_at?: string | null;
  institution_final_feedback?: string;
  institution_final_rating?: number | null;
  institution_final_feedback_by?: string | null;
  institution_final_feedback_at?: string | null;
  start_readiness?: {
    checks: Array<{
      key: string;
      label: string;
      passed: boolean;
    }>;
    missing: string[];
    can_start: boolean;
  };
  completion_readiness?: {
    checks: Array<{
      key: string;
      label: string;
      passed: boolean;
      count?: number;
    }>;
    missing: string[];
    can_mark_completed: boolean;
    can_certify: boolean;
    next_owner: string;
    next_action: string;
    summary: string;
  };

  cover_letter?: string;
  application_snapshot?: any;
}

// Alias for backward compatibility if needed, but we should migrate.
export type Internship = InternshipOpportunity;

export interface CreateInternshipData {
  title: string;
  description: string;
  department?: string;
  skills?: string[];
  capacity?: number;
  location?: string;
  location_type?: 'ONSITE' | 'REMOTE' | 'HYBRID';
  institution_id?: string;
  employer_id?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  application_deadline?: string;
  is_institution_restricted?: boolean;
  application_mode?: 'INTERNAL' | 'EXTERNAL';
  origin?: 'EDULINK_INTERNAL' | 'EXTERNAL_STUDENT_DECLARED' | 'ADMIN_CURATED_EXTERNAL';
  external_employer_name?: string;
  external_source_name?: string;
  external_apply_url?: string;
  external_reference?: string;
}

export interface ExternalPlacementDeclaration {
  id: string;
  student_id: string;
  student_info?: {
    name?: string;
    email?: string;
    registration_number?: string;
    department?: string;
    cohort?: string;
  };
  institution_id: string;
  application?: string;
  application_status?: string;
  status: 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  status_display?: string;
  company_name: string;
  company_contact_name?: string;
  company_contact_email?: string;
  company_contact_phone?: string;
  role_title: string;
  location?: string;
  location_type: 'ONSITE' | 'REMOTE' | 'HYBRID';
  start_date: string;
  end_date?: string | null;
  source_url?: string;
  proof_document?: string;
  student_notes?: string;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalPlacementDeclarationPayload {
  institution_id: string;
  company_name: string;
  company_contact_name?: string;
  company_contact_email?: string;
  company_contact_phone?: string;
  role_title: string;
  location?: string;
  location_type?: 'ONSITE' | 'REMOTE' | 'HYBRID';
  start_date: string;
  end_date?: string;
  source_url?: string;
  proof_document?: File;
  student_notes?: string;
}

export interface InternshipParams {
  status?: string;
  search?: string;
  employer_id?: string;
  institution_id?: string;
  // student_id?: string; // Moved to ApplicationParams
  // opportunity_id?: string; // Moved to ApplicationParams
  is_institution_restricted?: boolean;
  location?: string;
  location_type?: 'ONSITE' | 'REMOTE' | 'HYBRID';
  department?: string;
  duration?: string;
  employer__organization_type?: string;
  // employer__is_featured?: boolean; // Removed from backend filter
  // Add pagination support
  limit?: number;
  offset?: number;
}

export interface ApplicationParams {
  status?: string;
  student_id?: string;
  opportunity_id?: string;
  student__trust_level?: number;
  is_institutional?: boolean;
  // Add pagination support
  limit?: number;
  offset?: number;
}

export interface InternshipEvidence {
  id: string;
  application: string; // Changed from internship
  submitted_by: string;
  title: string;
  description: string;
  file: string;
  evidence_type: 'LOGBOOK' | 'REPORT' | 'PROJECT' | 'MILESTONE' | 'OTHER';
  status:
    | 'SUBMITTED'
    | 'REVIEWED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'REVISION_REQUIRED';
  created_at: string;

  // Dual Review Fields
  employer_review_status?: string;
  employer_reviewed_by?: string;
  employer_reviewed_at?: string;
  employer_review_notes?: string;
  employer_private_notes?: string;

  institution_review_status?: string;
  institution_reviewed_by?: string;
  institution_reviewed_at?: string;
  institution_review_notes?: string;
  institution_private_notes?: string;
  metadata?: {
    week_start_date?: string;
    weekStartDate?: string; // Support both naming conventions from different services
    entries?: Record<string, string>;
    [key: string]: any;
  };
  student_info?: {
    id: string;
    name: string;
    email: string;
  };
  internship_title?: string;
}

export interface Incident {
  id: string;
  application: string; // Changed from internship
  reported_by: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'INVESTIGATING' | 'PENDING_APPROVAL' | 'RESOLVED' | 'DISMISSED';
  investigator_id?: string;
  assigned_at?: string;
  investigation_notes?: string;
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at?: string;
  internship_title?: string;
  student_info?: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: {
    events: Array<{
      event_type: string;
      from_state: string;
      to_state: string;
      actor_id: string;
      actor_role: string;
      actor_name: string;
      timestamp: string;
    }>;
  };
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class InternshipService {
  private client = apiClient;

  // --- Opportunities ---

  async getInternships(
    params?: InternshipParams
  ): Promise<PaginatedResponse<InternshipOpportunity>> {
    try {
      const cleanParams: Record<string, any> = {};
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            cleanParams[key] = value;
          }
        });
      }

      const response = await this.client.get<
        PaginatedResponse<InternshipOpportunity>
      >('/api/internships/', {
        params: cleanParams,
      });
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getInternship(id: string): Promise<InternshipOpportunity> {
    try {
      const response = await this.client.get<InternshipOpportunity>(
        `/api/internships/${id}/`
      );
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async createOpportunity(
    data: CreateInternshipData
  ): Promise<InternshipOpportunity> {
    try {
      const response = await this.client.post<InternshipOpportunity>(
        '/api/internships/create_opportunity/',
        data
      );
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async publishOpportunity(id: string): Promise<InternshipOpportunity> {
    try {
      const response = await this.client.post<InternshipOpportunity>(
        `/api/internships/${id}/publish/`
      );
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async applyForInternship(
    opportunityId: string,
    coverLetter?: string
  ): Promise<InternshipApplication> {
    try {
      const response = await this.client.post<InternshipApplication>(
        `/api/internships/${opportunityId}/apply/`,
        {
          cover_letter: coverLetter,
        }
      );
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getExternalPlacementDeclarations(): Promise<ExternalPlacementDeclaration[]> {
    const response = await this.client.get<PaginatedResponse<ExternalPlacementDeclaration> | ExternalPlacementDeclaration[]>(
      '/api/internships/external-placement-declarations/'
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async declareExternalPlacement(
    data: ExternalPlacementDeclarationPayload
  ): Promise<ExternalPlacementDeclaration> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value as string | Blob);
      }
    });

    return this.client.post<ExternalPlacementDeclaration>(
      '/api/internships/external-placement-declarations/',
      formData
    );
  }

  async approveExternalPlacementDeclaration(
    declarationId: string,
    reviewNotes = ''
  ): Promise<ExternalPlacementDeclaration> {
    return this.client.post<ExternalPlacementDeclaration>(
      `/api/internships/external-placement-declarations/${declarationId}/approve/`,
      { review_notes: reviewNotes }
    );
  }

  async requestExternalPlacementChanges(
    declarationId: string,
    reviewNotes = ''
  ): Promise<ExternalPlacementDeclaration> {
    return this.client.post<ExternalPlacementDeclaration>(
      `/api/internships/external-placement-declarations/${declarationId}/request-changes/`,
      { review_notes: reviewNotes }
    );
  }

  async rejectExternalPlacementDeclaration(
    declarationId: string,
    reviewNotes = ''
  ): Promise<ExternalPlacementDeclaration> {
    return this.client.post<ExternalPlacementDeclaration>(
      `/api/internships/external-placement-declarations/${declarationId}/reject/`,
      { review_notes: reviewNotes }
    );
  }

  // --- Applications (Engagements) ---

  async getApplications(
    params?: ApplicationParams
  ): Promise<InternshipApplication[]> {
    try {
      const cleanParams: Record<string, any> = {};
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            cleanParams[key] = value;
          }
        });
      }

      const response = await this.client.get<any>(
        '/api/internships/applications/',
        { params: cleanParams }
      );
      // Handle paginated response - extract array from { results: [...] } if needed
      return Array.isArray(response) ? response : response?.results || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch applications');
    }
  }

  async getApplication(id: string): Promise<InternshipApplication> {
    try {
      const response = await this.client.get<InternshipApplication>(
        `/api/internships/applications/${id}/`
      );
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getCertificationApplications(): Promise<InternshipApplication[]> {
    try {
      const response = await this.client.get<any>(
        '/api/internships/applications/certification-candidates/'
      );
      return Array.isArray(response) ? response : response?.results || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch certification applications');
    }
  }

  async processApplication(
    id: string,
    action:
      | 'SHORTLIST'
      | 'REJECT'
      | 'ACCEPT'
      | 'COMPLETE'
      | 'START'
      | 'CERTIFY',
    reason?: string
  ): Promise<InternshipApplication> {
    try {
      const response = await this.client.post<InternshipApplication>(
        `/api/internships/applications/${id}/process_application/`,
        {
          action: action.toLowerCase(),
          reason,
        }
      );
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async submitFinalFeedback(
    id: string,
    feedback: string,
    rating?: number
  ): Promise<InternshipApplication> {
    try {
      const response = await this.client.post<InternshipApplication>(
        `/api/internships/applications/${id}/submit-final-feedback/`,
        {
          feedback,
          rating,
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async assignSupervisor(
    id: string,
    supervisorId: string,
    type: 'employer' | 'institution'
  ): Promise<InternshipApplication> {
    try {
      const response = await this.client.post<InternshipApplication>(
        `/api/internships/applications/${id}/assign_supervisor/`,
        {
          supervisor_id: supervisorId,
          type,
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to assign supervisor');
    }
  }

  async withdrawApplication(
    id: string,
    reason?: string
  ): Promise<InternshipApplication> {
    try {
      const response = await this.client.post<InternshipApplication>(
        `/api/internships/applications/${id}/withdraw/`,
        {
          reason: reason || null,
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to withdraw application');
    }
  }

  async bulkAssignSupervisors(
    institutionId: string,
    departmentId: string,
    cohortId?: string
  ): Promise<{
    assigned_count: number;
    supervisor_count: number;
    message: string;
  }> {
    try {
      const response = await this.client.post<{
        assigned_count: number;
        supervisor_count: number;
        message: string;
      }>('/api/internships/applications/bulk-assign-supervisors/', {
        institution_id: institutionId,
        department_id: departmentId,
        cohort_id: cohortId,
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to perform bulk supervisor assignment');
    }
  }

  async certifyInternship(id: string): Promise<InternshipApplication> {
    try {
      const response = await this.client.post<InternshipApplication>(
        `/api/internships/applications/${id}/process_application/`,
        {
          action: 'certify',
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to certify internship');
    }
  }

  // --- Evidence & Incidents ---

  async getEvidence(applicationId: string): Promise<InternshipEvidence[]> {
    try {
      const response = await this.client.get<InternshipEvidence[]>(
        `/api/internships/applications/${applicationId}/evidence/`
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch evidence');
    }
  }

  async submitEvidence(
    applicationId: string,
    title: string,
    description: string,
    file: File,
    evidenceType: string
  ): Promise<InternshipEvidence> {
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);
      formData.append('evidence_type', evidenceType);

      const response = await this.client.post<InternshipEvidence>(
        `/api/internships/applications/${applicationId}/submit_evidence/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to submit evidence');
    }
  }

  async getPendingEvidence(): Promise<InternshipEvidence[]> {
    try {
      const response = await this.client.get<any>(
        '/api/internships/pending-evidence/'
      );
      // Handle paginated response - extract array from { results: [...] } if needed
      return Array.isArray(response) ? response : response?.results || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch pending evidence');
    }
  }

  async reviewEvidence(
    applicationId: string,
    evidenceId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED',
    notes?: string,
    privateNotes?: string
  ): Promise<InternshipEvidence> {
    try {
      // Backend: /api/internships/applications/{id}/review-evidence/{evidenceId}/
      const response = await this.client.post<InternshipEvidence>(
        `/api/internships/applications/${applicationId}/review-evidence/${evidenceId}/`,
        {
          status,
          notes,
          private_notes: privateNotes,
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to review evidence');
    }
  }

  async reportIncident(
    applicationId: string,
    title: string,
    description: string
  ): Promise<any> {
    try {
      const response = await this.client.post(
        `/api/internships/applications/${applicationId}/report_incident/`,
        {
          title,
          description,
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to report incident');
    }
  }

  async getIncidents(): Promise<Incident[]> {
    try {
      const response = await this.client.get<any>(
        '/api/internships/incidents/'
      );
      // Handle paginated response - extract array from { results: [...] } if needed
      return Array.isArray(response) ? response : response?.results || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch incidents');
    }
  }

  async getIncidentDetails(incidentId: string): Promise<Incident> {
    try {
      const response = await this.client.get<Incident>(
        `/api/internships/incidents/${incidentId}/`
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch incident details');
    }
  }

  async assignIncidentInvestigator(
    applicationId: string,
    incidentId: string,
    investigatorId: string
  ): Promise<Incident> {
    try {
      const response = await this.client.post<Incident>(
        `/api/internships/applications/${applicationId}/assign_incident_investigator/${incidentId}/`,
        { investigator_id: investigatorId }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to assign investigator');
    }
  }

  async startIncidentInvestigation(
    applicationId: string,
    incidentId: string,
    investigationNotes: string
  ): Promise<Incident> {
    try {
      const response = await this.client.post<Incident>(
        `/api/internships/applications/${applicationId}/start_incident_investigation/${incidentId}/`,
        { investigation_notes: investigationNotes }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to start investigation');
    }
  }

  async resolveIncident(
    applicationId: string,
    incidentId: string,
    resolution: 'RESOLVED' | 'DISMISSED',
    resolutionNotes: string
  ): Promise<Incident> {
    try {
      const response = await this.client.post<Incident>(
        `/api/internships/applications/${applicationId}/resolve_incident/${incidentId}/`,
        {
          resolution_notes: resolutionNotes,
          status: resolution
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to resolve incident');
    }
  }

  // --- Success Stories ---

  async getSuccessStories(): Promise<SuccessStory[]> {
    try {
      const response = await this.client.get<SuccessStory[]>(
        '/api/internships/success-stories/',
        {
          headers: { 'skip-auth': 'true' },
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch success stories');
    }
  }

  async createSuccessStory(
    applicationId: string,
    testimonial: string,
    feedback: string = ''
  ): Promise<SuccessStory> {
    try {
      const response = await this.client.post<SuccessStory>(
        `/api/internships/applications/${applicationId}/create-success-story/`,
        {
          student_testimonial: testimonial,
          employer_feedback: feedback,
        }
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to create success story');
    }
  }
}

export const internshipService = new InternshipService();
