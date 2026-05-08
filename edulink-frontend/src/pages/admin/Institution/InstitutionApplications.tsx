import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  Row,
  Col,
  Modal,
} from 'react-bootstrap';
import {
  Search,
  FileText,
  CheckCircle,
  XCircle,
  User,
  ClipboardCheck,
  Briefcase,
  Calendar,
  Filter,
  Mail,
} from 'lucide-react';

import { internshipService } from '../../../services/internship/internshipService';
import { institutionService } from '../../../services/institution/institutionService';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { showToast } from '../../../utils/toast';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

const InstitutionApplications: React.FC = () => {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useErrorHandler({});

  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);

      const [institution, apps] = await Promise.all([
        institutionService.getProfile(),
        internshipService.getApplications({
          is_institutional: true,
        }),
      ]);

      const currentInstitutionId = institution?.id || null;

      setApplications(
        apps.filter(app =>
          !app.employer_id &&
          (!currentInstitutionId || app.institution_id === currentInstitutionId)
        )
      );
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      showToast.error(sanitized.message || sanitized.userMessage || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApplication = async (
    action: 'SHORTLIST' | 'REJECT' | 'ACCEPT' | 'START' | 'CERTIFY'
  ) => {
    if (!selectedApp) return;

    try {
      setProcessing(true);

      await internshipService.processApplication(
        selectedApp.id,
        action,
        action === 'REJECT' ? rejectionReason : undefined
      );

      showToast.success('Application processed successfully');
      setShowReviewModal(false);
      setRejectionReason('');
      fetchApplications();
    } catch (error) {
      showToast.error('An error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const openReviewModal = (app: InternshipApplication) => {
    setSelectedApp(app);
    setRejectionReason('');
    setShowRejectionForm(false);
    setShowReviewModal(true);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return 'applications-status-pending';
      case 'SHORTLISTED':
        return 'applications-status-shortlisted';
      case 'ACCEPTED':
        return 'applications-status-accepted';
      case 'ACTIVE':
        return 'applications-status-active';
      case 'REJECTED':
        return 'applications-status-rejected';
      case 'COMPLETED':
      case 'CERTIFIED':
        return 'applications-status-completed';
      default:
        return 'applications-status-default';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'APPLIED') return 'Pending';
    return status.replace('_', ' ');
  };

  const filteredApplications = applications.filter(app => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (app.student_info?.name?.toLowerCase() || '').includes(search) ||
      (app.student_info?.email?.toLowerCase() || '').includes(search) ||
      app.title.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === 'ALL'
        ? !['COMPLETED', 'CERTIFIED'].includes(app.status)
        : app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = applications.filter(app => app.status === 'APPLIED').length;
  const shortlistedCount = applications.filter(app => app.status === 'SHORTLISTED').length;
  const acceptedCount = applications.filter(app =>
    ['ACCEPTED', 'ACTIVE'].includes(app.status)
  ).length;

  if (loading) {
    return <InstitutionTableSkeleton tableColumns={5} />;
  }

  return (
    <InstitutionWorkspacePage className="institution-applications-page">
      <style>{`
        .applications-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .applications-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #f4f6f8;
          border: 1px solid #e6e9ee;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 18px;
        }

        .applications-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .applications-subtitle {
          color: #64748b;
          max-width: 760px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .applications-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
          height: 100%;
        }

        .applications-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .applications-stat-label {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 8px;
        }

        .applications-stat-value {
          font-size: 1.9rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          line-height: 1;
          margin-bottom: 6px;
        }

        .applications-stat-sub {
          color: #64748b;
          font-size: 0.86rem;
          margin-bottom: 0;
        }

        .applications-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .applications-card-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .applications-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 730;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .applications-card-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .applications-input,
        .applications-select {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .applications-input:focus,
        .applications-select:focus {
          border-color: #111827 !important;
        }

        .applications-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 600px;
        }

        .applications-table {
          width: 100%;
          min-width: 1050px;
          table-layout: fixed;
          margin-bottom: 0;
        }

        .applications-table thead th {
          position: sticky;
          top: 0;
          z-index: 3;
          border: none !important;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          padding: 16px 18px;
          white-space: nowrap;
        }

        .applications-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .applications-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .candidate-col {
          width: 330px;
        }

        .position-col {
          width: 300px;
        }

        .status-col {
          width: 160px;
        }

        .date-col {
          width: 160px;
        }

        .actions-col {
          width: 140px;
        }

        .candidate-avatar {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          background: #111827;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 750;
          flex-shrink: 0;
        }

        .candidate-name {
          font-weight: 720;
          color: #111827;
          line-height: 1.25;
        }

        .candidate-email {
          color: #64748b;
          font-size: 0.78rem;
          margin-top: 4px;
          word-break: break-word;
        }

        .application-title {
          font-weight: 700;
          color: #111827;
        }

        .application-muted {
          color: #64748b;
          font-size: 0.78rem;
          margin-top: 4px;
        }

        .applications-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .applications-status-pending {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .applications-status-shortlisted {
          background: #eff6ff;
          border-color: #dbeafe;
          color: #1d4ed8;
        }

        .applications-status-accepted {
          background: #eef2ff;
          border-color: #e0e7ff;
          color: #3730a3;
        }

        .applications-status-active {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .applications-status-rejected {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #991b1b;
        }

        .applications-status-completed {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }

        .applications-status-default {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
        }

        .applications-primary-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .applications-soft-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .applications-danger-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #fee2e2 !important;
          color: #dc2626 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .applications-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 22px;
          padding: 52px 24px;
          text-align: center;
        }

        .applications-modal .modal-content {
          border: none;
          border-radius: 26px;
          overflow: hidden;
        }

        .applications-modal .modal-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .applications-modal .form-control {
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .applications-modal .form-control:focus {
          border-color: #111827;
        }

        .review-profile-card {
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 22px;
          padding: 20px;
        }

        .review-section {
          background: #ffffff;
          border: 1px solid #edf0f4;
          border-radius: 20px;
          padding: 20px;
        }

        .skill-chip {
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .applications-hero {
            padding: 22px;
          }

          .applications-card-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="applications-hero">
        <div>
          <div className="applications-eyebrow">
            <ClipboardCheck size={15} />
            Application Review
          </div>

          <h1 className="applications-title">
            Review candidates for institution-hosted internships.
          </h1>

          <p className="applications-subtitle">
            Track student applications, shortlist qualified candidates, accept placements,
            reject unsuitable submissions, and move approved students into active internships.
          </p>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col md={4}>
          <div className="applications-stat-card">
            <div className="applications-stat-icon">
              <FileText size={22} />
            </div>
            <div className="applications-stat-label">Total Applications</div>
            <div className="applications-stat-value">{applications.length}</div>
            <p className="applications-stat-sub">Institution-hosted opportunities</p>
          </div>
        </Col>

        <Col md={4}>
          <div className="applications-stat-card">
            <div className="applications-stat-icon">
              <ClockIcon />
            </div>
            <div className="applications-stat-label">Pending Review</div>
            <div className="applications-stat-value">{pendingCount}</div>
            <p className="applications-stat-sub">Awaiting first decision</p>
          </div>
        </Col>

        <Col md={4}>
          <div className="applications-stat-card">
            <div className="applications-stat-icon">
              <CheckCircle size={22} />
            </div>
            <div className="applications-stat-label">Accepted / Active</div>
            <div className="applications-stat-value">{acceptedCount}</div>
            <p className="applications-stat-sub">Approved placement pipeline</p>
          </div>
        </Col>
      </Row>

      <div className="applications-card">
        <div className="applications-card-header">
          <div>
            <div className="applications-card-title">
              <Briefcase size={18} />
              Application Queue
            </div>
            <p className="applications-card-subtitle">
              Review candidates and progress them through the placement decision workflow.
            </p>
          </div>

          <span className="applications-pill">
            {shortlistedCount} Shortlisted
          </span>
        </div>

        <div className="p-4 border-bottom">
          <Row className="g-3">
            <Col lg={7}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Search Applications
                </Form.Label>

                <div className="position-relative">
                  <Search
                    size={16}
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  />

                  <Form.Control
                    placeholder="Search applicant, email, or position"
                    className="applications-input ps-5"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>

            <Col lg={5}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Status Filter
                </Form.Label>

                <div className="position-relative">
                  <Filter
                    size={16}
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  />

                  <Form.Select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="applications-select ps-5"
                  >
                    <option value="ALL">All Active Statuses</option>
                    <option value="APPLIED">Pending</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="ACTIVE">Active</option>
                    <option value="REJECTED">Rejected</option>
                  </Form.Select>
                </div>
              </Form.Group>
            </Col>
          </Row>
        </div>

        <div className="applications-table-wrap">
          <table className="table applications-table align-middle">
            <thead>
              <tr>
                <th className="candidate-col">Candidate</th>
                <th className="position-col">Position</th>
                <th className="status-col">Status</th>
                <th className="date-col">Applied Date</th>
                <th className="actions-col text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredApplications.length > 0 ? (
                filteredApplications.map(app => (
                  <tr key={app.id}>
                    <td className="candidate-col">
                      <div className="d-flex align-items-center gap-3">
                        <div className="candidate-avatar">
                          {app.student_info?.name?.charAt(0) || <User size={18} />}
                        </div>

                        <div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="candidate-name">
                              {app.student_info?.name || 'Unknown Student'}
                            </span>

                            <TrustBadge
                              level={(app.student_info?.trust_level as TrustLevel) || 0}
                              entityType="student"
                              size="sm"
                              showLabel={false}
                            />
                          </div>

                          <div className="candidate-email d-flex align-items-center gap-1">
                            <Mail size={13} />
                            {app.student_info?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="position-col">
                      <div className="application-title">
                        {app.title}
                      </div>
                      <div className="application-muted">
                        {app.department || 'No department'}
                      </div>
                    </td>

                    <td className="status-col">
                      <span className={`applications-pill ${getStatusClass(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>

                    <td className="date-col">
                      <span className="applications-pill">
                        <Calendar size={13} />
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                      </span>
                    </td>

                    <td className="actions-col text-end">
                      <Button
                        className="applications-soft-btn"
                        onClick={() => openReviewModal(app)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="applications-empty-state">
                      <FileText size={48} className="text-muted mb-3" />
                      <h5 className="fw-semibold mb-2">No applications found</h5>
                      <p className="text-muted mb-0">
                        No applications match your current search or status filter.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        show={showReviewModal}
        onHide={() => {
          setShowReviewModal(false);
          setShowRejectionForm(false);
        }}
        size="lg"
        centered
        dialogClassName="applications-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Review Application</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {selectedApp && (
            <div>
              <div className="review-profile-card mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="candidate-avatar" style={{ width: 58, height: 58 }}>
                    {selectedApp.student_info?.name?.charAt(0) || 'U'}
                  </div>

                  <div>
                    <h5 className="mb-1 fw-bold">
                      {selectedApp.student_info?.name || 'Unknown Student'}
                    </h5>

                    <div className="d-flex align-items-center gap-2 flex-wrap text-muted">
                      <small>{selectedApp.student_info?.email}</small>
                      <span>•</span>
                      <TrustBadge
                        level={(selectedApp.student_info?.trust_level as TrustLevel) || 0}
                        entityType="student"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Row className="g-4 mb-4">
                <Col md={6}>
                  <div className="review-section h-100">
                    <h6 className="text-uppercase text-muted small fw-bold mb-3">
                      Position Details
                    </h6>

                    <p className="mb-2">
                      <strong>Title:</strong> {selectedApp.title}
                    </p>

                    <p className="mb-2">
                      <strong>Department:</strong> {selectedApp.department || '-'}
                    </p>

                    <p className="mb-0">
                      <strong>Status:</strong>{' '}
                      <span className={`applications-pill ${getStatusClass(selectedApp.status)}`}>
                        {getStatusLabel(selectedApp.status)}
                      </span>
                    </p>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="review-section h-100">
                    <h6 className="text-uppercase text-muted small fw-bold mb-3">
                      Skills Match
                    </h6>

                    <div className="d-flex flex-wrap gap-2">
                      {selectedApp.skills?.length ? (
                        selectedApp.skills.map((skill, idx) => (
                          <span key={idx} className="skill-chip">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">
                          No skills listed
                        </span>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>

              {selectedApp.status === 'APPLIED' && (
                <DecisionPanel
                  title="Take Action"
                  processing={processing}
                  showRejectionForm={showRejectionForm}
                  rejectionReason={rejectionReason}
                  setRejectionReason={setRejectionReason}
                  setShowRejectionForm={setShowRejectionForm}
                  onReject={() => handleProcessApplication('REJECT')}
                  onPositive={() => handleProcessApplication('SHORTLIST')}
                  positiveLabel="Shortlist"
                  rejectPlaceholder="e.g. Skills did not match the role requirements"
                />
              )}

              {selectedApp.status === 'SHORTLISTED' && (
                <DecisionPanel
                  title="Final Decision"
                  processing={processing}
                  showRejectionForm={showRejectionForm}
                  rejectionReason={rejectionReason}
                  setRejectionReason={setRejectionReason}
                  setShowRejectionForm={setShowRejectionForm}
                  onReject={() => handleProcessApplication('REJECT')}
                  onPositive={() => handleProcessApplication('ACCEPT')}
                  positiveLabel="Accept Candidate"
                  rejectPlaceholder="e.g. Position filled by another candidate"
                />
              )}

              {selectedApp.status === 'ACCEPTED' && (
                <div className="review-section">
                  <h6 className="mb-3 fw-bold">Start Internship</h6>

                  <Button
                    className="applications-primary-btn w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => handleProcessApplication('START')}
                    disabled={processing}
                  >
                    <CheckCircle size={18} />
                    Start Internship
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </InstitutionWorkspacePage>
  );
};

const DecisionPanel = ({
  title,
  processing,
  showRejectionForm,
  rejectionReason,
  setRejectionReason,
  setShowRejectionForm,
  onReject,
  onPositive,
  positiveLabel,
  rejectPlaceholder,
}: {
  title: string;
  processing: boolean;
  showRejectionForm: boolean;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  setShowRejectionForm: (value: boolean) => void;
  onReject: () => void;
  onPositive: () => void;
  positiveLabel: string;
  rejectPlaceholder: string;
}) => {
  if (showRejectionForm) {
    return (
      <div className="review-section">
        <h6 className="mb-3 fw-bold">Rejection Reason</h6>

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">
            Student-visible rejection message
          </Form.Label>

          <Form.Control
            as="textarea"
            rows={4}
            placeholder={rejectPlaceholder}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            disabled={processing}
          />

          <Form.Text className="text-muted">
            This message will be sent to the student dashboard.
          </Form.Text>
        </Form.Group>

        <div className="d-flex gap-3">
          <Button
            className="applications-soft-btn flex-grow-1"
            onClick={() => setShowRejectionForm(false)}
            disabled={processing}
          >
            Cancel
          </Button>

          <Button
            className="applications-danger-btn flex-grow-1"
            onClick={onReject}
            disabled={processing || !rejectionReason.trim()}
          >
            Confirm Rejection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-section">
      <h6 className="mb-3 fw-bold">{title}</h6>

      <div className="d-flex gap-3">
        <Button
          className="applications-danger-btn flex-grow-1 d-flex align-items-center justify-content-center gap-2"
          onClick={() => setShowRejectionForm(true)}
          disabled={processing}
        >
          <XCircle size={18} />
          Reject
        </Button>

        <Button
          className="applications-primary-btn flex-grow-1 d-flex align-items-center justify-content-center gap-2"
          onClick={onPositive}
          disabled={processing}
        >
          <CheckCircle size={18} />
          {positiveLabel}
        </Button>
      </div>
    </div>
  );
};

const ClockIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#111827"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default InstitutionApplications;
