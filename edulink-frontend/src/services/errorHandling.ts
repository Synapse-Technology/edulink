/**
 * Frontend error handling service
 * Processes backend error responses and provides status-code-specific utilities
 */

import type {
  BackendErrorResponse,
  ErrorFieldValidation,
} from '../types/errors';
import {
  getUserMessageForStatus,
  getTitleForStatus,
  STATUS_CODE_MESSAGE_MAP,
} from '../types/errors';
import { ApiError } from './errors';

export interface ParsedErrorResponse {
  errorCode: string;
  message: string;
  statusCode: number;
  title: string;
  userMessage: string;
  timestamp: string;
  context?: Record<string, any>;
  fieldValidations?: ErrorFieldValidation[];
  isRetryable: boolean;
  suggestedAction?: string;
}

/**
 * Parse backend error response into structured format
 */
export function parseErrorResponse(error: any): ParsedErrorResponse {
  // Handle backend JSON format: {error_code, message, status_code, timestamp, context}
  if (error && typeof error === 'object' && 'error_code' in error) {
    const backendError = error as Partial<BackendErrorResponse>;
    return {
      errorCode: backendError.error_code || 'UNKNOWN',
      message: backendError.message || 'Unknown error',
      statusCode: backendError.status_code || 500,
      title: getTitleForStatus(backendError.status_code || 500),
      userMessage: getUserMessageForStatus(backendError.status_code || 500, backendError.message),
      timestamp: backendError.timestamp || new Date().toISOString(),
      context: backendError.context,
      isRetryable: isErrorRetryable(backendError.status_code || 500, backendError.error_code),
      suggestedAction: getSuggestedAction(backendError.status_code || 500, backendError.error_code),
      fieldValidations: extractFieldValidations(backendError.context),
    };
  }

  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      errorCode: getErrorCodeFromApiError(error),
      message: error.message || 'An error occurred',
      statusCode: error.status || 500,
      title: getTitleForStatus(error.status || 500),
      userMessage: getUserMessageForStatus(error.status || 500, error.message),
      timestamp: new Date().toISOString(),
      context: error.data,
      isRetryable: isErrorRetryable(error.status || 500),
      suggestedAction: getSuggestedAction(error.status || 500),
      fieldValidations: extractFieldValidationsFromData(error.data),
    };
  }

  // Handle generic errors
  return {
    errorCode: 'NETWORK_ERROR',
    message: error?.message || 'An unexpected error occurred',
    statusCode: 500,
    title: 'Error',
    userMessage: 'We encountered an unexpected error. Please try again.',
    timestamp: new Date().toISOString(),
    isRetryable: true,
    suggestedAction: 'Try again',
  };
}

/**
 * Determine if error is retryable (5xx, 429, connection errors)
 */
export function isErrorRetryable(statusCode: number, errorCode?: string): boolean {
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  const retryableErrorCodes = ['TIMEOUT', 'RATE_LIMIT'];

  return (
    retryableStatuses.includes(statusCode) ||
    (!!errorCode && retryableErrorCodes.includes(errorCode))
  );
}

/**
 * Get suggested action based on error type
 */
export function getSuggestedAction(statusCode: number, _errorCode?: string): string {
  switch (statusCode) {
    case 400:
      return 'Please check your input and try again.';
    case 401:
      return 'Please log in again.';
    case 403:
      return 'Contact support if you need access.';
    case 404:
      return 'The resource no longer exists. Please refresh.';
    case 409:
      return 'Refresh the page and try again.';
    case 429:
      return 'You are making too many requests. Please wait a moment.';
    case 500:
    case 503:
      return 'Please try again in a few moments.';
    default:
      return 'Please try again.';
  }
}

/**
 * Extract error code from ApiError instance
 */
function getErrorCodeFromApiError(error: ApiError): string {
  if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
  if (error.name === 'AuthenticationError') return 'AUTHENTICATION_ERROR';
  if (error.name === 'AuthorizationError') return 'AUTHORIZATION_ERROR';
  if (error.name === 'NetworkError') return 'NETWORK_ERROR';
  return 'UNKNOWN';
}

/**
 * Extract field-level validation errors from context
 */
function extractFieldValidations(context?: Record<string, any>): ErrorFieldValidation[] {
  if (!context) return [];

  return Object.entries(context)
    .filter(([_key, value]) => {
      return Array.isArray(value) || (typeof value === 'object' && value !== null && 'errors' in value);
    })
    .map(([field, value]) => ({
      field,
      errors: Array.isArray(value) ? value : (value as any).errors || [],
    }))
    .filter(v => v.errors.length > 0);
}

/**
 * Extract validation errors from ApiError data
 */
function extractFieldValidationsFromData(data?: any): ErrorFieldValidation[] {
  if (!data) return [];

  if (data.fieldErrors && typeof data.fieldErrors === 'object') {
    return Object.entries(data.fieldErrors)
      .map(([field, errors]) => ({
        field,
        errors: Array.isArray(errors) ? errors : [String(errors)],
      }))
      .filter(v => v.errors.length > 0);
  }

  return [];
}

/**
 * Determine if error is a conflict that needs retry with refresh
 * Common for 409 Conflict scenarios
 */
export function isConflictError(statusCode: number, _errorCode?: string): boolean {
  return statusCode === 409 || _errorCode === 'CONFLICT_ERROR';
}

/**
 * Determine if error is authorization-related
 */
export function isAuthError(statusCode: number, errorCode?: string): boolean {
  return [401, 403].includes(statusCode) || 
         ['AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR'].includes(errorCode || '');
}

/**
 * Determine if error is validation-related
 */
export function isValidationError(statusCode: number, errorCode?: string): boolean {
  return statusCode === 400 || errorCode === 'VALIDATION_ERROR';
}

/**
 * Determine if error is a not-found error
 */
export function isNotFoundError(statusCode: number, errorCode?: string): boolean {
  return statusCode === 404 || errorCode === 'NOT_FOUND';
}
