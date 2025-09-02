/**
 * Interviews Backend Connection Module
 * Handles API connections for the interviews dashboard
 */

class InterviewsBackend {
    constructor() {
        this.baseUrl = '/api/employer';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Load interviews data from backend
     */
    async loadInterviews() {
        const cacheKey = 'interviews';
        
        try {
            // Check cache first
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            const response = await this.makeRequest('/interviews/');
            const data = response.interviews || [];
            
            // Cache the result
            this.setCache(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error('Failed to load interviews:', error);
            // Return mock data as fallback
            return this.getMockInterviews();
        }
    }

    /**
     * Load interview statistics
     */
    async loadInterviewStatistics() {
        const cacheKey = 'interview_statistics';
        
        try {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            const response = await this.makeRequest('/interviews/statistics/');
            const stats = {
                total: response.total || 0,
                scheduled: response.scheduled || 0,
                completed: response.completed || 0,
                pending: response.pending || 0,
                cancelled: response.cancelled || 0
            };
            
            this.setCache(cacheKey, stats);
            return stats;
        } catch (error) {
            console.error('Failed to load interview statistics:', error);
            return {
                total: 0,
                scheduled: 0,
                completed: 0,
                pending: 0,
                cancelled: 0
            };
        }
    }

    /**
     * Schedule a new interview
     */
    async scheduleInterview(interviewData) {
        try {
            const response = await this.makeRequest('/interviews/schedule/', {
                method: 'POST',
                body: JSON.stringify(interviewData)
            });
            
            // Clear relevant caches
            this.clearCache('interviews');
            this.clearCache('interview_statistics');
            
            return response;
        } catch (error) {
            console.error('Failed to schedule interview:', error);
            throw error;
        }
    }

    /**
     * Update interview status
     */
    async updateInterviewStatus(interviewId, status, notes = '') {
        try {
            const response = await this.makeRequest(`/interviews/${interviewId}/status/`, {
                method: 'PATCH',
                body: JSON.stringify({ status, notes })
            });
            
            // Clear relevant caches
            this.clearCache('interviews');
            this.clearCache('interview_statistics');
            
            return response;
        } catch (error) {
            console.error('Failed to update interview status:', error);
            throw error;
        }
    }

    /**
     * Reschedule an interview
     */
    async rescheduleInterview(interviewId, newDateTime, reason = '') {
        try {
            const response = await this.makeRequest(`/interviews/${interviewId}/reschedule/`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    new_datetime: newDateTime,
                    reason: reason
                })
            });
            
            // Clear relevant caches
            this.clearCache('interviews');
            this.clearCache('interview_statistics');
            
            return response;
        } catch (error) {
            console.error('Failed to reschedule interview:', error);
            throw error;
        }
    }

    /**
     * Cancel an interview
     */
    async cancelInterview(interviewId, reason = '') {
        try {
            const response = await this.makeRequest(`/interviews/${interviewId}/cancel/`, {
                method: 'PATCH',
                body: JSON.stringify({ reason })
            });
            
            // Clear relevant caches
            this.clearCache('interviews');
            this.clearCache('interview_statistics');
            
            return response;
        } catch (error) {
            console.error('Failed to cancel interview:', error);
            throw error;
        }
    }

    /**
     * Add interview feedback
     */
    async addInterviewFeedback(interviewId, feedback) {
        try {
            const response = await this.makeRequest(`/interviews/${interviewId}/feedback/`, {
                method: 'POST',
                body: JSON.stringify(feedback)
            });
            
            // Clear relevant caches
            this.clearCache('interviews');
            
            return response;
        } catch (error) {
            console.error('Failed to add interview feedback:', error);
            throw error;
        }
    }

    /**
     * Export interviews data
     */
    async exportInterviews(format = 'csv', filters = {}) {
        try {
            const queryParams = new URLSearchParams({
                format,
                ...filters
            });
            
            const response = await this.makeRequest(`/interviews/export/?${queryParams}`);
            return response;
        } catch (error) {
            console.error('Failed to export interviews:', error);
            throw error;
        }
    }

    /**
     * Get available time slots for interviews
     */
    async getAvailableTimeSlots(date, duration = 60) {
        try {
            const response = await this.makeRequest(`/interviews/available-slots/?date=${date}&duration=${duration}`);
            return response.slots || [];
        } catch (error) {
            console.error('Failed to get available time slots:', error);
            return [];
        }
    }

    /**
     * Send interview reminder
     */
    async sendInterviewReminder(interviewId) {
        try {
            const response = await this.makeRequest(`/interviews/${interviewId}/reminder/`, {
                method: 'POST'
            });
            return response;
        } catch (error) {
            console.error('Failed to send interview reminder:', error);
            throw error;
        }
    }

    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            credentials: 'same-origin'
        };

        const requestOptions = { ...defaultOptions, ...options };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                
                console.warn(`Request attempt ${attempt} failed, retrying...`, error);
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    /**
     * Get CSRF token from cookie
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

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    clearCache(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Mock data for fallback
     */
    getMockInterviews() {
        return [
            {
                id: 1,
                candidate_name: 'John Doe',
                position: 'Software Engineering Intern',
                date: '2024-02-15',
                time: '10:00',
                status: 'scheduled',
                interviewer: 'Sarah Johnson',
                type: 'technical',
                duration: 60,
                location: 'Conference Room A',
                notes: 'Technical interview focusing on algorithms'
            },
            {
                id: 2,
                candidate_name: 'Jane Smith',
                position: 'Marketing Intern',
                date: '2024-02-16',
                time: '14:00',
                status: 'completed',
                interviewer: 'Mike Wilson',
                type: 'behavioral',
                duration: 45,
                location: 'Virtual - Zoom',
                notes: 'Behavioral interview completed successfully'
            },
            {
                id: 3,
                candidate_name: 'Alex Chen',
                position: 'Data Science Intern',
                date: '2024-02-17',
                time: '11:30',
                status: 'pending',
                interviewer: 'Dr. Emily Davis',
                type: 'technical',
                duration: 90,
                location: 'Lab 205',
                notes: 'Data analysis and machine learning focus'
            }
        ];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterviewsBackend;
}