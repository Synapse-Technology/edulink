import apiClient from '../api/client';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'TECHNICAL' | 'AFFILIATION' | 'INTERNSHIP' | 'ACCOUNT' | 'OTHER';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketAttachment {
  id: string;
  file: string;
  file_name: string;
  created_at: string;
}

export interface TicketCommunication {
  id: string;
  sender_name: string;
  message: string;
  is_internal: boolean;
  is_staff: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  tracking_code: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  related_entity_type?: string;
  related_entity_id?: string;
  assigned_to_name?: string;
  resolved_at?: string;
  resolution_notes?: string;
  communications: TicketCommunication[];
  attachments: TicketAttachment[];
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  related_entity_type?: string;
  related_entity_id?: string;
  attachments?: File[];
}

export interface FeedbackData {
  message: string;
  is_anonymous?: boolean;
}

export const supportService = {
  getTickets: async () => {
    return await apiClient.get<SupportTicket[]>('/api/support/tickets/');
  },

  getTicketByCode: async (trackingCode: string) => {
    return await apiClient.get<SupportTicket>(`/api/support/tickets/${trackingCode}/`);
  },

  createTicket: async (data: CreateTicketData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('subject', data.subject);
    formData.append('message', data.message);
    formData.append('category', data.category);
    formData.append('priority', data.priority);
    
    if (data.related_entity_type) formData.append('related_entity_type', data.related_entity_type);
    if (data.related_entity_id) formData.append('related_entity_id', data.related_entity_id);
    
    if (data.attachments) {
      data.attachments.forEach(file => {
        formData.append('attachments', file);
      });
    }

    return await apiClient.post<SupportTicket>('/api/support/tickets/', formData);
  },

  replyToTicket: async (trackingCode: string, message: string, isInternal: boolean = false) => {
    return await apiClient.post<TicketCommunication>(`/api/support/tickets/${trackingCode}/reply/`, {
      message,
      is_internal: isInternal
    });
  },

  resolveTicket: async (trackingCode: string, notes: string) => {
    return await apiClient.post<SupportTicket>(`/api/support/tickets/${trackingCode}/resolve/`, {
      notes
    });
  },

  assignTicket: async (trackingCode: string, staffId: string) => {
    return await apiClient.post<SupportTicket>(`/api/support/tickets/${trackingCode}/assign/`, {
      staff_id: staffId
    });
  },

  submitFeedback: async (data: FeedbackData) => {
    return await apiClient.post<{ message: string }>('/api/support/feedback/', data);
  }
};
