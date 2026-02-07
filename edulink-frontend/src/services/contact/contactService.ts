import apiClient from '../api/client';

export interface ContactSubmissionData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactSubmission extends ContactSubmissionData {
  id: string;
  is_processed: boolean;
  processed_at: string | null;
  internal_notes: string;
  created_at: string;
}

export const contactService = {
  submitContactForm: async (data: ContactSubmissionData) => {
    return await apiClient.post('/api/contact/', data, {
      headers: { 'skip-auth': 'true' }
    });
  },

  // Admin methods
  getAdminSubmissions: async (): Promise<ContactSubmission[]> => {
    return await apiClient.get('/api/admin/contact-submissions/');
  },

  getAdminSubmission: async (id: string): Promise<ContactSubmission> => {
    return await apiClient.get(`/api/admin/contact-submissions/${id}/`);
  },

  processSubmission: async (id: string, internal_notes: string): Promise<ContactSubmission> => {
    return await apiClient.post(`/api/admin/contact-submissions/${id}/`, { internal_notes });
  }
};
