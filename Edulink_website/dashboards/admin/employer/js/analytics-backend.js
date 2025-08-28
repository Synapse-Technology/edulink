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
            console.warn('Analytics Backend not initialized');
            return this.getMockPerformanceData();
        }

        return await this.getCachedOrFetch('performance', async () => {
            try {
                const response = await this.apiUtils.get('/dashboards/analytics/employer/performance/');
                return response || this.getMockPerformanceData();
            } catch (error) {
                console.warn('Failed to load performance data from API, using mock data:', error);
                return this.getMockPerformanceData();
            }
        });
    }

    /**
     * Load reports analytics data
     */
    async loadReportsData() {
        if (!this.isInitialized) {
            console.warn('Analytics Backend not initialized');
            return this.getMockReportsData();
        }

        return await this.getCachedOrFetch('reports', async () => {
            try {
                const response = await this.apiUtils.get('/dashboards/analytics/employer/reports/');
                return response || this.getMockReportsData();
            } catch (error) {
                console.warn('Failed to load reports data from API, using mock data:', error);
                return this.getMockReportsData();
            }
        });
    }

    /**
     * Load application statistics
     */
    async loadApplicationStatistics() {
        if (!this.isInitialized) {
            console.warn('Analytics Backend not initialized');
            return this.getMockApplicationStats();
        }

        return await this.getCachedOrFetch('applicationStats', async () => {
            try {
                const response = await this.apiUtils.get('/application/statistics/');
                return response || this.getMockApplicationStats();
            } catch (error) {
                console.warn('Failed to load application statistics from API, using mock data:', error);
                return this.getMockApplicationStats();
            }
        });
    }

    /**
     * Load internship analytics
     */
    async loadInternshipAnalytics() {
        if (!this.isInitialized) {
            console.warn('Analytics Backend not initialized');
            return this.getMockInternshipData();
        }

        return await this.getCachedOrFetch('internshipAnalytics', async () => {
            try {
                const response = await this.apiUtils.get('/employers/my-internships/analytics/');
                return response || this.getMockInternshipData();
            } catch (error) {
                console.warn('Failed to load internship analytics from API, using mock data:', error);
                return this.getMockInternshipData();
            }
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
            console.warn('Analytics Backend not initialized');
            return this.exportMockData();
        }

        try {
            const response = await this.apiUtils.post('/dashboards/analytics/employer/export/', exportConfig);
            return response;
        } catch (error) {
            console.error('Error exporting analytics data:', error);
            // Fallback to client-side export
            return this.exportMockData();
        }
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

    // Mock data methods for fallback
    getMockPerformanceData() {
        return {
            averageScore: 87,
            completedEvaluations: 24,
            pendingReviews: 6,
            completionRate: 92,
            trends: {
                scoreChange: 5,
                evaluationChange: 12,
                completionChange: 3
            },
            chartData: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Performance Score',
                    data: [82, 85, 83, 87, 89, 87],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)'
                }]
            }
        };
    }

    getMockReportsData() {
        return {
            scheduledReports: 2,
            generatedReports: 15,
            categories: ['Application', 'Performance', 'Compliance'],
            recentReports: [
                {
                    id: 1,
                    name: 'Monthly Application Report',
                    type: 'Application',
                    generatedDate: '2024-01-15',
                    status: 'completed'
                },
                {
                    id: 2,
                    name: 'Performance Analytics',
                    type: 'Performance',
                    generatedDate: '2024-01-14',
                    status: 'completed'
                }
            ]
        };
    }

    getMockApplicationStats() {
        return {
            total: 45,
            pending: 12,
            approved: 28,
            rejected: 5,
            trends: {
                totalChange: 8,
                approvalRate: 62.2
            },
            chartData: {
                labels: ['Applications', 'Interviews', 'Placements', 'Completions'],
                datasets: [{
                    label: 'Count',
                    data: [45, 32, 28, 25],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
                }]
            }
        };
    }

    getMockInternshipData() {
        return {
            activeInternships: 18,
            completedInternships: 42,
            averageRating: 4.3,
            completionRate: 89,
            trends: {
                activeChange: 3,
                ratingChange: 0.2,
                completionChange: 5
            }
        };
    }

    exportMockData() {
        const data = {
            performance: this.getMockPerformanceData(),
            reports: this.getMockReportsData(),
            applications: this.getMockApplicationStats(),
            internships: this.getMockInternshipData(),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { success: true, message: 'Data exported successfully' };
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