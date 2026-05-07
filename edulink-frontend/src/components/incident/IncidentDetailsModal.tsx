import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileSearch,
  Gavel,
  Loader,
  MessageSquareText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { internshipService } from '../../services/internship/internshipService';
import type { Incident } from '../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import IncidentAuditTrail from './IncidentAuditTrail';

interface IncidentDetailsModalProps {
  show: boolean;
  onHide: () => void;
  incident: Incident;
  onUpdate: (updated: Incident) => void;
  isAdmin?: boolean;
}

const STYLES = `
  .idm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1090;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,0.56);
    backdrop-filter: blur(7px);
    animation: idm-backdrop-in 0.18s ease both;
  }

  @keyframes idm-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .idm-modal {
    --idm-ink: #0d0f12;
    --idm-ink-2: #3a3d44;
    --idm-ink-3: #6b7280;
    --idm-ink-4: #9ca3af;
    --idm-surface: #f9f8f6;
    --idm-surface-2: #f2f0ed;
    --idm-surface-3: #e8e5e0;
    --idm-border: #e4e1dc;
    --idm-border-2: #d1ccc5;
    --idm-accent: #1a5cff;
    --idm-accent-soft: rgba(26,92,255,0.08);
    --idm-success: #12b76a;
    --idm-success-soft: rgba(18,183,106,0.10);
    --idm-danger: #ef4444;
    --idm-danger-soft: rgba(239,68,68,0.10);
    --idm-warning: #f59e0b;
    --idm-warning-soft: rgba(245,158,11,0.12);
    --idm-info: #0ea5e9;
    --idm-info-soft: rgba(14,165,233,0.10);
    --idm-tone: var(--idm-danger);
    --idm-tone-soft: var(--idm-danger-soft);
    --idm-radius: 24px;
    --idm-radius-sm: 15px;
    --idm-shadow: 0 24px 80px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.14);

    width: min(1040px, 100%);
    max-height: min(90vh, 860px);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    background: var(--idm-surface);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: var(--idm-radius);
    color: var(--idm-ink);
    box-shadow: var(--idm-shadow);
    animation: idm-modal-in 0.22s ease both;
  }

  .dark-mode .idm-modal,
  .idm-modal.dark-mode {
    --idm-ink: #f0ede8;
    --idm-ink-2: #c9c4bc;
    --idm-ink-3: #8a8580;
    --idm-ink-4: #5a5650;
    --idm-surface: #141414;
    --idm-surface-2: #1c1c1c;
    --idm-surface-3: #252525;
    --idm-border: #2a2a2a;
    --idm-border-2: #353535;
    --idm-accent: #4d7fff;
    --idm-accent-soft: rgba(77,127,255,0.10);
    --idm-success-soft: rgba(18,183,106,0.12);
    --idm-danger-soft: rgba(239,68,68,0.12);
    --idm-warning-soft: rgba(245,158,11,0.13);
    --idm-info-soft: rgba(14,165,233,0.12);
  }

  .idm-modal.open { --idm-tone: var(--idm-danger); --idm-tone-soft: var(--idm-danger-soft); }
  .idm-modal.assigned { --idm-tone: var(--idm-warning); --idm-tone-soft: var(--idm-warning-soft); }
  .idm-modal.investigating { --idm-tone: var(--idm-info); --idm-tone-soft: var(--idm-info-soft); }
  .idm-modal.pending_approval { --idm-tone: var(--idm-accent); --idm-tone-soft: var(--idm-accent-soft); }
  .idm-modal.resolved { --idm-tone: var(--idm-success); --idm-tone-soft: var(--idm-success-soft); }
  .idm-modal.dismissed { --idm-tone: var(--idm-ink-3); --idm-tone-soft: var(--idm-surface-3); }

  @keyframes idm-modal-in {
    from { opacity: 0; transform: scale(0.97) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .idm-modal::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: linear-gradient(90deg, var(--idm-tone), transparent);
  }

  .idm-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    padding: 22px 24px 18px;
    background:
      radial-gradient(circle at top left, var(--idm-tone-soft), transparent 40%),
      var(--idm-surface-2);
    border-bottom: 1px solid var(--idm-border);
  }

  .idm-title-block {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }

  .idm-icon-shell {
    width: 50px;
    height: 50px;
    border-radius: 17px;
    background: var(--idm-tone-soft);
    color: var(--idm-tone);
    border: 1px solid color-mix(in srgb, var(--idm-tone), transparent 76%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .idm-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--idm-tone);
    margin-bottom: 6px;
  }

  .idm-title {
    margin: 0;
    color: var(--idm-ink);
    font-size: 20px;
    font-weight: 850;
    line-height: 1.22;
  }

  .idm-subtitle {
    margin: 7px 0 0;
    color: var(--idm-ink-3);
    font-size: 13px;
    line-height: 1.55;
  }

  .idm-header-actions {
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }

  .idm-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 8px 12px;
    border-radius: 999px;
    background: var(--idm-tone-soft);
    color: var(--idm-tone);
    border: 1px solid color-mix(in srgb, var(--idm-tone), transparent 76%);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .idm-close {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid var(--idm-border);
    background: var(--idm-surface-3);
    color: var(--idm-ink-3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
  }

  .idm-close:hover {
    background: var(--idm-border);
    color: var(--idm-ink);
    transform: translateY(-1px);
  }

  .idm-content {
    min-height: 0;
    overflow-y: auto;
    padding: 20px 24px 24px;
  }

  .idm-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 20px;
    align-items: start;
  }

  .idm-main,
  .idm-side {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .idm-card {
    background: var(--idm-surface-2);
    border: 1px solid var(--idm-border);
    border-radius: var(--idm-radius-sm);
    overflow: hidden;
  }

  .idm-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--idm-border);
  }

  .idm-card-label {
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--idm-ink-4);
    margin-bottom: 3px;
  }

  .idm-card-title {
    margin: 0;
    color: var(--idm-ink);
    font-size: 15px;
    font-weight: 850;
    line-height: 1.25;
  }

  .idm-card-body {
    padding: 18px;
  }

  .idm-description {
    margin: 0;
    color: var(--idm-ink-3);
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .idm-facts {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .idm-fact {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--idm-border);
  }

  .idm-fact:first-child { padding-top: 0; }
  .idm-fact:last-child { border-bottom: none; padding-bottom: 0; }

  .idm-fact-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--idm-ink-4);
    font-size: 12px;
    font-weight: 700;
  }

  .idm-fact-value {
    color: var(--idm-ink);
    font-size: 12px;
    font-weight: 800;
    text-align: right;
    line-height: 1.45;
  }

  .idm-note-card {
    border-radius: var(--idm-radius-sm);
    border: 1px solid var(--idm-border);
    background: var(--idm-surface-3);
    padding: 14px;
  }

  .idm-note-card.info {
    background: var(--idm-info-soft);
    border-color: rgba(14,165,233,0.20);
  }

  .idm-note-card.success {
    background: var(--idm-success-soft);
    border-color: rgba(18,183,106,0.20);
  }

  .idm-note-card.muted {
    background: var(--idm-surface-3);
  }

  .idm-note-title {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 7px;
    color: var(--idm-ink);
    font-size: 13px;
    font-weight: 850;
  }

  .idm-note-text {
    margin: 0;
    color: var(--idm-ink-3);
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  .idm-workflow {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .idm-step {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 10px;
    align-items: flex-start;
    padding: 12px;
    background: var(--idm-surface-3);
    border: 1px solid var(--idm-border);
    border-radius: 13px;
  }

  .idm-step.active {
    background: var(--idm-tone-soft);
    border-color: color-mix(in srgb, var(--idm-tone), transparent 78%);
  }

  .idm-step.complete {
    background: var(--idm-success-soft);
    border-color: rgba(18,183,106,0.20);
  }

  .idm-step-icon {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    background: var(--idm-surface-2);
    border: 1px solid var(--idm-border);
    color: var(--idm-ink-4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .idm-step.active .idm-step-icon {
    background: var(--idm-tone-soft);
    color: var(--idm-tone);
    border-color: transparent;
  }

  .idm-step.complete .idm-step-icon {
    background: var(--idm-success-soft);
    color: var(--idm-success);
    border-color: transparent;
  }

  .idm-step-title {
    margin: 0 0 3px;
    color: var(--idm-ink);
    font-size: 12px;
    font-weight: 850;
  }

  .idm-step-text {
    margin: 0;
    color: var(--idm-ink-3);
    font-size: 12px;
    line-height: 1.45;
  }

  .idm-action-panel {
    background: linear-gradient(135deg, var(--idm-tone-soft), var(--idm-surface-2));
    border: 1px solid color-mix(in srgb, var(--idm-tone), transparent 80%);
    border-radius: var(--idm-radius-sm);
    padding: 15px;
  }

  .idm-action-title {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 7px;
    color: var(--idm-ink);
    font-size: 13px;
    font-weight: 850;
  }

  .idm-action-text {
    margin: 0 0 13px;
    color: var(--idm-ink-3);
    font-size: 12px;
    line-height: 1.55;
  }

  .idm-btn-row {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }

  .idm-btn {
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 13px;
    border: 1px solid transparent;
    background: var(--idm-surface-3);
    color: var(--idm-ink-2);
    font-family: inherit;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
  }

  .idm-btn:hover {
    background: var(--idm-border);
    color: var(--idm-ink);
    transform: translateY(-1px);
  }

  .idm-btn:active { transform: scale(0.98); }
  .idm-btn:disabled { opacity: 0.48; cursor: not-allowed; pointer-events: none; transform: none; }

  .idm-btn-primary {
    background: var(--idm-tone);
    color: #fff;
    box-shadow: 0 1px 3px color-mix(in srgb, var(--idm-tone), transparent 70%);
  }

  .idm-btn-primary:hover {
    color: #fff;
    background: var(--idm-tone);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--idm-tone), transparent 72%);
  }

  .idm-btn-success {
    background: var(--idm-success);
    color: #fff;
  }

  .idm-btn-danger {
    background: var(--idm-danger);
    color: #fff;
  }

  .idm-btn-info {
    background: var(--idm-info);
    color: #fff;
  }

  .idm-form-panel {
    margin-top: 13px;
    padding: 14px;
    background: var(--idm-surface-2);
    border: 1px solid var(--idm-border);
    border-radius: var(--idm-radius-sm);
  }

  .idm-form-label {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
    color: var(--idm-ink-2);
    font-size: 12px;
    font-weight: 850;
  }

  .idm-textarea {
    width: 100%;
    min-height: 120px;
    resize: vertical;
    background: var(--idm-surface-3);
    border: 1px solid var(--idm-border);
    border-radius: 13px;
    padding: 12px 13px;
    color: var(--idm-ink);
    font-family: inherit;
    font-size: 13px;
    line-height: 1.55;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .idm-textarea:focus {
    border-color: var(--idm-accent);
    box-shadow: 0 0 0 3px var(--idm-accent-soft);
  }

  .idm-textarea::placeholder { color: var(--idm-ink-4); }

  .idm-spinner { animation: idm-spin 0.85s linear infinite; }
  @keyframes idm-spin { to { transform: rotate(360deg); } }

  @media (max-width: 980px) {
    .idm-layout { grid-template-columns: 1fr; }
  }

  @media (max-width: 680px) {
    .idm-backdrop { align-items: stretch; padding: 10px; }
    .idm-modal { max-height: none; height: 100%; border-radius: 18px; }
    .idm-header { grid-template-columns: 1fr; padding: 20px; }
    .idm-header-actions { justify-content: space-between; }
    .idm-content { padding: 16px; }
    .idm-fact { flex-direction: column; gap: 4px; }
    .idm-fact-value { text-align: left; }
    .idm-btn-row { flex-direction: column; align-items: stretch; }
    .idm-btn { width: 100%; }
  }
`;

