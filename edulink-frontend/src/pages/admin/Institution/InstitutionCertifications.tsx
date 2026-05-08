import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  Row,
  Col,
  Modal,
  Alert,
  Nav,
} from 'react-bootstrap';
import {
  Search,
  FileText,
  CheckCircle,
  Award,
  User,
  AlertTriangle,
  Star,
  ClipboardCheck,
  Calendar,
  Briefcase,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';
import InternshipLifecyclePanel from '../../../components/internship/InternshipLifecyclePanel';
import toast from 'react-hot-toast';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

const InstitutionCertifications: React.FC = () => {
  const { feedbackProps } = useFeedbackModal();

  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'certified'>('pending');

  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [finalRating, setFinalRating] = useState(5);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const apps = await internshipService.getCertificationApplications();
      setApplications(apps);
    } catch (err) {
      console.error('Failed to fetch applications', err);
      toast.error('Failed to load certifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCertify = async () => {
    if (!selectedApp) return;

    try {
      setProcessing(true);
      await internshipService.processApplication(selectedApp.id, 'CERTIFY');
      toast.success('Certification issued successfully');
      setShowReviewModal(false);
      fetchApplications();
    } catch (error) {
      console.error('Failed to certify:', error);
      toast.error('Failed to issue certification');
    } finally {
      setProcessing(false);
    }
  };

  const openReviewModal = (app: InternshipApplication) => {
    setSelectedApp(app);
    setFinalFeedback(app.institution_final_feedback || '');
    setFinalRating(app.institution_final_rating || 5);
    setShowReviewModal(true);
  };

  const handleSaveFinalAssessment = async () => {
    if (!selectedApp || !finalFeedback.trim()) {
      toast.error('Add the institution final assessment before saving');
      return;
    }

    try {
      setProcessing(true);

      const updated = await internshipService.submitFinalFeedback(
        selectedApp.id,
        finalFeedback.trim(),
        finalRating
      );

      setSelectedApp(updated);
      toast.success('Institution assessment saved');
      fetchApplications();
    } catch (error) {
      console.error('Failed to save final assessment:', error);
      toast.error('Failed to save final assessment');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'cert-status-pending';
      case 'CERTIFIED':
        return 'cert-status-certified';
      default:
        return 'cert-status-default';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'COMPLETED') return 'Pending Certification';
    if (status === 'CERTIFIED') return 'Certified';
    return status;
  };

  const filteredApplications = applications.filter(app => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      (app.student_info?.name?.toLowerCase() || '').includes(search) ||
      (app.student_info?.email?.toLowerCase() || '').includes(search) ||
      app.title.toLowerCase().includes(search);

    const matchesTab =
      activeTab === 'pending'
        ? app.status === 'COMPLETED'
        : app.status === 'CERTIFIED';

    return matchesSearch && matchesTab;
  });

  const pendingCount = applications.filter(a => a.status === 'COMPLETED').length;
  const certifiedCount = applications.filter(a => a.status === 'CERTIFIED').length;
  const assessmentPendingCount = applications.filter(
    a => a.status === 'COMPLETED' && !a.institution_final_feedback
  ).length;

  if (loading) {
    return <InstitutionTableSkeleton tableColumns={5} />;
  }

  return (
    <InstitutionWorkspacePage className="institution-certifications-page">
      <style>{`
        .cert-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .cert-eyebrow {
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

        .cert-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .cert-subtitle {
          color: #64748b;
          max-width: 780px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .cert-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
          height: 100%;
        }

        .cert-stat-icon {
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

        .cert-stat-label {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 8px;
        }

        .cert-stat-value {
          font-size: 1.9rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          line-height: 1;
          margin-bottom: 6px;
        }

        .cert-stat-sub {
          color: #64748b;
          font-size: 0.86rem;
          margin-bottom: 0;
        }

        .cert-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .cert-card-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .cert-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 730;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .cert-card-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .cert-tabs {
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 16px;
          padding: 5px;
          display: inline-flex;
          gap: 4px;
        }

        .cert-tabs .nav-link {
          color: #64748b;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.86rem;
          padding: 9px 14px;
        }

        .cert-tabs .nav-link.active {
          background: #111827;
          color: #ffffff;
        }

        .cert-input {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .cert-input:focus {
          border-color: #111827 !important;
        }

        .cert-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 600px;
        }

        .cert-table {
          width: 100%;
          min-width: 1080px;
          table-layout: fixed;
          margin-bottom: 0;
        }

        .cert-table thead th {
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

        .cert-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .cert-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .candidate-col { width: 320px; }
        .details-col { width: 340px; }
        .status-col { width: 190px; }
        .date-col { width: 160px; }
        .actions-col { width: 170px; }

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

        .cert-primary-text {
          font-weight: 720;
          color: #111827;
          line-height: 1.3;
        }

        .cert-muted {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 5px;
        }

        .cert-pill {
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

        .cert-status-pending {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .cert-status-certified {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .cert-status-default {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
        }

        .cert-primary-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .cert-soft-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .cert-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 22px;
          padding: 52px 24px;
          text-align: center;
        }

        .cert-modal .modal-content {
          border: none;
          border-radius: 26px;
          overflow: hidden;
        }

        .cert-modal .modal-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .record-profile-card {
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 22px;
          padding: 20px;
        }

        .record-section {
          background: #ffffff;
          border: 1px solid #edf0f4;
          border-radius: 20px;
          padding: 20px;
        }

        .assessment-box {
          background: #fbfcfd;
          border: 1px solid #edf0f4;
          border-radius: 22px;
          padding: 20px;
        }

        .cert-modal .form-control,
        .cert-modal .form-select {
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .cert-modal .form-control:focus,
        .cert-modal .form-select:focus {
          border-color: #111827;
        }

        @media (max-width: 768px) {
          .cert-hero {
            padding: 22px;
          }

          .cert-card-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="cert-hero">
        <div>
          <div className="cert-eyebrow">
            <Award size={15} />
            Certification & Records
          </div>

          <h1 className="cert-title">
            Issue verified completion records for finished internships.
          </h1>

          <p className="cert-subtitle">
            Review completed attachments, save institution final assessments,
            verify evidence readiness, and issue official student certification records.
          </p>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col md={4}>
          <div className="cert-stat-card">
            <div className="cert-stat-icon">
              <ClipboardCheck size={22} />
            </div>
            <div className="cert-stat-label">Pending Certification</div>
            <div className="cert-stat-value">{pendingCount}</div>
            <p className="cert-stat-sub">Completed internships awaiting institution action</p>
          </div>
        </Col>

        <Col md={4}>
          <div className="cert-stat-card">
            <div className="cert-stat-icon">
              <Award size={22} />
            </div>
            <div className="cert-stat-label">Certified Records</div>
            <div className="cert-stat-value">{certifiedCount}</div>
            <p className="cert-stat-sub">Officially issued completion records</p>
          </div>
        </Col>

        <Col md={4}>
          <div className="cert-stat-card">
            <div className="cert-stat-icon">
              <Star size={22} />
            </div>
            <div className="cert-stat-label">Assessment Required</div>
            <div className="cert-stat-value">{assessmentPendingCount}</div>
            <p className="cert-stat-sub">Require final institution evaluation</p>
          </div>
        </Col>
      </Row>

      <div className="cert-card">
        <div className="cert-card-header">
          <div>
            <div className="cert-card-title">
              <ShieldCheck size={18} />
              Certification Queue
            </div>
            <p className="cert-card-subtitle">
              Move completed internships into official, verifiable institutional records.
            </p>
          </div>
        </div>

        <div className="p-4 border-bottom">
          <Row className="g-3 align-items-center">
            <Col lg={6}>
              <Nav className="cert-tabs">
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === 'pending'}
                    onClick={() => setActiveTab('pending')}
                  >
                    Pending Action
                    <span className="ms-2">
                      {pendingCount}
                    </span>
                  </Nav.Link>
                </Nav.Item>

                <Nav.Item>
                  <Nav.Link
                    active={activeTab === 'certified'}
                    onClick={() => setActiveTab('certified')}
                  >
                    Certified History
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>

            <Col lg={6}>
              <div className="position-relative">
                <Search
                  size={16}
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                />

                <Form.Control
                  placeholder="Search student, email, or position"
                  className="cert-input ps-5"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </Col>
          </Row>
        </div>

        <div className="cert-table-wrap">
          <table className="table cert-table align-middle">
            <thead>
              <tr>
                <th className="candidate-col">Candidate</th>
                <th className="details-col">Internship Details</th>
                <th className="status-col">Status</th>
                <th className="date-col">Completion Date</th>
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

                    <td className="details-col">
                      <div className="cert-primary-text">
                        {app.title}
                      </div>

                      <div className="cert-muted d-flex align-items-center gap-1">
                        <Briefcase size={13} />
                        {app.department || 'No department'} • {app.employer_details?.name || 'Unknown Employer'}
                      </div>
                    </td>

                    <td className="status-col">
                      <span className={`cert-pill ${getStatusClass(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>

                    <td className="date-col">
                      <span className="cert-pill">
                        <Calendar size={13} />
                        {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : '-'}
                      </span>
                    </td>

                    <td className="actions-col text-end">
                      {app.status === 'COMPLETED' ? (
                        <Button
                          className="cert-primary-btn d-inline-flex align-items-center gap-2"
                          onClick={() => openReviewModal(app)}
                        >
                          <Award size={14} />
                          Issue
                        </Button>
                      ) : (
                        <Button
                          className="cert-soft-btn d-inline-flex align-items-center gap-2"
                          onClick={() => openReviewModal(app)}
                        >
                          <FileText size={14} />
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="cert-empty-state">
                      <Award size={48} className="text-muted mb-3" />
                      <h5 className="fw-semibold mb-2">No records found</h5>
                      <p className="text-muted mb-0">
                        No certification records match this category or search.
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
        onHide={() => setShowReviewModal(false)}
        size="lg"
        centered
        dialogClassName="cert-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedApp?.status === 'COMPLETED'
              ? 'Issue Certification'
              : 'Internship Record'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {selectedApp && (
            <div>
              <div className="record-profile-card mb-4">
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
                  <div className="record-section h-100">
                    <h6 className="text-uppercase text-muted small fw-bold mb-3">
                      Engagement Details
                    </h6>

                    <p className="mb-2"><strong>Title:</strong> {selectedApp.title}</p>
                    <p className="mb-2"><strong>Employer:</strong> {selectedApp.employer_details?.name || '-'}</p>
                    <p className="mb-2"><strong>Department:</strong> {selectedApp.department || '-'}</p>
                    <p className="mb-0">
                      <strong>Period:</strong>{' '}
                      {selectedApp.start_date ? new Date(selectedApp.start_date).toLocaleDateString() : 'N/A'}
                      {' — '}
                      {selectedApp.end_date ? new Date(selectedApp.end_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="record-section h-100">
                    <h6 className="text-uppercase text-muted small fw-bold mb-3">
                      Academic Status
                    </h6>

                    <p className="mb-2"><strong>Logbooks:</strong> {selectedApp.logbook_count || 0} submitted</p>
                    <p className="mb-2">
                      <strong>Employer Assessment:</strong>{' '}
                      {selectedApp.employer_final_feedback
                        ? `${selectedApp.employer_final_rating || '-'} / 5`
                        : 'Pending'}
                    </p>
                    <p className="mb-2">
                      <strong>Institution Assessment:</strong>{' '}
                      {selectedApp.institution_final_feedback
                        ? `${selectedApp.institution_final_rating || '-'} / 5`
                        : 'Pending'}
                    </p>
                    <p className="mb-0">
                      <strong>Current Status:</strong>{' '}
                      <span className={`cert-pill ${getStatusClass(selectedApp.status)}`}>
                        {getStatusLabel(selectedApp.status)}
                      </span>
                    </p>
                  </div>
                </Col>
              </Row>

              {selectedApp.can_feedback && selectedApp.status !== 'CERTIFIED' && (
                <div className="assessment-box mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="text-uppercase text-muted small fw-bold mb-0 d-flex align-items-center gap-2">
                      <Star size={14} />
                      Institution Final Assessment
                    </h6>

                    <span
                      className={`cert-pill ${
                        selectedApp.institution_final_feedback
                          ? 'cert-status-certified'
                          : 'cert-status-pending'
                      }`}
                    >
                      {selectedApp.institution_final_feedback ? 'Saved' : 'Required'}
                    </span>
                  </div>

                  <Row className="g-3">
                    <Col md={3}>
                      <Form.Label className="small fw-semibold">Rating</Form.Label>
                      <Form.Select
                        value={finalRating}
                        onChange={event => setFinalRating(Number(event.target.value))}
                        disabled={processing}
                      >
                        {[5, 4, 3, 2, 1].map(rating => (
                          <option key={rating} value={rating}>
                            {rating} / 5
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    <Col md={9}>
                      <Form.Label className="small fw-semibold">
                        Academic assessment
                      </Form.Label>

                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={finalFeedback}
                        onChange={event => setFinalFeedback(event.target.value)}
                        placeholder="Summarize logbook compliance, supervision outcome, conduct, and certification readiness."
                        disabled={processing}
                      />
                    </Col>
                  </Row>

                  <Button
                    className="cert-soft-btn mt-3 d-inline-flex align-items-center gap-2"
                    onClick={handleSaveFinalAssessment}
                    disabled={processing || !finalFeedback.trim()}
                  >
                    <Star size={16} />
                    Save Assessment
                  </Button>
                </div>
              )}

              <div className="mb-4">
                <InternshipLifecyclePanel
                  application={selectedApp}
                  roleView="institution"
                  compact
                />
              </div>

              {selectedApp.status === 'COMPLETED' && (
                <div className="record-section">
                  <Alert variant="warning" className="mb-3 small d-flex align-items-center rounded-4">
                    <AlertTriangle size={16} className="me-2 flex-shrink-0" />
                    <div>
                      <strong>Action Required:</strong> Verify logbooks, final assessment,
                      and academic requirements before issuing the certificate.
                    </div>
                  </Alert>

                  <Button
                    className="cert-primary-btn w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleCertify}
                    disabled={processing}
                  >
                    {processing ? (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      />
                    ) : (
                      <>
                        <Award size={20} />
                        Issue Official Certification
                      </>
                    )}
                  </Button>
                </div>
              )}

              {selectedApp.status === 'CERTIFIED' && (
                <Alert variant="success" className="mb-0 small d-flex align-items-center rounded-4">
                  <CheckCircle size={16} className="me-2" />
                  This internship has been officially certified. The student can download their certificate from their dashboard.
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      <FeedbackModal {...feedbackProps} />
    </InstitutionWorkspacePage>
  );
};

export default InstitutionCertifications;
