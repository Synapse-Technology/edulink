/**
 * Frontend error types matching EduLink backend error response format
 * Backend format: {error_code, message, status_code, timestamp, context}
 */

export interface BackendErrorResponse {
  error_code: string;
  message: string;
  status_code: number;
  timestamp: string;
  context?: Record<string, any>;
}

export interface ErrorFieldValidation {
  field: string;
  errors: string[];
}

export type ErrorCode = 
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR'
  | string;

export interface StatusCodeToMessageMap {
  [key: number]: {
    title: string;
    defaultMessage: string;
    userMessage: string;
  };
}

/**
 * Centralized status code to user message mapping
 * Ensures consistent error messaging across all login/auth flows
 */
export const STATUS_CODE_MESSAGE_MAP: StatusCodeToMessageMap = {
  400: {
    title: 'Invalid Request',
    defaultMessage: 'The request contains invalid data. Please check your input.',
    userMessage: 'Please correct the highlighted fields and try again.'
  },
  401: {
    title: 'Authentication Failed',
    defaultMessage: 'Your session has expired or credentials are invalid.',
    userMessage: 'Please log in again to continue.'
  },
  403: {
    title: 'Access Denied',
    defaultMessage: 'You do not have permission to perform this action.',
    userMessage: 'You lack sufficient permissions. Contact support if you believe this is an error.'
  },
  404: {
    title: 'Not Found',
    defaultMessage: 'The requested resource was not found.',
    userMessage: 'This resource no longer exists or has been moved.'
  },
  409: {
    title: 'Conflict',
    defaultMessage: 'The request conflicts with existing data (e.g., duplicate entry).',
    userMessage: 'This action conflicts with existing data. Please refresh and try again.'
  },
  500: {
    title: 'Server Error',
    defaultMessage: 'An error occurred on the server.',
    userMessage: 'We\'re experiencing technical difficulties. Please try again later.'
  },
  503: {
    title: 'Service Unavailable',
    defaultMessage: 'The service is temporarily unavailable.',
    userMessage: 'Our service is temporarily down. Please try again shortly.'
  }
};

/**
 * Get user-friendly message for status code
 */
export function getUserMessageForStatus(status: number, defaultMessage?: string): string {
  const mapping = STATUS_CODE_MESSAGE_MAP[status];
  return defaultMessage || mapping?.userMessage || 'An unexpected error occurred.';
}

/**
 * Get error title for status code
 */
export function getTitleForStatus(status: number): string {
  return STATUS_CODE_MESSAGE_MAP[status]?.title || 'Error';
}
