import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';

export type FeedbackVariant = 'success' | 'error' | 'warning' | 'info';

interface FeedbackModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  message: React.ReactNode;
  variant?: FeedbackVariant;
  details?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const STYLES = `
  .fbm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1085;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,0.52);
    backdrop-filter: blur(7px);
    animation: fbm-backdrop-in 0.18s ease both;
  }

  @keyframes fbm-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .fbm-modal {
    --fbm-ink: #0d0f12;
    --fbm-ink-2: #3a3d44;
    --fbm-ink-3: #6b7280;
    --fbm-ink-4: #9ca3af;
    --fbm-surface: #f9f8f6;
    --fbm-surface-2: #f2f0ed;
    --fbm-surface-3: #e8e5e0;
    --fbm-border: #e4e1dc;
    --fbm-border-2: #d1ccc5;
    --fbm-accent: #1a5cff;
    --fbm-accent-soft: rgba(26,92,255,0.08);
    --fbm-success: #12b76a;
    --fbm-success-soft: rgba(18,183,106,0.10);
    --fbm-danger: #ef4444;
    --fbm-danger-soft: rgba(239,68,68,0.10);
    --fbm-warning: #f59e0b;
    --fbm-warning-soft: rgba(245,158,11,0.12);
    --fbm-info: #0ea5e9;
    --fbm-info-soft: rgba(14,165,233,0.10);
    --fbm-tone: var(--fbm-danger);
    --fbm-tone-soft: var(--fbm-danger-soft);
    --fbm-radius: 22px;
    --fbm-radius-sm: 14px;
    --fbm-shadow: 0 24px 80px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.12);

    position: relative;
    width: min(560px, 100%);
    max-height: min(88vh, 760px);
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    background: var(--fbm-surface);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: var(--fbm-radius);
    color: var(--fbm-ink);
    box-shadow: var(--fbm-shadow);
    animation: fbm-modal-in 0.22s ease both;
  }

  .dark-mode .fbm-modal,
  .fbm-modal.dark-mode {
    --fbm-ink: #f0ede8;
    --fbm-ink-2: #c9c4bc;
    --fbm-ink-3: #8a8580;
    --fbm-ink-4: #5a5650;
    --fbm-surface: #141414;
    --fbm-surface-2: #1c1c1c;
    --fbm-surface-3: #252525;
    --fbm-border: #2a2a2a;
    --fbm-border-2: #353535;
    --fbm-accent: #4d7fff;
    --fbm-accent-soft: rgba(77,127,255,0.10);
    --fbm-success-soft: rgba(18,183,106,0.12);
    --fbm-danger-soft: rgba(239,68,68,0.12);
    --fbm-warning-soft: rgba(245,158,11,0.13);
    --fbm-info-soft: rgba(14,165,233,0.12);
  }

  .fbm-modal.success {
    --fbm-tone: var(--fbm-success);
    --fbm-tone-soft: var(--fbm-success-soft);
  }

  .fbm-modal.error {
    --fbm-tone: var(--fbm-danger);
    --fbm-tone-soft: var(--fbm-danger-soft);
  }

  .fbm-modal.warning {
    --fbm-tone: var(--fbm-warning);
    --fbm-tone-soft: var(--fbm-warning-soft);
  }

  .fbm-modal.info {
    --fbm-tone: var(--fbm-info);
    --fbm-tone-soft: var(--fbm-info-soft);
  }

  @keyframes fbm-modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .fbm-modal::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: linear-gradient(90deg, var(--fbm-tone), transparent);
  }

  .fbm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 24px 18px;
    background:
      radial-gradient(circle at top left, var(--fbm-tone-soft), transparent 42%),
      var(--fbm-surface-2);
    border-bottom: 1px solid var(--fbm-border);
  }

  .fbm-title-wrap {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }

  .fbm-icon-shell {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: var(--fbm-tone-soft);
    color: var(--fbm-tone);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--fbm-tone), transparent 78%);
  }

  .fbm-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--fbm-tone);
    margin-bottom: 5px;
  }

  .fbm-title {
    margin: 0;
    color: var(--fbm-ink);
    font-size: 18px;
    font-weight: 850;
    line-height: 1.25;
  }

  .fbm-close {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid var(--fbm-border);
    background: var(--fbm-surface-3);
    color: var(--fbm-ink-3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
  }

  .fbm-close:hover {
    background: var(--fbm-border);
    color: var(--fbm-ink);
    transform: translateY(-1px);
  }

  .fbm-body {
    overflow-y: auto;
    padding: 24px;
    background: var(--fbm-surface);
  }

  .fbm-message-card {
    padding: 16px;
    border-radius: var(--fbm-radius-sm);
    background: var(--fbm-surface-2);
    border: 1px solid var(--fbm-border);
  }

  .fbm-message {
    margin: 0;
    color: var(--fbm-ink-2);
    font-size: 14px;
    line-height: 1.7;
  }

  .fbm-details {
    margin-top: 16px;
    border: 1px solid var(--fbm-border);
    border-radius: var(--fbm-radius-sm);
    background: var(--fbm-surface-2);
    overflow: hidden;
  }

  .fbm-details-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: none;
    background: transparent;
    color: var(--fbm-ink-3);
    font-family: inherit;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .fbm-details-toggle-left {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .fbm-details-panel {
    border-top: 1px solid var(--fbm-border);
    padding: 12px;
  }

  .fbm-code-wrap {
    position: relative;
  }

  .fbm-code {
    max-height: 170px;
    overflow: auto;
    margin: 0;
    padding: 13px 44px 13px 13px;
    border-radius: 12px;
    background: var(--fbm-surface-3);
    color: var(--fbm-ink-2);
    border: 1px solid var(--fbm-border);
    font-size: 12px;
    line-height: 1.55;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .fbm-copy {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 1px solid var(--fbm-border);
    background: var(--fbm-surface-2);
    color: var(--fbm-ink-3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .fbm-copy:hover {
    color: var(--fbm-tone);
    background: var(--fbm-tone-soft);
  }

  .fbm-details-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--fbm-ink-4);
    font-size: 11px;
    line-height: 1.45;
    margin: 10px 0 0;
    text-align: center;
  }

  .fbm-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px 22px;
    background: var(--fbm-surface-2);
    border-top: 1px solid var(--fbm-border);
  }

  .fbm-btn {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px 16px;
    border-radius: 14px;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
  }

  .fbm-btn:active {
    transform: scale(0.98);
  }

  .fbm-btn-secondary {
    background: var(--fbm-surface-3);
    border-color: var(--fbm-border);
    color: var(--fbm-ink-2);
  }

  .fbm-btn-secondary:hover {
    background: var(--fbm-border);
    color: var(--fbm-ink);
  }

  .fbm-btn-primary {
    background: var(--fbm-tone);
    color: #fff;
    box-shadow: 0 1px 3px color-mix(in srgb, var(--fbm-tone), transparent 70%);
  }

  .fbm-btn-primary:hover {
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--fbm-tone), transparent 72%);
  }

  @media (max-width: 620px) {
    .fbm-backdrop {
      align-items: stretch;
      padding: 10px;
    }

    .fbm-modal {
      max-height: none;
      height: 100%;
      border-radius: 18px;
    }

    .fbm-header {
      padding: 20px;
    }

    .fbm-title-wrap {
      gap: 12px;
    }

    .fbm-icon-shell {
      width: 44px;
      height: 44px;
    }

    .fbm-body {
      padding: 20px;
    }

    .fbm-footer {
      align-items: stretch;
      flex-direction: column-reverse;
      padding: 14px 20px 20px;
    }

    .fbm-btn {
      width: 100%;
    }
  }
`;

