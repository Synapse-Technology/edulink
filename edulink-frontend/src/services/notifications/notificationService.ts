import { apiClient } from '../api/client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  channel: string;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

export const notificationService = {
  /**
   * Fetch all notifications for the current user.
   */
  getNotifications: async (): Promise<Notification[]> => {
    return await apiClient.get<Notification[]>('/api/notifications/');
  },

  /**
   * Mark a notification as read.
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(`/api/notifications/${notificationId}/mark-read/`);
  },

  /**
   * Mark all notifications as read.
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/api/notifications/mark-all-read/');
  },

  /**
   * Get the unread notification count.
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<any>('/api/notifications/unread-count/');
    return response.count;
  }
};
