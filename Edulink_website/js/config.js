// API Configuration for separate deployment
const API_CONFIG = {
    BASE_URL: 'https://edulink-api.onrender.com',
    ENDPOINTS: {
        AUTH: '/api/auth/',
        USERS: '/api/users/',
        COURSES: '/api/courses/',
        ASSIGNMENTS: '/api/assignments/',
        SUBMISSIONS: '/api/submissions/',
        NOTIFICATIONS: '/api/notifications/'
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}
