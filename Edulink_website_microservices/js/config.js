/**
 * API Configuration for Edulink Frontend
 * This file centralizes all API endpoints and configurations
 */

// Environment detection
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// API Gateway configuration
const API_CONFIG = {
    // Base URLs
    API_GATEWAY_URL: isProduction ? 'https://api.edulink.com' : 'http://localhost:8000',
    MONOLITH_URL: isProduction ? 'https://api.edulink.com' : 'http://127.0.0.1:8001',
    
    // Service endpoints through API Gateway
    ENDPOINTS: {
        // Authentication (through API Gateway)
        AUTH: {
            LOGIN: '/api/auth/login/',
            REGISTER_STUDENT: '/api/auth/register/student/',
            PASSWORD_RESET: '/api/auth/password-reset/',
            LOGOUT: '/api/auth/logout/'
        },
        
        // User Management (through API Gateway)
        USERS: {
            STUDENT_PROFILE: '/api/users/student/profile/',
            UPDATE_PROFILE: '/api/users/student/profile/'
        },
        
        // Internship Service (through API Gateway)
        INTERNSHIPS: {
            LIST: '/api/internships/',
            DETAIL: '/api/internships/{id}/',
            SEARCH: '/api/internships/search/',
            CATEGORIES: '/api/internships/categories/'
        },
        
        // Application Service (through API Gateway)
        APPLICATIONS: {
            MY_APPLICATIONS: '/api/applications/my-applications/',
            APPLY: '/api/applications/apply/',
            DETAIL: '/api/applications/{id}/',
            WITHDRAW: '/api/applications/{id}/withdraw/'
        },
        
        // Dashboard endpoints (through API Gateway)
        DASHBOARD: {
            STUDENT: '/api/dashboards/student/',
            PROGRESS: '/api/dashboards/progress/',
            ANALYTICS: '/api/dashboards/analytics/',
            ACHIEVEMENTS: '/api/dashboards/achievements/',
            CALENDAR_EVENTS: '/api/dashboards/calendar-events/',
            CALENDAR_EVENT_DETAIL: '/api/dashboards/calendar-events/{id}/'
        },
        
        // Internship Progress (through API Gateway)
        INTERNSHIP_PROGRESS: {
            PROGRESS: '/api/internship-progress/progress/',
            LOGBOOK: '/api/internship-progress/logbook/',
            LOGBOOK_DETAIL: '/api/internship-progress/logbook/{id}/'
        },
        
        // Institution Management (through API Gateway)
        INSTITUTIONS: {
            VALIDATE_CODE: '/api/institutions/validate-code/',
            GENERATE_CODE: '/api/institutions/generate-code/',
            PROFILE: '/api/institutions/profile/',
            STATS: '/api/institutions/stats/',
            RECENT_ACTIVITY: '/api/institutions/recent-activity/'
        },
        
        // Registration Service (through API Gateway)
        REGISTRATION: {
            INSTITUTIONS: '/api/v1/registration/requests/',
            EMPLOYERS: '/api/registration/employers/',
            STATUS: '/api/registration/status/{id}/'
        }
    }
};

// Helper functions
const ApiHelper = {
    /**
     * Get the full URL for an endpoint
     * @param {string} endpoint - The endpoint path
     * @param {Object} params - URL parameters to replace (e.g., {id: 123})
     * @returns {string} Full URL
     */
    getUrl(endpoint, params = {}) {
        let url = API_CONFIG.API_GATEWAY_URL + endpoint;
        
        // Replace URL parameters
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    },
    
    /**
     * Get authentication headers
     * @returns {Object} Headers object
     */
    getAuthHeaders() {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },
    
    /**
     * Get authentication token from localStorage or cookies
     * @returns {string|null} Auth token
     */
    getAuthToken() {
        // Try localStorage first
        let token = localStorage.getItem('authToken');
        if (token) return token;
        
        // Fallback to cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'authToken' || name === 'access_token') {
                return value;
            }
        }
        
        return null;
    },
    
    /**
     * Make an authenticated API request
     * @param {string} endpoint - The endpoint path
     * @param {Object} options - Fetch options
     * @param {Object} urlParams - URL parameters to replace
     * @returns {Promise} Fetch promise
     */
    async request(endpoint, options = {}, urlParams = {}) {
        const url = this.getUrl(endpoint, urlParams);
        const headers = this.getAuthHeaders();
        
        const config = {
            headers,
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                // Redirect to login or refresh token
                this.handleAuthError();
                throw new Error('Authentication required');
            }
            
            return response;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },
    
    /**
     * Handle authentication errors
     */
    handleAuthError() {
        // Clear stored tokens
        localStorage.removeItem('authToken');
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login.html';
        }
    }
};

// Export for use in other scripts
window.API_CONFIG = API_CONFIG;
window.ApiHelper = ApiHelper;

// Legacy support - maintain backward compatibility
window.API_BASE_URL = API_CONFIG.API_GATEWAY_URL;
window.API_URL = API_CONFIG.API_GATEWAY_URL + API_CONFIG.ENDPOINTS.INTERNSHIPS.LIST;