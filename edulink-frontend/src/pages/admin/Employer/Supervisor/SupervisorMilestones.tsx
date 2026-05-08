import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import {
  CheckCircle,
  XCircle,
  Award,
  Paperclip,
  Activity,
  AlertCircle,
  Eye,
  ClipboardCheck,
} from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { InternshipEvidence } from '../../../../services/internship/internshipService';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../../components/common';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';
import {
  SupervisorWorkspaceEmpty,
  SupervisorWorkspacePage,
  SupervisorWorkspaceTable,
} from '../../../../components/employer/supervisor/workspace';

const SupervisorMilestones: React.FC = () => {
  const { feedbackProps, showSuccess, showError } = useFeedbackModal();

  const [evidenceList, setEvidenceList] = useState<InternshipEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] =
    useState<InternshipEvidence | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] =
    useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    try {
      setLoading(true);

      const dataResponse = await internshipService.getPendingEvidence();
      const data = Array.isArray(dataResponse)
        ? dataResponse
        : (dataResponse as any)?.results || [];

      const milestones = data.filter(
        (e: InternshipEvidence) => e.evidence_type === 'MILESTONE'
      );

      setEvidenceList(milestones);
    } catch (err: any) {
      console.error('Failed to fetch milestones', err);
      setError('Failed to load pending milestones.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (
    evidence: InternshipEvidence,
    action: 'ACCEPTED' | 'REJECTED'
  ) => {
    setSelectedEvidence(evidence);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedEvidence || !reviewAction) return;

    if (reviewAction === 'REJECTED' && !reviewNotes.trim()) {
      showError('Reason Required', 'Add a reason before rejecting this milestone.');
      return;
    }

    try {
      setSubmitting(true);

      await internshipService.reviewEvidence(
        selectedEvidence.application,
        selectedEvidence.id,
        reviewAction,
        reviewNotes
      );

      showSuccess(
        'Review Submitted',
        `Milestone ${
          reviewAction === 'ACCEPTED' ? 'approved' : 'rejected'
        } successfully.`
      );

      setShowReviewModal(false);
      fetchEvidence();
    } catch (err: any) {
      console.error('Failed to review milestone', err);

      const sanitized = sanitizeAdminError(err);
      showError(
        'Review Failed',
        sanitized.userMessage || 'Failed to submit review for milestone.',
        sanitized.details
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submittedToday = evidenceList.filter((item) => {
    const created = new Date(item.created_at).toDateString();
    return created === new Date().toDateString();
  }).length;

  const withAttachments = evidenceList.filter((item) => item.file).length;

  if (loading) {
    return (
      <SupervisorLayout>
        <SupervisorTableSkeleton />
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <SupervisorWorkspacePage className="milestone-page">
        <div className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
          <div className="milestone-hero mb-4">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
              <div>
                <div className="eyebrow mb-3">
                  <Award size={15} />
                  Milestone Validation Queue
                </div>

                <h1 className="page-title mb-2">Pending Milestones</h1>

                <p className="page-subtitle mb-0">
                  Validate key student progress checkpoints before internship completion
                  and institutional certification.
                </p>
              </div>

              <button className="hero-refresh-btn" onClick={fetchEvidence}>
                <Activity size={16} />
                Refresh Queue
              </button>
            </div>

            <div className="summary-grid mt-4">
              <div className="summary-card dark">
                <span>Pending Milestones</span>
                <h2>{evidenceList.length}</h2>
                <p>Milestone submissions waiting for review</p>
              </div>

              <div className="summary-card">
                <span>Submitted Today</span>
                <h2>{submittedToday}</h2>
                <p>New milestone evidence received today</p>
              </div>

              <div className="summary-card">
                <span>Attachments</span>
                <h2>{withAttachments}</h2>
                <p>Milestones with supporting files</p>
              </div>

              <div className="summary-card">
                <span>Review State</span>
                <h2>{evidenceList.length ? 'Open' : 'Clear'}</h2>
                <p>{evidenceList.length ? 'Supervisor action needed' : 'No action required'}</p>
              </div>
            </div>
          </div>

          {error ? (
            <Alert variant="danger" className="review-alert">
              <AlertCircle size={24} />

              <div>
                <h6>Failed to load milestones</h6>
                <p>{error}</p>

                <Button variant="outline-danger" size="sm" onClick={fetchEvidence}>
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
                    Review Cases
                  </div>

                  <h5>Milestone Submissions</h5>

                  <p>
                    Approve verified progress checkpoints or reject submissions that do
                    not meet workplace expectations.
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
                        <th>Milestone</th>
                        <th>Description</th>
                        <th>Submitted</th>
                        <th>Attachment</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceList.map((evidence) => (
                        <tr key={evidence.id}>
                          <td>
                            <div className="sv-person">
                              <span className="sv-avatar">
                                {(evidence.student_info?.name || 'M').charAt(0).toUpperCase()}
                              </span>
                              <div>
                                <p className="sv-primary">{evidence.title}</p>
                                <p className="sv-muted">
                                  {evidence.student_info?.name ||
                                    `Student ID: ${evidence.submitted_by}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className="sv-muted" style={{ maxWidth: 360 }}>
                              {evidence.description ||
                                'No description was provided for this milestone.'}
                            </p>
                          </td>
                          <td>
                            <p className="sv-primary">
                              {new Date(evidence.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td>
                            <span className={`sv-pill ${evidence.file ? 'success' : 'muted'}`}>
                              {evidence.file ? 'Available' : 'None'}
                            </span>
                          </td>
                          <td>
                            <span className="sv-pill warning">Pending Review</span>
                          </td>
                          <td>
                            <div className="sv-actions">
                              {evidence.file && (
                                <a
                                  href={evidence.file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="case-action secondary"
                                >
                                  <Paperclip size={15} />
                                  File
                                </a>
                              )}

                              <button
                                type="button"
                                className="case-action success"
                                onClick={() => handleReviewClick(evidence, 'ACCEPTED')}
                              >
                                <CheckCircle size={15} />
                                Approve
                              </button>

                              <button
                                type="button"
                                className="case-action danger-soft"
                                onClick={() => handleReviewClick(evidence, 'REJECTED')}
                              >
                                <XCircle size={15} />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SupervisorWorkspaceTable>
              ) : (
                <SupervisorWorkspaceEmpty
                  icon={<CheckCircle size={30} />}
                  title="No pending milestones"
                  message="All milestone submissions have been reviewed. New student milestones will appear here once submitted."
                />
              )}
            </div>
          )}
        </div>

        <Modal
          show={showReviewModal}
          onHide={() => setShowReviewModal(false)}
          centered
          className="milestone-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {reviewAction === 'ACCEPTED' ? 'Approve Milestone' : 'Reject Milestone'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="modal-case-card mb-4">
              <div className="case-icon">
                <Award size={20} />
              </div>

              <div>
                <strong>{selectedEvidence?.title}</strong>
                <span>
                  {selectedEvidence?.student_info?.name ||
                    `Student ID: ${selectedEvidence?.submitted_by || '-'}`}
                </span>
              </div>
            </div>

            <div
              className={`decision-notice ${
                reviewAction === 'ACCEPTED' ? 'success' : 'danger'
              }`}
            >
              {reviewAction === 'ACCEPTED' ? (
                <CheckCircle size={18} />
              ) : (
                <XCircle size={18} />
              )}

              <div>
                <strong>
                  {reviewAction === 'ACCEPTED'
                    ? 'Confirm milestone approval'
                    : 'Confirm milestone rejection'}
                </strong>

                <p>
                  {reviewAction === 'ACCEPTED'
                    ? 'This confirms the milestone as valid employer-side progress evidence.'
                    : 'Rejecting this milestone requires a clear reason so the student understands what must be corrected.'}
                </p>
              </div>
            </div>

            <Form.Group>
              <Form.Label>
                {reviewAction === 'ACCEPTED'
                  ? 'Review Notes'
                  : 'Reason for Rejection'}
                {reviewAction === 'REJECTED' ? (
                  <span className="text-danger"> *</span>
                ) : null}
              </Form.Label>

              <Form.Control
                as="textarea"
                rows={4}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === 'ACCEPTED'
                    ? 'Add optional feedback for this milestone...'
                    : 'Explain why this milestone is being rejected...'
                }
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="light"
              onClick={() => setShowReviewModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              variant={reviewAction === 'ACCEPTED' ? 'success' : 'danger'}
              onClick={handleReviewSubmit}
              disabled={submitting}
            >
              {submitting ? <Spinner animation="border" size="sm" /> : <Eye size={16} />}
              Confirm Review
            </Button>
          </Modal.Footer>
        </Modal>

        <FeedbackModal {...feedbackProps} />

        <style>{`
          .milestone-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 32rem),
              linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%);
            color: #0f172a;
          }

          .milestone-hero,
          .workspace-card {
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.045);
          }

          .milestone-hero {
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

          .milestone-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            padding: 1.1rem;
          }

          .milestone-card {
            padding: 1rem;
            border-radius: 22px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.07);
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04);
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .milestone-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 22px 42px rgba(15, 23, 42, 0.075);
            border-color: rgba(37, 99, 235, 0.16);
          }

          .milestone-card-top {
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

          .milestone-card h6 {
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

          .milestone-description {
            margin-top: 1rem;
            padding: 0.9rem;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.05);
          }

          .milestone-description span,
          .case-summary span {
            display: block;
            margin-bottom: 0.25rem;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 850;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .milestone-description p {
            margin: 0;
            color: #334155;
            font-size: 0.86rem;
            line-height: 1.55;
          }

          .case-summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.75rem;
            margin-top: 0.85rem;
          }

          .case-summary div {
            padding: 0.78rem;
            border-radius: 16px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
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
            text-decoration: none;
            font-size: 0.78rem;
            font-weight: 850;
            transition: transform 0.18s ease, background 0.18s ease;
          }

          .case-action:hover {
            transform: translateY(-1px);
          }

          .case-action.secondary {
            color: #334155;
            background: #f1f5f9;
          }

          .case-action.success {
            color: #047857;
            background: #ecfdf5;
          }

          .case-action.danger-soft {
            color: #b91c1c;
            background: #fef2f2;
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

          .milestone-modal .modal-content {
            border: 0;
            border-radius: 26px;
            overflow: hidden;
            box-shadow: 0 28px 90px rgba(15, 23, 42, 0.22);
          }

          .milestone-modal .modal-header,
          .milestone-modal .modal-footer {
            padding: 1.2rem 1.35rem;
            border-color: rgba(15, 23, 42, 0.06);
          }

          .milestone-modal .modal-title {
            color: #0f172a;
            font-size: 1.08rem;
            font-weight: 850;
          }

          .milestone-modal .modal-body {
            padding: 1.35rem;
          }

          .modal-case-card {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0.95rem;
            border-radius: 20px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .modal-case-card strong {
            display: block;
            color: #0f172a;
            font-size: 0.95rem;
            font-weight: 850;
          }

          .modal-case-card span {
            display: block;
            margin-top: 0.18rem;
            color: #64748b;
            font-size: 0.8rem;
          }

          .decision-notice {
            display: flex;
            gap: 0.75rem;
            padding: 0.95rem;
            margin-bottom: 1rem;
            border-radius: 20px;
          }

          .decision-notice.success {
            color: #047857;
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
          }

          .decision-notice.danger {
            color: #b91c1c;
            background: #fef2f2;
            border: 1px solid #fecaca;
          }

          .decision-notice strong {
            display: block;
            font-size: 0.9rem;
            font-weight: 850;
          }

          .decision-notice p {
            margin: 0.18rem 0 0;
            font-size: 0.8rem;
            line-height: 1.45;
          }

          .milestone-modal .form-label {
            color: #475569;
            font-size: 0.8rem;
            font-weight: 850;
          }

          .milestone-modal textarea {
            border-radius: 16px;
            border-color: rgba(15, 23, 42, 0.09);
            font-size: 0.88rem;
            line-height: 1.55;
          }

          .milestone-modal .btn {
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

            .milestone-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 767.98px) {
            .milestone-hero {
              padding: 1.1rem;
              border-radius: 20px;
            }

            .summary-grid,
            .case-summary {
              grid-template-columns: 1fr;
            }

            .workspace-header {
              flex-direction: column;
            }

            .case-actions,
            .case-action {
              width: 100%;
            }

            .milestone-modal .modal-footer {
              flex-direction: column;
              align-items: stretch;
            }

            .milestone-modal .modal-footer .btn {
              justify-content: center;
              width: 100%;
            }
          }
        `}</style>
      </SupervisorWorkspacePage>
    </SupervisorLayout>
  );
};

export default SupervisorMilestones;
