import { apiClient } from '../api/client';
import { ApiError } from '../errors';

export interface LedgerEvent {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_name?: string; // If backend enriches it
  entity_type: string;
  entity_id: string;
  payload: any;
  occurred_at: string; // Renamed from timestamp to match backend
  hash: string;
  previous_hash: string;
}

export interface LedgerEventParams {
  event_type?: string;
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface LedgerEventsResponse {
  results: LedgerEvent[];
  count: number;
  next: string | null;
  previous: string | null;
}

class LedgerService {
  private client = apiClient;

  async getEvents(params?: LedgerEventParams): Promise<LedgerEventsResponse> {
    try {
      const response = await this.client.get<LedgerEventsResponse>('/api/ledger/events/', { params });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch ledger events');
    }
  }

  async getEvent(id: string): Promise<LedgerEvent> {
    try {
      const response = await this.client.get<LedgerEvent>(`/api/ledger/events/${id}/`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch ledger event details');
    }
  }

  async exportLogs(params?: LedgerEventParams): Promise<Blob> {
    try {
      // We need to use fetch directly or axios config to get blob response
      // Assuming apiClient has a method or we can access the underlying axios instance
      // If apiClient is a wrapper around axios, we might need to bypass it for blob if it expects JSON
      
      // Let's assume we can pass config to get
      const response = await this.client.get<Blob>('/api/ledger/events/export/', { 
        params,
        responseType: 'blob' 
      });
      return response;
    } catch (error) {
      console.error("Export error:", error);
      throw new Error('Failed to export logs');
    }
  }
}

export const ledgerService = new LedgerService();
