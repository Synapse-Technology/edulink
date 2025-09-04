/**
 * Enhanced API Configuration for Edulink Frontend
 * Production-ready configuration with security features
 */

// Environment detection
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const isDevelopment = !isProduction;

// API Configuration with enhanced security
const API_CONFIG = {
    // Base URL - Single backend architecture
    BASE_URL: isProduction ? 'https://your-domain.com' : 'http://127.0.0.1:8000',
    
    // Security Configuration
    SECURITY: {
        CSRF_COOKIE_NAME: 'csrftoken',
        AUTH_TOKEN_KEY: 'authToken',
        REFRESH_TOKEN_KEY: 'refreshToken',
        TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes
        MAX_RETRY_ATTEMPTS: 3,
        REQUEST_TIMEOUT: 30000 // 30 seconds
    },
    
    // Rate Limiting Configuration
    RATE_LIMITS: {
        AUTH_REQUESTS: { max: 5, window: 300000 },
        API_REQUESTS: { max: 100, window: 60000 },
        SEARCH_REQUESTS: { max: 20, window: 60000 }
    },
    
    // Enhanced Endpoints
    ENDPOINTS: {
        // Authentication
        AUTH: {
            LOGIN: '/api/auth/login/',
            REGISTER_STUDENT: '/api/auth/register/student/',
            REGISTER_EMPLOYER: '/api/auth/register/employer/',
            PASSWORD_RESET: '/api/auth/password-reset/',
            LOGOUT: '/api/auth/logout/',
            REFRESH_TOKEN: '/api/auth/refresh/',
            VERIFY_EMAIL: '/api/auth/verify-email/'
        },
        
        // User Management
        USERS: {
            STUDENT_PROFILE: '/api/users/student/profile/',
            EMPLOYER_PROFILE: '/api/users/employer/profile/',
            UPDATE_PROFILE: '/api/users/profile/update/',
            CHANGE_PASSWORD: '/api/users/change-password/'
        },
        
        // Internships
        INTERNSHIPS: {
            LIST: '/api/internships/',
            DETAIL: '/api/internships/{id}/',
            CREATE: '/api/internships/create/',
            SEARCH: '/api/internships/search/',
            CATEGORIES: '/api/internships/categories/'
        },
        
        // Applications - Fixed path
        APPLICATIONS: {
            MY_APPLICATIONS: '/api/application/my-applications/',
            APPLY: '/api/application/apply/',
            DETAIL: '/api/application/{id}/',
            WITHDRAW: '/api/application/{id}/withdraw/'
        },
        
        // Dashboards
        DASHBOARDS: {
            STUDENT: '/api/dashboards/student/',
            PROGRESS: '/api/dashboards/progress/',
            ANALYTICS: '/api/dashboards/analytics/',
            CALENDAR_EVENTS: '/api/dashboards/calendar-events/'
        },
        
        // Supervisors - New endpoints
        SUPERVISORS: {
            LIST: '/api/supervisors/',
            ASSIGN: '/api/supervisors/assign/',
            PROGRESS: '/api/supervisors/progress/',
            REPORTS: '/api/supervisors/reports/'
        },
        
        // Monitoring - New endpoints
        MONITORING: {
            HEALTH: '/api/monitoring/health/',
            METRICS: '/api/monitoring/metrics/',
            SYSTEM_STATUS: '/api/monitoring/system-status/'
        },
        
        // Security
        SECURITY: {
            REPORT_INCIDENT: '/api/security/report-incident/',
            AUDIT_LOG: '/api/security/audit-log/'
        },
        
        // Institutions
        INSTITUTIONS: {
            VALIDATE_CODE: '/api/institutions/validate-code/',
            PROFILE: '/api/institutions/profile/',
            STATS: '/api/institutions/stats/'
        }
    }
};

