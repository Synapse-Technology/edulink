/**
 * API Utilities Module
 * Handles API configuration, authentication, and common HTTP operations
 */

class APIUtils {
    constructor() {
        this.config = {
            baseURL: (window.API_CONFIG?.BASE_URL || 'http://127.0.0.1:8000') + '/api',
            endpoints: {
                dashboard: '/dashboards/employer/',
                applications: '/application/applications/employer/',
                recentApplications: '/application/applications/recent/',
                applicationStatistics: '/application/statistics/',
                internships: '/internships/',
                notifications: '/notifications/',
                analytics: '/dashboards/analytics/employer/',
                employerProfile: '/employers/profile/',
                employerInternships: '/employers/my-internships/',
                internshipApplicants: '/employers/internship/{id}/applicants/',
                workflows: '/dashboards/workflows/employer/',
                workflowTemplates: '/dashboards/workflows/templates/',
                workflowAnalytics: '/dashboards/workflows/analytics/employer/'
            }
        };
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               sessionStorage.getItem('authToken') || 
               this.getCookie('authToken') || '';
    }

    /**
     * Get cookie value by name
     */
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    /**
     * Build full API URL
     */
    buildURL(endpoint, params = {}) {
        let url = this.config.baseURL + endpoint;
        
        // Replace path parameters
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    }

    /**
     * Get default headers for API requests
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    /**
     * Generic API request method
     */
    async makeRequest(method, endpoint, data = null, options = {}) {
        const url = this.buildURL(endpoint, options.params || {});
        
        const requestOptions = {
            method: method.toUpperCase(),
            headers: this.getHeaders(),
            ...options.fetchOptions
        };
        
        if (data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
            requestOptions.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.makeRequest('GET', endpoint, null, options);
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.makeRequest('POST', endpoint, data, options);
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.makeRequest('PUT', endpoint, data, options);
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.makeRequest('DELETE', endpoint, null, options);
    }

    /**
     * Handle API errors consistently
     */
    handleError(error, context = 'API operation') {
        console.error(`Error in ${context}:`, error);
        
        if (error.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/login';
            return;
        }
        
        if (error.status === 403) {
            // Forbidden
            throw new Error('You do not have permission to perform this action.');
        }
        
        if (error.status >= 500) {
            // Server error
            throw new Error('Server error. Please try again later.');
        }
        
        // Client error
        throw new Error(error.message || 'An error occurred. Please try again.');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIUtils;
} else {
    window.APIUtils = APIUtils;
}