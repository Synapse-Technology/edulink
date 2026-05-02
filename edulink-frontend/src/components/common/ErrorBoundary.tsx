/**
 * Error Boundary Component
 * Catches React component errors and displays graceful fallback UI
 * Prevents entire app from crashing on component-level errors
 */

import React from 'react';
import type { ReactNode } from 'react';
import { sanitizeErrorMessage } from '../../utils/sanitization';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Usage:
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Call optional error handler (for logging services like Sentry)
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI - Subtle toast-style notification in top-right corner
      return (
        <>
          {/* Render children in the background (dimmed) */}
          <div className="opacity-50">
            {this.props.children}
          </div>

          {/* Overlay for modal effect */}
          <div className="fixed inset-0 bg-black bg-opacity-20 pointer-events-none" />

          {/* Toast notification - subtle and non-intrusive */}
          <div className="fixed top-4 right-4 z-50 w-full max-w-sm animate-in fade-in slide-in-from-top-2">
            <div className="bg-white rounded-lg shadow-xl border-l-4 border-red-500 p-4">
              {/* Header with icon and close button */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Something went wrong</h3>
                </div>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-600 mb-4">
                We encountered an unexpected error. Try refreshing or click below.
              </p>

              {/* Dev error details (only in dev mode) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs font-mono text-gray-600 break-words">
                    {sanitizeErrorMessage(this.state.error.toString())}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors font-medium"
                >
                  Reload
                </button>
              </div>

              {/* Support message */}
              <p className="text-xs text-gray-500 mt-3">
                Persists? Contact support for help.
              </p>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for specific areas (not entire app)
 * Lighter weight than full page error handling
 */
export const LocalErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => (
  <ErrorBoundary {...props} />
);
