import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { AlertTriangle } from 'lucide-react';
import { internshipService } from '../../services/internship/internshipService';
import { toast } from 'react-hot-toast';

interface ReportIncidentModalProps {
  show: boolean;
  onHide: () => void;
  applicationId: string;
}

const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({ show, onHide, applicationId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      await internshipService.reportIncident(applicationId, title, description);
      toast.success('Incident reported successfully. Supervisors have been notified.');
      onHide();
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to report incident.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-danger d-flex align-items-center">
          <AlertTriangle className="me-2" /> Report Incident
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-4">
          Please describe the incident or concern. This report will be sent securely to both your Institution and Employer supervisors.
        </p>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Subject</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="e.g., Safety Concern, Harassment, Unfair Treatment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold small">Description</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={5} 
              placeholder="Provide details about what happened..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="light" onClick={onHide} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ReportIncidentModal;
