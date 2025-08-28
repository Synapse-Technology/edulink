/**
 * Applications Backend Integration
 * Handles API connections for the applications dashboard
 * Connects to Django backend endpoints for application management
 */

class ApplicationsBackend {
  constructor() {
    this.apiUtils = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.isInitialized = false;
  }

  /**
   * Initialize the backend connection
   */
  async initialize() {
    try {
      // Wait for APIUtils to be available
      if (typeof APIUtils !== 'undefined') {
        this.apiUtils = new APIUtils();
        this.isInitialized = true;
        console.log('ApplicationsBackend initialized successfully');
      } else {
        console.warn('APIUtils not available, using fallback mode');
      }
    } catch (error) {
      console.error('Failed to initialize ApplicationsBackend:', error);
    }
  }

  /**
   * Check if data is cached and still valid
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  /**
   * Get cached data
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Set cached data
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Load applications data from backend
   */
  async loadApplicationsData(filters = {}) {
    const cacheKey = `applications_${JSON.stringify(filters)}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      if (this.apiUtils && this.isInitialized) {
        const endpoint = this.apiUtils.config.endpoints.applications;
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
            'X-CSRFToken': this.getCSRFToken()
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.setCachedData(cacheKey, data);
          return data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error loading applications data:', error);
    }

    // Fallback to mock data
    const mockData = this.getMockApplicationsData(filters);
    this.setCachedData(cacheKey, mockData);
    return mockData;
  }

  /**
   * Load application statistics
   */
  async loadApplicationStats() {
    const cacheKey = 'application_stats';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      if (this.apiUtils && this.isInitialized) {
        const endpoint = `${this.apiUtils.config.endpoints.applications}/stats/`;
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
            'X-CSRFToken': this.getCSRFToken()
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.setCachedData(cacheKey, data);
          return data;
        }
      }
    } catch (error) {
      console.error('Error loading application stats:', error);
    }

    // Fallback to mock stats
    const mockStats = {
      totalApplications: 156,
      pendingReview: 23,
      underReview: 18,
      approved: 89,
      rejected: 26,
      todayApplications: 7,
      weeklyGrowth: 12.5,
      averageProcessingTime: 3.2
    };
    
    this.setCachedData(cacheKey, mockStats);
    return mockStats;
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId, status, notes = '') {
    try {
      if (this.apiUtils && this.isInitialized) {
        const endpoint = `${this.apiUtils.config.endpoints.applications}/${applicationId}/status/`;
        
        const response = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
            'X-CSRFToken': this.getCSRFToken()
          },
          body: JSON.stringify({
            status: status,
            notes: notes,
            updated_at: new Date().toISOString()
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Clear related cache
          this.clearApplicationsCache();
          return { success: true, data: data };
        } else {
          const errorData = await response.json();
          return { success: false, message: errorData.message || 'Failed to update status' };
        }
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      return { success: false, message: 'Network error occurred' };
    }

    // Simulate success for demo
    return { success: true, message: 'Status updated successfully (demo mode)' };
  }

  /**
   * Schedule interview for application
   */
  async scheduleInterview(applicationId, interviewData) {
    try {
      if (this.apiUtils && this.isInitialized) {
        const endpoint = `${this.apiUtils.config.endpoints.applications}/${applicationId}/interview/`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
            'X-CSRFToken': this.getCSRFToken()
          },
          body: JSON.stringify(interviewData)
        });

        if (response.ok) {
          const data = await response.json();
          this.clearApplicationsCache();
          return { success: true, data: data };
        } else {
          const errorData = await response.json();
          return { success: false, message: errorData.message || 'Failed to schedule interview' };
        }
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      return { success: false, message: 'Network error occurred' };
    }

    return { success: true, message: 'Interview scheduled successfully (demo mode)' };
  }

  /**
   * Export applications data
   */
  async exportApplicationsData(exportConfig) {
    try {
      if (this.apiUtils && this.isInitialized) {
        const endpoint = `${this.apiUtils.config.endpoints.applications}/export/`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
            'X-CSRFToken': this.getCSRFToken()
          },
          body: JSON.stringify(exportConfig)
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `applications-export-${new Date().toISOString().split('T')[0]}.${exportConfig.format || 'csv'}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return { success: true };
        }
      }
    } catch (error) {
      console.error('Error exporting applications data:', error);
    }

    // Fallback export with mock data
    const applications = await this.loadApplicationsData();
    const csvContent = this.convertToCSV(applications.applications || []);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
  }

  /**
   * Convert applications data to CSV format
   */
  convertToCSV(applications) {
    if (!applications.length) return 'No data available';
    
    const headers = ['ID', 'Student Name', 'Email', 'Position', 'Status', 'Applied Date', 'University'];
    const csvRows = [headers.join(',')];
    
    applications.forEach(app => {
      const row = [
        app.id || '',
        `"${app.studentName || ''}"`,
        app.email || '',
        `"${app.position || ''}"`,
        app.status || '',
        app.appliedDate || '',
        `"${app.university || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Clear applications cache
   */
  clearApplicationsCache() {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith('applications_') || key === 'application_stats') {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Refresh all applications data
   */
  async refreshAllData() {
    this.clearApplicationsCache();
    const [applications, stats] = await Promise.all([
      this.loadApplicationsData(),
      this.loadApplicationStats()
    ]);
    return { applications, stats };
  }

  /**
   * Get CSRF token for Django
   */
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

  /**
   * Get mock applications data for fallback
   */
  getMockApplicationsData(filters = {}) {
    const mockApplications = [
      {
        id: 1,
        studentName: 'Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        position: 'Software Development Intern',
        status: 'pending',
        appliedDate: '2024-01-15',
        university: 'Tech University',
        gpa: 3.8,
        skills: ['JavaScript', 'React', 'Node.js'],
        coverLetter: 'Passionate about software development...',
        resume: 'sarah_johnson_resume.pdf'
      },
      {
        id: 2,
        studentName: 'Michael Chen',
        email: 'michael.chen@college.edu',
        position: 'Data Science Intern',
        status: 'reviewing',
        appliedDate: '2024-01-14',
        university: 'Data Science College',
        gpa: 3.9,
        skills: ['Python', 'Machine Learning', 'SQL'],
        coverLetter: 'Experienced in data analysis...',
        resume: 'michael_chen_resume.pdf'
      },
      {
        id: 3,
        studentName: 'Emily Rodriguez',
        email: 'emily.rodriguez@institute.edu',
        position: 'Marketing Intern',
        status: 'approved',
        appliedDate: '2024-01-13',
        university: 'Business Institute',
        gpa: 3.7,
        skills: ['Digital Marketing', 'Analytics', 'Content Creation'],
        coverLetter: 'Creative marketing professional...',
        resume: 'emily_rodriguez_resume.pdf'
      },
      {
        id: 4,
        studentName: 'David Kim',
        email: 'david.kim@university.edu',
        position: 'UX Design Intern',
        status: 'interview',
        appliedDate: '2024-01-12',
        university: 'Design University',
        gpa: 3.6,
        skills: ['Figma', 'User Research', 'Prototyping'],
        coverLetter: 'User-centered design approach...',
        resume: 'david_kim_resume.pdf'
      },
      {
        id: 5,
        studentName: 'Lisa Wang',
        email: 'lisa.wang@college.edu',
        position: 'Finance Intern',
        status: 'rejected',
        appliedDate: '2024-01-11',
        university: 'Finance College',
        gpa: 3.5,
        skills: ['Financial Analysis', 'Excel', 'Bloomberg'],
        coverLetter: 'Strong analytical skills...',
        resume: 'lisa_wang_resume.pdf'
      }
    ];

    // Apply filters if provided
    let filteredApplications = mockApplications;
    if (filters.status) {
      filteredApplications = filteredApplications.filter(app => app.status === filters.status);
    }
    if (filters.position) {
      filteredApplications = filteredApplications.filter(app => 
        app.position.toLowerCase().includes(filters.position.toLowerCase())
      );
    }

    return {
      applications: filteredApplications,
      total: filteredApplications.length,
      page: parseInt(filters.page) || 1,
      pageSize: parseInt(filters.pageSize) || 10
    };
  }
}

// Global instance
let applicationsBackendInstance = null;

/**
 * Initialize applications backend
 */
function initializeApplicationsBackend() {
  if (!applicationsBackendInstance) {
    applicationsBackendInstance = new ApplicationsBackend();
  }
  applicationsBackendInstance.initialize();
}

/**
 * Get applications backend instance
 */
function getApplicationsBackend() {
  if (!applicationsBackendInstance) {
    initializeApplicationsBackend();
  }
  return applicationsBackendInstance;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplicationsBackend);
} else {
  initializeApplicationsBackend();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApplicationsBackend, initializeApplicationsBackend, getApplicationsBackend };
}