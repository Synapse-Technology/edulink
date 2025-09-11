// API Configuration for separate deployment
const API_CONFIG = {
    BASE_URL: 'https://edulink-api-n422.onrender.com',
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/login/',
            REGISTER: '/api/auth/register/',
            PASSWORD_RESET: '/api/auth/password-reset/'
        },
        USERS: {
            STUDENT_PROFILE: '/api/users/student-profile/'
        },
        INSTITUTIONS: {
            VALIDATE_CODE: '/api/institutions/validate-code/',
            GENERATE_CODE: '/api/institutions/generate-code/',
            DASHBOARD_STATS: '/api/institutions/dashboard/stats/'
        },
        APPLICATIONS: {
            MY_APPLICATIONS: '/api/applications/my-applications/',
            APPLY: '/api/applications/apply/'
        },
        APPLICATION: {
            MY_APPLICATIONS: '/api/applications/my-applications/'
        },
        INTERNSHIPS: {
            LIST: '/api/internships/'
        },
        INTERNSHIP_PROGRESS: {
            LOGBOOK: '/api/internship-progress/logbook/',
            PROGRESS: '/api/internship-progress/progress/'
        },
        DASHBOARDS: {
            STUDENT: '/api/dashboards/student/',
            PROGRESS: '/api/dashboards/progress/',
            ANALYTICS: '/api/dashboards/analytics/',
            ACHIEVEMENTS: '/api/dashboards/achievements/',
            CALENDAR_EVENTS: '/api/dashboards/calendar-events/',
            CALENDAR_EVENTS_UPCOMING: '/api/dashboards/calendar-events/upcoming/'
        },
        MONITORING: {
            HEALTH: '/api/monitoring/health/',
            METRICS: '/api/monitoring/metrics/'
        },
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
