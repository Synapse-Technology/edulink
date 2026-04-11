/**
 * Unified Toast Notification System
 * Centralized toast management for consistency across entire app
 */

import toast from 'react-hot-toast';

/**
 * Toast type definitions
 */
export type ToastType = 'success' | 'error' | 'loading' | 'info' | 'warning';

export interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: string;
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
      icon: options?.icon ?? '✕',
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
    return toast(message, {
      duration: options?.duration ?? DEFAULT_DURATION.info,
      position: options?.position ?? DEFAULT_POSITION,
      className: options?.className,
      icon: options?.icon ?? 'ℹ️',
    });
  },

  /**
   * Warning toast (yellow)
   * Default duration: 4 seconds
   */
  warning: (message: string, options?: ToastOptions): string => {
    return toast(message, {
      duration: options?.duration ?? DEFAULT_DURATION.warning,
      position: options?.position ?? DEFAULT_POSITION,
      className: options?.className,
      icon: options?.icon ?? '⚠️',
    });
  },

  /**
   * Promise-based toast (great for async operations)
   * Usage: showToast.promise(fetchData(), { loading: '...', success: '...', error: '...' })
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
    const icon = {
      success: '✓',
      error: '✕',
      info: 'ℹ️',
      warning: '⚠️',
      loading: undefined,
    }[type];

    toast(message, {
      id: toastId,
      icon: icon as string | undefined,
    });
  },

  /**
   * Dismiss specific toast by ID
   */
  dismiss: (toastId?: string): void => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
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
export function useToastMutation<TData>(
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



export default showToast;
