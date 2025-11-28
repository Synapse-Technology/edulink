// Application Configuration
export const config = {
  // API Configuration
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Application Configuration
  app: {
    name: 'EduLink KE',
    version: '1.0.0',
    description: 'Connecting students with internship opportunities',
    author: 'EduLink Team',
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    supportEmail: 'support@edulink.co.ke',
  },

  // Authentication Configuration
  auth: {
    tokenKey: 'edulink_access_token',
    refreshTokenKey: 'edulink_refresh_token',
    userKey: 'edulink_user',
    tokenExpiryBuffer: 5 * 60 * 1000, // 5 minutes
    rememberMeDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    maxRetries: 3,
  },

  // Pagination Configuration
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
    maxPageSize: 100,
  },

  // Cache Configuration
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    userProfileTTL: 60 * 60 * 1000, // 1 hour
    dashboardStatsTTL: 10 * 60 * 1000, // 10 minutes
    internshipListTTL: 15 * 60 * 1000, // 15 minutes
  },

  // Search Configuration
  search: {
    debounceDelay: 300, // 300ms
    minSearchLength: 2,
    maxResults: 50,
  },

  // Form Configuration
  form: {
    autoSaveDelay: 2000, // 2 seconds
    validationDelay: 500, // 500ms
    maxFileUploads: 5,
  },

  // Theme Configuration
  theme: {
    default: 'light',
    storageKey: 'edulink_theme',
  },

  // Language Configuration
  language: {
    default: 'en',
    supported: ['en', 'sw'],
    storageKey: 'edulink_language',
  },

  // Date/Time Configuration
  dateTime: {
    timezone: 'Africa/Nairobi',
    format: {
      date: 'MMM DD, YYYY',
      time: 'HH:mm',
      datetime: 'MMM DD, YYYY HH:mm',
    },
  },

  // Currency Configuration
  currency: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    decimalPlaces: 2,
  },

  // Map Configuration
  map: {
    defaultCenter: { lat: -1.2921, lng: 36.8219 }, // Nairobi
    defaultZoom: 10,
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  },

  // Social Media Configuration
  social: {
    facebook: 'https://facebook.com/edulinkke',
    twitter: 'https://twitter.com/edulinkke',
    linkedin: 'https://linkedin.com/company/edulinkke',
    instagram: 'https://instagram.com/edulinkke',
    youtube: 'https://youtube.com/edulinkke',
  },

  // Analytics Configuration
  analytics: {
    googleAnalyticsId: import.meta.env.VITE_GA_ID,
    hotjarId: import.meta.env.VITE_HOTJAR_ID,
  },

  // Security Configuration
  security: {
    enableCSRF: true,
    enableRateLimiting: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 8,
    passwordComplexity: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  },

  // Network Configuration
  network: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    enableOfflineSupport: true,
  },

  // Notification Configuration
  notification: {
    position: 'top-right',
    duration: 5000, // 5 seconds
    maxNotifications: 3,
  },

  // Error Handling Configuration
  errorHandling: {
    enableErrorBoundary: true,
    enableLogging: true,
    maxRetries: 3,
    showDetailedErrors: import.meta.env.DEV,
  },

  // Performance Configuration
  performance: {
    enableCodeSplitting: true,
    enableLazyLoading: true,
    enableImageOptimization: true,
    enableCaching: true,
    enableCompression: true,
  },

  // Accessibility Configuration
  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    enableHighContrastMode: true,
    enableFontSizeAdjustment: true,
  },

  // Development Configuration
  development: {
    enableReduxDevTools: import.meta.env.DEV,
    enableReactDevTools: import.meta.env.DEV,
    enableMockAPI: import.meta.env.VITE_ENABLE_MOCK_API === 'true',
    mockAPIDelay: 500, // 500ms
  },
} as const;

// Environment-specific configurations
export const getConfig = () => {
  const environment = import.meta.env.MODE;
  
  switch (environment) {
    case 'development':
      return {
        ...config,
        api: {
          ...config.api,
          baseURL: 'http://localhost:8000',
        },
        app: {
          ...config.app,
          url: 'http://localhost:5173',
        },
        development: {
          ...config.development,
          enableMockAPI: true,
        },
      };
    
    case 'staging':
      return {
        ...config,
        api: {
          ...config.api,
          baseURL: 'https://staging-api.edulink.co.ke',
        },
        app: {
          ...config.app,
          url: 'https://staging.edulink.co.ke',
        },
      };
    
    case 'production':
      return {
        ...config,
        api: {
          ...config.api,
          baseURL: 'https://api.edulink.co.ke',
        },
        app: {
          ...config.app,
          url: 'https://edulink.co.ke',
        },
        security: {
          ...config.security,
          showDetailedErrors: false,
        },
        errorHandling: {
          ...config.errorHandling,
          showDetailedErrors: false,
        },
      };
    
    default:
      return config;
  }
};

export default config;