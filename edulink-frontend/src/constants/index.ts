// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login/',
    REGISTER: '/api/auth/register/',
    LOGOUT: '/api/auth/logout/',
    REFRESH: '/api/auth/refresh/',
    VERIFY_EMAIL: '/api/auth/verify-email/',
    FORGOT_PASSWORD: '/api/auth/forgot-password/',
    RESET_PASSWORD: '/api/auth/reset-password/',
  },
  USERS: {
    PROFILE: '/api/users/profile/',
    UPDATE_PROFILE: '/api/users/update-profile/',
    CHANGE_PASSWORD: '/api/users/change-password/',
  },
  STUDENTS: {
    PROFILE: '/api/students/profile/',
    APPLICATIONS: '/api/students/applications/',
    INTERNSHIPS: '/api/students/internships/',
  },
  EMPLOYERS: {
    PROFILE: '/api/employers/profile/',
    INTERNSHIPS: '/api/employers/internships/',
    APPLICATIONS: '/api/employers/applications/',
  },
  INSTITUTIONS: {
    PROFILE: '/api/institutions/profile/',
    STUDENTS: '/api/institutions/students/',
    APPLICATIONS: '/api/institutions/applications/',
  },
  INTERNSHIPS: {
    LIST: '/api/internships/',
    DETAIL: '/api/internships/:id/',
    APPLY: '/api/internships/:id/apply/',
    SEARCH: '/api/internships/search/',
  },
  APPLICATIONS: {
    LIST: '/api/applications/',
    DETAIL: '/api/applications/:id/',
    UPDATE_STATUS: '/api/applications/:id/status/',
  },
  DASHBOARD: {
    STATS: '/api/dashboard/stats/',
    ACTIVITY: '/api/dashboard/activity/',
  },
};

// App Routes
export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
  OPPORTUNITIES: '/opportunities',
  SUPPORT: '/support',
  POLICY: '/policy',
  WHY_US: '/why-us',
  
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    VERIFY_EMAIL: '/verify-email/:token',
  },
  
  DASHBOARD: {
    STUDENT: '/dashboard/student',
    EMPLOYER: '/dashboard/employer',
    INSTITUTION: '/dashboard/institution',
    ADMIN: '/dashboard/admin',
  },
  
  STUDENT: {
    PROFILE: '/student/profile',
    APPLICATIONS: '/student/applications',
    INTERNSHIPS: '/student/internships',
    BROWSE: '/student/browse',
  },
  
  EMPLOYER: {
    PROFILE: '/dashboard/employer/profile',
    INTERNSHIPS: '/dashboard/employer/opportunities',
    APPLICATIONS: '/dashboard/employer/applications',
    POST_INTERNSHIP: '/dashboard/employer/post-internship',
  },
  
  INSTITUTION: {
    PROFILE: '/institution/profile',
    STUDENTS: '/institution/students',
    APPLICATIONS: '/institution/applications',
    DEPARTMENTS: '/institution/departments',
  },
};

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  EMPLOYER: 'employer',
  INSTITUTION: 'institution',
  ADMIN: 'admin',
} as const;

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

// Internship Duration Options
export const INTERNSHIP_DURATIONS = [
  { value: '1-month', label: '1 Month' },
  { value: '2-months', label: '2 Months' },
  { value: '3-months', label: '3 Months' },
  { value: '6-months', label: '6 Months' },
  { value: '1-year', label: '1 Year' },
];

// Company Size Options
export const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
];

// Institution Types
export const INSTITUTION_TYPES = [
  { value: 'university', label: 'University' },
  { value: 'college', label: 'College' },
  { value: 'technical-institute', label: 'Technical Institute' },
  { value: 'vocational-school', label: 'Vocational School' },
];

// Academic Years
export const ACADEMIC_YEARS = [
  { value: '1st-year', label: '1st Year' },
  { value: '2nd-year', label: '2nd Year' },
  { value: '3rd-year', label: '3rd Year' },
  { value: '4th-year', label: '4th Year' },
  { value: 'graduate', label: 'Graduate' },
];

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

