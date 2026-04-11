/**
 * Enhanced login error handler hook
 * Integrates new error parsing with portal-specific messaging
 */

import { useCallback } from 'react';
import { useErrorHandler as useBaseErrorHandler } from './useErrorHandler';
import { getLoginErrorMessage } from '../utils/loginErrorMessage';
import type { ApiError } from '../services/errors';

type LoginPortal = 'student' | 'employer' | 'institution' | 'admin';

interface UseLoginErrorHandlerOptions {
  portal?: LoginPortal;
  onAuthFailure?: (error: ApiError) => void;
}

/**
 * Hook specifically for login forms with portal-specific error messages
 */
export function useLoginErrorHandler(options: UseLoginErrorHandlerOptions = {}) {
  const { portal = 'student', onAuthFailure } = options;

  const baseErrorHandler = useBaseErrorHandler({
    onValidationError: (error) => {
      console.warn(`[${portal}] Validation error:`, error.fieldValidations);
    },
    onAuthError: (error) => {
      console.warn(`[${portal}] Auth error (${error.statusCode}):`, error.message);
      onAuthFailure?.(error as any);
    },
    onUnexpected: (error) => {
      console.error(`[${portal}] Unexpected error (${error.statusCode}):`, error.message);
    },
  });

  // Wrapper that adds portal-specific messaging
  const handleLoginError = useCallback(
    async (error: any): Promise<string> => {
      await baseErrorHandler.handleError(error);
      // Return portal-specific message for display
      return getLoginErrorMessage(error, { portal });
    },
    [baseErrorHandler, portal]
  );

  return {
    ...baseErrorHandler,
    handleLoginError, // Returns user-friendly message for portal
  };
}

/**
 * Hook for registration forms with field validation
 */
export function useRegisterErrorHandler() {
  const formErrorHandler = useBaseErrorHandler({
    onValidationError: (error) => {
      console.warn('Registration validation errors:', error.fieldValidations);
    },
    onAuthError: (error) => {
      console.error('Registration auth error:', error.message);
    },
    onUnexpected: (error) => {
      console.error('Registration error:', error.message);
    },
  });

  const getRegisterFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return formErrorHandler.parsedError?.fieldValidations?.find(
        (v) => v.field === fieldName
      )?.errors[0];
    },
    [formErrorHandler.parsedError]
  );

  const getAllFieldErrors = useCallback(() => {
    return formErrorHandler.parsedError?.fieldValidations || [];
  }, [formErrorHandler.parsedError]);

  return {
    ...formErrorHandler,
    getRegisterFieldError,
    getAllFieldErrors,
  };
}
