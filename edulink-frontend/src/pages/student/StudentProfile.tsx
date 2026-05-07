import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  BookOpen,
  Camera,
  CheckCircle,
  Edit3,
  FileText,
  Mail,
  User,
  AlertCircle,
  Eye,
  Upload,
  Sparkles,
  TrendingUp,
  GraduationCap,
  Badge,
  ArrowRight,
  Star,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import ProfileWizard from '../../components/student/ProfileWizard';
import TrustBadge, { type TrustLevel } from '../../components/common/TrustBadge';
import { DocumentPreviewModal } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { studentService } from '../../services/student/studentService';
import type { Affiliation, StudentProfile as IStudentProfile } from '../../services/student/studentService';
import StudentProfileSkeleton from '../../components/student/skeletons/StudentProfileSkeleton';
import defaultProfile from '../../assets/images/default_profile.jpg';

/* ─────────────────────────────────────────────
   Design tokens — identical to Dashboard/Logbook
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
  .sp-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ══════════════════════════════════════
     HERO HEADER
  ══════════════════════════════════════ */
  .sp-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }
  .sp-hero-eyebrow {
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
  .sp-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .sp-hero-title em { font-style: italic; color: var(--ink-3); }
  .sp-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 460px;
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .sp-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--ink-3);
    margin-bottom: 20px;
  }
  .sp-hero-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .sp-hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* ── Avatar passport card ── */
  .sp-passport {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    min-width: 200px;
    text-align: center;
  }
  .sp-passport-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .sp-passport-score {
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1;
  }
  .sp-passport-sub { font-size: 12px; color: var(--ink-3); max-width: 140px; }

  /* Avatar with camera overlay */
  .sp-avatar-wrap {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }
  .sp-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--border);
    display: block;
    transition: opacity 0.2s;
  }
  .sp-avatar-wrap:hover .sp-avatar { opacity: 0.75; }
  .sp-avatar-overlay {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 26px;
    height: 26px;
    background: var(--accent);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 2px solid var(--surface);
    pointer-events: none;
  }
  .sp-avatar-spinner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.35);
    border-radius: 50%;
  }
  .sp-spinner {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: sp-spin 0.7s linear infinite;
  }
  @keyframes sp-spin { to { transform: rotate(360deg); } }

  /* Progress ring */
  .sp-ring-svg { transform: rotate(-90deg); }
  .sp-ring-track { fill: none; stroke: var(--border); stroke-width: 3; }
  .sp-ring-fill {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1);
  }

  /* ══════════════════════════════════════
     READINESS CHECKS (4-col grid like dashboard)
  ══════════════════════════════════════ */
  .sp-checks-section {
    margin-bottom: 40px;
  }
  .sp-section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }
  .sp-section-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .sp-section-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }
  .sp-section-sub {
    font-size: 13px;
    color: var(--ink-3);
    margin: 4px 0 0;
  }

  .sp-check-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .sp-check {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
    position: relative;
    overflow: visible;
    text-decoration: none;
  }
  .sp-check.complete { box-shadow: inset 0 0 0 2px var(--success); }
  .sp-check.pending  { box-shadow: inset 0 0 0 2px var(--warning); }
  .sp-check:hover {
    border-color: var(--border-2);
    box-shadow: inset 0 0 0 2px var(--accent), var(--shadow-sm);
    transform: translateY(-1px);
  }
  .sp-check-icon {
    width: 30px; height: 30px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sp-check-icon.complete { background: var(--success-soft); color: var(--success); }
  .sp-check-icon.pending  { background: var(--warning-soft); color: var(--warning); }
  .sp-check-icon.todo     { background: var(--danger-soft);  color: var(--danger); }
  .sp-check-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .sp-check-desc  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ══════════════════════════════════════
     MAIN 2-COL FLOW
  ══════════════════════════════════════ */
  .sp-flow {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
  }
  .sp-main    { display: flex; flex-direction: column; gap: 20px; }
  .sp-sidebar { display: flex; flex-direction: column; gap: 16px; }

  /* ── Card ── */
  .sp-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .sp-card:hover { box-shadow: var(--shadow); }
  .sp-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .sp-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .sp-card-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }
  .sp-card-body { padding: 20px 24px; }

  /* ── Document rows ── */
  .sp-doc-list { display: flex; flex-direction: column; gap: 10px; }
  .sp-doc-row {
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
  .sp-doc-row::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--border-2);
    transition: background 0.15s;
  }
  .sp-doc-row.uploaded::before { background: var(--success); }
  .sp-doc-row.missing::before  { background: var(--warning); }
  .sp-doc-row:hover { border-color: var(--border-2); background: var(--surface-3); }
  .sp-doc-icon {
    width: 36px; height: 36px;
    border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sp-doc-icon.uploaded { background: var(--success-soft); color: var(--success); }
  .sp-doc-icon.missing  { background: var(--warning-soft); color: var(--warning); }
  .sp-doc-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .sp-doc-desc  { font-size: 12px; color: var(--ink-3); margin-top: 2px; line-height: 1.4; }
  .sp-doc-actions { display: flex; gap: 8px; flex-shrink: 0; }

  /* ── Skills pills ── */
  .sp-skills-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sp-skill-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 500;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid rgba(26,92,255,0.15);
    border-radius: 99px;
    padding: 5px 12px;
    transition: background 0.15s;
  }
  .sp-skill-pill:hover { background: var(--accent-2); }
  .sp-skills-empty {
    font-size: 13px;
    color: var(--ink-4);
    font-style: italic;
  }

  /* ── Academic record rows ── */
  .sp-record-list { display: flex; flex-direction: column; gap: 0; }
  .sp-record-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
  }
  .sp-record-item:last-child { border-bottom: none; padding-bottom: 0; }
  .sp-record-item:first-child { padding-top: 0; }
  .sp-record-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .sp-record-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }
  .sp-record-value.empty { color: var(--ink-4); font-style: italic; font-weight: 400; }
  .sp-record-icon {
    width: 30px; height: 30px;
    border-radius: 9px;
    background: var(--surface-3);
    color: var(--ink-4);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ── Trust journey steps (sidebar) ── */
  .sp-trust-steps { display: flex; flex-direction: column; gap: 0; }
  .sp-trust-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
  }
  .sp-trust-step:last-child { border-bottom: none; padding-bottom: 0; }
  .sp-trust-step:first-child { padding-top: 0; }
  .sp-trust-step-dot {
    width: 28px; height: 28px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .sp-trust-step-dot.complete { background: var(--success-soft); color: var(--success); }
  .sp-trust-step-dot.todo     { background: var(--surface-3);    color: var(--ink-4); }
  .sp-trust-step-label { font-size: 13px; font-weight: 500; color: var(--ink-2); }
  .sp-trust-step.complete .sp-trust-step-label { color: var(--ink); }
  .sp-trust-level {
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

  /* ── Quick links ── */
  .sp-quick-links { display: flex; flex-direction: column; gap: 4px; }
  .sp-quick-link {
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
    cursor: pointer;
    background: none;
    width: 100%;
    text-align: left;
    font-family: var(--font-body);
  }
  .sp-quick-link:hover {
    background: var(--surface-3);
    border-color: var(--border);
    color: var(--ink);
  }
  .sp-quick-link-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: var(--surface-3);
    color: var(--ink-3);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s;
  }
  .sp-quick-link:hover .sp-quick-link-icon { background: var(--accent-soft); color: var(--accent); }

  /* ── Tip ── */
  .sp-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  .sp-tip-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
  }
  .sp-tip-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .sp-tip-text  { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ── Shared buttons ── */
  .sp-btn {
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
  .sp-btn:active { transform: scale(0.97); }
  .sp-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25), 0 4px 12px rgba(26,92,255,0.15);
  }
  .sp-btn-primary:hover { box-shadow: 0 4px 16px rgba(26,92,255,0.35); transform: translateY(-1px); color: #fff; }
  .sp-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
    border: 1px solid var(--border);
  }
  .sp-btn-ghost:hover { background: var(--surface); border-color: var(--border-2); color: var(--ink); }
  .sp-btn-sm { padding: 7px 14px; font-size: 12px; }

  /* ── Badge ── */
  .sp-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    padding: 3px 9px;
    letter-spacing: 0.02em;
  }
  .sp-badge-success { background: var(--success-soft); color: var(--success); }
  .sp-badge-warning { background: var(--warning-soft); color: var(--warning); }
  .sp-badge-danger  { background: var(--danger-soft);  color: var(--danger); }
  .sp-badge-accent  { background: var(--accent-soft);  color: var(--accent); }
  .sp-badge-neutral { background: var(--surface-3);    color: var(--ink-3); }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1100px) {
    .sp-flow { grid-template-columns: 1fr; }
    .sp-check-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .sp-hero { grid-template-columns: 1fr; }
    .sp-check-grid { grid-template-columns: 1fr; }
  }
