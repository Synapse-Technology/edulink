import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Lock,
  BarChart2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { artifactService, type Artifact } from '../../services/reports/artifactService';
import { studentService } from '../../services/student/studentService';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { dateFormatter } from '../../utils/dateFormatter';
import type { Internship } from '../../types/internship';
import StudentDashboardSkeleton from '../../components/student/skeletons/StudentDashboardSkeleton';

/* ─────────────────────────────────────────────
   Design tokens — identical to StudentProfile
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
  .sa-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ══════════════════════════════════════
     HERO HEADER
  ══════════════════════════════════════ */
  .sa-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }
  .sa-hero-eyebrow {
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
  .sa-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .sa-hero-title em { font-style: italic; color: var(--ink-3); }
  .sa-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 480px;
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .sa-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--ink-3);
    margin-bottom: 20px;
  }
  .sa-hero-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* ── Placement status card (right side of hero) ── */
  .sa-placement-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    min-width: 200px;
    text-align: center;
  }
  .sa-placement-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .sa-placement-status {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1.1;
  }
  .sa-placement-sub { font-size: 12px; color: var(--ink-3); max-width: 150px; line-height: 1.5; }
  .sa-placement-icon {
    width: 48px; height: 48px;
    border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 2px;
  }
  .sa-placement-icon.ready   { background: var(--success-soft); color: var(--success); }
  .sa-placement-icon.locked  { background: var(--surface-3);    color: var(--ink-4); }

  /* ══════════════════════════════════════
     STAT CHECKS GRID
  ══════════════════════════════════════ */
  .sa-checks-section { margin-bottom: 40px; }
  .sa-section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }
  .sa-section-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .sa-section-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }
  .sa-section-sub {
    font-size: 13px;
    color: var(--ink-3);
    margin: 4px 0 0;
  }
  .sa-check-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .sa-check {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
  }
  .sa-check.ready   { box-shadow: inset 0 0 0 2px var(--success); }
  .sa-check.pending { box-shadow: inset 0 0 0 2px var(--warning); }
  .sa-check:hover {
    border-color: var(--border-2);
    box-shadow: inset 0 0 0 2px var(--accent), var(--shadow-sm);
    transform: translateY(-1px);
  }
  .sa-check-icon {
    width: 30px; height: 30px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sa-check-icon.ready   { background: var(--success-soft); color: var(--success); }
  .sa-check-icon.pending { background: var(--warning-soft); color: var(--warning); }
  .sa-check-icon.todo    { background: var(--danger-soft);  color: var(--danger); }
  .sa-check-icon.neutral { background: var(--surface-3);    color: var(--ink-4); }
  .sa-check-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .sa-check-desc  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ══════════════════════════════════════
     MAIN 2-COL FLOW
  ══════════════════════════════════════ */
  .sa-flow {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
  }
  .sa-main    { display: flex; flex-direction: column; gap: 20px; }
  .sa-sidebar { display: flex; flex-direction: column; gap: 16px; }

  /* ── Card ── */
  .sa-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .sa-card:hover { box-shadow: var(--shadow); }
  .sa-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .sa-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .sa-card-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }
  .sa-card-body { padding: 20px 24px; }

  /* ── Artifact rows ── */
  .sa-artifact-list { display: flex; flex-direction: column; gap: 10px; }
  .sa-artifact-list.scrollable {
    max-height: 760px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .sa-artifact-list.scrollable::-webkit-scrollbar { width: 6px; }
  .sa-artifact-list.scrollable::-webkit-scrollbar-track { background: transparent; }
  .sa-artifact-list.scrollable::-webkit-scrollbar-thumb {
    background: var(--border-2);
    border-radius: 999px;
  }
  .sa-artifact-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: border-color 0.15s, background 0.15s;
    position: relative;
    overflow: hidden;
  }
  .sa-artifact-row::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--success);
    transition: background 0.15s;
  }
  .sa-artifact-row:hover { border-color: var(--border-2); background: var(--surface-3); }
  .sa-artifact-icon {
    width: 36px; height: 36px;
    border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    background: var(--success-soft);
    color: var(--success);
  }
  .sa-artifact-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .sa-artifact-desc  { font-size: 12px; color: var(--ink-3); margin-top: 2px; line-height: 1.4; }
  .sa-artifact-actions { display: flex; gap: 8px; flex-shrink: 0; }

  /* ── Generate actions (sidebar) ── */
  .sa-gen-list { display: flex; flex-direction: column; gap: 0; }
  .sa-gen-item {
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }
  .sa-gen-item:last-child { border-bottom: none; padding-bottom: 0; }
  .sa-gen-item:first-child { padding-top: 0; }
  .sa-gen-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
  }
  .sa-gen-icon {
    width: 30px; height: 30px;
    border-radius: 9px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-bottom: 6px;
  }
  .sa-gen-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
  .sa-gen-desc  { font-size: 12px; color: var(--ink-3); line-height: 1.4; }

  /* ── Security panel ── */
  .sa-security-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .sa-security-item:last-child { border-bottom: none; }
  .sa-security-item:first-child { padding-top: 0; }
  .sa-security-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: var(--success-soft);
    color: var(--success);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sa-security-label { font-size: 12px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
  .sa-security-desc  { font-size: 12px; color: var(--ink-3); line-height: 1.4; }

  /* ── Tip ── */
  .sa-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  .sa-tip-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
  }
  .sa-tip-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .sa-tip-text  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ── Empty state ── */
  .sa-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    gap: 12px;
  }
  .sa-empty-icon {
    width: 56px; height: 56px;
    border-radius: var(--radius);
    background: var(--surface-3);
    color: var(--ink-4);
    display: flex; align-items: center; justify-content: center;
  }
  .sa-empty-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 400; color: var(--ink); margin: 0; }
  .sa-empty-sub   { font-size: 13px; color: var(--ink-3); max-width: 280px; line-height: 1.6; margin: 0; }

  /* ── Shared buttons ── */
  .sa-btn {
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
  .sa-btn:active { transform: scale(0.97); }
  .sa-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    pointer-events: none;
  }
  .sa-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25), 0 4px 12px rgba(26,92,255,0.15);
    width: 100%;
  }
  .sa-btn-primary:hover { box-shadow: 0 4px 16px rgba(26,92,255,0.35); transform: translateY(-1px); color: #fff; }
  .sa-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
    border: 1px solid var(--border);
  }
  .sa-btn-ghost:hover { background: var(--surface); border-color: var(--border-2); color: var(--ink); }
  .sa-btn-sm { padding: 7px 14px; font-size: 12px; }
  .sa-btn-icon {
    width: 32px; height: 32px;
    padding: 0;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  /* ── Badge ── */
  .sa-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    padding: 3px 9px;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .sa-badge-success { background: var(--success-soft); color: var(--success); }
  .sa-badge-warning { background: var(--warning-soft); color: var(--warning); }
  .sa-badge-neutral { background: var(--surface-3);    color: var(--ink-3); }
  .sa-badge-accent  { background: var(--accent-soft);  color: var(--accent); }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1100px) {
    .sa-flow { grid-template-columns: 1fr; }
    .sa-check-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .sa-hero { grid-template-columns: 1fr; }
    .sa-check-grid { grid-template-columns: 1fr; }
  }