const getVariantConfig = (variant: FeedbackVariant) => {
  switch (variant) {
    case 'success':
      return {
        Icon: CheckCircle,
        eyebrow: 'Completed',
      };
    case 'warning':
      return {
        Icon: AlertTriangle,
        eyebrow: 'Action needed',
      };
    case 'info':
      return {
        Icon: Info,
        eyebrow: 'Information',
      };
    case 'error':
    default:
      return {
        Icon: XCircle,
        eyebrow: 'Recovery mode',
      };
  }
};

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  show,
  onHide,
  title,
  message,
  variant = 'error',
  details,
  primaryActionLabel = 'Close',
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const canShowTechnicalDetails = Boolean(details && import.meta.env.DEV);
  const { Icon, eyebrow } = getVariantConfig(variant);

  useEffect(() => {
    if (!show) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && variant !== 'error') {
        onHide();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide, variant]);

  useEffect(() => {
    if (!show) {
      setShowDetails(false);
      setCopied(false);
    }
  }, [show]);

  const handleCopyDetails = async () => {
    if (!details) return;

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      onHide();
    }
  };

  if (!show) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="fbm-backdrop" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title">
        <div className={`fbm-modal ${variant}`}>
          <header className="fbm-header">
            <div className="fbm-title-wrap">
              <div className="fbm-icon-shell">
                <Icon size={24} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div className="fbm-eyebrow">
                  <Sparkles size={11} />
                  {eyebrow}
                </div>
                <h2 id="feedback-modal-title" className="fbm-title">{title}</h2>
              </div>
            </div>

            {variant !== 'error' && (
              <button type="button" className="fbm-close" onClick={onHide} aria-label="Close modal">
                <X size={16} />
              </button>
            )}
          </header>

          <main className="fbm-body">
            <div className="fbm-message-card">
              <div className="fbm-message">{message}</div>
            </div>

            {canShowTechnicalDetails && (
              <section className="fbm-details">
                <button
                  type="button"
                  className="fbm-details-toggle"
                  onClick={() => setShowDetails((current) => !current)}
                  aria-expanded={showDetails}
                >
                  <span className="fbm-details-toggle-left">
                    <ShieldAlert size={13} />
                    Technical details
                  </span>
                  {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showDetails && (
                  <div className="fbm-details-panel">
                    <div className="fbm-code-wrap">
                      <pre className="fbm-code">{details}</pre>
                      <button
                        type="button"
                        className="fbm-copy"
                        onClick={handleCopyDetails}
                        title="Copy to clipboard"
                        aria-label="Copy technical details"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="fbm-details-note">
                      <Info size={12} />
                      Share this with support only if the issue persists.
                    </p>
                  </div>
                )}
              </section>
            )}
          </main>

          <footer className="fbm-footer">
            {secondaryActionLabel && (
              <button
                type="button"
                className="fbm-btn fbm-btn-secondary"
                onClick={onSecondaryAction || onHide}
              >
                {secondaryActionLabel}
              </button>
            )}

            <button type="button" className="fbm-btn fbm-btn-primary" onClick={handlePrimaryClick}>
              {primaryActionLabel}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
};

export default FeedbackModal;
