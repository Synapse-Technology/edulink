import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  FileText,
  GraduationCap,
  Loader,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { studentService } from '../../services/student/studentService';
import type { Affiliation, UpdateProfileData } from '../../services/student/studentService';
import { DocumentPreviewModal } from '../common';

interface ProfileWizardProps {
  show: boolean;
  onHide: () => void;
  studentId: string;
  onComplete: () => void;
  initialData?: {
    course_of_study?: string;
    current_year?: string;
    registration_number?: string;
    skills?: string[];
    cv?: string | null;
    admission_letter?: string | null;
    id_document?: string | null;
    institution_id?: string | null;
    is_verified?: boolean;
    has_affiliation_claim?: boolean;
  };
}

const STEPS = ['Basic Info', 'Skills', 'Institution', 'Documents'];
type AffiliationStatus = 'unknown' | 'none' | 'pending' | 'verified';

const STYLES = `
  .pw-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1080;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,0.56);
    backdrop-filter: blur(8px);
  }

  .pw-modal {
    --pw-ink: #0d0f12;
    --pw-ink-2: #3a3d44;
    --pw-ink-3: #6b7280;
    --pw-ink-4: #9ca3af;
    --pw-surface: #f9f8f6;
    --pw-surface-2: #f2f0ed;
    --pw-surface-3: #e8e5e0;
    --pw-border: #e4e1dc;
    --pw-border-2: #d1ccc5;
    --pw-accent: #1a5cff;
    --pw-accent-soft: rgba(26,92,255,0.08);
    --pw-success: #12b76a;
    --pw-success-soft: rgba(18,183,106,0.10);
    --pw-warning: #f59e0b;
    --pw-warning-soft: rgba(245,158,11,0.12);
    --pw-danger: #ef4444;
    --pw-danger-soft: rgba(239,68,68,0.10);
    --pw-radius: 26px;
    --pw-radius-sm: 15px;
    --pw-shadow: 0 24px 80px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.14);

    width: min(1080px, 100%);
    max-height: min(90vh, 860px);
    display: grid;
    grid-template-columns: 315px minmax(0, 1fr);
    overflow: hidden;
    background: var(--pw-surface);
    color: var(--pw-ink);
    border-radius: var(--pw-radius);
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: var(--pw-shadow);
    animation: pw-in 0.24s ease both;
  }

  @keyframes pw-in {
    from { opacity: 0; transform: translateY(14px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .pw-sidebar {
    padding: 24px;
    background:
      radial-gradient(circle at top left, var(--pw-accent-soft), transparent 42%),
      var(--pw-surface-2);
    border-right: 1px solid var(--pw-border);
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .pw-brand {
    display: flex;
    align-items: flex-start;
    gap: 13px;
  }

  .pw-brand-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    background: var(--pw-accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 12px 26px rgba(26,92,255,0.22);
  }

  .pw-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--pw-accent);
    margin-bottom: 5px;
  }

  .pw-title {
    margin: 0;
    color: var(--pw-ink);
    font-size: 20px;
    font-weight: 850;
    line-height: 1.15;
  }

  .pw-subtitle {
    margin: 7px 0 0;
    color: var(--pw-ink-3);
    font-size: 12px;
    line-height: 1.55;
  }

  .pw-score-card {
    padding: 16px;
    border-radius: var(--pw-radius-sm);
    background: linear-gradient(135deg, var(--pw-accent-soft), var(--pw-surface-3));
    border: 1px solid var(--pw-border);
  }

  .pw-score-row {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 12px;
    margin-bottom: 10px;
  }

  .pw-score-label {
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pw-ink-4);
  }

  .pw-score {
    font-size: 32px;
    font-weight: 900;
    color: var(--pw-accent);
    line-height: 1;
  }

  .pw-score-track {
    width: 100%;
    height: 9px;
    border-radius: 999px;
    background: var(--pw-surface-2);
    border: 1px solid var(--pw-border);
    overflow: hidden;
    margin-bottom: 10px;
  }

  .pw-score-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--pw-accent), var(--pw-success));
    transition: width 0.3s ease;
  }

  .pw-score-text {
    margin: 0;
    color: var(--pw-ink-3);
    font-size: 12px;
    line-height: 1.5;
  }

  .pw-steps {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .pw-step {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 11px;
    align-items: center;
    padding: 10px;
    border-radius: 14px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--pw-ink-3);
  }

  .pw-step.done,
  .pw-step.active {
    background: var(--pw-surface-3);
    border-color: var(--pw-border);
    color: var(--pw-ink);
  }

  .pw-step.active {
    background: var(--pw-accent-soft);
    border-color: rgba(26,92,255,0.20);
  }

  .pw-step-dot {
    width: 32px;
    height: 32px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--pw-surface-3);
    border: 1px solid var(--pw-border);
    color: var(--pw-ink-4);
    font-size: 12px;
    font-weight: 900;
  }

  .pw-step.done .pw-step-dot {
    background: var(--pw-success-soft);
    color: var(--pw-success);
    border-color: transparent;
  }

  .pw-step.active .pw-step-dot {
    background: var(--pw-accent);
    color: #fff;
    border-color: var(--pw-accent);
  }

  .pw-step-label {
    font-size: 13px;
    font-weight: 850;
  }

  .pw-content {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .pw-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 24px 26px 18px;
    border-bottom: 1px solid var(--pw-border);
    background: var(--pw-surface);
  }

  .pw-step-title {
    margin: 0;
    color: var(--pw-ink);
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .pw-step-help {
    margin: 7px 0 0;
    color: var(--pw-ink-3);
    font-size: 13px;
    line-height: 1.55;
  }

  .pw-close {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    border: 1px solid var(--pw-border);
    background: var(--pw-surface-2);
    color: var(--pw-ink-3);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.15s ease;
  }

  .pw-close:hover { background: var(--pw-surface-3); color: var(--pw-ink); transform: translateY(-1px); }

  .pw-body {
    overflow-y: auto;
    padding: 24px 26px 120px;
  }

  .pw-grid {
    display: grid;
    gap: 16px;
  }

  .pw-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pw-label {
    color: var(--pw-ink-2);
    font-size: 12px;
    font-weight: 850;
  }

  .pw-input,
  .pw-select {
    width: 100%;
    min-height: 44px;
    border-radius: 14px;
    border: 1px solid var(--pw-border);
    background: var(--pw-surface-2);
    color: var(--pw-ink);
    padding: 11px 13px;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .pw-input:focus,
  .pw-select:focus {
    border-color: var(--pw-accent);
    box-shadow: 0 0 0 3px var(--pw-accent-soft);
    background: var(--pw-surface-3);
  }

  .pw-input::placeholder { color: var(--pw-ink-4); }

  .pw-error,
  .pw-info-card {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 13px 14px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.55;
    margin-bottom: 16px;
  }

  .pw-error {
    background: var(--pw-danger-soft);
    color: var(--pw-ink-2);
    border: 1px solid rgba(239,68,68,0.18);
  }

  .pw-error svg { color: var(--pw-danger); flex-shrink: 0; margin-top: 2px; }

  .pw-info-card {
    background: var(--pw-accent-soft);
    border: 1px solid rgba(26,92,255,0.16);
    color: var(--pw-ink-2);
  }

  .pw-info-card.success {
    background: var(--pw-success-soft);
    border-color: rgba(18,183,106,0.18);
  }

  .pw-info-card.warning {
    background: var(--pw-warning-soft);
    border-color: rgba(245,158,11,0.20);
  }

  .pw-skill-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }

  .pw-chip-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }

  .pw-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 999px;
    padding: 8px 11px;
    background: var(--pw-surface-2);
    border: 1px solid var(--pw-border);
    color: var(--pw-ink-2);
    font-size: 12px;
    font-weight: 800;
  }

  .pw-chip button {
    border: none;
    background: transparent;
    color: var(--pw-ink-4);
    cursor: pointer;
    padding: 0;
    display: inline-flex;
  }

  .pw-institution-list {
    max-height: 220px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-top: 12px;
  }

  .pw-inst-card {
    width: 100%;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    text-align: left;
    padding: 12px;
    border-radius: 14px;
    background: var(--pw-surface-2);
    border: 1px solid var(--pw-border);
    cursor: pointer;
    color: var(--pw-ink);
    transition: 0.15s ease;
  }

  .pw-inst-card:hover,
  .pw-inst-card.active {
    background: var(--pw-accent-soft);
    border-color: rgba(26,92,255,0.22);
  }

  .pw-inst-icon {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--pw-accent-soft);
    color: var(--pw-accent);
  }

  .pw-inst-name { font-size: 13px; font-weight: 850; color: var(--pw-ink); }
  .pw-inst-meta { font-size: 11px; color: var(--pw-ink-4); margin-top: 2px; }

  .pw-doc-grid {
    display: grid;
    gap: 14px;
  }

  .pw-doc-scroll {
    max-height: calc(90vh - 240px);
    overflow-y: auto;
    padding-right: 8px;
  }

  .pw-doc-card {
    border-radius: var(--pw-radius-sm);
    border: 1px solid var(--pw-border);
    background: var(--pw-surface-2);
    padding: 15px;
  }

  .pw-doc-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .pw-doc-title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    color: var(--pw-ink);
    font-size: 13px;
    font-weight: 850;
  }

  .pw-current {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    border-radius: 999px;
    background: var(--pw-success-soft);
    color: var(--pw-success);
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .pw-file-input {
    width: 100%;
    border-radius: 14px;
    border: 1px dashed var(--pw-border-2);
    background: var(--pw-surface-3);
    color: var(--pw-ink-3);
    padding: 12px;
    font-size: 12px;
    box-sizing: border-box;
  }

  .pw-doc-help {
    margin: 9px 0 0;
    color: var(--pw-ink-4);
    font-size: 11px;
    line-height: 1.45;
  }

  .pw-link-btn {
    border: none;
    background: transparent;
    color: var(--pw-accent);
    cursor: pointer;
    font-size: 12px;
    font-weight: 850;
    padding: 0;
  }

  .pw-footer {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    padding: 18px 26px 22px;
    border-top: 1px solid var(--pw-border);
    background: color-mix(in srgb, var(--pw-surface-2), transparent 3%);
    box-shadow: 0 -14px 34px rgba(0,0,0,0.06);
  }

  .pw-footer-status {
    min-width: 0;
  }

  .pw-footer-kicker {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--pw-accent);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .pw-footer-copy {
    margin: 0;
    color: var(--pw-ink-3);
    font-size: 12px;
    line-height: 1.45;
  }

  .pw-footer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }

  .pw-btn {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 14px;
    border: 1px solid transparent;
    padding: 10px 16px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .pw-btn:disabled { opacity: 0.48; cursor: not-allowed; pointer-events: none; transform: none; box-shadow: none; }
  .pw-btn:hover { transform: translateY(-1px); }
  .pw-btn:active { transform: scale(0.98); }

  .pw-btn-primary {
    min-width: 154px;
    background: var(--pw-accent);
    color: #fff;
    box-shadow: 0 8px 22px rgba(26,92,255,0.24);
  }

  .pw-btn-primary:hover {
    color: #fff;
    box-shadow: 0 12px 28px rgba(26,92,255,0.30);
  }

  .pw-btn-ghost {
    background: transparent;
    color: var(--pw-ink-4);
    border-color: transparent;
    box-shadow: none;
  }

  .pw-btn-ghost:hover {
    background: var(--pw-surface-3);
    color: var(--pw-ink-2);
  }

  .pw-btn-soft {
    background: var(--pw-surface-3);
    color: var(--pw-ink-2);
    border-color: var(--pw-border);
    box-shadow: none;
  }

  .pw-btn-soft:hover {
    background: var(--pw-border);
    color: var(--pw-ink);
  }

  .pw-spinner { animation: pw-spin 0.85s linear infinite; }
  @keyframes pw-spin { to { transform: rotate(360deg); } }

  @media (max-width: 920px) {
    .pw-modal { grid-template-columns: 1fr; max-height: none; height: calc(100vh - 20px); }
    .pw-sidebar { display: none; }
  }

  @media (max-width: 640px) {
    .pw-backdrop { padding: 10px; align-items: stretch; }
    .pw-modal { height: 100%; border-radius: 18px; }
    .pw-header, .pw-body, .pw-footer { padding-left: 18px; padding-right: 18px; }
    .pw-footer { grid-template-columns: 1fr; align-items: stretch; gap: 12px; }
    .pw-footer-actions { width: 100%; display: grid; grid-template-columns: 1fr; }
    .pw-btn { width: 100%; }
    .pw-btn-ghost { order: 3; }
    .pw-btn-soft { order: 2; }
    .pw-btn-primary { order: 1; min-width: 0; }
    .pw-skill-row { grid-template-columns: 1fr; }
  }
`;

