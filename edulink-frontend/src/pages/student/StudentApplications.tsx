import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Filter,
  Loader,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePusher } from '../../hooks/usePusher';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { showToast } from '../../utils/toast';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { studentService } from '../../services/student/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import StudentApplicationsSkeleton from '../../components/student/skeletons/StudentApplicationsSkeleton';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';

/* ─────────────────────────────────────────────
   Design tokens — unified with StudentAffiliation
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

  .sap-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  .sap-back-row {
    padding-top: 24px;
    margin-bottom: -18px;
  }

  .sap-back-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    text-decoration: none;
    border: 1px solid var(--border);
    background: var(--surface-2);
    border-radius: 999px;
    padding: 8px 13px;
    transition: background 0.15s, color 0.15s, transform 0.12s;
  }

  .sap-back-link:hover {
    color: var(--ink);
    background: var(--surface-3);
    transform: translateY(-1px);
  }

  /* ── Hero ── */
  .sap-hero {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 32px;
    align-items: stretch;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 28px;
    animation: sap-fade-up 0.45s ease both;
  }

  @keyframes sap-fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .sap-hero-copy {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .sap-eyebrow {
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

  .sap-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.9rem);
    font-weight: 400;
    line-height: 1.08;
    color: var(--ink);
    margin: 0 0 10px;
  }

  .sap-hero-title em {
    font-style: italic;
    color: var(--ink-3);
  }

  .sap-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 610px;
    line-height: 1.65;
    margin: 0 0 22px;
  }

  .sap-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 13px;
    color: var(--ink-3);
  }

  .sap-hero-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .sap-pipeline-card {
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

  .sap-pipeline-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .sap-pipeline-icon {
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

  .sap-pipeline-number {
    font-family: var(--font-display);
    font-size: 3rem;
    line-height: 1;
    font-weight: 400;
    color: var(--ink);
    margin-top: 20px;
  }

  .sap-pipeline-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 8px;
  }

  .sap-pipeline-note {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.55;
    margin: 0 0 16px;
  }

  .sap-btn {
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

  .sap-btn:active { transform: scale(0.98); }

  .sap-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25);
  }

  .sap-btn-primary:hover {
    color: #fff;
    box-shadow: 0 4px 16px rgba(26,92,255,0.35);
    transform: translateY(-1px);
  }

  .sap-btn-outline {
    background: transparent;
    color: var(--accent);
    border: 1px solid rgba(26,92,255,0.30);
  }

  .sap-btn-outline:hover {
    color: var(--accent);
    background: var(--accent-soft);
  }

  /* ── Metrics ── */
  .sap-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 24px;
    animation: sap-fade-up 0.45s 0.08s ease both;
  }

  .sap-metric-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 92px;
  }

  .sap-metric-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sap-metric-icon.blue { background: var(--accent-soft); color: var(--accent); }
  .sap-metric-icon.green { background: var(--success-soft); color: var(--success); }
  .sap-metric-icon.orange { background: var(--warning-soft); color: var(--warning); }
  .sap-metric-icon.sky { background: var(--info-soft); color: var(--info); }

  .sap-metric-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 4px;
  }

  .sap-metric-value {
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1;
  }

  /* ── Controls ── */
  .sap-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
    animation: sap-fade-up 0.45s 0.12s ease both;
  }

  .sap-filter-chips {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sap-chip {
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--ink-3);
    border-radius: 999px;
    padding: 8px 13px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.12s;
  }

  .sap-chip:hover {
    color: var(--ink);
    background: var(--surface-3);
  }

  .sap-chip.active {
    color: #fff;
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 4px 16px rgba(26,92,255,0.22);
  }

  .sap-search-wrap {
    position: relative;
    width: min(360px, 100%);
    flex-shrink: 0;
  }

  .sap-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-4);
    pointer-events: none;
  }

  .sap-input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 11px 14px 11px 42px;
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    box-sizing: border-box;
  }

  .sap-input::placeholder { color: var(--ink-4); }

  .sap-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
    background: var(--surface-3);
  }

  /* ── Alerts ── */
  .sap-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.55;
    margin-bottom: 18px;
  }

  .sap-banner.warning {
    background: var(--warning-soft);
    color: var(--ink-2);
    border: 1px solid rgba(245,158,11,0.18);
  }

  .sap-banner.danger {
    background: var(--danger-soft);
    color: var(--ink-2);
    border: 1px solid rgba(239,68,68,0.18);
  }

  .sap-banner-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .sap-banner.warning .sap-banner-icon { color: var(--warning); }
  .sap-banner.danger .sap-banner-icon { color: var(--danger); }

  /* ── Application cards ── */
  .sap-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 64px;
    animation: sap-fade-up 0.45s 0.16s ease both;
  }

  .sap-application-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.18s, border-color 0.18s;
  }

  .sap-application-card:hover {
    box-shadow: var(--shadow);
    transform: translateY(-1px);
    border-color: var(--border-2);
  }

  .sap-card-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 250px;
    gap: 22px;
    padding: 22px 24px;
  }

  .sap-card-head {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 16px;
  }

  .sap-employer-logo {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid rgba(26,92,255,0.10);
  }

  .sap-employer-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sap-company-line {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .sap-company-name {
    font-size: 13px;
    color: var(--ink-3);
    font-weight: 600;
  }

  .sap-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 7px;
    line-height: 1.25;
  }

  .sap-subtitle {
    font-size: 13px;
    color: var(--ink-3);
    margin: 0;
  }

  .sap-meta-grid {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-bottom: 18px;
  }

  .sap-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--ink-3);
  }

  .sap-progress {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px;
  }

  .sap-progress-step {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-4);
    white-space: nowrap;
  }

  .sap-progress-dot {
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

  .sap-progress-step.done {
    color: var(--success);
  }

  .sap-progress-step.done .sap-progress-dot {
    background: var(--success-soft);
    border-color: transparent;
    color: var(--success);
  }

  .sap-progress-step.current {
    color: var(--accent);
  }

  .sap-progress-step.current .sap-progress-dot {
    background: var(--accent-soft);
    border-color: rgba(26,92,255,0.22);
    color: var(--accent);
  }

  .sap-side-panel {
    border-left: 1px solid var(--border);
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
  }

  .sap-side-top {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .sap-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .sap-status-applied { background: var(--accent-soft); color: var(--accent); }
  .sap-status-shortlisted { background: var(--info-soft); color: var(--info); }
  .sap-status-accepted,
  .sap-status-active,
  .sap-status-certified { background: var(--success-soft); color: var(--success); }
  .sap-status-rejected { background: var(--danger-soft); color: var(--danger); }
  .sap-status-withdrawn { background: var(--warning-soft); color: var(--warning); }
  .sap-status-completed { background: var(--surface-3); color: var(--ink-2); }
  .sap-status-default { background: var(--surface-3); color: var(--ink-3); }

  .sap-mini-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }

  .sap-mini-badge.trust {
    background: var(--success-soft);
    color: var(--success);
  }

  .sap-mini-badge.closed {
    background: var(--warning-soft);
    color: var(--warning);
  }

  .sap-next-action {
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
  }

  .sap-next-action-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 5px;
  }

  .sap-next-action-text {
    font-size: 12px;
    color: var(--ink-2);
    line-height: 1.5;
    margin: 0;
  }

  .sap-card-actions {
    display: flex;
    justify-content: flex-end;
  }

  /* ── Empty state ── */
  .sap-empty {
    background: var(--surface-2);
    border: 1px dashed var(--border-2);
    border-radius: var(--radius-lg);
    padding: 56px 24px;
    text-align: center;
    margin-bottom: 64px;
  }

  .sap-empty-icon {
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

  .sap-empty-title {
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0 0 8px;
  }

  .sap-empty-text {
    font-size: 14px;
    color: var(--ink-3);
    line-height: 1.6;
    max-width: 430px;
    margin: 0 auto 22px;
  }

  /* ── Responsive ── */
  @media (max-width: 1180px) {
    .sap-hero { grid-template-columns: 1fr; }
    .sap-pipeline-card { max-width: 520px; }
    .sap-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 920px) {
    .sap-controls {
      align-items: stretch;
      flex-direction: column;
    }
    .sap-search-wrap { width: 100%; }
    .sap-card-main { grid-template-columns: 1fr; }
    .sap-side-panel {
      border-left: none;
      border-top: 1px solid var(--border);
      padding-left: 0;
      padding-top: 18px;
    }
    .sap-card-actions { justify-content: flex-start; }
  }

  @media (max-width: 680px) {
    .sap-hero { padding-top: 40px; }
    .sap-metrics { grid-template-columns: 1fr; }
    .sap-card-main { padding: 18px; }
    .sap-card-head { align-items: flex-start; }
    .sap-progress {
      grid-template-columns: 1fr;
      gap: 7px;
    }
    .sap-progress-step {
      justify-content: flex-start;
    }
  }
`;

type ApplicationFilter = 'ALL' | 'ACTIVE' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'SUCCESSFUL' | 'REJECTED';

type StatusConfig = {
  className: string;
  icon: React.ElementType;
  label: string;
};

const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case 'APPLIED':
      return { className: 'sap-status-applied', icon: Clock, label: 'Applied' };
    case 'SHORTLISTED':
      return { className: 'sap-status-shortlisted', icon: CheckCircle, label: 'Shortlisted' };
    case 'ACCEPTED':
      return { className: 'sap-status-accepted', icon: CheckCircle, label: 'Accepted' };
    case 'REJECTED':
      return { className: 'sap-status-rejected', icon: XCircle, label: 'Rejected' };
    case 'WITHDRAWN':
      return { className: 'sap-status-withdrawn', icon: AlertCircle, label: 'Withdrawn' };
    case 'ACTIVE':
      return { className: 'sap-status-active', icon: Briefcase, label: 'Active' };
    case 'COMPLETED':
      return { className: 'sap-status-completed', icon: CheckCircle, label: 'Completed' };
    case 'CERTIFIED':
      return { className: 'sap-status-certified', icon: ShieldCheck, label: 'Certified' };
    default:
      return { className: 'sap-status-default', icon: AlertCircle, label: status || 'Unknown' };
  }
};

const ApplicationStatusBadge = ({ status }: { status: string }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`sap-status-badge ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const OpportunityClosedBadge = () => (
  <span className="sap-mini-badge closed">
    <Clock size={11} />
    Applications closed
  </span>
);

const EmployerTrustBadge = () => (
  <span className="sap-mini-badge trust">
    <ShieldCheck size={11} />
    Verified employer
  </span>
);

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
      return 'Application submitted. Keep your profile and documents ready while the employer reviews candidates.';
    case 'SHORTLISTED':
      return 'You are moving forward. Prepare your CV, availability, and institution documents for the next review step.';
    case 'ACCEPTED':
      return 'Placement offer received. Confirm reporting details and prepare to activate your attachment workflow.';
    case 'ACTIVE':
      return 'Attachment is active. Keep logbook entries updated and submit evidence consistently.';
    case 'COMPLETED':
      return 'Attachment completed. Check whether supervisor and institution approvals are fully captured.';
    case 'CERTIFIED':
      return 'Certified record complete. You can use this as trusted proof of internship experience.';
    case 'REJECTED':
      return 'This application did not progress. Review your profile and apply to better-matched opportunities.';
    case 'WITHDRAWN':
      return 'You withdrew this application. Browse active opportunities when ready to continue.';
    default:
      return 'Track this application and follow any instructions from the employer or institution.';
  }
};

