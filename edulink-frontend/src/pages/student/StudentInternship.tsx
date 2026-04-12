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
  AlertTriangle,
  Download,
  Share2,
  Check,
  Loader
} from 'lucide-react';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { studentService } from '../../services/student/studentService';
import type { Artifact } from '../../services/reports/artifactService';
import { artifactService } from '../../services/reports/artifactService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { dateFormatter } from '../../utils/dateFormatter';
import type { Internship } from '../../types/internship';
import StudentInternshipSkeleton from '../../components/student/skeletons/StudentInternshipSkeleton';
import ReportIncidentModal from '../../components/student/ReportIncidentModal';

const StudentInternship: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Artifact state management
  const [generatingArtifacts, setGeneratingArtifacts] = useState<Record<string, boolean>>({});
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedArtifactForShare, setSelectedArtifactForShare] = useState<Artifact | null>(null);

  // Suppress unused warning
  useEffect(() => {
    void user;
  }, [user]);

  useEffect(() => {
    const fetchActiveInternship = async () => {
      try {
        const data = await studentService.getActiveInternship();
        if (data) {
          // Extract Internship from InternshipApplication
          const internshipData = (data as any).internship || (data as any);
          setInternship(internshipData);
        }
        
        // Also fetch existing artifacts
        const existingArtifacts = await artifactService.getArtifacts();
        setArtifacts(existingArtifacts);
      } catch (err) {
        const message = getErrorMessage(err, { action: 'Load Internship' });
        showToast.error(message);
        logError(err, { action: 'Load Internship' });
      } finally {
        setLoading(false);
      }
    };

    fetchActiveInternship();
  }, []);

  const handleGenerateArtifact = async (artifactType: string) => {
    if (!internship) return;
    
    const genKey = artifactType;
    setGeneratingArtifacts(prev => ({ ...prev, [genKey]: true }));
    
    let toastId: string | undefined;
    try {
      toastId = showToast.loading(`Generating ${artifactType.replace('_', ' ').toLowerCase()}...`);
      
      // Generate the artifact
      const artifact = await artifactService.generateArtifact(internship.id, artifactType);
      
      // Poll for completion
      const finalStatus = await artifactService.pollArtifactStatus(artifact.id);
      
      if (finalStatus.status === 'SUCCESS') {
        // Refresh artifacts list
        const updatedArtifacts = await artifactService.getArtifacts();
        setArtifacts(updatedArtifacts);
        showToast.success(`${artifactType.replace('_', ' ')} generated successfully!`);
        
        // Auto-download certificate
        if (artifactType === 'CERTIFICATE') {
          const generatedArtifact = updatedArtifacts.find(a => a.artifact_type === 'CERTIFICATE' && a.id === artifact.id);
          if (generatedArtifact) {
            setTimeout(() => artifactService.downloadArtifact(generatedArtifact), 500);
          }
        }
      } else if (finalStatus.status === 'FAILED') {
        showToast.error(`Failed to generate ${artifactType.replace('_', ' ')}: ${finalStatus.error_message || 'Unknown error'}`);
      }
    } catch (err) {
      if (toastId) showToast.dismiss(toastId);
      const message = getErrorMessage(err, { action: 'Generate Artifact' });
      showToast.error(message);
      logError(err, { action: 'Generate Artifact', data: { artifactType } });
    } finally {
      if (toastId) showToast.dismiss(toastId);
      setGeneratingArtifacts(prev => ({ ...prev, [genKey]: false }));
    }
  };

  const handleShareArtifact = (artifact: Artifact) => {
    setSelectedArtifactForShare(artifact);
    setShowShareModal(true);
  };

  const copyVerificationLink = async (artifactId: string) => {
    // Validate input
    if (!artifactId || typeof artifactId !== 'string') {
      showToast.error('Invalid artifact. Please refresh and try again.');
      return;
    }

    const link = `${window.location.origin}/verify/${artifactId}`;

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        showToast.success('Verification link copied to clipboard!');
        return;
      }

      // Fallback: Manual copy using textarea
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      if (document.execCommand('copy')) {
        showToast.success('Verification link copied to clipboard!');
      } else {
        throw new Error('Copy command not supported');
      }

      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Clipboard error:', err);

      if (err instanceof Error && err.name === 'NotAllowedError') {
        showToast.error('Browser clipboard access denied. Please copy manually from the modal.');
      } else {
        showToast.error('Could not copy link. Please copy manually from the modal.');
      }
    }
  };

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
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
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
                            {dateFormatter.shortDate(internship.start_date || internship.created_at)}
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
                       {['COMPLETED', 'CERTIFIED'].includes(internship.status) ? (
                         <div className="mt-4 pt-3 border-top border-success border-opacity-25">
                           <h6 className="fw-bold mb-3 small text-success-emphasis text-uppercase" style={{ letterSpacing: '0.05em' }}>Professional Artifacts</h6>
                           <div className="d-grid gap-2">
                             {/* Certificate */}
                             <div className={`p-3 rounded-3 border ${isDarkMode ? 'bg-dark border-secondary' : 'bg-light border-light shadow-sm'}`}>
                               <div className="d-flex align-items-center justify-content-between mb-2">
                                 <div className="d-flex align-items-center gap-2">
                                   <FileText size={16} className="text-primary" />
                                   <span className="fw-bold small">Completion Certificate</span>
                                 </div>
                                 {artifacts.some(a => a.artifact_type === 'CERTIFICATE') && (
                                   <Check size={16} className="text-success" />
                                 )}
                               </div>
                               <button
                                 className="btn btn-sm btn-primary w-100 py-1 fw-bold d-flex align-items-center justify-content-center gap-2"
                                 onClick={() => handleGenerateArtifact('CERTIFICATE')}
                                 disabled={generatingArtifacts['CERTIFICATE']}
                                 aria-busy={generatingArtifacts['CERTIFICATE']}
                                 aria-label={generatingArtifacts['CERTIFICATE'] ? 'Generating completion certificate, please wait' : 'Generate your completion certificate'}
                                 title={generatingArtifacts['CERTIFICATE'] ? 'Generating certificate...' : 'Generate your professional completion certificate'}
                               >
                                 {generatingArtifacts['CERTIFICATE'] ? (
                                   <>
                                     <Loader size={14} className="spinner-animation" aria-hidden="true" />
                                     <span className="ms-2">Generating...</span>
                                   </>
                                 ) : (
                                   <>
                                     <FileText size={14} aria-hidden="true" />
                                     <span className="ms-2">Generate Certificate</span>
                                   </>
                                 )}
                               </button>
                             </div>

                             {/* Logbook Report */}
                             <div className={`p-3 rounded-3 border ${isDarkMode ? 'bg-dark border-secondary' : 'bg-light border-light shadow-sm'}`}>
                               <div className="d-flex align-items-center justify-content-between mb-2">
                                 <div className="d-flex align-items-center gap-2">
                                   <FileText size={16} className="text-info" />
                                   <span className="fw-bold small">Logbook Report</span>
                                 </div>
                                 {artifacts.some(a => a.artifact_type === 'LOGBOOK_REPORT') && (
                                   <Check size={16} className="text-success" />
                                 )}
                               </div>
                               <button
                                 className="btn btn-sm btn-info w-100 py-1 fw-bold d-flex align-items-center justify-content-center gap-2"
                                 onClick={() => handleGenerateArtifact('LOGBOOK_REPORT')}
                                 disabled={generatingArtifacts['LOGBOOK_REPORT']}
                                 aria-busy={generatingArtifacts['LOGBOOK_REPORT']}
                                 aria-label={generatingArtifacts['LOGBOOK_REPORT'] ? 'Generating logbook report, please wait' : 'Generate your logbook report'}
                                 title={generatingArtifacts['LOGBOOK_REPORT'] ? 'Generating report...' : 'Generates a comprehensive report of your logbook entries'}
                               >
                                 {generatingArtifacts['LOGBOOK_REPORT'] ? (
                                   <>
                                     <Loader size={14} className="spinner-animation" aria-hidden="true" />
                                     <span className="ms-2">Generating...</span>
                                   </>
                                 ) : (
                                   <>
                                     <FileText size={14} aria-hidden="true" />
                                     <span className="ms-2">Generate Logbook Report</span>
                                   </>
                                 )}
                               </button>
                             </div>

                             {/* Performance Summary */}
                             <div className={`p-3 rounded-3 border ${isDarkMode ? 'bg-dark border-secondary' : 'bg-light border-light shadow-sm'}`}>
                               <div className="d-flex align-items-center justify-content-between mb-2">
                                 <div className="d-flex align-items-center gap-2">
                                   <Award size={16} className="text-warning" />
                                   <span className="fw-bold small">Performance Summary</span>
                                 </div>
                                 {artifacts.some(a => a.artifact_type === 'PERFORMANCE_SUMMARY') && (
                                   <Check size={16} className="text-success" />
                                 )}
                               </div>
                               <button
                                 className="btn btn-sm btn-warning w-100 py-1 fw-bold d-flex align-items-center justify-content-center gap-2"
                                 onClick={() => handleGenerateArtifact('PERFORMANCE_SUMMARY')}
                                 disabled={generatingArtifacts['PERFORMANCE_SUMMARY']}
                                 aria-busy={generatingArtifacts['PERFORMANCE_SUMMARY']}
                                 aria-label={generatingArtifacts['PERFORMANCE_SUMMARY'] ? 'Generating performance summary, please wait' : 'Generate your performance summary'}
                                 title={generatingArtifacts['PERFORMANCE_SUMMARY'] ? 'Generating summary...' : 'Generate a summary of your performance during the internship'}
                               >
                                 {generatingArtifacts['PERFORMANCE_SUMMARY'] ? (
                                   <>
                                     <Loader size={14} className="spinner-animation" aria-hidden="true" />
                                     <span className="ms-2">Generating...</span>
                                   </>
                                 ) : (
                                   <>
                                     <Award size={14} aria-hidden="true" />
                                     <span className="ms-2">Generate Performance Summary</span>
                                   </>
                                 )}
                               </button>
                             </div>

                             {/* Existing Artifacts Download Section */}
                             <div className="mt-3 pt-3 border-top border-secondary border-opacity-25">
                               {artifacts.length > 0 ? (
                                 <>
                                   <h6 className="small fw-bold mb-2">Your Generated Artifacts</h6>
                                   {artifacts.map((artifact) => (
                                   <div key={artifact.id} className={`p-2 rounded-2 mb-2 d-flex align-items-center justify-content-between ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                                     <div className="d-flex align-items-center gap-2 flex-grow-1">
                                       <FileText size={14} />
                                       <div>
                                         <div className="small fw-bold">{artifact.artifact_type_display}</div>
                                       <small className="text-muted">{dateFormatter.shortDate(artifact.created_at)}</small>
                                       </div>
                                     </div>
                                     <div className="d-flex gap-1">
                                       <button
                                         className="btn btn-sm btn-outline-primary"
                                         onClick={() => artifactService.downloadArtifact(artifact)}
                                         title="Download"
                                       >
                                         <Download size={14} />
                                       </button>
                                       <button
                                         className="btn btn-sm btn-outline-secondary"
                                         onClick={() => handleShareArtifact(artifact)}
                                         title="Share"
                                       >
                                         <Share2 size={14} />
                                       </button>
                                     </div>
                                   </div>
                                 ))}
                                 </>
                               ) : (
                                 <div className={`p-4 rounded-3 text-center ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                                   <FileText size={24} className="text-muted mb-2 d-block" />
                                   <p className="text-muted mb-0 small">
                                     No artifacts generated yet. Generate your first certificate above to get started!
                                   </p>
                                 </div>
                               )}
                             </div>
                           </div>
                       </div>
                     ) : internship.status === 'COMPLETED' ? (
                        <div className="mt-4 pt-3 border-top border-warning border-opacity-25">
                           <h6 className="fw-bold mb-2 small text-warning-emphasis text-uppercase" style={{ letterSpacing: '0.05em' }}>Certification Pending</h6>
                           <p className="small text-muted mb-0">Your internship is completed and pending final certification from your institution.</p>
                        </div>
                     ) : null}
                  </div>

                  {/* Support & Safety */}
                  <div className="mt-4 pt-3 border-top border-secondary border-opacity-10">
                     <h6 className={`fw-bold mb-3 small text-uppercase ${isDarkMode ? 'text-light opacity-50' : 'text-muted'}`} style={{ letterSpacing: '0.05em' }}>Support & Safety</h6>
                     <button 
                       className="btn btn-outline-danger btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                       onClick={() => setShowIncidentModal(true)}
                     >
                       <AlertTriangle size={16} />
                       Report an Incident
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {showShareModal && selectedArtifactForShare && (
        <div 
          className="modal d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowShareModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-content ${isDarkMode ? 'bg-dark text-white border-secondary' : ''}`}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title">Share Verification Link</h5>
                <button 
                  type="button" 
                  className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`}
                  onClick={() => setShowShareModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3 text-muted">Share this link with others to verify the authenticity of your artifact. No login required for verification.</p>
                
                <div className={`p-3 rounded-3 mb-3 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                  <small className={`d-block mb-2 fw-bold ${isDarkMode ? 'text-light' : 'text-dark'}`}>Verification Link</small>
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-white border-secondary' : ''}`}
                      value={`${window.location.origin}/verify/${selectedArtifactForShare.id}`}
                      readOnly
                    />
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => copyVerificationLink(selectedArtifactForShare.id)}
                      title="Copy link"
                    >
                      <FileText size={14} />
                    </button>
                  </div>
                </div>

                <div className={`p-3 rounded-3 small ${isDarkMode ? 'bg-info bg-opacity-10 border border-info border-opacity-25' : 'bg-info bg-opacity-10'}`}>
                  <strong>What can verifiers see?</strong>
                  <ul className="mb-0 ps-3 mt-2">
                    <li>Your name</li>
                    <li>Document type</li>
                    <li>Generation date & ledger confirmation</li>
                    <li>Tracking code for authenticity</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowShareModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {internship && (
        <ReportIncidentModal 
          show={showIncidentModal} 
          onHide={() => setShowIncidentModal(false)} 
          applicationId={internship.id} 
        />
      )}
    </div>
  </div>
);
};

export default StudentInternship;
