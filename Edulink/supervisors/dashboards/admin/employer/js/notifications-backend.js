/**
 * Notifications Backend Integration
 * Handles API connections for notification management dashboard
 */

class NotificationsBackend {
  constructor() {
    this.baseURL = '/api/employer';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize the backend connection
   */
  async initialize() {
    try {
      // Test connection with a simple ping
      const response = await this.makeRequest('/notifications/ping', 'GET');
      console.log('Notifications backend initialized successfully');
      return true;
    } catch (error) {
      console.warn('Notifications backend initialization failed, using fallback mode:', error);
      return false;
    }
  }

  /**
   * Load all notifications
   */
  async loadNotifications(page = 1, limit = 50) {
    const cacheKey = `notifications_${page}_${limit}`;
    
    try {
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const response = await this.makeRequest(`/notifications/?page=${page}&limit=${limit}`, 'GET');
      
      // Cache the response
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      return response;
    } catch (error) {
      console.error('Failed to load notifications:', error);
      return this.getMockNotifications();
    }
  }

  /**
   * Load notification statistics
   */
  async loadNotificationStatistics() {
    const cacheKey = 'notification_stats';
    
    try {
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const response = await this.makeRequest('/notifications/statistics/', 'GET');
      
      // Cache the response
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      return response;
    } catch (error) {
      console.error('Failed to load notification statistics:', error);
      throw new Error('Unable to load notification statistics. Please check your connection and try again.');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await this.makeRequest(`/notifications/${notificationId}/mark-read/`, 'POST');
      
      // Clear related cache
      this.clearNotificationCache();
      
      return response;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await this.makeRequest('/notifications/mark-all-read/', 'POST');
      
      // Clear related cache
      this.clearNotificationCache();
      
      return response;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      const response = await this.makeRequest(`/notifications/${notificationId}/`, 'DELETE');
      
      // Clear related cache
      this.clearNotificationCache();
      
      return response;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Delete multiple notifications
   */
  async bulkDeleteNotifications(notificationIds) {
    try {
      const response = await this.makeRequest('/notifications/bulk-delete/', 'POST', {
        notification_ids: notificationIds
      });
      
      // Clear related cache
      this.clearNotificationCache();
      
      return response;
    } catch (error) {
      console.error('Failed to bulk delete notifications:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async bulkMarkAsRead(notificationIds) {
    try {
      const response = await this.makeRequest('/notifications/bulk-mark-read/', 'POST', {
        notification_ids: notificationIds
      });
      
      // Clear related cache
      this.clearNotificationCache();
      
      return response;
    } catch (error) {
      console.error('Failed to bulk mark notifications as read:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    try {
      const response = await this.makeRequest('/notifications/clear-all/', 'POST');
      
      // Clear related cache
      this.clearNotificationCache();
      
      return response;
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      throw error;
    }
  }

  /**
   * Create new notification (for system messages)
   */
  async createNotification(notificationData) {
    try {
      const response = await this.makeRequest('/notifications/', 'POST', notificationData);
      
      // Clear related cache
      this.clearNotificationCache();
      
      return response;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences() {
    try {
      const response = await this.makeRequest('/notifications/preferences/', 'GET');
      return response;
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return this.getMockPreferences();
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences) {
    try {
      const response = await this.makeRequest('/notifications/preferences/', 'PUT', preferences);
      return response;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Search notifications
   */
  async searchNotifications(query, filters = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        ...filters
      });
      
      const response = await this.makeRequest(`/notifications/search/?${params}`, 'GET');
      return response;
    } catch (error) {
      console.error('Failed to search notifications:', error);
      return { results: [], total: 0 };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(endpoint, method = 'GET', data = null, attempt = 1) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken()
        },
        credentials: 'include'
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < this.retryAttempts) {
        console.warn(`Request failed, retrying (${attempt}/${this.retryAttempts}):`, error);
        await this.delay(this.retryDelay * attempt);
        return this.makeRequest(endpoint, method, data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Get CSRF token from cookies
   */
  getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  /**
   * Delay utility for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear notification-related cache
   */
  clearNotificationCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('notifications_') || key === 'notification_stats') {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get mock notifications for fallback
   */
  getMockNotifications() {
    return {
      results: [
        {
          id: 1,
          message: "New application received for Software Engineering Internship",
          notification_type: "application",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 2,
          message: "Interview scheduled for tomorrow at 2:00 PM",
          notification_type: "interview",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          is_read: false,
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 3,
          message: "System maintenance scheduled for this weekend",
          notification_type: "system",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 4,
          message: "New intern evaluation submitted",
          notification_type: "evaluation",
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          is_read: true,
          created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: 5,
          message: "Weekly report is now available",
          notification_type: "report",
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          is_read: false,
          created_at: new Date(Date.now() - 259200000).toISOString()
        }
      ],
      total: 5,
      page: 1,
      total_pages: 1
    };
  }


}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationsBackend;
}