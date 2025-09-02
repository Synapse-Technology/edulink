/**
 * Opportunities Backend Integration
 * Handles API connections for opportunity management dashboard
 */

class OpportunitiesBackend {
  constructor() {
    this.baseURL = '/api/employer';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async initialize() {
    try {
      // Test connection
      await this.testConnection();
      console.log('Opportunities backend initialized successfully');
    } catch (error) {
      console.warn('Opportunities backend initialization failed, using fallback mode:', error);
    }
  }

  async testConnection() {
    const response = await fetch(`${this.baseURL}/health/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': this.getCSRFToken()
      }
    });
    
    if (!response.ok) {
      throw new Error('Backend connection test failed');
    }
    
    return response.json();
  }

  getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    return '';
  }

  getCacheKey(endpoint, params = {}) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  isValidCache(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheTimeout;
  }

  async retryRequest(requestFn, attempts = this.retryAttempts) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
      }
    }
  }

  // Load opportunities with pagination
  async loadOpportunities(page = 1, pageSize = 10, filters = {}) {
    const cacheKey = this.getCacheKey('opportunities', { page, pageSize, filters });
    const cached = this.cache.get(cacheKey);
    
    if (this.isValidCache(cached)) {
      return cached.data;
    }

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...filters
      });

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken()
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load opportunities: ${res.status}`);
        }
        
        return res;
      });

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Failed to load opportunities:', error);
      throw new Error('Unable to load opportunities. Please check your connection and try again.');
    }
  }

  // Load opportunity statistics
  async loadOpportunityStatistics() {
    const cacheKey = this.getCacheKey('opportunity_stats');
    const cached = this.cache.get(cacheKey);
    
    if (this.isValidCache(cached)) {
      return cached.data;
    }

    try {
      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/statistics/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken()
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to load opportunity statistics: ${res.status}`);
        }
        
        return res;
      });

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Failed to load opportunity statistics:', error);
      throw new Error('Unable to load opportunity statistics. Please check your connection and try again.');
    }
  }

  // Create new opportunity
  async createOpportunity(opportunityData) {
    try {
      const formData = new FormData();
      
      // Add all opportunity data to FormData
      Object.keys(opportunityData).forEach(key => {
        if (opportunityData[key] !== null && opportunityData[key] !== undefined) {
          if (key === 'opportunity_image' && opportunityData[key] instanceof File) {
            formData.append(key, opportunityData[key]);
          } else if (Array.isArray(opportunityData[key])) {
            formData.append(key, JSON.stringify(opportunityData[key]));
          } else {
            formData.append(key, opportunityData[key]);
          }
        }
      });

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': this.getCSRFToken()
          },
          body: formData
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Failed to create opportunity: ${res.status}`);
        }
        
        return res;
      });

      const data = await response.json();
      
      // Clear cache to force refresh
      this.clearOpportunityCache();
      
      return data;
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      throw error;
    }
  }

  // Update opportunity
  async updateOpportunity(opportunityId, opportunityData) {
    try {
      const formData = new FormData();
      
      // Add all opportunity data to FormData
      Object.keys(opportunityData).forEach(key => {
        if (opportunityData[key] !== null && opportunityData[key] !== undefined) {
          if (key === 'opportunity_image' && opportunityData[key] instanceof File) {
            formData.append(key, opportunityData[key]);
          } else if (Array.isArray(opportunityData[key])) {
            formData.append(key, JSON.stringify(opportunityData[key]));
          } else {
            formData.append(key, opportunityData[key]);
          }
        }
      });

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/${opportunityId}/`, {
          method: 'PUT',
          headers: {
            'X-CSRFToken': this.getCSRFToken()
          },
          body: formData
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Failed to update opportunity: ${res.status}`);
        }
        
        return res;
      });

      const data = await response.json();
      
      // Clear cache to force refresh
      this.clearOpportunityCache();
      
      return data;
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      throw error;
    }
  }

  // Delete opportunity
  async deleteOpportunity(opportunityId) {
    try {
      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/${opportunityId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken()
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to delete opportunity: ${res.status}`);
        }
        
        return res;
      });

      // Clear cache to force refresh
      this.clearOpportunityCache();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      throw error;
    }
  }

  // Update opportunity status
  async updateOpportunityStatus(opportunityId, status) {
    try {
      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/${opportunityId}/status/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken()
          },
          body: JSON.stringify({ status })
        });
        
        if (!res.ok) {
          throw new Error(`Failed to update opportunity status: ${res.status}`);
        }
        
        return res;
      });

      const data = await response.json();
      
      // Clear cache to force refresh
      this.clearOpportunityCache();
      
      return data;
    } catch (error) {
      console.error('Failed to update opportunity status:', error);
      throw error;
    }
  }

  // Get opportunity applications
  async getOpportunityApplications(opportunityId, page = 1, pageSize = 10) {
    const cacheKey = this.getCacheKey('opportunity_applications', { opportunityId, page, pageSize });
    const cached = this.cache.get(cacheKey);
    
    if (this.isValidCache(cached)) {
      return cached.data;
    }

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/${opportunityId}/applications/?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken()
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to load opportunity applications: ${res.status}`);
        }
        
        return res;
      });

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Failed to load opportunity applications:', error);
      return { results: [], count: 0 };
    }
  }

  // Export opportunities data
  async exportOpportunities(format = 'csv', filters = {}) {
    try {
      const queryParams = new URLSearchParams({
        format,
        ...filters
      });

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/opportunities/export/?${queryParams}`, {
          method: 'GET',
          headers: {
            'X-CSRFToken': this.getCSRFToken()
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to export opportunities: ${res.status}`);
        }
        
        return res;
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opportunities_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to export opportunities:', error);
      throw error;
    }
  }

  // Clear opportunity-related cache
  clearOpportunityCache() {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes('opportunities') || key.includes('opportunity_stats')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }


}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpportunitiesBackend;
}