const getStatusKey = (status: string) => status.toLowerCase();

const getStatusLabel = (status: string) => status.replace(/_/g, ' ');

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'RESOLVED': return CheckCircle;
    case 'DISMISSED': return XCircle;
    case 'INVESTIGATING': return FileSearch;
    case 'PENDING_APPROVAL': return Gavel;
    case 'ASSIGNED': return ClipboardCheck;
    case 'OPEN':
    default:
      return AlertTriangle;
  }
};

const formatDateTime = (date?: string) => {
  if (!date) return 'Not recorded';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Not recorded';
  return parsed.toLocaleString();
};

const IncidentDetailsModal: React.FC<IncidentDetailsModalProps> = ({
  show,
  onHide,
  incident,
  onUpdate,
  isAdmin = false,
}) => {
  const [investigationNotes, setInvestigationNotes] = useState(incident.investigation_notes || '');
  const [resolutionNotes, setResolutionNotes] = useState(incident.resolution_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [showInvestigationForm, setShowInvestigationForm] = useState(false);
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  useEffect(() => {
    if (!show) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onHide();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  useEffect(() => {
    setInvestigationNotes(incident.investigation_notes || '');
    setResolutionNotes(incident.resolution_notes || '');
    setShowInvestigationForm(false);
    setShowResolutionForm(false);
  }, [incident.id, incident.investigation_notes, incident.resolution_notes]);

  const StatusIcon = getStatusIcon(incident.status);
  const statusKey = getStatusKey(incident.status);

  const workflowSteps = useMemo(() => {
    const order = ['OPEN', 'INVESTIGATING', 'PENDING_APPROVAL', 'RESOLVED'];
    const currentIndex = incident.status === 'DISMISSED'
      ? 3
      : Math.max(order.indexOf(incident.status), 0);

    return [
      { status: 'OPEN', title: 'Reported', text: 'Incident captured and awaiting review.', icon: AlertTriangle },
      { status: 'INVESTIGATING', title: 'Investigation', text: 'Evidence and statements are reviewed.', icon: FileSearch },
      { status: 'PENDING_APPROVAL', title: 'Decision review', text: 'Resolution is prepared for final action.', icon: Scale },
      { status: incident.status === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED', title: incident.status === 'DISMISSED' ? 'Dismissed' : 'Resolved', text: 'Case outcome is recorded in the audit trail.', icon: incident.status === 'DISMISSED' ? XCircle : CheckCircle },
    ].map((step, index) => ({
      ...step,
      complete: index < currentIndex || ['RESOLVED', 'DISMISSED'].includes(incident.status),
      active: step.status === incident.status || (incident.status === 'ASSIGNED' && step.status === 'OPEN'),
    }));
  }, [incident.status]);

  const handleStartInvestigation = async () => {
    if (!investigationNotes.trim()) {
      toast.error('Please enter investigation notes');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await internshipService.startIncidentInvestigation(
        incident.application,
        incident.id,
        investigationNotes
      );
      onUpdate(updated);
      toast.success('Investigation started');
      setShowInvestigationForm(false);
    } catch (err: any) {
      console.error('Failed to start investigation', err);
      toast.error(err.message || 'Failed to start investigation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveIncident = async (resolution: 'RESOLVED' | 'DISMISSED') => {
    if (!resolutionNotes.trim()) {
      toast.error('Please enter resolution notes');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await internshipService.resolveIncident(
        incident.application,
        incident.id,
        resolution,
        resolutionNotes
      );
      onUpdate(updated);
      toast.success(`Incident ${resolution.toLowerCase()}`);
      setShowResolutionForm(false);
      onHide();
    } catch (err: any) {
      console.error('Failed to resolve incident', err);
      toast.error(err.message || 'Failed to resolve incident');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="idm-backdrop" role="dialog" aria-modal="true" aria-labelledby="incident-details-title">
        <div className={`idm-modal ${statusKey}`}>
          <header className="idm-header">
            <div className="idm-title-block">
              <div className="idm-icon-shell">
                <StatusIcon size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="idm-eyebrow">
                  <ShieldAlert size={12} />
                  Incident case review
                </div>
                <h2 id="incident-details-title" className="idm-title">{incident.title}</h2>
                <p className="idm-subtitle">
                  Review the incident record, evidence trail, investigation notes, and case outcome.
                </p>
              </div>
            </div>

            <div className="idm-header-actions">
              <span className="idm-status-pill">
                <StatusIcon size={13} />
                {getStatusLabel(incident.status)}
              </span>
              <button type="button" className="idm-close" onClick={onHide} aria-label="Close incident details">
                <X size={16} />
              </button>
            </div>
          </header>

          <main className="idm-content">
            <div className="idm-layout">
              <section className="idm-main">
                <article className="idm-card">
                  <div className="idm-card-head">
                    <div>
                      <div className="idm-card-label">Incident statement</div>
                      <h3 className="idm-card-title">Reported issue</h3>
                    </div>
                    <AlertTriangle size={18} style={{ color: 'var(--idm-tone)' }} />
                  </div>
                  <div className="idm-card-body">
                    <p className="idm-description">{incident.description}</p>
                  </div>
                </article>

                {(incident.status === 'INVESTIGATING' || incident.investigation_notes) && (
                  <article className="idm-note-card info">
                    <h4 className="idm-note-title">
                      <FileSearch size={16} />
                      Investigation notes
                    </h4>
                    <p className="idm-note-text">{incident.investigation_notes || 'No investigation notes recorded yet.'}</p>
                  </article>
                )}

                {(incident.status === 'RESOLVED' || incident.status === 'DISMISSED') && (
                  <article className={`idm-note-card ${incident.status === 'RESOLVED' ? 'success' : 'muted'}`}>
                    <h4 className="idm-note-title">
                      {incident.status === 'RESOLVED' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      Resolution notes
                    </h4>
                    <p className="idm-note-text">{incident.resolution_notes || 'No resolution notes recorded.'}</p>
                    {incident.resolved_at && (
                      <p className="idm-note-text" style={{ marginTop: 8, fontSize: 12 }}>
                        Finalized: {formatDateTime(incident.resolved_at)}
                      </p>
                    )}
                  </article>
                )}

                <article className="idm-card">
                  <div className="idm-card-head">
                    <div>
                      <div className="idm-card-label">Evidence ledger</div>
                      <h3 className="idm-card-title">Audit trail</h3>
                    </div>
                    <ShieldCheck size={18} style={{ color: 'var(--idm-success)' }} />
                  </div>
                  <div className="idm-card-body">
                    <IncidentAuditTrail incident={incident} />
                  </div>
                </article>
              </section>

              <aside className="idm-side">
                <article className="idm-card">
                  <div className="idm-card-head">
                    <div>
                      <div className="idm-card-label">Case facts</div>
                      <h3 className="idm-card-title">Incident context</h3>
                    </div>
                  </div>
                  <div className="idm-card-body">
                    <div className="idm-facts">
                      <div className="idm-fact">
                        <span className="idm-fact-label"><Clock size={13} /> Reported</span>
                        <span className="idm-fact-value">{formatDateTime(incident.created_at)}</span>
                      </div>
                      <div className="idm-fact">
                        <span className="idm-fact-label"><User size={13} /> Student</span>
                        <span className="idm-fact-value">{incident.student_info?.name || 'Unknown'}</span>
                      </div>
                      <div className="idm-fact">
                        <span className="idm-fact-label"><ClipboardCheck size={13} /> Internship</span>
                        <span className="idm-fact-value">{incident.internship_title || 'N/A'}</span>
                      </div>
                      <div className="idm-fact">
                        <span className="idm-fact-label"><Scale size={13} /> Status</span>
                        <span className="idm-fact-value">{getStatusLabel(incident.status)}</span>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="idm-card">
                  <div className="idm-card-head">
                    <div>
                      <div className="idm-card-label">Workflow</div>
                      <h3 className="idm-card-title">Case progression</h3>
                    </div>
                  </div>
                  <div className="idm-card-body">
                    <div className="idm-workflow">
                      {workflowSteps.map((step) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.title} className={`idm-step${step.active ? ' active' : ''}${step.complete ? ' complete' : ''}`}>
                            <div className="idm-step-icon">
                              {step.complete ? <CheckCircle size={15} /> : <Icon size={15} />}
                            </div>
                            <div>
                              <p className="idm-step-title">{step.title}</p>
                              <p className="idm-step-text">{step.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </article>

                {isAdmin && !['RESOLVED', 'DISMISSED'].includes(incident.status) && (
                  <article className="idm-action-panel">
                    <h4 className="idm-action-title">
                      <Sparkles size={15} />
                      Admin action
                    </h4>

                    {incident.status === 'OPEN' && !showInvestigationForm && !showResolutionForm && (
                      <>
                        <p className="idm-action-text">
                          Start an investigation to record evidence, review the student context, and prepare a defensible case outcome.
                        </p>
                        <div className="idm-btn-row">
                          <button type="button" className="idm-btn idm-btn-info" onClick={() => setShowInvestigationForm(true)}>
                            <FileSearch size={14} />
                            Start investigation
                          </button>
                        </div>
                      </>
                    )}

                    {incident.status === 'INVESTIGATING' && !showResolutionForm && !showInvestigationForm && (
                      <>
                        <p className="idm-action-text">
                          Document the outcome after reviewing evidence. Resolution notes should be specific enough for audit review.
                        </p>
                        <div className="idm-btn-row">
                          <button type="button" className="idm-btn idm-btn-primary" onClick={() => setShowResolutionForm(true)}>
                            <Gavel size={14} />
                            Propose resolution
                          </button>
                        </div>
                      </>
                    )}

                    {showInvestigationForm && (
                      <div className="idm-form-panel">
                        <label className="idm-form-label" htmlFor="investigation-notes">
                          <MessageSquareText size={14} />
                          Investigation notes
                        </label>
                        <textarea
                          id="investigation-notes"
                          className="idm-textarea"
                          value={investigationNotes}
                          onChange={(event) => setInvestigationNotes(event.target.value)}
                          placeholder="Record what was reviewed, who was contacted, what evidence exists, and what remains unclear..."
                          disabled={submitting}
                        />
                        <div className="idm-btn-row" style={{ marginTop: 10 }}>
                          <button type="button" className="idm-btn" onClick={() => setShowInvestigationForm(false)} disabled={submitting}>
                            Cancel
                          </button>
                          <button type="button" className="idm-btn idm-btn-info" onClick={handleStartInvestigation} disabled={submitting || !investigationNotes.trim()}>
                            {submitting ? <Loader size={14} className="idm-spinner" /> : <FileSearch size={14} />}
                            Start investigation
                          </button>
                        </div>
                      </div>
                    )}

                    {showResolutionForm && (
                      <div className="idm-form-panel">
                        <label className="idm-form-label" htmlFor="resolution-notes">
                          <Gavel size={14} />
                          Resolution notes
                        </label>
                        <textarea
                          id="resolution-notes"
                          className="idm-textarea"
                          value={resolutionNotes}
                          onChange={(event) => setResolutionNotes(event.target.value)}
                          placeholder="Summarize findings, evidence reviewed, decision rationale, and required follow-up..."
                          disabled={submitting}
                        />
                        <div className="idm-btn-row" style={{ marginTop: 10 }}>
                          <button type="button" className="idm-btn" onClick={() => setShowResolutionForm(false)} disabled={submitting}>
                            Cancel
                          </button>
                          <button type="button" className="idm-btn idm-btn-danger" onClick={() => handleResolveIncident('DISMISSED')} disabled={submitting || !resolutionNotes.trim()}>
                            {submitting ? <Loader size={14} className="idm-spinner" /> : <XCircle size={14} />}
                            Dismiss
                          </button>
                          <button type="button" className="idm-btn idm-btn-success" onClick={() => handleResolveIncident('RESOLVED')} disabled={submitting || !resolutionNotes.trim()}>
                            {submitting ? <Loader size={14} className="idm-spinner" /> : <CheckCircle size={14} />}
                            Resolve
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )}

                {isAdmin && ['RESOLVED', 'DISMISSED'].includes(incident.status) && (
                  <article className="idm-note-card success">
                    <h4 className="idm-note-title">
                      <ShieldCheck size={16} />
                      Case finalized
                    </h4>
                    <p className="idm-note-text">
                      This incident has a recorded outcome. Any future corrections should be handled as a new audit event, not a silent edit.
                    </p>
                  </article>
                )}
              </aside>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default IncidentDetailsModal;
