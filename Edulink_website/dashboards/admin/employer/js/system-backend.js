/**
 * System Backend API Connection
 * Handles all system-related API calls for the employer dashboard
 */

class SystemBackend {
  constructor() {
    this.baseUrl = window.API_BASE_URL || 'http://localhost:8000/api';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    // Initialize API utilities if available
    if (typeof ApiUtils !== 'undefined') {
      this.apiUtils = new ApiUtils();
    }
    
    console.log('SystemBackend initialized with base URL:', this.baseUrl);
  }

  /**
   * Generic API request method with retry logic
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    };

    const requestOptions = { ...defaultOptions, ...options };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error(`Request attempt ${attempt} failed:`, error);
        
        if (attempt === this.retryAttempts) {
          return { success: false, error: error.message };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  /**
   * Cache management
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Load system integrations
   */
  async loadIntegrations() {
    const cacheKey = 'system_integrations';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    const result = await this.makeRequest('/employer/system/integrations/');
    
    if (result.success) {
      this.setCachedData(cacheKey, result.data);
      return result;
    }
    
    throw new Error(result.error || 'Failed to load integrations');
  }

  /**
   * Load compliance data
   */
  async loadCompliance() {
    const cacheKey = 'system_compliance';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    const result = await this.makeRequest('/employer/system/compliance/');
    
    if (result.success) {
      this.setCachedData(cacheKey, result.data);
      return result;
    }
    
    throw new Error(result.error || 'Failed to load compliance data');
  }

  /**
   * Load system statistics
   */
  async getSystemStats() {
    const cacheKey = 'system_stats';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    const result = await this.makeRequest('/employer/system/stats/');
    
    if (result.success) {
      this.setCachedData(cacheKey, result.data);
      return result;
    }
    
    throw new Error(result.error || 'Failed to load system stats');
  }

  /**
   * Update integration settings
   */
  async updateIntegration(integrationId, settings) {
    try {
      const result = await this.makeRequest(`/employer/system/integrations/${integrationId}/`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      
      if (result.success) {
        // Clear cache to force refresh
        this.cache.delete('system_integrations');
        return result;
      }
      
      throw new Error(result.error);
    } catch (error) {
      console.error('Error updating integration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update compliance settings
   */
  async updateCompliance(complianceData) {
    try {
      const result = await this.makeRequest('/employer/system/compliance/', {
        method: 'PUT',
        body: JSON.stringify(complianceData)
      });
      
      if (result.success) {
        // Clear cache to force refresh
        this.cache.delete('system_compliance');
        return result;
      }
      
      throw new Error(result.error);
    } catch (error) {
      console.error('Error updating compliance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export system data
   */
  async exportSystemData(format = 'csv') {
    const result = await this.makeRequest(`/employer/system/export/?format=${format}`);
    
    if (result.success) {
      return result;
    }
    
    throw new Error(result.error || 'Failed to export system data');
  }




  /**
   * Offline synchronization
   */
  async syncOfflineData() {
    const offlineData = localStorage.getItem('system_offline_data');
    if (!offlineData) return { success: true, synced: 0 };

    try {
      const data = JSON.parse(offlineData);
      let syncedCount = 0;

      for (const item of data) {
        const result = await this.makeRequest(item.endpoint, {
          method: item.method,
          body: JSON.stringify(item.data)
        });
        
        if (result.success) {
          syncedCount++;
        }
      }

      // Clear offline data after successful sync
      localStorage.removeItem('system_offline_data');
      
      return { success: true, synced: syncedCount };
    } catch (error) {
      console.error('Error syncing offline data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store data for offline sync
   */
  storeOfflineData(endpoint, method, data) {
    try {
      const offlineData = JSON.parse(localStorage.getItem('system_offline_data') || '[]');
      offlineData.push({
        endpoint,
        method,
        data,
        timestamp: Date.now()
      });
      localStorage.setItem('system_offline_data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error storing offline data:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemBackend;
}