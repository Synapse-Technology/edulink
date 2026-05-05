import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { internshipService } from '../../services/internship/internshipService';
import type { Incident } from '../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import IncidentAuditTrail from './IncidentAuditTrail';

interface IncidentDetailsModalProps {
  show: boolean;
  onHide: () => void;
  incident: Incident;
  onUpdate: (updated: Incident) => void;
  isAdmin?: boolean;
}

const IncidentDetailsModal: React.FC<IncidentDetailsModalProps> = ({
  show,
  onHide,
  incident,
  onUpdate,
  isAdmin = false,
}) => {
  const [investigationNotes, setInvestigationNotes] = useState(incident.investigation_notes || '');
  const [resolutionNotes, setResolutionNotes] = useState(incident.resolution_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [showInvestigationForm, setShowInvestigationForm] = useState(false);
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  const handleStartInvestigation = async () => {
    if (!investigationNotes.trim()) {
      toast.error('Please enter investigation notes');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await internshipService.startIncidentInvestigation(
        incident.application,
        incident.id,
        investigationNotes
      );
      onUpdate(updated);
      toast.success('Investigation started');
      setShowInvestigationForm(false);
    } catch (err: any) {
      console.error('Failed to start investigation', err);
      toast.error(err.message || 'Failed to start investigation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveIncident = async (resolution: 'RESOLVED' | 'DISMISSED') => {
    if (!resolutionNotes.trim()) {
      toast.error('Please enter resolution notes');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await internshipService.resolveIncident(
        incident.application,
        incident.id,
        resolution,
        resolutionNotes
      );
      onUpdate(updated);
      toast.success(`Incident ${resolution.toLowerCase()}`);
      setShowResolutionForm(false);
      onHide();
    } catch (err: any) {
      console.error('Failed to resolve incident', err);
      toast.error(err.message || 'Failed to resolve incident');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'danger';
      case 'ASSIGNED': return 'warning';
      case 'INVESTIGATING': return 'info';
      case 'PENDING_APPROVAL': return 'primary';
      case 'RESOLVED': return 'success';
      case 'DISMISSED': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <div className="w-100">
          <div className="d-flex align-items-center justify-content-between">
            <Modal.Title className="fw-bold d-flex align-items-center gap-2">
              <AlertTriangle size={24} className="text-danger" />
              Incident Details
            </Modal.Title>
            <Badge bg={getStatusBadgeColor(incident.status)} className="text-uppercase">
              {incident.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-3">
        {/* Incident Header */}
        <div className="mb-4 p-3 bg-light rounded-3">
          <h5 className="fw-bold mb-3">{incident.title}</h5>
          <p className="mb-3 text-muted">{incident.description}</p>
          <div className="d-flex flex-wrap gap-3 text-muted small">
            <div className="d-flex align-items-center gap-1">
              <Clock size={14} />
              Reported: {new Date(incident.created_at).toLocaleString()}
            </div>
            <div className="d-flex align-items-center gap-1">
              <User size={14} />
              Student: {incident.student_info?.name || 'Unknown'}
            </div>
            <div>Internship: {incident.internship_title || 'N/A'}</div>
          </div>
        </div>

        {/* Investigation Section */}
        {incident.status === 'INVESTIGATING' || incident.investigation_notes ? (
          <div className="mb-4 p-3 bg-info bg-opacity-10 border border-info border-opacity-25 rounded-3">
            <h6 className="fw-bold text-info mb-2">Investigation Notes</h6>
            <p className="mb-0 small text-dark">{incident.investigation_notes || 'No notes yet'}</p>
          </div>
        ) : null}

        {/* Resolution Section */}
        {incident.status === 'RESOLVED' || incident.status === 'DISMISSED' ? (
          <div className={`mb-4 p-3 border rounded-3 ${incident.status === 'RESOLVED' ? 'bg-success bg-opacity-10 border-success-subtle' : 'bg-secondary bg-opacity-10 border-secondary-subtle'}`}>
            <h6 className={`fw-bold mb-2 ${incident.status === 'RESOLVED' ? 'text-success' : 'text-secondary'}`}>
              Resolution Notes
            </h6>
            <p className="mb-0 small text-dark">{incident.resolution_notes || 'No resolution notes'}</p>
            {incident.resolved_at && (
              <small className="text-muted d-block mt-2">
                Resolved: {new Date(incident.resolved_at).toLocaleString()}
              </small>
            )}
          </div>
        ) : null}

        {/* Audit Trail */}
        <div className="mb-4">
          <IncidentAuditTrail incident={incident} />
        </div>

        {/* Actions */}
        {isAdmin && (
          <>
            {incident.status === 'OPEN' && !showInvestigationForm && !showResolutionForm && (
              <Alert variant="info" className="small">
                Start an investigation to collect evidence and notes, then propose a resolution.
              </Alert>
            )}

            {incident.status === 'OPEN' && !showInvestigationForm && !showResolutionForm && (
              <div className="d-flex gap-2">
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => setShowInvestigationForm(true)}
                  className="flex-grow-1"
                >
                  Start Investigation
                </Button>
              </div>
            )}

            {incident.status === 'INVESTIGATING' && !showResolutionForm && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowResolutionForm(true)}
                className="w-100"
              >
                Propose Resolution
              </Button>
            )}

            {/* Investigation Form */}
            {showInvestigationForm && (
              <div className="mt-3 p-3 bg-light rounded-3">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small">Investigation Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={investigationNotes}
                    onChange={(e) => setInvestigationNotes(e.target.value)}
                    placeholder="Document your investigation findings..."
                    disabled={submitting}
                  />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowInvestigationForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={handleStartInvestigation}
                    disabled={submitting || !investigationNotes.trim()}
                  >
                    {submitting ? <Spinner animation="border" size="sm" /> : 'Start Investigation'}
                  </Button>
                </div>
              </div>
            )}

            {/* Resolution Form */}
            {showResolutionForm && (
              <div className="mt-3 p-3 bg-light rounded-3">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small">Resolution Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Document the investigation findings and proposed resolution..."
                    disabled={submitting}
                  />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowResolutionForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleResolveIncident('DISMISSED')}
                    disabled={submitting || !resolutionNotes.trim()}
                  >
                    {submitting ? <Spinner animation="border" size="sm" /> : 'Dismiss Incident'}
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleResolveIncident('RESOLVED')}
                    disabled={submitting || !resolutionNotes.trim()}
                  >
                    {submitting ? <Spinner animation="border" size="sm" /> : 'Resolve Incident'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default IncidentDetailsModal;
