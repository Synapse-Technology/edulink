import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import { CheckCircle, XCircle, FileText, Clock, RotateCcw, MessageSquare, Lock, Calendar, AlertCircle } from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { InternshipEvidence } from '../../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';

const SupervisorLogbooks: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<InternshipEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<InternshipEvidence | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getPendingEvidence();
      // Filter for Logbooks
      const logbooks = data.filter((e: InternshipEvidence) => e.evidence_type === 'LOGBOOK');
      setEvidenceList(logbooks);
    } catch (err: any) {
      console.error("Failed to fetch evidence", err);
      setError("Failed to load pending logbooks.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (evidence: InternshipEvidence, action: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED') => {
    setSelectedEvidence(evidence);
    setReviewAction(action);
    setReviewNotes(evidence.employer_review_notes || '');
    setPrivateNotes(evidence.employer_private_notes || '');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedEvidence || !reviewAction) return;

    try {
      setSubmitting(true);
      await internshipService.reviewEvidence(
        selectedEvidence.application,
        selectedEvidence.id,
        reviewAction,
        reviewNotes,
        privateNotes
      );
      
      const actionLabel = reviewAction === 'ACCEPTED' ? 'approved' : 
                         reviewAction === 'REVISION_REQUIRED' ? 'sent for revision' : 'rejected';
      
      toast.success(`Logbook ${actionLabel} successfully`);
      setShowReviewModal(false);
      fetchEvidence(); // Refresh list
    } catch (err: any) {
      console.error("Failed to review evidence", err);
      if (err.response?.data?.detail?.includes("authorized")) {
         toast.error("You cannot review this logbook (Internship might be completed).");
      } else {
         toast.error("Failed to submit review");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string | undefined, label?: string) => {
    if (!status) return <Badge bg="secondary" className="bg-opacity-10 text-secondary border border-secondary-subtle px-2 py-1 fw-medium rounded-3">{label || 'Pending'}</Badge>;
    
    switch (status) {
      case 'ACCEPTED':
        return <Badge bg="success" className="bg-opacity-10 text-success border border-success-subtle px-2 py-1 fw-medium rounded-3">{label || 'Approved'}</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger-subtle px-2 py-1 fw-medium rounded-3">{label || 'Rejected'}</Badge>;
      case 'REVISION_REQUIRED':
        return <Badge bg="info" className="bg-opacity-10 text-info border border-info-subtle px-2 py-1 fw-medium rounded-3">{label || 'Revision'}</Badge>;
      case 'REVIEWED':
        return <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning-subtle px-2 py-1 fw-medium rounded-3">{label || 'Reviewed'}</Badge>;
      default:
        return <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning-subtle px-2 py-1 fw-medium rounded-3">{label || 'Pending'}</Badge>;
    }
  };

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="container-fluid px-4 px-lg-5 py-4">
          <SupervisorTableSkeleton />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="container-fluid px-4 px-lg-5 py-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-5">
          <div className="mb-4 mb-lg-0">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                <FileText size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="h2 fw-bold mb-1">Logbooks Review</h1>
                <p className="text-muted mb-0">
                  Review and approve student logbook entries
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <Alert variant="danger" className="border-0 shadow-sm rounded-3 d-flex align-items-center gap-3 p-4">
            <AlertCircle size={24} />
            <div>
              <h6 className="fw-bold mb-1">Failed to load logbooks</h6>
              <p className="mb-0 small">{error}</p>
              <Button variant="outline-danger" size="sm" className="mt-3" onClick={fetchEvidence}>
                Try Again
              </Button>
            </div>
          </Alert>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pt-4 pb-3 px-4">
              <h5 className="fw-bold mb-1">Pending Logbooks</h5>
              <p className="text-muted small mb-0">Logbooks waiting for your approval</p>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <Table hover className="table align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4 py-3 text-muted small text-uppercase fw-semibold">Student / Title</th>
                      <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Overall Status</th>
                      <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Dual Review</th>
                      <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Submitted Date</th>
                      <th className="border-0 pe-4 py-3 text-end text-muted small text-uppercase fw-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceList.length > 0 ? (
                      evidenceList.map((evidence) => (
                        <tr key={evidence.id} className="border-top">
                          <td className="ps-4 py-3">
                            <div className="fw-bold text-dark">{evidence.title}</div>
                            <div className="small text-muted d-flex align-items-center gap-2">
                              <Calendar size={12} />
                              {evidence.metadata?.weekStartDate ? `Week of ${evidence.metadata.weekStartDate}` : evidence.description}
                            </div>
                            <div className="small text-primary mt-1 fw-medium">
                              {evidence.student_info?.name || 'Unknown Intern'}
                            </div>
                          </td>
                          <td className="py-3">
                            {getStatusBadge(evidence.status)}
                          </td>
                          <td className="py-3">
                            <div className="d-flex flex-column gap-2">
                               <div className="d-flex align-items-center justify-content-between" style={{ minWidth: '140px' }}>
                                 <small className="text-muted me-2">Employer:</small>
                                 {getStatusBadge(evidence.employer_review_status)}
                               </div>
                               <div className="d-flex align-items-center justify-content-between" style={{ minWidth: '140px' }}>
                                 <small className="text-muted me-2">Institution:</small>
                                 {getStatusBadge(evidence.institution_review_status)}
                               </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="d-flex align-items-center text-muted">
                              <Clock size={14} className="me-2" />
                              {new Date(evidence.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="text-end pe-4 py-3">
                            <div className="d-flex justify-content-end gap-2">
                              <Button 
                                variant="light" 
                                size="sm" 
                                className="border text-primary hover-lift d-flex align-items-center"
                                onClick={() => handleReviewClick(evidence, 'ACCEPTED')}
                              >
                                <FileText size={14} className="me-1" /> Review
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-5">
                          <div className="d-flex flex-column align-items-center">
                            <div className="bg-success bg-opacity-10 rounded-circle p-4 mb-3">
                              <CheckCircle size={48} className="text-success" />
                            </div>
                            <h5 className="fw-bold text-dark">All Caught Up!</h5>
                            <p className="text-muted mb-0">No pending logbooks to review.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered size="lg">
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">
              Review Weekly Logbook
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-3">
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold text-muted text-uppercase small mb-0">Daily Entries</h6>
                <div className="d-flex gap-2">
                    {selectedEvidence?.file && (
                      <a href={selectedEvidence.file} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center rounded-pill px-3">
                        <FileText size={14} className="me-2" />
                        View Attachment
                      </a>
                    )}
                    <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary-subtle rounded-pill px-3 py-2">
                    {selectedEvidence?.metadata?.weekStartDate ? `Week of ${selectedEvidence.metadata.weekStartDate}` : 'Weekly Submission'}
                    </Badge>
                </div>
              </div>
              
              <div className="d-flex flex-column gap-3">
                {selectedEvidence?.metadata?.entries ? (
                  Object.entries(selectedEvidence.metadata.entries as Record<string, string>).sort().map(([date, content]) => (
                    <div key={date} className="bg-light p-3 rounded-3 border-start border-primary border-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-dark small">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        <Badge bg="white" className="text-muted border fw-normal small">{date}</Badge>
                      </div>
                      <p className="mb-0 small text-dark" style={{ whiteSpace: 'pre-wrap' }}>{content as string}</p>
                    </div>
                  ))
                ) : (
                  <Alert variant="info" className="small">No daily logs found in this submission.</Alert>
                )}
              </div>
            </div>

            <div className="bg-light p-3 rounded-3 mb-4">
                <h6 className="fw-bold text-muted text-uppercase small mb-3">Dual Review Status</h6>
                <div className="row g-3">
                    <div className="col-md-6">
                        <div className="p-2 border rounded bg-white">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="small fw-bold">Employer Supervisor</span>
                                {getStatusBadge(selectedEvidence?.employer_review_status)}
                            </div>
                            <small className="text-muted d-block text-truncate">
                                {selectedEvidence?.employer_review_notes || 'No feedback yet'}
                            </small>
                            {selectedEvidence?.employer_private_notes && (
                                <small className="text-danger d-block text-truncate mt-1" style={{ fontSize: '0.7rem' }}>
                                    Private: {selectedEvidence.employer_private_notes}
                                </small>
                            )}
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="p-2 border rounded bg-white">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="small fw-bold">Institution Supervisor</span>
                                {getStatusBadge(selectedEvidence?.institution_review_status)}
                            </div>
                            <small className="text-muted d-block text-truncate">
                                {selectedEvidence?.institution_review_notes || 'No feedback yet'}
                            </small>
                            {selectedEvidence?.institution_private_notes && (
                                <small className="text-danger d-block text-truncate mt-1" style={{ fontSize: '0.7rem' }}>
                                    Private: {selectedEvidence.institution_private_notes}
                                </small>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <hr className="my-4 opacity-10" />

            <div className="bg-primary bg-opacity-10 p-3 rounded-3 mb-4 border border-primary-subtle">
                <h6 className="fw-bold text-primary small text-uppercase mb-2 d-flex align-items-center gap-2">
                    <MessageSquare size={14} /> Your Review (As Employer Supervisor)
                </h6>
                <div className="row g-3">
                <div className="col-md-6">
                    <Form.Group>
                    <Form.Label className="fw-bold small text-muted">Student Feedback (Public)</Form.Label>
                    <Form.Control 
                        as="textarea" 
                        rows={4} 
                        className="bg-white border-0 small shadow-sm"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Feedback visible to the student..."
                    />
                    </Form.Group>
                </div>
                <div className="col-md-6">
                    <Form.Group>
                    <Form.Label className="fw-bold small text-muted">Private Notes (Internal)</Form.Label>
                    <Form.Control 
                        as="textarea" 
                        rows={4} 
                        className="bg-white border-0 small shadow-sm"
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Notes visible only to you..."
                    />
                    </Form.Group>
                </div>
                </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0 d-flex justify-content-between">
            <Button variant="light" onClick={() => setShowReviewModal(false)} className="px-4 rounded-3 small border">
              Cancel
            </Button>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-danger" 
                onClick={() => { setReviewAction('REJECTED'); handleReviewSubmit(); }}
                disabled={submitting}
                className="px-3 rounded-3 small d-flex align-items-center gap-2"
              >
                <XCircle size={16} /> Reject
              </Button>
              <Button 
                variant="outline-info" 
                onClick={() => { setReviewAction('REVISION_REQUIRED'); handleReviewSubmit(); }}
                disabled={submitting}
                className="px-3 rounded-3 small d-flex align-items-center gap-2"
              >
                <RotateCcw size={16} /> Request Revision
              </Button>
              <Button 
                variant="success" 
                onClick={() => { setReviewAction('ACCEPTED'); handleReviewSubmit(); }}
                disabled={submitting}
                className="px-4 rounded-3 small text-white d-flex align-items-center gap-2"
              >
                {submitting ? <Spinner animation="border" size="sm" /> : <><CheckCircle size={16} /> Approve Logbook</>}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>

        <style>{`
          .hover-lift {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .hover-lift:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          }
        `}</style>
      </div>
    </SupervisorLayout>
  );
};

export default SupervisorLogbooks;
