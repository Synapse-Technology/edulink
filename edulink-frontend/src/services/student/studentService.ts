import { apiClient as client } from '../api/client';
import { internshipService, type InternshipApplication, type InternshipEvidence } from '../internship/internshipService';

export interface StudentProfile {
  id: string;
  user_id: string;
  email: string;
  registration_number: string;
  is_verified: boolean;
  course_of_study: string;
  current_year: string;
  skills: string[];
  cv: string | null;
  admission_letter: string | null;
  id_document: string | null;
  institution_id: string | null;
  profile_picture: string | null;
  trust_level?: number;
  trust_points?: number;
}

export interface UpdateProfileData {
  course_of_study?: string;
  current_year?: string;
  skills?: string[];
  registration_number?: string;
  profile_picture?: File;
  cv?: File;
  admission_letter?: File;
  id_document?: File;
}

class StudentService {
  async getProfile(): Promise<StudentProfile> {
    try {
      const response = await client.get<StudentProfile>('/api/students/current/');
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async updateProfile(id: string, data: UpdateProfileData): Promise<StudentProfile> {
    try {
      // Check if any file field is present
      const hasFiles = data.profile_picture || data.cv || data.admission_letter || data.id_document;

      // Separate file upload from other fields
      // 1. First, update non-file fields and skills via JSON endpoint
      const jsonData: any = {};
      if (data.course_of_study) jsonData.course_of_study = data.course_of_study;
      if (data.current_year) jsonData.current_year = data.current_year;
      if (data.registration_number) jsonData.registration_number = data.registration_number;

      // Only update non-file fields if any exist
      if (Object.keys(jsonData).length > 0) {
        await client.patch(`/api/students/${id}/update_profile/`, jsonData);
      }

      // 2. Update skills separately (always JSON, never in FormData)
      if (data.skills && data.skills.length > 0) {
        await client.patch(`/api/students/${id}/update_skills/`, { skills: data.skills });
      }

      // 3. Upload files separately using multipart if present
      if (hasFiles) {
        if (data.profile_picture) {
          await this.uploadDocument(id, 'profile_picture', data.profile_picture);
        }
        if (data.cv) {
          await this.uploadDocument(id, 'cv', data.cv);
        }
        if (data.admission_letter) {
          await this.uploadDocument(id, 'admission_letter', data.admission_letter);
        }
        if (data.id_document) {
          await this.uploadDocument(id, 'id_document', data.id_document);
        }
      }

      // 4. Fetch and return updated profile
      const response = await client.get<StudentProfile>(`/api/students/${id}/`);
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async uploadDocument(id: string, type: 'cv' | 'admission_letter' | 'id_document' | 'profile_picture', file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('document_type', type);
      formData.append('file_name', file.name);
      formData.append('file', file);

      // Use the dedicated document upload endpoint
      const response = await client.post(`/api/students/${id}/upload_document/`, formData);
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getApplications(): Promise<InternshipApplication[]> {
    try {
      // Use internshipService to fetch applications
      const response = await internshipService.getApplications();
      // Handle paginated response - extract array from { results: [...] } if needed
      return Array.isArray(response) ? response : (response as any)?.results || [];
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getActiveInternship(): Promise<InternshipApplication | null> {
    try {
      // getApplications returns paginated response { results: [...], count: X }
      const response = await internshipService.getApplications();
      const applications = Array.isArray(response) ? response : (response as any).results || [];
      
      // Find most recent active or completed internship
      const engagement = applications.find((app: any) => 
        ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)
      );
      return engagement || null;
    } catch (error) {
      // Rethrow to preserve ApiError types
      throw error;
    }
  }

  async submitLogbook(applicationId: string, data: { 
    weekStartDate: string; 
    entries: Record<string, string>; 
    file?: File 
  }): Promise<InternshipEvidence> {
    try {
      const title = `Weekly Logbook - ${data.weekStartDate}`;
      const description = 'Weekly logbook submission';
      const evidenceType = 'LOGBOOK';
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('evidence_type', evidenceType);
      formData.append('metadata', JSON.stringify({
        week_start_date: data.weekStartDate,
        entries: data.entries
      }));
      if (data.file) {
        formData.append('file', data.file);
      }

      const response = await client.post<InternshipEvidence>(`/api/internships/applications/${applicationId}/submit_evidence/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async submitDailyLog(applicationId: string, entry: string): Promise<InternshipEvidence> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const title = `Daily Log - ${today}`;
      const description = 'Quick dashboard log entry';
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('evidence_type', 'LOGBOOK');
      formData.append('metadata', JSON.stringify({
        entries: {
          [today]: entry
        }
      }));

      const response = await client.post<InternshipEvidence>(`/api/internships/applications/${applicationId}/submit_evidence/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getEvidence(applicationId: string): Promise<InternshipEvidence[]> {
    try {
      return await internshipService.getEvidence(applicationId);
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async claimAffiliation(studentId: string, institutionId: string): Promise<any> {
    try {
      const response = await client.post(`/api/students/${studentId}/claim_affiliation/`, {
        institution_id: institutionId
      });
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getAffiliations(studentId: string): Promise<Affiliation[]> {
    try {
      const response = await client.get<any>(`/api/students/${studentId}/affiliations/`);
      return response.affiliations;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getProfileReadiness(studentId: string): Promise<{ score: number; breakdown: Record<string, boolean> }> {
    try {
      const response = await client.get<{ score: number; breakdown: Record<string, boolean> }>(`/api/students/${studentId}/profile_readiness/`);
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async getDashboardStats(studentId: string): Promise<any> {
    try {
      const response = await client.get<any>(`/api/students/${studentId}/dashboard_stats/`);
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async searchInstitutions(query: string): Promise<Institution[]> {
    try {
      const response = await client.get<{ results: Institution[] }>('/api/institutions/institutions/', {
        params: { search: query }
      });
      // Extract the results array from the paginated response
      return response.results || [];
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }

  async uploadAffiliationDocument(studentId: string, affiliationId: string, file: File): Promise<Affiliation> {
    try {
      const formData = new FormData();
      formData.append('affiliation_id', affiliationId);
      formData.append('document', file);

      const response = await client.post<Affiliation>(
        `/api/students/${studentId}/upload_affiliation_document/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response;
    } catch (error) {
      // Rethrow all errors to preserve ApiError status codes
      throw error;
    }
  }
}

export interface Institution {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
}

export interface Affiliation {
  id: string;
  student_id: string;
  institution_id: string;
  institution?: Institution;
  institution_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'verified';
  claimed_via?: 'domain' | 'manual' | 'adoption' | 'bulk';
  review_notes?: string;
  verification_document_url?: string;
  verification_document_uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const studentService = new StudentService();
