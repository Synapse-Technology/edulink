import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  UserCheck,
  Calendar,
  Building,
  MapPin,
  Clock,
  Award,
  Mail,
  ShieldCheck,
  FileText,
  Download
} from 'lucide-react';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { studentService } from '../../services/student/studentService';
import { artifactService } from '../../services/reports/artifactService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import StudentInternshipSkeleton from '../../components/student/skeletons/StudentInternshipSkeleton';

const StudentInternship: React.FC = () => {
  const { user } = useAuth();
  const [internship, setInternship] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suppress unused warning
  useEffect(() => {
    void user;
    void error;
    void setError;
  }, [user, error]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);

  useEffect(() => {
    const fetchActiveInternship = async () => {
      try {
        const data = await studentService.getActiveInternship();
        setInternship(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load active internship');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveInternship();
  }, []);

  const handleDownloadCertificate = async () => {
    if (!internship) return;
    
    try {
      setGeneratingCert(true);
      toast.loading('Generating your certificate...', { id: 'cert-gen' });
      
      const artifact = await artifactService.generateArtifact(internship.id, 'CERTIFICATE');
      await artifactService.downloadArtifact(artifact);
      
      toast.success('Certificate downloaded successfully!', { id: 'cert-gen' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate certificate. Please ensure your internship is fully completed.', { id: 'cert-gen' });
    } finally {
      setGeneratingCert(false);
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Sidebar & Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      <div 
        className="d-flex flex-column min-vh-100 overflow-auto main-content-margin"
        onClick={isMobileMenuOpen ? () => setIsMobileMenuOpen(false) : undefined}
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
          .card {
            background-color: ${isDarkMode ? '#1e293b' : 'white'} !important;
            border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'} !important;
            transition: all 0.3s ease;
          }
          .card:hover {
            border-color: ${isDarkMode ? '#475569' : '#cbd5e1'} !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'}) !important;
          }
          .text-muted {
            color: ${isDarkMode ? '#94a3b8' : '#6c757d'} !important;
          }
          .bg-light {
            background-color: ${isDarkMode ? '#1e293b' : '#f8f9fa'} !important;
          }
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </div>

        {loading ? (
          <StudentInternshipSkeleton isDarkMode={isDarkMode} />
        ) : !internship ? (
          <div className="flex-grow-1 px-4 px-lg-5 pb-4 d-flex flex-column justify-content-center align-items-center text-center">
            <Briefcase size={48} className="text-muted mb-3" />
            <h3>No Active Internship</h3>
            <p className="text-muted">You don't have an active internship at the moment.</p>
          </div>
        ) : (
          <div className="flex-grow-1 px-4 px-lg-5 pb-5">
            {/* Page Title */}
            <div className="mb-5">
              <h2 className={`fw-bold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`}>My Internship</h2>
              <p className={isDarkMode ? 'text-light opacity-50' : 'text-muted'}>Track your progress and stay connected with your mentors.</p>
            </div>

            {/* Main Internship Card */}
            <div className={`card border-0 shadow-sm overflow-hidden rounded-4 ${isDarkMode ? 'bg-dark border border-secondary' : 'bg-white'}`}>
              {/* Decorative Header Accent */}
              <div className="bg-primary" style={{ height: '6px' }}></div>
              
              <div className="card-body p-0">
                <div className="row g-0">
                  {/* Left Column: Internship Info */}
                  <div className="col-lg-8 p-4 p-xl-5 border-end-lg">
                    <style>{`
                      @media (min-width: 992px) {
                        .border-end-lg { border-right: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#f0f0f0'} !important; }
                      }
                    `}</style>
                    
                    <div className="d-flex align-items-start mb-4">
                      {internship.employer_details?.logo ? (
                        <div className="me-4 flex-shrink-0">
                          <img 
                            src={internship.employer_details.logo} 
                            alt={internship.employer_details?.name || 'Company'} 
                            className="rounded-3 object-fit-cover bg-white border p-1"
                            style={{ width: '80px', height: '80px' }}
                          />
                        </div>
                      ) : (
                        <div className="rounded-3 p-3 bg-primary bg-opacity-10 me-4 flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                          <Building size={40} className="text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h3 className={`fw-bold mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>{internship.title}</h3>
                          <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1 fw-medium" style={{ fontSize: '0.7rem' }}>
                            {internship.status}
                          </span>
                        </div>
                        <p className={`mb-0 fs-5 fw-medium ${isDarkMode ? 'text-light' : 'text-primary'}`}>
                          {internship.employer_details?.name || 'Unknown Employer'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Meta Info Grid */}
                    <div className="row g-3 mb-5">
                      <div className="col-sm-6 col-md-4">
                        <div className={`p-3 rounded-3 h-100 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light bg-opacity-50'}`}>
                          <div className="text-muted small mb-1 d-flex align-items-center">
                            <MapPin size={14} className="me-1" /> Location
                          </div>
                          <div className={`fw-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>{internship.location || 'Remote'}</div>
                        </div>
                      </div>
                      <div className="col-sm-6 col-md-4">
                        <div className={`p-3 rounded-3 h-100 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light bg-opacity-50'}`}>
                          <div className="text-muted small mb-1 d-flex align-items-center">
                            <Clock size={14} className="me-1" /> Arrangement
                          </div>
                          <div className={`fw-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>Full Time</div>
                        </div>
                      </div>
                      <div className="col-sm-6 col-md-4">
                        <div className={`p-3 rounded-3 h-100 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light bg-opacity-50'}`}>
                          <div className="text-muted small mb-1 d-flex align-items-center">
                            <Calendar size={14} className="me-1" /> Started On
                          </div>
                          <div className={`fw-semibold ${isDarkMode ? 'text-white' : 'text-dark'}`}>
                            {new Date(internship.start_date || internship.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-0">
                      <h6 className={`text-uppercase small fw-bold mb-3 ${isDarkMode ? 'text-light opacity-50' : 'text-muted'}`} style={{ letterSpacing: '0.05em' }}>
                        Internship Description
                      </h6>
                      <div className={`${isDarkMode ? 'text-light opacity-75' : 'text-secondary'}`} style={{ lineHeight: '1.7', fontSize: '0.95rem' }}>
                        {internship.description || 'No description available for this internship.'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Supervision Team */}
                  <div className={`col-lg-4 p-4 p-xl-5 ${isDarkMode ? 'bg-black bg-opacity-10' : 'bg-light bg-opacity-25'}`}>
                    <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Supervision Team</h5>
                    
                    {/* Employer Supervisor */}
                    <div className="mb-4">
                      <div className="d-flex align-items-center mb-2">
                        <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center text-primary me-2" style={{ width: '32px', height: '32px' }}>
                          <UserCheck size={16} />
                        </div>
                        <span className={`fw-bold small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Employer Supervisor</span>
                      </div>
                      
                      {internship.employer_supervisor_details ? (
                        <div className={`p-3 rounded-3 border ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white border-light shadow-sm'}`}>
                          <div className={`fw-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.9rem' }}>
                            {internship.employer_supervisor_details.name}
                          </div>
                          <div className="d-flex align-items-center text-primary small">
                            <Mail size={12} className="me-2 flex-shrink-0" />
                            <a 
                              href={`mailto:${internship.employer_supervisor_details.email}`} 
                              className="text-decoration-none text-primary text-break fw-medium"
                              style={{ fontSize: '0.8rem' }}
                            >
                              {internship.employer_supervisor_details.email}
                            </a>
                          </div>
                          <div className="mt-2">
                            <span className="badge bg-primary bg-opacity-10 text-primary border-0 fw-normal" style={{ fontSize: '0.65rem' }}>
                              Industry Mentor
                            </span>
                          </div>
                        </div>
                      ) : internship.employer_supervisor_id ? (
                        <div className={`p-3 rounded-3 border border-dashed text-center ${isDarkMode ? 'border-secondary' : 'border-light'}`}>
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                          <small className="text-info fst-italic">Resolving supervisor profile...</small>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-3 border border-dashed text-center ${isDarkMode ? 'border-secondary' : 'border-light'}`}>
                          <small className="text-muted fst-italic">Pending assignment</small>
                        </div>
                      )}
                    </div>

                    {/* Institution Supervisor */}
                    <div className="mb-5">
                      <div className="d-flex align-items-center mb-2">
                        <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center text-success me-2" style={{ width: '32px', height: '32px' }}>
                          <ShieldCheck size={16} />
                        </div>
                        <span className={`fw-bold small ${isDarkMode ? 'text-white' : 'text-dark'}`}>Institution Supervisor</span>
                      </div>
                      
                      {internship.institution_supervisor_details ? (
                        <div className={`p-3 rounded-3 border ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white border-light shadow-sm'}`}>
                          <div className={`fw-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.9rem' }}>
                            {internship.institution_supervisor_details.name}
                          </div>
                          <div className="d-flex align-items-center text-success small">
                            <Mail size={12} className="me-2 flex-shrink-0" />
                            <a 
                              href={`mailto:${internship.institution_supervisor_details.email}`} 
                              className="text-decoration-none text-success text-break fw-medium"
                              style={{ fontSize: '0.8rem' }}
                            >
                              {internship.institution_supervisor_details.email}
                            </a>
                          </div>
                          <div className="mt-2">
                            <span className="badge bg-success bg-opacity-10 text-success border-0 fw-normal" style={{ fontSize: '0.65rem' }}>
                              Academic Coordinator
                            </span>
                          </div>
                        </div>
                      ) : internship.institution_supervisor_id ? (
                        <div className={`p-3 rounded-3 border border-dashed text-center ${isDarkMode ? 'border-secondary' : 'border-light'}`}>
                          <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                          <small className="text-info fst-italic">Resolving supervisor profile...</small>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-3 border border-dashed text-center ${isDarkMode ? 'border-secondary' : 'border-light'}`}>
                          <small className="text-muted fst-italic">Pending assignment</small>
                        </div>
                      )}
                    </div>
                    
                    <div className={`p-4 rounded-4 ${isDarkMode ? 'bg-success bg-opacity-10 border border-success border-opacity-25' : 'bg-success bg-opacity-10 border border-success border-opacity-10'}`}>
                       <h6 className="fw-bold mb-3 small text-success-emphasis text-uppercase" style={{ letterSpacing: '0.05em' }}>Performance Status</h6>
                       <div className="d-flex align-items-center gap-3 mb-3">
                          <div className="bg-success rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm">
                            <Award size={20} className="text-white" />
                          </div>
                          <div>
                            <span className="fw-bold text-success d-block">
                              {['COMPLETED', 'CERTIFIED'].includes(internship.status) ? 'Successfully Completed' : 'Active & On Track'}
                            </span>
                            <small className="text-success opacity-75">
                              {internship.logbook_count > 0 
                                ? `${internship.logbook_count} logbook${internship.logbook_count > 1 ? 's' : ''} submitted` 
                                : 'No logbooks submitted yet'}
                            </small>
                          </div>
                       </div>

                       {/* Professional Artifacts Actions */}
                       {['COMPLETED', 'CERTIFIED'].includes(internship.status) && (
                         <div className="mt-4 pt-3 border-top border-success border-opacity-25">
                           <h6 className="fw-bold mb-3 small text-success-emphasis text-uppercase" style={{ letterSpacing: '0.05em' }}>Professional Artifacts</h6>
                           <div className="d-grid gap-2">
                             <button 
                               className="btn btn-success btn-sm py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm transition-all hover-lift"
                               onClick={handleDownloadCertificate}
                               disabled={generatingCert}
                             >
                               {generatingCert ? (
                                 <span className="spinner-border spinner-border-sm" role="status"></span>
                               ) : (
                                 <FileText size={16} />
                               )}
                               Download Certificate
                             </button>
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentInternship;
