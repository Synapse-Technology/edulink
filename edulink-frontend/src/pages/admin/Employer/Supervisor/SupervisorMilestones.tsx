import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import { CheckCircle, XCircle, FileText, Clock, Award } from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { InternshipEvidence } from '../../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';

const SupervisorMilestones: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<InternshipEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<InternshipEvidence | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getPendingEvidence();
      // Filter for Milestones
      const milestones = data.filter((e: InternshipEvidence) => e.evidence_type === 'MILESTONE');
      setEvidenceList(milestones);
    } catch (err: any) {
      console.error("Failed to fetch milestones", err);
      setError("Failed to load pending milestones.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (evidence: InternshipEvidence, action: 'ACCEPTED' | 'REJECTED') => {
    setSelectedEvidence(evidence);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedEvidence || !reviewAction) return;

    try {
      setSubmitting(true);
      await internshipService.reviewEvidence(
        selectedEvidence.internship,
        selectedEvidence.id,
        reviewAction,
        reviewNotes
      );
      
      setFeedbackModal({
        show: true,
        title: 'Review Submitted',
        message: `Milestone ${reviewAction === 'ACCEPTED' ? 'approved' : 'rejected'} successfully.`,
        variant: 'success'
      });
      
      setShowReviewModal(false);
      fetchEvidence(); // Refresh list
    } catch (err: any) {
      console.error("Failed to review milestone", err);
      setFeedbackModal({
        show: true,
        title: 'Review Failed',
        message: 'Failed to submit review for milestone.',
        variant: 'error',
        details: err.message || 'Unknown error occurred'
      });
    } finally {
      setSubmitting(false);
    }
  };

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
          <Alert variant="danger" className="rounded-3 shadow-sm border-danger-subtle">
            <div className="d-flex align-items-center">
              <XCircle className="me-2" size={20} />
              {error}
            </div>
          </Alert>
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <style>
        {`
          .hover-lift {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .hover-lift:hover {
            transform: translateY(-2px);
            box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
          }
        `}
      </style>
      <div className="container-fluid px-4 px-lg-5 py-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
          <div className="d-flex align-items-center">
            <div className="bg-primary bg-opacity-10 p-3 rounded-3 me-3">
              <Award size={28} className="text-primary" />
            </div>
            <div>
              <h2 className="fw-bold text-dark mb-1">Pending Milestones</h2>
              <p className="text-muted mb-0">Review and validate student milestones.</p>
            </div>
          </div>
        </div>
      
        <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
          <Card.Header className="bg-white border-bottom px-4 py-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h5 className="mb-0 fw-bold text-dark">Milestone Submissions</h5>
                <small className="text-muted">Manage student milestone approvals</small>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 ps-4 py-3 text-uppercase text-secondary small fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Student / Title</th>
                  <th className="border-0 py-3 text-uppercase text-secondary small fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Date Submitted</th>
                  <th className="border-0 py-3 text-uppercase text-secondary small fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Attachment</th>
                  <th className="border-0 py-3 text-end pe-4 text-uppercase text-secondary small fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evidenceList.length > 0 ? (
                  evidenceList.map((evidence) => (
                    <tr key={evidence.id}>
                      <td className="ps-4 py-3">
                        <div className="fw-bold text-dark">{evidence.title}</div>
                        <div className="small text-muted">ID: {evidence.submitted_by}</div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center text-muted">
                          <Clock size={14} className="me-2" />
                          {new Date(evidence.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3">
                        {evidence.file && (
                          <a 
                            href={evidence.file} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-sm btn-light border d-inline-flex align-items-center text-muted hover-lift"
                          >
                            <FileText size={14} className="me-2" />
                            <span className="text-muted fw-medium">View File</span>
                          </a>
                        )}
                      </td>
                      <td className="text-end pe-4 py-3">
                        <Button 
                          variant="success" 
                          size="sm" 
                          className="me-2 px-3 rounded-3 shadow-sm hover-lift bg-success bg-opacity-10 text-success border-success-subtle"
                          onClick={() => handleReviewClick(evidence, 'ACCEPTED')}
                        >
                          <CheckCircle size={14} className="me-1" /> Approve
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          className="px-3 rounded-3 shadow-sm hover-lift bg-danger bg-opacity-10 text-danger border-danger-subtle"
                          onClick={() => handleReviewClick(evidence, 'REJECTED')}
                        >
                          <XCircle size={14} className="me-1" /> Reject
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center justify-content-center py-4">
                        <div className="bg-light rounded-circle p-4 mb-3">
                          <Award size={48} className="text-muted opacity-50" />
                        </div>
                        <h5 className="text-dark fw-bold mb-1">No Pending Milestones</h5>
                        <p className="text-muted mb-0">All milestones have been reviewed.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        {/* Review Modal */}
        <Modal 
          show={showReviewModal} 
          onHide={() => setShowReviewModal(false)} 
          centered
          contentClassName="border-0 shadow-lg rounded-4"
        >
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">
              {reviewAction === 'ACCEPTED' ? 'Approve' : 'Reject'} Milestone
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-3 pb-4">
            <p className="text-muted mb-4">
              Are you sure you want to <strong>{reviewAction === 'ACCEPTED' ? 'approve' : 'reject'}</strong> this milestone?
            </p>
            <div className="bg-light rounded-3 p-3 border mb-4">
              <strong className="d-block text-dark">{selectedEvidence?.title}</strong>
              <p className="mb-0 text-muted small mt-1">{selectedEvidence?.description}</p>
            </div>
            <Form.Group className="mb-3">
              <Form.Label className="small text-uppercase fw-bold text-secondary">
                {reviewAction === 'ACCEPTED' ? 'Review Notes (Optional)' : 'Reason for Rejection'} <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'ACCEPTED' ? "Add optional feedback..." : "Explain why this milestone is rejected..."}
                className="bg-light border-0 focus-ring"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0 pb-4">
            <Button variant="light" onClick={() => setShowReviewModal(false)} className="rounded-3 px-4 hover-lift">
              Cancel
            </Button>
            <Button 
              variant={reviewAction === 'ACCEPTED' ? 'success' : 'danger'} 
              onClick={handleReviewSubmit}
              disabled={submitting}
              className="rounded-3 px-4 hover-lift shadow-sm"
            >
              {submitting ? <Spinner animation="border" size="sm" /> : 'Confirm'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </SupervisorLayout>
  );
};

export default SupervisorMilestones;
