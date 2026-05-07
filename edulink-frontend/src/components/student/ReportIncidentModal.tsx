import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Loader,
  Lock,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { internshipService } from '../../services/internship/internshipService';
import { toast } from 'react-hot-toast';

interface ReportIncidentModalProps {
  show: boolean;
  onHide: () => void;
  applicationId: string;
}

const STYLES = `
  .rim-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1085;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,0.56);
    backdrop-filter: blur(7px);
    animation: rim-backdrop-in 0.18s ease both;
  }

  @keyframes rim-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .rim-modal {
    --rim-ink: #0d0f12;
    --rim-ink-2: #3a3d44;
    --rim-ink-3: #6b7280;
    --rim-ink-4: #9ca3af;
    --rim-surface: #f9f8f6;
    --rim-surface-2: #f2f0ed;
    --rim-surface-3: #e8e5e0;
    --rim-border: #e4e1dc;
    --rim-border-2: #d1ccc5;
    --rim-accent: #1a5cff;
    --rim-accent-soft: rgba(26,92,255,0.08);
    --rim-success: #12b76a;
    --rim-success-soft: rgba(18,183,106,0.10);
    --rim-danger: #ef4444;
    --rim-danger-soft: rgba(239,68,68,0.10);
    --rim-warning: #f59e0b;
    --rim-warning-soft: rgba(245,158,11,0.12);
    --rim-radius: 24px;
    --rim-radius-sm: 15px;
    --rim-shadow: 0 24px 80px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.14);

    position: relative;
    width: min(620px, 100%);
    max-height: min(90vh, 780px);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    overflow: hidden;
    background: var(--rim-surface);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: var(--rim-radius);
    color: var(--rim-ink);
    box-shadow: var(--rim-shadow);
    animation: rim-modal-in 0.22s ease both;
  }

  .dark-mode .rim-modal,
  .rim-modal.dark-mode {
    --rim-ink: #f0ede8;
    --rim-ink-2: #c9c4bc;
    --rim-ink-3: #8a8580;
    --rim-ink-4: #5a5650;
    --rim-surface: #141414;
    --rim-surface-2: #1c1c1c;
    --rim-surface-3: #252525;
    --rim-border: #2a2a2a;
    --rim-border-2: #353535;
    --rim-accent: #4d7fff;
    --rim-accent-soft: rgba(77,127,255,0.10);
    --rim-success-soft: rgba(18,183,106,0.12);
    --rim-danger-soft: rgba(239,68,68,0.12);
    --rim-warning-soft: rgba(245,158,11,0.13);
  }

  .rim-modal::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: linear-gradient(90deg, var(--rim-danger), var(--rim-warning), transparent);
  }

  @keyframes rim-modal-in {
    from { opacity: 0; transform: scale(0.97) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .rim-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 24px 18px;
    background:
      radial-gradient(circle at top left, var(--rim-danger-soft), transparent 42%),
      var(--rim-surface-2);
    border-bottom: 1px solid var(--rim-border);
  }

  .rim-title-wrap {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }

  .rim-icon-shell {
    width: 50px;
    height: 50px;
    border-radius: 17px;
    background: var(--rim-danger-soft);
    color: var(--rim-danger);
    border: 1px solid rgba(239,68,68,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .rim-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--rim-danger);
    margin-bottom: 6px;
  }

  .rim-title {
    margin: 0;
    color: var(--rim-ink);
    font-size: 20px;
    font-weight: 900;
    line-height: 1.18;
  }

  .rim-subtitle {
    margin: 8px 0 0;
    color: var(--rim-ink-3);
    font-size: 13px;
    line-height: 1.6;
  }

  .rim-close {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    border: 1px solid var(--rim-border);
    background: var(--rim-surface-3);
    color: var(--rim-ink-3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
  }

  .rim-close:hover {
    background: var(--rim-border);
    color: var(--rim-ink);
    transform: translateY(-1px);
  }

  .rim-body {
    overflow-y: auto;
    padding: 22px 24px;
  }

  .rim-guidance {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 12px;
    align-items: flex-start;
    padding: 14px;
    border-radius: var(--rim-radius-sm);
    background: var(--rim-accent-soft);
    border: 1px solid rgba(26,92,255,0.16);
    margin-bottom: 18px;
  }

  .rim-guidance-icon {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    background: var(--rim-surface);
    color: var(--rim-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rim-guidance-title {
    margin: 0 0 4px;
    color: var(--rim-ink);
    font-size: 13px;
    font-weight: 900;
  }

  .rim-guidance-text {
    margin: 0;
    color: var(--rim-ink-3);
    font-size: 12px;
    line-height: 1.55;
  }

  .rim-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .rim-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rim-label {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--rim-ink-2);
    font-size: 12px;
    font-weight: 900;
  }

  .rim-input,
  .rim-textarea {
    width: 100%;
    border-radius: 15px;
    border: 1px solid var(--rim-border);
    background: var(--rim-surface-2);
    color: var(--rim-ink);
    padding: 12px 14px;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .rim-input {
    min-height: 44px;
  }

  .rim-textarea {
    min-height: 150px;
    resize: vertical;
    line-height: 1.6;
  }

  .rim-input:focus,
  .rim-textarea:focus {
    border-color: var(--rim-danger);
    box-shadow: 0 0 0 3px var(--rim-danger-soft);
    background: var(--rim-surface-3);
  }

  .rim-input::placeholder,
  .rim-textarea::placeholder {
    color: var(--rim-ink-4);
  }

  .rim-helper {
    margin: 0;
    color: var(--rim-ink-4);
    font-size: 11px;
    line-height: 1.45;
  }

  .rim-checklist {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
    margin-top: 2px;
  }

  .rim-check-item {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 10px;
    border-radius: 13px;
    background: var(--rim-surface-2);
    border: 1px solid var(--rim-border);
    color: var(--rim-ink-3);
    font-size: 11px;
    font-weight: 800;
  }

  .rim-check-item svg {
    color: var(--rim-success);
    flex-shrink: 0;
  }

  .rim-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 16px 24px 22px;
    border-top: 1px solid var(--rim-border);
    background: var(--rim-surface-2);
  }

  .rim-secure-note {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--rim-ink-4);
    font-size: 11px;
    font-weight: 800;
    line-height: 1.45;
  }

  .rim-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }

  .rim-btn {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 14px;
    border: 1px solid transparent;
    padding: 10px 16px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
  }

  .rim-btn:disabled {
    opacity: 0.48;
    cursor: not-allowed;
    pointer-events: none;
    box-shadow: none;
  }

  .rim-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .rim-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .rim-btn-ghost {
    background: transparent;
    color: var(--rim-ink-3);
    border-color: var(--rim-border);
  }

  .rim-btn-ghost:hover:not(:disabled) {
    background: var(--rim-surface-3);
    color: var(--rim-ink);
  }

  .rim-btn-danger {
    background: var(--rim-danger);
    color: #fff;
    box-shadow: 0 8px 22px rgba(239,68,68,0.24);
  }

  .rim-btn-danger:hover:not(:disabled) {
    color: #fff;
    box-shadow: 0 12px 28px rgba(239,68,68,0.30);
  }

  .rim-spinner {
    animation: rim-spin 0.85s linear infinite;
  }

  @keyframes rim-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 680px) {
    .rim-backdrop {
      align-items: stretch;
      padding: 10px;
    }

    .rim-modal {
      max-height: none;
      height: 100%;
      border-radius: 18px;
    }

    .rim-header,
    .rim-body,
    .rim-footer {
      padding-left: 18px;
      padding-right: 18px;
    }

    .rim-checklist {
      grid-template-columns: 1fr;
    }

    .rim-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .rim-actions {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }

    .rim-btn {
      width: 100%;
    }

    .rim-btn-danger {
      order: 1;
    }

    .rim-btn-ghost {
      order: 2;
    }
  }
`;

