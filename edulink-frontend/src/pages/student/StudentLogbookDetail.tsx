import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  User,
  Building2,
  BookOpen,
  MessageSquare,
  Layers,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { studentService } from '../../services/student/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import LogbookDetailSkeleton from '../../components/student/skeletons/LogbookDetailSkeleton';
import { generateLogbookPDF } from '../../utils/pdfGenerator';

/* ─────────────────────────────────────────────
   Design tokens — mirrors StudentLogbook.tsx
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

  .ld-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ── Back nav ── */
  .ld-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
    margin-bottom: 32px;
    text-decoration: none;
  }
  .ld-back:hover { color: var(--ink); }

  /* ── Page header ── */
  .ld-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 24px;
    align-items: end;
    padding: 0 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }
  .ld-header-eyebrow {
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
  .ld-header-title {
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .ld-header-title em {
    font-style: italic;
    color: var(--ink-3);
  }
  .ld-header-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .ld-header-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ld-header-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }

  /* ── Status badge in header ── */
  .ld-status-card {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 16px 20px;
    min-width: 180px;
  }
  .ld-status-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-4);
  }

  /* ── Main grid ── */
  .ld-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
  }
  @media (max-width: 1024px) {
    .ld-grid { grid-template-columns: 1fr; }
    .ld-header { grid-template-columns: 1fr; }
    .ld-header-actions { align-items: flex-start; }
    .ld-status-card { align-items: flex-start; }
  }

  /* ── Card ── */
  .ld-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .ld-card:hover { box-shadow: var(--shadow); }
  .ld-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .ld-card-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .ld-card-body { padding: 24px; }

  /* ── Sidebar ── */
  .ld-sidebar { display: flex; flex-direction: column; gap: 16px; }

  /* ── Day entry list ── */
  .ld-entry-list { display: flex; flex-direction: column; gap: 10px; }
  .ld-entry-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ld-entry-item::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--accent);
  }
  .ld-entry-item:hover {
    border-color: var(--border-2);
    box-shadow: var(--shadow-sm);
  }
  .ld-entry-day {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 2px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ld-entry-date-label {
    font-size: 11px;
    font-weight: 400;
    color: var(--ink-4);
    letter-spacing: 0;
    text-transform: none;
  }
  .ld-entry-body {
    font-size: 13px;
    color: var(--ink-2);
    white-space: pre-wrap;
    line-height: 1.65;
    margin-top: 8px;
  }

  /* Weekly summary block */
  .ld-summary-block {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius);
    padding: 18px 20px;
    margin-top: 12px;
  }
  .ld-summary-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .ld-summary-text {
    font-size: 13px;
    color: var(--ink-2);
    white-space: pre-wrap;
    line-height: 1.65;
  }
  .ld-summary-text.empty {
    color: var(--ink-4);
    font-style: italic;
  }

  /* Empty state */
  .ld-empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--ink-3);
  }
  .ld-empty-icon {
    width: 56px; height: 56px;
    border-radius: 18px;
    background: var(--surface-3);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px;
    color: var(--ink-4);
  }
  .ld-empty-title { font-size: 14px; font-weight: 600; color: var(--ink-2); margin-bottom: 5px; }
  .ld-empty-text { font-size: 12px; }

  /* ── Badges ── */
  .ld-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 10px;
    padding: 5px 12px;
    letter-spacing: 0.02em;
  }
  .ld-badge-approved { background: var(--success-soft); color: var(--success); }
  .ld-badge-pending  { background: var(--warning-soft); color: var(--warning); }
  .ld-badge-rejected { background: var(--danger-soft);  color: var(--danger); }
  .ld-badge-revision { background: rgba(99,102,241,0.1); color: #6366f1; }
  .ld-badge-reviewed { background: var(--accent-soft);   color: var(--accent); }

  /* ── Sidebar info rows ── */
  .ld-info-list { display: flex; flex-direction: column; gap: 0; }
  .ld-info-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }
  .ld-info-row:first-child { padding-top: 0; }
  .ld-info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ld-info-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .ld-info-icon-accent { background: var(--accent-soft); color: var(--accent); }
  .ld-info-icon-success { background: var(--success-soft); color: var(--success); }
  .ld-info-icon-warning { background: var(--warning-soft); color: var(--warning); }
  .ld-info-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .ld-info-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  .ld-info-sub {
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 1px;
  }

  /* ── Feedback panels ── */
  .ld-feedback-panel {
    border-radius: var(--radius);
    padding: 16px 18px;
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .ld-feedback-panel + .ld-feedback-panel { margin-top: 10px; }
  .ld-feedback-panel::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
  }
  .ld-feedback-panel.employer::before  { background: var(--accent); }
  .ld-feedback-panel.institution::before { background: var(--warning); }
  .ld-feedback-panel-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .ld-feedback-panel.employer .ld-feedback-panel-label { color: var(--accent); }
  .ld-feedback-panel.institution .ld-feedback-panel-label { color: var(--warning); }
  .ld-feedback-text {
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-2);
    margin: 0;
  }
  .ld-feedback-text.empty {
    color: var(--ink-4);
    font-style: italic;
    font-size: 12px;
  }

  /* ── Buttons ── */
  .ld-btn {
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
  .ld-btn:active { transform: scale(0.97); }
  .ld-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
  .ld-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25), 0 4px 12px rgba(26,92,255,0.15);
  }
  .ld-btn-primary:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(26,92,255,0.35);
    transform: translateY(-1px);
  }
  .ld-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
    border: 1px solid var(--border);
  }
  .ld-btn-ghost:hover:not(:disabled) { background: var(--surface); border-color: var(--border-2); }
  .ld-btn-full { width: 100%; }

  /* ── Stat pills in header ── */
  .ld-stat-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }
  .ld-stat-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--ink-3);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 4px 10px;
  }

  /* ── Error / not found ── */
  .ld-not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 100px 24px;
    min-height: 60vh;
  }
  .ld-not-found-icon {
    width: 80px; height: 80px;
    border-radius: 24px;
    background: var(--surface-3);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--ink-4);
    margin-bottom: 24px;
  }
  .ld-not-found h2 {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 400;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .ld-not-found p { font-size: 14px; color: var(--ink-3); max-width: 320px; margin-bottom: 24px; }

  /* Divider */
  .ld-divider { height: 1px; background: var(--border); margin: 4px 0 16px; }
`;

/* ─── status helpers ─── */
type StatusKey = 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED' | 'REVIEWED' | 'PENDING';

const STATUS_META: Record<StatusKey, { label: string; cls: string; icon: React.ReactNode }> = {
  ACCEPTED:          { label: 'Approved',        cls: 'ld-badge-approved', icon: <CheckCircle size={13} /> },
  REJECTED:          { label: 'Rejected',         cls: 'ld-badge-rejected', icon: <AlertCircle size={13} /> },
  REVISION_REQUIRED: { label: 'Needs Revision',   cls: 'ld-badge-revision', icon: <MessageSquare size={13} /> },
  REVIEWED:          { label: 'In Review',         cls: 'ld-badge-reviewed', icon: <Clock size={13} /> },
  PENDING:           { label: 'Pending Review',    cls: 'ld-badge-pending',  icon: <Clock size={13} /> },
};

const getStatus = (s: string) =>
  STATUS_META[s as StatusKey] || STATUS_META.PENDING;

/* ─── Day name helper ─── */
const dayName = (ds: string) =>
  new Date(`${ds}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
const fullDate = (ds: string) =>
  new Date(`${ds}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/* ══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const StudentLogbookDetail: React.FC = () => {
  const { evidenceId } = useParams<{ evidenceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [evidence, setEvidence] = useState<any | null>(null);
  const [internship, setInternship] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!evidenceId) return;
        const activeInternship = await studentService.getActiveInternship();
        const internshipData = (activeInternship as any)?.internship || activeInternship;
        setInternship(internshipData);
        if (internshipData) {
          const history = await studentService.getEvidence(internshipData.id);
          setEvidence(history.find((e: any) => e.id === evidenceId) ?? null);
        }
      } catch (err) {
        console.error('Failed to load logbook detail:', err);
        showToast.error('Could not load this logbook submission. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [evidenceId]);

  const handleDownloadPDF = async () => {
    if (!evidence) return;
    try {
      const profile = await studentService.getProfile();
      generateLogbookPDF({
        studentName: user ? `${user.firstName} ${user.lastName}` : 'Student',
        studentEmail: user?.email || '',
        studentReg: profile.registration_number,
        internshipTitle: internship?.title || evidence.internship_title || 'Internship',
        employerName: internship?.employer_details?.name || 'Employer',
        department: internship?.department,
        weekStartDate: evidence.metadata?.week_start_date || evidence.metadata?.weekStartDate || '',
        status: evidence.status,
        entries: evidence.metadata?.entries || {},
        employerFeedback: evidence.employer_review_notes,
        institutionFeedback: evidence.institution_review_notes,
      });
      showToast.success('PDF report generated successfully.');
    } catch (err) {
      console.error(err);
      showToast.error('Could not generate the PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <LogbookDetailSkeleton isDarkMode={isDarkMode} />
      </StudentLayout>
    );
  }

  /* ── Not found state ── */
  if (!evidence) {
    return (
      <StudentLayout>
        <style>{STYLES}</style>
        <div className={`ld-page${isDarkMode ? ' dark-mode' : ''}`}>
          <div className="ld-not-found">
            <div className="ld-not-found-icon"><BookOpen size={36} /></div>
            <h2>Submission <em>Not Found</em></h2>
            <p>This logbook submission could not be found or you don't have access to it.</p>
            <button className="ld-btn ld-btn-primary" onClick={() => navigate('/dashboard/student/logbook')}>
              <ArrowLeft size={15} />
              Back to Logbook
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  /* ── Derived data ── */
  const entries: Record<string, string> = evidence.metadata?.entries || {};
  const sortedDates = Object.keys(entries).sort();
  const weeklySummary: string = evidence.metadata?.weekly_summary || '';
  const weekStartDate: string = evidence.metadata?.week_start_date || '';
  const hasFeedback = evidence.employer_review_notes || evidence.institution_review_notes;
  const status = getStatus(evidence.status);

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`ld-page${isDarkMode ? ' dark-mode' : ''}`}>

        {/* ── Back nav ── */}
        <button className="ld-back" onClick={() => navigate('/dashboard/student/logbook')}>
          <ArrowLeft size={15} />
          Back to Logbook
        </button>

        {/* ── PAGE HEADER ── */}
        <header className="ld-header">
          <div>
            <div className="ld-header-eyebrow">
              <FileText size={12} />
              Reviewed Evidence · {internship?.title || 'Internship'}
            </div>
            <h1 className="ld-header-title">
              {evidence.title
                ? evidence.title.split(' ').slice(0, -1).join(' ') + ' '
                : 'Weekly '}
              <em>{evidence.title ? evidence.title.split(' ').slice(-1)[0] : 'Log'}</em>
            </h1>
            <div className="ld-header-meta">
              {weekStartDate && (
                <span className="ld-header-meta-item">
                  <Calendar size={13} />
                  Week of {weekStartDate}
                </span>
              )}
              <span className="ld-header-meta-item">
                <Clock size={13} />
                Submitted {new Date(evidence.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="ld-header-meta-item">
                <Layers size={13} />
                {sortedDates.length} day{sortedDates.length !== 1 ? 's' : ''} recorded
              </span>
            </div>
          </div>

          {/* Status card */}
          <div className="ld-status-card">
            <span className="ld-status-label">Review status</span>
            <span className={`ld-badge ${status.cls}`}>
              {status.icon}
              {status.label}
            </span>
            <button className="ld-btn ld-btn-ghost" onClick={handleDownloadPDF}>
              <Download size={14} />
              Download PDF
            </button>
          </div>
        </header>

        {/* ── MAIN GRID ── */}
        <div className="ld-grid">

          {/* LEFT — Daily entries */}
          <div>
            <div className="ld-card">
              <div className="ld-card-header">
                <span className="ld-card-title">Daily Professional Logs</span>
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                  {sortedDates.length} / 5 days
                </span>
              </div>
              <div className="ld-card-body">
                {sortedDates.length > 0 ? (
                  <div className="ld-entry-list">
                    {sortedDates.map((date) => (
                      <div key={date} className="ld-entry-item">
                        <div className="ld-entry-day">
                          <span>{dayName(date)}</span>
                          <span className="ld-entry-date-label">{fullDate(date)}</span>
                        </div>
                        <p className="ld-entry-body">{entries[date]}</p>
                      </div>
                    ))}

                    {/* Weekly summary */}
                    {weeklySummary && (
                      <div className="ld-summary-block">
                        <div className="ld-summary-label">Trainee Weekly Report</div>
                        <p className="ld-summary-text">{weeklySummary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ld-empty">
                    <div className="ld-empty-icon"><FileText size={26} /></div>
                    <div className="ld-empty-title">No entries recorded</div>
                    <p className="ld-empty-text">No daily activity logs were found for this submission.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Supervisor feedback — shown inline on mobile, in sidebar on desktop */}
            {hasFeedback && (
              <div className="ld-card" style={{ marginTop: 16, display: 'none' }} id="feedback-mobile">
                {/* Mobile only copy — shown via media query below */}
              </div>
            )}
          </div>

          {/* RIGHT — Sidebar */}
          <div className="ld-sidebar">

            {/* Placement context */}
            <div className="ld-card">
              <div className="ld-card-header">
                <span className="ld-card-title">Placement Context</span>
              </div>
              <div className="ld-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                <div className="ld-info-list">
                  <div className="ld-info-row">
                    <div className="ld-info-icon ld-info-icon-accent">
                      <Briefcase size={15} />
                    </div>
                    <div>
                      <div className="ld-info-label">Position</div>
                      <div className="ld-info-value">{internship?.title || 'Internship'}</div>
                      <div className="ld-info-sub">{internship?.employer_details?.name || internship?.employer_name || 'Employer'}</div>
                    </div>
                  </div>
                  <div className="ld-info-row">
                    <div className="ld-info-icon ld-info-icon-success">
                      <Building2 size={15} />
                    </div>
                    <div>
                      <div className="ld-info-label">Department</div>
                      <div className="ld-info-value">{internship?.department_name || internship?.department || 'Not set'}</div>
                    </div>
                  </div>
                  {weekStartDate && (
                    <div className="ld-info-row">
                      <div className="ld-info-icon ld-info-icon-accent" style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}>
                        <Calendar size={15} />
                      </div>
                      <div>
                        <div className="ld-info-label">Week</div>
                        <div className="ld-info-value">{weekStartDate}</div>
                        <div className="ld-info-sub">Week commencing</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supervisor reviews */}
            <div className="ld-card">
              <div className="ld-card-header">
                <span className="ld-card-title">Supervisor Reviews</span>
                {hasFeedback && (
                  <span className="ld-badge ld-badge-reviewed" style={{ padding: '3px 8px', fontSize: 11 }}>
                    <MessageSquare size={11} />
                    Feedback
                  </span>
                )}
              </div>
              <div className="ld-card-body" style={{ paddingTop: 0 }}>
                <div className="ld-feedback-panel employer" style={{ marginTop: 16 }}>
                  <div className="ld-feedback-panel-label">
                    <User size={13} />
                    Employer Supervisor
                  </div>
                  <p className={`ld-feedback-text${evidence.employer_review_notes ? '' : ' empty'}`}>
                    {evidence.employer_review_notes || 'No feedback provided yet from the employer supervisor.'}
                  </p>
                </div>
                <div className="ld-feedback-panel institution">
                  <div className="ld-feedback-panel-label">
                    <User size={13} />
                    Institution Supervisor
                  </div>
                  <p className={`ld-feedback-text${evidence.institution_review_notes ? '' : ' empty'}`}>
                    {evidence.institution_review_notes || 'No feedback provided yet from the institution supervisor.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="ld-card">
              <div className="ld-card-header">
                <span className="ld-card-title">Submission Summary</span>
              </div>
              <div className="ld-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                <div className="ld-info-list">
                  <div className="ld-info-row">
                    <div className="ld-info-icon" style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}>
                      <Layers size={15} />
                    </div>
                    <div>
                      <div className="ld-info-label">Days logged</div>
                      <div className="ld-info-value">{sortedDates.length} of 5</div>
                    </div>
                  </div>
                  <div className="ld-info-row">
                    <div className="ld-info-icon" style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}>
                      <Clock size={15} />
                    </div>
                    <div>
                      <div className="ld-info-label">Submitted on</div>
                      <div className="ld-info-value">
                        {new Date(evidence.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="ld-info-row">
                    <div className="ld-info-icon" style={{
                      background: evidence.status === 'ACCEPTED' ? 'var(--success-soft)' :
                                  evidence.status === 'REJECTED' ? 'var(--danger-soft)' :
                                  'var(--warning-soft)',
                      color: evidence.status === 'ACCEPTED' ? 'var(--success)' :
                             evidence.status === 'REJECTED' ? 'var(--danger)' :
                             'var(--warning)',
                    }}>
                      {status.icon}
                    </div>
                    <div>
                      <div className="ld-info-label">Current status</div>
                      <div className="ld-info-value">{status.label}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentLogbookDetail;