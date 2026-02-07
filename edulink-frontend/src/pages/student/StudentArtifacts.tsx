import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download,
  ShieldCheck,
  Award,
  Clock,
  FileDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { artifactService, type Artifact } from '../../services/reports/artifactService';
import { studentService } from '../../services/student/studentService';
import { toast } from 'react-hot-toast';
import StudentDashboardSkeleton from '../../components/student/skeletons/StudentDashboardSkeleton';

const StudentArtifacts: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [internship, setInternship] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [artifactData, internshipData] = await Promise.all([
          artifactService.getArtifacts(),
          studentService.getActiveInternship()
        ]);
        setArtifacts(artifactData);
        setInternship(internshipData);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load artifacts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownload = async (artifact: Artifact) => {
    try {
      toast.loading('Preparing download...', { id: 'download' });
      await artifactService.downloadArtifact(artifact);
      toast.success('Download started!', { id: 'download' });
    } catch (err) {
      toast.error('Failed to download artifact', { id: 'download' });
    }
  };

  const handleGenerate = async (type: 'CERTIFICATE' | 'LOGBOOK_REPORT' | 'PERFORMANCE_SUMMARY') => {
    if (!internship) return;
    
    try {
      setGenerating(type);
      const label = type === 'CERTIFICATE' ? 'Certificate' : type === 'LOGBOOK_REPORT' ? 'Logbook Report' : 'Performance Summary';
      toast.loading(`Generating ${label}...`, { id: 'gen' });
      
      const newArtifact = await artifactService.generateArtifact(internship.id, type);
      setArtifacts([newArtifact, ...artifacts]);
      
      toast.success('Generated successfully!', { id: 'gen' });
    } catch (err) {
      toast.error('Generation failed. Ensure your internship is completed.', { id: 'gen' });
    } finally {
      setGenerating(null);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'CERTIFICATE': return <Award size={24} className="text-success" />;
      case 'LOGBOOK_REPORT': return <FileText size={24} className="text-primary" />;
      case 'PERFORMANCE_SUMMARY': return <RefreshCw size={24} className="text-info" />;
      default: return <FileDown size={24} className="text-info" />;
    }
  };

  // Generation Limit Logic
  const ARTIFACT_LIMITS = {
    'CERTIFICATE': 2,
    'LOGBOOK_REPORT': 5,
    'PERFORMANCE_SUMMARY': 5
  };

  const getGenerationCount = (type: string) => {
     return artifacts.filter(a => a.artifact_type === type).length;
   };

  const isLimitReached = (type: keyof typeof ARTIFACT_LIMITS) => {
    return getGenerationCount(type) >= ARTIFACT_LIMITS[type];
  };

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
          .artifacts-table-container {
            max-height: 600px;
            overflow-y: auto;
            scrollbar-width: thin;
          }
          .artifacts-table-container::-webkit-scrollbar {
            width: 6px;
          }
          .artifacts-table-container::-webkit-scrollbar-thumb {
            background-color: rgba(0,0,0,0.1);
            border-radius: 10px;
          }
          .dark .artifacts-table-container::-webkit-scrollbar-thumb {
            background-color: rgba(255,255,255,0.1);
          }
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        {loading ? (
          <div className="px-4 px-lg-5 pt-5">
            <StudentDashboardSkeleton isDarkMode={isDarkMode} />
          </div>
        ) : (
          <div className="flex-grow-1 px-4 px-lg-5 pb-4">
            {/* Header */}
            <div className="mb-5 mt-4">
              <h2 className={`fw-bold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Artifacts & Professional Reports</h2>
              <p className={`${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                Access your generated certificates and official internship documentation.
              </p>
            </div>

            <div className="row g-4">
              {/* Main Artifacts List */}
              <div className="col-lg-8">
                {artifacts.length > 0 ? (
                  <div className={`card border-0 shadow-sm rounded-4 overflow-hidden`}>
                    <div className="card-header bg-transparent border-0 pt-4 px-4 pb-2">
                      <h5 className="fw-bold mb-0">Your Generated Documents</h5>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive artifacts-table-container">
                        <table className={`table table-hover align-middle mb-0 ${isDarkMode ? 'table-dark' : ''}`}>
                          <thead className={`sticky-top ${isDarkMode ? 'bg-secondary' : 'bg-light'}`} style={{ zIndex: 1, top: 0 }}>
                            <tr>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted">Type</th>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted">Generated On</th>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {artifacts.map((artifact) => (
                              <tr key={artifact.id} className="artifact-row">
                                <td className="py-3 px-4 border-0">
                                  <div className="d-flex align-items-center gap-3">
                                    <div className={`p-2 rounded-3 ${isDarkMode ? 'bg-secondary bg-opacity-20' : 'bg-light'}`}>
                                      {getArtifactIcon(artifact.artifact_type)}
                                    </div>
                                    <div>
                                      <div className="fw-bold">{artifact.artifact_type_display}</div>
                                      <div className="extra-small text-muted">ID: {artifact.id.substring(0, 8)}...</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 border-0 small">
                                  <div className="d-flex align-items-center gap-2">
                                    <Clock size={14} className="text-muted" />
                                    {new Date(artifact.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                </td>
                                <td className="py-3 px-4 border-0 text-end">
                                  <div className="d-flex justify-content-end gap-2">
                                    <Link 
                                      to={`/verify/${artifact.id}`}
                                      target="_blank"
                                      className={`btn btn-sm ${isDarkMode ? 'btn-outline-info' : 'btn-outline-info'} rounded-pill px-3 d-flex align-items-center gap-1`}
                                    >
                                      <ExternalLink size={14} />
                                      Verify
                                    </Link>
                                    <button 
                                      className={`btn btn-sm ${isDarkMode ? 'btn-outline-light' : 'btn-outline-primary'} rounded-pill px-3`}
                                      onClick={() => handleDownload(artifact)}
                                    >
                                      <Download size={14} className="me-1" />
                                      Download
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-5 shadow-sm border-0 rounded-4">
                    <div className="card-body">
                      <div className={`p-4 rounded-circle d-inline-flex mb-4 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                        <FileText size={48} className="text-muted opacity-50" />
                      </div>
                      <h4 className="fw-bold mb-3">No Artifacts Found</h4>
                      <p className="text-muted mb-0 mx-auto" style={{ maxWidth: '400px' }}>
                        You haven't generated any professional artifacts yet. Complete your internship tasks to unlock official certificates and reports.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: Generation Shortcuts */}
              <div className="col-lg-4">
                <div 
                  className={`card border-0 shadow-sm rounded-4 mb-4 ${isDarkMode ? 'bg-primary bg-opacity-10 border border-primary border-opacity-25' : ''}`}
                  style={{ 
                    backgroundColor: isDarkMode ? undefined : '#0d6efd',
                    color: 'white' 
                  }}
                >
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <RefreshCw size={20} className={isDarkMode ? 'text-primary' : 'text-white'} />
                      <h6 className="fw-bold mb-0 text-white">Generate New</h6>
                    </div>
                    <p className={`small mb-4 ${isDarkMode ? 'text-light' : 'text-white opacity-90'}`}>
                      Instantly create official records of your professional progress.
                    </p>
                    
                    <div className="d-grid gap-2">
                      <div className="mb-2">
                        <button 
                          className={`btn ${isDarkMode ? 'btn-primary' : 'btn-light text-primary'} btn-sm py-2 fw-bold d-flex align-items-center justify-content-center gap-2 w-100`}
                          onClick={() => handleGenerate('LOGBOOK_REPORT')}
                          disabled={!internship || !!generating || isLimitReached('LOGBOOK_REPORT')}
                        >
                          {generating === 'LOGBOOK_REPORT' ? (
                            <span className="spinner-border spinner-border-sm" role="status"></span>
                          ) : (
                            <RefreshCw size={16} />
                          )}
                          {isLimitReached('LOGBOOK_REPORT') ? 'Report Limit Reached' : 'Regenerate Logbook Report'}
                        </button>
                        <div className="extra-small text-center mt-1 opacity-75">
                          {getGenerationCount('LOGBOOK_REPORT')} / {ARTIFACT_LIMITS.LOGBOOK_REPORT} generations used
                        </div>
                      </div>

                      <div className="mb-2">
                        <button 
                          className={`btn ${isDarkMode ? 'btn-info' : 'btn-info text-white'} btn-sm py-2 fw-bold d-flex align-items-center justify-content-center gap-2 w-100`}
                          onClick={() => handleGenerate('PERFORMANCE_SUMMARY')}
                          disabled={!internship || !!generating || isLimitReached('PERFORMANCE_SUMMARY')}
                        >
                          {generating === 'PERFORMANCE_SUMMARY' ? (
                            <span className="spinner-border spinner-border-sm" role="status"></span>
                          ) : (
                            <FileText size={16} />
                          )}
                          {isLimitReached('PERFORMANCE_SUMMARY') ? 'Summary Limit Reached' : 'Generate Performance Summary'}
                        </button>
                        <div className="extra-small text-center mt-1 opacity-75">
                          {getGenerationCount('PERFORMANCE_SUMMARY')} / {ARTIFACT_LIMITS.PERFORMANCE_SUMMARY} generations used
                        </div>
                      </div>
                      
                      {['COMPLETED', 'CERTIFIED'].includes(internship?.status) && (
                        <div>
                          <button 
                            className={`btn ${isDarkMode ? 'btn-success' : 'btn-success'} btn-sm py-2 fw-bold d-flex align-items-center justify-content-center gap-2 w-100`}
                            onClick={() => handleGenerate('CERTIFICATE')}
                            disabled={!!generating || internship?.status !== 'CERTIFIED' || isLimitReached('CERTIFICATE')}
                            title={internship?.status !== 'CERTIFIED' ? "Waiting for Institution Certification" : isLimitReached('CERTIFICATE') ? "Maximum generations reached" : "Generate Certificate"}
                          >
                            {generating === 'CERTIFICATE' ? (
                              <span className="spinner-border spinner-border-sm" role="status"></span>
                            ) : (
                              <Award size={16} />
                            )}
                            {internship?.status !== 'CERTIFIED' ? "Pending Certification" : isLimitReached('CERTIFICATE') ? "Certificate Limit Reached" : "Generate Certificate"}
                          </button>
                          <div className="extra-small text-center mt-1 opacity-75">
                            {getGenerationCount('CERTIFICATE')} / {ARTIFACT_LIMITS.CERTIFICATE} generations used
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <h6 className="fw-bold mb-3 small text-uppercase text-muted" style={{ letterSpacing: '0.05em' }}>Security & Audit</h6>
                    <div className="d-flex gap-3 mb-3">
                      <ShieldCheck size={20} className="text-success flex-shrink-0" />
                      <p className="small text-muted mb-0">
                        All generated artifacts are permanently recorded in the <strong>Edulink Ledger</strong> for verification by employers and academic boards.
                      </p>
                    </div>
                    <div className="d-flex gap-3">
                      <Clock size={20} className="text-info flex-shrink-0" />
                      <p className="small text-muted mb-0">
                        Artifacts capture your profile and logbook data at the exact moment of generation.
                      </p>
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

export default StudentArtifacts;
