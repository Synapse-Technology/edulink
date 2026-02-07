import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, Calendar, Building2, CheckCircle, Clock, XCircle, FileText, Maximize2 } from 'lucide-react';
import StudentHeader from '../../components/dashboard/StudentHeader';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import { DocumentPreviewModal } from '../../components/common';
import { internshipService } from '../../services/internship/internshipService';
import type { InternshipApplication } from '../../services/internship/internshipService';
import { useTheme } from '../../contexts/ThemeContext';

const StudentApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
      console.error('Failed to fetch application:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const badges = {
      'APPLIED': { color: 'warning', icon: <Clock size={16} />, text: 'Pending Review' },
      'SHORTLISTED': { color: 'info', icon: <CheckCircle size={16} />, text: 'Shortlisted' },
      'ACCEPTED': { color: 'primary', icon: <CheckCircle size={16} />, text: 'Accepted' },
      'ACTIVE': { color: 'success', icon: <Briefcase size={16} />, text: 'Active Internship' },
      'REJECTED': { color: 'danger', icon: <XCircle size={16} />, text: 'Not Selected' },
      'COMPLETED': { color: 'dark', icon: <CheckCircle size={16} />, text: 'Completed' }
    };
    
    const config = badges[status as keyof typeof badges] || { color: 'secondary', icon: null, text: status };
    
    return (
      <span className={`badge bg-${config.color} d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  // Timeline Helper (simplified for now)
  const getTimelineSteps = (currentStatus: string) => {
    const steps = [
      { status: 'APPLIED', label: 'Applied', date: application?.created_at },
      { status: 'SHORTLISTED', label: 'Shortlisted', date: null },
      { status: 'ACCEPTED', label: 'Accepted', date: null },
      { status: 'ACTIVE', label: 'Started', date: null }
    ];

    const currentIndex = steps.findIndex(s => s.status === currentStatus);
    const isRejected = currentStatus === 'REJECTED';

    return steps.map((step, index) => {
      let stepClass = 'text-muted';
      let iconClass = 'bg-secondary bg-opacity-10 text-secondary';
      
      if (isRejected) {
         // If rejected, everything after APPLIED is greyed out
         // The APPLIED step shows as completed (since they did apply)
         // We could optionally show a RED line or icon for the step where they were rejected, 
         // but since 'REJECTED' isn't a step in the linear happy path, we just stop progress.
         
         if (index === 0) { // Applied is always done
            stepClass = isDarkMode ? 'text-light fw-bold' : 'text-dark fw-bold';
            iconClass = 'bg-success text-white';
            // The line AFTER applied should be red to indicate stoppage
         } else {
            stepClass = 'text-muted';
            iconClass = 'bg-secondary bg-opacity-10 text-secondary';
         }
      } else if (index <= currentIndex) {
        stepClass = isDarkMode ? 'text-light fw-bold' : 'text-dark fw-bold';
        iconClass = 'bg-success text-white';
      }

      // If this is the specific step where rejection "happened" visually (e.g. they were shortlisted then rejected),
      // we don't have that history easily. 
      // So for REJECTED status, we keep it simple: Applied (Green) -> Red Line -> Stops.
      
      return (
        <div key={step.status} className="d-flex flex-column align-items-center position-relative" style={{ width: '25%' }}>
          {index !== 0 && (
            <div 
              className="position-absolute w-100" 
              style={{ 
                height: '2px', 
                backgroundColor: isRejected && index === 1 ? '#dc3545' : (index <= currentIndex && !isRejected ? '#198754' : '#dee2e6'), 
                top: '15px', 
                right: '50%', 
                zIndex: 0,
                transform: 'translateY(-50%)'
              }}
            ></div>
          )}
          <div className={`rounded-circle d-flex align-items-center justify-content-center mb-2 position-relative ${iconClass}`} style={{ width: '30px', height: '30px', zIndex: 1, border: `4px solid ${isDarkMode ? '#1e293b' : 'white'}` }}>
            {/* If rejected and we want to show an X somewhere, we could do it here. 
                But currently we just show 'Applied' as checked, and the rest empty. 
            */}
            {index <= currentIndex && !isRejected ? <CheckCircle size={16} /> : (
              isRejected && index === 1 ? <XCircle size={16} className="text-danger" /> : 
              <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor'}}></div>
            )}
          </div>
          <small className={`text-center ${stepClass}`}>{step.label}</small>
          {step.date && <small className="text-muted text-center" style={{fontSize: '0.7rem'}}>{new Date(step.date).toLocaleDateString()}</small>}
        </div>
      );
    });
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

                  {/* Timeline (Visual Only) */}
                  <div className="py-3 mt-4 border-top border-light">
                    <h6 className={`mb-4 fw-bold ${isDarkMode ? 'text-light' : 'text-dark'}`}>Application Progress</h6>
                    <div className="d-flex justify-content-between px-3">
                      {getTimelineSteps(application.status)}
                    </div>
                  </div>
                </div>
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