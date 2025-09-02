/**
 * EduLink Analytics Dashboard Backend Integration
 * Handles all backend API connections for the analytics dashboard
 */

class AnalyticsBackend {
    constructor() {
        this.apiUtils = null;
        this.isInitialized = false;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.init();
    }

    /**
     * Initialize the analytics backend
     */
    async init() {
        try {
            // Wait for APIUtils to be available
            if (typeof APIUtils !== 'undefined') {
                this.apiUtils = new APIUtils();
                this.isInitialized = true;
                console.log('Analytics Backend initialized successfully');
            } else {
                console.error('APIUtils not found. Make sure api-utils.js is loaded first.');
                setTimeout(() => this.init(), 1000); // Retry after 1 second
            }
        } catch (error) {
            console.error('Error initializing Analytics Backend:', error);
        }
    }

    /**
     * Check if data is cached and still valid
     */
    isCacheValid(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;
        return (Date.now() - cached.timestamp) < this.cacheTimeout;
    }

    /**
     * Get cached data or fetch from API
     */
    async getCachedOrFetch(key, fetchFunction) {
        if (this.isCacheValid(key)) {
            console.log(`Using cached data for ${key}`);
            return this.cache.get(key).data;
        }

        try {
            const data = await fetchFunction();
            this.cache.set(key, {
                data: data,
                timestamp: Date.now()
            });
            return data;
        } catch (error) {
            console.error(`Error fetching ${key}:`, error);
            // Return cached data if available, even if expired
            const cached = this.cache.get(key);
            if (cached) {
                console.warn(`Using expired cache for ${key} due to fetch error`);
                return cached.data;
            }
            throw error;
        }
    }

    /**
     * Load performance analytics data
     */
    async loadPerformanceData() {
        if (!this.isInitialized) {
            throw new Error('Analytics Backend not initialized');
        }

        return await this.getCachedOrFetch('performance', async () => {
            const response = await this.apiUtils.get('/dashboards/analytics/employer/performance/');
            if (!response) {
                throw new Error('No performance data available');
            }
            return response;
        });
    }

    /**
     * Load reports analytics data
     */
    async loadReportsData() {
        if (!this.isInitialized) {
            throw new Error('Analytics Backend not initialized');
        }

        return await this.getCachedOrFetch('reports', async () => {
            const response = await this.apiUtils.get('/dashboards/analytics/employer/reports/');
            if (!response) {
                throw new Error('No reports data available');
            }
            return response;
        });
    }

    /**
     * Load application statistics
     */
    async loadApplicationStatistics() {
        if (!this.isInitialized) {
            throw new Error('Analytics Backend not initialized');
        }

        return await this.getCachedOrFetch('applicationStats', async () => {
            const response = await this.apiUtils.get('/application/statistics/');
            if (!response) {
                throw new Error('No application statistics available');
            }
            return response;
        });
    }

    /**
     * Load internship analytics
     */
    async loadInternshipAnalytics() {
        if (!this.isInitialized) {
            throw new Error('Analytics Backend not initialized');
        }

        return await this.getCachedOrFetch('internshipAnalytics', async () => {
            const response = await this.apiUtils.get('/employers/my-internships/analytics/');
            if (!response) {
                throw new Error('No internship analytics available');
            }
            return response;
        });
    }

    /**
     * Generate custom report
     */
    async generateCustomReport(reportConfig) {
        if (!this.isInitialized) {
            console.warn('Analytics Backend not initialized');
            return { success: false, message: 'Backend not initialized' };
        }

        try {
            const response = await this.apiUtils.post('/dashboards/analytics/employer/reports/generate/', reportConfig);
            return response;
        } catch (error) {
            console.error('Error generating custom report:', error);
            return { success: false, message: 'Failed to generate report' };
        }
    }

    /**
     * Schedule report
     */
    async scheduleReport(scheduleConfig) {
        if (!this.isInitialized) {
            console.warn('Analytics Backend not initialized');
            return { success: false, message: 'Backend not initialized' };
        }

        try {
            const response = await this.apiUtils.post('/dashboards/analytics/employer/reports/schedule/', scheduleConfig);
            return response;
        } catch (error) {
            console.error('Error scheduling report:', error);
            return { success: false, message: 'Failed to schedule report' };
        }
    }

    /**
     * Export analytics data
     */
    async exportAnalyticsData(exportConfig = {}) {
        if (!this.isInitialized) {
            throw new Error('Analytics Backend not initialized');
        }

        const response = await this.apiUtils.post('/dashboards/analytics/employer/export/', exportConfig);
        if (!response) {
            throw new Error('Failed to export analytics data');
        }
        return response;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Analytics cache cleared');
    }

    /**
     * Refresh all analytics data
     */
    async refreshAllData() {
        this.clearCache();
        const promises = [
            this.loadPerformanceData(),
            this.loadReportsData(),
            this.loadApplicationStatistics(),
            this.loadInternshipAnalytics()
        ];

        try {
            const results = await Promise.allSettled(promises);
            console.log('Analytics data refreshed:', results);
            return results;
        } catch (error) {
            console.error('Error refreshing analytics data:', error);
            throw error;
        }
    }


}

// Global instance
let analyticsBackend = null;

/**
 * Initialize analytics backend
 */
function initializeAnalyticsBackend() {
    if (!analyticsBackend) {
        analyticsBackend = new AnalyticsBackend();
    }
    return analyticsBackend;
}

/**
 * Get analytics backend instance
 */
function getAnalyticsBackend() {
    if (!analyticsBackend) {
        analyticsBackend = initializeAnalyticsBackend();
    }
    return analyticsBackend;
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeAnalyticsBackend();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AnalyticsBackend,
        initializeAnalyticsBackend,
        getAnalyticsBackend
    };
}

// Global exports for legacy compatibility
window.AnalyticsBackend = AnalyticsBackend;
window.initializeAnalyticsBackend = initializeAnalyticsBackend;
window.getAnalyticsBackend = getAnalyticsBackend;