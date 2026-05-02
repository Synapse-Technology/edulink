/**
 * Admin Error Sanitizer - Ensures all admin/institution errors are safe for display
 * Sanitizes technical details and provides user-friendly fallbacks
 */

import { ApiError, formatErrorMessage } from '../services/errors';
import { getUserFacingErrorMessage } from './userFacingErrors';

export interface SanitizedError {
  title: string;
  message: string;
  details?: string;
  userMessage: string;
  isTechnicalError: boolean;
}

/**
 * Sanitize error for admin display
 * Removes technical details and provides fallback messages
 */
export const sanitizeAdminError = (error: unknown): SanitizedError => {
  let title = 'An Error Occurred';
  let message = 'We encountered an unexpected error.';
  let details = '';
  let isTechnicalError = false;

  if (error instanceof ApiError) {
    title = getErrorTitle(error.status);
    message = formatErrorMessage(error);
    isTechnicalError = error.status ? error.status >= 500 : false;

    // Extract safe details if available
    if (error.data?.detail && typeof error.data.detail === 'string') {
      // Only include safe details, not raw error traces
      if (!containsTechnicalInfo(error.data.detail)) {
        details = error.data.detail;
      }
    }
  } else if (error instanceof Error) {
    // Sanitize regular Error objects
    message = getUserFacingErrorMessage(error.message, undefined);
    isTechnicalError = containsTechnicalInfo(error.message);
  } else if (typeof error === 'string') {
    message = getUserFacingErrorMessage(error, undefined);
    isTechnicalError = containsTechnicalInfo(error);
  }

  return {
    title,
    message,
    details: details || undefined,
    userMessage: message,
    isTechnicalError,
  };
};

/**
 * Get context-specific error title based on HTTP status code
 */
const getErrorTitle = (status?: number): string => {
  switch (status) {
    case 400:
      return 'Invalid Request';
    case 401:
      return 'Authentication Required';
    case 403:
      return 'Access Denied';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation Error';
    case 429:
      return 'Too Many Requests';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server Error';
    default:
      return 'An Error Occurred';
  }
};

/**
 * Check if error contains technical information
 */
const containsTechnicalInfo = (message: string): boolean => {
  const technicalPatterns = [
    /\btraceback\b/i,
    /\bstack\b/i,
    /\boperationalerror\b/i,
    /\bdatabaseerror\b/i,
    /\bintegrityerror\b/i,
    /\bprogrammingerror\b/i,
    /\btypeerror\b/i,
    /\bvalueerror\b/i,
    /\breferenceerror\b/i,
    /\bsyntaxerror\b/i,
    /\bhttperror\b/i,
    /\baxioserror\b/i,
    /\berrno\b/i,
    /\bpsycopg\b/i,
    /\bdjango\b/i,
    /\bsql\b/i,
    /\.py\b/i,
    /\.tsx?\b/i,
    /\.jsx?\b/i,
    /at .+\(.+:\d+:\d+\)/i,
    /\/home\/|\/usr\/|\/var\//i,
  ];

  return technicalPatterns.some(pattern => pattern.test(message));
};

/**
 * Safely extract field errors from API error
 * Used for form validation error display
 */
export const extractFieldErrors = (error: ApiError): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};

  if (error.data && typeof error.data === 'object') {
    Object.entries(error.data).forEach(([field, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        // Take first error message for the field
        const message = value[0];
        if (typeof message === 'string' && !containsTechnicalInfo(message)) {
          fieldErrors[field] = getUserFacingErrorMessage(message, error.status);
        } else {
          fieldErrors[field] = getFieldErrorFallback(field);
        }
      }
    });
  }

  return fieldErrors;
};

/**
 * Get fallback message for specific field
 */
const getFieldErrorFallback = (field: string): string => {
  const fallbacks: Record<string, string> = {
    email: 'Please enter a valid email address',
    password: 'Password must be at least 8 characters',
    first_name: 'First name is required',
    firstName: 'First name is required',
    last_name: 'Last name is required',
    lastName: 'Last name is required',
    phone: 'Please enter a valid phone number',
    phone_number: 'Please enter a valid phone number',
    phoneNumber: 'Please enter a valid phone number',
    name: 'Please enter a valid name',
    title: 'Please enter a valid title',
    description: 'Please provide a description',
    url: 'Please enter a valid URL',
    website_url: 'Please enter a valid website URL',
  };

  return fallbacks[field] || `Please check this field and try again`;
};

/**
 * Log error for debugging (dev environment only)
 */
export const logAdminError = (error: SanitizedError, context?: string): void => {
  if (import.meta.env.DEV) {
    console.error(`[Admin Error${context ? ` - ${context}` : ''}]`, {
      title: error.title,
      message: error.message,
      details: error.details,
      isTechnical: error.isTechnicalError,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create toast-friendly error message
 */
export const getToastErrorMessage = (error: SanitizedError): string => {
  if (error.details) {
    return `${error.message}: ${error.details}`;
  }
  return error.message;
};
