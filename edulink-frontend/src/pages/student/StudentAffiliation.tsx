import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle,
  Clock,
  FileCheck,
  Loader,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { studentService } from '../../services/student/studentService';
import { institutionService } from '../../services/institution/institutionService';
import { showToast } from '../../utils/toast';
import type { Affiliation, Institution } from '../../services/student/studentService';
import StudentAffiliationSkeleton from '../../components/student/skeletons/StudentAffiliationSkeleton';
import AffiliationDocumentUploader from '../../components/student/AffiliationDocumentUploader';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';

/* ─────────────────────────────────────────────
   Design tokens — unified with StudentInternship
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
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.05);
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

  .sa-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ── Hero ── */
  .sa-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
    animation: sa-fade-up 0.45s ease both;
  }
  @keyframes sa-fade-up {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
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
    font-size: clamp(1.9rem, 4vw, 2.75rem);
    font-weight: 400;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 10px;
  }
  .sa-hero-title em { font-style: italic; color: var(--ink-3); }
  .sa-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 520px;
    line-height: 1.65;
    margin: 0 0 20px;
  }
  .sa-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .sa-hero-meta span {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* Hero stat card */
  .sa-hero-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px 28px;
    min-width: 175px;
    text-align: center;
  }
  .sa-hero-card-num {
    font-family: var(--font-display);
    font-size: 2.2rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1;
  }
  .sa-hero-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .sa-hero-card-sub {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.5;
    max-width: 130px;
  }

  /* ── Layout ── */
  .sa-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
    align-items: start;
    animation: sa-fade-up 0.45s 0.1s ease both;
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

  /* ── Search input ── */
  .sa-search-wrap {
    position: relative;
    margin-bottom: 12px;
  }
  .sa-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-4);
    pointer-events: none;
  }
  .sa-search-spinner {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--accent);
  }
  @keyframes sa-spin { to { transform: rotate(360deg); } }
  .sa-spinning { animation: sa-spin 0.8s linear infinite; }
  .sa-input {
    width: 100%;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 42px;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .sa-input::placeholder { color: var(--ink-4); }
  .sa-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
    background: var(--surface-2);
  }

  /* ── Dropdown ── */
  .sa-dropdown {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
    margin-top: 4px;
    max-height: 280px;
    overflow-y: auto;
  }
  .sa-dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
    background: none;
    border-left: none;
    border-right: none;
    border-top: none;
    width: 100%;
    text-align: left;
  }
  .sa-dropdown-item:last-child { border-bottom: none; }
  .sa-dropdown-item:hover { background: var(--surface-3); }
  .sa-dropdown-icon {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sa-dropdown-name { font-size: 13px; font-weight: 600; color: var(--ink); }
  .sa-dropdown-domain { font-size: 12px; color: var(--ink-4); }
  .sa-dropdown-check { margin-left: auto; color: var(--success); flex-shrink: 0; }

  /* ── Selected pill ── */
  .sa-selected-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--success-soft);
    border: 1px solid rgba(18,183,106,0.20);
    border-radius: var(--radius);
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  .sa-selected-left { display: flex; align-items: center; gap: 10px; }
  .sa-selected-icon {
    width: 34px; height: 34px;
    border-radius: 10px;
    background: var(--success-soft);
    color: var(--success);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sa-selected-name { font-size: 13px; font-weight: 600; color: var(--ink); }
  .sa-selected-label { font-size: 11px; color: var(--ink-3); }

  /* ── Empty / hint ── */
  .sa-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--accent-soft);
    border: 1px solid rgba(26,92,255,0.12);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 13px;
    color: var(--ink-3);
    margin-top: 8px;
  }
  .sa-hint-icon { color: var(--accent); flex-shrink: 0; }

  .sa-not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    padding: 36px 20px;
    background: var(--surface-3);
    border: 1px dashed var(--border-2);
    border-radius: var(--radius-lg);
    margin-top: 10px;
  }
  .sa-not-found-icon {
    width: 48px; height: 48px;
    border-radius: var(--radius);
    background: var(--warning-soft);
    color: var(--warning);
    display: flex; align-items: center; justify-content: center;
  }
  .sa-not-found-title {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }
  .sa-not-found-sub { font-size: 13px; color: var(--ink-3); margin: 0; max-width: 280px; line-height: 1.55; }

  /* ── Evidence rail ── */
  .sa-rail { display: flex; flex-direction: column; gap: 0; }
  .sa-rail-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .sa-rail-row:last-child { border-bottom: none; padding-bottom: 0; }
  .sa-rail-row:first-child { padding-top: 0; }
  .sa-rail-icon {
    width: 36px; height: 36px;
    border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .sa-rail-icon.success { background: var(--success-soft); color: var(--success); }
  .sa-rail-icon.warn    { background: var(--warning-soft); color: var(--warning); }
  .sa-rail-icon.neutral { background: var(--surface-3);    color: var(--ink-4); }
  .sa-rail-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
  .sa-rail-sub   { font-size: 12px; color: var(--ink-3); line-height: 1.5; }

  /* ── Info banner ── */
  .sa-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.55;
  }
  .sa-banner.success { background: var(--success-soft); color: var(--ink-2); border: 1px solid rgba(18,183,106,0.18); }
  .sa-banner.warning { background: var(--warning-soft); color: var(--ink-2); border: 1px solid rgba(245,158,11,0.18); }
  .sa-banner.info    { background: var(--accent-soft);  color: var(--ink-2); border: 1px solid rgba(26,92,255,0.15); }
  .sa-banner-icon { flex-shrink: 0; margin-top: 1px; }
  .sa-banner.success .sa-banner-icon { color: var(--success); }
  .sa-banner.warning .sa-banner-icon { color: var(--warning); }
  .sa-banner.info    .sa-banner-icon { color: var(--accent); }

  /* ── Rejected list ── */
  .sa-rejected-item {
    padding: 10px 14px;
    background: var(--danger-soft);
    border: 1px solid rgba(239,68,68,0.18);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--ink-2);
    margin-top: 8px;
  }
  .sa-rejected-item + .sa-rejected-item { margin-top: 6px; }

  /* ── Info tip sidebar ── */
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
  .sa-tip-text  { font-size: 12px; color: var(--ink-3); line-height: 1.55; }

  /* ── Steps sidebar ── */
  .sa-steps { display: flex; flex-direction: column; gap: 0; }
  .sa-step {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .sa-step:last-child { border-bottom: none; padding-bottom: 0; }
  .sa-step:first-child { padding-top: 0; }
  .sa-step-num {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: var(--surface-3);
    border: 1px solid var(--border-2);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-4);
    flex-shrink: 0;
  }
  .sa-step-num.done { background: var(--success-soft); border-color: transparent; color: var(--success); }
  .sa-step-body { flex: 1; }
  .sa-step-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
  .sa-step-sub   { font-size: 12px; color: var(--ink-3); line-height: 1.45; }

  /* ── Buttons ── */
  .sa-btn {
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
  .sa-btn:active { transform: scale(0.97); }
  .sa-btn:disabled { opacity: 0.40; cursor: not-allowed; transform: none; pointer-events: none; }
  .sa-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25);
  }
  .sa-btn-primary:hover { box-shadow: 0 4px 16px rgba(26,92,255,0.35); transform: translateY(-1px); }
  .sa-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
  }
  .sa-btn-ghost:hover { background: var(--border); color: var(--ink); }
  .sa-btn-outline {
    background: transparent;
    color: var(--accent);
    border: 1px solid rgba(26,92,255,0.30);
  }
  .sa-btn-outline:hover { background: var(--accent-soft); }
  .sa-btn-sm { padding: 7px 13px; font-size: 12px; }
  .sa-btn-full { width: 100%; }

  /* ── Badge ── */
  .sa-badge {
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
  .sa-badge-success { background: var(--success-soft); color: var(--success); }
  .sa-badge-warning { background: var(--warning-soft); color: var(--warning); }
  .sa-badge-info    { background: var(--accent-soft);  color: var(--accent); }
  .sa-badge-neutral { background: var(--surface-3);    color: var(--ink-3); }
  .sa-badge-danger  { background: var(--danger-soft);  color: var(--danger); }

  /* ── Modal ── */
  .sa-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: sa-backdrop-in 0.2s ease;
  }
  @keyframes sa-backdrop-in { from { opacity:0; } to { opacity:1; } }
  .sa-modal {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 460px;
    animation: sa-modal-in 0.22s ease;
  }
  @keyframes sa-modal-in {
    from { opacity:0; transform:scale(0.96) translateY(8px); }
    to   { opacity:1; transform:scale(1)    translateY(0); }
  }
  .sa-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
  }
  .sa-modal-title {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }
  .sa-modal-body   { padding: 20px 24px; }
  .sa-modal-footer {
    padding: 16px 24px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .sa-modal-input {
    width: 100%;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 11px 14px;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    margin-top: 14px;
  }
  .sa-modal-input::placeholder { color: var(--ink-4); }
  .sa-modal-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .sa-modal-input.error { border-color: var(--danger); }
  .sa-modal-error { font-size: 12px; color: var(--danger); margin-top: 6px; }
  .sa-modal-success-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    padding: 12px 0 8px;
  }
  .sa-modal-success-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: var(--success-soft);
    color: var(--success);
    display: flex; align-items: center; justify-content: center;
  }
  .sa-modal-success-title {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
  }
  .sa-modal-success-sub { font-size: 13px; color: var(--ink-3); margin: 0; line-height: 1.55; }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .sa-layout { grid-template-columns: 1fr; }
  }
  @media (max-width: 768px) {
    .sa-hero { grid-template-columns: 1fr; }
  }
