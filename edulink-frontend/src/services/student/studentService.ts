import { apiClient as client } from '../api/client';
import { ApiError } from '../errors';
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
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch profile');
    }
  }

  async updateProfile(id: string, data: UpdateProfileData): Promise<StudentProfile> {
    try {
      let payload: any = data;
      let headers = {};

      // Check if any file field is present
      const hasFiles = data.profile_picture || data.cv || data.admission_letter || data.id_document;

      if (hasFiles) {
        const formData = new FormData();
        if (data.course_of_study) formData.append('course_of_study', data.course_of_study);
        if (data.current_year) formData.append('current_year', data.current_year);
        if (data.skills) {
             formData.append('skills', JSON.stringify(data.skills));
        }
        if (data.registration_number) formData.append('registration_number', data.registration_number);
        
        // Append files
        if (data.profile_picture) formData.append('profile_picture', data.profile_picture);
        if (data.cv) formData.append('cv', data.cv);
        if (data.admission_letter) formData.append('admission_letter', data.admission_letter);
        if (data.id_document) formData.append('id_document', data.id_document);
        
        payload = formData;
        headers = { 'Content-Type': 'multipart/form-data' };
      }

      const response = await client.post<StudentProfile>(`/api/students/${id}/update_profile/`, payload, {
        headers
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to update profile');
    }
  }

  async uploadDocument(id: string, type: 'cv' | 'admission_letter' | 'id_document', file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('document_type', type);
      formData.append('file_name', file.name);
      formData.append('file', file);

      const response = await client.post(`/api/students/${id}/upload_document/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to upload document');
    }
  }

  async getApplications(): Promise<InternshipApplication[]> {
    try {
      // Use internshipService to fetch applications
      return await internshipService.getApplications();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch applications');
    }
  }

  async getActiveInternship(): Promise<InternshipApplication | null> {
    try {
      // Fetch all applications and find the current/most recent active or completed one
      const applications = await internshipService.getApplications();
      const engagement = applications.find(app => 
        ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)
      );
      return engagement || null;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch current internship engagement');
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
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to submit logbook');
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
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to submit daily log');
    }
  }

  async getEvidence(applicationId: string): Promise<InternshipEvidence[]> {
    try {
      return await internshipService.getEvidence(applicationId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch evidence');
    }
  }

  async claimAffiliation(studentId: string, institutionId: string): Promise<any> {
    try {
      const response = await client.post(`/api/students/${studentId}/claim_affiliation/`, {
        institution_id: institutionId
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to claim affiliation');
    }
  }

  async getAffiliations(studentId: string): Promise<Affiliation[]> {
    try {
      const response = await client.get<any>(`/api/students/${studentId}/affiliations/`);
      return response.affiliations;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch affiliations');
    }
  }

  async getProfileReadiness(studentId: string): Promise<{ score: number; breakdown: Record<string, boolean> }> {
    try {
      const response = await client.get<{ score: number; breakdown: Record<string, boolean> }>(`/api/students/${studentId}/profile_readiness/`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch profile readiness');
    }
  }

  async getDashboardStats(studentId: string): Promise<any> {
    try {
      const response = await client.get<any>(`/api/students/${studentId}/dashboard_stats/`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch dashboard stats');
    }
  }

  async searchInstitutions(query: string): Promise<Institution[]> {
    try {
      const response = await client.get<Institution[]>('/api/institutions/institutions/', {
        params: { search: query }
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to search institutions');
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
  review_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const studentService = new StudentService();
