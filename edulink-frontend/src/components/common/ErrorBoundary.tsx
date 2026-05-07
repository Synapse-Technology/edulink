/**
 * Error Boundary Component
 * Catches React component errors and displays graceful fallback UI.
 * Prevents app sections from crashing the entire experience.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Bug,
  LifeBuoy,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { sanitizeErrorMessage } from '../../utils/sanitization';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  variant?: 'page' | 'section' | 'compact';
  title?: string;
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const STYLES = `
  .eb-shell {
    --eb-ink: #0d0f12;
    --eb-ink-2: #3a3d44;
    --eb-ink-3: #6b7280;
    --eb-ink-4: #9ca3af;
    --eb-surface: #f9f8f6;
    --eb-surface-2: #f2f0ed;
    --eb-surface-3: #e8e5e0;
    --eb-border: #e4e1dc;
    --eb-border-2: #d1ccc5;
    --eb-accent: #1a5cff;
    --eb-accent-soft: rgba(26,92,255,0.08);
    --eb-danger: #ef4444;
    --eb-danger-soft: rgba(239,68,68,0.10);
    --eb-warning: #f59e0b;
    --eb-warning-soft: rgba(245,158,11,0.12);
    --eb-radius: 22px;
    --eb-radius-sm: 14px;
    --eb-shadow: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);

    width: 100%;
    color: var(--eb-ink);
    font-family: inherit;
  }

  .dark-mode .eb-shell,
  .eb-shell.dark-mode {
    --eb-ink: #f0ede8;
    --eb-ink-2: #c9c4bc;
    --eb-ink-3: #8a8580;
    --eb-ink-4: #5a5650;
    --eb-surface: #141414;
    --eb-surface-2: #1c1c1c;
    --eb-surface-3: #252525;
    --eb-border: #2a2a2a;
    --eb-border-2: #353535;
    --eb-accent: #4d7fff;
    --eb-accent-soft: rgba(77,127,255,0.10);
    --eb-danger-soft: rgba(239,68,68,0.12);
    --eb-warning-soft: rgba(245,158,11,0.13);
    --eb-shadow: 0 12px 40px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.24);
  }

  .eb-shell.page {
    min-height: 72vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background:
      radial-gradient(circle at top left, var(--eb-danger-soft), transparent 34%),
      var(--eb-surface);
  }

  .eb-shell.section {
    padding: 18px 0;
  }

  .eb-shell.compact {
    padding: 0;
  }

  .eb-card {
    position: relative;
    width: min(720px, 100%);
    overflow: hidden;
    background: var(--eb-surface-2);
    border: 1px solid var(--eb-border);
    border-radius: var(--eb-radius);
    box-shadow: var(--eb-shadow);
    animation: eb-in 0.24s ease both;
  }

  .eb-shell.compact .eb-card {
    box-shadow: none;
    border-radius: var(--eb-radius-sm);
  }

  @keyframes eb-in {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .eb-card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: linear-gradient(90deg, var(--eb-danger), var(--eb-warning), var(--eb-accent));
  }

  .eb-body {
    padding: 28px;
  }

  .eb-head {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
  }

  .eb-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: var(--eb-danger-soft);
    color: var(--eb-danger);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .eb-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--eb-danger);
    margin-bottom: 5px;
  }

  .eb-title {
    margin: 0 0 7px;
    color: var(--eb-ink);
    font-size: 21px;
    font-weight: 850;
    line-height: 1.2;
  }

  .eb-description {
    margin: 0;
    color: var(--eb-ink-3);
    font-size: 14px;
    line-height: 1.65;
  }

  .eb-dev-panel {
    margin-top: 18px;
    background: var(--eb-surface-3);
    border: 1px solid var(--eb-border);
    border-radius: var(--eb-radius-sm);
    overflow: hidden;
  }

  .eb-dev-head {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--eb-border);
    color: var(--eb-ink-4);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .eb-dev-message {
    margin: 0;
    padding: 12px;
    color: var(--eb-ink-2);
    font-size: 12px;
    line-height: 1.55;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .eb-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid var(--eb-border);
  }

  .eb-actions-left,
  .eb-actions-right {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }

  .eb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 38px;
    padding: 9px 14px;
    border-radius: 13px;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .eb-btn:active {
    transform: scale(0.98);
  }

  .eb-btn-primary {
    background: var(--eb-accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.22);
  }

  .eb-btn-primary:hover {
    box-shadow: 0 4px 16px rgba(26,92,255,0.28);
    transform: translateY(-1px);
  }

  .eb-btn-ghost {
    background: var(--eb-surface-3);
    color: var(--eb-ink-2);
    border-color: var(--eb-border);
  }

  .eb-btn-ghost:hover {
    background: var(--eb-border);
    color: var(--eb-ink);
  }

  .eb-support-note {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--eb-ink-4);
    font-size: 12px;
    line-height: 1.45;
  }

  @media (max-width: 640px) {
    .eb-shell.page {
      min-height: 60vh;
      padding: 18px;
    }

    .eb-body {
      padding: 22px;
    }

    .eb-head {
      flex-direction: column;
    }

    .eb-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .eb-actions-left,
    .eb-actions-right,
    .eb-btn {
      width: 100%;
    }
  }
`;

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
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const variant = this.props.variant || 'section';
      const title = this.props.title || 'Something broke in this section';
      const description = this.props.description || 'A component failed while rendering. You can try again, or reload the page if the problem continues.';
      const sanitizedError = this.state.error
        ? sanitizeErrorMessage(this.state.error.toString())
        : null;

      return (
        <>
          <style>{STYLES}</style>
          <div className={`eb-shell ${variant}`} role="alert" aria-live="assertive">
            <div className="eb-card">
              <div className="eb-body">
                <div className="eb-head">
                  <div className="eb-icon">
                    <ShieldAlert size={27} />
                  </div>

                  <div>
                    <div className="eb-eyebrow">
                      <AlertTriangle size={11} />
                      Recovery mode
                    </div>
                    <h2 className="eb-title">{title}</h2>
                    <p className="eb-description">{description}</p>
                  </div>
                </div>

                {import.meta.env.DEV && sanitizedError && (
                  <div className="eb-dev-panel">
                    <div className="eb-dev-head">
                      <Bug size={12} />
                      Developer details
                    </div>
                    <pre className="eb-dev-message">{sanitizedError}</pre>
                  </div>
                )}

                <div className="eb-actions">
                  <div className="eb-actions-left">
                    <button type="button" className="eb-btn eb-btn-primary" onClick={this.handleReset}>
                      <RotateCcw size={15} />
                      Try again
                    </button>
                    <button type="button" className="eb-btn eb-btn-ghost" onClick={this.handleReload}>
                      <RefreshCw size={15} />
                      Reload page
                    </button>
                  </div>

                  <div className="eb-actions-right">
                    <span className="eb-support-note">
                      <LifeBuoy size={14} />
                      If this keeps happening, contact support with the current page and action.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for specific areas.
 */
export const LocalErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => (
  <ErrorBoundary {...props} variant={props.variant || 'compact'} />
);
