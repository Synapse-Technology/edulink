import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Link as LinkIcon,
  AlertCircle,
  Building2,
  ArrowRight,
  RefreshCw,
  User,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { internshipService, type ExternalPlacementDeclaration } from '../../services/internship/internshipService';
import { showToast } from '../../utils/toast';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';

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

  .ep-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ══════════════════════════════════════
     HERO
  ══════════════════════════════════════ */
  .ep-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }
  .ep-hero-eyebrow {
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
  .ep-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .ep-hero-title em { font-style: italic; color: var(--ink-3); }
  .ep-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 480px;
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .ep-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .ep-hero-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* Stat card (right of hero) */
  .ep-stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    min-width: 180px;
    text-align: center;
  }
  .ep-stat-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .ep-stat-number {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1;
  }
  .ep-stat-sub { font-size: 12px; color: var(--ink-3); max-width: 140px; line-height: 1.5; }

  /* ══════════════════════════════════════
     STEPS GRID
  ══════════════════════════════════════ */
  .ep-steps-section { margin-bottom: 40px; }
  .ep-section-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .ep-section-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0 0 4px;
  }
  .ep-section-sub {
    font-size: 13px;
    color: var(--ink-3);
    margin: 0 0 20px;
  }
  .ep-steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .ep-step {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
  }
  .ep-step:hover {
    border-color: var(--border-2);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }
  .ep-step-num {
    width: 30px; height: 30px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .ep-step-num.s1 { background: var(--accent-soft);   color: var(--accent); }
  .ep-step-num.s2 { background: var(--warning-soft);  color: var(--warning); }
  .ep-step-num.s3 { background: var(--success-soft);  color: var(--success); }
  .ep-step-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .ep-step-desc  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ══════════════════════════════════════
     MAIN FLOW — stacked sections
  ══════════════════════════════════════ */
  .ep-flow {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    margin-bottom: 64px;
    align-items: start;
  }
  .ep-main    { display: flex; flex-direction: column; gap: 20px; }
  .ep-sidebar { display: flex; flex-direction: column; gap: 16px; }

  /* ── Card ── */
  .ep-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .ep-card:hover { box-shadow: var(--shadow); }
  .ep-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .ep-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .ep-card-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }
  .ep-card-body { padding: 20px 24px; }

  /* ── Form fields ── */
  .ep-form { display: flex; flex-direction: column; gap: 0; }
  .ep-field-group {
    display: grid;
    gap: 16px;
  }
  .ep-field-group.cols-2 { grid-template-columns: 1fr 1fr; }
  .ep-field-group.cols-1 { grid-template-columns: 1fr; }
  .ep-section-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 0 16px;
  }
  .ep-divider-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-4);
    white-space: nowrap;
  }
  .ep-divider-line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .ep-field { display: flex; flex-direction: column; gap: 6px; }
  .ep-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-2);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ep-input,
  .ep-select,
  .ep-textarea {
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 9px 13px;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }
  .ep-input:focus,
  .ep-select:focus,
  .ep-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .ep-select { appearance: none; cursor: pointer; }
  .ep-textarea { resize: vertical; min-height: 88px; }
  .ep-file-wrap {
    background: var(--surface);
    border: 1px dashed var(--border-2);
    border-radius: var(--radius-sm);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .ep-file-wrap:hover { border-color: var(--accent); background: var(--accent-soft); }
  .ep-file-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ep-file-label  { font-size: 13px; font-weight: 500; color: var(--ink-2); }
  .ep-file-sub    { font-size: 11px; color: var(--ink-4); margin-top: 2px; }
  .ep-file-input  { display: none; }

  /* ── Submission row ── */
  .ep-submit-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    margin-top: 20px;
  }
  .ep-submit-hint { font-size: 12px; color: var(--ink-4); line-height: 1.5; max-width: 260px; }

  /* ── History list (sidebar) ── */
  .ep-history-list { display: flex; flex-direction: column; gap: 0; }
  .ep-history-item {
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }
  .ep-history-item:last-child { border-bottom: none; padding-bottom: 0; }
  .ep-history-item:first-child { padding-top: 0; }
  .ep-history-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 6px;
  }
  .ep-history-role    { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
  .ep-history-company { font-size: 12px; color: var(--ink-3); }
  .ep-history-note {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    margin-top: 6px;
    line-height: 1.4;
  }
  .ep-history-review {
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 6px;
    padding: 8px 10px;
    background: var(--surface-3);
    border-radius: var(--radius-sm);
    line-height: 1.4;
  }

  /* ── Empty state ── */
  .ep-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    padding: 32px 16px;
  }
  .ep-empty-icon {
    width: 48px; height: 48px;
    border-radius: var(--radius);
    background: var(--surface-3);
    color: var(--ink-4);
    display: flex; align-items: center; justify-content: center;
  }
  .ep-empty-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 400; color: var(--ink); margin: 0; }
  .ep-empty-sub   { font-size: 12px; color: var(--ink-3); line-height: 1.5; margin: 0; max-width: 220px; }

  /* ── Tip ── */
  .ep-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  .ep-tip-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
  }
  .ep-tip-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .ep-tip-text  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ── Buttons ── */
  .ep-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius);
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
    white-space: nowrap;
    text-decoration: none;
  }
  .ep-btn:active { transform: scale(0.97); }
  .ep-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; pointer-events: none; }
  .ep-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25), 0 4px 12px rgba(26,92,255,0.15);
  }
  .ep-btn-primary:hover { box-shadow: 0 4px 16px rgba(26,92,255,0.35); transform: translateY(-1px); color: #fff; }

  /* ── Badge ── */
  .ep-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    padding: 3px 9px;
    letter-spacing: 0.02em;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .ep-badge-success { background: var(--success-soft); color: var(--success); }
  .ep-badge-warning { background: var(--warning-soft); color: var(--warning); }
  .ep-badge-danger  { background: var(--danger-soft);  color: var(--danger); }
  .ep-badge-neutral { background: var(--surface-3);    color: var(--ink-3); }
  .ep-badge-accent  { background: var(--accent-soft);  color: var(--accent); }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1100px) {
    .ep-flow { grid-template-columns: 1fr; }
    .ep-steps-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 768px) {
    .ep-hero { grid-template-columns: 1fr; }
    .ep-field-group.cols-2 { grid-template-columns: 1fr; }
  }
