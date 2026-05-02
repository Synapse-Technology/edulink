import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Maximize2,
  Trash2,
  XCircle,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { DocumentPreviewModal } from '../../components/common';
import { internshipService } from '../../services/internship/internshipService';
import { showToast } from '../../utils/toast';
import type { InternshipApplication } from '../../services/internship/internshipService';
import { useTheme } from '../../contexts/ThemeContext';
import InternshipLifecyclePanel from '../../components/internship/InternshipLifecyclePanel';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';
import '../../styles/student-portal.css';

const StudentApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
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
      setApplication(await internshipService.getApplication(appId));
    } catch (error) {
      console.error('Failed to load application:', error);
      showToast.error('We could not load this application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;

    try {
      setIsWithdrawing(true);
      await internshipService.withdrawApplication(application.id, withdrawReason);
      await fetchApplication(application.id);
      setShowWithdrawModal(false);
      setWithdrawReason('');
      showToast.success('Application withdrawn successfully');
    } catch (error: any) {
      console.error('Failed to withdraw application:', error);
      showToast.error(getUserFacingErrorMessage(error?.message, error?.status) || 'We could not withdraw this application. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const canWithdraw = application && ['APPLIED', 'SHORTLISTED', 'ACCEPTED'].includes(application.status);

  const getStatusBadge = (status: string) => {
    const badges = {
      APPLIED: { color: 'warning', icon: <Clock size={16} />, text: 'Pending Review' },
      SHORTLISTED: { color: 'info', icon: <CheckCircle size={16} />, text: 'Shortlisted' },
      ACCEPTED: { color: 'primary', icon: <CheckCircle size={16} />, text: 'Accepted' },
      WITHDRAWN: { color: 'secondary', icon: <AlertCircle size={16} />, text: 'Withdrawn' },
      ACTIVE: { color: 'success', icon: <Briefcase size={16} />, text: 'Active Internship' },
      REJECTED: { color: 'danger', icon: <XCircle size={16} />, text: 'Not Selected' },
      COMPLETED: { color: 'dark', icon: <CheckCircle size={16} />, text: 'Completed' },
      CERTIFIED: { color: 'success', icon: <CheckCircle size={16} />, text: 'Certified' },
    };

    const config = badges[status as keyof typeof badges] || { color: 'secondary', icon: null, text: status };
    return (
      <span className={`badge bg-${config.color} d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="student-surface">
          <div className="student-surface-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="student-muted mt-3 mb-0">Loading application details...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!application) {
    return (
      <StudentLayout>
        <div className="student-surface">
          <div className="student-surface-body text-center py-5">
            <AlertCircle size={48} className="text-muted mb-3" />
            <h3>Application not found</h3>
            <p className="student-muted">We could not find this application or you may no longer have access to it.</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard/student/applications')}>
              Back to Applications
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const employerName = application.employer_details?.name || 'Unknown Employer';
  const location = application.location_type === 'ONSITE' ? application.location : application.location_type;

  return (
    <StudentLayout>
      <div className="student-workspace">
        <button
          className="btn btn-link text-decoration-none text-muted p-0 d-flex align-items-center gap-2"
          onClick={() => navigate('/dashboard/student/applications')}
        >
          <ArrowLeft size={18} />
          Back to Applications
        </button>

        <section className="student-command-hero">
          <div className="student-command-copy">
            <span className="student-kicker">Application detail</span>
            <h1>{application.title}</h1>
            <p>Review the employer, submitted documents, cover letter, and lifecycle status for this application.</p>
            <div className="student-command-meta">
              <span><Building2 size={15} /> {employerName}</span>
              <span><MapPin size={15} /> {location}</span>
              <span><Calendar size={15} /> Applied {new Date(application.created_at || '').toLocaleDateString()}</span>
            </div>
          </div>
          <div className="student-command-card">
            <span className="student-kicker">Current status</span>
            <div className="mb-3">{getStatusBadge(application.status)}</div>
            {canWithdraw && (
              <button className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2" onClick={() => setShowWithdrawModal(true)}>
                <Trash2 size={16} />
                Withdraw
              </button>
            )}
          </div>
        </section>

        <section className="student-surface application-lifecycle-surface">
          <div className="student-surface-body">
            <div className="student-surface-header">
              <div>
                <h2>Application Lifecycle</h2>
                <p className="student-muted mb-0">Track how this opportunity is moving from application to placement.</p>
              </div>
            </div>
            <InternshipLifecyclePanel application={application} roleView="student" dark={isDarkMode} compact />
          </div>
        </section>

        <div className="student-detail-grid">
          <section className="student-surface">
            <div className="student-surface-body">
              <div className="student-surface-header">
                <div>
                  <h2>Cover Letter</h2>
                  <p className="student-muted mb-0">This is the message submitted with your application.</p>
                </div>
              </div>
              <div className="p-3 rounded bg-light">
                <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                  {application.cover_letter || 'No cover letter submitted.'}
                </p>
              </div>
            </div>
          </section>

          <div className="d-grid gap-3">
            <section className="student-surface">
              <div className="student-surface-body">
                <div className="student-surface-header">
                  <div>
                    <h2>Application Package</h2>
                    <p className="student-muted mb-0">Documents and facts submitted to the employer.</p>
                  </div>
                </div>
                <div className="student-history-list">
                  <div className="student-history-item">
                    <span className="student-muted small">Department</span>
                    <div className="fw-bold">{application.department || 'General'}</div>
                  </div>
                  <div className="student-history-item">
                    <span className="student-muted small">Submitted CV</span>
                    {application.application_snapshot?.cv ? (
                      <button
                        className="btn btn-sm btn-outline-primary mt-2 d-flex align-items-center gap-2"
                        onClick={() => {
                          setPreviewTitle('CV / Resume');
                          setPreviewUrl(application.application_snapshot.cv);
                          setPreviewOpen(true);
                        }}
                      >
                        <FileText size={14} />
                        Preview CV
                        <Maximize2 size={14} />
                      </button>
                    ) : (
                      <div className="student-muted">No CV snapshot found.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="student-surface">
              <div className="student-surface-body">
                <div className="student-surface-header">
                  <div>
                    <h2>Need Help?</h2>
                    <p className="student-muted mb-0">Use support when the status appears incorrect or unclear.</p>
                  </div>
                </div>
                <button className={`btn w-100 ${isDarkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}>
                  Contact Support
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {showWithdrawModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content ${isDarkMode ? 'bg-secondary text-white' : ''}`}>
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold">Withdraw Application</h5>
                <button
                  type="button"
                  className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`}
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawReason('');
                  }}
                  disabled={isWithdrawing}
                ></button>
              </div>
              <div className="modal-body">
                <p className={isDarkMode ? 'text-light' : 'text-muted'}>
                  Are you sure you want to withdraw from this application? This action cannot be undone.
                </p>
                <label className={`form-label fw-semibold mb-2 ${isDarkMode ? 'text-light' : ''}`}>
                  Reason for withdrawal (optional)
                </label>
                <textarea
                  className={`form-control ${isDarkMode ? 'bg-dark text-white border-secondary' : ''}`}
                  rows={4}
                  placeholder="Tell us why you're withdrawing..."
                  value={withdrawReason}
                  onChange={(event) => setWithdrawReason(event.target.value)}
                  disabled={isWithdrawing}
                ></textarea>
              </div>
              <div className="modal-footer border-top-0">
                <button
                  type="button"
                  className={`btn ${isDarkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawReason('');
                  }}
                  disabled={isWithdrawing}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleWithdraw} disabled={isWithdrawing}>
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
      />
    </StudentLayout>
  );
};

export default StudentApplicationDetail;
