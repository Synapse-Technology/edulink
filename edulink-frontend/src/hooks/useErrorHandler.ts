/**
 * Custom React hook for comprehensive error handling
 * Provides status-code-specific error handling, retry logic, and UI messaging
 */

import { useCallback, useRef } from 'react';
import type { ParsedErrorResponse } from '../services/errorHandling';
import {
  parseErrorResponse,
  isErrorRetryable,
  isConflictError,
  isAuthError,
  isValidationError,
  isNotFoundError,
} from '../services/errorHandling';

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: ParsedErrorResponse, attempt: number) => boolean;
}

interface ErrorHandlerOptions {
  onConflict?: (error: ParsedErrorResponse) => Promise<void>; // 409 - refresh and retry
  onAuthError?: (error: ParsedErrorResponse) => void; // 401/403
  onValidationError?: (error: ParsedErrorResponse) => void; // 400
  onNotFound?: (error: ParsedErrorResponse) => void; // 404
  onUnexpected?: (error: ParsedErrorResponse) => void; // 5xx
  onRetryExhausted?: (error: ParsedErrorResponse) => void;
  retryConfig?: Partial<RetryConfig>;
}

interface UseErrorHandlerResult {
  parsedError: ParsedErrorResponse | null;
  isRetrying: boolean;
  retryAttempt: number;
  handleError: (error: any) => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
};

/**
 * Hook for comprehensive error handling with status-code-specific callbacks
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}): UseErrorHandlerResult {
  const parsedErrorRef = useRef<ParsedErrorResponse | null>(null);
  const isRetryingRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const retryCallbackRef = useRef<(() => Promise<void>) | null>(null);

  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };

  const clearError = useCallback(() => {
    parsedErrorRef.current = null;
    retryAttemptRef.current = 0;
    isRetryingRef.current = false;
  }, []);

  const handleError = useCallback(
    async (error: any): Promise<void> => {
      const parsed = parseErrorResponse(error);
      parsedErrorRef.current = parsed;

      // Handle specific error types
      if (isAuthError(parsed.statusCode, parsed.errorCode)) {
        options.onAuthError?.(parsed);
        return;
      }

      if (isValidationError(parsed.statusCode, parsed.errorCode)) {
        options.onValidationError?.(parsed);
        return;
      }

      if (isNotFoundError(parsed.statusCode, parsed.errorCode)) {
        options.onNotFound?.(parsed);
        return;
      }

      if (isConflictError(parsed.statusCode, parsed.errorCode)) {
        // 409: attempt to refresh state and retry
        try {
          await options.onConflict?.(parsed);
        } catch (conflictError) {
          console.error('Conflict resolution failed:', conflictError);
          options.onUnexpected?.(parsed);
        }
        return;
      }

      // Check if retryable
      if (parsed.isRetryable && isErrorRetryable(parsed.statusCode, parsed.errorCode)) {
        options.onUnexpected?.(parsed);
        return;
      }

      // Unexpected error
      options.onUnexpected?.(parsed);
    },
    [options]
  );

  const retry = useCallback(async () => {
    if (!retryCallbackRef.current) {
      console.warn('No retry callback set. Use the retry parameter in handleError.');
      return;
    }

    if (retryAttemptRef.current >= retryConfig.maxAttempts) {
      isRetryingRef.current = false;
      options.onRetryExhausted?.(parsedErrorRef.current!);
      return;
    }

    isRetryingRef.current = true;
    const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, retryAttemptRef.current);

    await new Promise(resolve => setTimeout(resolve, delay));

    retryAttemptRef.current++;

    try {
      await retryCallbackRef.current();
      clearError();
      isRetryingRef.current = false;
    } catch (retryError) {
      await handleError(retryError);
    }
  }, [retryConfig, handleError, clearError, options]);

  return {
    parsedError: parsedErrorRef.current,
    isRetrying: isRetryingRef.current,
    retryAttempt: retryAttemptRef.current,
    handleError,
    clearError,
    retry,
  };
}

/**
 * Specialized hook for form/input handling with field-level error display
 */
export function useFormErrorHandler(options?: ErrorHandlerOptions) {
  const errorHandler = useErrorHandler(options);

  return {
    ...errorHandler,
    getFieldError: (fieldName: string): string | undefined => {
      if (!errorHandler.parsedError?.fieldValidations) return undefined;
      const fieldError = errorHandler.parsedError.fieldValidations.find(
        v => v.field === fieldName
      );
      return fieldError?.errors[0]; // Return first error for field
    },
    getAllFieldErrors: () => errorHandler.parsedError?.fieldValidations || [],
  };
}

/**
 * Specialized hook for conflict resolution with automatic retry
 * Useful for handling optimistic updates that conflict with server state
 */
export function useConflictResolution(onRefresh: () => Promise<void>) {
  const parsedErrorRef = useRef<ParsedErrorResponse | null>(null);
  const isResolvingRef = useRef(false);

  const resolveConflict = useCallback(
    async (error: any): Promise<void> => {
      const parsed = parseErrorResponse(error);
      parsedErrorRef.current = parsed;

      if (!isConflictError(parsed.statusCode, parsed.errorCode)) {
        throw new Error('Not a conflict error');
      }

      isResolvingRef.current = true;
      try {
        // Refresh state from server
        await onRefresh();
      } finally {
        isResolvingRef.current = false;
      }
    },
    [onRefresh]
  );

  return {
    isResolving: isResolvingRef.current,
    parsedError: parsedErrorRef.current,
    resolveConflict,
  };
}
