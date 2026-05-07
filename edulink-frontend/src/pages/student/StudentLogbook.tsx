import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Send,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Plus,
  MessageSquare,
  FileText,
  ArrowRight,
  Lock,
  FileDown,
  X,
  Eye,
  RotateCcw,
  TrendingUp,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { studentService } from '../../services/student/studentService';
import { artifactService } from '../../services/reports/artifactService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { dateFormatter } from '../../utils/dateFormatter';
import type { Internship } from '../../types/internship';
import { Link } from 'react-router-dom';
import { FeedbackModal } from '../../components/common';
import { useFeedbackModal } from '../../hooks/useFeedbackModal';
import { generateLogbookPDF } from '../../utils/pdfGenerator';
import {
  ATTACHMENT_WEEKDAYS,
  buildStandardLogbookMetadata,
  countCompletedStandardDays,
} from '../../utils/logbookFormat';
import StudentInternshipSkeleton from '../../components/student/skeletons/StudentInternshipSkeleton';

/* ─────────────────────────────────────────────
   Design tokens & global styles
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
    --success-soft: rgba(18,183,106,0.1);
    --warning: #f59e0b;
    --warning-soft: rgba(245,158,11,0.1);
    --danger: #ef4444;
    --danger-soft: rgba(239,68,68,0.1);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --radius-xl: 28px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05);
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
    --accent-soft: rgba(77,127,255,0.1);
    --success-soft: rgba(18,183,106,0.12);
    --warning-soft: rgba(245,158,11,0.12);
    --danger-soft: rgba(239,68,68,0.12);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --shadow: 0 4px 16px rgba(0,0,0,0.3);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.4);
  }

  .lb-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ── Page Header ── */
  .lb-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 24px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }
  .lb-header-eyebrow {
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
  .lb-header-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .lb-header-title em {
    font-style: italic;
    color: var(--ink-3);
  }
  .lb-header-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .lb-header-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .lb-header-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }

  /* ── Progress Ring ── */
  .lb-progress-ring {
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 14px 20px;
  }
  .lb-ring-svg { transform: rotate(-90deg); }
  .lb-ring-track { fill: none; stroke: var(--border); stroke-width: 3; }
  .lb-ring-fill {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1);
  }
  .lb-ring-label { font-size: 12px; color: var(--ink-3); }
  .lb-ring-count { font-size: 22px; font-weight: 600; color: var(--ink); line-height: 1; }

  /* ── Main grid ── */
  .lb-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    margin-bottom: 48px;
  }
  @media (max-width: 1024px) {
    .lb-grid { grid-template-columns: 1fr; }
    .lb-header { grid-template-columns: 1fr; }
    .lb-header-actions { align-items: flex-start; }
  }

  /* ── Card ── */
  .lb-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .lb-card:hover { box-shadow: var(--shadow); }
  .lb-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .lb-card-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .lb-card-body { padding: 24px; }

  /* ── Week Nav ── */
  .lb-week-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-3);
    border-radius: var(--radius);
    padding: 4px;
  }
  .lb-week-nav-btn {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ink-3);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .lb-week-nav-btn:hover { background: var(--surface-2); color: var(--ink); }
  .lb-week-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
    padding: 0 6px;
    white-space: nowrap;
  }

  /* ── Day grid ── */
  .lb-day-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lb-day-row {
    display: grid;
    grid-template-columns: 100px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
    position: relative;
    overflow: hidden;
  }
  .lb-day-row::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--border-2);
    transition: background 0.15s;
  }
  .lb-day-row.has-entry::before { background: var(--accent); }
  .lb-day-row.is-today::before { background: var(--success); }
  .lb-day-row.is-locked {
    opacity: 0.55;
    cursor: not-allowed;
    background: var(--surface-3);
  }
  .lb-day-row:not(.is-locked):hover {
    border-color: var(--border-2);
    background: var(--surface-3);
    transform: translateY(-1px);
  }
  .lb-day-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-3);
  }
  .lb-day-date {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
    margin-top: 1px;
  }
  .lb-day-today-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--success);
    background: var(--success-soft);
    border-radius: 6px;
    padding: 2px 6px;
    margin-top: 3px;
  }
  .lb-day-preview {
    font-size: 13px;
    color: var(--ink-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lb-day-preview.filled { color: var(--ink-2); }
  .lb-day-status {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .lb-status-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--border-2);
    transition: background 0.2s;
  }
  .lb-status-dot.filled { background: var(--accent); }
  .lb-status-dot.today { background: var(--success); }
  .lb-status-dot.locked { background: var(--border); }
  .lb-add-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: var(--accent-soft);
    color: var(--accent);
    flex-shrink: 0;
    transition: background 0.15s, transform 0.15s;
  }
  .lb-day-row:not(.is-locked):hover .lb-add-icon {
    background: var(--accent);
    color: #fff;
    transform: scale(1.05);
  }

  /* ── Sidebar ── */
  .lb-sidebar { display: flex; flex-direction: column; gap: 16px; }

  .lb-summary-textarea {
    width: 100%;
    min-height: 140px;
    resize: vertical;
    font-family: var(--font-body);
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .lb-summary-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .lb-summary-textarea::placeholder { color: var(--ink-4); }
  .lb-summary-textarea:disabled {
    background: var(--surface-3);
    color: var(--ink-3);
    cursor: not-allowed;
  }

  /* ── Buttons ── */
  .lb-btn {
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
    transition: opacity 0.15s, transform 0.12s, background 0.15s, box-shadow 0.15s;
    white-space: nowrap;
    text-decoration: none;
  }
  .lb-btn:active { transform: scale(0.97); }
  .lb-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
  .lb-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25), 0 4px 12px rgba(26,92,255,0.15);
  }
  .lb-btn-primary:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(26,92,255,0.35);
    transform: translateY(-1px);
  }
  .lb-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
    border: 1px solid var(--border);
  }
  .lb-btn-ghost:hover:not(:disabled) { background: var(--surface); border-color: var(--border-2); }
  .lb-btn-success {
    background: var(--success);
    color: #fff;
    box-shadow: 0 1px 3px rgba(18,183,106,0.25);
  }
  .lb-btn-success:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .lb-btn-full { width: 100%; }
  .lb-btn-sm { padding: 7px 14px; font-size: 12px; }

  /* ── Tip card ── */
  .lb-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  .lb-tip-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
  }
  .lb-tip-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .lb-tip-text { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ── History section ── */
  .lb-history-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }
  .lb-history-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0 0 4px;
  }
  .lb-history-sub { font-size: 13px; color: var(--ink-3); margin: 0; }

  /* ── History list ── */
  .lb-history-list { display: flex; flex-direction: column; gap: 10px; }
  .lb-history-item {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: border-color 0.15s, background 0.15s;
  }
  .lb-history-item:hover { border-color: var(--border-2); background: var(--surface); }

  .lb-history-week-dot {
    width: 40px; height: 40px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .lb-history-week-dot.approved { background: var(--success-soft); color: var(--success); }
  .lb-history-week-dot.pending { background: var(--warning-soft); color: var(--warning); }
  .lb-history-week-dot.rejected { background: var(--danger-soft); color: var(--danger); }
  .lb-history-week-dot.revision { background: rgba(99,102,241,0.1); color: #6366f1; }
  .lb-history-week-dot.reviewed { background: var(--accent-soft); color: var(--accent); }

  .lb-history-title-text { font-size: 14px; font-weight: 500; color: var(--ink); }
  .lb-history-date { font-size: 12px; color: var(--ink-4); margin-top: 2px; }

  .lb-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    padding: 4px 10px;
    letter-spacing: 0.02em;
  }
  .lb-badge-approved { background: var(--success-soft); color: var(--success); }
  .lb-badge-pending { background: var(--warning-soft); color: var(--warning); }
  .lb-badge-rejected { background: var(--danger-soft); color: var(--danger); }
  .lb-badge-revision { background: rgba(99,102,241,0.1); color: #6366f1; }
  .lb-badge-reviewed { background: var(--accent-soft); color: var(--accent); }

  .lb-history-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

  /* Empty state */
  .lb-empty {
    text-align: center;
    padding: 64px 24px;
    color: var(--ink-3);
  }
  .lb-empty-icon {
    width: 64px; height: 64px;
    border-radius: 20px;
    background: var(--surface-3);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
    color: var(--ink-4);
  }
  .lb-empty-title { font-size: 15px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; }
  .lb-empty-text { font-size: 13px; }

  /* ── Modal backdrop ── */
  .lb-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(6px);
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: lb-fade-in 0.15s ease;
  }
  @keyframes lb-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes lb-slide-up { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

  /* ── Modal panel ── */
  .lb-modal {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 540px;
    overflow: hidden;
    animation: lb-slide-up 0.2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .lb-modal-lg { max-width: 680px; }
  .lb-modal-header {
    padding: 24px 24px 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .lb-modal-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .lb-modal-title {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }
  .lb-modal-sub { font-size: 12px; color: var(--ink-3); margin-top: 4px; }
  .lb-modal-close {
    width: 32px; height: 32px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface-3);
    color: var(--ink-3);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .lb-modal-close:hover { background: var(--surface); color: var(--ink); }
  .lb-modal-body { padding: 20px 24px; }
  .lb-modal-footer {
    padding: 16px 24px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    border-top: 1px solid var(--border);
  }

  /* ── Textarea in modal ── */
  .lb-entry-textarea {
    width: 100%;
    min-height: 180px;
    resize: vertical;
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .lb-entry-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .lb-entry-textarea::placeholder { color: var(--ink-4); }
  .lb-entry-textarea:disabled { background: var(--surface-3); cursor: not-allowed; }
  .lb-entry-textarea.error { border-color: var(--danger); }

  /* ── Char count / helper row ── */
  .lb-field-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    font-size: 11px;
    color: var(--ink-4);
  }
  .lb-field-footer.error { color: var(--danger); }

  /* ── Submission preview ── */
  .lb-preview-scroll {
    max-height: 360px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
  }
  .lb-preview-scroll::-webkit-scrollbar { width: 4px; }
  .lb-preview-scroll::-webkit-scrollbar-track { background: transparent; }
  .lb-preview-scroll::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 4px; }

  .lb-preview-entry {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
  }
  .lb-preview-day-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .lb-preview-day-date {
    font-size: 11px;
    font-weight: 400;
    color: var(--ink-4);
    letter-spacing: 0;
    text-transform: none;
  }
  .lb-preview-content {
    font-size: 13px;
    color: var(--ink-2);
    white-space: pre-wrap;
    line-height: 1.6;
  }
  .lb-preview-content.empty { color: var(--ink-4); font-style: italic; }

  .lb-warn-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--warning-soft);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: var(--radius);
    padding: 12px 14px;
    font-size: 12px;
    color: var(--warning);
    margin-bottom: 16px;
  }

  /* ── Feedback modal panels ── */
  .lb-feedback-panel {
    border-radius: var(--radius);
    padding: 16px 18px;
    border: 1px solid var(--border);
  }
  .lb-feedback-panel + .lb-feedback-panel { margin-top: 12px; }
  .lb-feedback-panel-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .lb-feedback-text { font-size: 13px; line-height: 1.6; color: var(--ink-2); }
  .lb-feedback-text.empty { color: var(--ink-4); font-style: italic; font-size: 12px; }

  /* ── No internship empty screen ── */
  .lb-no-internship {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 100px 24px;
    min-height: 60vh;
  }
  .lb-no-internship-icon {
    width: 80px; height: 80px;
    border-radius: 24px;
    background: var(--surface-3);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--ink-4);
    margin-bottom: 24px;
  }
  .lb-no-internship h2 {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 400;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .lb-no-internship p { font-size: 14px; color: var(--ink-3); max-width: 320px; }

  /* Spinner */
  .lb-spinner {
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: lb-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .lb-spinner-dark {
    border-color: rgba(0,0,0,0.1);
    border-top-color: var(--accent);
  }
  @keyframes lb-spin { to { transform: rotate(360deg); } }

  /* View toggle */
  .lb-view-toggle {
    display: flex;
    background: var(--surface-3);
    border-radius: var(--radius);
    padding: 3px;
    gap: 2px;
  }
  .lb-view-btn {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: calc(var(--radius) - 2px);
    border: none;
    background: transparent;
    color: var(--ink-3);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .lb-view-btn.active {
    background: var(--surface-2);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
  }

  /* divider */
  .lb-divider {
    height: 1px;
    background: var(--border);
    margin: 16px 0;
  }

  @media (max-width: 640px) {
    .lb-history-item { grid-template-columns: auto 1fr; }
    .lb-history-item > :nth-child(3),
    .lb-history-item > :nth-child(4) { grid-column: 2; }
    .lb-day-row { grid-template-columns: 80px 1fr auto; }
  }
`;

/* ──────────────────── helpers ──────────────────── */
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
const parseLocalDate = (s: string) => new Date(`${s}T00:00:00`);
const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/* ─────────────────────── STATUS helpers ─────────────────────── */
const STATUS_META: Record<string, { label: string; cls: string; dotCls: string; abbr: string }> = {
  ACCEPTED: { label: 'Approved', cls: 'lb-badge-approved', dotCls: 'approved', abbr: '✓' },
  REJECTED: { label: 'Rejected', cls: 'lb-badge-rejected', dotCls: 'rejected', abbr: '✕' },
  REVISION_REQUIRED: { label: 'Needs Revision', cls: 'lb-badge-revision', dotCls: 'revision', abbr: '↻' },
  REVIEWED: { label: 'In Review', cls: 'lb-badge-reviewed', dotCls: 'reviewed', abbr: '◎' },
  PENDING: { label: 'Pending', cls: 'lb-badge-pending', dotCls: 'pending', abbr: '…' },
};
const getStatus = (s: string) => STATUS_META[s] || STATUS_META.PENDING;


/* ═══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const StudentLogbook: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [currentWeekStart] = useState<Date>(getMonday(new Date()));
  const [logbookEntries, setLogbookEntries] = useState<Record<string, string>>({});
  const [weeklySummary, setWeeklySummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Entry modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  // Other modals
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [supervisorFeedbackOpen, setSupervisorFeedbackOpen] = useState(false);
  const [activeSupervisorFeedback, setActiveSupervisorFeedback] = useState<any>(null);

  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  const isInternshipCompleted = internship
    ? ['COMPLETED', 'CERTIFIED', 'TERMINATED'].includes(internship.status)
    : false;

  /* ── data fetch ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await studentService.getActiveInternship();
        if (data) {
          const iData = (data as any).internship || (data as any);
          setInternship(iData);
          const history = await studentService.getEvidence(iData.id);
          setSubmissionHistory(history.filter((e: any) => e.evidence_type === 'LOGBOOK'));
        }
      } catch (err) {
        showToast.error(getErrorMessage(err, { action: 'Load Logbook Data' }));
        logError(err, { action: 'Load Logbook Data' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── draft persistence ── */
  useEffect(() => {
    if (!internship) return;
    const key = `logbook_draft_${internship.id}_${getLocalDateString(currentWeekStart)}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const draft = JSON.parse(saved);
      setLogbookEntries(draft.entries ?? draft);
      setWeeklySummary(draft.weeklySummary ?? '');
    } else {
      setLogbookEntries({});
      setWeeklySummary('');
    }
  }, [internship, currentWeekStart]);

  const saveDraft = (entries: Record<string, string>, summary: string) => {
    if (!internship) return;
    const key = `logbook_draft_${internship.id}_${getLocalDateString(currentWeekStart)}`;
    localStorage.setItem(key, JSON.stringify({ entries, weeklySummary: summary }));
  };

  const handleEntryChange = (dateStr: string, content: string) => {
    const updated = { ...logbookEntries, [dateStr]: content };
    setLogbookEntries(updated);
    saveDraft(updated, weeklySummary);
  };

  const handleWeeklySummaryChange = (v: string) => {
    setWeeklySummary(v);
    saveDraft(logbookEntries, v);
  };

  /* ── date helpers ── */
  const isDateInPast = (ds: string) => {
    const d = parseLocalDate(ds);
    const start = new Date(currentWeekStart);
    start.setHours(0, 0, 0, 0);
    return d < start;
  };
  const isFuture = (d: Date) => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return d > end;
  };

  /* ── day click ── */
  const openDay = (dateStr: string) => {
    if (isFuture(parseLocalDate(dateStr))) {
      showToast.error('Future dates are locked.');
      return;
    }
    const past = isDateInPast(dateStr);
    setSelectedDate(dateStr);
    setCurrentEntry(logbookEntries[dateStr] || '');
    setIsReadOnly(isInternshipCompleted || past);
    setEntryError(null);
    setModalOpen(true);
  };

  /* ── save entry ── */
  const handleSaveEntry = () => {
    if (!currentEntry.trim()) {
      setEntryError('Entry cannot be empty.');
      return;
    }
    if (selectedDate) {
      handleEntryChange(selectedDate, currentEntry);
      setModalOpen(false);
    }
  };

  /* ── submit ── */
  const handleSubmitLogbook = () => {
    if (!internship || isInternshipCompleted) return;
    if (!Object.keys(logbookEntries).length) {
      showToast.error('Add at least one entry before submitting.');
      return;
    }
    if (!weeklySummary.trim()) {
      showToast.error('Add the weekly summary before submitting.');
      return;
    }
    setSubmitModalOpen(true);
  };

  const confirmSubmitLogbook = async () => {
    if (!internship) return;
    try {
      setSubmitting(true);
      const weekStartDate = getLocalDateString(currentWeekStart);
      const metadata = buildStandardLogbookMetadata({ weekStartDate, entries: logbookEntries, weeklySummary });
      await studentService.submitLogbook(internship.id, { weekStartDate, entries: logbookEntries, weeklySummary, metadata });
      setSubmissionSuccess(true);
      setSubmitModalOpen(false);
      localStorage.removeItem(`logbook_draft_${internship.id}_${getLocalDateString(currentWeekStart)}`);
      showToast.success('Logbook submitted!');
      const history = await studentService.getEvidence(internship.id);
      setSubmissionHistory(history.filter((e: any) => e.evidence_type === 'LOGBOOK'));
    } catch (err) {
      showToast.error(getErrorMessage(err, { action: 'Submit Logbook' }));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── PDF ── */
  const handleDownloadPDF = async () => {
    if (!internship) return;
    if (!Object.keys(logbookEntries).length) {
      showToast.error('Add entries before downloading PDF.');
      return;
    }
    try {
      const profile = await studentService.getProfile();
      generateLogbookPDF({
        studentName: user ? `${user.firstName} ${user.lastName}` : 'Student',
        studentEmail: user?.email || '',
        studentReg: profile.registration_number,
        internshipTitle: internship.title,
        employerName: internship.employer_details?.name || 'Employer',
        department: internship.department,
        weekStartDate: dateFormatter.isoDate(currentWeekStart),
        status: 'Draft / Pending Submission',
        entries: logbookEntries,
        weeklySummary,
      });
      showSuccess('PDF Generated', 'Your logbook PDF has been downloaded.');
    } catch (err: any) {
      showError('Generation Failed', getErrorMessage(err, { action: 'Generate PDF' }));
    }
  };

  const handleDownloadFullReport = async () => {
    if (!internship) return;
    let toastId: string | undefined;
    try {
      setGeneratingReport(true);
      toastId = showToast.loading('Generating full report…');
      const artifact = await artifactService.generateArtifact(internship.id, 'LOGBOOK_REPORT');
      await artifactService.downloadArtifact(artifact);
      if (toastId) showToast.dismiss(toastId);
      showSuccess('Downloaded', 'Full report downloaded successfully.');
    } catch (err: any) {
      if (toastId) showToast.dismiss(toastId);
      showError('Download Failed', 'Ensure you have accepted logbook entries.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const completedDays = internship
    ? countCompletedStandardDays(logbookEntries, getLocalDateString(currentWeekStart))
    : 0;

  const todayStr = getLocalDateString(new Date());

  /* ── circle math ── */
  const CIRC = 2 * Math.PI * 18;
  const dashOffset = CIRC - (completedDays / 5) * CIRC;

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`lb-page${isDarkMode ? ' dark-mode' : ''}`}>
        {loading ? (
          <StudentInternshipSkeleton isDarkMode={isDarkMode} />
        ) : !internship ? (
          <div className="lb-no-internship">
            <div className="lb-no-internship-icon">
              <BookOpen size={36} />
            </div>
            <h2>No Active Internship</h2>
            <p>You need an active internship placement to access the logbook.</p>
          </div>
        ) : (
          <>
            {/* ── PAGE HEADER ── */}
            <header className="lb-header">
              <div>
                <div className="lb-header-eyebrow">
                  <Briefcase size={12} />
                  Evidence Capture · {internship.title}
                </div>
                <h1 className="lb-header-title">
                  Weekly <em>Logbook</em>
                </h1>
                <div className="lb-header-meta">
                  <span className="lb-header-meta-item">
                    <CalendarIcon size={13} />
                    Week of {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="lb-header-meta-item">
                    <FileText size={13} />
                    {submissionHistory.length} submission{submissionHistory.length !== 1 ? 's' : ''} on record
                  </span>
                  {isInternshipCompleted && (
                    <span className="lb-header-meta-item" style={{ color: 'var(--success)' }}>
                      <CheckCircle size={13} />
                      Internship Completed — Logbook Locked
                    </span>
                  )}
                </div>
              </div>

              <div className="lb-header-actions">
                {/* Progress ring */}
                <div className="lb-progress-ring">
                  <svg width="44" height="44" viewBox="0 0 44 44" className="lb-ring-svg">
                    <circle cx="22" cy="22" r="18" className="lb-ring-track" />
                    <circle
                      cx="22" cy="22" r="18"
                      className="lb-ring-fill"
                      strokeDasharray={CIRC}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div>
                    <div className="lb-ring-count">{completedDays}/5</div>
                    <div className="lb-ring-label">days drafted</div>
                  </div>
                </div>

                {!isInternshipCompleted && (
                  <button
                    className="lb-btn lb-btn-primary"
                    onClick={() => openDay(todayStr)}
                  >
                    <Plus size={15} />
                    Log Today
                  </button>
                )}
              </div>
            </header>

            {/* ── MAIN GRID ── */}
            <div className="lb-grid">

              {/* LEFT — Day list */}
              <div>
                <div className="lb-card">
                  <div className="lb-card-header">
                    <span className="lb-card-title">Weekly Activities</span>
                    <div className="lb-week-nav">
                      <span className="lb-week-label">
                        {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                        {new Date(currentWeekStart.getTime() + 4 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="lb-card-body">
                    <div className="lb-day-grid">
                      {ATTACHMENT_WEEKDAYS.map((day) => {
                        const date = new Date(currentWeekStart);
                        date.setDate(date.getDate() + day.offset);
                        const ds = getLocalDateString(date);
                        const entry = logbookEntries[ds] || '';
                        const isToday = ds === todayStr;
                        const locked = isFuture(date) || isInternshipCompleted;

                        let rowCls = 'lb-day-row';
                        if (entry) rowCls += ' has-entry';
                        if (isToday) rowCls += ' is-today';
                        if (locked) rowCls += ' is-locked';

                        let dotCls = 'lb-status-dot';
                        if (entry) dotCls += isToday ? ' today' : ' filled';
                        if (locked && !entry) dotCls += ' locked';

                        return (
                          <div
                            key={ds}
                            className={rowCls}
                            onClick={() => !locked && openDay(ds)}
                          >
                            {/* Day label + date */}
                            <div>
                              <div className="lb-day-label">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                              <div className="lb-day-date">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                              {isToday && <div className="lb-day-today-badge"><Sparkles size={9} />Today</div>}
                            </div>

                            {/* Preview */}
                            <div className={`lb-day-preview${entry ? ' filled' : ''}`}>
                              {entry
                                ? entry.slice(0, 80) + (entry.length > 80 ? '…' : '')
                                : locked
                                  ? isInternshipCompleted ? 'Logbook locked' : 'Not available yet'
                                  : 'No entry yet — click to add'}
                            </div>

                            {/* Action icon */}
                            {!locked && (
                              <div className="lb-add-icon">
                                {entry ? <Eye size={14} /> : <Plus size={14} />}
                              </div>
                            )}
                            {locked && (
                              <div style={{ color: 'var(--ink-4)', flexShrink: 0 }}>
                                <Lock size={14} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — Sidebar */}
              <div className="lb-sidebar">

                {/* Weekly summary */}
                <div className="lb-card">
                  <div className="lb-card-header">
                    <span className="lb-card-title">Weekly Report</span>
                    {!weeklySummary.trim() && (
                      <span style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 600 }}>Required</span>
                    )}
                  </div>
                  <div className="lb-card-body" style={{ paddingTop: 16 }}>
                    <textarea
                      className="lb-summary-textarea"
                      placeholder="Summarize the week: theory covered, practical work, challenges, and new skills learned…"
                      value={weeklySummary}
                      onChange={(e) => handleWeeklySummaryChange(e.target.value)}
                      disabled={isInternshipCompleted}
                    />
                    <div className="lb-field-footer">
                      <span>{weeklySummary.length} chars</span>
                      {weeklySummary.trim()
                        ? <span style={{ color: 'var(--success)' }}>✓ Ready</span>
                        : <span>Required for submission</span>}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="lb-card">
                  <div className="lb-card-header">
                    <span className="lb-card-title">Actions</span>
                  </div>
                  <div className="lb-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      className="lb-btn lb-btn-primary lb-btn-full"
                      onClick={handleSubmitLogbook}
                      disabled={submitting || submissionSuccess || isInternshipCompleted}
                    >
                      {submitting ? <div className="lb-spinner" /> : <Send size={15} />}
                      {isInternshipCompleted ? 'Logbook Closed' : 'Submit Week for Review'}
                    </button>

                    <button
                      className="lb-btn lb-btn-ghost lb-btn-full"
                      onClick={handleDownloadPDF}
                    >
                      <Download size={15} />
                      Download Week PDF
                    </button>

                    {['COMPLETED', 'CERTIFIED'].includes(internship.status) && (
                      <button
                        className="lb-btn lb-btn-success lb-btn-full"
                        onClick={handleDownloadFullReport}
                        disabled={generatingReport}
                      >
                        {generatingReport ? <div className="lb-spinner" /> : <FileDown size={15} />}
                        Export Full Logbook
                      </button>
                    )}
                  </div>
                </div>

                {/* Tip */}
                <div className="lb-tip">
                  <div className="lb-tip-icon"><TrendingUp size={16} /></div>
                  <div className="lb-tip-title">Build your record daily</div>
                  <div className="lb-tip-text">
                    Brief daily notes are easier to write and more useful than end-of-week recall.
                    Aim for one key takeaway per day.
                  </div>
                </div>
              </div>
            </div>

            {/* ── SUBMISSION HISTORY ── */}
            <section style={{ marginBottom: 64 }}>
              <div className="lb-history-header">
                <div>
                  <h2 className="lb-history-title">Submission History</h2>
                  <p className="lb-history-sub">Track and review all your submitted weekly logs.</p>
                </div>
              </div>

              <div className="lb-history-list">
                {submissionHistory.length > 0 ? submissionHistory.map((sub) => {
                  const s = getStatus(sub.status);
                  const days = (sub.metadata?.daily_entries || []).filter((e: any) => e.description).length
                    || Object.keys(sub.metadata?.entries || {}).length;
                  return (
                    <div key={sub.id} className="lb-history-item">
                      {/* dot */}
                      <div className={`lb-history-week-dot ${s.dotCls}`}>{s.abbr}</div>

                      {/* info */}
                      <div>
                        <div className="lb-history-title-text">{sub.title}</div>
                        <div className="lb-history-date">
                          {sub.metadata?.week_start_date
                            ? `Week of ${sub.metadata.week_start_date} · `
                            : ''}
                          {days} day{days !== 1 ? 's' : ''} · Submitted {new Date(sub.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* badge */}
                      <span className={`lb-badge ${s.cls}`}>{s.label}</span>

                      {/* actions */}
                      <div className="lb-history-actions">
                        {(sub.employer_review_notes || sub.institution_review_notes) && (
                          <button
                            className="lb-btn lb-btn-ghost lb-btn-sm"
                            onClick={() => { setActiveSupervisorFeedback(sub); setSupervisorFeedbackOpen(true); }}
                          >
                            <MessageSquare size={13} />
                            Feedback
                          </button>
                        )}
                        <Link
                          to={`/dashboard/student/logbook/${sub.id}`}
                          className="lb-btn lb-btn-ghost lb-btn-sm"
                        >
                          <FileText size={13} />
                          View
                          <ArrowRight size={12} />
                        </Link>
                        {sub.status === 'REVISION_REQUIRED' && (
                          <button
                            className="lb-btn lb-btn-primary lb-btn-sm"
                            onClick={() => {
                              showConfirm({
                                title: 'Load for Revision',
                                message: "Load this week's logs into the editor? This will overwrite current drafts.",
                                onConfirm: () => {
                                  setLogbookEntries(sub.metadata.entries || {});
                                  setWeeklySummary(sub.metadata.weekly_summary || '');
                                  showToast.success('Loaded for revision. Edit and resubmit.');
                                },
                              });
                            }}
                          >
                            <RotateCcw size={13} />
                            Revise
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="lb-card">
                    <div className="lb-empty">
                      <div className="lb-empty-icon"><Clock size={28} /></div>
                      <div className="lb-empty-title">No submissions yet</div>
                      <p className="lb-empty-text">Your submitted weekly logs will appear here once you submit your first week.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ══════════════════════
            MODALS
        ══════════════════════ */}

        {/* Entry modal */}
        {modalOpen && (
          <div className="lb-overlay" onClick={() => setModalOpen(false)}>
            <div className="lb-modal" onClick={(e) => e.stopPropagation()}>
              <div className="lb-modal-header">
                <div>
                  <div className="lb-modal-eyebrow">Daily Entry</div>
                  <h3 className="lb-modal-title">
                    {selectedDate
                      ? parseLocalDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                      : '—'}
                  </h3>
                  {isReadOnly && (
                    <div className="lb-modal-sub" style={{ color: 'var(--warning)' }}>
                      {isInternshipCompleted ? 'Internship completed — read only' : 'Past entry — read only'}
                    </div>
                  )}
                </div>
                <button className="lb-modal-close" onClick={() => setModalOpen(false)}>
                  <X size={15} />
                </button>
              </div>
              <div className="lb-modal-body">
                <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 8 }}>
                  Activities &amp; Learning Outcomes
                </label>
                <textarea
                  className={`lb-entry-textarea${entryError ? ' error' : ''}`}
                  placeholder={isReadOnly ? 'No entry recorded.' : 'What did you work on today? Key activities, skills, and observations…'}
                  value={currentEntry}
                  onChange={(e) => { setCurrentEntry(e.target.value); if (e.target.value.trim()) setEntryError(null); }}
                  disabled={isReadOnly}
                />
                <div className={`lb-field-footer${entryError ? ' error' : ''}`}>
                  {entryError
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{entryError}</span>
                    : <span>{currentEntry.length} characters</span>}
                  {!isReadOnly && !entryError && <span>Draft auto-saved</span>}
                  {isReadOnly && <span style={{ color: 'var(--ink-4)' }}>Read only</span>}
                </div>
              </div>
              <div className="lb-modal-footer">
                <button className="lb-btn lb-btn-ghost" onClick={() => setModalOpen(false)}>
                  {isReadOnly ? 'Close' : 'Cancel'}
                </button>
                {!isReadOnly && (
                  <button className="lb-btn lb-btn-primary" onClick={handleSaveEntry}>
                    <CheckCircle size={15} />
                    Save Entry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Supervisor feedback modal */}
        {supervisorFeedbackOpen && activeSupervisorFeedback && (
          <div className="lb-overlay" onClick={() => setSupervisorFeedbackOpen(false)}>
            <div className="lb-modal lb-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="lb-modal-header">
                <div>
                  <div className="lb-modal-eyebrow">Review Feedback</div>
                  <h3 className="lb-modal-title">Supervisor Notes</h3>
                  <div className="lb-modal-sub">
                    {activeSupervisorFeedback.title} · Week of {activeSupervisorFeedback.metadata?.week_start_date}
                  </div>
                </div>
                <button className="lb-modal-close" onClick={() => setSupervisorFeedbackOpen(false)}>
                  <X size={15} />
                </button>
              </div>
              <div className="lb-modal-body">
                <div className="lb-feedback-panel" style={{ borderLeft: '3px solid var(--accent)' }}>
                  <div className="lb-feedback-panel-label" style={{ color: 'var(--accent)' }}>
                    <Briefcase size={14} />
                    Employer Supervisor
                  </div>
                  <p className={`lb-feedback-text${activeSupervisorFeedback.employer_review_notes ? '' : ' empty'}`}>
                    {activeSupervisorFeedback.employer_review_notes || 'No feedback provided yet.'}
                  </p>
                </div>
                <div className="lb-feedback-panel" style={{ borderLeft: '3px solid var(--warning)', marginTop: 12 }}>
                  <div className="lb-feedback-panel-label" style={{ color: 'var(--warning)' }}>
                    <Clock size={14} />
                    Institution Supervisor
                  </div>
                  <p className={`lb-feedback-text${activeSupervisorFeedback.institution_review_notes ? '' : ' empty'}`}>
                    {activeSupervisorFeedback.institution_review_notes || 'No feedback provided yet.'}
                  </p>
                </div>
              </div>
              <div className="lb-modal-footer" style={{ justifyContent: 'flex-end' }}>
                <button className="lb-btn lb-btn-primary" onClick={() => setSupervisorFeedbackOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit confirmation modal */}
        {submitModalOpen && (
          <div className="lb-overlay" onClick={() => setSubmitModalOpen(false)}>
            <div className="lb-modal lb-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="lb-modal-header">
                <div>
                  <div className="lb-modal-eyebrow">Review &amp; Confirm</div>
                  <h3 className="lb-modal-title">Submit Week for Review</h3>
                  <div className="lb-modal-sub">
                    Week of {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button className="lb-modal-close" onClick={() => setSubmitModalOpen(false)}>
                  <X size={15} />
                </button>
              </div>
              <div className="lb-modal-body">
                <div className="lb-warn-banner">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Once submitted, you cannot edit these logs unless a supervisor requests a revision.</span>
                </div>
                <div className="lb-preview-scroll">
                  {buildStandardLogbookMetadata({
                    weekStartDate: getLocalDateString(currentWeekStart),
                    entries: logbookEntries,
                    weeklySummary,
                  }).daily_entries.map((entry: any) => (
                    <div key={entry.date} className="lb-preview-entry">
                      <div className="lb-preview-day-label">
                        {entry.label}
                        <span className="lb-preview-day-date">{entry.date}</span>
                      </div>
                      <p className={`lb-preview-content${entry.description ? '' : ' empty'}`}>
                        {entry.description || 'No activity recorded.'}
                      </p>
                    </div>
                  ))}
                  <div className="lb-preview-entry" style={{ borderLeft: '3px solid var(--accent)' }}>
                    <div className="lb-preview-day-label" style={{ color: 'var(--accent)' }}>
                      Trainee Weekly Report
                    </div>
                    <p className="lb-preview-content">{weeklySummary}</p>
                  </div>
                </div>
              </div>
              <div className="lb-modal-footer">
                <button className="lb-btn lb-btn-ghost" onClick={() => setSubmitModalOpen(false)}>
                  Back to Editing
                </button>
                <button
                  className="lb-btn lb-btn-primary"
                  onClick={confirmSubmitLogbook}
                  disabled={submitting}
                >
                  {submitting ? <div className="lb-spinner" /> : <Send size={15} />}
                  Confirm &amp; Submit
                </button>
              </div>
            </div>
          </div>
        )}

        <FeedbackModal {...feedbackProps} />
      </div>
    </StudentLayout>
  );
};

export default StudentLogbook;