const stepHelp = [
  'Confirm your academic identity so employers and institutions can recognize your student profile.',
  'Add the skills that best describe your internship readiness and technical strengths.',
  'Connect your profile to an institution so your student status can be verified.',
  'Upload the documents needed to support verification and internship applications.',
];

const ProfileWizard: React.FC<ProfileWizardProps> = ({ show, onHide, studentId, onComplete, initialData }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [affiliationStatus, setAffiliationStatus] = useState<AffiliationStatus>('unknown');
  const [affiliationName, setAffiliationName] = useState('');

  const [course, setCourse] = useState(initialData?.course_of_study || '');
  const [year, setYear] = useState(initialData?.current_year || '');
  const [regNumber, setRegNumber] = useState(initialData?.registration_number || '');
  const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
  const [skillInput, setSkillInput] = useState('');

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const [existingCv, setExistingCv] = useState<string | null>(null);
  const [existingLetter, setExistingLetter] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [institutionQuery, setInstitutionQuery] = useState('');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<any | null>(null);
  const [searchingInst, setSearchingInst] = useState(false);

  const initialHasAffiliationPath = Boolean(initialData?.institution_id || initialData?.is_verified || initialData?.has_affiliation_claim);
  const hasAffiliationPath = initialHasAffiliationPath || affiliationStatus === 'pending' || affiliationStatus === 'verified';
  const isAffiliationVerified = Boolean(initialData?.is_verified || initialData?.institution_id || affiliationStatus === 'verified');
  const isAffiliationPending = !isAffiliationVerified && Boolean(initialData?.has_affiliation_claim || affiliationStatus === 'pending');

  const completion = useMemo(() => {
    let complete = 0;
    if (course && year && regNumber) complete += 25;
    if (skills.length > 0) complete += 25;
    if (hasAffiliationPath || selectedInstitution) complete += 25;
    if ((existingCv || cvFile) && (existingLetter || letterFile) && (existingId || idFile)) complete += 25;
    return complete;
  }, [course, year, regNumber, skills, hasAffiliationPath, selectedInstitution, existingCv, cvFile, existingLetter, letterFile, existingId, idFile]);

  useEffect(() => {
    if (!show || !studentId) return;
    let isMounted = true;

    const loadAffiliationState = async () => {
      if (initialData?.is_verified || initialData?.institution_id) {
        setAffiliationStatus('verified');
        return;
      }

      try {
        const affiliations = await studentService.getAffiliations(studentId);
        if (!isMounted) return;
        const activeAffiliation = affiliations.find((affiliation: Affiliation) => ['approved', 'verified', 'pending'].includes(affiliation.status));

        if (!activeAffiliation) {
          setAffiliationStatus('none');
          setAffiliationName('');
          return;
        }

        setAffiliationName(activeAffiliation.institution_name || activeAffiliation.institution?.name || 'your institution');
        setAffiliationStatus(activeAffiliation.status === 'approved' || activeAffiliation.status === 'verified' ? 'verified' : 'pending');
      } catch {
        if (isMounted) setAffiliationStatus(initialData?.has_affiliation_claim ? 'pending' : 'none');
      }
    };

    loadAffiliationState();
    return () => { isMounted = false; };
  }, [show, studentId, initialData?.institution_id, initialData?.is_verified, initialData?.has_affiliation_claim]);

  useEffect(() => {
    if (show && initialData) {
      if (!initialData.course_of_study || !initialData.current_year || !initialData.registration_number) setStep(0);
      else if (!initialData.skills || initialData.skills.length === 0) setStep(1);
      else if (!hasAffiliationPath) setStep(2);
      else if (!initialData.cv || !initialData.admission_letter || !initialData.id_document) setStep(3);
      else setStep(0);
    }
  }, [show, initialData, hasAffiliationPath]);

  useEffect(() => {
    if (show && step === 2 && hasAffiliationPath && initialData?.cv && initialData?.admission_letter && initialData?.id_document) setStep(3);
  }, [show, step, hasAffiliationPath, initialData?.cv, initialData?.admission_letter, initialData?.id_document]);

  useEffect(() => {
    if (!initialData) return;
    if (initialData.course_of_study) setCourse(initialData.course_of_study);
    if (initialData.current_year) setYear(initialData.current_year);
    if (initialData.registration_number) setRegNumber(initialData.registration_number);
    if (initialData.skills) setSkills(initialData.skills);
    if (initialData.cv) setExistingCv(initialData.cv);
    if (initialData.admission_letter) setExistingLetter(initialData.admission_letter);
    if (initialData.id_document) setExistingId(initialData.id_document);
  }, [initialData]);

  const handleViewDocument = (path: string | null, title = 'Document') => {
    if (!path) return;
    setPreviewTitle(title);
    setPreviewUrl(path);
    setPreviewOpen(true);
  };

  const handleAddSkill = () => {
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setSkillInput('');
    }
  };

  const handleSearchInstitutions = async (query: string) => {
    setInstitutionQuery(query);
    if (query.length < 3) {
      setInstitutions([]);
      return;
    }
    setSearchingInst(true);
    try {
      const results = await studentService.searchInstitutions(query);
      setInstitutions(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingInst(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const updateData: UpdateProfileData = { course_of_study: course, current_year: year, skills, registration_number: regNumber };
      await studentService.updateProfile(studentId, updateData);

      if (selectedInstitution && !hasAffiliationPath) {
        try {
          await studentService.claimAffiliation(studentId, selectedInstitution.id);
        } catch (err) {
          console.error('Failed to claim affiliation', err);
        }
      }

      if (cvFile) await studentService.uploadDocument(studentId, 'cv', cvFile);
      if (letterFile) await studentService.uploadDocument(studentId, 'admission_letter', letterFile);
      if (idFile) await studentService.uploadDocument(studentId, 'id_document', idFile);
      onComplete();
    } catch (err) {
      console.error(err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setError(null);
    if (step === 0 && (!course || !year || !regNumber)) return setError('Please fill in all academic identity fields.');
    if (step === 1 && skills.length === 0) return setError('Please add at least one skill.');
    if (step === 2) {
      if (!hasAffiliationPath && affiliationStatus === 'unknown') return setError('We are checking your institution status. Please wait a moment.');
      if (!hasAffiliationPath && !selectedInstitution) return setError('Please select your institution. If it is not listed, use the affiliation page to request onboarding.');
    }
    if (step === 3) {
      const ready = (!!existingCv || !!cvFile) && (!!existingLetter || !!letterFile) && (!!existingId || !!idFile);
      if (!ready) return setError('Please upload your CV, admission letter, and school ID to finish setup.');
    }

    if (step < STEPS.length - 1) setStep(step + 1);
    else await handleSubmit();
  };

  const UploadCard = ({ title, existing, file, setFile, accept, help }: any) => (
    <div className="pw-doc-card">
      <div className="pw-doc-head">
        <h4 className="pw-doc-title"><FileText size={16} /> {title}</h4>
        {existing && <span className="pw-current"><CheckCircle size={11} /> Current</span>}
      </div>
      {existing && <button type="button" className="pw-link-btn" onClick={() => handleViewDocument(existing, title)}>Preview current document</button>}
      <input className="pw-file-input" type="file" accept={accept} onChange={(event: any) => setFile(event.target.files[0])} />
      <p className="pw-doc-help">{file ? `Selected: ${file.name}` : help}</p>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="pw-grid">
            <div className="pw-field"><label className="pw-label">Registration Number</label><input className="pw-input" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. REG/2023/1234" /></div>
            <div className="pw-field"><label className="pw-label">Course of Study</label><input className="pw-input" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. Computer Science" /></div>
            <div className="pw-field"><label className="pw-label">Current Year</label><select className="pw-select" value={year} onChange={(e) => setYear(e.target.value)}><option value="">Select Year</option>{[1,2,3,4,5,6,7,8].map((value) => <option key={value} value={value}>Year {value}</option>)}</select></div>
          </div>
        );
      case 1:
        return (
          <div>
            <div className="pw-field">
              <label className="pw-label">Add Skills</label>
              <div className="pw-skill-row">
                <input className="pw-input" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }} placeholder="e.g. Python, React, Data Analysis" />
                <button type="button" className="pw-btn pw-btn-soft" onClick={handleAddSkill}><Plus size={15} /> Add</button>
              </div>
            </div>
            <div className="pw-chip-wrap">
              {skills.map((skill) => <span key={skill} className="pw-chip">{skill}<button type="button" onClick={() => setSkills(skills.filter((item) => item !== skill))}><X size={13} /></button></span>)}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            {hasAffiliationPath && <div className={`pw-info-card ${isAffiliationPending ? 'warning' : 'success'}`}><ShieldCheck size={18} /> <span>{isAffiliationVerified ? `Your institution status${affiliationName ? ` with ${affiliationName}` : ''} is already verified. Continue to documents.` : `Your affiliation request${affiliationName ? ` for ${affiliationName}` : ''} is awaiting review. We will not submit another claim.`}</span></div>}
            {!hasAffiliationPath && <>
              <div className="pw-field"><label className="pw-label">Search Institution</label><div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 13, top: 14, color: 'var(--pw-ink-4)' }} /><input className="pw-input" style={{ paddingLeft: 40 }} value={institutionQuery} onChange={(e) => handleSearchInstitutions(e.target.value)} placeholder="Search for your university or college..." disabled={affiliationStatus === 'unknown'} /></div></div>
              {searchingInst && <p className="pw-doc-help"><Loader size={12} className="pw-spinner" /> Searching institutions...</p>}
              {affiliationStatus === 'unknown' && <p className="pw-doc-help">Checking existing affiliation status...</p>}
              {institutions.length > 0 && <div className="pw-institution-list">{institutions.map((inst) => <button key={inst.id} type="button" className={`pw-inst-card ${selectedInstitution?.id === inst.id ? 'active' : ''}`} onClick={() => { setSelectedInstitution(inst); setInstitutionQuery(inst.name); setInstitutions([]); }}><span className="pw-inst-icon"><GraduationCap size={17} /></span><span><span className="pw-inst-name">{inst.name}</span><span className="pw-inst-meta">Institution directory result</span></span><ArrowRight size={15} /></button>)}</div>}
              {selectedInstitution && <div className="pw-info-card success" style={{ marginTop: 14 }}><CheckCircle size={18} /><span>Selected: <strong>{selectedInstitution.name}</strong></span></div>}
              <div className="pw-info-card" style={{ marginTop: 14 }}><AlertCircle size={18} /><span>Claiming affiliation lets your institution verify your student status. If it is not listed, use the affiliation page after saving.</span></div>
            </>}
          </div>
        );
      case 3:
        return (
          <div className="pw-doc-scroll">
            <div className="pw-doc-grid">
              <UploadCard title="CV / Resume" existing={existingCv} file={cvFile} setFile={setCvFile} accept=".pdf,.doc,.docx" help={existingCv ? 'Upload to replace. PDF or Word accepted.' : 'Required: PDF or Word.'} />
              <UploadCard title="Admission Letter" existing={existingLetter} file={letterFile} setFile={setLetterFile} accept=".pdf,.jpg,.jpeg,.png" help={existingLetter ? 'Upload to replace. PDF, JPG, or PNG accepted.' : 'Required: PDF, JPG, or PNG.'} />
              <UploadCard title="School ID" existing={existingId} file={idFile} setFile={setIdFile} accept=".pdf,.jpg,.jpeg,.png" help={existingId ? 'Upload to replace. PDF, JPG, or PNG accepted.' : 'Required: PDF, JPG, or PNG.'} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!show) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="pw-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-wizard-title">
        <div className="pw-modal">
          <aside className="pw-sidebar">
            <div className="pw-brand">
              <div className="pw-brand-icon"><ShieldCheck size={22} /></div>
              <div><div className="pw-eyebrow"><Sparkles size={11} /> EduLink setup</div><h2 className="pw-title">Complete your profile</h2><p className="pw-subtitle">Build a verified student profile ready for credible internship applications.</p></div>
            </div>
            <div className="pw-score-card"><div className="pw-score-row"><span className="pw-score-label">Readiness</span><span className="pw-score">{completion}%</span></div><div className="pw-score-track"><div className="pw-score-fill" style={{ width: `${completion}%` }} /></div><p className="pw-score-text">Complete each step to unlock a stronger student trust profile.</p></div>
            <div className="pw-steps">{STEPS.map((label, index) => <div key={label} className={`pw-step ${index < step ? 'done' : ''} ${index === step ? 'active' : ''}`}><span className="pw-step-dot">{index < step ? <Check size={15} /> : index + 1}</span><span className="pw-step-label">{label}</span></div>)}</div>
          </aside>

          <section className="pw-content">
            <header className="pw-header">
              <div><div className="pw-eyebrow"><Sparkles size={11} /> Step {step + 1} of {STEPS.length}</div><h1 id="profile-wizard-title" className="pw-step-title">{STEPS[step]}</h1><p className="pw-step-help">{stepHelp[step]}</p></div>
              <button type="button" className="pw-close" onClick={onHide} disabled={loading} aria-label="Close profile wizard"><X size={16} /></button>
            </header>
            <main className="pw-body">{error && <div className="pw-error"><AlertCircle size={18} /><span>{error}</span></div>}{renderStepContent()}</main>
            <footer className="pw-footer">
              <div className="pw-footer-status">
                <div className="pw-footer-kicker">
                  <Sparkles size={11} />
                  Step {step + 1} of {STEPS.length} · {completion}% ready
                </div>
                <p className="pw-footer-copy">
                  {step === STEPS.length - 1
                    ? 'Review your documents and finish your verified student setup.'
                    : 'Continue when this section is complete. You can still go back before finishing.'}
                </p>
              </div>

              <div className="pw-footer-actions">
                <button type="button" className="pw-btn pw-btn-ghost" onClick={onHide} disabled={loading}>
                  Cancel
                </button>

                {step > 0 && (
                  <button type="button" className="pw-btn pw-btn-soft" onClick={() => setStep(step - 1)} disabled={loading}>
                    <ArrowLeft size={15} />
                    Back
                  </button>
                )}

                <button type="button" className="pw-btn pw-btn-primary" onClick={handleNext} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader size={15} className="pw-spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {step === STEPS.length - 1 ? 'Finish setup' : 'Continue'}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>

      <DocumentPreviewModal show={previewOpen} onHide={() => setPreviewOpen(false)} title={previewTitle} url={previewUrl} />
    </>
  );
};

export default ProfileWizard;
