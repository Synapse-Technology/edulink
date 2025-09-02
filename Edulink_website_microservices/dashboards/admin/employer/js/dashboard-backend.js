/**
 * EduLink Employer Dashboard Backend Integration
 * Refactored modular version using code splitting
 */

// Global instances
let dashboardManager = null;
let apiUtils = null;
let domUtils = null;
let chartUtils = null;

/**
 * Initialize dashboard modules
 */
function initializeModules() {
    // Initialize utility modules
    apiUtils = new APIUtils();
    domUtils = new DOMUtils();
    chartUtils = new ChartUtils();
    
    // Initialize dashboard manager
    dashboardManager = new DashboardManager();
    
    return { dashboardManager, apiUtils, domUtils, chartUtils };
}

/**
 * Legacy compatibility functions
 * These maintain backward compatibility with existing code
 */

// Helper functions for showing/hiding elements (legacy compatibility)
function showElement(elementId) {
    if (domUtils) {
        domUtils.showElement(elementId);
    } else {
        const element = document.getElementById(elementId);
        if (element) element.classList.remove('hidden');
    }
}

function hideElement(elementId) {
    if (domUtils) {
        domUtils.hideElement(elementId);
    } else {
        const element = document.getElementById(elementId);
        if (element) element.classList.add('hidden');
    }
}

// Function to get authentication token (legacy compatibility)
function getAuthToken() {
    if (apiUtils) {
        return apiUtils.getAuthToken();
    }
    return localStorage.getItem('authToken') || 
           sessionStorage.getItem('authToken') || 
           getCookie('authToken') || '';
}

// Function to get cookie value (legacy compatibility)
function getCookie(name) {
    if (apiUtils) {
        return apiUtils.getCookie(name);
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Function to handle authentication errors (legacy compatibility)
function handleAuthenticationError(error, context = '') {
    if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        
        if (window.employerAuthSecurity && typeof window.employerAuthSecurity.logout === 'function') {
            window.employerAuthSecurity.logout('Your session has expired');
        } else {
            alert('Your session has expired. Please log in again.');
            window.location.href = './employer-login.html';
        }
        return true;
    }
    return false;
}

// Format date function (legacy compatibility)
function formatDate(dateString) {
    if (domUtils) {
        return domUtils.formatDate(dateString);
    }
    return new Date(dateString).toLocaleDateString();
}

// Format number function (legacy compatibility)
function formatNumber(num) {
    if (domUtils) {
        return domUtils.formatNumber(num);
    }
    return num.toLocaleString();
}

/**
 * Legacy API functions that delegate to the new modular system
 */

// Load recent applications
async function loadRecentApplications() {
    if (dashboardManager) {
        return await dashboardManager.loadRecentApplications();
    }
    console.warn('Dashboard manager not initialized');
    return [];
}

// Load dashboard data
async function loadDashboardData() {
    if (dashboardManager) {
        return await dashboardManager.loadDashboardData();
    }
    console.warn('Dashboard manager not initialized');
    return null;
}

// Load notifications
async function loadNotifications() {
    if (dashboardManager) {
        return await dashboardManager.loadNotifications();
    }
    console.warn('Dashboard manager not initialized');
    return [];
}

// Refresh dashboard
async function refreshDashboard() {
    if (dashboardManager) {
        return await dashboardManager.refreshDashboard();
    }
    console.warn('Dashboard manager not initialized');
}

/**
 * Legacy EmployerDashboardAPI class for backward compatibility
 */
class EmployerDashboardAPI {
    constructor() {
        this.isInitialized = false;
        this.modules = null;
    }

    static getInstance() {
        if (!EmployerDashboardAPI.instance) {
            EmployerDashboardAPI.instance = new EmployerDashboardAPI();
        }
        return EmployerDashboardAPI.instance;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            this.modules = initializeModules();
            await this.modules.dashboardManager.init();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            throw error;
        }
    }

    async loadApplications() {
        return await loadRecentApplications();
    }

    async fetchAnalyticsData() {
        if (this.modules && this.modules.apiUtils) {
            return await this.modules.apiUtils.get('/dashboards/analytics/employer/');
        }
        return null;
    }

    updateAnalyticsDisplay(data) {
        if (this.modules && this.modules.chartUtils && data) {
            this.modules.chartUtils.createAnalyticsChart('analytics-chart', data);
        }
    }

    async loadWorkflows() {
        if (this.modules && this.modules.apiUtils) {
            return await this.modules.apiUtils.get('/dashboards/workflows/employer/');
        }
        return [];
    }

    async loadWorkflowTemplates() {
        if (this.modules && this.modules.apiUtils) {
            return await this.modules.apiUtils.get('/dashboards/workflows/templates/');
        }
        return [];
    }

    async loadWorkflowAnalytics() {
        if (this.modules && this.modules.apiUtils) {
            return await this.modules.apiUtils.get('/dashboards/workflows/analytics/employer/');
        }
        return null;
    }

    cleanup() {
        if (this.modules && this.modules.dashboardManager) {
            this.modules.dashboardManager.destroy();
        }
        this.isInitialized = false;
    }
}

// Legacy function for loading recent activities
async function loadRecentActivities() {
    if (apiUtils) {
        try {
            const activities = await apiUtils.get('/dashboards/recent-activities/');
            if (dashboardManager) {
                dashboardManager.updateRecentActivity(activities);
            }
            return activities;
        } catch (error) {
            console.error('Error loading recent activities:', error);
            return [];
        }
    }
    return [];
}

// Legacy function for viewing applications
function viewApplication(applicationId) {
    if (applicationId) {
        window.location.href = `./applications.html?id=${applicationId}`;
    }
}

// Legacy function for showing error messages
function showErrorMessage(message) {
    if (domUtils) {
        domUtils.showError('dashboard-content', message);
    } else {
        console.error(message);
        alert(message);
    }
}

// Legacy function for showing success messages
function showSuccessMessage(message) {
    if (domUtils) {
        domUtils.showSuccess('dashboard-content', message);
    } else {
        console.log(message);
    }
}

/**
 * Initialize dashboard when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing modular dashboard...');
    
    try {
        // Check if modules are available
        if (typeof APIUtils === 'undefined' || 
            typeof DOMUtils === 'undefined' || 
            typeof ChartUtils === 'undefined' || 
            typeof DashboardManager === 'undefined') {
            console.error('Required modules not loaded. Please ensure all module scripts are included.');
            showErrorMessage('Dashboard modules not loaded. Please refresh the page.');
            return;
        }

        // Initialize the modular system
        const modules = initializeModules();
        
        // Initialize dashboard manager
        await modules.dashboardManager.init();
        
        // Set up legacy compatibility
        window.dashboard = EmployerDashboardAPI.getInstance();
        window.dashboard.modules = modules;
        window.dashboard.isInitialized = true;
        
        console.log('Modular dashboard initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showErrorMessage('Failed to initialize dashboard. Please refresh the page.');
    }
});

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (dashboardManager) {
        dashboardManager.destroy();
    }
    if (window.dashboard && typeof window.dashboard.cleanup === 'function') {
        window.dashboard.cleanup();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EmployerDashboardAPI,
        initializeModules,
        loadRecentApplications,
        loadDashboardData,
        loadNotifications,
        refreshDashboard
    };
}

// Global exports for legacy compatibility
window.EmployerDashboardAPI = EmployerDashboardAPI;
window.loadRecentApplications = loadRecentApplications;
window.loadDashboardData = loadDashboardData;
window.loadNotifications = loadNotifications;
window.refreshDashboard = refreshDashboard;
window.viewApplication = viewApplication;