`;

/* ══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const ARTIFACT_LIMITS = {
  CERTIFICATE: 2,
  LOGBOOK_REPORT: 5,
  PERFORMANCE_SUMMARY: 5,
};

/* ══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const StudentArtifacts: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [artifactData, internshipData] = await Promise.all([
          artifactService.getArtifacts(),
          studentService.getActiveInternship(),
        ]);
        setArtifacts(artifactData);
        if (internshipData) {
          setInternship((internshipData as any).internship || (internshipData as any));
        }
      } catch (err) {
        showToast.error(getErrorMessage(err, { action: 'Load Artifacts' }));
        logError(err, { action: 'Load Artifacts' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = async (artifact: Artifact) => {
    let toastId: string | undefined;
    try {
      toastId = showToast.loading('Preparing download...');
      await artifactService.downloadArtifact(artifact);
      if (toastId) showToast.dismiss(toastId);
      showToast.success('Download started');
    } catch (err) {
      if (toastId) showToast.dismiss(toastId);
      showToast.error(getErrorMessage(err, { action: 'Download Artifact' }));
      logError(err, { action: 'Download Artifact', data: { artifactId: artifact.id } });
    }
  };

  const handleGenerate = async (type: keyof typeof ARTIFACT_LIMITS) => {
    if (!internship) {
      showToast.error('You need an active internship before generating artifacts.');
      return;
    }
    const label =
      type === 'CERTIFICATE' ? 'Certificate'
      : type === 'LOGBOOK_REPORT' ? 'Logbook Report'
      : 'Performance Summary';
    let toastId: string | undefined;
    try {
      setGenerating(type);
      toastId = showToast.loading(`Generating ${label}...`);
      const newArtifact = await artifactService.generateArtifact(internship.id, type);
      setArtifacts([newArtifact, ...artifacts]);
      if (toastId) showToast.dismiss(toastId);
      showToast.success(`${label} generated successfully`);
    } catch (err) {
      if (toastId) showToast.dismiss(toastId);
      showToast.error(getErrorMessage(err, { action: `Generate ${label}` }));
      logError(err, { action: 'Generate Artifact', data: { type, internshipId: internship.id } });
    } finally {
      setGenerating(null);
    }
  };

  /* ── Derived ── */
  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'CERTIFICATE':         return <Award size={17} />;
      case 'LOGBOOK_REPORT':      return <FileText size={17} />;
      case 'PERFORMANCE_SUMMARY': return <BarChart2 size={17} />;
      default:                    return <FileDown size={17} />;
    }
  };

  const getGenerationCount = (type: string) =>
    artifacts.filter((a) => a.artifact_type === type).length;

  const isLimitReached = (type: keyof typeof ARTIFACT_LIMITS) =>
    getGenerationCount(type) >= ARTIFACT_LIMITS[type];

  const generationActions = [
    {
      type: 'LOGBOOK_REPORT' as const,
      title: 'Logbook Report',
      icon: FileText,
      copy: 'Generate a formal report from your recorded and reviewed placement evidence.',
      available: Boolean(internship),
    },
    {
      type: 'PERFORMANCE_SUMMARY' as const,
      title: 'Performance Summary',
      icon: BarChart2,
      copy: 'Create a compact summary of your placement performance and review history.',
      available: Boolean(internship),
    },
    {
      type: 'CERTIFICATE' as const,
      title: 'Completion Certificate',
      icon: Award,
      copy: 'Available only after your institution certifies the completed placement.',
      available: Boolean(internship && internship.status === 'CERTIFIED'),
    },
  ];

  const statChecks = [
    {
      title: 'Active placement',
      description: internship ? internship.title : 'No active internship found. Declare a placement to unlock generation.',
      state: internship ? 'ready' : 'todo',
      icon: internship ? CheckCircle : AlertCircle,
    },
    {
      title: 'Documents generated',
      description: artifacts.length > 0
        ? `${artifacts.length} artifact${artifacts.length !== 1 ? 's' : ''} in your vault.`
        : 'No artifacts generated yet.',
      state: artifacts.length > 0 ? 'ready' : 'neutral',
      icon: artifacts.length > 0 ? CheckCircle : FileDown,
    },
    {
      title: 'Public verification',
      description: 'All artifacts are publicly verifiable by employers and institutions.',
      state: 'ready',
      icon: ShieldCheck,
    },
    {
      title: 'Snapshot integrity',
      description: 'Artifacts capture data at generation time — immutable records.',
      state: 'ready',
      icon: Clock,
    },
  ];

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <StudentLayout>
      <style>{STYLES}</style>

      {loading ? (
        <StudentDashboardSkeleton />
      ) : (
        <div className={`sa-page${isDarkMode ? ' dark-mode' : ''}`}>

          {/* ── HERO ── */}
          <header className="sa-hero">
            <div>
              <div className="sa-hero-eyebrow">
                <Sparkles size={12} />
                EduLink · Verified Document Vault
              </div>
              <h1 className="sa-hero-title">
                Artifacts &amp; <em>Reports</em>
              </h1>
              <p className="sa-hero-sub">
                Access certificates, logbook reports, and official placement records.
                Each artifact is cryptographically stamped and publicly verifiable.
              </p>
              <div className="sa-hero-meta">
                <span className="sa-hero-meta-item">
                  <FileText size={13} />
                  {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} generated
                </span>
                <span className="sa-hero-meta-item">
                  <ShieldCheck size={13} />
                  Public verification enabled
                </span>
                <span className="sa-hero-meta-item">
                  <Clock size={13} />
                  Snapshot integrity at generation time
                </span>
              </div>
            </div>

            {/* Placement status card */}
            <div className="sa-placement-card">
              <span className="sa-placement-eyebrow">Active placement</span>
              <div className={`sa-placement-icon ${internship ? 'ready' : 'locked'}`}>
                {internship ? <CheckCircle size={24} /> : <Lock size={24} />}
              </div>
              <span className="sa-placement-status">
                {internship ? 'Ready' : 'Locked'}
              </span>
              <span className="sa-placement-sub">
                {internship
                  ? internship.title
                  : 'Declare a placement to unlock artifact generation.'}
              </span>
              {internship && (
                <span className="sa-badge sa-badge-success">
                  <CheckCircle size={10} /> Active
                </span>
              )}
            </div>
          </header>

          {/* ── STAT CHECKS ── */}
          <section className="sa-checks-section">
            <div className="sa-section-head">
              <div>
                <div className="sa-section-eyebrow">Vault status</div>
                <h2 className="sa-section-title">
                  {artifacts.length === 0
                    ? 'Your document vault is empty'
                    : `${artifacts.length} artifact${artifacts.length !== 1 ? 's' : ''} in your vault`}
                </h2>
                <p className="sa-section-sub">
                  All generated documents are publicly verifiable by employers and institutions.
                </p>
              </div>
            </div>
            <div className="sa-check-grid">
              {statChecks.map((check) => {
                const Icon = check.icon;
                return (
                  <div
                    key={check.title}
                    className={`sa-check${check.state === 'ready' ? ' ready' : ''}`}
                  >
                    <div className={`sa-check-icon ${check.state}`}>
                      <Icon size={15} />
                    </div>
                    <div className="sa-check-title">{check.title}</div>
                    <div className="sa-check-desc">{check.description}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── MAIN FLOW ── */}
          <div className="sa-flow">
            <main className="sa-main">

              {/* Artifact vault */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div>
                    <div className="sa-card-label">Document vault</div>
                    <h3 className="sa-card-title">Generated documents</h3>
                  </div>
                  <span className="sa-badge sa-badge-neutral">
                    {artifacts.length} total
                  </span>
                </div>
                <div className="sa-card-body">
                  {artifacts.length > 0 ? (
                    <div className={`sa-artifact-list${artifacts.length > 10 ? ' scrollable' : ''}`}>
                      {artifacts.map((artifact) => (
                        <div key={artifact.id} className="sa-artifact-row">
                          <div className="sa-artifact-icon">
                            {getArtifactIcon(artifact.artifact_type)}
                          </div>
                          <div>
                            <div className="sa-artifact-title">
                              {artifact.artifact_type_display}
                            </div>
                            <div className="sa-artifact-desc">
                              ID {artifact.id.substring(0, 8)} · Generated {dateFormatter.shortDate(artifact.created_at)}
                            </div>
                          </div>
                          <div className="sa-artifact-actions">
                            <span className="sa-badge sa-badge-success">
                              <CheckCircle size={10} /> Verified
                            </span>
                            <Link
                              to={`/verify/${artifact.id}`}
                              target="_blank"
                              className="sa-btn sa-btn-ghost sa-btn-sm sa-btn-icon"
                              title="Open public verification page"
                            >
                              <ExternalLink size={13} />
                            </Link>
                            <button
                              className="sa-btn sa-btn-ghost sa-btn-sm sa-btn-icon"
                              onClick={() => handleDownload(artifact)}
                              title="Download artifact"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="sa-empty">
                      <div className="sa-empty-icon">
                        <FileText size={28} />
                      </div>
                      <p className="sa-empty-title">No artifacts yet</p>
                      <p className="sa-empty-sub">
                        Generate reports once your placement evidence is recorded and reviewed.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </main>

            {/* ── SIDEBAR ── */}
            <aside className="sa-sidebar">

              {/* Generate new */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <div>
                    <div className="sa-card-label">Actions</div>
                    <h3 className="sa-card-title">Generate new</h3>
                  </div>
                </div>
                <div className="sa-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <div className="sa-gen-list">
                    {generationActions.map((action) => {
                      const Icon = action.icon;
                      const count = getGenerationCount(action.type);
                      const limitHit = isLimitReached(action.type);
                      const isRunning = generating === action.type;
                      return (
                        <div key={action.type} className="sa-gen-item">
                          <div className="sa-gen-top">
                            <div>
                              <div className="sa-gen-icon"><Icon size={14} /></div>
                              <div className="sa-gen-title">{action.title}</div>
                              <div className="sa-gen-desc">{action.copy}</div>
                            </div>
                            <span className={`sa-badge ${limitHit ? 'sa-badge-warning' : 'sa-badge-neutral'}`}>
                              {count}/{ARTIFACT_LIMITS[action.type]}
                            </span>
                          </div>
                          <button
                            className="sa-btn sa-btn-primary"
                            onClick={() => handleGenerate(action.type)}
                            disabled={!action.available || !!generating || limitHit}
                          >
                            {isRunning
                              ? 'Generating…'
                              : limitHit
                              ? 'Limit reached'
                              : !action.available
                              ? <><Lock size={13} /> Locked</>
                              : <><ArrowRight size={13} /> Generate</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Security & audit */}
              <div className="sa-card">
                <div className="sa-card-header">
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    Security &amp; Audit
                  </span>
                  <ShieldCheck size={15} style={{ color: 'var(--success)' }} />
                </div>
                <div className="sa-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                  {[
                    {
                      icon: ShieldCheck,
                      label: 'EduLink ledger',
                      desc: 'Every artifact is recorded in the immutable EduLink ledger for employer and board verification.',
                    },
                    {
                      icon: Clock,
                      label: 'Point-in-time snapshots',
                      desc: 'Artifacts capture your profile and logbook data at the exact moment of generation.',
                    },
                    {
                      icon: ExternalLink,
                      label: 'Public verification URL',
                      desc: 'Share a link anyone can use to confirm the authenticity of your document.',
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="sa-security-item">
                        <div className="sa-security-icon"><Icon size={13} /></div>
                        <div>
                          <div className="sa-security-label">{item.label}</div>
                          <div className="sa-security-desc">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tip */}
              <div className="sa-tip">
                <div className="sa-tip-icon"><TrendingUp size={16} /></div>
                <div className="sa-tip-title">Share artifacts with employers</div>
                <p className="sa-tip-text">
                  Employers can verify any artifact using the public link — no login required.
                  Include your verification URL in job applications to stand out.
                </p>
              </div>

            </aside>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentArtifacts;