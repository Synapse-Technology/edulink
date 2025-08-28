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
    try {
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
      
      throw new Error(result.error);
    } catch (error) {
      console.error('Error loading integrations:', error);
      
      // Return mock data as fallback
      const mockData = this.getMockIntegrations();
      return { success: true, data: mockData, fromCache: true };
    }
  }

  /**
   * Load compliance data
   */
  async loadCompliance() {
    try {
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
      
      throw new Error(result.error);
    } catch (error) {
      console.error('Error loading compliance data:', error);
      
      // Return mock data as fallback
      const mockData = this.getMockCompliance();
      return { success: true, data: mockData, fromCache: true };
    }
  }

  /**
   * Load system statistics
   */
  async getSystemStats() {
    try {
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
      
      throw new Error(result.error);
    } catch (error) {
      console.error('Error loading system stats:', error);
      
      // Return mock data as fallback
      const mockData = this.getMockSystemStats();
      return { success: true, data: mockData, fromCache: true };
    }
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
    try {
      const result = await this.makeRequest(`/employer/system/export/?format=${format}`);
      
      if (result.success) {
        return result;
      }
      
      throw new Error(result.error);
    } catch (error) {
      console.error('Error exporting system data:', error);
      
      // Generate local export as fallback
      const exportData = this.generateLocalExport(format);
      return { success: true, data: exportData, fromCache: true };
    }
  }

  /**
   * Mock data generators for offline functionality
   */
  getMockIntegrations() {
    return [
      {
        id: 1,
        name: 'HRIS Integration',
        type: 'hris',
        status: 'active',
        description: 'Human Resources Information System integration',
        lastSync: '2024-01-15T10:30:00Z',
        settings: {
          apiKey: '***hidden***',
          syncFrequency: 'daily',
          autoSync: true
        }
      },
      {
        id: 2,
        name: 'Learning Management System',
        type: 'lms',
        status: 'active',
        description: 'LMS integration for training modules',
        lastSync: '2024-01-15T09:15:00Z',
        settings: {
          endpoint: 'https://lms.company.com/api',
          syncFrequency: 'hourly',
          autoSync: true
        }
      },
      {
        id: 3,
        name: 'Email Service',
        type: 'email',
        status: 'inactive',
        description: 'Email notification service',
        lastSync: null,
        settings: {
          provider: 'sendgrid',
          apiKey: '***hidden***',
          templates: ['welcome', 'reminder', 'completion']
        }
      }
    ];
  }

  getMockCompliance() {
    return {
      gdprCompliance: {
        status: 'compliant',
        lastAudit: '2024-01-01T00:00:00Z',
        score: 95,
        requirements: [
          { name: 'Data Processing Agreement', status: 'complete', required: true },
          { name: 'Privacy Policy', status: 'complete', required: true },
          { name: 'Cookie Consent', status: 'complete', required: true },
          { name: 'Data Retention Policy', status: 'pending', required: true }
        ]
      },
      securityCompliance: {
        status: 'partial',
        lastAudit: '2024-01-10T00:00:00Z',
        score: 87,
        requirements: [
          { name: 'SSL Certificate', status: 'complete', required: true },
          { name: 'Two-Factor Authentication', status: 'complete', required: true },
          { name: 'Regular Security Audits', status: 'pending', required: true },
          { name: 'Data Encryption', status: 'complete', required: true }
        ]
      },
      accessibilityCompliance: {
        status: 'needs_attention',
        lastAudit: '2023-12-15T00:00:00Z',
        score: 72,
        requirements: [
          { name: 'WCAG 2.1 AA Compliance', status: 'partial', required: true },
          { name: 'Screen Reader Support', status: 'complete', required: true },
          { name: 'Keyboard Navigation', status: 'pending', required: true },
          { name: 'Color Contrast', status: 'complete', required: false }
        ]
      }
    };
  }

  getMockSystemStats() {
    return {
      totalIntegrations: 3,
      activeIntegrations: 2,
      complianceScore: 85,
      lastSystemUpdate: '2024-01-15T08:00:00Z',
      systemUptime: 99.9,
      apiCalls: {
        today: 1247,
        thisWeek: 8934,
        thisMonth: 34567
      },
      storage: {
        used: 2.4,
        total: 10.0,
        unit: 'GB'
      }
    };
  }

  /**
   * Generate local export data
   */
  generateLocalExport(format) {
    const integrations = this.getMockIntegrations();
    const compliance = this.getMockCompliance();
    const stats = this.getMockSystemStats();
    
    if (format === 'csv') {
      const csvData = [
        'Type,Name,Status,Last Updated',
        ...integrations.map(i => `Integration,${i.name},${i.status},${i.lastSync || 'Never'}`),
        `Compliance,GDPR,${compliance.gdprCompliance.status},${compliance.gdprCompliance.lastAudit}`,
        `Compliance,Security,${compliance.securityCompliance.status},${compliance.securityCompliance.lastAudit}`,
        `Compliance,Accessibility,${compliance.accessibilityCompliance.status},${compliance.accessibilityCompliance.lastAudit}`
      ].join('\n');
      
      return {
        url: 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData),
        filename: 'system_export.csv'
      };
    }
    
    return {
      integrations,
      compliance,
      stats,
      exportDate: new Date().toISOString()
    };
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