`;

/* ══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
const StudentAffiliation: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  const [loading, setLoading]                   = useState(true);
  const [affiliations, setAffiliations]         = useState<Affiliation[]>([]);
  const [studentId, setStudentId]               = useState('');
  const [query, setQuery]                       = useState('');
  const [searchResults, setSearchResults]       = useState<Institution[]>([]);
  const [isSearching, setIsSearching]           = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [claiming, setClaiming]                 = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [showModal, setShowModal]               = useState(false);
  const [modalName, setModalName]               = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [modalStatus, setModalStatus]           = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [submittedSet, setSubmittedSet]         = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const profile = await studentService.getProfile();
        setStudentId(profile.id);
        setAffiliations(await studentService.getAffiliations(profile.id));
      } catch {
        showToast.error('Failed to load affiliation status.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    setError(null);
    if (val.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      setSearchResults(await studentService.searchInstitutions(val));
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (inst: Institution) => {
    setSelectedInstitution(inst);
    setQuery(inst.name);
    setSearchResults([]);
    setError(null);
  };

  const handleClaim = async () => {
    if (!selectedInstitution || !studentId) return;
    setClaiming(true);
    try {
      await studentService.claimAffiliation(studentId, selectedInstitution.id);
      setAffiliations(await studentService.getAffiliations(studentId));
      setSelectedInstitution(null);
      setQuery('');
      showToast.success('Affiliation claimed successfully!');
    } catch (err: any) {
      const msg = getUserFacingErrorMessage(err?.message, err?.status)
        || 'Could not submit your affiliation claim. Please try again.';
      setError(msg);
      showToast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  const handleModalSubmit = async () => {
    const key = modalName.trim().toLowerCase();
    if (submittedSet.has(key)) {
      setModalStatus('duplicate');
      setTimeout(() => { setShowModal(false); setModalStatus('idle'); }, 2000);
      return;
    }
    if (!modalName.trim()) return;
    setSubmitting(true);
    try {
      await institutionService.recordInterest({
        raw_name: modalName.trim(),
        user_email: user?.email || '',
        email_domain: user?.email?.split('@')[1] || '',
      });
      setSubmittedSet(prev => new Set([...prev, key]));
      setModalStatus('success');
      setTimeout(() => { setShowModal(false); setModalStatus('idle'); setModalName(''); }, 2500);
    } catch {
      setModalStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Derived state ── */
  const current   = affiliations.find(a => ['approved','pending','verified'].includes(a.status));
  const rejected  = affiliations.filter(a => a.status === 'rejected');
  const isVerified   = current?.status === 'approved' || current?.status === 'verified';
  const isAutoVerified = current?.claimed_via === 'domain';
  const isPending    = current?.status === 'pending';
  const hasDocument  = !!current?.verification_document_url;

  const getStatusBadge = (aff: Affiliation) => {
    if (aff.status === 'approved' || aff.status === 'verified') {
      return (
        <span className="sa-badge sa-badge-success">
          <Check size={10} /> {aff.claimed_via === 'domain' ? 'Auto-verified' : 'Verified'}
        </span>
      );
    }
    if (aff.status === 'pending') {
      return aff.verification_document_url
        ? <span className="sa-badge sa-badge-info"><FileCheck size={10} /> Document submitted</span>
        : <span className="sa-badge sa-badge-warning"><Clock size={10} /> Pending review</span>;
    }
    if (aff.status === 'rejected') return <span className="sa-badge sa-badge-danger">Rejected</span>;
    return <span className="sa-badge sa-badge-neutral">{aff.status}</span>;
  };

  /* ════════════════════
     RENDER
  ═════════════════════ */
  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`sa-page${isDarkMode ? ' dark-mode' : ''}`}>

        {loading ? (
          <StudentAffiliationSkeleton isDarkMode={isDarkMode} />
        ) : (
          <>
            {/* ── HERO ── */}
            <header className="sa-hero">
              <div>
                <div className="sa-hero-eyebrow">
                  <Sparkles size={12} />
                  EduLink · Institution Trust
                </div>
                <h1 className="sa-hero-title">
                  Institution <em>Affiliation</em>
                </h1>
                <p className="sa-hero-sub">
                  Connect your student record to your institution so applications, verification,
                  and attachment workflows can move with confidence.
                </p>
                <div className="sa-hero-meta">
                  <span><Building2 size={13} /> Institution claim</span>
                  <span><FileCheck size={13} /> Verification document</span>
                  <span><ShieldCheck size={13} /> Application trust</span>
                </div>
              </div>

              <div className="sa-hero-card">
                <span className="sa-hero-card-label">Claims</span>
                <span className="sa-hero-card-num">{affiliations.length}</span>
                <span className="sa-hero-card-sub">
                  Approved affiliation unlocks trusted student workflows.
                </span>
              </div>
            </header>

            {/* ── BODY ── */}
            {current ? (
              /* ─── Has affiliation ─── */
              <div className="sa-layout">
                <main className="sa-main">

                  {/* Institution card */}
                  <div className="sa-card">
                    <div className="sa-card-header">
                      <div>
                        <div className="sa-card-label">Active affiliation</div>
                        <h3 className="sa-card-title">
                          {current.institution_name || current.institution?.name}
                        </h3>
                      </div>
                      {getStatusBadge(current)}
                    </div>
                    <div className="sa-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                      {isAutoVerified && (
                        <div className="sa-banner success">
                          <CheckCircle size={16} className="sa-banner-icon" />
                          <span>
                            Your student status was automatically verified using your institutional email.
                            You can now apply for internships.
                          </span>
                        </div>
                      )}
                      {isVerified && !isAutoVerified && (
                        <div className="sa-banner success">
                          <CheckCircle size={16} className="sa-banner-icon" />
                          <span>
                            Your student status has been verified by the institution admin.
                            You can now apply for internships.
                          </span>
                        </div>
                      )}
                      {isPending && !hasDocument && (
                        <div className="sa-banner warning">
                          <Clock size={16} className="sa-banner-icon" />
                          <span>
                            Your affiliation claim is pending review. Upload a verification document
                            below to speed up the process.
                          </span>
                        </div>
                      )}
                      {isPending && hasDocument && (
                        <div className="sa-banner info">
                          <FileCheck size={16} className="sa-banner-icon" />
                          <div>
                            <strong>Document submitted.</strong> The institution admin will review
                            and approve it shortly. Submitted{' '}
                            {current.verification_document_uploaded_at
                              ? new Date(current.verification_document_uploaded_at).toLocaleDateString()
                              : 'recently'}.
                          </div>
                        </div>
                      )}

                      {/* Evidence rail */}
                      <div className="sa-rail" style={{ marginTop: 4 }}>
                        <div className="sa-rail-row">
                          <div className={`sa-rail-icon ${isVerified ? 'success' : 'warn'}`}>
                            {isVerified ? <Check size={16} /> : <Clock size={16} />}
                          </div>
                          <div>
                            <div className="sa-rail-title">Verification status</div>
                            <div className="sa-rail-sub">
                              {isVerified ? 'Trust established — workflows unlocked.' : 'Awaiting admin review.'}
                            </div>
                          </div>
                        </div>
                        <div className="sa-rail-row">
                          <div className={`sa-rail-icon ${hasDocument || isAutoVerified ? 'success' : 'neutral'}`}>
                            <FileCheck size={16} />
                          </div>
                          <div>
                            <div className="sa-rail-title">Verification document</div>
                            <div className="sa-rail-sub">
                              {isAutoVerified
                                ? 'Not required — auto-verified via email domain.'
                                : hasDocument
                                  ? 'Document uploaded and under review.'
                                  : 'No document uploaded yet.'}
                            </div>
                          </div>
                        </div>
                        <div className="sa-rail-row">
                          <div className={`sa-rail-icon ${isVerified ? 'success' : 'neutral'}`}>
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <div className="sa-rail-title">Application access</div>
                            <div className="sa-rail-sub">
                              {isVerified
                                ? 'You can apply for internship placements.'
                                : 'Unlocks once your affiliation is approved.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document uploader */}
                  {isPending && !hasDocument && studentId && (
                    <AffiliationDocumentUploader
                      studentId={studentId}
                      affiliationId={current.id}
                      onSuccess={(updated) =>
                        setAffiliations(affiliations.map(a => a.id === updated.id ? updated : a))
                      }
                      isDarkMode={isDarkMode}
                    />
                  )}
                </main>

                {/* ── Sidebar ── */}
                <aside className="sa-sidebar">
                  <div className="sa-card">
                    <div className="sa-card-header">
                      <div>
                        <div className="sa-card-label">Progress</div>
                        <h3 className="sa-card-title">Verification steps</h3>
                      </div>
                    </div>
                    <div className="sa-card-body">
                      <div className="sa-steps">
                        <div className="sa-step">
                          <div className="sa-step-num done"><Check size={12} /></div>
                          <div className="sa-step-body">
                            <div className="sa-step-title">Search &amp; select</div>
                            <div className="sa-step-sub">Institution found and claimed.</div>
                          </div>
                        </div>
                        <div className="sa-step">
                          <div className={`sa-step-num ${hasDocument || isAutoVerified ? 'done' : ''}`}>
                            {hasDocument || isAutoVerified ? <Check size={12} /> : '2'}
                          </div>
                          <div className="sa-step-body">
                            <div className="sa-step-title">Document verification</div>
                            <div className="sa-step-sub">
                              {isAutoVerified ? 'Skipped — email domain matched.' : hasDocument ? 'Document submitted.' : 'Upload a student ID or letter.'}
                            </div>
                          </div>
                        </div>
                        <div className="sa-step">
                          <div className={`sa-step-num ${isVerified ? 'done' : ''}`}>
                            {isVerified ? <Check size={12} /> : '3'}
                          </div>
                          <div className="sa-step-body">
                            <div className="sa-step-title">Admin approval</div>
                            <div className="sa-step-sub">
                              {isVerified ? 'Approved. Workflows unlocked.' : 'Pending institution review.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sa-tip">
                    <div className="sa-tip-icon"><ShieldCheck size={16} /></div>
                    <div className="sa-tip-title">Why verification matters</div>
                    <p className="sa-tip-text">
                      Verified students are trusted by employers and coordinators alike — meaning
                      faster approvals, higher placement visibility, and richer artifacts.
                    </p>
                  </div>
                </aside>
              </div>

            ) : (
              /* ─── No affiliation — claim flow ─── */
              <div className="sa-layout">
                <main className="sa-main">

                  {/* Rejected history */}
                  {rejected.length > 0 && (
                    <div className="sa-card">
                      <div className="sa-card-header">
                        <div>
                          <div className="sa-card-label">History</div>
                          <h3 className="sa-card-title">Previous requests</h3>
                        </div>
                        <span className="sa-badge sa-badge-danger">{rejected.length} rejected</span>
                      </div>
                      <div className="sa-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {rejected.map(a => (
                          <div key={a.id} className="sa-rejected-item">
                            <strong>{a.institution_name || a.institution?.name}</strong>
                            {a.review_notes && (
                              <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>
                                — {a.review_notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search card */}
                  <div className="sa-card">
                    <div className="sa-card-header">
                      <div>
                        <div className="sa-card-label">Institution</div>
                        <h3 className="sa-card-title">Claim your affiliation</h3>
                      </div>
                      <Building2 size={20} style={{ color: 'var(--ink-4)' }} />
                    </div>
                    <div className="sa-card-body">

                      {error && (
                        <div className="sa-banner warning" style={{ marginBottom: 16 }}>
                          <AlertCircle size={15} className="sa-banner-icon" />
                          {error}
                        </div>
                      )}

                      {/* Search */}
                      <div className="sa-search-wrap">
                        <Search size={16} className="sa-search-icon" />
                        <input
                          className="sa-input"
                          placeholder="Search your university or college…"
                          value={query}
                          onChange={e => { setSelectedInstitution(null); handleSearch(e.target.value); }}
                          autoComplete="off"
                        />
                        {isSearching && (
                          <Loader size={15} className={`sa-search-spinner sa-spinning`} />
                        )}
                      </div>

                      {/* Hint */}
                      {!query && (
                        <div className="sa-hint">
                          <Search size={14} className="sa-hint-icon" />
                          Type at least 2 characters to search (e.g. "University of Nairobi")
                        </div>
                      )}

                      {/* Dropdown */}
                      {query.length >= 2 && searchResults.length > 0 && !selectedInstitution && (
                        <div className="sa-dropdown">
                          {searchResults.map(inst => (
                            <button
                              key={inst.id}
                              className="sa-dropdown-item"
                              onClick={() => handleSelect(inst)}
                            >
                              <div className="sa-dropdown-icon"><Building2 size={15} /></div>
                              <div>
                                <div className="sa-dropdown-name">{inst.name}</div>
                                {inst.domain && <div className="sa-dropdown-domain">{inst.domain}</div>}
                              </div>
                              <Check size={14} className="sa-dropdown-check" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Not found */}
                      {query.length >= 2 && !isSearching && searchResults.length === 0 && !selectedInstitution && (
                        <div className="sa-not-found">
                          <div className="sa-not-found-icon"><AlertCircle size={22} /></div>
                          <p className="sa-not-found-title">Not in our system</p>
                          <p className="sa-not-found-sub">
                            We couldn't find "{query}". Want to request your institution be added to EduLink?
                          </p>
                          <button
                            className="sa-btn sa-btn-outline"
                            onClick={() => { setModalName(query); setShowModal(true); }}
                          >
                            <Plus size={14} /> Request institution onboarding
                          </button>
                        </div>
                      )}

                      {/* Selected */}
                      {selectedInstitution && (
                        <div className="sa-selected-pill" style={{ marginTop: 12 }}>
                          <div className="sa-selected-left">
                            <div className="sa-selected-icon"><Building2 size={16} /></div>
                            <div>
                              <div className="sa-selected-name">{selectedInstitution.name}</div>
                              <div className="sa-selected-label">Selected institution</div>
                            </div>
                          </div>
                          <button
                            className="sa-btn sa-btn-ghost sa-btn-sm"
                            onClick={() => { setSelectedInstitution(null); setQuery(''); }}
                          >
                            <X size={13} /> Change
                          </button>
                        </div>
                      )}

                      <button
                        className="sa-btn sa-btn-primary sa-btn-full"
                        style={{ marginTop: 16 }}
                        disabled={!selectedInstitution || claiming}
                        onClick={handleClaim}
                      >
                        {claiming
                          ? <><Loader size={14} className="sa-spinning" /> Submitting…</>
                          : <>Claim affiliation <ArrowRight size={14} /></>}
                      </button>
                    </div>
                  </div>
                </main>

                {/* ── Sidebar ── */}
                <aside className="sa-sidebar">
                  <div className="sa-card">
                    <div className="sa-card-header">
                      <div>
                        <div className="sa-card-label">How it works</div>
                        <h3 className="sa-card-title">Three steps to trust</h3>
                      </div>
                    </div>
                    <div className="sa-card-body">
                      <div className="sa-steps">
                        {[
                          { n: '1', title: 'Search', sub: 'Find your university in EduLink.' },
                          { n: '2', title: 'Upload', sub: 'Provide a student ID or official letter.' },
                          { n: '3', title: 'Approved', sub: 'Admin confirms — placements unlock.' },
                        ].map(s => (
                          <div className="sa-step" key={s.n}>
                            <div className="sa-step-num">{s.n}</div>
                            <div className="sa-step-body">
                              <div className="sa-step-title">{s.title}</div>
                              <div className="sa-step-sub">{s.sub}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="sa-tip">
                    <div className="sa-tip-icon"><ShieldCheck size={16} /></div>
                    <div className="sa-tip-title">Instant via email domain</div>
                    <p className="sa-tip-text">
                      If your institution has registered its email domain, your affiliation is
                      automatically verified — no document upload needed.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Onboarding modal ── */}
      {showModal && (
        <div className={`sa-modal-backdrop${isDarkMode ? ' dark-mode' : ''}`}>
          <div className="sa-modal">
            {modalStatus === 'success' ? (
              <>
                <div className="sa-modal-header">
                  <span className="sa-modal-title">Request submitted</span>
                </div>
                <div className="sa-modal-body">
                  <div className="sa-modal-success-body">
                    <div className="sa-modal-success-icon"><Check size={26} /></div>
                    <p className="sa-modal-success-title">Thank you!</p>
                    <p className="sa-modal-success-sub">
                      We've noted your interest in adding <strong>{modalName}</strong> to EduLink.
                      Our team will be in touch.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="sa-modal-header">
                  <span className="sa-modal-title">Request institution onboarding</span>
                  <button
                    className="sa-btn sa-btn-ghost sa-btn-sm"
                    style={{ padding: '6px' }}
                    onClick={() => { setShowModal(false); setModalStatus('idle'); setModalName(''); }}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="sa-modal-body">
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0, lineHeight: 1.6 }}>
                    We couldn't find your institution. Submit its name and we'll work on adding it
                    to EduLink so students like you can get verified.
                  </p>
                  <input
                    className={`sa-modal-input${modalStatus === 'error' ? ' error' : ''}`}
                    placeholder="Enter institution name…"
                    value={modalName}
                    disabled={submitting}
                    onChange={e => { setModalName(e.target.value); if (modalStatus !== 'idle') setModalStatus('idle'); }}
                  />
                  {modalStatus === 'error' && (
                    <div className="sa-modal-error">Something went wrong. Please try again.</div>
                  )}
                  {modalStatus === 'duplicate' && (
                    <div className="sa-modal-error" style={{ color: 'var(--warning)' }}>
                      You've already submitted a request for this institution.
                    </div>
                  )}
                </div>
                <div className="sa-modal-footer">
                  <button
                    className="sa-btn sa-btn-ghost"
                    disabled={submitting}
                    onClick={() => { setShowModal(false); setModalStatus('idle'); setModalName(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="sa-btn sa-btn-primary"
                    disabled={submitting || !modalName.trim()}
                    onClick={handleModalSubmit}
                  >
                    {submitting
                      ? <><Loader size={14} className="sa-spinning" /> Submitting…</>
                      : <><Plus size={14} /> Request onboarding</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentAffiliation;