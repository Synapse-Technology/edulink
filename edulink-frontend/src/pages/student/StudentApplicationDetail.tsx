import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, Calendar, Building2, CheckCircle, Clock, XCircle, FileText, Maximize2, AlertCircle, Trash2 } from 'lucide-react';
import StudentHeader from '../../components/dashboard/StudentHeader';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import { DocumentPreviewModal } from '../../components/common';
import { internshipService } from '../../services/internship/internshipService';
import { showToast } from '../../utils/toast';
import type { InternshipApplication } from '../../services/internship/internshipService';
import { useTheme } from '../../contexts/ThemeContext';
import InternshipLifecyclePanel from '../../components/internship/InternshipLifecyclePanel';

const StudentApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Theme state from context
  const { isDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    } catch (error) {
      console.error("Error:", error); showToast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;
    
    try {
      setIsWithdrawing(true);
      await internshipService.withdrawApplication(application.id, withdrawReason);
      
      // Refresh application data
      await fetchApplication(application.id);
      setShowWithdrawModal(false);
      setWithdrawReason('');
      
      // Show success message
      showToast.success('Application withdrawn successfully');
    } catch (error: any) {
      console.error('Failed to withdraw application:', error);
      alert(error.message || 'Failed to withdraw application. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const canWithdraw = application && 
    ['APPLIED', 'SHORTLISTED', 'ACCEPTED'].includes(application.status);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const badges = {
      'APPLIED': { color: 'warning', icon: <Clock size={16} />, text: 'Pending Review' },
      'SHORTLISTED': { color: 'info', icon: <CheckCircle size={16} />, text: 'Shortlisted' },
      'ACCEPTED': { color: 'primary', icon: <CheckCircle size={16} />, text: 'Accepted' },
      'WITHDRAWN': { color: 'secondary', icon: <AlertCircle size={16} />, text: 'Withdrawn' },
      'ACTIVE': { color: 'success', icon: <Briefcase size={16} />, text: 'Active Internship' },
      'REJECTED': { color: 'danger', icon: <XCircle size={16} />, text: 'Not Selected' },
      'COMPLETED': { color: 'dark', icon: <CheckCircle size={16} />, text: 'Completed' },
      'CERTIFIED': { color: 'success', icon: <CheckCircle size={16} />, text: 'Certified' }
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
      <div className={`min-vh-100 d-flex ${isDarkMode ? 'bg-dark text-white' : 'bg-light'}`}>
        <div className="d-flex align-items-center justify-content-center w-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className={`min-vh-100 d-flex ${isDarkMode ? 'bg-dark text-white' : 'bg-light'}`}>
        <div className="container py-5 text-center">
          <h3>Application not found</h3>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/dashboard/student/applications')}>
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  const employerName = application.employer_details?.name || 'Unknown Employer';
  const location = application.location_type === 'ONSITE' ? application.location : application.location_type;

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={closeMobileMenu}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      {/* Main Content */}
      <div 
        className="d-flex flex-column min-vh-100 overflow-auto main-content-margin"
        onClick={isMobileMenuOpen ? closeMobileMenu : undefined}
      >
        <style>{`
          .main-content-margin {
            margin-left: 0;
            max-width: 100vw;
          }
          @media (min-width: 992px) {
            .main-content-margin {
              margin-left: 280px !important;
              max-width: calc(100vw - 280px) !important;
            }
          }
          .step-icon {
            background-color: ${isDarkMode ? '#334155' : 'rgba(0,0,0,0.05)'} !important;
          }
          .step-icon.active {
            background-color: #0d6efd !important;
          }
        `}</style>

        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        <div className="px-4 px-lg-5 py-4">
          <button 
            className={`btn btn-link text-decoration-none ps-0 mb-4 d-flex align-items-center ${isDarkMode ? 'text-info' : 'text-muted'}`}
            onClick={() => navigate('/dashboard/student/applications')}
          >
            <ArrowLeft size={20} className="me-2" />
            Back to My Applications
          </button>

          <div className="row g-4">
            <div className="col-lg-8">
              {/* Header Card */}
              <div className={`card border-0 shadow-sm mb-4 ${isDarkMode ? 'bg-secondary text-white' : 'bg-white'}`}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div className="d-flex align-items-center">
                      <div className={`rounded-circle d-flex align-items-center justify-content-center me-4 ${isDarkMode ? 'bg-dark' : 'bg-light'}`} style={{width: '64px', height: '64px'}}>
                        <Building2 size={32} className={isDarkMode ? 'text-info' : 'text-primary'} />
                      </div>
                      <div>
                        <h2 className={`fw-bold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`}>{application.title}</h2>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`fw-medium ${isDarkMode ? 'text-info' : 'text-primary'}`}>{employerName}</span>
                          <span className={isDarkMode ? 'text-light opacity-50' : 'text-muted'}>•</span>
                          <span className={`d-flex align-items-center ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                            <MapPin size={14} className="me-1" />
                            {location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(application.status)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canWithdraw && (
                    <div className="py-3 mt-4 border-top border-light">
                      <button
                        className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2"
                        onClick={() => setShowWithdrawModal(true)}
                      >
                        <Trash2 size={16} />
                        Withdraw Application
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <InternshipLifecyclePanel
                  application={application}
                  roleView="student"
                  dark={isDarkMode}
                />
              </div>

              {/* Cover Letter Card */}
              <div className={`card border-0 shadow-sm mb-4 ${isDarkMode ? 'bg-secondary text-white' : 'bg-white'}`}>
                <div className="card-body p-4">
                  <h5 className={`fw-bold mb-3 ${isDarkMode ? 'text-white' : 'text-dark'}`}>My Cover Letter</h5>
                  <div className={`p-3 rounded ${isDarkMode ? 'bg-dark' : 'bg-light'}`}>
                    <p className={`mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`} style={{ whiteSpace: 'pre-wrap' }}>
                      {application.cover_letter || 'No cover letter submitted.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              {/* Info Card */}
              <div className={`card border-0 shadow-sm mb-4 ${isDarkMode ? 'bg-secondary text-white' : 'bg-white'}`}>
                <div className="card-body p-4">
                  <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Application Details</h5>
                  
                  <div className="mb-4">
                    <small className={`d-block mb-1 ${isDarkMode ? 'text-light opacity-50' : 'text-muted'}`}>Applied On</small>
                    <div className="d-flex align-items-center fw-medium">
                      <Calendar size={18} className={`me-2 ${isDarkMode ? 'text-info' : 'text-primary'}`} />
                      {new Date(application.created_at || '').toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mb-4">
                    <small className={`d-block mb-1 ${isDarkMode ? 'text-light opacity-50' : 'text-muted'}`}>Department</small>
                    <div className="d-flex align-items-center fw-medium">
                      <Briefcase size={18} className={`me-2 ${isDarkMode ? 'text-info' : 'text-primary'}`} />
                      {application.department}
                    </div>
                  </div>

                  <div>
                    <small className={`d-block mb-1 ${isDarkMode ? 'text-light opacity-50' : 'text-muted'}`}>Submitted Documents</small>
                    <div className="d-flex flex-column gap-2 mt-2">
                       {application.application_snapshot?.cv && (
                         <div 
                           className={`d-flex align-items-center justify-content-between p-2 rounded cursor-pointer transition-all hover-lift ${isDarkMode ? 'bg-dark border border-secondary' : 'bg-light'}`}
                           onClick={() => {
                             setPreviewTitle('CV / Resume');
                             setPreviewUrl(application.application_snapshot.cv);
                             setPreviewOpen(true);
                           }}
                         >
                           <div className="d-flex align-items-center">
                             <FileText size={16} className="me-2 text-danger" />
                             <span className="small">CV / Resume</span>
                           </div>
                           <Maximize2 size={14} className="text-muted" />
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Help Card */}
              <div className={`card border-0 shadow-sm ${isDarkMode ? 'bg-secondary text-white' : 'bg-white'}`}>
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-2">Need Help?</h6>
                  <p className={`small mb-3 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                    If you have questions about your application status, please contact the employer directly or reach out to support.
                  </p>
                  <button className={`btn w-100 ${isDarkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}>
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal Modal */}
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
                  <div className="mb-3">
                    <label className={`form-label fw-semibold mb-2 ${isDarkMode ? 'text-light' : ''}`}>
                      Reason for withdrawal (optional)
                    </label>
                    <textarea
                      className={`form-control ${isDarkMode ? 'bg-dark text-white border-secondary' : ''}`}
                      rows={4}
                      placeholder="Tell us why you're withdrawing..."
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      disabled={isWithdrawing}
                    ></textarea>
                    <small className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                      Your feedback helps us improve
                    </small>
                  </div>
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
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                  >
                    {isWithdrawing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Withdrawing...
                      </>
                    ) : (
                      'Withdraw Application'
                    )}
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
      </div>
    </div>
  );
};

export default StudentApplicationDetail;
