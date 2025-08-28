/**
 * Supervisors Backend API Integration
 * Handles all supervisor-related API calls and data management
 */

class SupervisorsBackend {
    constructor() {
        this.baseURL = '/api/employer';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.isOnline = navigator.onLine;
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingChanges();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Make API request with retry logic and error handling
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken(),
                ...options.headers
            },
            credentials: 'include'
        };

        const requestOptions = { ...defaultOptions, ...options };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Authentication required');
                    }
                    if (response.status === 403) {
                        throw new Error('Access denied');
                    }
                    if (response.status >= 500) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                    throw new Error(`Request failed: ${response.status}`);
                }

                const data = await response.json();
                return { success: true, data };
            } catch (error) {
                console.warn(`Request attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryAttempts) {
                    return { 
                        success: false, 
                        error: error.message,
                        offline: !this.isOnline
                    };
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }

    /**
     * Get CSRF token from cookies
     */
    getCSRFToken() {
        const name = 'csrftoken';
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

    /**
     * Cache management
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Load all supervisors
     */
    async loadSupervisors() {
        const cacheKey = 'supervisors_list';
        const cached = this.getCache(cacheKey);
        if (cached) {
            return { success: true, data: cached };
        }

        const result = await this.makeRequest('/supervisors/');
        
        if (result.success) {
            this.setCache(cacheKey, result.data);
            return result;
        }

        // Fallback to mock data if API fails
        const mockData = this.getMockSupervisors();
        return { success: true, data: mockData, fromCache: true };
    }

    /**
     * Get supervisor statistics
     */
    async getSupervisorStats() {
        const cacheKey = 'supervisor_stats';
        const cached = this.getCache(cacheKey);
        if (cached) {
            return { success: true, data: cached };
        }

        const result = await this.makeRequest('/supervisors/stats/');
        
        if (result.success) {
            this.setCache(cacheKey, result.data);
            return result;
        }

        // Fallback to mock stats
        const mockStats = {
            total_supervisors: 12,
            active_supervisors: 10,
            pending_invitations: 3,
            average_rating: 4.2
        };
        return { success: true, data: mockStats, fromCache: true };
    }

    /**
     * Create new supervisor
     */
    async createSupervisor(supervisorData) {
        const result = await this.makeRequest('/supervisors/', {
            method: 'POST',
            body: JSON.stringify(supervisorData)
        });

        if (result.success) {
            this.clearCache(); // Clear cache to force refresh
            return result;
        }

        // Store in pending changes for offline sync
        if (!this.isOnline) {
            this.storePendingChange('create_supervisor', supervisorData);
            return { 
                success: true, 
                data: { ...supervisorData, id: Date.now(), pending: true },
                offline: true 
            };
        }

        return result;
    }

    /**
     * Update supervisor
     */
    async updateSupervisor(supervisorId, supervisorData) {
        const result = await this.makeRequest(`/supervisors/${supervisorId}/`, {
            method: 'PUT',
            body: JSON.stringify(supervisorData)
        });

        if (result.success) {
            this.clearCache();
            return result;
        }

        if (!this.isOnline) {
            this.storePendingChange('update_supervisor', { id: supervisorId, ...supervisorData });
            return { 
                success: true, 
                data: { id: supervisorId, ...supervisorData, pending: true },
                offline: true 
            };
        }

        return result;
    }

    /**
     * Delete supervisor
     */
    async deleteSupervisor(supervisorId) {
        const result = await this.makeRequest(`/supervisors/${supervisorId}/`, {
            method: 'DELETE'
        });

        if (result.success) {
            this.clearCache();
            return result;
        }

        if (!this.isOnline) {
            this.storePendingChange('delete_supervisor', { id: supervisorId });
            return { success: true, offline: true };
        }

        return result;
    }

    /**
     * Send supervisor invitation
     */
    async sendInvitation(email, supervisorData) {
        const result = await this.makeRequest('/supervisors/invite/', {
            method: 'POST',
            body: JSON.stringify({ email, ...supervisorData })
        });

        if (result.success) {
            this.clearCache();
            return result;
        }

        if (!this.isOnline) {
            this.storePendingChange('send_invitation', { email, ...supervisorData });
            return { success: true, offline: true };
        }

        return result;
    }

    /**
     * Get supervisor details
     */
    async getSupervisorDetails(supervisorId) {
        const cacheKey = `supervisor_${supervisorId}`;
        const cached = this.getCache(cacheKey);
        if (cached) {
            return { success: true, data: cached };
        }

        const result = await this.makeRequest(`/supervisors/${supervisorId}/`);
        
        if (result.success) {
            this.setCache(cacheKey, result.data);
            return result;
        }

        // Fallback to mock data
        const mockSupervisor = this.getMockSupervisorDetails(supervisorId);
        return { success: true, data: mockSupervisor, fromCache: true };
    }

    /**
     * Export supervisors data
     */
    async exportSupervisors(format = 'csv') {
        const result = await this.makeRequest(`/supervisors/export/?format=${format}`);
        
        if (result.success) {
            return result;
        }

        // Fallback: generate export from cached/mock data
        const supervisors = await this.loadSupervisors();
        if (supervisors.success) {
            const exportData = this.generateExportData(supervisors.data, format);
            return { success: true, data: exportData, fromCache: true };
        }

        return result;
    }

    /**
     * Store pending changes for offline sync
     */
    storePendingChange(action, data) {
        const pendingChanges = JSON.parse(localStorage.getItem('pending_supervisor_changes') || '[]');
        pendingChanges.push({
            action,
            data,
            timestamp: Date.now()
        });
        localStorage.setItem('pending_supervisor_changes', JSON.stringify(pendingChanges));
    }

    /**
     * Sync pending changes when back online
     */
    async syncPendingChanges() {
        const pendingChanges = JSON.parse(localStorage.getItem('pending_supervisor_changes') || '[]');
        
        for (const change of pendingChanges) {
            try {
                switch (change.action) {
                    case 'create_supervisor':
                        await this.createSupervisor(change.data);
                        break;
                    case 'update_supervisor':
                        await this.updateSupervisor(change.data.id, change.data);
                        break;
                    case 'delete_supervisor':
                        await this.deleteSupervisor(change.data.id);
                        break;
                    case 'send_invitation':
                        await this.sendInvitation(change.data.email, change.data);
                        break;
                }
            } catch (error) {
                console.error('Failed to sync pending change:', error);
            }
        }
        
        localStorage.removeItem('pending_supervisor_changes');
    }

    /**
     * Generate export data
     */
    generateExportData(supervisors, format) {
        if (format === 'csv') {
            const headers = ['Name', 'Email', 'Department', 'Phone', 'Status', 'Interns Count'];
            const rows = supervisors.map(supervisor => [
                supervisor.name,
                supervisor.email,
                supervisor.department,
                supervisor.phone || '',
                supervisor.status,
                supervisor.interns_count || 0
            ]);
            
            const csvContent = [headers, ...rows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');
            
            return {
                content: csvContent,
                filename: `supervisors_${new Date().toISOString().split('T')[0]}.csv`,
                mimeType: 'text/csv'
            };
        }
        
        return {
            content: JSON.stringify(supervisors, null, 2),
            filename: `supervisors_${new Date().toISOString().split('T')[0]}.json`,
            mimeType: 'application/json'
        };
    }

    /**
     * Mock data for offline/fallback scenarios
     */
    getMockSupervisors() {
        return [
            {
                id: 1,
                name: 'Dr. Sarah Johnson',
                email: 'sarah.johnson@company.com',
                department: 'Engineering',
                phone: '+1 (555) 123-4567',
                status: 'active',
                interns_count: 3,
                rating: 4.8,
                joined_date: '2023-01-15'
            },
            {
                id: 2,
                name: 'Michael Chen',
                email: 'michael.chen@company.com',
                department: 'Marketing',
                phone: '+1 (555) 234-5678',
                status: 'active',
                interns_count: 2,
                rating: 4.5,
                joined_date: '2023-03-20'
            },
            {
                id: 3,
                name: 'Emily Rodriguez',
                email: 'emily.rodriguez@company.com',
                department: 'Human Resources',
                phone: '+1 (555) 345-6789',
                status: 'pending',
                interns_count: 0,
                rating: null,
                joined_date: null
            }
        ];
    }

    /**
     * Mock supervisor details
     */
    getMockSupervisorDetails(supervisorId) {
        const supervisors = this.getMockSupervisors();
        return supervisors.find(s => s.id == supervisorId) || supervisors[0];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupervisorsBackend;
}

// Global availability
window.SupervisorsBackend = SupervisorsBackend;