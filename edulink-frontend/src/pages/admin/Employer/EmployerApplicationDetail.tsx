import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

import { EmployerLayout } from '../../../components/admin/employer';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import { employerService } from '../../../services/employer/employerService';
import type { Supervisor } from '../../../services/employer/employerService';
import { DocumentPreviewModal, FeedbackModal } from '../../../components/common';
import InternshipLifecyclePanel from '../../../components/internship/InternshipLifecyclePanel';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import { SEO } from '../../../components/common';

const STYLES = `
  .ead-page { color: var(--el-ink); }

  .ead-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    color: var(--el-muted);
    font-size: 13px;
    font-weight: 800;
    padding: 0;
    margin-bottom: 18px;
  }

  .ead-back:hover { color: var(--el-accent); }

  .ead-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    margin-bottom: 22px;
  }

  .ead-command-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    padding: 28px;
    box-shadow: var(--el-shadow);
  }

  .ead-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .ead-candidate-head {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .ead-person {
    display: flex;
    gap: 16px;
    align-items: center;
    min-width: 0;
  }

  .ead-avatar {
    width: 72px;
    height: 72px;
    border-radius: 24px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 850;
    flex-shrink: 0;
  }

  .ead-title {
    font-size: clamp(1.8rem, 3.2vw, 2.65rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 8px;
    color: var(--el-ink);
  }

  .ead-sub {
    color: var(--el-muted);
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
  }

  .ead-actions {
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ead-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: 14px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
  }

  .ead-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .ead-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .ead-btn.primary {
    background: var(--el-accent);
    border-color: var(--el-accent);
    color: white;
    box-shadow: 0 10px 26px rgba(26,92,255,0.22);
  }

  .ead-btn.success {
    background: rgba(18,183,106,0.12);
    border-color: rgba(18,183,106,0.18);
    color: #0f9f62;
  }

  .ead-btn.danger {
    background: rgba(239,68,68,0.08);
    border-color: rgba(239,68,68,0.18);
    color: #dc2626;
  }

  .ead-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 850;
    margin-top: 10px;
  }

  .ead-status.applied { background: rgba(245,158,11,0.12); color: #b45309; }
  .ead-status.shortlisted { background: rgba(14,165,233,0.12); color: #0369a1; }
  .ead-status.accepted { background: rgba(26,92,255,0.12); color: var(--el-accent); }
  .ead-status.active { background: rgba(18,183,106,0.12); color: #0f9f62; }
  .ead-status.rejected { background: rgba(239,68,68,0.12); color: #dc2626; }
  .ead-status.default { background: var(--el-surface-2); color: var(--el-muted); }

  .ead-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
  }

  .ead-health-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .ead-health-label,
  .ead-card-label,
  .ead-section-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ead-health-score {
    font-size: 3rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .ead-health-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    background: var(--el-accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 28px rgba(26,92,255,0.25);
  }

  .ead-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .ead-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: start;
  }

  .ead-main,
  .ead-side {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  .ead-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .ead-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
  }

  .ead-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    margin: 0;
    color: var(--el-ink);
  }

  .ead-card-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .ead-card-body {
    padding: 22px;
  }

  .ead-info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .ead-info-box {
    border: 1px solid var(--el-border);
    border-radius: 18px;
    background: var(--el-surface-2);
    padding: 14px;
  }

  .ead-info-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .ead-info-value {
    color: var(--el-ink);
    font-size: 13px;
    font-weight: 760;
    margin: 0;
  }

  .ead-cover {
    border: 1px solid var(--el-border);
    border-radius: 18px;
    background: var(--el-surface-2);
    padding: 16px;
    color: var(--el-muted);
    font-size: 13px;
    line-height: 1.75;
    white-space: pre-wrap;
  }

  .ead-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .ead-skill {
    border: 1px solid var(--el-border);
    border-radius: 999px;
    background: var(--el-surface-2);
    color: var(--el-ink);
    font-size: 12px;
    font-weight: 800;
    padding: 7px 11px;
  }

  .ead-doc {
    border: 1px solid var(--el-border);
    border-radius: 18px;
    background: var(--el-surface-2);
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .ead-doc-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ead-doc-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: rgba(239,68,68,0.1);
    color: #dc2626;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ead-doc-title {
    margin: 0 0 2px;
    font-size: 13px;
    font-weight: 820;
  }

  .ead-muted {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  .ead-assessment {
    border: 1px solid rgba(245,158,11,0.18);
    border-radius: 20px;
    background:
      radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 36%),
      var(--el-surface);
    padding: 18px;
  }

  .ead-assessment-top {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .ead-rating {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #b45309;
    font-weight: 850;
    font-size: 13px;
  }

  .ead-form-grid {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 14px;
  }

  .ead-label {
    display: block;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .ead-input,
  .ead-textarea,
  .ead-select {
    width: 100%;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    border-radius: 16px;
    padding: 12px 14px;
    outline: 0;
    font-size: 13px;
    font-weight: 700;
  }

  .ead-select { height: 46px; }
  .ead-textarea { min-height: 104px; resize: vertical; line-height: 1.6; }

  .ead-detail-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 14px 0;
    border-bottom: 1px solid var(--el-border);
  }

  .ead-detail-row:last-child { border-bottom: 0; }

  .ead-detail-icon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ead-detail-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 3px;
  }

  .ead-detail-value {
    color: var(--el-ink);
    font-size: 13px;
    font-weight: 760;
    margin: 0;
  }

  .ead-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.48);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .ead-modal {
    width: min(520px, 100%);
    border-radius: 24px;
    background: var(--el-surface);
    border: 1px solid var(--el-border);
    box-shadow: 0 24px 80px rgba(15,23,42,0.22);
    overflow: hidden;
  }

  .ead-modal-header {
    padding: 20px 22px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .ead-modal-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  .ead-modal-close {
    border: 0;
    background: var(--el-surface-2);
    color: var(--el-muted);
    width: 34px;
    height: 34px;
    border-radius: 12px;
    font-weight: 900;
  }

  .ead-modal-body { padding: 22px; }

  .ead-modal-context {
    border: 1px solid var(--el-border);
    border-radius: 18px;
    background: var(--el-surface-2);
    padding: 14px;
    margin-bottom: 18px;
  }

  .ead-modal-footer {
    padding: 16px 22px 20px;
    border-top: 1px solid var(--el-border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .ead-modal-secondary,
  .ead-modal-primary,
  .ead-modal-danger {
    border-radius: 14px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid var(--el-border);
  }

  .ead-modal-secondary {
    background: var(--el-surface-2);
    color: var(--el-muted);
  }

  .ead-modal-primary {
    background: var(--el-accent);
    color: white;
    border-color: var(--el-accent);
  }

  .ead-modal-danger {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
  }

  .ead-modal-primary:disabled,
  .ead-modal-danger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ead-loading,
  .ead-not-found {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ead-spinner {
    width: 38px;
    height: 38px;
    border: 3px solid var(--el-surface-2);
    border-top-color: var(--el-accent);
    border-radius: 999px;
    animation: ead-spin 0.8s linear infinite;
  }

  .ead-empty-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: var(--el-surface);
    padding: 32px;
    text-align: center;
  }

  @keyframes ead-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1180px) {
    .ead-hero,
    .ead-layout {
      grid-template-columns: 1fr;
    }

    .ead-health-card { max-width: 520px; }
  }

  @media (max-width: 760px) {
    .ead-command-card,
    .ead-health-card,
    .ead-card-header,
    .ead-card-body {
      padding-left: 18px;
      padding-right: 18px;
    }

    .ead-info-grid,
    .ead-form-grid {
      grid-template-columns: 1fr;
    }

    .ead-actions {
      justify-content: stretch;
      width: 100%;
    }

    .ead-btn {
      width: 100%;
    }

    .ead-doc {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;

const getStatusClass = (status: string) => {
  if (status === 'APPLIED') return 'applied';
  if (status === 'SHORTLISTED') return 'shortlisted';
  if (status === 'ACCEPTED') return 'accepted';
  if (status === 'ACTIVE') return 'active';
  if (status === 'REJECTED') return 'rejected';
  return 'default';
};

const getReadinessScore = (application: InternshipApplication) => {
  if (application.status === 'ACTIVE' || application.status === 'COMPLETED' || application.status === 'CERTIFIED') return 100;
  if (application.status === 'ACCEPTED') return application.start_readiness?.can_start ? 88 : 62;
  if (application.status === 'SHORTLISTED') return 56;
  if (application.status === 'APPLIED') return 34;
  if (application.status === 'REJECTED') return 0;
  return 24;
};

const EmployerApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [finalRating, setFinalRating] = useState<number>(5);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');

  const { feedbackProps, showError, showSuccess } = useFeedbackModal();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchApplication(id);
  }, [id]);

  const fetchApplication = async (appId: string) => {
    try {
      setIsLoading(true);

      const data = await internshipService.getApplication(appId);

      setApplication(data);
      setFinalFeedback(data.employer_final_feedback || data.final_feedback || '');
      setFinalRating(data.employer_final_rating || data.final_rating || 5);
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFinalFeedback = async () => {
    if (!application || !finalFeedback.trim()) {
      showError('Final Assessment Required', 'Please add final feedback before submitting.');
      return;
    }

    try {
      setIsProcessing(true);

      await internshipService.submitFinalFeedback(
        application.id,
        finalFeedback.trim(),
        finalRating
      );

      await fetchApplication(application.id);

      showSuccess('Final Assessment Saved', 'Completion readiness has been updated.');
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);

      showError(
        'Assessment Failed',
        sanitized.userMessage || 'Failed to submit final feedback'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (
    action: 'SHORTLIST' | 'REJECT' | 'ACCEPT' | 'START' | 'COMPLETE'
  ) => {
    if (!id) return;

    try {
      setIsProcessing(true);

      let backendAction = action.toLowerCase();

      if (backendAction === 'accepted') backendAction = 'accept';

      await internshipService.processApplication(
        id,
        backendAction as any,
        action === 'REJECT' ? rejectionReason : undefined
      );

      await fetchApplication(id);
      setShowRejectModal(false);

      const actionLabel =
        action === 'SHORTLIST'
          ? 'shortlisted'
          : action === 'ACCEPT'
            ? 'accepted'
            : action === 'REJECT'
              ? 'rejected'
              : action === 'COMPLETE'
                ? 'completed'
                : 'started';

      showSuccess('Success', `Application has been ${actionLabel} successfully.`);
    } catch (error: any) {
      console.error('Failed to update status:', error);

      const sanitized = sanitizeAdminError(error);

      showError('Error', sanitized.userMessage || 'Failed to update application status');
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchSupervisors = async () => {
    if (supervisors.length > 0) return;

    try {
      const data = await employerService.getSupervisors();
      setSupervisors(data);
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);

      showError(
        'Supervisors Unavailable',
        sanitized.userMessage || 'Failed to load supervisors'
      );
    }
  };

  const openAssignModal = async () => {
    if (!application) return;

    setSelectedSupervisor(application.employer_supervisor_id || '');
    await fetchSupervisors();
    setShowAssignModal(true);
  };

  const handleAssignSupervisor = async () => {
    if (!application || !selectedSupervisor) return;

    try {
      setIsProcessing(true);

      await internshipService.assignSupervisor(
        application.id,
        selectedSupervisor,
        'employer'
      );

      await fetchApplication(application.id);
      setShowAssignModal(false);

      showSuccess('Mentor Assigned', 'Employer supervisor assignment has been updated.');
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);

      showError('Assignment Failed', sanitized.userMessage || 'Failed to assign supervisor');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDocument = (
    path: string | null | undefined,
    title = 'Document'
  ) => {
    if (!path) return;

    setPreviewTitle(title);
    setPreviewUrl(path);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <EmployerLayout>
        <style>{STYLES}</style>
        <div className="ead-loading">
          <div className="ead-spinner" />
        </div>
      </EmployerLayout>
    );
  }

  if (!application) {
    return (
      <EmployerLayout>
        <style>{STYLES}</style>
        <div className="ead-not-found">
          <div className="ead-empty-card">
            <h3>Application not found</h3>
            <button
              type="button"
              className="ead-btn primary"
              onClick={() => navigate('/employer/dashboard/applications')}
            >
              Back to Applications
            </button>
          </div>
        </div>
      </EmployerLayout>
    );
  }

  const snapshot = application.application_snapshot || {};
  const studentSkills = snapshot.skills || [];
  const studentCV = snapshot.cv;
  const readinessScore = getReadinessScore(application);
  const statusClass = getStatusClass(application.status);

  return (
    <EmployerLayout>
      <SEO
        title="Application Detail"
        description="Review candidate application, documents, lifecycle, and employer actions on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="ead-page">
        <button
          type="button"
          className="ead-back"
          onClick={() => navigate('/employer/dashboard/applications')}
        >
          <ArrowLeft size={18} />
          Back to Applications
        </button>

        <section className="ead-hero">
          <div className="ead-command-card">
            <div className="ead-kicker">
              <Sparkles size={13} />
              Candidate Review
            </div>

            <div className="ead-candidate-head">
              <div className="ead-person">
                <div className="ead-avatar">
                  {application.student_info?.name?.charAt(0) || 'U'}
                </div>

                <div>
                  <h1 className="ead-title">
                    {application.student_info?.name || 'Unknown Candidate'}
                  </h1>

                  <p className="ead-sub">
                    {application.student_info?.email || 'No email available'}
                  </p>

                  <span className={`ead-status ${statusClass}`}>
                    <ShieldCheck size={12} />
                    {application.status}
                  </span>
                </div>
              </div>

              <div className="ead-actions">
                {application.status === 'APPLIED' && (
                  <>
                    <button
                      type="button"
                      className="ead-btn danger"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isProcessing}
                    >
                      <XCircle size={17} />
                      Reject
                    </button>

                    <button
                      type="button"
                      className="ead-btn success"
                      onClick={() => handleStatusChange('SHORTLIST')}
                      disabled={isProcessing}
                    >
                      <CheckCircle size={17} />
                      Shortlist
                    </button>
                  </>
                )}

                {application.status === 'SHORTLISTED' && (
                  <>
                    <button
                      type="button"
                      className="ead-btn danger"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isProcessing}
                    >
                      <XCircle size={17} />
                      Reject
                    </button>

                    <button
                      type="button"
                      className="ead-btn primary"
                      onClick={() => handleStatusChange('ACCEPT')}
                      disabled={isProcessing}
                    >
                      <CheckCircle size={17} />
                      Accept
                    </button>
                  </>
                )}

                {application.status === 'ACCEPTED' && (
                  <>
                    <button
                      type="button"
                      className="ead-btn"
                      onClick={openAssignModal}
                      disabled={isProcessing}
                    >
                      <Users size={17} />
                      {application.employer_supervisor_id ? 'Change Mentor' : 'Assign Mentor'}
                    </button>

                    <button
                      type="button"
                      className="ead-btn success"
                      onClick={() => handleStatusChange('START')}
                      disabled={isProcessing || !application.start_readiness?.can_start}
                      title={
                        application.start_readiness?.can_start
                          ? 'Start internship'
                          : application.start_readiness?.missing?.join(', ') ||
                            'Start requirements are not met'
                      }
                    >
                      <Briefcase size={17} />
                      Start Internship
                    </button>
                  </>
                )}

                {application.status === 'ACTIVE' && (
                  <button
                    type="button"
                    className="ead-btn success"
                    onClick={() => handleStatusChange('COMPLETE')}
                    disabled={
                      isProcessing || !application.completion_readiness?.can_mark_completed
                    }
                    title={
                      application.completion_readiness?.can_mark_completed
                        ? 'Mark internship completed'
                        : application.completion_readiness?.summary ||
                          'Completion requirements are not met'
                    }
                  >
                    <CheckCircle size={17} />
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="ead-health-card">
            <div className="ead-health-top">
              <div>
                <div className="ead-health-label">Placement readiness</div>
                <div className="ead-health-score">{readinessScore}%</div>
              </div>

              <div className="ead-health-icon">
                <UserCheck size={20} />
              </div>
            </div>

            <p className="ead-health-note">
              Estimated from the application lifecycle, mentor assignment, and start or
              completion readiness state.
            </p>
          </aside>
        </section>

        <div className="ead-layout">
          <main className="ead-main">
            <section className="ead-card">
              <div className="ead-card-header">
                <div className="ead-card-label">Application lifecycle</div>
                <h2 className="ead-card-title">Placement progress</h2>
                <p className="ead-card-sub">
                  Track the candidate from application review to completion readiness.
                </p>
              </div>

              <div className="ead-card-body">
                <InternshipLifecyclePanel
                  application={application}
                  roleView="employer"
                  compact
                />
              </div>
            </section>

            {application.can_feedback &&
              ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(application.status) && (
                <section className="ead-assessment">
                  <div className="ead-assessment-top">
                    <div>
                      <div className="ead-card-label">Employer assessment</div>
                      <h2 className="ead-card-title">Final assessment</h2>
                      <p className="ead-card-sub">
                        Required before this internship can be marked completed.
                      </p>
                    </div>

                    <div className="ead-rating">
                      <Star size={18} fill="currentColor" />
                      {finalRating}/5
                    </div>
                  </div>

                  <div className="ead-form-grid">
                    <div>
                      <label className="ead-label">Rating</label>
                      <select
                        className="ead-select"
                        value={finalRating}
                        onChange={(event) => setFinalRating(Number(event.target.value))}
                        disabled={isProcessing || application.status === 'CERTIFIED'}
                      >
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} / 5
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="ead-label">Supervisor feedback</label>
                      <textarea
                        className="ead-textarea"
                        value={finalFeedback}
                        onChange={(event) => setFinalFeedback(event.target.value)}
                        placeholder="Summarize performance, strengths, reliability, and readiness for career progression."
                        disabled={isProcessing || application.status === 'CERTIFIED'}
                      />
                    </div>
                  </div>

                  {application.status !== 'CERTIFIED' && (
                    <button
                      type="button"
                      className="ead-btn primary"
                      onClick={handleSubmitFinalFeedback}
                      disabled={isProcessing || !finalFeedback.trim()}
                      style={{ marginTop: 14 }}
                    >
                      Save Final Assessment
                    </button>
                  )}
                </section>
              )}

            <section className="ead-card">
              <div className="ead-card-header">
                <div className="ead-card-label">Candidate profile</div>
                <h2 className="ead-card-title">Academic snapshot</h2>
                <p className="ead-card-sub">
                  Candidate information captured at the time of application.
                </p>
              </div>

              <div className="ead-card-body">
                <div className="ead-info-grid">
                  <div className="ead-info-box">
                    <div className="ead-info-label">Course of study</div>
                    <p className="ead-info-value">{snapshot.course_of_study || 'N/A'}</p>
                  </div>

                  <div className="ead-info-box">
                    <div className="ead-info-label">Current year</div>
                    <p className="ead-info-value">Year {snapshot.current_year || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="ead-card">
              <div className="ead-card-header">
                <div className="ead-card-label">Candidate statement</div>
                <h2 className="ead-card-title">Cover letter</h2>
              </div>

              <div className="ead-card-body">
                <div className="ead-cover">
                  {application.cover_letter || 'No cover letter provided.'}
                </div>
              </div>
            </section>

            <section className="ead-card">
              <div className="ead-card-header">
                <div className="ead-card-label">Capability signals</div>
                <h2 className="ead-card-title">Skills</h2>
              </div>

              <div className="ead-card-body">
                <div className="ead-skills">
                  {studentSkills.length > 0 ? (
                    studentSkills.map((skill: string, index: number) => (
                      <span key={`${skill}-${index}`} className="ead-skill">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="ead-muted">No skills listed.</p>
                  )}
                </div>
              </div>
            </section>

            {studentCV && (
              <section className="ead-card">
                <div className="ead-card-header">
                  <div className="ead-card-label">Candidate document</div>
                  <h2 className="ead-card-title">Documents</h2>
                </div>

                <div className="ead-card-body">
                  <div className="ead-doc">
                    <div className="ead-doc-left">
                      <div className="ead-doc-icon">
                        <FileText size={22} />
                      </div>

                      <div>
                        <p className="ead-doc-title">Curriculum Vitae</p>
                        <p className="ead-muted">PDF document</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="ead-btn"
                      onClick={() => handleViewDocument(studentCV, 'Curriculum Vitae')}
                    >
                      <FileText size={15} />
                      Preview
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>

          <aside className="ead-side">
            <section className="ead-card">
              <div className="ead-card-header">
                <div className="ead-card-label">Placement context</div>
                <h2 className="ead-card-title">Internship details</h2>
              </div>

              <div className="ead-card-body">
                <div className="ead-detail-row">
                  <div className="ead-detail-icon">
                    <Briefcase size={16} />
                  </div>

                  <div>
                    <div className="ead-detail-label">Position</div>
                    <p className="ead-detail-value">{application.title}</p>
                  </div>
                </div>

                <div className="ead-detail-row">
                  <div className="ead-detail-icon">
                    <Users size={16} />
                  </div>

                  <div>
                    <div className="ead-detail-label">Department</div>
                    <p className="ead-detail-value">{application.department || 'N/A'}</p>
                  </div>
                </div>

                <div className="ead-detail-row">
                  <div className="ead-detail-icon">
                    <MapPin size={16} />
                  </div>

                  <div>
                    <div className="ead-detail-label">Location</div>
                    <p className="ead-detail-value">{application.location || 'Remote'}</p>
                  </div>
                </div>

                <div className="ead-detail-row">
                  <div className="ead-detail-icon">
                    <Calendar size={16} />
                  </div>

                  <div>
                    <div className="ead-detail-label">Applied date</div>
                    <p className="ead-detail-value">
                      {application.created_at
                        ? new Date(application.created_at).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="ead-detail-row">
                  <div className="ead-detail-icon">
                    <Users size={16} />
                  </div>

                  <div>
                    <div className="ead-detail-label">Employer mentor</div>
                    <p className="ead-detail-value">
                      {application.employer_supervisor_details?.name ||
                        application.employer_supervisor_details?.email ||
                        'Not assigned'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {showRejectModal && (
          <div className="ead-modal-backdrop">
            <div className="ead-modal">
              <div className="ead-modal-header">
                <h5 className="ead-modal-title">Reject Application</h5>

                <button
                  type="button"
                  className="ead-modal-close"
                  onClick={() => setShowRejectModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="ead-modal-body">
                <label className="ead-label">Reason for rejection</label>

                <textarea
                  className="ead-textarea"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Optional feedback for the candidate..."
                />
              </div>

              <div className="ead-modal-footer">
                <button
                  type="button"
                  className="ead-modal-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="ead-modal-danger"
                  onClick={() => handleStatusChange('REJECT')}
                  disabled={isProcessing}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {showAssignModal && application && (
          <div className="ead-modal-backdrop">
            <div className="ead-modal">
              <div className="ead-modal-header">
                <h5 className="ead-modal-title">Assign Employer Mentor</h5>

                <button
                  type="button"
                  className="ead-modal-close"
                  onClick={() => setShowAssignModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="ead-modal-body">
                <div className="ead-modal-context">
                  <div className="ead-card-label">Placement</div>
                  <p className="ead-detail-value">
                    {application.student_info?.name || 'Student'}
                  </p>
                  <p className="ead-muted">{application.title}</p>
                </div>

                <label className="ead-label">Employer supervisor</label>

                <select
                  className="ead-select"
                  value={selectedSupervisor}
                  onChange={(event) => setSelectedSupervisor(event.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">Choose a mentor...</option>

                  {supervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.name || supervisor.email} ({supervisor.email})
                    </option>
                  ))}
                </select>

                {application.start_readiness?.missing?.length ? (
                  <div className="ead-modal-context" style={{ marginTop: 14, marginBottom: 0 }}>
                    <div className="ead-card-label">Still needed before start</div>
                    <p className="ead-muted">
                      {application.start_readiness.missing.join(', ')}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="ead-modal-footer">
                <button
                  type="button"
                  className="ead-modal-secondary"
                  onClick={() => setShowAssignModal(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="ead-modal-primary"
                  onClick={handleAssignSupervisor}
                  disabled={isProcessing || !selectedSupervisor}
                >
                  {isProcessing ? 'Saving...' : 'Save Mentor'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <FeedbackModal {...feedbackProps} />

      <DocumentPreviewModal
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
      />
    </EmployerLayout>
  );
};

export default EmployerApplicationDetail;