`;

/* ══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [profile, setProfile] = useState<IStudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [currentAffiliation, setCurrentAffiliation] = useState<Affiliation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* ── Data fetch ── */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await studentService.getProfile();
        setProfile(data);

        const [stats, affiliationData] = await Promise.all([
          studentService.getDashboardStats(data.id).catch(() => null),
          studentService.getAffiliations(data.id).catch(() => []),
        ]);

        if (stats?.profile && typeof stats.profile.score === 'number') {
          setReadinessScore(stats.profile.score);
        }

        const aff = affiliationData.find((a: Affiliation) =>
          ['approved', 'verified', 'pending'].includes(a.status)
        );
        setCurrentAffiliation(aff || null);

        const missing: string[] = [];
        if (!data.cv) missing.push('CV / Resume');
        if (!data.admission_letter) missing.push('Admission Letter');
        if (!data.id_document) missing.push('School ID');
        if (!data.skills || data.skills.length === 0) missing.push('Skills');
        if (!data.course_of_study) missing.push('Academic Info');
        if (!data.is_verified && !aff) missing.push('Institution Verification');
        setMissingItems(missing);
      } catch (error) {
        showToast.error(getErrorMessage(error, { action: 'Load Profile' }));
        logError(error, { action: 'Load Profile' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  /* ── Image upload ── */
  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    try {
      setUploading(true);
      const updated = await studentService.updateProfile(profile.id, { profile_picture: file });
      setProfile(updated);
      showToast.success('Profile picture updated.');
    } catch (error) {
      showToast.error(getErrorMessage(error, { action: 'Upload Profile Picture' }));
      logError(error, { action: 'Upload Profile Picture', data: { fileName: file.name } });
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = (path: string | null | undefined, title: string) => {
    if (!path) return;
    setPreviewTitle(title);
    setPreviewUrl(path);
    setPreviewOpen(true);
  };

  /* ── Derived values ── */
  const isAffiliationVerified =
    profile?.is_verified ||
    currentAffiliation?.status === 'approved' ||
    currentAffiliation?.status === 'verified';
  const isAffiliationPending = currentAffiliation?.status === 'pending';

  const hasCoreProfile = !!profile?.course_of_study && !!profile?.current_year && !!profile?.registration_number;
  const hasSkills      = !!profile?.skills && profile.skills.length > 0;
  const hasCV          = !!profile?.cv;
  const hasAdmission   = !!profile?.admission_letter;
  const hasID          = !!profile?.id_document;
  const hasDocuments   = hasCV && hasAdmission && hasID;

  const fallbackScore  = Math.round(
    ([hasCoreProfile, hasSkills, hasDocuments, !!isAffiliationVerified].filter(Boolean).length / 4) * 100
  );
  const roundedScore   = Math.round(readinessScore || fallbackScore);

  /* Ring math */
  const CIRC = 2 * Math.PI * 18;
  const dashOffset = CIRC - (roundedScore / 100) * CIRC;

  /* Onboarding checks */
  const checks = [
    {
      title: 'Academic profile',
      description: hasCoreProfile
        ? 'Course, year, and registration number complete.'
        : 'Add your course, year, and registration number.',
      complete: hasCoreProfile, pending: false,
      icon: hasCoreProfile ? CheckCircle : AlertCircle,
    },
    {
      title: 'Skills profile',
      description: hasSkills
        ? `${profile?.skills.length} skills listed for employer matching.`
        : 'Add at least one skill employers can search for.',
      complete: hasSkills, pending: false,
      icon: hasSkills ? CheckCircle : AlertCircle,
    },
    {
      title: 'Institution verification',
      description: isAffiliationVerified
        ? 'Your student status is verified.'
        : isAffiliationPending
        ? 'Your institution claim is pending review.'
        : 'Claim your institution so employers can trust you.',
      complete: !!isAffiliationVerified, pending: !!isAffiliationPending,
      icon: isAffiliationVerified ? CheckCircle : isAffiliationPending ? AlertCircle : AlertCircle,
    },
    {
      title: 'Required documents',
      description: hasDocuments
        ? 'CV, admission letter, and school ID are uploaded.'
        : 'Upload your CV, admission letter, and school ID.',
      complete: hasDocuments, pending: false,
      icon: hasDocuments ? CheckCircle : AlertCircle,
    },
  ];

  const documents = [
    {
      title: 'CV / Resume',
      path: profile?.cv,
      icon: FileText,
      copy: 'Primary document employers review before shortlisting.',
    },
    {
      title: 'Admission Letter',
      path: profile?.admission_letter,
      icon: Award,
      copy: 'Supports student-status and institution verification.',
    },
    {
      title: 'School ID Document',
      path: profile?.id_document,
      icon: User,
      copy: 'Used for trust checks and placement administration.',
    },
  ];

  /* ════════════════════════════════════
     RENDER
  ════════════════════════════════════ */
  return (
    <StudentLayout>
      <style>{STYLES}</style>

      {loading ? (
        <StudentProfileSkeleton />
      ) : (
        <div className={`sp-page${isDarkMode ? ' dark-mode' : ''}`}>

          {/* ── HERO ── */}
          <header className="sp-hero">
            <div>
              <div className="sp-hero-eyebrow">
                <Sparkles size={12} />
                EduLink · Career Passport
              </div>
              <h1 className="sp-hero-title">
                Profile &amp; <em>Documents</em>
              </h1>
              <p className="sp-hero-sub">
                Keep your identity, academic record, skills, and documents application-ready.
                Verified profiles get 3× more employer views.
              </p>
              <div className="sp-hero-meta">
                <span className="sp-hero-meta-item">
                  <User size={13} />
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="sp-hero-meta-item">
                  <Mail size={13} />
                  {profile?.email || user?.email}
                </span>
                <span className="sp-hero-meta-item">
                  <BookOpen size={13} />
                  {profile?.registration_number || 'Registration pending'}
                </span>
              </div>
              <div className="sp-hero-actions">
                <button className="sp-btn sp-btn-primary" onClick={() => setShowWizard(true)}>
                  <Edit3 size={15} />
                  Edit profile
                </button>
                <button
                  className="sp-btn sp-btn-ghost"
                  onClick={() => setShowWizard(true)}
                >
                  <Upload size={15} />
                  Upload documents
                </button>
              </div>
            </div>

            {/* Passport card */}
            <div className="sp-passport">
              <span className="sp-passport-eyebrow">Readiness passport</span>

              {/* Avatar */}
              <div
                className="sp-avatar-wrap"
                onClick={handleImageClick}
                role="button"
                tabIndex={0}
                aria-label="Change profile picture"
                onKeyDown={(e) => e.key === 'Enter' && handleImageClick()}
              >
                <img
                  src={profile?.profile_picture || user?.avatar || defaultProfile}
                  alt="Profile"
                  className="sp-avatar"
                />
                <div className="sp-avatar-overlay">
                  <Camera size={12} />
                </div>
                {uploading && (
                  <div className="sp-avatar-spinner">
                    <div className="sp-spinner" />
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              {/* Score ring */}
              <svg width="52" height="52" viewBox="0 0 44 44" className="sp-ring-svg">
                <circle cx="22" cy="22" r="18" className="sp-ring-track" />
                <circle
                  cx="22" cy="22" r="18"
                  className="sp-ring-fill"
                  strokeDasharray={CIRC}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <span className="sp-passport-score">{roundedScore}%</span>
              <span className="sp-passport-sub">
                {missingItems.length === 0
                  ? 'Profile verified and ready.'
                  : `${missingItems.length} item${missingItems.length !== 1 ? 's' : ''} still needed.`}
              </span>

              {/* Trust badge */}
              <TrustBadge
                level={(profile?.trust_level || 0) as TrustLevel}
                entityType="student"
                size="sm"
              />
            </div>
          </header>

          {/* ── ONBOARDING CHECKS ── */}
          <section className="sp-checks-section">
            <div className="sp-section-head">
              <div>
                <div className="sp-section-eyebrow">Profile readiness</div>
                <h2 className="sp-section-title">
                  {missingItems.length === 0
                    ? "You're application-ready"
                    : 'Complete the checks that build employer trust'}
                </h2>
                <p className="sp-section-sub">
                  Each check increases your profile score and trust level.
                </p>
              </div>
            </div>
            <div className="sp-check-grid">
              {checks.map((step) => {
                const iconCls = step.complete ? 'complete' : step.pending ? 'pending' : 'todo';
                const Icon = step.icon;
                return (
                  <button
                    key={step.title}
                    className={`sp-check${step.complete ? ' complete' : step.pending ? ' pending' : ''}`}
                    onClick={() => setShowWizard(true)}
                  >
                    <div className={`sp-check-icon ${iconCls}`}>
                      <Icon size={15} />
                    </div>
                    <div className="sp-check-title">{step.title}</div>
                    <div className="sp-check-desc">{step.description}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── MAIN FLOW ── */}
          <div className="sp-flow">
            <main className="sp-main">

              {/* Document vault */}
              <div className="sp-card">
                <div className="sp-card-header">
                  <div>
                    <div className="sp-card-label">Document vault</div>
                    <h3 className="sp-card-title">Required documents</h3>
                  </div>
                  <button className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => setShowWizard(true)}>
                    <Upload size={13} />
                    Upload
                  </button>
                </div>
                <div className="sp-card-body">
                  <div className="sp-doc-list">
                    {documents.map((doc) => {
                      const Icon = doc.icon;
                      const cls = doc.path ? 'uploaded' : 'missing';
                      return (
                        <div key={doc.title} className={`sp-doc-row ${cls}`}>
                          <div className={`sp-doc-icon ${cls}`}>
                            <Icon size={17} />
                          </div>
                          <div>
                            <div className="sp-doc-title">{doc.title}</div>
                            <div className="sp-doc-desc">
                              {doc.path ? `Uploaded · ${doc.copy}` : `Missing · ${doc.copy}`}
                            </div>
                          </div>
                          <div className="sp-doc-actions">
                            {doc.path ? (
                              <>
                                <span className="sp-badge sp-badge-success">
                                  <CheckCircle size={10} /> Uploaded
                                </span>
                                <button
                                  className="sp-btn sp-btn-ghost sp-btn-sm"
                                  onClick={() => handleViewDocument(doc.path, doc.title)}
                                >
                                  <Eye size={13} />
                                  Preview
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="sp-badge sp-badge-warning">
                                  <AlertCircle size={10} /> Missing
                                </span>
                                <button
                                  className="sp-btn sp-btn-primary sp-btn-sm"
                                  onClick={() => setShowWizard(true)}
                                >
                                  <Upload size={13} />
                                  Upload
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="sp-card">
                <div className="sp-card-header">
                  <div>
                    <div className="sp-card-label">Skills profile</div>
                    <h3 className="sp-card-title">Listed skills</h3>
                  </div>
                  <button className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => setShowWizard(true)}>
                    <Edit3 size={13} />
                    Edit skills
                    <ArrowRight size={12} />
                  </button>
                </div>
                <div className="sp-card-body">
                  {profile?.skills && profile.skills.length > 0 ? (
                    <div className="sp-skills-wrap">
                      {profile.skills.map((skill, idx) => (
                        <span key={idx} className="sp-skill-pill">
                          <Star size={10} />
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="sp-skills-empty">
                      No skills added yet. Add at least 3 skills to improve employer match rate.
                    </p>
                  )}
                </div>
              </div>

            </main>

            {/* ── SIDEBAR ── */}
            <aside className="sp-sidebar">

              {/* Academic record */}
              <div className="sp-card">
                <div className="sp-card-header">
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    Academic record
                  </span>
                  <GraduationCap size={15} style={{ color: 'var(--ink-4)' }} />
                </div>
                <div className="sp-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <div className="sp-record-list">
                    {[
                      { label: 'Course of study',    value: profile?.course_of_study,      icon: BookOpen },
                      { label: 'Current year',       value: profile?.current_year,         icon: GraduationCap },
                      { label: 'Registration no.',   value: profile?.registration_number,  icon: Badge },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="sp-record-item">
                          <div>
                            <div className="sp-record-label">{item.label}</div>
                            <div className={`sp-record-value${!item.value ? ' empty' : ''}`}>
                              {item.value || 'Not set'}
                            </div>
                          </div>
                          <div className="sp-record-icon">
                            <Icon size={14} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tip */}
              <div className="sp-tip">
                <div className="sp-tip-icon"><TrendingUp size={16} /></div>
                <div className="sp-tip-title">Verified profiles win placements faster</div>
                <p className="sp-tip-text">
                  Students with institution verification and complete document vaults
                  get shortlisted up to 3× more often. Complete your affiliation claim today.
                </p>
              </div>

            </aside>
          </div>
        </div>
      )}

      {/* ── WIZARDS & MODALS ── */}
      {profile && (
        <ProfileWizard
          show={showWizard}
          onHide={() => setShowWizard(false)}
          studentId={profile.id}
          initialData={{
            course_of_study: profile.course_of_study,
            current_year: profile.current_year,
            registration_number: profile.registration_number,
            cv: profile.cv,
            admission_letter: profile.admission_letter,
            id_document: profile.id_document,
            institution_id: profile.institution_id,
            is_verified: profile.is_verified,
            has_affiliation_claim: Boolean(currentAffiliation),
          }}
          onComplete={() => {
            setShowWizard(false);
            window.location.reload();
          }}
        />
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

export default StudentProfile;