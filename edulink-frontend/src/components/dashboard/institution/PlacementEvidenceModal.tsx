import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import { FileText, ExternalLink, Award } from 'lucide-react';
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

const PlacementEvidenceModal: React.FC<PlacementEvidenceModalProps> = ({ show, onHide, placement }) => {
  const [evidence, setEvidence] = useState<InternshipEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
    } catch (err: any) {
      console.error("Failed to fetch evidence", err);
      setError("Failed to load evidence.");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (evidenceId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      setActionLoading(true);
      await internshipService.reviewEvidence(placement.id, evidenceId, status, reviewNotes);
      
      // Update local state
      setEvidence(prev => prev.map(e => 
        e.id === evidenceId 
          ? { ...e, status, review_notes: reviewNotes, reviewed_at: new Date().toISOString() } 
          : e
      ));
      
      setReviewingId(null);
      setReviewNotes('');
    } catch (err: any) {
      console.error("Failed to review evidence", err);
      alert("Failed to submit review");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCertify = async () => {
    if (!window.confirm("Are you sure you want to certify this internship? This action is irreversible.")) {
      return;
    }

    try {
      setActionLoading(true);
      await internshipService.certifyInternship(placement.id);
      onHide();
      // Ideally trigger a refresh of the parent list
      window.location.reload(); // Simple reload for now to reflect status change
    } catch (err: any) {
      console.error("Failed to certify internship", err);
      alert("Failed to certify internship");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success';
      case 'REJECTED': return 'danger';
      case 'REVIEWED': return 'info';
      case 'SUBMITTED': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <FileText className="me-2" size={20} />
          Evidence Review: {placement.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <h6 className="text-muted small text-uppercase">Student</h6>
          <p className="fw-bold mb-0">{placement.student_info?.name || 'Unknown Student'}</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <>
            <Table responsive hover className="align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="border-0">Title / Type</th>
                  <th className="border-0">Date</th>
                  <th className="border-0">Status</th>
                  <th className="border-0 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {evidence.length > 0 ? (
                  evidence.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td>
                          <div className="fw-bold">{item.title}</div>
                          <div className="small text-muted">{item.evidence_type}</div>
                          {item.file && (
                            <a href={item.file} target="_blank" rel="noopener noreferrer" className="small text-primary text-decoration-none d-flex align-items-center mt-1">
                              <ExternalLink size={12} className="me-1" /> View File
                            </a>
                          )}
                        </td>
                        <td className="small text-muted">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <Badge bg={getStatusBadge(item.status)}>{item.status}</Badge>
                        </td>
                        <td className="text-end">
                          {item.status === 'SUBMITTED' && reviewingId !== item.id && (
                            <Button 
                              variant="outline-primary" 
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
                          <td colSpan={4} className="bg-light">
                            <div className="p-3">
                              <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">Review Notes</Form.Label>
                                <Form.Control 
                                  as="textarea" 
                                  rows={2} 
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  placeholder="Enter feedback..."
                                />
                              </Form.Group>
                              <div className="d-flex justify-content-end gap-2">
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  onClick={() => {
                                    setReviewingId(null);
                                    setReviewNotes('');
                                  }}
                                  disabled={actionLoading}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="danger" 
                                  size="sm" 
                                  onClick={() => handleReview(item.id, 'REJECTED')}
                                  disabled={actionLoading}
                                >
                                  Reject
                                </Button>
                                <Button 
                                  variant="success" 
                                  size="sm" 
                                  onClick={() => handleReview(item.id, 'ACCEPTED')}
                                  disabled={actionLoading}
                                >
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
                    <td colSpan={4} className="text-center py-4 text-muted">
                      No evidence submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>

            {placement.status === 'COMPLETED' && (
              <div className="mt-4 p-3 bg-success bg-opacity-10 rounded border border-success border-opacity-25">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-success fw-bold mb-1">Certification Ready</h6>
                    <p className="mb-0 small text-success text-opacity-75">
                      This internship is marked as completed. You can now certify it.
                    </p>
                  </div>
                  <Button 
                    variant="success" 
                    onClick={handleCertify}
                    disabled={actionLoading}
                    className="d-flex align-items-center"
                  >
                    <Award size={18} className="me-2" />
                    Certify Internship
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

export default PlacementEvidenceModal;