// Enhanced API Helper with Security Features
const ApiHelper = {
    // Rate limiting tracker
    rateLimitTracker: new Map(),
    
    /**
     * Check rate limits before making requests
     */
    checkRateLimit(category) {
        const limit = API_CONFIG.RATE_LIMITS[category];
        if (!limit) return true;
        
        const now = Date.now();
        const key = category;
        
        if (!this.rateLimitTracker.has(key)) {
            this.rateLimitTracker.set(key, []);
        }
        
        const requests = this.rateLimitTracker.get(key);
        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < limit.window);
        
        if (validRequests.length >= limit.max) {
            throw new Error(`Rate limit exceeded for ${category}. Please try again later.`);
        }
        
        validRequests.push(now);
        this.rateLimitTracker.set(key, validRequests);
        return true;
    },
    
    /**
     * Get CSRF token from cookies
     */
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === API_CONFIG.SECURITY.CSRF_COOKIE_NAME) {
                return decodeURIComponent(value);
            }
        }
        return null;
    },
    
    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem(API_CONFIG.SECURITY.AUTH_TOKEN_KEY) || 
               sessionStorage.getItem(API_CONFIG.SECURITY.AUTH_TOKEN_KEY);
    },
    
    /**
     * Set authentication token
     */
    setAuthToken(token, remember = false) {
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(API_CONFIG.SECURITY.AUTH_TOKEN_KEY, token);
    },
    
    /**
     * Clear authentication tokens
     */
    clearAuthTokens() {
        localStorage.removeItem(API_CONFIG.SECURITY.AUTH_TOKEN_KEY);
        sessionStorage.removeItem(API_CONFIG.SECURITY.AUTH_TOKEN_KEY);
        localStorage.removeItem(API_CONFIG.SECURITY.REFRESH_TOKEN_KEY);
    },
    
    /**
     * Get enhanced authentication headers
     */
    getAuthHeaders() {
        const token = this.getAuthToken();
        const csrfToken = this.getCSRFToken();
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        return headers;
    },
    
    /**
     * Get full URL for endpoint
     */
    getUrl(endpoint, params = {}) {
        let url = API_CONFIG.BASE_URL + endpoint;
        
        // Replace URL parameters
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    },
    
    /**
     * Enhanced API request with security features
     */
    async request(endpoint, options = {}, urlParams = {}, rateCategory = 'API_REQUESTS') {
        try {
            // Check rate limits
            this.checkRateLimit(rateCategory);
            
            const url = this.getUrl(endpoint, urlParams);
            const headers = this.getAuthHeaders();
            
            const config = {
                headers,
                timeout: API_CONFIG.SECURITY.REQUEST_TIMEOUT,
                ...options
            };
            
            // Add request timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);
            config.signal = controller.signal;
            
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            
            // Handle different response statuses
            if (response.status === 401) {
                // Only show session expired message if not on login page
                if (!window.location.pathname.includes('login')) {
                    this.handleAuthError();
                }
                throw new Error('Authentication required');
            }
            
            if (response.status === 403) {
                throw new Error('Access forbidden');
            }
            
            if (response.status === 429) {
                throw new Error('Too many requests. Please slow down.');
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please check your connection.');
            }
            
            console.error('API Request failed:', error);
            throw error;
        }
    },
    
    /**
     * Handle authentication errors
     */
    handleAuthError() {
        this.clearAuthTokens();
        
        // Show user-friendly message
        this.showNotification('Session expired. Please log in again.', 'warning');
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('login')) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    },
    
    /**
     * Show user notifications
     */
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('api-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'api-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        // Set notification style based on type
        const colors = {
            info: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
};

// Input Sanitization Helper
const InputSanitizer = {
    /**
     * Sanitize HTML input to prevent XSS
     */
    sanitizeHTML(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },
    
    /**
     * Validate and sanitize form data
     */
    sanitizeFormData(data) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeHTML(value.trim());
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
};

// Export for global use
window.API_CONFIG = API_CONFIG;
window.ApiHelper = ApiHelper;
window.InputSanitizer = InputSanitizer;

// Legacy support
window.API_BASE_URL = API_CONFIG.BASE_URL;
window.API_URL = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.INTERNSHIPS.LIST;

// Initialize CSRF token on page load
document.addEventListener('DOMContentLoaded', function() {
    // Get CSRF token if not present
    if (!ApiHelper.getCSRFToken()) {
        fetch(API_CONFIG.BASE_URL + '/api/auth/csrf/', {
            method: 'GET',
            credentials: 'include'
        }).catch(console.error);
    }
});