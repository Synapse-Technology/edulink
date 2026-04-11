import { ApiError } from '../services/errors';

/**
 * Error Context for better error message generation
 */
export interface ErrorContext {
  action: string;
  context?: string;
  data?: any;
}

/**
 * Maps API errors to user-friendly messages
 * Single source of truth for error messaging across the app
 */
export const getErrorMessage = (error: any, context: ErrorContext): string => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return `Invalid input for ${context.action}. Please check your data and try again.`;
      case 401:
        return 'Your session has expired. Please log in again to continue.';
      case 403:
        return `You don't have permission to ${context.action.toLowerCase()}. Please contact your supervisor.`;
      case 404:
        return `The resource for ${context.action.toLowerCase()} was not found. Please refresh and try again.`;
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Server error occurred. Our team has been notified. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again in a few minutes.';
      default:
        return error.message || `Failed to ${context.action.toLowerCase()}. Please try again.`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return `An unexpected error occurred while ${context.action.toLowerCase()}.`;
};

/**
 * Logs errors for debugging and monitoring
 * Can be extended to send to error tracking service (Sentry, etc.)
 */
export const logError = (error: any, context: ErrorContext) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    action: context.action,
    context: context.context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };

  console.error(`[${context.action}]`, errorDetails);

  // TODO: Send to error tracking service if configured
  // Sentry.captureException(error, { extra: errorDetails });
};
