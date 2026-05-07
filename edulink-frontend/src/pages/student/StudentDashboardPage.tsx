import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Briefcase,
  Calendar,
  FileText,
  User,
  Search,
  Building2,
  ShieldCheck,
  ArrowRight,
  Upload,
  BookOpen,
  MapPin,
  Award,
  Sparkles,
  TrendingUp,
  Layers,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { SEO } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import ProfileWizard from '../../components/student/ProfileWizard';
import { studentService } from '../../services/student/studentService';
import { ledgerService } from '../../services/ledger/ledgerService';
import type { LedgerEvent } from '../../services/ledger/ledgerService';
import type { Affiliation, StudentProfile } from '../../services/student/studentService';
import { normalizeTrustLevel, type StudentTrustState } from '../../services/trust/trustService';
import { internshipService } from '../../services/internship/internshipService';
import type { Internship } from '../../services/internship/internshipService';
import StudentDashboardSkeleton from '../../components/student/skeletons/StudentDashboardSkeleton';

/* ─────────────────────────────────────────────
   Design tokens — shared system
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
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --radius-xl: 28px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;
  }

  .dark-mode {
    --ink: #f0ede8;
    --ink-2: #c9c4bc;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-2: #1a2340;
    --accent-soft: rgba(77,127,255,0.10);
    --success-soft: rgba(18,183,106,0.12);
    --warning-soft: rgba(245,158,11,0.12);
    --danger-soft: rgba(239,68,68,0.12);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.30);
    --shadow: 0 4px 16px rgba(0,0,0,0.30);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.40);
  }

  /* ── Base ── */
  .sd-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ══════════════════════════════════════
     HERO HEADER
  ══════════════════════════════════════ */
  .sd-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }
  .sd-hero-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sd-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .sd-hero-title em { font-style: italic; color: var(--ink-3); }
  .sd-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 460px;
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .sd-hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* Readiness passport card */
  .sd-passport {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    min-width: 200px;
    text-align: center;
  }
  .sd-passport-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .sd-passport-score {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1;
  }
  .sd-passport-sub { font-size: 12px; color: var(--ink-3); max-width: 140px; }

  /* Progress ring */
  .sd-ring-svg { transform: rotate(-90deg); }
  .sd-ring-track { fill: none; stroke: var(--border); stroke-width: 3; }
  .sd-ring-fill {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1);
  }

  /* ══════════════════════════════════════
     METRICS ROW
  ══════════════════════════════════════ */
  .sd-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 40px;
  }
  .sd-metric {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
    text-decoration: none;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    overflow: visible;
  }
  .sd-metric:hover {
    border-color: var(--border-2);
    box-shadow: inset 0 0 0 2px var(--accent), var(--shadow);
    transform: translateY(-2px);
  }
  .sd-metric-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 8px;
  }
  .sd-metric-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .sd-metric-value {
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.2;
  }
  .sd-metric-detail {
    font-size: 12px;
    color: var(--ink-3);
  }

  /* ══════════════════════════════════════
     ONBOARDING CHECKS
  ══════════════════════════════════════ */
  .sd-checks-section {
    margin-bottom: 40px;
  }
  .sd-section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }
  .sd-section-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .sd-section-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }
  .sd-section-sub {
    font-size: 13px;
    color: var(--ink-3);
    margin: 4px 0 0;
  }

  .sd-check-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .sd-check {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
    position: relative;
    overflow: visible;
  }
  .sd-check.complete {
    box-shadow: inset 0 0 0 2px var(--success);
  }
  .sd-check.pending {
    box-shadow: inset 0 0 0 2px var(--warning);
  }
  .sd-check:hover {
    border-color: var(--border-2);
    box-shadow: inset 0 0 0 2px var(--accent), var(--shadow-sm);
    transform: translateY(-1px);
  }
  .sd-check-icon {
    width: 30px; height: 30px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sd-check-icon.complete { background: var(--success-soft); color: var(--success); }
  .sd-check-icon.pending  { background: var(--warning-soft); color: var(--warning); }
  .sd-check-icon.todo     { background: var(--danger-soft);  color: var(--danger); }
  .sd-check-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }
  .sd-check-desc {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.5;
  }

  /* ══════════════════════════════════════
     MAIN 2-COL FLOW
  ══════════════════════════════════════ */
  .sd-flow {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
  }
  .sd-main { display: flex; flex-direction: column; gap: 20px; }
  .sd-sidebar { display: flex; flex-direction: column; gap: 16px; }

  /* ── Card ── */
  .sd-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .sd-card:hover { box-shadow: var(--shadow); }
  .sd-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .sd-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .sd-card-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }
  .sd-card-body { padding: 20px 24px; }

  /* ── Placement card ── */
  .sd-placement-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 13px;
    color: var(--ink-3);
    margin-bottom: 20px;
  }
  .sd-placement-meta span {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .sd-progress-row { margin-bottom: 20px; }
  .sd-progress-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .sd-progress-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .sd-progress-pct {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .sd-progress-track {
    height: 5px;
    background: var(--surface-3);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .sd-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 99px;
    transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1);
  }
  .sd-progress-days {
    font-size: 12px;
    color: var(--ink-3);
  }
  .sd-placement-actions {
    display: flex;
    gap: 10px;
  }

  /* Empty workspace */
  .sd-empty {
    text-align: center;
    padding: 40px 20px;
    color: var(--ink-3);
  }
  .sd-empty-icon {
    width: 56px; height: 56px;
    border-radius: 18px;
    background: var(--surface-3);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px;
    color: var(--ink-4);
  }
  .sd-empty-title { font-size: 14px; font-weight: 600; color: var(--ink-2); margin-bottom: 5px; }
  .sd-empty-text { font-size: 12px; margin-bottom: 16px; }

  /* ── Action cards ── */
  .sd-action-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .sd-action-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
    position: relative;
    overflow: visible;
  }
  .sd-action-card:hover {
    border-color: var(--border-2);
    box-shadow: inset 0 0 0 2px var(--accent), var(--shadow);
    transform: translateY(-2px);
  }
  .sd-action-priority {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .sd-action-icon {
    width: 36px; height: 36px;
    border-radius: 11px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
  }
  .sd-action-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.3;
  }
  .sd-action-desc {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.5;
    flex: 1;
  }
  .sd-action-cta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--accent);
    margin-top: 4px;
  }

  /* ── Applications table ── */
  .sd-table {
    width: 100%;
    border-collapse: collapse;
  }
  .sd-table thead tr {
    border-bottom: 1px solid var(--border);
  }
  .sd-table th {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-4);
    padding: 0 0 12px;
    text-align: left;
  }
  .sd-table tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
  }
  .sd-table tbody tr:last-child { border-bottom: none; }
  .sd-table tbody tr:hover { background: var(--surface-3); }
  .sd-table td {
    padding: 13px 0;
    font-size: 13px;
    color: var(--ink-2);
  }
  .sd-table td:first-child { font-weight: 600; color: var(--ink); }
  .sd-table td:last-child { color: var(--ink-4); font-size: 12px; }

  /* ── Badges ── */
  .sd-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    padding: 3px 9px;
    letter-spacing: 0.02em;
  }
  .sd-badge-success  { background: var(--success-soft);  color: var(--success); }
  .sd-badge-warning  { background: var(--warning-soft);  color: var(--warning); }
  .sd-badge-danger   { background: var(--danger-soft);   color: var(--danger); }
  .sd-badge-accent   { background: var(--accent-soft);   color: var(--accent); }
  .sd-badge-neutral  { background: var(--surface-3);     color: var(--ink-3); }

  /* ══════════════════════════════════════
     SIDEBAR
  ══════════════════════════════════════ */

  /* Trust journey card */
  .sd-trust-steps {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .sd-trust-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
  }
  .sd-trust-step:last-child { border-bottom: none; padding-bottom: 0; }
  .sd-trust-step:first-child { padding-top: 0; }
  .sd-trust-step-dot {
    width: 28px; height: 28px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .sd-trust-step-dot.complete { background: var(--success-soft); color: var(--success); }
  .sd-trust-step-dot.todo     { background: var(--surface-3);    color: var(--ink-4); }
  .sd-trust-step-label { font-size: 13px; font-weight: 500; color: var(--ink-2); }
  .sd-trust-step.complete .sd-trust-step-label { color: var(--ink); }

  /* Trust level badge */
  .sd-trust-level {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 14px;
  }

  /* Event list */
  .sd-event-list { display: flex; flex-direction: column; gap: 0; }
  .sd-event-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .sd-event-item:last-child { border-bottom: none; padding-bottom: 0; }
  .sd-event-item:first-child { padding-top: 0; }
  .sd-event-title { font-size: 13px; font-weight: 500; color: var(--ink); }
  .sd-event-date  { font-size: 11px; color: var(--ink-4); }

  /* Ledger event */
  .sd-ledger-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid var(--border);
  }
  .sd-ledger-item:last-child { border-bottom: none; padding-bottom: 0; }
  .sd-ledger-item:first-child { padding-top: 0; }
  .sd-ledger-title { font-size: 12px; font-weight: 500; color: var(--ink-2); text-transform: capitalize; }
  .sd-ledger-date  { font-size: 11px; color: var(--ink-4); flex-shrink: 0; }

  /* Quick links */
  .sd-quick-links {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sd-quick-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
    text-decoration: none;
    transition: background 0.12s, color 0.12s;
    border: 1px solid transparent;
  }
  .sd-quick-link:hover {
    background: var(--surface-3);
    border-color: var(--border);
    color: var(--ink);
  }
  .sd-quick-link-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: var(--surface-3);
    color: var(--ink-3);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s;
  }
  .sd-quick-link:hover .sd-quick-link-icon { background: var(--accent-soft); color: var(--accent); }

  /* ── Shared buttons ── */
  .sd-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius);
    padding: 10px 18px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
    white-space: nowrap;
    text-decoration: none;
  }
  .sd-btn:active { transform: scale(0.97); }
  .sd-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25), 0 4px 12px rgba(26,92,255,0.15);
  }
  .sd-btn-primary:hover { box-shadow: 0 4px 16px rgba(26,92,255,0.35); transform: translateY(-1px); color: #fff; }
  .sd-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
    border: 1px solid var(--border);
  }
  .sd-btn-ghost:hover { background: var(--surface); border-color: var(--border-2); color: var(--ink); }
  .sd-btn-sm { padding: 7px 14px; font-size: 12px; }

  /* Tip */
  .sd-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  .sd-tip-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
  }
  .sd-tip-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .sd-tip-text  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1100px) {
    .sd-flow { grid-template-columns: 1fr; }
    .sd-metrics { grid-template-columns: repeat(2, 1fr); }
    .sd-check-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .sd-hero { grid-template-columns: 1fr; }
    .sd-metrics { grid-template-columns: repeat(2, 1fr); }
    .sd-check-grid { grid-template-columns: 1fr; }
    .sd-action-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .sd-metrics { grid-template-columns: 1fr; }
  }
