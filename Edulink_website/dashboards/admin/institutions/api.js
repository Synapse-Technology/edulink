// Institution Dashboard API Implementation
// Base API configuration
const API_BASE = (window.API_CONFIG?.BASE_URL || '${API_BASE_URL:-https://edulink-api.onrender.com}') + '/api/institutions';
const AUTH_API_BASE = (window.API_CONFIG?.BASE_URL || '${API_BASE_URL:-https://edulink-api.onrender.com}') + '/api/auth';

// Utility function to get auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Utility function to get CSRF token
function getCookie(name) {
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

// Generic API call function
async function apiCall(endpoint, options = {}) {
    const authToken = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
    };
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(endpoint, config);
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            window.location.href = '/institutions/login/';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Authentication APIs
const AuthAPI = {
    // Login function
    async login(email, password) {
        try {
            const response = await fetch(`${AUTH_API_BASE}/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }
            
            const data = await response.json();
            
            // Store auth token and user info
            localStorage.setItem('authToken', data.access);
            localStorage.setItem('userInfo', JSON.stringify({
                email: data.user.email,
                role: data.user.role,
                name: (data.user.profile.first_name || '') + ' ' + (data.user.profile.last_name || '')
            }));
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    // Logout function
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.href = '/institutions/login/';
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        const token = getAuthToken();
        const userInfo = localStorage.getItem('userInfo');
        return token && userInfo;
    },
    
    // Get current user info
    getCurrentUser() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }
};

// Cache management
const CacheManager = {
    // Cache duration in milliseconds (5 minutes)
    CACHE_DURATION: 5 * 60 * 1000,
    
    // Set cache with timestamp
    set(key, data) {
        const cacheItem = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    },
    
    // Get cache if not expired
    get(key) {
        const cached = localStorage.getItem(`cache_${key}`);
        if (!cached) return null;
        
        const cacheItem = JSON.parse(cached);
        const isExpired = Date.now() - cacheItem.timestamp > this.CACHE_DURATION;
        
        if (isExpired) {
            localStorage.removeItem(`cache_${key}`);
            return null;
        }
        
        return cacheItem.data;
    },
    
    // Clear specific cache
    clear(key) {
        localStorage.removeItem(`cache_${key}`);
    },
    
    // Clear all cache
    clearAll() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }
};

// Dashboard Stats API with caching
const DashboardAPI = {
    // Get dashboard statistics with caching
    async getStats() {
        const cached = CacheManager.get('dashboard_stats');
        if (cached) {
            return cached;
        }
        
        const data = await apiCall(`${API_BASE}/dashboard/stats/`);
        CacheManager.set('dashboard_stats', data);
        return data;
    },
    
    // Get recent activity with caching
    async getRecentActivity() {
        const cached = CacheManager.get('recent_activity');
        if (cached) {
            return cached;
        }
        
        const data = await apiCall(`${API_BASE}/dashboard/activity/`);
        CacheManager.set('recent_activity', data);
        return data;
    },
    
    // Force refresh dashboard data
    async refreshStats() {
        CacheManager.clear('dashboard_stats');
        return await this.getStats();
    },
    
    // Force refresh activity data
     async refreshActivity() {
         CacheManager.clear('recent_activity');
         return await this.getRecentActivity();
     }
};

// Departments API
const DepartmentsAPI = {
    // Get all departments
    async getDepartments() {
        return await apiCall(`${API_BASE}/departments/`);
    },
    
    // Get single department
    async getDepartment(departmentId) {
        return await apiCall(`${API_BASE}/departments/${departmentId}/`);
    },
    
    // Create new department
    async createDepartment(departmentData) {
        return await apiCall(`${API_BASE}/departments/`, {
            method: 'POST',
            body: JSON.stringify(departmentData)
        });
    },
    
    // Update department
    async updateDepartment(departmentId, departmentData) {
        return await apiCall(`${API_BASE}/departments/${departmentId}/`, {
            method: 'PUT',
            body: JSON.stringify(departmentData)
        });
    },
    
    // Delete department
    async deleteDepartment(departmentId) {
        return await apiCall(`${API_BASE}/departments/${departmentId}/`, {
            method: 'DELETE'
        });
    }
};

// Supervisors API
const SupervisorsAPI = {
    // Get all supervisors
    async getSupervisors() {
        return await apiCall(`${API_BASE}/supervisors/`);
    },
    
    // Get single supervisor
    async getSupervisor(supervisorId) {
        return await apiCall(`${API_BASE}/supervisors/${supervisorId}/`);
    },
    
    // Create new supervisor
    async createSupervisor(supervisorData) {
        return await apiCall(`${API_BASE}/supervisors/`, {
            method: 'POST',
            body: JSON.stringify(supervisorData)
        });
    },
    
    // Update supervisor
    async updateSupervisor(supervisorId, supervisorData) {
        return await apiCall(`${API_BASE}/supervisors/${supervisorId}/`, {
            method: 'PUT',
            body: JSON.stringify(supervisorData)
        });
    },
    
    // Delete supervisor
    async deleteSupervisor(supervisorId) {
        return await apiCall(`${API_BASE}/supervisors/${supervisorId}/`, {
            method: 'DELETE'
        });
    }
};

// Internships API
const InternshipsAPI = {
    // Get all internships related to institution
    async getInternships() {
        return await apiCall(`${API_BASE}/internships/`);
    }
};

// Reports API
const ReportsAPI = {
    // Get reports and analytics
    async getReports() {
        return await apiCall(`${API_BASE}/reports/`);
    }
};

// Students API
const StudentsAPI = {
    // Get institution students
    async getStudents() {
        return await apiCall(`${API_BASE}/my-students/`);
    }
};

// Applications API
const ApplicationsAPI = {
    // Get all applications from institution students
    async getApplications() {
        return await apiCall(`${API_BASE}/applications/`);
    },
    
    // Update application status
    async updateApplicationStatus(applicationId, status, notes = '') {
        return await apiCall(`${API_BASE}/application/${applicationId}/status/`, {
            method: 'PATCH',
            body: JSON.stringify({ status, review_notes: notes })
        });
    }
};

// Institution Profile API
const InstitutionAPI = {
    // Get current institution profile
    async getProfile() {
        return await apiCall(`${API_BASE}/profile/`);
    },
    
    // Create new institution
    async createInstitution(institutionData) {
        return await apiCall('/institutions/create/', {
            method: 'POST',
            body: JSON.stringify(institutionData)
        });
    }
};

// Export all APIs
window.InstitutionAPIs = {
    Auth: AuthAPI,
    Dashboard: DashboardAPI,
    Departments: DepartmentsAPI,
    Supervisors: SupervisorsAPI,
    Internships: InternshipsAPI,
    Reports: ReportsAPI,
    Students: StudentsAPI,
    Applications: ApplicationsAPI,
    Institution: InstitutionAPI,
    Cache: CacheManager
};

// Backward compatibility - export individual functions
window.apiCall = apiCall;
window.getAuthToken = getAuthToken;
window.getCookie = getCookie;

// Authentication helper functions for global use
window.checkAuthentication = function() {
    const authToken = getAuthToken();
    const userInfo = localStorage.getItem('userInfo');
    
    if (!authToken || !userInfo) {
        redirectToLogin();
        return false;
    }
    
    const user = JSON.parse(userInfo);
    if (user.role !== 'institution_admin') {
        alert('Access denied. Institution admin access required.');
        AuthAPI.logout();
        return false;
    }
    
    // Update welcome message if element exists
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        welcomeElement.textContent = `Welcome, ${user.name}`;
    }
    
    return true;
};

window.redirectToLogin = function() {
    window.location.href = '/institutions/login/';
};

window.logout = function() {
    AuthAPI.logout();
};

console.log('Institution Dashboard APIs loaded successfully');