import React, { useState, useEffect } from 'react';
import { Alert, Modal, Form, Button, Spinner } from 'react-bootstrap';
import {
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Star,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../../services/internship/internshipService';
import { Link } from 'react-router-dom';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';
import { FeedbackModal } from '../../../../components/common';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';
import {
  SupervisorWorkspaceEmpty,
  SupervisorWorkspacePage,
  SupervisorWorkspaceTable,
} from '../../../../components/employer/supervisor/workspace';

const SupervisorInternships: React.FC = () => {
  const [internships, setInternships] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentApplication, setAssessmentApplication] =
    useState<InternshipApplication | null>(null);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [finalRating, setFinalRating] = useState(5);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);

  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  useEffect(() => {
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    try {
      setLoading(true);
      const dataResponse = await internshipService.getApplications();
      const data = Array.isArray(dataResponse)
        ? dataResponse
        : (dataResponse as any)?.results || [];

      setInternships(data);
    } catch (err: any) {
      console.error('Failed to fetch internships', err);
      setError('Failed to load internships.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    showConfirm({
      title: 'Complete Internship',
      message:
        'Are you sure you want to mark this internship as completed? The institution will still need to certify it before the student can generate a certificate.',
      onConfirm: async () => {
        try {
          await internshipService.processApplication(id, 'COMPLETE');
          showSuccess(
            'Internship Completed',
            'The internship has been marked as completed successfully!'
          );
          fetchInternships();
        } catch (err: any) {
          const sanitized = sanitizeAdminError(err);
          showError(
            'Completion Failed',
            'We could not mark the internship as completed.',
            sanitized.details
          );
        }
      },
    });
  };

  const openAssessmentModal = (internship: InternshipApplication) => {
    setAssessmentApplication(internship);
    setFinalFeedback(internship.employer_final_feedback || '');
    setFinalRating(internship.employer_final_rating || 5);
  };

  const handleSubmitFinalAssessment = async () => {
    if (!assessmentApplication || !finalFeedback.trim()) {
      showError('Assessment Required', 'Add your final assessment before saving.');
      return;
    }

    try {
      setSubmittingAssessment(true);
      await internshipService.submitFinalFeedback(
        assessmentApplication.id,
        finalFeedback.trim(),
        finalRating
      );
      showSuccess('Assessment Saved', 'Employer final assessment has been saved.');
      setAssessmentApplication(null);
      fetchInternships();
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      showError(
        'Assessment Failed',
        sanitized.userMessage || 'We could not save the final assessment.',
        sanitized.details
      );
    } finally {
      setSubmittingAssessment(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'COMPLETED':
        return 'info';
      case 'TERMINATED':
        return 'danger';
      default:
        return 'muted';
    }
  };

  const activeInterns = internships.filter((item) => item.status === 'ACTIVE').length;
  const completedInterns = internships.filter((item) => item.status === 'COMPLETED').length;
  const readyForCompletion = internships.filter(
    (item) => item.completion_readiness?.can_mark_completed
  ).length;
  const pendingAssessments = internships.filter(
    (item) =>
      item.can_feedback &&
      ['ACTIVE', 'COMPLETED'].includes(item.status) &&
      !item.employer_final_feedback
  ).length;

  if (loading) {
    return (
      <SupervisorLayout>
        <SupervisorTableSkeleton />
      </SupervisorLayout>
    );
  }

  if (error) {
    return (
      <SupervisorLayout>
        <div className="container-fluid px-4 px-lg-5 py-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <SupervisorWorkspacePage className="internship-page">
        <div className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
          <div className="internship-hero mb-4">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
              <div>
                <div className="eyebrow mb-3">
                  <Users size={15} />
                  Supervision Workspace
                </div>

                <h1 className="page-title mb-2">My Interns</h1>

                <p className="page-subtitle mb-0">
                  Manage assigned students, review their workplace evidence, and complete
                  employer-side assessments with confidence.
                </p>
              </div>

              <div className="hero-badge">
                <ShieldCheck size={17} />
                Employer Supervisor
              </div>
            </div>

            <div className="summary-grid mt-4">
              <div className="summary-card dark">
                <span>Total Interns</span>
                <h2>{internships.length}</h2>
                <p>Students assigned to your supervision account</p>
              </div>

              <div className="summary-card">
                <span>Active</span>
                <h2>{activeInterns}</h2>
                <p>Currently in workplace attachment</p>
              </div>

              <div className="summary-card">
                <span>Completion Ready</span>
                <h2>{readyForCompletion}</h2>
                <p>Can be marked completed</p>
              </div>

              <div className="summary-card">
                <span>Needs Assessment</span>
                <h2>{pendingAssessments}</h2>
                <p>Final feedback not yet submitted</p>
              </div>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-header">
              <div>
                <div className="section-kicker">
                  <Activity size={14} />
                  Assigned Students
                </div>
                <h5>Internship Supervision List</h5>
                <p>
                  Review each intern’s status, completion readiness, and available actions.
                </p>
              </div>

              <div className="mini-count">
                {completedInterns} completed
              </div>
            </div>

            {internships.length > 0 ? (
              <SupervisorWorkspaceTable>
                <table className="sv-table">
                  <thead>
                    <tr>
                      <th>Intern</th>
                      <th>Placement</th>
                      <th>Status</th>
                      <th>Assessment</th>
                      <th>Completion</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                {internships.map((internship) => {
                  const missingItems = internship.completion_readiness?.missing || [];
                  const canComplete =
                    internship.status === 'ACTIVE' &&
                    internship.completion_readiness?.can_mark_completed;

                  const needsAssessment =
                    internship.can_feedback &&
                    ['ACTIVE', 'COMPLETED'].includes(internship.status) &&
                    !internship.employer_final_feedback;

                  const statusClass = getStatusClass(internship.status);

                  return (
                    <tr key={internship.id}>
                      <td>
                        <div className="sv-person">
                          <div className="sv-avatar">
                            {internship.student_info?.name?.charAt(0) || 'U'}
                          </div>

                          <div className="min-w-0">
                            <p className="sv-primary">{internship.student_info?.name || 'Unknown Student'}</p>
                            <p className="sv-muted">{internship.student_info?.email || 'No email provided'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="sv-primary">{internship.title}</p>
                        <p className="sv-muted">{internship.department || '-'}</p>
                      </td>
                      <td>
                        <span className={`sv-pill ${statusClass}`}>{internship.status}</span>
                      </td>
                      <td>
                        <p className="sv-primary">
                          {internship.employer_final_feedback
                            ? `${internship.employer_final_rating || 5}/5 submitted`
                            : needsAssessment
                              ? 'Pending'
                              : 'Not required'}
                        </p>
                      </td>
                      <td>
                        <span className={`sv-pill ${canComplete ? 'success' : 'warning'}`}>
                          {canComplete ? 'Ready' : 'In progress'}
                        </span>
                        {internship.status === 'ACTIVE' && missingItems.length > 0 && (
                          <p className="sv-muted mt-1">
                            Missing: {missingItems.slice(0, 2).join(', ')}
                            {missingItems.length > 2 ? '...' : ''}
                          </p>
                        )}
                      </td>
                      <td>
                        <div className="sv-actions">
                        <Link
                          to={`/employer/supervisor/internships/${internship.id}/logbook`}
                          className="action-btn secondary"
                        >
                          <FileText size={15} />
                          Logbooks
                        </Link>

                        {internship.can_feedback &&
                          ['ACTIVE', 'COMPLETED'].includes(internship.status) && (
                            <button
                              onClick={() => openAssessmentModal(internship)}
                              className={`action-btn ${
                                internship.employer_final_feedback
                                  ? 'secondary'
                                  : 'primary-soft'
                              }`}
                            >
                              <Star size={15} />
                              {internship.employer_final_feedback
                                ? 'Edit Assessment'
                                : 'Assessment'}
                            </button>
                          )}

                        {internship.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleComplete(internship.id)}
                            className="action-btn success"
                            disabled={!internship.completion_readiness?.can_mark_completed}
                            title={
                              internship.completion_readiness?.summary ||
                              'Review completion readiness'
                            }
                          >
                            <CheckCircle size={15} />
                            Complete
                          </button>
                        )}

                        <Link
                          to="/employer/supervisor/incidents"
                          className="action-btn danger-soft"
                        >
                          <AlertTriangle size={15} />
                          Report
                        </Link>
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
                icon={<Users size={38} />}
                title="No interns assigned"
                message="Assigned students will appear here once an internship placement is linked to your supervisor account."
              />
            )}
          </div>
        </div>

        <Modal
          show={!!assessmentApplication}
          onHide={() => setAssessmentApplication(null)}
          centered
          className="assessment-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title className="h5 fw-bold">
              Employer Final Assessment
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="assessment-user-card mb-4">
              <div className="student-avatar">
                {assessmentApplication?.student_info?.name?.charAt(0) || 'S'}
              </div>

              <div>
                <strong>
                  {assessmentApplication?.student_info?.name || 'Assigned intern'}
                </strong>
                <span>{assessmentApplication?.title}</span>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Rating</Form.Label>
              <Form.Select
                value={finalRating}
                onChange={(event) => setFinalRating(Number(event.target.value))}
                disabled={submittingAssessment}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 5
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label className="small fw-semibold">
                Workplace assessment
              </Form.Label>

              <Form.Control
                as="textarea"
                rows={5}
                value={finalFeedback}
                onChange={(event) => setFinalFeedback(event.target.value)}
                placeholder="Summarize reliability, skill growth, workplace conduct, attendance, and readiness for completion."
                disabled={submittingAssessment}
              />
            </Form.Group>

            {assessmentApplication?.completion_readiness?.missing?.length ? (
              <Alert variant="warning" className="small mt-3 mb-0">
                Completion still needs:{' '}
                {assessmentApplication.completion_readiness.missing.join(', ')}
              </Alert>
            ) : null}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="light"
              onClick={() => setAssessmentApplication(null)}
              disabled={submittingAssessment}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleSubmitFinalAssessment}
              disabled={submittingAssessment || !finalFeedback.trim()}
            >
              {submittingAssessment ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : null}
              Save Assessment
            </Button>
          </Modal.Footer>
        </Modal>

        <FeedbackModal {...feedbackProps} />

        <style>{`
          .internship-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 32rem),
              linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%);
            color: #0f172a;
          }

          .internship-hero,
          .workspace-card {
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.045);
          }

          .internship-hero {
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

          .hero-badge {
            align-self: flex-start;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.7rem 0.95rem;
            border-radius: 999px;
            color: #047857;
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
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

          .internship-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            padding: 1.1rem;
          }

          .internship-card {
            position: relative;
            padding: 1rem;
            border-radius: 22px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.07);
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04);
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
            overflow: hidden;
          }

          .internship-card::before {
            content: '';
            position: absolute;
            inset: 0 auto 0 0;
            width: 4px;
            background: #94a3b8;
          }

          .internship-card.success::before {
            background: #10b981;
          }

          .internship-card.info::before {
            background: #0ea5e9;
          }

          .internship-card.danger::before {
            background: #ef4444;
          }

          .internship-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 22px 42px rgba(15, 23, 42, 0.075);
            border-color: rgba(37, 99, 235, 0.16);
          }

          .internship-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
          }

          .student-block {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            min-width: 0;
          }

          .student-avatar {
            width: 44px;
            height: 44px;
            border-radius: 16px;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #2563eb;
            background: #eff6ff;
            border: 1px solid rgba(37, 99, 235, 0.12);
            font-weight: 850;
          }

          .student-block h6 {
            margin: 0 0 0.28rem;
            color: #0f172a;
            font-size: 0.98rem;
            font-weight: 850;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .student-email {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            color: #64748b;
            font-size: 0.78rem;
            min-width: 0;
          }

          .student-email span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.42rem 0.65rem;
            border-radius: 999px;
            font-size: 0.7rem;
            font-weight: 850;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .status-pill.success {
            color: #047857;
            background: #ecfdf5;
          }

          .status-pill.info {
            color: #0369a1;
            background: #e0f2fe;
          }

          .status-pill.danger {
            color: #b91c1c;
            background: #fef2f2;
          }

          .status-pill.muted {
            color: #475569;
            background: #f1f5f9;
          }

          .internship-title-block {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 1rem;
            padding: 0.9rem;
            border-radius: 18px;
            background: #f8fafc;
          }

          .icon-box {
            width: 38px;
            height: 38px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #2563eb;
            background: #eff6ff;
          }

          .internship-title-block span,
          .meta-box span {
            display: block;
            color: #64748b;
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .internship-title-block strong,
          .meta-box strong {
            display: block;
            margin-top: 0.18rem;
            color: #0f172a;
            font-size: 0.87rem;
            font-weight: 850;
            line-height: 1.35;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            margin-top: 0.85rem;
          }

          .meta-box {
            display: flex;
            gap: 0.55rem;
            padding: 0.8rem;
            border-radius: 17px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            color: #64748b;
          }

          .readiness-panel {
            margin-top: 0.9rem;
            padding: 0.9rem;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .readiness-label {
            color: #334155;
            font-size: 0.82rem;
            font-weight: 850;
          }

          .ready-text,
          .pending-text {
            font-size: 0.76rem;
            font-weight: 850;
          }

          .ready-text {
            color: #047857;
          }

          .pending-text {
            color: #b45309;
          }

          .readiness-bar {
            height: 8px;
            border-radius: 999px;
            overflow: hidden;
            background: #e2e8f0;
          }

          .readiness-bar div {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #2563eb, #10b981);
            transition: width 0.25s ease;
          }

          .missing-list {
            margin-top: 0.65rem;
            color: #92400e;
            font-size: 0.78rem;
            line-height: 1.45;
          }

          .missing-list.positive {
            color: #047857;
          }

          .card-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.55rem;
            margin-top: 1rem;
          }

          .action-btn {
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
            transition: transform 0.18s ease, background 0.18s ease, opacity 0.18s ease;
          }

          .action-btn:hover {
            transform: translateY(-1px);
          }

          .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }

          .action-btn.secondary {
            color: #334155;
            background: #f1f5f9;
          }

          .action-btn.primary-soft {
            color: #1d4ed8;
            background: #eff6ff;
          }

          .action-btn.success {
            color: #ffffff;
            background: #059669;
            box-shadow: 0 10px 20px rgba(5, 150, 105, 0.16);
          }

          .action-btn.danger-soft {
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
            color: #64748b;
            background: #f1f5f9;
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

          .assessment-user-card {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0.9rem;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .assessment-user-card strong {
            display: block;
            color: #0f172a;
            font-size: 0.95rem;
            font-weight: 850;
          }

          .assessment-user-card span {
            display: block;
            color: #64748b;
            font-size: 0.8rem;
            margin-top: 0.15rem;
          }

          .assessment-modal .modal-content {
            border: 0;
            border-radius: 24px;
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
          }

          .assessment-modal .modal-header,
          .assessment-modal .modal-footer {
            border-color: rgba(15, 23, 42, 0.06);
          }

          .assessment-modal .form-control,
          .assessment-modal .form-select {
            border-radius: 14px;
            border-color: rgba(15, 23, 42, 0.1);
            font-size: 0.9rem;
          }

          .min-w-0 {
            min-width: 0;
          }

          @media (max-width: 1199.98px) {
            .summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .internship-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 767.98px) {
            .internship-hero {
              padding: 1.1rem;
              border-radius: 20px;
            }

            .summary-grid,
            .meta-grid {
              grid-template-columns: 1fr;
            }

            .workspace-header {
              flex-direction: column;
            }

            .internship-card-top {
              flex-direction: column;
            }

            .card-actions {
              flex-direction: column;
            }

            .action-btn {
              width: 100%;
            }
          }
        `}</style>
      </SupervisorWorkspacePage>
    </SupervisorLayout>
  );
};

export default SupervisorInternships;