const isOpportunityClosed = (app: any) => (
  app.status === 'OPEN'
  || (typeof app.opportunity === 'object' && !app.opportunity?.status)
  || (typeof app.opportunity === 'object' && app.opportunity?.status === 'CLOSED')
);

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

const matchesFilter = (app: any, filter: ApplicationFilter) => {
  switch (filter) {
    case 'ACTIVE':
      return ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status);
    case 'UNDER_REVIEW':
      return ['APPLIED'].includes(app.status);
    case 'SHORTLISTED':
      return ['SHORTLISTED'].includes(app.status);
    case 'SUCCESSFUL':
      return ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status);
    case 'REJECTED':
      return ['REJECTED', 'WITHDRAWN'].includes(app.status);
    case 'ALL':
    default:
      return true;
  }
};

const ApplicationProgress = ({ status }: { status: string }) => {
  const steps = ['Applied', 'Review', 'Shortlist', 'Placement', 'Certified'];
  const index = getProgressIndex(status);
  const isNegative = ['REJECTED', 'WITHDRAWN'].includes(status);

  return (
    <div className="sap-progress" aria-label="Application progress">
      {steps.map((step, stepIndex) => {
        const isDone = !isNegative && stepIndex < index;
        const isCurrent = stepIndex === index;
        const shouldShowNegative = isNegative && stepIndex === index;

        return (
          <div
            key={step}
            className={`sap-progress-step${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}
          >
            <span className="sap-progress-dot">
              {isDone ? <Check size={12} /> : shouldShowNegative ? <XCircle size={12} /> : <Circle size={9} />}
            </span>
            <span>{shouldShowNegative ? 'Stopped' : step}</span>
          </div>
        );
      })}
    </div>
  );
};

const ApplicationCard = ({ app }: { app: any }) => {
  const employerName = app.employer_details?.name || 'Unknown Employer';
  const location = app.location || 'Remote';
  const locationType = app.location_type ? ` (${app.location_type})` : '';

  return (
    <article className="sap-application-card">
      <div className="sap-card-main">
        <div>
          <div className="sap-card-head">
            <div className="sap-employer-logo">
              {app.employer_details?.logo ? (
                <img src={app.employer_details.logo} alt={employerName} />
              ) : (
                <Building2 size={21} />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="sap-company-line">
                <span className="sap-company-name">{employerName}</span>
                <EmployerTrustBadge />
                {isOpportunityClosed(app) && <OpportunityClosedBadge />}
              </div>
              <h2 className="sap-title">{app.title}</h2>
              <p className="sap-subtitle">{app.department || 'General Department'}</p>
            </div>
          </div>

          <div className="sap-meta-grid">
            <span className="sap-meta-item">
              <MapPin size={14} />
              {location}{locationType}
            </span>
            <span className="sap-meta-item">
              <Calendar size={14} />
              Applied {getRelativeAppliedTime(app.created_at)}
            </span>
            <span className="sap-meta-item">
              <Clock size={14} />
              {formatDate(app.created_at)}
            </span>
          </div>

          <ApplicationProgress status={app.status} />
        </div>

        <aside className="sap-side-panel">
          <div className="sap-side-top">
            <ApplicationStatusBadge status={app.status} />
            <div className="sap-next-action">
              <div className="sap-next-action-label">
                <Sparkles size={12} />
                Next action
              </div>
              <p className="sap-next-action-text">{getNextAction(app.status)}</p>
            </div>
          </div>

          <div className="sap-card-actions">
            <Link to={`/dashboard/student/applications/${app.id}`} className="sap-btn sap-btn-outline">
              View details <ChevronRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
};

const StudentApplications: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<ApplicationFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { handleError: handleApplicationError } = useErrorHandler({
    onNotFound: () => showToast.error('No applications found'),
    onAuthError: () => showToast.error('Please sign in again to view your applications.'),
    onUnexpected: (error) => showToast.error(
      getUserFacingErrorMessage(error.message) || 'We could not load your applications. Please try again.'
    ),
  });

  const {
    data: applicationsResponse,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ['applications'],
    queryFn: () => studentService.getApplications(),
    staleTime: 1000 * 60 * 5,
  });

  const applications = useMemo(() => (
    Array.isArray(applicationsResponse)
      ? applicationsResponse
      : (applicationsResponse as any)?.results || []
  ), [applicationsResponse]);

  if (isError && error) {
    handleApplicationError(error);
  }

  const handleStatusUpdate = useCallback((data: any) => {
    console.log('Real-time application update:', data);
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  }, [queryClient]);

  const fallbackPollApplications = useCallback(async () => {
    try {
      await studentService.getApplications();
      return null;
    } catch (pollError) {
      console.warn('Fallback poll failed:', pollError);
      return null;
    }
  }, []);

  const { isPolling } = usePusher(
    user ? `user-${user.id}` : undefined,
    'application-status-updated',
    handleStatusUpdate,
    {
      fallbackPoll: fallbackPollApplications,
      fallbackDelay: 10000,
      pollingInterval: 3000,
    }
  );

  const metrics = useMemo(() => {
    const total = applications.length;
    const progressing = applications.filter((app: any) => (
      ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)
    )).length;
    const underReview = applications.filter((app: any) => (
      ['APPLIED', 'SHORTLISTED'].includes(app.status)
    )).length;
    const shortlisted = applications.filter((app: any) => app.status === 'SHORTLISTED').length;
    const accepted = applications.filter((app: any) => (
      ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)
    )).length;
    const responseRate = total > 0 ? Math.round(((shortlisted + accepted) / total) * 100) : 0;

    return { total, progressing, underReview, shortlisted, accepted, responseRate };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return applications.filter((app: any) => {
      const filterMatch = matchesFilter(app, activeFilter);
      if (!normalizedSearch) return filterMatch;

      const searchable = [
        app.title,
        app.department,
        app.location,
        app.location_type,
        app.status,
        app.employer_details?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return filterMatch && searchable.includes(normalizedSearch);
    });
  }, [applications, activeFilter, searchTerm]);

  const filters: { key: ApplicationFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'UNDER_REVIEW', label: 'Under review' },
    { key: 'SHORTLISTED', label: 'Shortlisted' },
    { key: 'SUCCESSFUL', label: 'Successful' },
    { key: 'REJECTED', label: 'Closed' },
  ];

  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`sap-page${isDarkMode ? ' dark-mode' : ''}`}>
        <div className="sap-back-row">
          <Link to="/dashboard/student" className="sap-back-link">
            <ArrowLeft size={15} />
            Student dashboard
          </Link>
        </div>

        <section className="sap-hero">
          <div className="sap-hero-copy">
            <div className="sap-eyebrow">
              <Sparkles size={12} />
              EduLink · Career pipeline
            </div>
            <h1 className="sap-hero-title">
              Application <em>Tracker</em>
            </h1>
            <p className="sap-hero-sub">
              Follow every opportunity from submission to placement decision. Each application now shows status,
              employer trust, timeline progress, and the next action you should take.
            </p>
            <div className="sap-hero-meta">
              <span><Briefcase size={14} /> {metrics.total} applications</span>
              <span><CheckCircle size={14} /> {metrics.progressing} progressing</span>
              <span><Clock size={14} /> {metrics.underReview} under review</span>
            </div>
          </div>

          <aside className="sap-pipeline-card">
            <div>
              <div className="sap-pipeline-top">
                <div>
                  <div className="sap-pipeline-label">Pipeline health</div>
                  <div className="sap-pipeline-number">{metrics.responseRate}%</div>
                </div>
                <div className="sap-pipeline-icon">
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className="sap-pipeline-note">
                Response rate is estimated from applications that reached shortlist, acceptance,
                active placement, completion, or certification.
              </p>
            </div>
            <Link to="/opportunities" className="sap-btn sap-btn-primary">
              Browse verified opportunities <ArrowRight size={15} />
            </Link>
          </aside>
        </section>

        <section className="sap-metrics" aria-label="Application metrics">
          <div className="sap-metric-card">
            <div className="sap-metric-icon blue"><Briefcase size={19} /></div>
            <div>
              <div className="sap-metric-label">Total</div>
              <div className="sap-metric-value">{metrics.total}</div>
            </div>
          </div>
          <div className="sap-metric-card">
            <div className="sap-metric-icon sky"><CheckCircle size={19} /></div>
            <div>
              <div className="sap-metric-label">Shortlisted</div>
              <div className="sap-metric-value">{metrics.shortlisted}</div>
            </div>
          </div>
          <div className="sap-metric-card">
            <div className="sap-metric-icon green"><ShieldCheck size={19} /></div>
            <div>
              <div className="sap-metric-label">Successful</div>
              <div className="sap-metric-value">{metrics.accepted}</div>
            </div>
          </div>
          <div className="sap-metric-card">
            <div className="sap-metric-icon orange"><Clock size={19} /></div>
            <div>
              <div className="sap-metric-label">Reviewing</div>
              <div className="sap-metric-value">{metrics.underReview}</div>
            </div>
          </div>
        </section>

        {isPolling && (
          <div className="sap-banner warning" role="alert">
            <Loader size={15} className="sap-banner-icon" />
            <span>Connection latency detected. Updates may be delayed while we keep checking for changes.</span>
          </div>
        )}

        {loading ? (
          <StudentApplicationsSkeleton isDarkMode={isDarkMode} />
        ) : isError ? (
          <div className="sap-banner danger" role="alert">
            <AlertCircle size={16} className="sap-banner-icon" />
            <span>Failed to load applications. Please try again later.</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="sap-empty">
            <div className="sap-empty-icon"><Briefcase size={26} /></div>
            <h2 className="sap-empty-title">No applications yet</h2>
            <p className="sap-empty-text">
              Start with verified opportunities so your applications, employer responses,
              and attachment journey can be tracked from one place.
            </p>
            <Link to="/opportunities" className="sap-btn sap-btn-primary">
              Browse Opportunities <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <section className="sap-controls" aria-label="Application controls">
              <div className="sap-filter-chips">
                <span className="sap-meta-item" style={{ marginRight: 2 }}>
                  <Filter size={14} /> Filter
                </span>
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`sap-chip${activeFilter === filter.key ? ' active' : ''}`}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="sap-search-wrap">
                <Search size={15} className="sap-search-icon" />
                <input
                  className="sap-input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search employer, role, location..."
                  aria-label="Search applications"
                />
              </div>
            </section>

            {filteredApplications.length === 0 ? (
              <div className="sap-empty">
                <div className="sap-empty-icon"><Search size={26} /></div>
                <h2 className="sap-empty-title">No matching applications</h2>
                <p className="sap-empty-text">
                  Your filter or search is too narrow. Clear the search or switch back to all applications.
                </p>
                <button
                  type="button"
                  className="sap-btn sap-btn-outline"
                  onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                >
                  Reset view
                </button>
              </div>
            ) : (
              <section className="sap-list" aria-label="Tracked applications">
                {filteredApplications.map((app: any) => (
                  <ApplicationCard key={app.id} app={app} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentApplications;
