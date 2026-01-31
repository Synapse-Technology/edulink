export class ApiError extends Error {
  public status?: number;
  public data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ApiError {
  public fieldErrors?: Record<string, string[]>;

  constructor(message: string, data?: any) {
    super(message, 400, data);
    this.name = 'ValidationError';
    
    if (data && typeof data === 'object') {
      this.fieldErrors = {};
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          this.fieldErrors![key] = value;
        }
      });
    }
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
    this.name = 'ServerError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timeout') {
    super(message, 408);
    this.name = 'TimeoutError';
  }
}

// Error handler utility
export const handleError = (error: any): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || data?.error || data?.detail || 'An error occurred';

    switch (status) {
      case 400:
        return new ValidationError(message, data);
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 404:
        return new NotFoundError(message);
      case 408:
        return new TimeoutError(message);
      case 429:
        return new RateLimitError(message);
      case 500:
        return new ServerError(message);
      default:
        return new ApiError(message, status, data);
    }
  }

  if (error.request) {
    return new NetworkError('Network error. Please check your connection.');
  }

  return new ApiError(error.message || 'An unexpected error occurred');
};

// Error message formatter
export const formatErrorMessage = (error: ApiError): string => {
  if (error instanceof ValidationError && error.fieldErrors) {
    const fieldMessages = Object.entries(error.fieldErrors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ');
    return `${error.message} - ${fieldMessages}`;
  }

  return error.message;
};

// Error logger
export const logError = (error: ApiError, context?: string): void => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    status: error.status,
    data: error.data,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  if (import.meta.env.DEV) {
    console.error('API Error:', errorInfo);
  }

  // In production, you might want to send this to a logging service
  if (import.meta.env.PROD && config.errorHandling.enableLogging) {
    // Send to logging service (e.g., Sentry, LogRocket, etc.)
    // logToService(errorInfo);
  }
};

// Configuration for error handling
const config = {
  errorHandling: {
    enableLogging: true,
    maxRetries: 3,
    showDetailedErrors: import.meta.env.DEV,
  },
};

export default {
  handleError,
  formatErrorMessage,
  logError,
};