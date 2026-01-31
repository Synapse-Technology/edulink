import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { Send, FileText, CheckCircle } from 'lucide-react';

interface ApplyModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: (coverLetter: string) => Promise<void>;
  title: string;
  employerName?: string;
}

const ApplyModal: React.FC<ApplyModalProps> = ({ show, onHide, onConfirm, title, employerName }) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(coverLetter);
      setCoverLetter(''); // Reset on success
      onHide();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Apply for Internship</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="mb-4">
            <h6 className="fw-bold">{title}</h6>
            <p className="text-muted small mb-0">at {employerName || 'Employer'}</p>
          </div>

          <Alert variant="info" className="d-flex align-items-start gap-2">
            <CheckCircle size={18} className="mt-1 flex-shrink-0" />
            <div className="small">
              <strong>Your Profile Snapshot:</strong> We will send your current verified profile (CV, Skills, Transcript) automatically.
            </div>
          </Alert>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label className="d-flex align-items-center gap-2">
              <FileText size={16} />
              Cover Letter <span className="text-muted fw-normal">(Optional)</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder="Tell the employer why you are a good fit for this role..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
            <Form.Text className="text-muted">
              Keep it concise and relevant to the position.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : (
              <>
                <Send size={16} className="me-2" />
                Submit Application
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ApplyModal;