`;

/* ══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const ExternalPlacement: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [declarations, setDeclarations] = useState<ExternalPlacementDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    institution_id: user?.institution_id || '',
    company_name: '',
    company_contact_name: '',
    company_contact_email: '',
    company_contact_phone: '',
    role_title: '',
    location: '',
    location_type: 'ONSITE' as 'ONSITE' | 'REMOTE' | 'HYBRID',
    start_date: '',
    end_date: '',
    source_url: '',
    student_notes: '',
  });

  const loadDeclarations = async () => {
    try {
      setLoading(true);
      setDeclarations(await internshipService.getExternalPlacementDeclarations());
    } catch {
      showToast.error('Failed to load external placement declarations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDeclarations(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution_id) {
      showToast.error('Your account must have an institution before declaring a placement.');
      return;
    }
    try {
      setSubmitting(true);
      await internshipService.declareExternalPlacement({
        ...formData,
        proof_document: proofFile || undefined,
      });
      showToast.success('External placement submitted for institution review.');
      setFormData(prev => ({
        ...prev,
        company_name: '', company_contact_name: '', company_contact_email: '',
        company_contact_phone: '', role_title: '', location: '',
        location_type: 'ONSITE', start_date: '', end_date: '',
        source_url: '', student_notes: '',
      }));
      setProofFile(null);
      await loadDeclarations();
    } catch (error: any) {
      showToast.error(getUserFacingErrorMessage(error?.message, error?.status) || 'Failed to submit external placement.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: ExternalPlacementDeclaration['status']) => {
    if (status === 'APPROVED') return <span className="ep-badge ep-badge-success"><CheckCircle size={10} /> Approved</span>;
    if (status === 'REJECTED') return <span className="ep-badge ep-badge-danger"><AlertCircle size={10} /> Rejected</span>;
    if (status === 'CHANGES_REQUESTED') return <span className="ep-badge ep-badge-warning"><RefreshCw size={10} /> Changes requested</span>;
    return <span className="ep-badge ep-badge-neutral"><Clock size={10} /> Pending</span>;
  };

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`ep-page${isDarkMode ? ' dark-mode' : ''}`}>

        {/* ── HERO ── */}
        <header className="ep-hero">
          <div>
            <div className="ep-hero-eyebrow">
              <Sparkles size={12} />
              EduLink · Placement Declaration
            </div>
            <h1 className="ep-hero-title">
              External <em>Placement</em>
            </h1>
            <p className="ep-hero-sub">
              Declare an internship or attachment secured outside EduLink so your institution
              can verify it, assign oversight, and unlock your logbooks.
            </p>
            <div className="ep-hero-meta">
              <span className="ep-hero-meta-item"><Briefcase size={13} /> Placement facts</span>
              <span className="ep-hero-meta-item"><Upload size={13} /> Proof upload</span>
              <span className="ep-hero-meta-item"><CheckCircle size={13} /> Institution review</span>
            </div>
          </div>

          {/* Stat card */}
          <div className="ep-stat-card">
            <span className="ep-stat-eyebrow">Declarations</span>
            <span className="ep-stat-number">{declarations.length}</span>
            <span className="ep-stat-sub">submitted external placements</span>
          </div>
        </header>

        {/* ── HOW IT WORKS STEPS ── */}
        <section className="ep-steps-section">
          <div className="ep-section-eyebrow">How it works</div>
          <h2 className="ep-section-title">Three steps to verification</h2>
          <p className="ep-section-sub">
            Complete each section below — your institution will review and unlock your logbook on approval.
          </p>
          <div className="ep-steps-grid">
            {[
              {
                n: '1', cls: 's1', icon: Building2,
                title: 'Placement facts',
                desc: 'Provide company name, your role title, dates, location, and work mode.',
              },
              {
                n: '2', cls: 's2', icon: User,
                title: 'Employer contact',
                desc: 'Give your institution a named contact at the company they can reach for verification.',
              },
              {
                n: '3', cls: 's3', icon: FileText,
                title: 'Proof document',
                desc: 'Attach an offer letter, email thread, or equivalent evidence to support the declaration.',
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="ep-step">
                  <div className={`ep-step-num ${step.cls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="ep-step-title">{step.title}</div>
                  <div className="ep-step-desc">{step.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── MAIN FLOW ── */}
        <div className="ep-flow">
          <main className="ep-main">

            {/* ─ Form card ─ */}
            <div className="ep-card">
              <div className="ep-card-header">
                <div>
                  <div className="ep-card-label">Placement declaration</div>
                  <h3 className="ep-card-title">Placement details</h3>
                </div>
                <span className="ep-badge ep-badge-accent">
                  <Briefcase size={10} /> New declaration
                </span>
              </div>
              <div className="ep-card-body">
                <form onSubmit={handleSubmit} className="ep-form">

                  {/* ── Section: Placement facts ── */}
                  <div className="ep-section-divider">
                    <span className="ep-divider-label">
                      <Building2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Placement facts
                    </span>
                    <div className="ep-divider-line" />
                  </div>
                  <div className="ep-field-group cols-2">
                    <div className="ep-field">
                      <label className="ep-label"><Building2 size={12} /> Company name</label>
                      <input className="ep-input" name="company_name" value={formData.company_name} onChange={handleChange} placeholder="e.g. Safaricom PLC" required />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><Briefcase size={12} /> Role title</label>
                      <input className="ep-input" name="role_title" value={formData.role_title} onChange={handleChange} placeholder="e.g. Software Engineering Intern" required />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><Clock size={12} /> Start date</label>
                      <input type="date" className="ep-input" name="start_date" value={formData.start_date} onChange={handleChange} required />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><Clock size={12} /> End date</label>
                      <input type="date" className="ep-input" name="end_date" value={formData.end_date} onChange={handleChange} />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><MapPin size={12} /> Location</label>
                      <input className="ep-input" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Nairobi, Kenya" />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><Briefcase size={12} /> Work mode</label>
                      <select className="ep-select" name="location_type" value={formData.location_type} onChange={handleChange}>
                        <option value="ONSITE">On-site</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="REMOTE">Remote</option>
                      </select>
                    </div>
                  </div>

                  {/* ── Section: Employer contact ── */}
                  <div className="ep-section-divider">
                    <span className="ep-divider-label">
                      <User size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Employer contact
                    </span>
                    <div className="ep-divider-line" />
                  </div>
                  <div className="ep-field-group cols-2">
                    <div className="ep-field">
                      <label className="ep-label"><User size={12} /> Contact name</label>
                      <input className="ep-input" name="company_contact_name" value={formData.company_contact_name} onChange={handleChange} placeholder="Supervisor full name" />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><Mail size={12} /> Contact email</label>
                      <input type="email" className="ep-input" name="company_contact_email" value={formData.company_contact_email} onChange={handleChange} placeholder="supervisor@company.com" />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><Phone size={12} /> Contact phone</label>
                      <input className="ep-input" name="company_contact_phone" value={formData.company_contact_phone} onChange={handleChange} placeholder="+254 700 000 000" />
                    </div>
                    <div className="ep-field">
                      <label className="ep-label"><LinkIcon size={12} /> Original opportunity URL</label>
                      <input type="url" className="ep-input" name="source_url" value={formData.source_url} onChange={handleChange} placeholder="https://..." />
                    </div>
                  </div>

                  {/* ── Section: Proof & notes ── */}
                  <div className="ep-section-divider">
                    <span className="ep-divider-label">
                      <FileText size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Proof &amp; notes
                    </span>
                    <div className="ep-divider-line" />
                  </div>
                  <div className="ep-field-group cols-1">
                    <div className="ep-field">
                      <label className="ep-label"><Upload size={12} /> Offer letter or proof document</label>
                      <label className="ep-file-wrap">
                        <div className="ep-file-icon"><Upload size={16} /></div>
                        <div>
                          <div className="ep-file-label">
                            {proofFile ? proofFile.name : 'Click to attach a file'}
                          </div>
                          <div className="ep-file-sub">PDF, JPG, PNG, or DOCX · Max 10 MB</div>
                        </div>
                        <input
                          type="file"
                          className="ep-file-input"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                    <div className="ep-field">
                      <label className="ep-label">Notes to institution</label>
                      <textarea
                        className="ep-textarea"
                        name="student_notes"
                        value={formData.student_notes}
                        onChange={handleChange}
                        placeholder="Any context that will help your institution review this placement faster…"
                      />
                    </div>
                  </div>

                  {/* Submit row */}
                  <div className="ep-submit-row">
                    <p className="ep-submit-hint">
                      Your institution will be notified. Approval unlocks your placement logbook.
                    </p>
                    <button className="ep-btn ep-btn-primary" type="submit" disabled={submitting}>
                      {submitting
                        ? <><Clock size={13} /> Submitting…</>
                        : <><ArrowRight size={13} /> Submit for review</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </main>

          {/* ── SIDEBAR ── */}
          <aside className="ep-sidebar">

            {/* Review history */}
            <div className="ep-card">
              <div className="ep-card-header">
                <div>
                  <div className="ep-card-label">Review history</div>
                  <h3 className="ep-card-title">Past declarations</h3>
                </div>
                <span className="ep-badge ep-badge-neutral">{declarations.length} total</span>
              </div>
              <div className="ep-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                {loading ? (
                  <div className="ep-empty">
                    <div className="ep-empty-icon"><RefreshCw size={20} /></div>
                    <p className="ep-empty-sub">Loading declarations…</p>
                  </div>
                ) : declarations.length === 0 ? (
                  <div className="ep-empty">
                    <div className="ep-empty-icon"><FileText size={22} /></div>
                    <p className="ep-empty-title">No submissions yet</p>
                    <p className="ep-empty-sub">Your submitted declarations and institution review outcomes will appear here.</p>
                  </div>
                ) : (
                  <div className="ep-history-list">
                    {declarations.map((dec) => (
                      <div key={dec.id} className="ep-history-item">
                        <div className="ep-history-top">
                          <div>
                            <div className="ep-history-role">{dec.role_title}</div>
                            <div className="ep-history-company">{dec.company_name}</div>
                          </div>
                          {statusBadge(dec.status)}
                        </div>
                        {dec.status === 'APPROVED' && (
                          <div className="ep-history-note" style={{ color: 'var(--success)' }}>
                            <CheckCircle size={12} /> Logbooks unlocked for this placement.
                          </div>
                        )}
                        {dec.status === 'PENDING' && (
                          <div className="ep-history-note" style={{ color: 'var(--ink-4)' }}>
                            <Clock size={12} /> Awaiting institution review.
                          </div>
                        )}
                        {dec.status === 'CHANGES_REQUESTED' && (
                          <div className="ep-history-note" style={{ color: 'var(--warning)' }}>
                            <RefreshCw size={12} /> Your institution has requested changes.
                          </div>
                        )}
                        {dec.review_notes && (
                          <div className="ep-history-review">{dec.review_notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tip */}
            <div className="ep-tip">
              <div className="ep-tip-icon"><CheckCircle size={16} /></div>
              <div className="ep-tip-title">Speed up approval</div>
              <p className="ep-tip-text">
                Declarations with a named employer contact and an attached offer letter are approved
                up to 2× faster. Fill every contact field before submitting.
              </p>
            </div>

          </aside>
        </div>
      </div>
    </StudentLayout>
  );
};

export default ExternalPlacement;