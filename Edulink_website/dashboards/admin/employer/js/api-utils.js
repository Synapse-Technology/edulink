/**
 * API Utilities for Employer Dashboard
 * Common utilities for API communication and data handling
 */

class ApiUtils {
  constructor() {
    this.baseUrl = (window.API_CONFIG?.BASE_URL || '${API_BASE_URL:-https://edulink-api.onrender.com}') + '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // CSRF token handling
    this.csrfToken = this.getCSRFToken();
    if (this.csrfToken) {
      this.defaultHeaders['X-CSRFToken'] = this.csrfToken;
    }
    
    console.log('ApiUtils initialized with base URL:', this.baseUrl);
  }

  /**
   * Get CSRF token from meta tag or cookie
   */
  getCSRFToken() {
    // Try to get from meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // Fallback to cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    
    return null;
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const requestOptions = {
      headers: { ...this.defaultHeaders, ...options.headers },
      credentials: 'include',
      ...options
    };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return { success: true, data, response };
      } else {
        const text = await response.text();
        return { success: true, data: text, response };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.toString(), { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload file
   */
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type']; // Let browser set content-type for FormData

    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: formData
    });
  }

  /**
   * Download file
   */
  async downloadFile(endpoint, filename = null) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: this.defaultHeaders,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || this.getFilenameFromResponse(response) || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('File download failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract filename from response headers
   */
  getFilenameFromResponse(response) {
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        return filenameMatch[1];
      }
    }
    return null;
  }

  /**
   * Format date for API
   */
  formatDate(date) {
    if (!date) return null;
    if (typeof date === 'string') date = new Date(date);
    return date.toISOString().split('T')[0];
  }

  /**
   * Format datetime for API
   */
  formatDateTime(date) {
    if (!date) return null;
    if (typeof date === 'string') date = new Date(date);
    return date.toISOString();
  }

  /**
   * Parse API date response
   */
  parseDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  /**
   * Debounce function for search inputs
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${this.sanitizeHtml(message)}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    // Add to page
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, duration);
    }
  }

  /**
   * Show loading spinner
   */
  showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('loading');
      element.setAttribute('aria-busy', 'true');
    }
  }

  /**
   * Hide loading spinner
   */
  hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('loading');
      element.removeAttribute('aria-busy');
    }
  }

  /**
   * Local storage helpers
   */
  setLocalData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  getLocalData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }

  removeLocalData(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  /**
   * Session storage helpers
   */
  setSessionData(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save to sessionStorage:', error);
      return false;
    }
  }

  getSessionData(key) {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to read from sessionStorage:', error);
      return null;
    }
  }

  /**
   * Check if user is online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Add online/offline event listeners
   */
  addConnectivityListeners(onlineCallback, offlineCallback) {
    window.addEventListener('online', onlineCallback);
    window.addEventListener('offline', offlineCallback);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiUtils;
}

// Global instance
window.ApiUtils = ApiUtils;