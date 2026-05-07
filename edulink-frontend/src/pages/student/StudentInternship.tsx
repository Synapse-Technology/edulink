import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building,
  Calendar,
  Check,
  FileText,
  Loader,
  Mail,
  MapPin,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { studentService } from '../../services/student/studentService';
import type { Artifact } from '../../services/reports/artifactService';
import { artifactService } from '../../services/reports/artifactService';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { dateFormatter } from '../../utils/dateFormatter';
import type { Internship } from '../../types/internship';
import StudentInternshipSkeleton from '../../components/student/skeletons/StudentInternshipSkeleton';
import ReportIncidentModal from '../../components/student/ReportIncidentModal';

/* ─────────────────────────────────────────────
   Design tokens — unified with ExternalPlacement
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
  .si-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ══════════════════════════════════════
     HERO
  ══════════════════════════════════════ */
  .si-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
    animation: si-fade-up 0.45s ease both;
  }
  @keyframes si-fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .si-hero-eyebrow {
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
  .si-hero-title {
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.75rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .si-hero-title em { font-style: italic; color: var(--ink-3); }
  .si-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 520px;
    line-height: 1.65;
    margin: 0 0 20px;
  }
  .si-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .si-hero-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
    transition: color 0.15s;
  }
  .si-hero-meta-item:hover { color: var(--ink-2); }

  /* Status card */
  .si-status-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px 28px;
    min-width: 190px;
    text-align: center;
  }
  .si-status-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 0 3px var(--success-soft);
    animation: si-pulse 2.2s ease infinite;
  }
  .si-status-dot.closed { background: var(--ink-4); box-shadow: none; animation: none; }
  @keyframes si-pulse {
    0%, 100% { box-shadow: 0 0 0 3px var(--success-soft); }
    50%       { box-shadow: 0 0 0 6px rgba(18,183,106,0.04); }
  }
  .si-status-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .si-status-label {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1;
  }
  .si-status-sub { font-size: 12px; color: var(--ink-3); max-width: 150px; line-height: 1.5; }
  .si-status-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 4px; }

  /* ══════════════════════════════════════
     STAT STRIP
  ══════════════════════════════════════ */
  .si-stats-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 32px;
    animation: si-fade-up 0.45s 0.08s ease both;
  }
  .si-stat {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
  }
  .si-stat:hover { border-color: var(--border-2); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
  .si-stat-icon {
    width: 40px; height: 40px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .si-stat-icon.blue    { background: var(--accent-soft);   color: var(--accent); }
  .si-stat-icon.green   { background: var(--success-soft);  color: var(--success); }
  .si-stat-icon.amber   { background: var(--warning-soft);  color: var(--warning); }
  .si-stat-num {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1;
  }
  .si-stat-label { font-size: 12px; color: var(--ink-3); margin-top: 2px; }

  /* ══════════════════════════════════════
     LAYOUT
  ══════════════════════════════════════ */
  .si-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    margin-bottom: 64px;
    align-items: start;
    animation: si-fade-up 0.45s 0.14s ease both;
  }
  .si-main    { display: flex; flex-direction: column; gap: 20px; }
  .si-sidebar { display: flex; flex-direction: column; gap: 16px; }

  /* ── Card ── */
  .si-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .si-card:hover { box-shadow: var(--shadow); }
  .si-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .si-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .si-card-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }
  .si-card-body { padding: 20px 24px; }

  /* ── Supervisor rows ── */
  .si-sup-list { display: flex; flex-direction: column; gap: 0; }
  .si-sup-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
  }
  .si-sup-row:last-child { border-bottom: none; padding-bottom: 0; }
  .si-sup-row:first-child { padding-top: 0; }
  .si-sup-icon {
    width: 38px; height: 38px;
    border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    background: var(--surface-3);
    color: var(--ink-3);
  }
  .si-sup-icon.ok { background: var(--success-soft); color: var(--success); }
  .si-sup-icon.pending { background: var(--warning-soft); color: var(--warning); }
  .si-sup-body { flex: 1; min-width: 0; }
  .si-sup-name { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 1px; }
  .si-sup-sub  { font-size: 12px; color: var(--ink-3); }
  .si-sup-actions { display: flex; gap: 6px; flex-shrink: 0; }

  /* ── Artifact rows ── */
  .si-artifact-list { display: flex; flex-direction: column; gap: 0; }
  .si-artifact-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }
  .si-artifact-row:last-child { border-bottom: none; padding-bottom: 0; }
  .si-artifact-row:first-child { padding-top: 0; }
  .si-artifact-icon {
    width: 40px; height: 40px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .si-artifact-icon.ready    { background: var(--success-soft); color: var(--success); }
  .si-artifact-icon.default  { background: var(--accent-soft);  color: var(--accent); }
  .si-artifact-icon.locked   { background: var(--surface-3);    color: var(--ink-4); }
  .si-artifact-body { flex: 1; min-width: 0; }
  .si-artifact-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
  .si-artifact-sub   { font-size: 12px; color: var(--ink-3); line-height: 1.45; }

  /* Vault list (sidebar) */
  .si-vault-list { display: flex; flex-direction: column; }
  .si-vault-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .si-vault-item:last-child { border-bottom: none; padding-bottom: 0; }
  .si-vault-item:first-child { padding-top: 0; }
  .si-vault-name  { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 1px; }
  .si-vault-date  { font-size: 11px; color: var(--ink-4); }
  .si-vault-btns  { display: flex; gap: 6px; flex-shrink: 0; }

  /* ── Danger panel ── */
  .si-danger-panel {
    background: var(--danger-soft);
    border: 1px solid rgba(239,68,68,0.18);
    border-radius: var(--radius-lg);
    padding: 20px;
  }
  .si-danger-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--danger-soft);
    color: var(--danger);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
  }
  .si-danger-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .si-danger-sub   { font-size: 12px; color: var(--ink-3); line-height: 1.5; margin-bottom: 14px; }

  /* ── Tip ── */
  .si-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  .si-tip-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
  }
  .si-tip-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .si-tip-text  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ── Buttons ── */
  .si-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius);
    padding: 9px 18px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
    white-space: nowrap;
    text-decoration: none;
  }
  .si-btn:active { transform: scale(0.97); }
  .si-btn:disabled { opacity: 0.40; cursor: not-allowed; transform: none; pointer-events: none; }

  .si-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25);
  }
  .si-btn-primary:hover { box-shadow: 0 4px 16px rgba(26,92,255,0.35); transform: translateY(-1px); color: #fff; }

  .si-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
  }
  .si-btn-ghost:hover { background: var(--border); color: var(--ink); }

  .si-btn-danger {
    background: var(--danger-soft);
    color: var(--danger);
    border: 1px solid rgba(239,68,68,0.25);
  }
  .si-btn-danger:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.4); }

  .si-btn-icon {
    padding: 7px;
    border-radius: var(--radius-sm);
    background: var(--surface-3);
    color: var(--ink-3);
    border: 1px solid var(--border);
  }
  .si-btn-icon:hover { background: var(--border); color: var(--ink); }
  .si-btn-icon.accent { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
  .si-btn-icon.accent:hover { background: var(--accent-2); }
  .si-btn-sm { padding: 7px 13px; font-size: 12px; }

  /* ── Badge ── */
  .si-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    padding: 3px 9px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .si-badge-success { background: var(--success-soft); color: var(--success); }
  .si-badge-warning { background: var(--warning-soft); color: var(--warning); }
  .si-badge-accent  { background: var(--accent-soft);  color: var(--accent); }
  .si-badge-neutral { background: var(--surface-3);    color: var(--ink-3); }

  /* ── Empty state ── */
  .si-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    padding: 40px 20px;
  }
  .si-empty-icon {
    width: 52px; height: 52px;
    border-radius: var(--radius);
    background: var(--surface-3);
    color: var(--ink-4);
    display: flex; align-items: center; justify-content: center;
  }
  .si-empty-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 400; color: var(--ink); margin: 0; }
  .si-empty-sub   { font-size: 13px; color: var(--ink-3); line-height: 1.55; margin: 0; max-width: 280px; }

  /* ── Spinner ── */
  @keyframes si-spin { to { transform: rotate(360deg); } }
  .si-spin { animation: si-spin 0.8s linear infinite; }

  /* ── Modal ── */
  .si-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: si-backdrop-in 0.2s ease;
  }
  @keyframes si-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
  .si-modal {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 460px;
    animation: si-modal-in 0.22s ease;
  }
  @keyframes si-modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  .si-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
  }
  .si-modal-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 400; color: var(--ink); margin: 0; }
  .si-modal-body  { padding: 20px 24px; }
  .si-modal-footer { padding: 16px 24px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }

  .si-link-row {
    display: flex;
    gap: 8px;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    align-items: center;
  }
  .si-link-text {
    flex: 1;
    font-size: 12px;
    font-family: monospace;
    color: var(--ink-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ══════════════════════════════════════
     NO INTERNSHIP STATE
  ══════════════════════════════════════ */
  .si-no-internship {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .si-no-internship-inner {
    max-width: 400px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .si-no-internship-icon {
    width: 72px; height: 72px;
    border-radius: 22px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--ink-4);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 4px;
  }
  .si-no-internship-title {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }
  .si-no-internship-title em { font-style: italic; color: var(--ink-3); }
  .si-no-internship-sub { font-size: 14px; color: var(--ink-3); line-height: 1.65; margin: 0; }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1100px) {
    .si-layout { grid-template-columns: 1fr; }
    .si-stats-strip { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 768px) {
    .si-hero { grid-template-columns: 1fr; }
    .si-stats-strip { grid-template-columns: 1fr; }
  }
`;

/* ══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const COMPLETED_STATUSES = ['COMPLETED', 'CERTIFIED'];
const CLOSED_STATUSES    = ['COMPLETED', 'CERTIFIED', 'TERMINATED'];

/* ══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const StudentInternship: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [generatingArtifacts, setGeneratingArtifacts] = useState<Record<string, boolean>>({});
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getActiveInternship();
        if (data) setInternship((data as any).internship || (data as any));
        setArtifacts(await artifactService.getArtifacts());
      } catch (err) {
        showToast.error(getErrorMessage(err, { action: 'Load Internship' }));
        logError(err, { action: 'Load Internship' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleGenerateArtifact = async (artifactType: string) => {
    if (!internship) return;
    setGeneratingArtifacts(prev => ({ ...prev, [artifactType]: true }));
    let toastId: string | undefined;
    try {
      toastId = showToast.loading(`Generating ${artifactType.replace('_', ' ').toLowerCase()}…`);
      const artifact = await artifactService.generateArtifact(internship.id, artifactType);
      const finalStatus: any = artifact.status === 'SUCCESS' || artifact.file
        ? { status: 'SUCCESS' }
        : await artifactService.pollArtifactStatus(artifact.id, 12, 1000);

      if (finalStatus.status === 'SUCCESS') {
        const updated = await artifactService.getArtifacts();
        setArtifacts(updated);
        showToast.dismiss(toastId); toastId = undefined;
        showToast.success(`${artifactType.replace('_', ' ')} generated!`);
        if (artifactType === 'CERTIFICATE') {
          const cert = updated.find(a => a.artifact_type === 'CERTIFICATE' && a.id === artifact.id);
          if (cert) setTimeout(() => artifactService.downloadArtifact(cert), 500);
        }
      } else if (finalStatus.status === 'FAILED') {
        showToast.dismiss(toastId); toastId = undefined;
        showToast.error(finalStatus.error_message || 'Generation failed. Please try again.');
      }
    } catch (err) {
      const updated = await artifactService.getArtifacts().catch(() => []);
      const gen = updated.find(a => a.artifact_type === artifactType);
      if (gen) { setArtifacts(updated); showToast.dismiss(toastId); toastId = undefined; showToast.success('Generated successfully!'); return; }
      showToast.error(getErrorMessage(err, { action: 'Generate Artifact' }));
      logError(err, { action: 'Generate Artifact', data: { artifactType } });
    } finally {
      if (toastId) showToast.dismiss(toastId);
      setGeneratingArtifacts(prev => ({ ...prev, [artifactType]: false }));
    }
  };


  const artifactDefs = [
    {
      type: 'LOGBOOK_REPORT',
      title: 'Logbook Report',
      sub: 'Consolidated evidence from all accepted logbook submissions.',
      icon: <FileText size={18} />,
      disabled: !internship,
    },
    {
      type: 'PERFORMANCE_SUMMARY',
      title: 'Performance Summary',
      sub: 'Aggregated review outcomes and placement performance metrics.',
      icon: <Award size={18} />,
      disabled: !internship,
    },
    {
      type: 'CERTIFICATE',
      title: 'Completion Certificate',
      sub: 'Available once your institution certifies this placement.',
      icon: <ShieldCheck size={18} />,
      disabled: !internship || internship.status !== 'CERTIFIED',
    },
  ];

  const renderSupRow = (
    title: string,
    icon: React.ReactNode,
    supervisor?: { name?: string; email?: string } | null,
    pending?: boolean,
  ) => {
    const hasData = Boolean(supervisor);
    return (
      <div className="si-sup-row">
        <div className={`si-sup-icon ${hasData ? 'ok' : 'pending'}`}>{icon}</div>
        <div className="si-sup-body">
          <div className="si-sup-name">{title}</div>
          <div className="si-sup-sub">
            {supervisor
              ? `${supervisor.name || 'Assigned'}${supervisor.email ? ` · ${supervisor.email}` : ''}`
              : pending ? 'Resolving supervisor profile…' : 'Pending assignment'}
          </div>
        </div>
        <div className="si-sup-actions">
          {supervisor?.email && (
            <a className="si-btn si-btn-icon si-btn-sm" href={`mailto:${supervisor.email}`} title="Email supervisor">
              <Mail size={14} />
            </a>
          )}
        </div>
      </div>
    );
  };

  const isComplete = internship ? COMPLETED_STATUSES.includes(internship.status) : false;
  const isClosed   = internship ? CLOSED_STATUSES.includes(internship.status) : false;

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`si-page${isDarkMode ? ' dark-mode' : ''}`}>

        {loading ? (
          <StudentInternshipSkeleton isDarkMode={isDarkMode} />
        ) : !internship ? (

          /* ── No internship ── */
          <div className="si-no-internship">
            <div className="si-no-internship-inner">
              <div className="si-no-internship-icon"><Briefcase size={32} /></div>
              <h2 className="si-no-internship-title">No <em>active</em> placement</h2>
              <p className="si-no-internship-sub">
                Once a placement becomes active, your supervision panel, logbooks, generated artifacts,
                and support actions will all appear here.
              </p>
              <Link to="/opportunities" className="si-btn si-btn-primary" style={{ marginTop: 8 }}>
                <ArrowRight size={14} /> Browse Opportunities
              </Link>
            </div>
          </div>

        ) : (
          <>
            {/* ── HERO ── */}
            <header className="si-hero">
              <div>
                <div className="si-hero-eyebrow">
                  <Sparkles size={12} />
                  EduLink · Placement Workspace
                </div>
                <h1 className="si-hero-title">
                  {internship.title?.split(' ').slice(0, -1).join(' ') || 'Active'}{' '}
                  <em>{internship.title?.split(' ').slice(-1)[0] || 'Placement'}</em>
                </h1>
                <p className="si-hero-sub">
                  {internship.description ||
                    'Track your active attachment, submit professional evidence, and keep every supervisor-facing record in one trusted workflow.'}
                </p>
                <div className="si-hero-meta">
                  <span className="si-hero-meta-item"><Building size={13} /> {internship.employer_details?.name || 'Employer pending'}</span>
                  <span className="si-hero-meta-item"><MapPin size={13} /> {internship.location || 'Remote'}</span>
                  <span className="si-hero-meta-item"><Calendar size={13} /> Started {dateFormatter.shortDate(internship.start_date || internship.created_at)}</span>
                </div>
              </div>

              {/* Status card */}
              <div className="si-status-card">
                <div className={`si-status-dot${isClosed ? ' closed' : ''}`} />
                <span className="si-status-eyebrow">Placement status</span>
                <span className="si-status-label">{isComplete ? 'Complete' : 'Active'}</span>
                <span className="si-status-sub">
                  {internship.logbook_count > 0
                    ? `${internship.logbook_count} logbook${internship.logbook_count !== 1 ? 's' : ''} submitted`
                    : 'No logbooks submitted yet'}
                </span>
                <div className="si-status-actions">
                  <Link to="/dashboard/student/logbook" className="si-btn si-btn-primary si-btn-sm" style={{ width: '100%' }}>
                    <FileText size={13} /> Open Logbook
                  </Link>
                  <button
                    className="si-btn si-btn-danger si-btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => setShowIncidentModal(true)}
                    disabled={isClosed}
                  >
                    <AlertTriangle size={13} /> Report Incident
                  </button>
                </div>
              </div>
            </header>

            {/* ── STAT STRIP ── */}
            <div className="si-stats-strip">
              <div className="si-stat">
                <div className="si-stat-icon blue"><TrendingUp size={18} /></div>
                <div>
                  <div className="si-stat-num">{internship.logbook_count ?? 0}</div>
                  <div className="si-stat-label">Logbook submissions</div>
                </div>
              </div>
              <div className="si-stat">
                <div className="si-stat-icon green"><Award size={18} /></div>
                <div>
                  <div className="si-stat-num">{artifacts.length}</div>
                  <div className="si-stat-label">Generated artifacts</div>
                </div>
              </div>
              <div className="si-stat">
                <div className="si-stat-icon amber"><Clock size={18} /></div>
                <div>
                  <div className="si-stat-num">{internship.status}</div>
                  <div className="si-stat-label">Current placement state</div>
                </div>
              </div>
            </div>

            {/* ── MAIN LAYOUT ── */}
            <div className="si-layout">
              <main className="si-main">

                {/* Supervision card */}
                <div className="si-card">
                  <div className="si-card-header">
                    <div>
                      <div className="si-card-label">People</div>
                      <h3 className="si-card-title">Supervision &amp; Trust</h3>
                    </div>
                    <span className="si-badge si-badge-success">
                      <Check size={10} /> {internship.status}
                    </span>
                  </div>
                  <div className="si-card-body">
                    <div className="si-sup-list">
                      {renderSupRow(
                        'Employer supervisor',
                        <UserCheck size={16} />,
                        internship.employer_supervisor_details,
                        Boolean(internship.employer_supervisor_id),
                      )}
                      {renderSupRow(
                        'Institution supervisor',
                        <ShieldCheck size={16} />,
                        internship.institution_supervisor_details,
                        Boolean(internship.institution_supervisor_id),
                      )}
                      <div className="si-sup-row">
                        <div className={`si-sup-icon ${internship.logbook_count > 0 ? 'ok' : 'pending'}`}>
                          <FileText size={16} />
                        </div>
                        <div className="si-sup-body">
                          <div className="si-sup-name">Weekly evidence</div>
                          <div className="si-sup-sub">
                            {internship.logbook_count || 0} logbook submission{internship.logbook_count !== 1 ? 's' : ''} recorded
                          </div>
                        </div>
                        <div className="si-sup-actions">
                          <Link to="/dashboard/student/logbook" className="si-btn si-btn-ghost si-btn-sm">
                            Open <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Artifact actions card */}
                <div className="si-card">
                  <div className="si-card-header">
                    <div>
                      <div className="si-card-label">Documents</div>
                      <h3 className="si-card-title">Placement Evidence Actions</h3>
                    </div>
                    <Link to="/dashboard/student/artifacts" className="si-btn si-btn-ghost si-btn-sm">
                      Open vault <ExternalLink size={11} />
                    </Link>
                  </div>
                  <div className="si-card-body">
                    <div className="si-artifact-list">
                      {artifactDefs.map(def => {
                        const has = artifacts.some(a => a.artifact_type === def.type);
                        const busy = generatingArtifacts[def.type];
                        return (
                          <div className="si-artifact-row" key={def.type}>
                            <div className={`si-artifact-icon ${has ? 'ready' : def.disabled ? 'locked' : 'default'}`}>
                              {has ? <Check size={18} /> : def.icon}
                            </div>
                            <div className="si-artifact-body">
                              <div className="si-artifact-title">{def.title}</div>
                              <div className="si-artifact-sub">{def.sub}</div>
                            </div>
                            <button
                              className="si-btn si-btn-primary si-btn-sm"
                              onClick={() => handleGenerateArtifact(def.type)}
                              disabled={def.disabled || busy}
                            >
                              {busy
                                ? <><Loader size={13} className="si-spin" /> Generating…</>
                                : has ? 'Re-generate' : 'Generate'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </main>

              {/* ── SIDEBAR ── */}
              <aside className="si-sidebar">

                {/* Safety panel */}
                <div className="si-danger-panel">
                  <div className="si-danger-icon"><AlertTriangle size={16} /></div>
                  <div className="si-danger-title">Safety &amp; Support</div>
                  <p className="si-danger-sub">
                    Use this for urgent placement concerns or workplace incidents. Your institution
                    coordinator will be notified immediately.
                  </p>
                  <button
                    className="si-btn si-btn-danger"
                    style={{ width: '100%' }}
                    onClick={() => setShowIncidentModal(true)}
                    disabled={isClosed}
                  >
                    <AlertTriangle size={14} /> Report an Incident
                  </button>
                </div>

                {/* Tip */}
                <div className="si-tip">
                  <div className="si-tip-icon"><TrendingUp size={16} /></div>
                  <div className="si-tip-title">Stay ahead on logbooks</div>
                  <p className="si-tip-text">
                    Students who submit weekly logbooks are reviewed 3× faster and generate
                    richer performance summaries. Don't let entries pile up.
                  </p>
                </div>

              </aside>
            </div>
          </>
        )}

        {/* ── Report incident modal ── */}
        {internship && (
          <ReportIncidentModal
            show={showIncidentModal}
            onHide={() => setShowIncidentModal(false)}
            applicationId={internship.id}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentInternship;