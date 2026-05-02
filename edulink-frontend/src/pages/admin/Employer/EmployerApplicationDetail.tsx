import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MapPin, Briefcase, Users, FileText, Calendar, Star } from 'lucide-react';
import { EmployerLayout } from '../../../components/admin/employer';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import { DocumentPreviewModal, FeedbackModal } from '../../../components/common';
import InternshipLifecyclePanel from '../../../components/internship/InternshipLifecyclePanel';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const EmployerApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [finalRating, setFinalRating] = useState<number>(5);
  const { feedbackProps, showError, showSuccess } = useFeedbackModal();

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchApplication(id);
    }
  }, [id]);

  const fetchApplication = async (appId: string) => {
    try {
      setIsLoading(true);
      const data = await internshipService.getApplication(appId);
      setApplication(data);
      setFinalFeedback(data.final_feedback || '');
      setFinalRating(data.final_rating || 5);
    } catch (error) {
      console.error('Failed to fetch application:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFinalFeedback = async () => {
    if (!application || !finalFeedback.trim()) {
      showError('Final Assessment Required', 'Please add final feedback before submitting.');
      return;
    }

    try {
      setIsProcessing(true);
      await internshipService.submitFinalFeedback(
        application.id,
        finalFeedback.trim(),
        finalRating
      );
      await fetchApplication(application.id);
      showSuccess('Final Assessment Saved', 'Completion readiness has been updated.');
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);
      showError(
        'Assessment Failed',
        sanitized.userMessage || 'Failed to submit final feedback'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (action: 'SHORTLIST' | 'REJECT' | 'ACCEPT' | 'START' | 'COMPLETE') => {
    if (!id) return;
    try {
      setIsProcessing(true);
      // Backend expects lowercase actions (e.g., 'shortlist', 'accept')
      let backendAction = action.toLowerCase();
      
      // Map 'ACCEPTED' to 'accept' strictly if needed, though toLowerCase() does this.
      // Double check if there is any other mapping needed. 
      // The error says "accepted" is not valid. The allowed choice is "accept".
      // Ah! "ACCEPTED".toLowerCase() is "accepted". The allowed choice is "accept".
      
      if (backendAction === 'accepted') backendAction = 'accept';
      
      await internshipService.processApplication(id, backendAction as any, action === 'REJECT' ? rejectionReason : undefined);
      await fetchApplication(id);
      setShowRejectModal(false);
      
      const actionLabel = action === 'SHORTLIST' ? 'shortlisted' : 
                         action === 'ACCEPT' ? 'accepted' : 
                         action === 'REJECT' ? 'rejected' :
                         action === 'COMPLETE' ? 'completed' : 'started';
      
      showSuccess('Success', `Application has been ${actionLabel} successfully.`);
    } catch (error: any) {
       console.error('Failed to update status:', error);
       const sanitized = sanitizeAdminError(error);
       showError('Error', sanitized.userMessage || 'Failed to update application status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDocument = (path: string | null | undefined, title: string = 'Document') => {
    if (!path) return;
    setPreviewTitle(title);
    setPreviewUrl(path);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <EmployerLayout>
        <div className="container-fluid p-0">
          <div className="skeleton skeleton-text w-25 mb-4"></div>
          
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div className="d-flex">
                      <div className="skeleton skeleton-avatar me-4"></div>
                      <div>
                        <div className="skeleton skeleton-title mb-2"></div>
                        <div className="skeleton skeleton-text w-75 mb-2"></div>
                        <div className="skeleton skeleton-badge"></div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <div className="skeleton skeleton-button"></div>
                      <div className="skeleton skeleton-button"></div>
                    </div>
                  </div>

                  <div className="skeleton skeleton-text w-25 mb-3"></div>
                  <div className="skeleton skeleton-text w-100 mb-2"></div>
                  <div className="skeleton skeleton-text w-100 mb-2"></div>
                  <div className="skeleton skeleton-text w-75 mb-4"></div>

                  <div className="skeleton skeleton-text w-25 mb-3"></div>
                  <div className="d-flex gap-2">
                    <div className="skeleton skeleton-badge"></div>
                    <div className="skeleton skeleton-badge"></div>
                    <div className="skeleton skeleton-badge"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                  <div className="skeleton skeleton-text w-50"></div>
                </div>
                <div className="card-body">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="mb-3">
                      <div className="skeleton skeleton-text w-25 mb-1"></div>
                      <div className="skeleton skeleton-text w-75"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
          }
          .skeleton-title { height: 32px; width: 200px; }
          .skeleton-text { height: 16px; }
          .skeleton-avatar { height: 80px; width: 80px; border-radius: 50%; }
          .skeleton-badge { height: 24px; width: 80px; border-radius: 12px; }
          .skeleton-button { height: 38px; width: 100px; }
          .w-25 { width: 25%; }
          .w-50 { width: 50%; }
          .w-75 { width: 75%; }
          .w-100 { width: 100%; }
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </EmployerLayout>
    );
  }

  if (!application) {
    return (
      <EmployerLayout>
        <div className="text-center py-5">
          <h3>Application not found</h3>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/employer/dashboard/applications')}>
            Back to Applications
          </button>
        </div>
      </EmployerLayout>
    );
  }

  // Extract snapshot data
  const snapshot = application.application_snapshot || {};
  const studentSkills = snapshot.skills || [];
  const studentCV = snapshot.cv;

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <button 
          className="btn btn-link text-decoration-none ps-0 mb-4 text-muted d-flex align-items-center"
          onClick={() => navigate('/employer/dashboard/applications')}
        >
          <ArrowLeft size={20} className="me-2" />
          Back to Applications
        </button>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div className="d-flex">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-4" style={{width: '80px', height: '80px'}}>
                      <span className="fs-2 fw-bold text-primary">
                        {application.student_info?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h2 className="fw-bold mb-1">{application.student_info?.name || 'Unknown Candidate'}</h2>
                      <p className="text-muted mb-2">{application.student_info?.email}</p>
                      <div className="d-flex gap-2">
                        <span className={`badge ${
                          application.status === 'APPLIED' ? 'bg-warning text-dark' :
                          application.status === 'SHORTLISTED' ? 'bg-info' :
                          application.status === 'ACCEPTED' ? 'bg-primary' :
                          application.status === 'ACTIVE' ? 'bg-success' :
                          application.status === 'REJECTED' ? 'bg-danger' : 'bg-secondary'
                        }`}>
                          {application.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {application.status === 'APPLIED' && (
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-danger"
                        onClick={() => setShowRejectModal(true)}
                        disabled={isProcessing}
                      >
                        <XCircle size={18} className="me-2" />
                        Reject
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleStatusChange('SHORTLIST')}
                        disabled={isProcessing}
                      >
                        <CheckCircle size={18} className="me-2" />
                        Shortlist
                      </button>
                    </div>
                  )}

                  {application.status === 'SHORTLISTED' && (
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-danger"
                        onClick={() => setShowRejectModal(true)}
                        disabled={isProcessing}
                      >
                        <XCircle size={18} className="me-2" />
                        Reject
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleStatusChange('ACCEPT')}
                        disabled={isProcessing}
                      >
                        <CheckCircle size={18} className="me-2" />
                        Accept
                      </button>
                    </div>
                  )}

                  {application.status === 'ACCEPTED' && (
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-success"
                        onClick={() => handleStatusChange('START')}
                        disabled={isProcessing}
                      >
                        <Briefcase size={18} className="me-2" />
                        Start Internship
                      </button>
                    </div>
                  )}

                  {application.status === 'ACTIVE' && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-success"
                        onClick={() => handleStatusChange('COMPLETE')}
                        disabled={isProcessing || !application.completion_readiness?.can_mark_completed}
                        title={
                          application.completion_readiness?.can_mark_completed
                            ? 'Mark internship completed'
                            : application.completion_readiness?.summary || 'Completion requirements are not met'
                        }
                      >
                        <CheckCircle size={18} className="me-2" />
                        Mark Completed
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <InternshipLifecyclePanel
                    application={application}
                    roleView="employer"
                    compact
                  />
                </div>

                {application.can_feedback && ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(application.status) && (
                  <div className="card border bg-light mb-4">
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                        <div>
                          <h5 className="fw-bold mb-1">Final Assessment</h5>
                          <p className="text-muted small mb-0">
                            Required before this internship can be marked completed.
                          </p>
                        </div>
                        <div className="d-flex align-items-center gap-1 text-warning">
                          <Star size={18} fill="currentColor" />
                          <span className="fw-bold">{finalRating}/5</span>
                        </div>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold">Rating</label>
                          <select
                            className="form-select"
                            value={finalRating}
                            onChange={(event) => setFinalRating(Number(event.target.value))}
                            disabled={isProcessing || application.status === 'CERTIFIED'}
                          >
                            {[5, 4, 3, 2, 1].map(rating => (
                              <option key={rating} value={rating}>
                                {rating} / 5
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-8">
                          <label className="form-label small fw-semibold">Supervisor feedback</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={finalFeedback}
                            onChange={(event) => setFinalFeedback(event.target.value)}
                            placeholder="Summarize performance, strengths, reliability, and readiness for career progression."
                            disabled={isProcessing || application.status === 'CERTIFIED'}
                          />
                        </div>
                      </div>
                      {application.status !== 'CERTIFIED' && (
                        <button
                          type="button"
                          className="btn btn-primary mt-3"
                          onClick={handleSubmitFinalFeedback}
                          disabled={isProcessing || !finalFeedback.trim()}
                        >
                          Save Final Assessment
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded border">
                      <small className="text-muted d-block mb-1">Course of Study</small>
                      <div className="fw-semibold">{snapshot.course_of_study || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded border">
                      <small className="text-muted d-block mb-1">Current Year</small>
                      <div className="fw-semibold">Year {snapshot.current_year || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <h5 className="fw-bold mb-3">Cover Letter</h5>
                <div className="p-3 bg-light rounded border mb-4">
                  <p className="text-muted mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {application.cover_letter || 'No cover letter provided.'}
                  </p>
                </div>

                <h5 className="fw-bold mb-3">Skills</h5>
                <div className="d-flex flex-wrap gap-2 mb-4">
                   {studentSkills.length > 0 ? (
                     studentSkills.map((skill: string, idx: number) => (
                       <span key={idx} className="badge bg-white text-dark border px-3 py-2 rounded-pill">
                         {skill}
                       </span>
                     ))
                   ) : (
                     <span className="text-muted">No skills listed.</span>
                   )}
                </div>

                {studentCV && (
                  <>
                    <h5 className="fw-bold mb-3">Documents</h5>
                    <div className="card border p-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <div className="bg-danger bg-opacity-10 p-2 rounded me-3 text-danger">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h6 className="mb-0 fw-semibold">Curriculum Vitae</h6>
                            <small className="text-muted">PDF Document</small>
                          </div>
                        </div>
                        <button 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleViewDocument(studentCV, 'Curriculum Vitae')}
                        >
                          <FileText size={16} className="me-2" />
                          Preview
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold">Internship Details</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Position</small>
                  <div className="d-flex align-items-center fw-medium">
                    <Briefcase size={16} className="me-2 text-primary" />
                    {application.title}
                  </div>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Department</small>
                  <div className="d-flex align-items-center fw-medium">
                    <Users size={16} className="me-2 text-primary" />
                    {application.department || 'N/A'}
                  </div>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Location</small>
                  <div className="d-flex align-items-center fw-medium">
                    <MapPin size={16} className="me-2 text-primary" />
                    {application.location || 'Remote'}
                  </div>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Applied Date</small>
                  <div className="d-flex align-items-center fw-medium">
                    <Calendar size={16} className="me-2 text-primary" />
                    {application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Reject Application</h5>
                <button type="button" className="btn-close" onClick={() => setShowRejectModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Reason for Rejection</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Optional feedback for the candidate..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => handleStatusChange('REJECT')}
                  disabled={isProcessing}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <FeedbackModal {...feedbackProps} />
      
      <DocumentPreviewModal 
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
      />
    </EmployerLayout>
  );
};

export default EmployerApplicationDetail;
