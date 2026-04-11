/**
 * Unified Toast Notification System
 * Centralized toast management for consistency across entire app
 */

import toast, { Toast } from 'react-hot-toast';

/**
 * Toast type definitions
 */
export type ToastType = 'success' | 'error' | 'loading' | 'info' | 'warning';

export interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Default configurations per toast type
 */
const DEFAULT_DURATION = {
  success: 3000,
  error: 5000,
  loading: Infinity,
  info: 3000,
  warning: 4000,
};

const DEFAULT_POSITION = 'top-right' as const;

/**
 * Main toast service
 * Usage: showToast.success('Profile saved!'), showToast.error('Failed to save'), etc.
 */
export const showToast = {
  /**
   * Success toast (green)
   * Default duration: 3 seconds
   */
  success: (message: string, options?: ToastOptions): string => {
    return toast.success(message, {
      duration: options?.duration ?? DEFAULT_DURATION.success,
      position: options?.position ?? DEFAULT_POSITION,
      className: options?.className,
      icon: options?.icon ?? '✓',
    });
  },

  /**
   * Error toast (red)
   * Default duration: 5 seconds
   */
  error: (message: string, options?: ToastOptions): string => {
    return toast.error(message, {
      duration: options?.duration ?? DEFAULT_DURATION.error,
      position: options?.position ?? DEFAULT_POSITION,
      className: options?.className,
      icon: options?.icon,
    });
  },

  /**
   * Loading toast (spinner)
   * Default duration: infinite (manual dismiss required)
   * Returns toast ID for update/dismiss
   */
  loading: (message: string, options?: ToastOptions): string => {
    return toast.loading(message, {
      duration: options?.duration ?? DEFAULT_DURATION.loading,
      position: options?.position ?? DEFAULT_POSITION,
      className: options?.className,
    });
  },

  /**
   * Info toast (blue)
   * Default duration: 3 seconds
   */
  info: (message: string, options?: ToastOptions): string => {
    return toast((t: Toast) => (
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>{message}</span>
      </div>
    ), {
      duration: options?.duration ?? DEFAULT_DURATION.info,
      position: options?.position ?? DEFAULT_POSITION,
    });
  },

  /**
   * Warning toast (yellow)
   * Default duration: 4 seconds
   */
  warning: (message: string, options?: ToastOptions): string => {
    return toast((t: Toast) => (
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>{message}</span>
      </div>
    ), {
      duration: options?.duration ?? DEFAULT_DURATION.warning,
      position: options?.position ?? DEFAULT_POSITION,
    });
  },

  /**
   * Promise-based toast (great for async operations)
   * Usage: showToast.promise(fetchData(), 'Loading...', 'Success!', 'Failed!')
   */
  promise: async <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string },
    options?: ToastOptions
  ): Promise<void> => {
    await toast.promise(
      promise,
      {
        loading: msgs.loading,
        success: msgs.success,
        error: msgs.error,
      },
      {
        duration: options?.duration,
        position: options?.position ?? DEFAULT_POSITION,
      }
    );
  },

  /**
   * Update existing toast
   */
  update: (toastId: string, message: string, type: ToastType = 'info'): void => {
    toast((t) => (
      <span>{message}</span>
    ), {
      id: toastId,
    });
  },

  /**
   * Dismiss specific toast by ID
   */
  dismiss: (toastId?: string): void => {
    if (toastId) {
      toast.dismiss(toastId);
    }
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: (): void => {
    toast.dismiss();
  },
};

/**
 * Hook for promise-based operations in React
 * Usage: 
 * const mutation = useToastMutation(async (data) => api.create(data))
 */
export function useToastMutation<TData, TError = Error>(
  asyncFn: (data: unknown) => Promise<TData>,
  messages?: { loading?: string; success?: string; error?: string }
) {
  const defaultMessages = {
    loading: 'Processing...',
    success: 'Success!',
    error: 'Something went wrong',
  };

  const msgs = { ...defaultMessages, ...messages };

  return async (data: unknown): Promise<TData> => {
    const toastId = showToast.loading(msgs.loading);

    try {
      const result = await asyncFn(data);
      showToast.update(toastId, msgs.success, 'success');
      setTimeout(() => showToast.dismiss(toastId), 3000);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : msgs.error;
      showToast.update(toastId, errorMsg, 'error');
      throw error;
    }
  };
}

/**
 * Toast context provider (optional, for advanced usage)
 * Wrap app root to make toast accessible everywhere
 */
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    {children}
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        className: 'font-medium',
        style: {
          background: '#fff',
          color: '#000',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          borderRadius: '0.5rem',
          padding: '16px',
        },
        success: {
          style: {
            background: '#ecfdf5',
            color: '#065f46',
          },
          duration: 3000,
        },
        error: {
          style: {
            background: '#fef2f2',
            color: '#7f1d1d',
          },
          duration: 5000,
        },
      }}
    />
  </>
);

export default showToast;