`;

/* ── status badge helper ── */
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPLIED':     return { cls: 'sd-badge-accent',   label: 'Applied' };
    case 'SHORTLISTED': return { cls: 'sd-badge-warning',  label: 'Shortlisted' };
    case 'ACCEPTED':    return { cls: 'sd-badge-success',  label: 'Accepted' };
    case 'REJECTED':    return { cls: 'sd-badge-danger',   label: 'Rejected' };
    case 'ACTIVE':      return { cls: 'sd-badge-success',  label: 'Active' };
    default:            return { cls: 'sd-badge-neutral',  label: status };
  }
};

interface EventItem {
  title: string;
  date: string;
  time: string;
  type: 'interview' | 'deadline' | 'meeting';
}

/* ══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeInternship, setActiveInternship] = useState<any | null>(null);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [readinessScore, setReadinessScore] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [trustLevel, setTrustLevel] = useState(0);
  const [trustState, setTrustState] = useState<StudentTrustState | null>(null);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  /* ── Data fetch ── */
  useEffect(() => {
    if (hasLoggedOut) return;
    let isMounted = true;
    const controller = new AbortController();

    const fetchDashboardData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        const profileData = await studentService.getProfile();
        if (!isMounted) return;

        const [apps, active, allInternships, stats, ledgerData, affiliationData] = await Promise.all([
          studentService.getApplications(),
          studentService.getActiveInternship(),
          internshipService.getInternships({ status: 'OPEN' }),
          studentService.getDashboardStats(profileData.id),
          ledgerService.getEvents({ page_size: 5 }),
          studentService.getAffiliations(profileData.id).catch(() => [])
        ]);
        if (!isMounted) return;

        const appsList = Array.isArray(apps) ? apps : (apps as any).results || [];
        setProfile(profileData);
        setStudentId(profileData.id);
        setApplications(appsList);
        setActiveInternship(active);
        setLedgerEvents(ledgerData.results);
        setAffiliations(affiliationData);

        if (stats?.trust) {
          setTrustState(stats.trust);
          setTrustLevel(normalizeTrustLevel(stats.trust.tier_level));
        } else {
          setTrustLevel(normalizeTrustLevel(profileData.trust_level));
        }

        const events: EventItem[] = [];
        appsList.forEach((app: any) => {
          if (app.status === 'SHORTLISTED') {
            events.push({ title: `Interview: ${app.title}`, date: 'Pending Schedule', time: 'TBA', type: 'interview' });
          }
        });
        setUpcomingEvents(events);

        const internshipsList = Array.isArray(allInternships) ? allInternships : (allInternships as any).results || [];
        setOpportunitiesCount(internshipsList.filter((i: Internship) => i.status === 'OPEN' && !i.student_has_applied).length);

        if (stats?.profile && typeof stats.profile.score === 'number') setReadinessScore(stats.profile.score);

        const missing: string[] = [];
        const curAff = affiliationData.find((a: Affiliation) => ['approved', 'verified', 'pending'].includes(a.status));
        if (!profileData.cv) missing.push('CV / Resume');
        if (!profileData.admission_letter) missing.push('Admission Letter');
        if (!profileData.id_document) missing.push('School ID');
        if (!profileData.skills || profileData.skills.length === 0) missing.push('Skills');
        if (!profileData.course_of_study) missing.push('Academic Info');
        if (!profileData.is_verified && !curAff) missing.push('Institution Verification');
        setMissingItems(missing);

        const isIncomplete = !profileData.course_of_study || !profileData.skills ||
          profileData.skills.length === 0 || !profileData.cv || !profileData.admission_letter ||
          !profileData.id_document || (!profileData.is_verified && !curAff);
        if (isIncomplete) setShowProfileWizard(true);
      } catch (error) {
        if (!isMounted) return;
        const is401 = (error as any)?.status === 401 || (error as any)?.response?.status === 401 ||
          (error as any)?.message?.includes('Unauthorized') || (error as any)?.message?.includes('Session expired');
        if (is401) {
          setHasLoggedOut(true);
          await logout();
          showToast.error('Session expired. Please log in again.');
          navigate('/login', { replace: true });
        } else {
          showToast.error(getErrorMessage(error, { action: 'Load Dashboard Data' }) || 'Failed to load dashboard.');
        }
        logError(error, { action: 'Load Dashboard Data' });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user && !hasLoggedOut) fetchDashboardData();
    return () => { isMounted = false; controller.abort(); };
  }, [user, hasLoggedOut, logout, navigate]);

  /* ── Derived values ── */
  const currentAffiliation = affiliations.find(a => ['approved', 'verified', 'pending'].includes(a.status));
  const isAffiliationVerified = profile?.is_verified || currentAffiliation?.status === 'approved' || currentAffiliation?.status === 'verified';
  const isAffiliationPending = currentAffiliation?.status === 'pending';
  const hasCoreProfile = !!profile?.course_of_study && !!profile?.current_year && !!profile?.registration_number;
  const hasSkills = !!profile?.skills && profile.skills.length > 0;
  const hasDocuments = !!profile?.cv && !!profile?.admission_letter && !!profile?.id_document;
  const isReadyToApply = hasCoreProfile && hasSkills && hasDocuments && !!isAffiliationVerified;
  const pendingApplications = applications.filter(a => ['APPLIED', 'SHORTLISTED'].includes(a.status)).length;
  const recentApplications = applications.slice(0, 4);
  const trustRequirements = trustState?.requirement_status;

  const activeStart = activeInternship?.start_date ? new Date(activeInternship.start_date) : null;
  const activeEnd   = activeInternship?.end_date   ? new Date(activeInternship.end_date)   : null;
  const activeTotalDays = activeStart && activeEnd
    ? Math.max(1, Math.ceil((activeEnd.getTime() - activeStart.getTime()) / 86400000)) : 1;
  const activeElapsedDays = activeStart ? Math.max(0, Math.ceil((Date.now() - activeStart.getTime()) / 86400000)) : 0;
  const activeProgress = activeInternship ? Math.min(100, Math.max(0, Math.round((activeElapsedDays / activeTotalDays) * 100))) : 0;
  const activeDaysLeft = activeEnd ? Math.max(0, Math.ceil((activeEnd.getTime() - Date.now()) / 86400000)) : null;

  const onboardingSteps = [
    {
      title: 'Academic profile',
      description: hasCoreProfile ? 'Course, year, and registration number are complete.' : 'Add your course, year, and registration number.',
      complete: hasCoreProfile, pending: false,
      action: 'Complete profile', href: '/dashboard/student/profile',
    },
    {
      title: 'Skills profile',
      description: hasSkills ? `${profile?.skills.length} skills listed for matching.` : 'Add at least one skill employers can search for.',
      complete: hasSkills, pending: false,
      action: 'Add skills', href: '/dashboard/student/profile',
    },
    {
      title: 'Institution verification',
      description: isAffiliationVerified ? 'Your student status is verified.'
        : isAffiliationPending ? 'Your institution claim is pending review.'
        : 'Claim your institution so employers can trust you.',
      complete: !!isAffiliationVerified, pending: !!isAffiliationPending,
      action: isAffiliationPending ? 'View status' : 'Verify institution', href: '/dashboard/student/affiliation',
    },
    {
      title: 'Required documents',
      description: hasDocuments ? 'CV, admission letter, and school ID are uploaded.' : 'Upload your CV, admission letter, and school ID.',
      complete: hasDocuments, pending: false,
      action: 'Upload documents', href: '/dashboard/student/profile',
    },
  ];

  const primarySetupStep = onboardingSteps.find(s => !s.complete);

  const nextActions = [
    {
      title: primarySetupStep ? primarySetupStep.title : 'Browse verified internships',
      description: primarySetupStep ? primarySetupStep.description : 'Your profile is ready for trusted opportunities.',
      href: primarySetupStep ? primarySetupStep.href : '/opportunities',
      icon: primarySetupStep ? Upload : Search,
      cta: primarySetupStep ? primarySetupStep.action : 'Browse roles',
      priority: 'Priority',
    },
    {
      title: activeInternship ? 'Update today\u2019s logbook' : 'Track applications',
      description: activeInternship ? 'Keep daily evidence current for supervisor review.' : 'Monitor your application status and next steps.',
      href: activeInternship ? '/dashboard/student/logbook' : '/dashboard/student/applications',
      icon: activeInternship ? BookOpen : FileText,
      cta: activeInternship ? 'Open logbook' : 'View applications',
      priority: 'Workflow',
    },
    {
      title: 'Build your evidence trail',
      description: 'Keep verified documents and records ready for institutions and employers.',
      href: '/dashboard/student/artifacts',
      icon: Award,
      cta: 'View artifacts',
      priority: 'Trust',
    },
  ];

  const dashboardMetrics = [
    { label: 'Applications', value: applications.length, detail: `${pendingApplications} pending review`, icon: FileText, href: '/dashboard/student/applications' },
    { label: 'Placement',    value: activeInternship ? 'Active' : 'None', detail: activeInternship ? activeInternship.title : 'No active internship', icon: Briefcase, href: '/dashboard/student/internship' },
    { label: 'Open roles',   value: opportunitiesCount, detail: 'Matched opportunities', icon: Search, href: '/opportunities' },
    { label: 'Trust level',  value: trustLevel, detail: trustState?.tier_label || (isAffiliationVerified ? 'Institution verified' : 'Verification needed'), icon: ShieldCheck, href: '/dashboard/student/affiliation' },
  ];

  /* ── Ring math ── */
  const CIRC = 2 * Math.PI * 18;
  const dashOffset = CIRC - (readinessScore / 100) * CIRC;

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <StudentLayout>
      <SEO
        title="Student Dashboard"
        description="Manage your internship applications, track progress, and update your professional profile."
      />
      <style>{STYLES}</style>

      {loading ? (
        <StudentDashboardSkeleton />
      ) : (
        <div className={`sd-page${isDarkMode ? ' dark-mode' : ''}`}>

          {/* ── HERO ── */}
          <header className="sd-hero">
            <div>
              <div className="sd-hero-eyebrow">
                <Sparkles size={12} />
                EduLink · Student Workspace
              </div>
              <h1 className="sd-hero-title">
                Welcome back, <em>{user?.firstName || 'Student'}</em>.
              </h1>
              <p className="sd-hero-sub">
                Move from verified profile to trusted placement with a clear view of what needs action today.
              </p>
              <div className="sd-hero-actions">
                <Link
                  to={activeInternship ? '/dashboard/student/logbook' : (primarySetupStep?.href || '/opportunities')}
                  className="sd-btn sd-btn-primary"
                >
                  {activeInternship ? <BookOpen size={15} /> : <ShieldCheck size={15} />}
                  {activeInternship ? 'Open today\u2019s logbook' : primarySetupStep ? primarySetupStep.action : 'Browse verified roles'}
                </Link>
                <Link to="/opportunities" className="sd-btn sd-btn-ghost">
                  <Search size={15} />
                  Explore opportunities
                </Link>
              </div>
            </div>

            {/* Readiness passport */}
            <div className="sd-passport">
              <span className="sd-passport-eyebrow">Readiness passport</span>
              <svg width="52" height="52" viewBox="0 0 44 44" className="sd-ring-svg">
                <circle cx="22" cy="22" r="18" className="sd-ring-track" />
                <circle cx="22" cy="22" r="18" className="sd-ring-fill"
                  strokeDasharray={CIRC} strokeDashoffset={dashOffset} />
              </svg>
              <span className="sd-passport-score">{Math.round(readinessScore)}%</span>
              <span className="sd-passport-sub">
                {isReadyToApply
                  ? 'Profile verified and ready.'
                  : `${missingItems.length} item${missingItems.length !== 1 ? 's' : ''} still needed.`}
              </span>
            </div>
          </header>

          {/* ── METRICS ── */}
          <div className="sd-metrics">
            {dashboardMetrics.map((m) => {
              const Icon = m.icon;
              return (
                <Link to={m.href} className="sd-metric" key={m.label}>
                  <div className="sd-metric-icon"><Icon size={16} /></div>
                  <span className="sd-metric-label">{m.label}</span>
                  <span className="sd-metric-value">{m.value}</span>
                  <span className="sd-metric-detail">{m.detail}</span>
                </Link>
              );
            })}
          </div>

          {/* ── ONBOARDING CHECKS ── */}
          <section className="sd-checks-section">
            <div className="sd-section-head">
              <div>
                <div className="sd-section-eyebrow">Student onboarding</div>
                <h2 className="sd-section-title">
                  {isReadyToApply ? 'You\u2019re application-ready' : 'Complete the checks that build employer trust'}
                </h2>
                <p className="sd-section-sub">Verification first, then matching, placement, logbooks, and evidence.</p>
              </div>
            </div>
            <div className="sd-check-grid">
              {onboardingSteps.map((step) => {
                const iconCls = step.complete ? 'complete' : step.pending ? 'pending' : 'todo';
                const Icon = step.complete ? CheckCircle : step.pending ? Clock : AlertCircle;
                return (
                  <Link to={step.href} className={`sd-check${step.complete ? ' complete' : step.pending ? ' pending' : ''}`} key={step.title}>
                    <div className={`sd-check-icon ${iconCls}`}><Icon size={15} /></div>
                    <div className="sd-check-title">{step.title}</div>
                    <div className="sd-check-desc">{step.description}</div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ── MAIN FLOW ── */}
          <div className="sd-flow">
            <main className="sd-main">

              {/* Placement panel */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <div>
                    <div className="sd-card-label">Current placement</div>
                    <h3 className="sd-card-title">
                      {activeInternship ? activeInternship.title : 'No active internship yet'}
                    </h3>
                  </div>
                  <Link to="/dashboard/student/internship" className="sd-btn sd-btn-ghost sd-btn-sm">
                    View details <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="sd-card-body">
                  {activeInternship ? (
                    <>
                      <div className="sd-placement-meta">
                        <span><Building2 size={13} />{activeInternship.employer_name || activeInternship.employer_details?.name || 'Employer pending'}</span>
                        <span><MapPin size={13} />{activeInternship.location || 'Location pending'}</span>
                        <span><Calendar size={13} />Ends {activeEnd ? activeEnd.toLocaleDateString() : 'TBA'}</span>
                      </div>
                      <div className="sd-progress-row">
                        <div className="sd-progress-label-row">
                          <span className="sd-progress-label">Placement progress</span>
                          <span className="sd-progress-pct">{activeProgress}%</span>
                        </div>
                        <div className="sd-progress-track">
                          <div className="sd-progress-fill" style={{ width: `${activeProgress}%` }} />
                        </div>
                        <div className="sd-progress-days">
                          {activeDaysLeft !== null ? `${activeDaysLeft} days remaining` : 'Timeline pending'}
                        </div>
                      </div>
                      <div className="sd-placement-actions">
                        <Link to="/dashboard/student/logbook" className="sd-btn sd-btn-primary">
                          <BookOpen size={14} /> Update logbook
                        </Link>
                        <Link to="/dashboard/student/artifacts" className="sd-btn sd-btn-ghost">
                          <Layers size={14} /> View evidence
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="sd-empty">
                      <div className="sd-empty-icon"><Briefcase size={26} /></div>
                      <div className="sd-empty-title">No placement yet</div>
                      <p className="sd-empty-text">Once you accept a verified opportunity, this becomes your daily placement workspace.</p>
                      <Link to="/opportunities" className="sd-btn sd-btn-primary sd-btn-sm">
                        <Search size={14} /> Find opportunities
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Next best actions */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <div>
                    <div className="sd-card-label">Next best actions</div>
                    <h3 className="sd-card-title">What to do next</h3>
                  </div>
                </div>
                <div className="sd-card-body">
                  <div className="sd-action-grid">
                    {nextActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Link to={action.href} className="sd-action-card" key={action.title}>
                          <span className="sd-action-priority">{action.priority}</span>
                          <div className="sd-action-icon"><Icon size={18} /></div>
                          <div className="sd-action-title">{action.title}</div>
                          <p className="sd-action-desc">{action.description}</p>
                          <div className="sd-action-cta">{action.cta} <ArrowRight size={12} /></div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent applications */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <div>
                    <div className="sd-card-label">Applications</div>
                    <h3 className="sd-card-title">Recent activity</h3>
                  </div>
                  <Link to="/dashboard/student/applications" className="sd-btn sd-btn-ghost sd-btn-sm">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="sd-card-body">
                  {recentApplications.length > 0 ? (
                    <table className="sd-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Position</th>
                          <th>Status</th>
                          <th>Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app, i) => {
                          const badge = getStatusBadge(app.status);
                          return (
                            <tr key={i}>
                              <td>{app.employer_details?.name || app.employer_name || 'Unknown'}</td>
                              <td style={{ color: 'var(--ink-3)' }}>{app.title}</td>
                              <td>
                                <span className={`sd-badge ${badge.cls}`}>{badge.label}</span>
                              </td>
                              <td>{new Date(app.created_at).toLocaleDateString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="sd-empty" style={{ padding: '32px 0' }}>
                      <div className="sd-empty-icon"><FileText size={22} /></div>
                      <div className="sd-empty-title">No applications yet</div>
                      <p className="sd-empty-text">Start with verified roles that match your profile.</p>
                    </div>
                  )}
                </div>
              </div>

            </main>

            {/* ── SIDEBAR ── */}
            <aside className="sd-sidebar">

              {/* Trust journey */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    Trust Journey
                  </span>
                  <span className="sd-trust-level">
                    <ShieldCheck size={12} /> Level {trustLevel}
                  </span>
                </div>
                <div className="sd-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <div className="sd-trust-steps">
                    {[
                      { label: 'Documents uploaded',     key: 'documents_uploaded' },
                      { label: 'Institution verified',   key: 'institution_verified' },
                      { label: 'Internship completed',   key: 'internship_completed' },
                      { label: 'Completion certified',   key: 'completion_certified' },
                    ].map((step, index) => {
                      const done = trustRequirements?.[step.key]?.completed ?? trustLevel >= index + 1;
                      return (
                        <div className={`sd-trust-step${done ? ' complete' : ''}`} key={step.key}>
                          <div className={`sd-trust-step-dot${done ? ' complete' : ' todo'}`}>
                            {done ? <CheckCircle size={13} /> : index + 1}
                          </div>
                          <span className="sd-trust-step-label">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Upcoming events */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Upcoming</span>
                  <Calendar size={15} style={{ color: 'var(--ink-4)' }} />
                </div>
                <div className="sd-card-body" style={{ paddingTop: upcomingEvents.length ? 8 : 20, paddingBottom: upcomingEvents.length ? 8 : 20 }}>
                  {upcomingEvents.length > 0 ? (
                    <div className="sd-event-list">
                      {upcomingEvents.map((ev, i) => (
                        <div className="sd-event-item" key={i}>
                          <span className="sd-event-title">{ev.title}</span>
                          <span className="sd-event-date">{ev.date} · {ev.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>No interviews or deadlines scheduled yet.</p>
                  )}
                </div>
              </div>

              {/* Trust ledger */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Trust History</span>
                  <TrendingUp size={15} style={{ color: 'var(--ink-4)' }} />
                </div>
                <div className="sd-card-body" style={{ paddingTop: ledgerEvents.length ? 8 : 20, paddingBottom: ledgerEvents.length ? 8 : 20 }}>
                  {ledgerEvents.length > 0 ? (
                    <div>
                      {ledgerEvents.slice(0, 4).map((ev) => (
                        <div className="sd-ledger-item" key={ev.id}>
                          <span className="sd-ledger-title">{ev.event_type.split('_').join(' ').toLowerCase()}</span>
                          <span className="sd-ledger-date">{new Date(ev.occurred_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>No trust events recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Quick links */}
              <div className="sd-card">
                <div className="sd-card-header">
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Quick Links</span>
                </div>
                <div className="sd-card-body">
                  <div className="sd-quick-links">
                    {[
                      { href: '/opportunities', icon: Search, label: 'Browse internships' },
                      { href: '/dashboard/student/profile', icon: User, label: 'Edit profile' },
                      { href: '/dashboard/student/affiliation', icon: Building2, label: 'Institution status' },
                    ].map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link to={link.href} className="sd-quick-link" key={link.href}>
                          <div className="sd-quick-link-icon"><Icon size={14} /></div>
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tip */}
              <div className="sd-tip">
                <div className="sd-tip-icon"><TrendingUp size={16} /></div>
                <div className="sd-tip-title">Verification builds trust faster</div>
                <p className="sd-tip-text">
                  Students with institution verification get 3× more employer views. Complete your affiliation claim today.
                </p>
              </div>

            </aside>
          </div>
        </div>
      )}

      <ProfileWizard
        show={showProfileWizard}
        onHide={() => setShowProfileWizard(false)}
        studentId={studentId}
        initialData={profile ? {
          course_of_study: profile.course_of_study,
          current_year: profile.current_year,
          registration_number: profile.registration_number,
          skills: profile.skills,
          cv: profile.cv,
          admission_letter: profile.admission_letter,
          id_document: profile.id_document,
          institution_id: profile.institution_id,
          is_verified: profile.is_verified,
          has_affiliation_claim: !!currentAffiliation,
        } : undefined}
        onComplete={() => { setShowProfileWizard(false); window.location.reload(); }}
      />
    </StudentLayout>
  );
};

export default StudentDashboard;