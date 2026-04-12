/**
 * Error propagation utility
 * 
 * Standardized error handling to preserve ApiError status codes
 * throughout the service layer. Use this instead of wrapping errors
 * in generic Error() instances.
 */

import { ApiError } from './errors';

/**
 * Rethrow any error, preserving ApiError status codes for UI handling
 * This should be used in all service catch blocks instead of generic Error wrapping
 */
export function rethrowWithContext(error: unknown, _context?: string): never {
  // If it's already an ApiError, rethrow as-is to preserve status code
  if (error instanceof ApiError) {
    throw error;
  }

  // If it's any other error, rethrow it (don't convert to generic Error)
  throw error;
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extract meaningful message from error for logging/debugging
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `[${error.status}] ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
