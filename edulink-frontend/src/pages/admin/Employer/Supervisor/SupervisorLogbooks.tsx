import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import {
  CheckCircle,
  XCircle,
  FileText,
  RotateCcw,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  ClipboardCheck,
  Paperclip,
  Activity,
  Eye,
} from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { InternshipEvidence, PaginatedResponse } from '../../../../services/internship/internshipService';
import PaginationControls from '../../../../components/common/PaginationControls';
import { FeedbackModal, DocumentPreviewModal } from '../../../../components/common';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';
import {
  SupervisorWorkspaceEmpty,
  SupervisorWorkspacePage,
  SupervisorWorkspaceTable,
} from '../../../../components/employer/supervisor/workspace';

const SupervisorLogbooks: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<InternshipEvidence[]>([]);
  const [evidencePage, setEvidencePage] = useState<PaginatedResponse<InternshipEvidence> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] =
    useState<InternshipEvidence | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<
    'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED' | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const { feedbackProps, showError, showSuccess } = useFeedbackModal();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchEvidence = async (pageNumber = page) => {
    try {
      setLoading(true);
      const resp = await internshipService.getPendingEvidencePaginated({ page: pageNumber, page_size: pageSize });
      const data = resp.results || [];
      const logbooks = data.filter((e: InternshipEvidence) => e.evidence_type === 'LOGBOOK');
      setEvidencePage(resp);
      setEvidenceList(logbooks);
    } catch (err: any) {
      console.error('Failed to fetch evidence', err);
      setError('Failed to load pending logbooks.');
    } finally {
      setLoading(false);
    }
  };

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  useEffect(() => {
    fetchEvidence(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleReviewClick = (
    evidence: InternshipEvidence,
    action: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED'
  ) => {
    setSelectedEvidence(evidence);
    setReviewAction(action);
    setReviewNotes(evidence.employer_review_notes || '');
    setPrivateNotes(evidence.employer_private_notes || '');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (
    action: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED' | null = reviewAction
  ) => {
    if (!selectedEvidence || !action) return;

    try {
      setSubmitting(true);

      await internshipService.reviewEvidence(
        selectedEvidence.application,
        selectedEvidence.id,
        action,
        reviewNotes,
        privateNotes
      );

      const actionLabel =
        action === 'ACCEPTED'
          ? 'approved'
          : action === 'REVISION_REQUIRED'
          ? 'sent for revision'
          : 'rejected';

      showSuccess(
        'Review Complete',
        `The logbook has been ${actionLabel} successfully.`
      );

      setShowReviewModal(false);
      fetchEvidence(page);
    } catch (err: any) {
      console.error('Failed to review evidence', err);

      if (err?.response?.status === 403) {
        showError(
          'Unauthorized',
          'You cannot review this logbook. The internship may already be completed.'
        );
      } else {
        const sanitized = sanitizeAdminError(err);
        showError(
          'Review Failed',
          'We encountered an error while trying to submit your review.',
          sanitized.details
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusTone = (status?: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      case 'REVISION_REQUIRED':
        return 'info';
      case 'REVIEWED':
        return 'warning';
      default:
        return 'pending';
    }
  };

  const getStatusLabel = (status?: string, fallback = 'Pending') => {
    switch (status) {
      case 'ACCEPTED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'REVISION_REQUIRED':
        return 'Revision Required';
      case 'REVIEWED':
        return 'Reviewed';
      default:
        return fallback;
    }
  };

  const getEntries = (evidence?: InternshipEvidence | null) => {
    if (!evidence?.metadata?.entries) return [];

    return Object.entries(
      evidence.metadata.entries as Record<string, string>
    ).sort(([a], [b]) => a.localeCompare(b));
  };

  const entriesCount = (evidence: InternshipEvidence) =>
    evidence.metadata?.entries
      ? Object.keys(evidence.metadata.entries as Record<string, string>).length
      : 0;

  const pendingCount = evidenceList.filter(
    (item) => !item.employer_review_status
  ).length;

  const withAttachments = evidenceList.filter((item) => item.file).length;

  const institutionReviewed = evidenceList.filter(
    (item) => item.institution_review_status
  ).length;

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="container-fluid px-4 px-lg-5 py-4">
          <SupervisorTableSkeleton />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <SupervisorWorkspacePage className="logbook-page">
        <div className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
          <div className="logbook-hero mb-4">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
              <div>
                <div className="eyebrow mb-3">
                  <FileText size={15} />
                  Evidence Review Queue
                </div>

                <h1 className="page-title mb-2">Logbook Reviews</h1>

                <p className="page-subtitle mb-0">
                  Review weekly workplace evidence, validate student activity, and keep
                  employer-side supervision records accountable.
                </p>
              </div>

              <button className="hero-refresh-btn" onClick={() => fetchEvidence(page)}>
                <Activity size={16} />
                Refresh Queue
              </button>
            </div>

            <div className="summary-grid mt-4">
              <div className="summary-card dark">
                <span>Pending Logbooks</span>
                <h2>{evidenceList.length}</h2>
                <p>Submissions waiting in your review queue</p>
              </div>

              <div className="summary-card">
                <span>Employer Pending</span>
                <h2>{pendingCount}</h2>
                <p>Need your supervisor decision</p>
              </div>

              <div className="summary-card">
                <span>Institution Reviewed</span>
                <h2>{institutionReviewed}</h2>
                <p>Have institution-side review state</p>
              </div>

              <div className="summary-card">
                <span>Attachments</span>
                <h2>{withAttachments}</h2>
                <p>Submissions include uploaded files</p>
              </div>
            </div>
          </div>

          {error ? (
            <Alert variant="danger" className="review-alert">
              <AlertCircle size={24} />
              <div>
                <h6>Failed to load logbooks</h6>
                <p>{error}</p>

                <Button variant="outline-danger" size="sm" onClick={() => fetchEvidence(page)}>
                  Try Again
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="workspace-card">
              <div className="workspace-header">
                <div>
                  <div className="section-kicker">
                    <ClipboardCheck size={14} />
                    Weekly Submissions
                  </div>

                  <h5>Pending Review Cases</h5>

                  <p>
                    Each row represents a weekly logbook case requiring employer
                    supervisor validation.
                  </p>
                </div>

                <span className="mini-count">
                  {evidenceList.length} case{evidenceList.length === 1 ? '' : 's'}
                </span>
              </div>

              {evidenceList.length > 0 ? (
                <SupervisorWorkspaceTable>
                  <table className="sv-table">
                    <thead>
                      <tr>
                        <th>Submission</th>
                        <th>Week</th>
                        <th>Entries</th>
                        <th>Employer</th>
                        <th>Institution</th>
                        <th>Attachment</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceList.map((evidence) => {
                        const employerTone = getStatusTone(evidence.employer_review_status);
                        const institutionTone = getStatusTone(evidence.institution_review_status);

                        return (
                          <tr key={evidence.id}>
                            <td>
                              <div className="sv-person">
                                <span className="sv-avatar">
                                  {(evidence.student_info?.name || 'I').charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <p className="sv-primary">{evidence.title}</p>
                                  <p className="sv-muted">
                                    {evidence.student_info?.name || 'Unknown Intern'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <p className="sv-primary">
                                {evidence.metadata?.weekStartDate
                                  ? `Week of ${evidence.metadata.weekStartDate}`
                                  : 'Weekly submission'}
                              </p>
                              <p className="sv-muted">
                                Submitted {new Date(evidence.created_at).toLocaleDateString()}
                              </p>
                            </td>
                            <td>
                              <span className="sv-pill info">{entriesCount(evidence)} entries</span>
                            </td>
                            <td>
                              <span className={`sv-pill ${employerTone}`}>
                                {getStatusLabel(evidence.employer_review_status)}
                              </span>
                            </td>
                            <td>
                              <span className={`sv-pill ${institutionTone}`}>
                                {getStatusLabel(evidence.institution_review_status)}
                              </span>
                            </td>
                            <td>
                              <span className={`sv-pill ${evidence.file ? 'success' : 'muted'}`}>
                                {evidence.file ? 'Available' : 'None'}
                              </span>
                            </td>
                            <td>
                              <div className="sv-actions">
                                {evidence.file && (
                                  <button
                                    type="button"
                                    className="case-action secondary"
                                    onClick={() => {
                                      setPreviewTitle(evidence.title || 'Attachment');
                                      setPreviewUrl(evidence.file);
                                      setPreviewOpen(true);
                                    }}
                                  >
                                    <Paperclip size={15} />
                                    Attachment
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="case-action primary"
                                  onClick={() => handleReviewClick(evidence, 'ACCEPTED')}
                                >
                                  <Eye size={15} />
                                  Review
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </SupervisorWorkspaceTable>
              ) : (
                <SupervisorWorkspaceEmpty
                  icon={<CheckCircle size={30} />}
                  title="All caught up"
                  message="No pending logbook submissions are waiting for employer supervisor review."
                />
              )}
              {evidencePage && (
                <PaginationControls
                  count={evidencePage.count}
                  page={page}
                  pageSize={pageSize}
                  next={evidencePage.next}
                  previous={evidencePage.previous}
                  onPageChange={(p) => setPage(p)}
                />
              )}
            </div>
          )}
        </div>

        <Modal
          show={showReviewModal}
          onHide={() => setShowReviewModal(false)}
          centered
          size="xl"
          className="review-workspace-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <span>Review Weekly Logbook</span>
              <small>
                {selectedEvidence?.student_info?.name || 'Unknown Intern'} ·{' '}
                {selectedEvidence?.metadata?.weekStartDate
                  ? `Week of ${selectedEvidence.metadata.weekStartDate}`
                  : 'Weekly Submission'}
              </small>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="review-workspace">
              <div className="evidence-panel">
                <div className="panel-header">
                  <div>
                    <div className="section-kicker">
                      <FileText size={14} />
                      Evidence Entries
                    </div>

                    <h6>Daily Work Log</h6>
                  </div>

                  {selectedEvidence?.file && (
                    <button
                      type="button"
                      className="attachment-btn"
                      onClick={() => {
                        setPreviewTitle('Attachment');
                        setPreviewUrl(selectedEvidence.file);
                        setPreviewOpen(true);
                      }}
                    >
                      <Paperclip size={14} />
                      View Attachment
                    </button>
                  )}
                </div>

                <div className="timeline-list">
                  {getEntries(selectedEvidence).length > 0 ? (
                    getEntries(selectedEvidence).map(([date, content]) => (
                      <div key={date} className="timeline-item">
                        <div className="timeline-dot" />

                        <div className="timeline-card">
                          <div className="timeline-card-header">
                            <strong>
                              {new Date(date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </strong>

                            <span>{date}</span>
                          </div>

                          <p>{content as string}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Alert variant="info" className="small mb-0">
                      No daily logs found in this submission.
                    </Alert>
                  )}
                </div>
              </div>

              <div className="decision-panel">
                <div className="panel-section">
                  <div className="section-kicker">
                    <ShieldCheck size={14} />
                    Dual Review State
                  </div>

                  <div className="verification-stack mt-3">
                    <div className="verification-card">
                      <div>
                        <strong>Employer Supervisor</strong>
                        <span>
                          {selectedEvidence?.employer_review_notes ||
                            'No feedback submitted yet'}
                        </span>

                        {selectedEvidence?.employer_private_notes && (
                          <em>Private: {selectedEvidence.employer_private_notes}</em>
                        )}
                      </div>

                      <span
                        className={`status-pill ${getStatusTone(
                          selectedEvidence?.employer_review_status
                        )}`}
                      >
                        {getStatusLabel(selectedEvidence?.employer_review_status)}
                      </span>
                    </div>

                    <div className="verification-card">
                      <div>
                        <strong>Institution Assessor</strong>
                        <span>
                          {selectedEvidence?.institution_review_notes ||
                            'No institution feedback yet'}
                        </span>

                        {selectedEvidence?.institution_private_notes && (
                          <em>
                            Private: {selectedEvidence.institution_private_notes}
                          </em>
                        )}
                      </div>

                      <span
                        className={`status-pill ${getStatusTone(
                          selectedEvidence?.institution_review_status
                        )}`}
                      >
                        {getStatusLabel(
                          selectedEvidence?.institution_review_status
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <div className="section-kicker">
                    <MessageSquare size={14} />
                    Your Review
                  </div>

                  <div className="review-inputs mt-3">
                    <Form.Group>
                      <Form.Label>Student Feedback</Form.Label>

                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Feedback visible to the student..."
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label>Private Notes</Form.Label>

                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Internal notes for employer-side supervision..."
                      />
                    </Form.Group>
                  </div>
                </div>

                <div className="decision-actions">
                  <Button
                    variant="light"
                    onClick={() => setShowReviewModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>

                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-danger"
                      onClick={() => handleReviewSubmit('REJECTED')}
                      disabled={submitting}
                    >
                      <XCircle size={16} />
                      Reject
                    </Button>

                    <Button
                      variant="outline-info"
                      onClick={() => handleReviewSubmit('REVISION_REQUIRED')}
                      disabled={submitting}
                    >
                      <RotateCcw size={16} />
                      Request Changes
                    </Button>

                    <Button
                      variant="success"
                      onClick={() => handleReviewSubmit('ACCEPTED')}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>
        </Modal>

        <FeedbackModal {...feedbackProps} />

        <DocumentPreviewModal
          show={previewOpen}
          onHide={() => setPreviewOpen(false)}
          title={previewTitle}
          url={previewUrl}
        />

        <style>{`
          .logbook-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 32rem),
              linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%);
            color: #0f172a;
          }

          .logbook-hero,
          .workspace-card {
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.045);
          }

          .logbook-hero {
            padding: 1.5rem;
            backdrop-filter: blur(14px);
          }

          .eyebrow,
          .section-kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #2563eb;
          }

          .page-title {
            font-size: clamp(1.75rem, 3vw, 2.35rem);
            font-weight: 850;
            letter-spacing: -0.045em;
            color: #0f172a;
          }

          .page-subtitle {
            max-width: 720px;
            color: #64748b;
            font-size: 0.98rem;
            line-height: 1.65;
          }

          .hero-refresh-btn {
            align-self: flex-start;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.72rem 0.95rem;
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 999px;
            color: #334155;
            background: #ffffff;
            font-size: 0.84rem;
            font-weight: 800;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: 1.25fr 1fr 1fr 1fr;
            gap: 1rem;
          }

          .summary-card {
            padding: 1rem;
            border-radius: 20px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .summary-card.dark {
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            color: #ffffff;
          }

          .summary-card span {
            display: block;
            margin-bottom: 0.4rem;
            color: #64748b;
            font-size: 0.74rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.045em;
          }

          .summary-card.dark span,
          .summary-card.dark p {
            color: rgba(255, 255, 255, 0.72);
          }

          .summary-card h2 {
            margin: 0;
            font-size: 2rem;
            font-weight: 850;
            letter-spacing: -0.04em;
          }

          .summary-card p {
            margin: 0.2rem 0 0;
            color: #64748b;
            font-size: 0.84rem;
            line-height: 1.4;
          }

          .review-alert {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem;
            border: 0;
            border-radius: 20px;
            box-shadow: 0 14px 35px rgba(15, 23, 42, 0.06);
          }

          .review-alert h6 {
            margin-bottom: 0.2rem;
            font-weight: 850;
          }

          .review-alert p {
            margin-bottom: 0.8rem;
            font-size: 0.88rem;
          }

          .workspace-card {
            overflow: hidden;
          }

          .workspace-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.35rem 1.35rem 1rem;
            border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          }

          .workspace-header h5 {
            margin: 0.35rem 0 0.25rem;
            color: #0f172a;
            font-size: 1.08rem;
            font-weight: 850;
            letter-spacing: -0.02em;
          }

          .workspace-header p {
            margin: 0;
            color: #64748b;
            font-size: 0.88rem;
          }

          .mini-count {
            padding: 0.55rem 0.75rem;
            border-radius: 999px;
            color: #475569;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
            font-size: 0.78rem;
            font-weight: 800;
            white-space: nowrap;
          }

          .review-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            padding: 1.1rem;
          }

          .review-card {
            padding: 1rem;
            border-radius: 22px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.07);
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04);
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .review-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 22px 42px rgba(15, 23, 42, 0.075);
            border-color: rgba(37, 99, 235, 0.16);
          }

          .review-card-top {
            display: flex;
            gap: 0.85rem;
            align-items: flex-start;
          }

          .case-icon {
            width: 44px;
            height: 44px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #2563eb;
            background: #eff6ff;
            border: 1px solid rgba(37, 99, 235, 0.12);
            flex-shrink: 0;
          }

          .review-card h6 {
            margin: 0 0 0.35rem;
            color: #0f172a;
            font-size: 0.98rem;
            font-weight: 850;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .case-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            color: #64748b;
            font-size: 0.78rem;
          }

          .case-meta span {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
          }

          .case-summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.75rem;
            margin-top: 1rem;
          }

          .case-summary div {
            padding: 0.78rem;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.05);
          }

          .case-summary span {
            display: block;
            margin-bottom: 0.25rem;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 850;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .case-summary strong {
            display: block;
            color: #0f172a;
            font-size: 0.84rem;
            font-weight: 850;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .dual-review-panel {
            margin-top: 0.85rem;
            padding: 0.85rem;
            border-radius: 18px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .review-state {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.55rem 0;
          }

          .review-state + .review-state {
            border-top: 1px solid rgba(15, 23, 42, 0.06);
          }

          .review-state-label {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            color: #475569;
            font-size: 0.8rem;
            font-weight: 800;
          }

          .status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.42rem 0.65rem;
            border-radius: 999px;
            font-size: 0.68rem;
            font-weight: 850;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .status-pill.success {
            color: #047857;
            background: #ecfdf5;
          }

          .status-pill.danger {
            color: #b91c1c;
            background: #fef2f2;
          }

          .status-pill.info {
            color: #0369a1;
            background: #e0f2fe;
          }

          .status-pill.warning {
            color: #92400e;
            background: #fef3c7;
          }

          .status-pill.pending {
            color: #475569;
            background: #f1f5f9;
          }

          .case-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.55rem;
            flex-wrap: wrap;
            margin-top: 1rem;
          }

          .case-action {
            min-height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.42rem;
            padding: 0.48rem 0.75rem;
            border-radius: 999px;
            border: 0;
            font-size: 0.78rem;
            font-weight: 850;
            transition: transform 0.18s ease, background 0.18s ease;
          }

          .case-action:hover {
            transform: translateY(-1px);
          }

          .case-action.primary {
            color: #ffffff;
            background: #2563eb;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.16);
          }

          .case-action.secondary {
            color: #334155;
            background: #f1f5f9;
          }

          .empty-state {
            padding: 4.5rem 1.5rem;
            text-align: center;
          }

          .empty-icon {
            width: 76px;
            height: 76px;
            margin: 0 auto 1rem;
            border-radius: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #059669;
            background: #ecfdf5;
          }

          .empty-state h5 {
            margin-bottom: 0.4rem;
            color: #0f172a;
            font-weight: 850;
          }

          .empty-state p {
            max-width: 420px;
            margin: 0 auto;
            color: #64748b;
            font-size: 0.9rem;
            line-height: 1.55;
          }

          .review-workspace-modal .modal-content {
            border: 0;
            border-radius: 26px;
            overflow: hidden;
            box-shadow: 0 28px 90px rgba(15, 23, 42, 0.22);
          }

          .review-workspace-modal .modal-header {
            padding: 1.25rem 1.4rem;
            border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          }

          .review-workspace-modal .modal-title {
            display: flex;
            flex-direction: column;
            gap: 0.18rem;
            color: #0f172a;
            font-weight: 850;
          }

          .review-workspace-modal .modal-title small {
            color: #64748b;
            font-size: 0.78rem;
            font-weight: 650;
          }

          .review-workspace-modal .modal-body {
            padding: 0;
            background: #f8fafc;
          }

          .review-workspace {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.75fr);
            min-height: 640px;
          }

          .evidence-panel,
          .decision-panel {
            padding: 1.2rem;
          }

          .evidence-panel {
            background: #ffffff;
            border-right: 1px solid rgba(15, 23, 42, 0.06);
          }

          .decision-panel {
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .panel-header h6 {
            margin: 0.35rem 0 0;
            color: #0f172a;
            font-size: 1rem;
            font-weight: 850;
          }

          .attachment-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.42rem;
            padding: 0.5rem 0.75rem;
            border-radius: 999px;
            border: 1px solid rgba(37, 99, 235, 0.16);
            color: #2563eb;
            background: #eff6ff;
            font-size: 0.78rem;
            font-weight: 850;
          }

          .timeline-list {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 0.9rem;
          }

          .timeline-item {
            position: relative;
            display: grid;
            grid-template-columns: 18px minmax(0, 1fr);
            gap: 0.75rem;
          }

          .timeline-item::before {
            content: '';
            position: absolute;
            left: 8px;
            top: 20px;
            bottom: -1rem;
            width: 2px;
            background: #e2e8f0;
          }

          .timeline-item:last-child::before {
            display: none;
          }

          .timeline-dot {
            position: relative;
            z-index: 1;
            width: 18px;
            height: 18px;
            margin-top: 1rem;
            border-radius: 999px;
            background: #2563eb;
            border: 4px solid #dbeafe;
          }

          .timeline-card {
            padding: 0.95rem;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .timeline-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 0.55rem;
          }

          .timeline-card-header strong {
            color: #0f172a;
            font-size: 0.88rem;
            font-weight: 850;
          }

          .timeline-card-header span {
            color: #64748b;
            font-size: 0.73rem;
            font-weight: 750;
          }

          .timeline-card p {
            margin: 0;
            color: #334155;
            font-size: 0.86rem;
            line-height: 1.65;
            white-space: pre-wrap;
          }

          .panel-section {
            padding: 1rem;
            border-radius: 20px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .verification-stack {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .verification-card {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 0.8rem;
            padding: 0.85rem;
            border-radius: 17px;
            background: #f8fafc;
          }

          .verification-card strong {
            display: block;
            color: #0f172a;
            font-size: 0.86rem;
            font-weight: 850;
          }

          .verification-card span {
            display: block;
            margin-top: 0.2rem;
            color: #64748b;
            font-size: 0.78rem;
            line-height: 1.45;
          }

          .verification-card em {
            display: block;
            margin-top: 0.25rem;
            color: #b91c1c;
            font-size: 0.72rem;
            font-style: normal;
            line-height: 1.4;
          }

          .review-inputs {
            display: flex;
            flex-direction: column;
            gap: 0.9rem;
          }

          .review-inputs label {
            color: #475569;
            font-size: 0.78rem;
            font-weight: 850;
          }

          .review-inputs textarea {
            border-radius: 16px;
            border-color: rgba(15, 23, 42, 0.09);
            font-size: 0.86rem;
            line-height: 1.55;
            resize: vertical;
          }

          .decision-actions {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem;
            border-radius: 20px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .decision-actions .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            border-radius: 999px;
            font-size: 0.82rem;
            font-weight: 800;
            padding: 0.55rem 0.9rem;
          }

          .min-w-0 {
            min-width: 0;
          }

          @media (max-width: 1199.98px) {
            .summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .review-grid {
              grid-template-columns: 1fr;
            }

            .review-workspace {
              grid-template-columns: 1fr;
            }

            .evidence-panel {
              border-right: 0;
              border-bottom: 1px solid rgba(15, 23, 42, 0.06);
            }
          }

          @media (max-width: 767.98px) {
            .logbook-hero {
              padding: 1.1rem;
              border-radius: 20px;
            }

            .summary-grid,
            .case-summary {
              grid-template-columns: 1fr;
            }

            .workspace-header,
            .panel-header,
            .decision-actions {
              flex-direction: column;
            }

            .case-actions,
            .case-action {
              width: 100%;
            }

            .review-workspace {
              min-height: auto;
            }

            .timeline-card-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.25rem;
            }
          }
        `}</style>
      </SupervisorWorkspacePage>
    </SupervisorLayout>
  );
};

export default SupervisorLogbooks;