const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({ show, onHide, applicationId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!show) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onHide();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide, isSubmitting]);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await internshipService.reportIncident(applicationId, title.trim(), description.trim());
      toast.success('Incident reported successfully. Supervisors have been notified.');
      onHide();
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to report incident.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onHide();
  };

  if (!show) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="rim-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-incident-title">
        <form className="rim-modal" onSubmit={handleSubmit}>
          <header className="rim-header">
            <div className="rim-title-wrap">
              <div className="rim-icon-shell">
                <ShieldAlert size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="rim-eyebrow">
                  <Sparkles size={11} />
                  Secure incident report
                </div>
                <h2 id="report-incident-title" className="rim-title">Report Incident</h2>
                <p className="rim-subtitle">
                  Record a serious concern for supervisor review. Your report will be shared securely with the responsible institution and employer supervisors.
                </p>
              </div>
            </div>

            <button type="button" className="rim-close" onClick={handleClose} disabled={isSubmitting} aria-label="Close incident report">
              <X size={16} />
            </button>
          </header>

          <main className="rim-body">
            <section className="rim-guidance">
              <div className="rim-guidance-icon">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="rim-guidance-title">Be specific and factual</h3>
                <p className="rim-guidance-text">
                  Include what happened, when it happened, where it happened, who was involved, and any immediate risk or evidence available.
                </p>
              </div>
            </section>

            <div className="rim-form">
              <div className="rim-field">
                <label className="rim-label" htmlFor="incident-title">
                  <AlertTriangle size={14} />
                  Subject
                </label>
                <input
                  id="incident-title"
                  className="rim-input"
                  type="text"
                  placeholder="e.g. Safety concern, harassment, unfair treatment"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <p className="rim-helper">Use a clear short title so supervisors can triage the report quickly.</p>
              </div>

              <div className="rim-field">
                <label className="rim-label" htmlFor="incident-description">
                  <MessageSquareText size={14} />
                  Description
                </label>
                <textarea
                  id="incident-description"
                  className="rim-textarea"
                  placeholder="Describe what happened, when it happened, who was involved, and what support or action you need..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <p className="rim-helper">Avoid exaggeration. A clear factual report is easier to investigate and act on.</p>
              </div>

              <div className="rim-checklist" aria-label="Incident reporting guidance">
                <div className="rim-check-item"><CheckCircle size={14} /> Date and time</div>
                <div className="rim-check-item"><CheckCircle size={14} /> People involved</div>
                <div className="rim-check-item"><CheckCircle size={14} /> Evidence or risk</div>
              </div>
            </div>
          </main>

          <footer className="rim-footer">
            <div className="rim-secure-note">
              <ShieldCheck size={14} />
              This creates an auditable incident record for supervisor review.
            </div>

            <div className="rim-actions">
              <button type="button" className="rim-btn rim-btn-ghost" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="rim-btn rim-btn-danger" disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader size={15} className="rim-spinner" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </>
  );
};

export default ReportIncidentModal;
