/**
 * Error Boundary Component
 * Catches React component errors and displays graceful fallback UI
 * Prevents entire app from crashing on component-level errors
 */

import React, { ReactNode } from 'react';

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
    if (process.env.NODE_ENV === 'development') {
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

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-red-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <svg
                  className="w-6 h-6 text-red-600"
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
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>

            <p className="text-gray-600 mb-2">
              We encountered an unexpected error. Please try reloading the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-left overflow-auto max-h-32">
                <p className="text-xs font-mono text-gray-700 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
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