// Toast Messages
export const TOAST_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  LOGIN_ERROR: 'Invalid email or password',
  REGISTER_SUCCESS: 'Account created successfully! Please check your email for verification.',
  REGISTER_ERROR: 'Registration failed. Please try again.',
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully!',
  PROFILE_UPDATE_ERROR: 'Failed to update profile',
  APPLICATION_SUBMIT_SUCCESS: 'Application submitted successfully!',
  APPLICATION_SUBMIT_ERROR: 'Failed to submit application',
  PASSWORD_RESET_SUCCESS: 'Password reset link sent to your email',
  PASSWORD_RESET_ERROR: 'Failed to send password reset link',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'Session expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
};

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  PASSWORD: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character',
  },
  PHONE: {
    pattern: /^\+?[\d\s\-()]+$/,
    message: 'Please enter a valid phone number',
  },
  URL: {
    pattern: /^https?:\/\/.+/,
    message: 'Please enter a valid URL',
  },
};

// Local Storage Keys
export const LOCAL_STORAGE_KEYS = {
  ACCESS_TOKEN: 'edulink_access_token',
  REFRESH_TOKEN: 'edulink_refresh_token',
  USER_DATA: 'edulink_user_data',
  THEME: 'edulink_theme',
  LANGUAGE: 'edulink_language',
  CART: 'edulink_cart',
  WISHLIST: 'edulink_wishlist',
};

// Session Storage Keys
export const SESSION_STORAGE_KEYS = {
  REDIRECT_URL: 'edulink_redirect_url',
  TEMP_DATA: 'edulink_temp_data',
};

// Cookie Names
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'edulink_access_token',
  REFRESH_TOKEN: 'edulink_refresh_token',
  CSRF_TOKEN: 'csrftoken',
  SESSION_ID: 'sessionid',
};

// Default Pagination
export const DEFAULT_PAGINATION = {
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// File Upload Limits
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Debounce Delays
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 500,
  RESIZE: 250,
  SCROLL: 100,
};

// Animation Durations
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
};

// Breakpoints (for responsive design)
export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 768,
  DESKTOP: 1024,
  LARGE_DESKTOP: 1280,
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  INPUT: 'YYYY-MM-DD',
  API: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'MMM DD, YYYY HH:mm',
};

// Currency
export const CURRENCY = {
  CODE: 'KES',
  SYMBOL: 'KSh',
  NAME: 'Kenyan Shilling',
};

// Countries (for location selection)
export const COUNTRIES = [
  { value: 'KE', label: 'Kenya' },
  { value: 'UG', label: 'Uganda' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'SS', label: 'South Sudan' },
];

// Languages
export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
];

// Theme Options
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

// Social Media Platforms
export const SOCIAL_MEDIA_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: 'facebook' },
  { value: 'twitter', label: 'Twitter', icon: 'twitter' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram' },
  { value: 'youtube', label: 'YouTube', icon: 'youtube' },
];

// Contact Methods
export const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Status Options
export const STATUS_OPTIONS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

// Sort Options
export const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'updated_at', label: 'Date Updated' },
  { value: 'title', label: 'Title' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

// Filter Options
export const FILTER_OPTIONS = {
  DATE_RANGE: [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
  ],
  STATUS: [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ],
  PRIORITY: [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ],
};

// Export all constants
export default {
  API_ENDPOINTS,
  ROUTES,
  USER_ROLES,
  APPLICATION_STATUS,
  INTERNSHIP_DURATIONS,
  COMPANY_SIZES,
  INSTITUTION_TYPES,
  ACADEMIC_YEARS,
  GENDER_OPTIONS,
  TOAST_MESSAGES,
  VALIDATION_RULES,
  LOCAL_STORAGE_KEYS,
  SESSION_STORAGE_KEYS,
  COOKIE_NAMES,
  DEFAULT_PAGINATION,
  FILE_UPLOAD_LIMITS,
  DEBOUNCE_DELAYS,
  ANIMATION_DURATIONS,
  BREAKPOINTS,
  DATE_FORMATS,
  CURRENCY,
  COUNTRIES,
  LANGUAGES,
  THEME_OPTIONS,
  SOCIAL_MEDIA_PLATFORMS,
  CONTACT_METHODS,
  NOTIFICATION_TYPES,
  PRIORITY_LEVELS,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  FILTER_OPTIONS,
};