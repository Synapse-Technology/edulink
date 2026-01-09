/**
 * Interns Backend API Connection Module
 * Handles all API interactions for the intern management dashboard
 */

class InternsBackend {
    constructor() {
        this.apiUtils = window.APIUtils ? new window.APIUtils() : null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('InternsBackend initialized');
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection in InternsBackend:', event.reason);
        });
    }

    // Cache management
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
            data: data,
            timestamp: Date.now()
        });
    }

    // API call with retry logic
    async apiCall(endpoint, options = {}) {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                if (this.apiUtils) {
                    const response = await this.apiUtils.request(endpoint, options);
                    return response;
                } else {
                    throw new Error('APIUtils not available');
                }
            } catch (error) {
                console.warn(`API call attempt ${attempt} failed:`, error);
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }

    // Load intern data
    async loadInterns(filters = {}) {
        try {
            const cacheKey = `interns_${JSON.stringify(filters)}`;
            const cachedData = this.getCachedData(cacheKey);
            
            if (cachedData) {
                return cachedData;
            }

            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = queryParams ? `/interns/?${queryParams}` : '/interns/';
            
            const response = await this.apiCall(endpoint);
            
            if (response && response.success) {
                this.setCachedData(cacheKey, response.data);
                return response.data;
            } else {
                throw new Error('Failed to load interns data');
            }
        } catch (error) {
            console.error('Error loading interns:', error);
            return this.getMockInternsData();
        }
    }

    // Load intern statistics
    async loadInternStatistics() {
        try {
            const cacheKey = 'intern_statistics';
            const cachedData = this.getCachedData(cacheKey);
            
            if (cachedData) {
                return cachedData;
            }

            const response = await this.apiCall('/interns/statistics/');
            
            if (response && response.success) {
                this.setCachedData(cacheKey, response.data);
                return response.data;
            } else {
                throw new Error('Failed to load intern statistics');
            }
        } catch (error) {
            console.error('Error loading intern statistics:', error);
            throw new Error('Unable to load intern statistics. Please check your connection and try again.');
        }
    }

    // Update intern status
    async updateInternStatus(internId, status, notes = '') {
        try {
            const response = await this.apiCall(`/interns/${internId}/status/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: status,
                    notes: notes,
                    updated_at: new Date().toISOString()
                })
            });

            if (response && response.success) {
                // Clear related cache
                this.clearInternCache();
                return response.data;
            } else {
                throw new Error('Failed to update intern status');
            }
        } catch (error) {
            console.error('Error updating intern status:', error);
            throw error;
        }
    }

    // Update intern progress
    async updateInternProgress(internId, progressData) {
        try {
            const response = await this.apiCall(`/interns/${internId}/progress/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(progressData)
            });

            if (response && response.success) {
                this.clearInternCache();
                return response.data;
            } else {
                throw new Error('Failed to update intern progress');
            }
        } catch (error) {
            console.error('Error updating intern progress:', error);
            throw error;
        }
    }

    // Add intern evaluation
    async addInternEvaluation(internId, evaluationData) {
        try {
            const response = await this.apiCall(`/interns/${internId}/evaluations/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(evaluationData)
            });

            if (response && response.success) {
                this.clearInternCache();
                return response.data;
            } else {
                throw new Error('Failed to add intern evaluation');
            }
        } catch (error) {
            console.error('Error adding intern evaluation:', error);
            throw error;
        }
    }

    // Export intern data
    async exportInternData(format = 'csv', filters = {}) {
        try {
            const queryParams = new URLSearchParams({
                format: format,
                ...filters
            }).toString();
            
            const response = await this.apiCall(`/interns/export/?${queryParams}`);
            
            if (response && response.success) {
                return response.data;
            } else {
                throw new Error('Failed to export intern data');
            }
        } catch (error) {
            console.error('Error exporting intern data:', error);
            // Return mock export data
            return {
                url: '#',
                filename: `interns_export_${new Date().toISOString().split('T')[0]}.${format}`,
                message: 'Export functionality temporarily unavailable'
            };
        }
    }

    // Clear intern-related cache
    clearInternCache() {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes('intern')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    // Mock data for fallback
    getMockInternsData() {
        return {
            interns: [
                {
                    id: 1,
                    name: 'Sarah Johnson',
                    email: 'sarah.johnson@university.edu',
                    position: 'Software Development Intern',
                    department: 'Engineering',
                    supervisor: 'John Smith',
                    start_date: '2024-01-15',
                    end_date: '2024-06-15',
                    status: 'active',
                    progress: 75,
                    university: 'Tech University',
                    avatar: 'https://via.placeholder.com/40x40/2563eb/ffffff?text=SJ'
                },
                {
                    id: 2,
                    name: 'Michael Chen',
                    email: 'michael.chen@university.edu',
                    position: 'Marketing Intern',
                    department: 'Marketing',
                    supervisor: 'Emily Davis',
                    start_date: '2024-02-01',
                    end_date: '2024-07-01',
                    status: 'active',
                    progress: 60,
                    university: 'Business College',
                    avatar: 'https://via.placeholder.com/40x40/0ea5e9/ffffff?text=MC'
                },
                {
                    id: 3,
                    name: 'Emma Wilson',
                    email: 'emma.wilson@university.edu',
                    position: 'Data Analysis Intern',
                    department: 'Analytics',
                    supervisor: 'David Brown',
                    start_date: '2023-12-01',
                    end_date: '2024-05-01',
                    status: 'completed',
                    progress: 100,
                    university: 'Data Science Institute',
                    avatar: 'https://via.placeholder.com/40x40/10b981/ffffff?text=EW'
                }
            ],
            total: 3,
            page: 1,
            per_page: 10
        };
    }


}

// Initialize the backend when the script loads
if (typeof window !== 'undefined') {
    window.InternsBackend = InternsBackend;
    
    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.internsBackend) {
                window.internsBackend = new InternsBackend();
            }
        });
    } else {
        if (!window.internsBackend) {
            window.internsBackend = new InternsBackend();
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InternsBackend;
}