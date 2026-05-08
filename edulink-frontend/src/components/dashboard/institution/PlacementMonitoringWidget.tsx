import React, { useEffect, useState } from 'react';
import { Button, Modal, Form, InputGroup } from 'react-bootstrap';
import {
  AlertTriangle,
  Flag,
  FileText,
  Search,
  RefreshCw,
  Users,
  Activity,
  Building2,
} from 'lucide-react';
import { FeedbackModal } from '../../common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { institutionService } from '../../../services/institution/institutionService';
import { internshipService } from '../../../services/internship/internshipService';
import PlacementEvidenceModal from './PlacementEvidenceModal';
import TrustBadge, { type TrustLevel } from '../../common/TrustBadge';

interface Placement {
  id: string;
  title: string;
  student_info?: {
    name: string;
    email: string;
    trust_level?: number;
  };
  employer_id: string;
  employer_name: string;
  status: string;
  department: string;
  start_date: string;
  end_date: string;
}

const PlacementMonitoringWidget: React.FC = () => {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [filteredPlacements, setFilteredPlacements] = useState<Placement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidencePlacement, setEvidencePlacement] = useState<Placement | null>(null);

  const { feedbackProps, showError, showSuccess } = useFeedbackModal();

  useEffect(() => {
    fetchPlacements();
  }, []);

  useEffect(() => {
    const search = searchTerm.toLowerCase();

    setFilteredPlacements(
      placements.filter(placement =>
        (placement.student_info?.name || '').toLowerCase().includes(search) ||
        (placement.student_info?.email || '').toLowerCase().includes(search) ||
        placement.title.toLowerCase().includes(search) ||
        placement.employer_name.toLowerCase().includes(search) ||
        placement.department.toLowerCase().includes(search)
      )
    );
  }, [placements, searchTerm]);

  const fetchPlacements = async () => {
    try {
      setLoading(true);
      const data = await institutionService.getPlacements();
      setPlacements(data);
      setFilteredPlacements(data);
    } catch (error) {
      console.error('Failed to fetch placements', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagClick = (placement: Placement) => {
    setSelectedPlacement(placement);
    setIncidentTitle('');
    setIncidentDescription('');
    setShowFlagModal(true);
  };

  const handleReviewClick = (placement: Placement) => {
    setEvidencePlacement(placement);
    setShowEvidenceModal(true);
  };

  const handleFlagSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlacement) return;

    setSubmitting(true);

    try {
      await internshipService.reportIncident(
        selectedPlacement.id,
        incidentTitle,
        incidentDescription
      );

      setShowFlagModal(false);

      showSuccess(
        'Incident Reported',
        'The incident has been reported and recorded.'
      );
    } catch (error: any) {
      showError(
        'Submission Failed',
        'We could not report the incident.',
        error.response?.data?.error || error.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'monitor-status-active';
      case 'COMPLETED':
        return 'monitor-status-completed';
      case 'TERMINATED':
        return 'monitor-status-terminated';
      case 'CERTIFIED':
        return 'monitor-status-certified';
      default:
        return 'monitor-status-default';
    }
  };

  if (loading) {
    return (
      <div className="monitor-card">
        <div className="monitor-header">
          <div className="placeholder-glow w-25">
            <span className="placeholder col-12 rounded"></span>
          </div>
        </div>

        <div className="p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="d-flex mb-4 placeholder-glow">
              <span
                className="placeholder rounded-3 me-3"
                style={{ width: 42, height: 42 }}
              />
              <div className="flex-grow-1">
                <span className="placeholder col-4 rounded mb-2" />
                <br />
                <span className="placeholder col-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="monitor-card">
      <style>{`
        .monitor-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .monitor-header {
          padding: 24px;
          border-bottom: 1px solid #eef2f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .monitor-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 740;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .monitor-title-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .monitor-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .monitor-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .monitor-input {
          height: 42px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
          background: #ffffff !important;
        }

        .monitor-refresh-btn,
        .monitor-soft-btn,
        .monitor-danger-btn,
        .monitor-primary-btn {
          min-height: 40px;
          border-radius: 14px !important;
          font-weight: 700 !important;
          box-shadow: none !important;
        }

        .monitor-refresh-btn,
        .monitor-soft-btn {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
        }

        .monitor-danger-btn {
          background: #ffffff !important;
          border: 1px solid #fee2e2 !important;
          color: #dc2626 !important;
        }

        .monitor-primary-btn {
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
        }

        .monitor-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 560px;
        }

        .monitor-table {
          width: 100%;
          min-width: 1150px;
          table-layout: fixed;
          margin-bottom: 0;
        }

        .monitor-table thead th {
          position: sticky;
          top: 0;
          z-index: 3;
          border: none;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          padding: 16px 18px;
          white-space: nowrap;
        }

        .monitor-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .monitor-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .student-col { width: 310px; }
        .role-col { width: 260px; }
        .company-col { width: 220px; }
        .department-col { width: 180px; }
        .status-col { width: 150px; }
        .actions-col { width: 220px; }

        .monitor-avatar {
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

        .monitor-primary-text {
          font-weight: 720;
          color: #111827;
          line-height: 1.3;
        }

        .monitor-muted {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 4px;
        }

        .monitor-pill {
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

        .monitor-status-active {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .monitor-status-completed {
          background: #eff6ff;
          border-color: #dbeafe;
          color: #1d4ed8;
        }

        .monitor-status-terminated {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #991b1b;
        }

        .monitor-status-certified {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }

        .monitor-status-default {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
        }

        .monitor-empty-state {
          padding: 58px 24px;
          text-align: center;
        }

        .monitor-modal .modal-content {
          border: none;
          border-radius: 26px;
          overflow: hidden;
        }

        .monitor-modal .modal-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .monitor-modal .form-control {
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .monitor-modal .form-control:focus {
          border-color: #111827;
        }

        @media (max-width: 992px) {
          .monitor-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="monitor-header">
        <div>
          <div className="monitor-title">
            <div className="monitor-title-icon">
              <Activity size={19} />
            </div>
            Placement Monitoring
          </div>

          <p className="monitor-subtitle">
            Track active students, review evidence, and report placement issues.
          </p>
        </div>

        <div className="monitor-actions">
          <InputGroup style={{ width: 270 }}>
            <InputGroup.Text className="bg-white border-end-0 rounded-start-4">
              <Search size={15} className="text-muted" />
            </InputGroup.Text>

            <Form.Control
              className="monitor-input border-start-0 rounded-end-4"
              placeholder="Search placements..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
          </InputGroup>

          <Button
            className="monitor-refresh-btn"
            onClick={fetchPlacements}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      <div className="monitor-table-wrap">
        <table className="table monitor-table align-middle">
          <thead>
            <tr>
              <th className="student-col">Student</th>
              <th className="role-col">Role</th>
              <th className="company-col">Company</th>
              <th className="department-col">Department</th>
              <th className="status-col">Status</th>
              <th className="actions-col text-end">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredPlacements.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="monitor-empty-state">
                    <Users size={46} className="text-muted mb-3" />
                    <h5 className="fw-semibold mb-2">No placements found</h5>
                    <p className="text-muted mb-0">
                      Active placement records will appear here.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPlacements.map(placement => (
                <tr key={placement.id}>
                  <td className="student-col">
                    <div className="d-flex align-items-center gap-3">
                      <div className="monitor-avatar">
                        {placement.student_info?.name?.charAt(0) || '?'}
                      </div>

                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <div className="monitor-primary-text">
                            {placement.student_info?.name || 'Unknown'}
                          </div>

                          <TrustBadge
                            level={(placement.student_info?.trust_level as TrustLevel) || 0}
                            entityType="student"
                            size="sm"
                            showLabel={false}
                          />
                        </div>

                        <div className="monitor-muted">
                          {placement.student_info?.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="role-col">
                    <div className="monitor-primary-text">
                      {placement.title}
                    </div>
                  </td>

                  <td className="company-col">
                    <span className="monitor-pill">
                      <Building2 size={13} />
                      {placement.employer_name}
                    </span>
                  </td>

                  <td className="department-col">
                    <span className="monitor-pill">
                      {placement.department}
                    </span>
                  </td>

                  <td className="status-col">
                    <span className={`monitor-pill ${getStatusClass(placement.status)}`}>
                      {placement.status}
                    </span>
                  </td>

                  <td className="actions-col text-end">
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        className="monitor-soft-btn d-flex align-items-center gap-2"
                        onClick={() => handleReviewClick(placement)}
                      >
                        <FileText size={14} />
                        Review
                      </Button>

                      <Button
                        className="monitor-danger-btn d-flex align-items-center gap-2"
                        onClick={() => handleFlagClick(placement)}
                      >
                        <Flag size={14} />
                        Report
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        show={showFlagModal}
        onHide={() => setShowFlagModal(false)}
        centered
        dialogClassName="monitor-modal"
      >
        <Form onSubmit={handleFlagSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center gap-2 text-danger">
              <AlertTriangle size={20} />
              Report Incident
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            <p className="text-muted small mb-4">
              Reporting an incident for{' '}
              <strong className="text-dark">
                {selectedPlacement?.student_info?.name}
              </strong>
              . This will be recorded for institutional review.
            </p>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Issue Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Unexcused absence"
                value={incidentTitle}
                onChange={event => setIncidentTitle(event.target.value)}
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="small fw-bold">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Provide detailed incident context..."
                value={incidentDescription}
                onChange={event => setIncidentDescription(event.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button
              className="monitor-soft-btn"
              onClick={() => setShowFlagModal(false)}
            >
              Cancel
            </Button>

            <Button
              className="monitor-danger-btn"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {evidencePlacement && (
        <PlacementEvidenceModal
          placement={evidencePlacement}
          show={showEvidenceModal}
          onHide={() => setShowEvidenceModal(false)}
        />
      )}

      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default PlacementMonitoringWidget;