/**
 * Tests for frontend error handling service
 * Validates parsing of backend error responses and status-code-specific utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseErrorResponse,
  isErrorRetryable,
  isConflictError,
  isAuthError,
  isValidationError,
  isNotFoundError,
  getSuggestedAction,
} from '../errorHandling';
import { ValidationError } from '../errors';

describe('Frontend Error Handling', () => {
  describe('parseErrorResponse', () => {
    it('should parse backend JSON error response format', () => {
      const backendError = {
        error_code: 'VALIDATION_ERROR',
        message: 'Email is required',
        status_code: 400,
        timestamp: '2026-04-11T13:58:41Z',
        context: { email: ['This field is required.'] },
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.errorCode).toBe('VALIDATION_ERROR');
      expect(parsed.message).toBe('Email is required');
      expect(parsed.statusCode).toBe(400);
      expect(parsed.title).toBe('Invalid Request');
      expect(parsed.isRetryable).toBe(false);
      expect(parsed.fieldValidations).toHaveLength(1);
      expect(parsed.fieldValidations?.[0]?.field).toBe('email');
    });

    it('should handle 404 NOT_FOUND errors', () => {
      const backendError = {
        error_code: 'NOT_FOUND',
        message: 'User not found',
        status_code: 404,
        timestamp: '2026-04-11T13:58:41Z',
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.errorCode).toBe('NOT_FOUND');
      expect(parsed.statusCode).toBe(404);
      expect(parsed.title).toBe('Not Found');
      expect(parsed.isRetryable).toBe(false);
    });

    it('should handle 409 CONFLICT_ERROR with retry capability', () => {
      const backendError = {
        error_code: 'CONFLICT_ERROR',
        message: 'This state is invalid',
        status_code: 409,
        timestamp: '2026-04-11T13:58:41Z',
        context: { resource_id: '123' },
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.errorCode).toBe('CONFLICT_ERROR');
      expect(parsed.statusCode).toBe(409);
      expect(parsed.isRetryable).toBe(false); // 409 is not auto-retryable
      expect(parsed.suggestedAction).toContain('refresh');
    });

    it('should handle AUTHORIZATION_ERROR 403', () => {
      const backendError = {
        error_code: 'AUTHORIZATION_ERROR',
        message: 'You lack permission',
        status_code: 403,
        timestamp: '2026-04-11T13:58:41Z',
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.errorCode).toBe('AUTHORIZATION_ERROR');
      expect(parsed.statusCode).toBe(403);
      expect(parsed.title).toBe('Access Denied');
    });

    it('should parse ApiError instances', () => {
      const apiError = new ValidationError('Email already exists', { email: ['This email is already registered.'] });

      const parsed = parseErrorResponse(apiError);

      expect(parsed.errorCode).toBe('VALIDATION_ERROR');
      expect(parsed.title).toBe('Invalid Request');
      expect(parsed.fieldValidations).toBeDefined();
    });

    it('should handle 5xx server errors as retryable', () => {
      const backendError = {
        error_code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status_code: 500,
        timestamp: '2026-04-11T13:58:41Z',
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.statusCode).toBe(500);
      expect(parsed.isRetryable).toBe(true);
      expect(parsed.suggestedAction).toContain('try again');
    });

    it('should include field validations in parsed response', () => {
      const backendError = {
        error_code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        status_code: 400,
        timestamp: '2026-04-11T13:58:41Z',
        context: {
          email: ['Email is required.', 'Email must be valid.'],
          password: ['Password must be at least 8 characters.'],
        },
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.fieldValidations).toHaveLength(2);
      expect(parsed.fieldValidations?.[0]?.errors).toHaveLength(2);
    });
  });

  describe('Error classification utilities', () => {
    it('should identify retryable errors', () => {
      expect(isErrorRetryable(500)).toBe(true);
      expect(isErrorRetryable(503)).toBe(true);
      expect(isErrorRetryable(400)).toBe(false);
      expect(isErrorRetryable(500, 'TIMEOUT')).toBe(true);
    });

    it('should identify conflict errors', () => {
      expect(isConflictError(409)).toBe(true);
      expect(isConflictError(400)).toBe(false);
      expect(isConflictError(400, 'CONFLICT_ERROR')).toBe(true);
    });

    it('should identify auth errors', () => {
      expect(isAuthError(401)).toBe(true);
      expect(isAuthError(403)).toBe(true);
      expect(isAuthError(400)).toBe(false);
      expect(isAuthError(400, 'AUTHENTICATION_ERROR')).toBe(true);
    });

    it('should identify validation errors', () => {
      expect(isValidationError(400)).toBe(true);
      expect(isValidationError(401)).toBe(false);
      expect(isValidationError(401, 'VALIDATION_ERROR')).toBe(true);
    });

    it('should identify not-found errors', () => {
      expect(isNotFoundError(404)).toBe(true);
      expect(isNotFoundError(400)).toBe(false);
      expect(isNotFoundError(400, 'NOT_FOUND')).toBe(true);
    });
  });

  describe('Suggested actions', () => {
    it('should provide appropriate suggested actions for each status code', () => {
      expect(getSuggestedAction(400)).toContain('input');
      expect(getSuggestedAction(401)).toContain('log in');
      expect(getSuggestedAction(403)).toContain('support');
      expect(getSuggestedAction(404)).toContain('refresh');
      expect(getSuggestedAction(409)).toContain('refresh');
      expect(getSuggestedAction(429)).toContain('wait');
      expect(getSuggestedAction(500)).toContain('moments');
    });
  });

  describe('Status code message mapping', () => {
    it('should provide user-friendly messages for all status codes', () => {
      const backendError = {
        error_code: 'AUTHENTICATION_ERROR',
        message: 'Invalid credentials',
        status_code: 401,
        timestamp: new Date().toISOString(),
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.userMessage).toBeDefined();
      expect(parsed.userMessage.length).toBeGreaterThan(0);
    });

    it('should use provided message when available', () => {
      const customMessage = 'Custom error message';
      const backendError = {
        error_code: 'VALIDATION_ERROR',
        message: customMessage,
        status_code: 400,
        timestamp: new Date().toISOString(),
      };

      const parsed = parseErrorResponse(backendError);

      expect(parsed.userMessage).toContain(customMessage);
    });
  });
});
