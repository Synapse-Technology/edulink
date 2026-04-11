/**
 * Tests for useErrorHandler hook
 * Validates status-code-specific error handling and retry logic
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, useFormErrorHandler, useConflictResolution } from '../../../src/hooks/useErrorHandler';

describe('useErrorHandler Hook', () => {
  describe('Error handling callbacks', () => {
    it('should call onValidationError for 400 status', async () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ onValidationError })
      );

      const error = {
        error_code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        status_code: 400,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onValidationError).toHaveBeenCalled();
    });

    it('should call onAuthError for 401 status', async () => {
      const onAuthError = vi.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ onAuthError })
      );

      const error = {
        error_code: 'AUTHENTICATION_ERROR',
        message: 'Invalid credentials',
        status_code: 401,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onAuthError).toHaveBeenCalled();
    });

    it('should call onAuthError for 403 status', async () => {
      const onAuthError = vi.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ onAuthError })
      );

      const error = {
        error_code: 'AUTHORIZATION_ERROR',
        message: 'Access forbidden',
        status_code: 403,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onAuthError).toHaveBeenCalled();
    });

    it('should call onNotFound for 404 status', async () => {
      const onNotFound = vi.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ onNotFound })
      );

      const error = {
        error_code: 'NOT_FOUND',
        message: 'Resource not found',
        status_code: 404,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onNotFound).toHaveBeenCalled();
    });

    it('should call onConflict for 409 status', async () => {
      const onConflict = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useErrorHandler({ onConflict })
      );

      const error = {
        error_code: 'CONFLICT_ERROR',
        message: 'Conflict detected',
        status_code: 409,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onConflict).toHaveBeenCalled();
    });

    it('should call onUnexpected for 5xx errors', async () => {
      const onUnexpected = vi.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ onUnexpected })
      );

      const error = {
        error_code: 'INTERNAL_ERROR',
        message: 'Server error',
        status_code: 500,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onUnexpected).toHaveBeenCalled();
    });
  });

  describe('Error clearing', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = {
        error_code: 'VALIDATION_ERROR',
        message: 'Error',
        status_code: 400,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(result.current.parsedError).toBeDefined();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.parsedError).toBeNull();
    });
  });

  describe('Retry logic', () => {
    it('should track retry attempts', async () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.retryAttempt).toBe(0);

      // Note: Full retry testing would require more complex setup
    });
  });

  describe('Conflict resolution', () => {
    it('should call onConflict and not onUnexpected for 409 errors', async () => {
      const onConflict = vi.fn().mockResolvedValue(undefined);
      const onUnexpected = vi.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ onConflict, onUnexpected })
      );

      const error = {
        error_code: 'CONFLICT_ERROR',
        message: 'Conflict',
        status_code: 409,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onConflict).toHaveBeenCalled();
      expect(onUnexpected).not.toHaveBeenCalled();
    });

    it('should call onUnexpected if conflict resolution fails', async () => {
      const onConflict = vi.fn().mockRejectedValue(new Error('Refresh failed'));
      const onUnexpected = vi.fn();
      const { result } = renderHook(() =>
        useErrorHandler({ onConflict, onUnexpected })
      );

      const error = {
        error_code: 'CONFLICT_ERROR',
        message: 'Conflict',
        status_code: 409,
        timestamp: new Date().toISOString(),
      };

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(onConflict).toHaveBeenCalled();
      expect(onUnexpected).toHaveBeenCalled();
    });
  });
});

describe('useFormErrorHandler Hook', () => {
  it('should extract field-specific errors', async () => {
    const { result } = renderHook(() => useFormErrorHandler());

    const error = {
      error_code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      status_code: 400,
      timestamp: new Date().toISOString(),
      context: {
        email: ['Email is required.'],
        password: ['Password must be at least 8 characters.'],
      },
    };

    await act(async () => {
      await result.current.handleError(error);
    });

    expect(result.current.getFieldError('email')).toBe('Email is required.');
    expect(result.current.getFieldError('password')).toBe('Password must be at least 8 characters.');
    expect(result.current.getFieldError('unknown')).toBeUndefined();
  });

  it('should return all field errors', async () => {
    const { result } = renderHook(() => useFormErrorHandler());

    const error = {
      error_code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      status_code: 400,
      timestamp: new Date().toISOString(),
      context: {
        email: ['Error 1.'],
        name: ['Error 2.'],
      },
    };

    await act(async () => {
      await result.current.handleError(error);
    });

    expect(result.current.getAllFieldErrors()).toHaveLength(2);
  });
});

describe('useConflictResolution Hook', () => {
  it('should resolve conflicts by refreshing state', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConflictResolution(onRefresh));

    const error = {
      error_code: 'CONFLICT_ERROR',
      message: 'Conflict',
      status_code: 409,
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      await result.current.resolveConflict(error);
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  it('should throw for non-conflict errors', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConflictResolution(onRefresh));

    const error = {
      error_code: 'VALIDATION_ERROR',
      message: 'Validation',
      status_code: 400,
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      await expect(result.current.resolveConflict(error)).rejects.toThrow('Not a conflict error');
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
