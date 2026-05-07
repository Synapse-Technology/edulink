import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Loader,
  MapPin,
  Maximize2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { DocumentPreviewModal } from '../../components/common';
import { internshipService } from '../../services/internship/internshipService';
import { showToast } from '../../utils/toast';
import type { InternshipApplication } from '../../services/internship/internshipService';
import { useTheme } from '../../contexts/ThemeContext';
import InternshipLifecyclePanel from '../../components/internship/InternshipLifecyclePanel';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';

/* ─────────────────────────────────────────────
   Design tokens — unified with StudentApplications
───────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  :root {
    --ink: #0d0f12;
    --ink-2: #3a3d44;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --surface-4: #ffffff;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent: #1a5cff;
    --accent-2: #e8eeff;
    --accent-soft: rgba(26,92,255,0.08);
    --success: #12b76a;
    --success-soft: rgba(18,183,106,0.10);
    --warning: #f59e0b;
    --warning-soft: rgba(245,158,11,0.10);
    --danger: #ef4444;
    --danger-soft: rgba(239,68,68,0.10);
    --info: #0ea5e9;
    --info-soft: rgba(14,165,233,0.10);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.05);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .dark-mode {
    --ink: #f0ede8;
    --ink-2: #c9c4bc;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --surface-4: #181818;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-2: #1a2340;
    --accent-soft: rgba(77,127,255,0.10);
    --success-soft: rgba(18,183,106,0.12);
    --warning-soft: rgba(245,158,11,0.12);
    --danger-soft: rgba(239,68,68,0.12);
    --info-soft: rgba(14,165,233,0.12);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.30);
    --shadow: 0 4px 16px rgba(0,0,0,0.30);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.40);
  }

  .sad-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  .sad-back-row {
    padding-top: 24px;
    margin-bottom: -18px;
  }

  .sad-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    text-decoration: none;
    border: 1px solid var(--border);
    background: var(--surface-2);
    border-radius: 999px;
    padding: 8px 13px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.12s;
  }

  .sad-back-btn:hover {
    color: var(--ink);
    background: var(--surface-3);
    transform: translateY(-1px);
  }

  /* ── Hero ── */
  .sad-hero {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 32px;
    align-items: stretch;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 28px;
    animation: sad-fade-up 0.45s ease both;
  }

  @keyframes sad-fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .sad-hero-copy {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .sad-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .sad-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.9rem);
    font-weight: 400;
    line-height: 1.08;
    color: var(--ink);
    margin: 0 0 10px;
  }

  .sad-hero-title em {
    font-style: italic;
    color: var(--ink-3);
  }

  .sad-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 650px;
    line-height: 1.65;
    margin: 0 0 22px;
  }

  .sad-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 13px;
    color: var(--ink-3);
  }

  .sad-hero-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .sad-status-card {
    background: linear-gradient(135deg, var(--surface-2), var(--accent-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 225px;
    box-shadow: var(--shadow-sm);
  }

  .sad-status-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 22px rgba(26,92,255,0.22);
  }

  .sad-status-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .sad-status-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 10px;
  }

  .sad-status-note {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.55;
    margin: 16px 0 0;
  }

  /* ── Buttons ── */
  .sad-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius);
    padding: 10px 16px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s, background 0.15s;
    white-space: nowrap;
    text-decoration: none;
  }

  .sad-btn:active { transform: scale(0.98); }
  .sad-btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

  .sad-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25);
  }

  .sad-btn-primary:hover {
    color: #fff;
    box-shadow: 0 4px 16px rgba(26,92,255,0.35);
    transform: translateY(-1px);
  }

  .sad-btn-outline {
    background: transparent;
    color: var(--accent);
    border: 1px solid rgba(26,92,255,0.30);
  }

  .sad-btn-outline:hover {
    color: var(--accent);
    background: var(--accent-soft);
  }

  .sad-btn-danger {
    background: var(--danger);
    color: #fff;
  }

  .sad-btn-danger:hover {
    color: #fff;
    box-shadow: 0 4px 16px rgba(239,68,68,0.25);
    transform: translateY(-1px);
  }

  .sad-btn-danger-soft {
    background: var(--danger-soft);
    color: var(--danger);
    border: 1px solid rgba(239,68,68,0.20);
  }

  .sad-btn-danger-soft:hover {
    color: var(--danger);
    background: rgba(239,68,68,0.16);
  }

  .sad-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
  }

  .sad-btn-ghost:hover {
    color: var(--ink);
    background: var(--border);
  }

  .sad-btn-full { width: 100%; }

  /* ── Status ── */
  .sad-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .sad-status-applied { background: var(--warning-soft); color: var(--warning); }
  .sad-status-shortlisted { background: var(--info-soft); color: var(--info); }
  .sad-status-accepted,
  .sad-status-active,
  .sad-status-certified { background: var(--success-soft); color: var(--success); }
  .sad-status-rejected { background: var(--danger-soft); color: var(--danger); }
  .sad-status-withdrawn { background: var(--warning-soft); color: var(--warning); }
  .sad-status-completed { background: var(--surface-3); color: var(--ink-2); }
  .sad-status-default { background: var(--surface-3); color: var(--ink-3); }

  .sad-mini-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    background: var(--success-soft);
    color: var(--success);
  }

  /* ── Progress ── */
  .sad-progress-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px;
    margin-bottom: 22px;
    animation: sad-fade-up 0.45s 0.08s ease both;
  }

  .sad-progress {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px;
  }

  .sad-progress-step {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-4);
    white-space: nowrap;
  }

  .sad-progress-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--surface-2);
    color: var(--ink-4);
    border: 1px solid var(--border-2);
  }

  .sad-progress-step.done { color: var(--success); }
  .sad-progress-step.done .sad-progress-dot {
    background: var(--success-soft);
    border-color: transparent;
    color: var(--success);
  }

  .sad-progress-step.current { color: var(--accent); }
  .sad-progress-step.current .sad-progress-dot {
    background: var(--accent-soft);
    border-color: rgba(26,92,255,0.22);
    color: var(--accent);
  }

  /* ── Layout ── */
  .sad-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 22px;
    align-items: start;
    margin-bottom: 64px;
    animation: sad-fade-up 0.45s 0.12s ease both;
  }

  .sad-main,
  .sad-sidebar {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .sad-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.18s, border-color 0.18s;
  }

  .sad-card:hover {
    box-shadow: var(--shadow);
    transform: translateY(-1px);
    border-color: var(--border-2);
  }

  .sad-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sad-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }

  .sad-card-title {
    font-family: var(--font-display);
    font-size: 1.17rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }

  .sad-card-body { padding: 20px 24px; }

  .sad-cover-letter {
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    color: var(--ink-2);
    font-size: 14px;
    line-height: 1.75;
    white-space: pre-wrap;
    margin: 0;
  }

  .sad-package-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sad-package-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 13px 14px;
  }

  .sad-package-left {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .sad-package-icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--accent-soft);
    color: var(--accent);
  }

  .sad-package-label {
    font-size: 12px;
    color: var(--ink-4);
    margin-bottom: 2px;
  }

  .sad-package-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }

  .sad-next-action {
    background: linear-gradient(135deg, var(--accent-soft), var(--surface-3));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 15px;
  }

  .sad-next-action-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 6px;
  }

  .sad-next-action-text {
    font-size: 13px;
    color: var(--ink-2);
    line-height: 1.6;
    margin: 0;
  }

  .sad-facts {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .sad-fact-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
  }

  .sad-fact-row:first-child { padding-top: 0; }
  .sad-fact-row:last-child { border-bottom: none; padding-bottom: 0; }

  .sad-fact-label {
    font-size: 12px;
    color: var(--ink-4);
  }

  .sad-fact-value {
    font-size: 13px;
    color: var(--ink);
    font-weight: 600;
    text-align: right;
  }

  /* ── Loading / empty ── */
  .sad-state {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 56px 24px;
    text-align: center;
    margin-top: 36px;
  }

  .sad-state-icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  .sad-state-title {
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0 0 8px;
  }

  .sad-state-text {
    font-size: 14px;
    color: var(--ink-3);
    line-height: 1.6;
    max-width: 430px;
    margin: 0 auto 22px;
  }

  /* ── Modal ── */
  .sad-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.48);
    backdrop-filter: blur(5px);
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: sad-backdrop-in 0.2s ease;
  }

  @keyframes sad-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .sad-modal {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 480px;
    animation: sad-modal-in 0.22s ease;
  }

  @keyframes sad-modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .sad-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
  }

  .sad-modal-title {
    font-family: var(--font-display);
    font-size: 1.18rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }

  .sad-modal-body { padding: 20px 24px; }

  .sad-modal-text {
    font-size: 14px;
    color: var(--ink-3);
    line-height: 1.6;
    margin: 0 0 16px;
  }

  .sad-modal-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-2);
    margin-bottom: 8px;
  }

  .sad-textarea {
    width: 100%;
    min-height: 120px;
    resize: vertical;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .sad-textarea::placeholder { color: var(--ink-4); }

  .sad-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .sad-modal-footer {
    padding: 16px 24px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  @media (max-width: 1120px) {
    .sad-hero,
    .sad-layout {
      grid-template-columns: 1fr;
    }
    .sad-status-card { max-width: 520px; }
  }

  @media (max-width: 720px) {
    .sad-hero { padding-top: 40px; }
    .sad-progress { grid-template-columns: 1fr; }
    .sad-package-item {
      align-items: flex-start;
      flex-direction: column;
    }
    .sad-fact-row {
      flex-direction: column;
      gap: 4px;
    }
    .sad-fact-value { text-align: left; }
    .sad-modal-footer {
      flex-direction: column-reverse;
    }
    .sad-modal-footer .sad-btn { width: 100%; }
  }
`;

type StatusConfig = {
  className: string;
  icon: React.ElementType;
  label: string;
};

const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case 'APPLIED':
      return { className: 'sad-status-applied', icon: Clock, label: 'Pending Review' };
    case 'SHORTLISTED':
      return { className: 'sad-status-shortlisted', icon: CheckCircle, label: 'Shortlisted' };
    case 'ACCEPTED':
      return { className: 'sad-status-accepted', icon: CheckCircle, label: 'Accepted' };
    case 'WITHDRAWN':
      return { className: 'sad-status-withdrawn', icon: AlertCircle, label: 'Withdrawn' };
    case 'ACTIVE':
      return { className: 'sad-status-active', icon: Briefcase, label: 'Active Internship' };
    case 'REJECTED':
      return { className: 'sad-status-rejected', icon: XCircle, label: 'Not Selected' };
    case 'COMPLETED':
      return { className: 'sad-status-completed', icon: CheckCircle, label: 'Completed' };
    case 'CERTIFIED':
      return { className: 'sad-status-certified', icon: ShieldCheck, label: 'Certified' };
    default:
      return { className: 'sad-status-default', icon: AlertCircle, label: status || 'Unknown' };
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`sad-status-badge ${config.className}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
};

const getProgressIndex = (status: string) => {
  switch (status) {
    case 'APPLIED':
      return 0;
    case 'SHORTLISTED':
      return 2;
    case 'ACCEPTED':
    case 'ACTIVE':
      return 3;
    case 'COMPLETED':
    case 'CERTIFIED':
      return 4;
    case 'REJECTED':
    case 'WITHDRAWN':
      return 1;
    default:
      return 0;
  }
};

const getNextAction = (status: string) => {
  switch (status) {
    case 'APPLIED':
      return 'Your application is in review. Keep your CV, profile, and institution verification ready in case the employer responds.';
    case 'SHORTLISTED':
      return 'You are moving forward. Prepare for an interview, supervisor introduction, or employer follow-up.';
    case 'ACCEPTED':
      return 'Confirm reporting details and prepare to activate your attachment workflow once the employer finalizes placement.';
    case 'ACTIVE':
      return 'Your attachment is active. Keep your logbook updated and preserve evidence for supervisor review.';
    case 'COMPLETED':
      return 'Your attachment is complete. Confirm that employer and institution approvals are captured before certification.';
    case 'CERTIFIED':
      return 'Your certified internship record is complete. You can use this as trusted proof of experience.';
    case 'REJECTED':
      return 'This application did not progress. Review your profile, improve your application package, and target better-fit roles.';
    case 'WITHDRAWN':
      return 'You withdrew this application. Browse verified opportunities when you are ready to continue.';
    default:
      return 'Track this application and follow any instructions from the employer or institution.';
  }
};

const ApplicationProgress = ({ status }: { status: string }) => {
  const steps = ['Applied', 'Review', 'Shortlist', 'Placement', 'Certified'];
  const index = getProgressIndex(status);
  const isNegative = ['REJECTED', 'WITHDRAWN'].includes(status);

  return (
    <div className="sad-progress" aria-label="Application progress">
      {steps.map((step, stepIndex) => {
        const isDone = !isNegative && stepIndex < index;
        const isCurrent = stepIndex === index;
        const shouldShowNegative = isNegative && stepIndex === index;

        return (
          <div
            key={step}
            className={`sad-progress-step${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}
          >
            <span className="sad-progress-dot">
              {isDone ? <Check size={12} /> : shouldShowNegative ? <XCircle size={12} /> : <Circle size={9} />}
            </span>
            <span>{shouldShowNegative ? 'Stopped' : step}</span>
          </div>
        );
      })}
    </div>
  );
};

const formatDate = (date?: string) => {
  if (!date) return 'Unknown date';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getRelativeAppliedTime = (date?: string) => {
  if (!date) return 'Recently';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Recently';

  const diff = Date.now() - parsed.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(date);
};

const StudentApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchApplication(id);
    }
  }, [id]);

  const fetchApplication = async (appId: string) => {
    try {
      setIsLoading(true);
      setApplication(await internshipService.getApplication(appId));
    } catch (error) {
      console.error('Failed to load application:', error);
      showToast.error('We could not load this application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;

    try {
      setIsWithdrawing(true);
      await internshipService.withdrawApplication(application.id, withdrawReason);
      await fetchApplication(application.id);
      setShowWithdrawModal(false);
      setWithdrawReason('');
      showToast.success('Application withdrawn successfully');
    } catch (error: any) {
      console.error('Failed to withdraw application:', error);
      showToast.error(
        getUserFacingErrorMessage(error?.message, error?.status)
        || 'We could not withdraw this application. Please try again.'
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const canWithdraw = application && ['APPLIED', 'SHORTLISTED', 'ACCEPTED'].includes(application.status);

  const employerName = application?.employer_details?.name || 'Unknown Employer';
  const location = useMemo(() => {
    if (!application) return 'Unknown location';
    if (application.location_type === 'ONSITE') return application.location || 'On-site';
    if (application.location_type && application.location) return `${application.location} · ${application.location_type}`;
    return application.location_type || application.location || 'Remote / Flexible';
  }, [application]);

  if (isLoading) {
    return (
      <StudentLayout>
        <style>{STYLES}</style>
        <div className={`sad-page${isDarkMode ? ' dark-mode' : ''}`}>
          <div className="sad-state">
            <div className="sad-state-icon"><Loader size={26} /></div>
            <h2 className="sad-state-title">Loading application</h2>
            <p className="sad-state-text">Fetching the employer details, documents, and lifecycle status.</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!application) {
    return (
      <StudentLayout>
        <style>{STYLES}</style>
        <div className={`sad-page${isDarkMode ? ' dark-mode' : ''}`}>
          <div className="sad-state">
            <div className="sad-state-icon"><AlertCircle size={26} /></div>
            <h2 className="sad-state-title">Application not found</h2>
            <p className="sad-state-text">
              We could not find this application or you may no longer have access to it.
            </p>
            <button className="sad-btn sad-btn-primary" onClick={() => navigate('/dashboard/student/applications')}>
              Back to Applications <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`sad-page${isDarkMode ? ' dark-mode' : ''}`}>
        <div className="sad-back-row">
          <button className="sad-back-btn" onClick={() => navigate('/dashboard/student/applications')}>
            <ArrowLeft size={15} />
            Back to applications
          </button>
        </div>

        <section className="sad-hero">
          <div className="sad-hero-copy">
            <div className="sad-eyebrow">
              <Sparkles size={12} />
              EduLink · Application detail
            </div>
            <h1 className="sad-hero-title">
              {application.title} <em>application</em>
            </h1>
            <p className="sad-hero-sub">
              Review the employer, submitted package, cover letter, and lifecycle status connected to this opportunity.
            </p>
            <div className="sad-hero-meta">
              <span><Building2 size={14} /> {employerName}</span>
              <span><MapPin size={14} /> {location}</span>
              <span><Calendar size={14} /> Applied {getRelativeAppliedTime(application.created_at)}</span>
            </div>
          </div>

          <aside className="sad-status-card">
            <div>
              <div className="sad-status-top">
                <div>
                  <div className="sad-status-label">Current status</div>
                  <StatusBadge status={application.status} />
                </div>
                <div className="sad-status-icon">
                  <Briefcase size={20} />
                </div>
              </div>
              <p className="sad-status-note">{getNextAction(application.status)}</p>
            </div>

            {canWithdraw && (
              <button className="sad-btn sad-btn-danger-soft" onClick={() => setShowWithdrawModal(true)}>
                <Trash2 size={15} />
                Withdraw application
              </button>
            )}
          </aside>
        </section>

        <section className="sad-progress-card">
          <ApplicationProgress status={application.status} />
        </section>

        <div className="sad-layout">
          <main className="sad-main">
            <section className="sad-card">
              <div className="sad-card-header">
                <div>
                  <div className="sad-card-label">Lifecycle</div>
                  <h2 className="sad-card-title">Application movement</h2>
                </div>
                <span className="sad-mini-badge"><ShieldCheck size={11} /> Tracked record</span>
              </div>
              <div className="sad-card-body">
                <InternshipLifecyclePanel application={application} roleView="student" dark={isDarkMode} compact />
              </div>
            </section>

            <section className="sad-card">
              <div className="sad-card-header">
                <div>
                  <div className="sad-card-label">Submitted message</div>
                  <h2 className="sad-card-title">Cover letter</h2>
                </div>
                <MessageCircle size={19} style={{ color: 'var(--ink-4)' }} />
              </div>
              <div className="sad-card-body">
                <p className="sad-cover-letter">
                  {application.cover_letter || 'No cover letter submitted.'}
                </p>
              </div>
            </section>
          </main>

          <aside className="sad-sidebar">
            <section className="sad-card">
              <div className="sad-card-header">
                <div>
                  <div className="sad-card-label">Package</div>
                  <h2 className="sad-card-title">Application package</h2>
                </div>
                <FileText size={19} style={{ color: 'var(--ink-4)' }} />
              </div>
              <div className="sad-card-body">
                <div className="sad-package-list">
                  <div className="sad-package-item">
                    <div className="sad-package-left">
                      <div className="sad-package-icon"><Briefcase size={16} /></div>
                      <div>
                        <div className="sad-package-label">Department</div>
                        <div className="sad-package-value">{application.department || 'General'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="sad-package-item">
                    <div className="sad-package-left">
                      <div className="sad-package-icon"><FileText size={16} /></div>
                      <div>
                        <div className="sad-package-label">Submitted CV</div>
                        <div className="sad-package-value">
                          {application.application_snapshot?.cv ? 'Snapshot available' : 'No CV snapshot found'}
                        </div>
                      </div>
                    </div>

                    {application.application_snapshot?.cv && (
                      <button
                        className="sad-btn sad-btn-outline"
                        onClick={() => {
                          setPreviewTitle('CV / Resume');
                          setPreviewUrl(application.application_snapshot?.cv || null);
                          setPreviewOpen(true);
                        }}
                      >
                        Preview <Maximize2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="sad-card">
              <div className="sad-card-header">
                <div>
                  <div className="sad-card-label">Summary</div>
                  <h2 className="sad-card-title">Application facts</h2>
                </div>
              </div>
              <div className="sad-card-body">
                <div className="sad-facts">
                  <div className="sad-fact-row">
                    <span className="sad-fact-label">Employer</span>
                    <span className="sad-fact-value">{employerName}</span>
                  </div>
                  <div className="sad-fact-row">
                    <span className="sad-fact-label">Location</span>
                    <span className="sad-fact-value">{location}</span>
                  </div>
                  <div className="sad-fact-row">
                    <span className="sad-fact-label">Submitted</span>
                    <span className="sad-fact-value">{formatDate(application.created_at)}</span>
                  </div>
                  <div className="sad-fact-row">
                    <span className="sad-fact-label">Status</span>
                    <span className="sad-fact-value">{getStatusConfig(application.status).label}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="sad-card">
              <div className="sad-card-header">
                <div>
                  <div className="sad-card-label">Support</div>
                  <h2 className="sad-card-title">Need help?</h2>
                </div>
              </div>
              <div className="sad-card-body">
                <div className="sad-next-action" style={{ marginBottom: 14 }}>
                  <div className="sad-next-action-label">
                    <AlertCircle size={12} />
                    Use support carefully
                  </div>
                  <p className="sad-next-action-text">
                    Contact support only when the status, documents, or employer information appears incorrect.
                  </p>
                </div>
                <button className="sad-btn sad-btn-outline sad-btn-full">
                  Contact Support <ChevronRight size={15} />
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showWithdrawModal && (
        <div className="sad-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="withdraw-application-title">
          <div className="sad-modal">
            <div className="sad-modal-header">
              <h2 id="withdraw-application-title" className="sad-modal-title">Withdraw application</h2>
              <button
                type="button"
                className="sad-btn sad-btn-ghost"
                style={{ padding: 8 }}
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawReason('');
                }}
                disabled={isWithdrawing}
                aria-label="Close withdrawal modal"
              >
                <X size={15} />
              </button>
            </div>

            <div className="sad-modal-body">
              <p className="sad-modal-text">
                Withdrawing removes you from consideration for this opportunity. This action is serious,
                so only continue if you are certain.
              </p>
              <label className="sad-modal-label" htmlFor="withdraw-reason">
                Reason for withdrawal optional
              </label>
              <textarea
                id="withdraw-reason"
                className="sad-textarea"
                placeholder="Tell us why you're withdrawing..."
                value={withdrawReason}
                onChange={(event) => setWithdrawReason(event.target.value)}
                disabled={isWithdrawing}
              />
            </div>

            <div className="sad-modal-footer">
              <button
                type="button"
                className="sad-btn sad-btn-ghost"
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawReason('');
                }}
                disabled={isWithdrawing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sad-btn sad-btn-danger"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? <><Loader size={14} /> Withdrawing...</> : <><Trash2 size={14} /> Withdraw application</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
      />
    </StudentLayout>
  );
};

export default StudentApplicationDetail;
