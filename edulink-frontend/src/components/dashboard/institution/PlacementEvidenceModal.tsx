import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Form } from 'react-bootstrap';
import {
  FileText,
  ExternalLink,
  Award,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { FeedbackModal } from '../../common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipEvidence } from '../../../services/internship/internshipService';

interface Placement {
  id: string;
  title: string;
  student_info?: {
    name: string;
    email: string;
  };
  status: string;
}

interface PlacementEvidenceModalProps {
  show: boolean;
  onHide: () => void;
  placement: Placement;
}

const PlacementEvidenceModal: React.FC<PlacementEvidenceModalProps> = ({
  show,
  onHide,
  placement,
}) => {
  const [evidence, setEvidence] = useState<InternshipEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { feedbackProps, showError, showConfirm } = useFeedbackModal();

  useEffect(() => {
    if (show && placement.id) {
      fetchEvidence();
    }
  }, [show, placement.id]);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getEvidence(placement.id);
      setEvidence(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch evidence', err);
      setError('Failed to load evidence.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (
    evidenceId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED'
  ) => {
    try {
      setActionLoading(true);

      await internshipService.reviewEvidence(
        placement.id,
        evidenceId,
        status,
        reviewNotes
      );

      setEvidence(prev =>
        prev.map(e =>
          e.id === evidenceId
            ? {
                ...e,
                status,
                review_notes: reviewNotes,
                reviewed_at: new Date().toISOString(),
              }
            : e
        )
      );

      setReviewingId(null);
      setReviewNotes('');
    } catch (err: any) {
      showError(
        'Review Failed',
        'We could not submit your review.',
        err.response?.data?.error || err.message
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCertify = async () => {
    showConfirm({
      title: 'Certify Internship',
      message:
        'Are you sure you want to certify this internship? This will issue the certificate.',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await internshipService.certifyInternship(placement.id);
          onHide();
          window.location.reload();
        } catch (err: any) {
          showError(
            'Certification Failed',
            'An error occurred while trying to certify the internship.',
            err.response?.data?.error || err.message
          );
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'evidence-status-accepted';
      case 'REJECTED':
        return 'evidence-status-rejected';
      case 'REVISION_REQUIRED':
        return 'evidence-status-revision';
      case 'SUBMITTED':
        return 'evidence-status-submitted';
      default:
        return 'evidence-status-default';
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      dialogClassName="evidence-modal"
    >
      <style>{`
        .evidence-modal .modal-content {
          border: none;
          border-radius: 26px;
          overflow: hidden;
        }

        .evidence-modal .modal-header {
          padding: 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .evidence-modal .modal-body {
          padding: 24px;
        }

        .evidence-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 740;
          color: #111827;
          letter-spacing: -0.03em;
        }

        .evidence-student-card {
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 20px;
          padding: 18px;
          margin-bottom: 22px;
        }

        .evidence-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #eef2f6;
          border-radius: 20px;
          overflow: hidden;
        }

        .evidence-table {
          width: 100%;
          min-width: 760px;
          margin-bottom: 0;
          table-layout: fixed;
        }

        .evidence-table thead th {
          background: #f8fafc;
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          padding: 15px 18px;
          border: none;
        }

        .evidence-table tbody td {
          padding: 18px;
          border-top: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .evidence-title {
          font-weight: 720;
          color: #111827;
          line-height: 1.3;
        }

        .evidence-muted {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 4px;
        }

        .evidence-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #111827;
          font-size: 0.78rem;
          font-weight: 700;
          text-decoration: none;
          margin-top: 6px;
        }

        .evidence-link:hover {
          text-decoration: underline;
        }

        .evidence-pill {
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

        .evidence-status-accepted {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .evidence-status-rejected {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #991b1b;
        }

        .evidence-status-revision,
        .evidence-status-submitted {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .evidence-status-default {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
        }

        .evidence-primary-btn {
          min-height: 40px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: none !important;
        }

        .evidence-soft-btn {
          min-height: 40px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 700 !important;
          box-shadow: none !important;
        }

        .evidence-danger-btn {
          min-height: 40px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #fee2e2 !important;
          color: #dc2626 !important;
          font-weight: 700 !important;
          box-shadow: none !important;
        }

        .evidence-review-box {
          background: #fbfcfd;
          border-top: 1px solid #eef2f6;
          padding: 18px;
        }

        .evidence-review-box textarea {
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .evidence-empty-state {
          padding: 48px 24px;
          text-align: center;
          color: #64748b;
        }

        .cert-ready-card {
          margin-top: 22px;
          padding: 20px;
          border-radius: 20px;
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
        }

        @media (max-width: 768px) {
          .cert-ready-card {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <Modal.Header closeButton>
        <Modal.Title className="evidence-heading">
          <FileText size={20} />
          Evidence Review
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="evidence-student-card">
          <div className="small text-muted mb-1">Placement</div>
          <div className="fw-bold text-dark">{placement.title}</div>

          <div className="small text-muted mt-2">Student</div>
          <div className="fw-semibold text-dark">
            {placement.student_info?.name || 'Unknown Student'}
          </div>
          <div className="text-muted small">{placement.student_info?.email}</div>
        </div>

        {error && <Alert variant="danger" className="rounded-4">{error}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="text-muted mt-3 mb-0">Loading evidence...</p>
          </div>
        ) : (
          <>
            <div className="evidence-table-wrap">
              <table className="table evidence-table align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 280 }}>Title / Type</th>
                    <th style={{ width: 130 }}>Date</th>
                    <th style={{ width: 160 }}>Status</th>
                    <th style={{ width: 130 }} className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {evidence.length > 0 ? (
                    evidence.map(item => (
                      <React.Fragment key={item.id}>
                        <tr>
                          <td>
                            <div className="evidence-title">{item.title}</div>
                            <div className="evidence-muted">{item.evidence_type}</div>

                            {item.file && (
                              <a
                                href={item.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="evidence-link"
                              >
                                View file
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </td>

                          <td>
                            <span className="evidence-muted">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          <td>
                            <span className={`evidence-pill ${getStatusClass(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="text-end">
                            {item.status === 'SUBMITTED' && reviewingId !== item.id && (
                              <Button
                                className="evidence-soft-btn"
                                size="sm"
                                onClick={() => setReviewingId(item.id)}
                              >
                                Review
                              </Button>
                            )}
                          </td>
                        </tr>

                        {reviewingId === item.id && (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <div className="evidence-review-box">
                                <Form.Group className="mb-3">
                                  <Form.Label className="small fw-bold">
                                    Review Notes
                                  </Form.Label>

                                  <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={reviewNotes}
                                    onChange={e => setReviewNotes(e.target.value)}
                                    placeholder="Enter feedback for the student..."
                                  />
                                </Form.Group>

                                <div className="d-flex justify-content-end gap-2 flex-wrap">
                                  <Button
                                    className="evidence-soft-btn"
                                    onClick={() => {
                                      setReviewingId(null);
                                      setReviewNotes('');
                                    }}
                                    disabled={actionLoading}
                                  >
                                    Cancel
                                  </Button>

                                  <Button
                                    className="evidence-soft-btn"
                                    onClick={() => handleReview(item.id, 'REVISION_REQUIRED')}
                                    disabled={actionLoading || !reviewNotes.trim()}
                                  >
                                    <RefreshCw size={15} />
                                    Revision
                                  </Button>

                                  <Button
                                    className="evidence-danger-btn"
                                    onClick={() => handleReview(item.id, 'REJECTED')}
                                    disabled={actionLoading}
                                  >
                                    <XCircle size={15} />
                                    Reject
                                  </Button>

                                  <Button
                                    className="evidence-primary-btn"
                                    onClick={() => handleReview(item.id, 'ACCEPTED')}
                                    disabled={actionLoading}
                                  >
                                    <CheckCircle size={15} />
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        <div className="evidence-empty-state">
                          <FileText size={42} className="mb-3" />
                          <div className="fw-semibold text-dark mb-1">
                            No evidence submitted
                          </div>
                          <p className="mb-0">
                            Evidence will appear here once the student submits logbooks or files.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {placement.status === 'COMPLETED' && (
              <div className="cert-ready-card">
                <div>
                  <div className="fw-bold text-success mb-1">
                    Certification Ready
                  </div>
                  <p className="small text-success mb-0">
                    This internship is completed and can now be certified.
                  </p>
                </div>

                <Button
                  className="evidence-primary-btn d-flex align-items-center gap-2"
                  onClick={handleCertify}
                  disabled={actionLoading}
                >
                  <Award size={18} />
                  Certify Internship
                </Button>
              </div>
            )}
          </>
        )}

        <FeedbackModal {...feedbackProps} />
      </Modal.Body>
    </Modal>
  );
};

export default PlacementEvidenceModal;