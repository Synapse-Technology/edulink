import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  Briefcase,
  AlertCircle,
  Download,
  User
} from 'lucide-react';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { studentService } from '../../services/student/studentService';
import { useAuth } from '../../contexts/AuthContext';
import LogbookDetailSkeleton from '../../components/student/skeletons/LogbookDetailSkeleton';
import { Badge, Card, Button } from 'react-bootstrap';
import { generateLogbookPDF } from '../../utils/pdfGenerator';
import { toast } from 'react-hot-toast';

const StudentLogbookDetail: React.FC = () => {
  const { evidenceId } = useParams<{ evidenceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [evidence, setEvidence] = useState<any | null>(null);
  const [internship, setInternship] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!evidenceId) return;
        
        // We need to find the evidence details. 
        // studentService.getEvidence(internshipId) returns a list.
        // For simplicity, we'll fetch the active internship first, then get its evidence.
        const activeInternship = await studentService.getActiveInternship();
        setInternship(activeInternship);
        
        if (activeInternship) {
          const history = await studentService.getEvidence(activeInternship.id);
          const found = history.find(e => e.id === evidenceId);
          setEvidence(found);
        }
      } catch (err) {
        console.error("Failed to fetch logbook details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [evidenceId]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const sharedStyles = (
    <style>{`
      .main-content-margin {
        margin-left: 0;
        width: 100%;
      }
      @media (min-width: 992px) {
        .main-content-margin {
          margin-left: 280px !important;
          width: calc(100% - 280px) !important;
        }
      }
      .log-detail-card {
          transition: all 0.3s ease;
          border: 1px solid ${isDarkMode ? '#334155' : '#f3f4f6'};
          background-color: ${isDarkMode ? '#1e293b' : 'white'} !important;
      }
      .log-detail-card:hover {
          border-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
      }
      .entry-item {
          position: relative;
          padding-left: 2.5rem;
      }
      .entry-item::before {
          content: '';
          position: absolute;
          left: 0.75rem;
          top: 0;
          bottom: 0;
          width: 2px;
          background: ${isDarkMode ? '#334155' : '#e5e7eb'};
      }
      .entry-dot {
          position: absolute;
          left: 0.35rem;
          top: 1.5rem;
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          background: #0d6efd;
          border: 4px solid ${isDarkMode ? '#1e293b' : '#fff'};
          z-index: 1;
      }
    `}</style>
  );

  const handleDownloadPDF = async () => {
    if (!evidence) return;

    try {
      const profile = await studentService.getProfile();
      
      generateLogbookPDF({
        studentName: user ? `${user.firstName} ${user.lastName}` : "Student",
        studentEmail: user?.email || "",
        studentReg: profile.registration_number,
        internshipTitle: internship?.title || evidence.internship_title || "Internship",
        employerName: internship?.employer_details?.name || "Employer",
        department: internship?.department,
        weekStartDate: evidence.metadata?.week_start_date || evidence.metadata?.weekStartDate || "",
        status: evidence.status,
        entries: evidence.metadata?.entries || {},
        employerFeedback: evidence.employer_review_notes,
        institutionFeedback: evidence.institution_review_notes
      });
      
      toast.success("PDF report generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge bg="success" className="bg-opacity-10 text-success border border-success-subtle px-3 py-2 rounded-pill fw-medium">Approved</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger-subtle px-3 py-2 rounded-pill fw-medium">Rejected</Badge>;
      case 'REVISION_REQUIRED':
        return <Badge bg="info" className="bg-opacity-10 text-info border border-info-subtle px-3 py-2 rounded-pill fw-medium">Revision Required</Badge>;
      default:
        return <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning-subtle px-3 py-2 rounded-pill fw-medium">Pending Review</Badge>;
    }
  };

  if (loading) {
    return (
      <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
        {sharedStyles}
        <div style={{ width: '280px', zIndex: 1040 }} className="d-none d-lg-block h-100 position-fixed">
            <StudentSidebar isDarkMode={isDarkMode} />
        </div>
        <div className="d-flex flex-column main-content-margin">
            <div className="px-3 px-lg-5 pt-4">
              <StudentHeader
                onMobileMenuClick={toggleMobileMenu}
                isMobileMenuOpen={isMobileMenuOpen}
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
              />
            </div>
            <div className="px-3 px-lg-5 py-4">
                <LogbookDetailSkeleton isDarkMode={isDarkMode} />
            </div>
        </div>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
        <div className="container py-5 text-center">
          <AlertCircle size={64} className="text-muted mb-4" />
          <h3>Logbook Entry Not Found</h3>
          <p className="text-muted">The requested logbook submission could not be found or you don't have access to it.</p>
          <Button variant="primary" onClick={() => navigate('/dashboard/student/logbook')}>
            Back to Logbook
          </Button>
        </div>
      </div>
    );
  }

  const entries = evidence.metadata?.entries || {};
  const sortedDates = Object.keys(entries).sort();

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {sharedStyles}
      <div className="d-none d-lg-block h-100 position-fixed" style={{ width: '280px', zIndex: 1040 }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      <div className="d-flex flex-column main-content-margin">
        <div className="px-3 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </div>

        <div className="px-3 px-lg-5 pb-5">
          {/* Breadcrumb & Title */}
          <div className="mt-4 mb-4">
            <button 
              className="btn btn-link text-decoration-none text-muted p-0 d-flex align-items-center gap-2 mb-3"
              onClick={() => navigate('/dashboard/student/logbook')}
            >
              <ArrowLeft size={18} />
              Back to Logbook
            </button>
            
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
              <div>
                <h1 className="h3 fw-bold mb-1">{evidence.title}</h1>
                <div className="d-flex align-items-center gap-2 text-muted">
                  <Calendar size={16} />
                  <span>Week of {evidence.metadata?.week_start_date}</span>
                  <span className="mx-1">•</span>
                  <Clock size={16} />
                  <span>Submitted on {new Date(evidence.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div>
                {getStatusBadge(evidence.status)}
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Left Column: Daily Entries */}
            <div className="col-lg-8">
              <Card className={`log-detail-card shadow-sm border-0 rounded-4 overflow-hidden ${isDarkMode ? 'bg-dark' : 'bg-white'}`}>
                <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-2">
                  <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                    <FileText size={20} className="text-primary" />
                    Daily Professional Logs
                  </h5>
                </Card.Header>
                <Card.Body className="px-4 py-4">
                  <div className="d-flex flex-column">
                    {sortedDates.map((date) => (
                      <div key={date} className="entry-item pb-4">
                        <div className="entry-dot"></div>
                        <div className={`p-4 rounded-4 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'} border border-opacity-10 shadow-sm`}>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h6 className="fw-bold mb-0 text-primary">
                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                                </h6>
                                <small className="text-muted">{new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</small>
                            </div>
                            <Badge bg="white" className="text-muted border fw-normal px-3 py-2 rounded-pill">
                                {date}
                            </Badge>
                          </div>
                          <div className={`lh-lg ${isDarkMode ? 'text-light opacity-90' : 'text-dark'}`} style={{ whiteSpace: 'pre-wrap' }}>
                            {entries[date]}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sortedDates.length === 0 && (
                      <div className="text-center py-5">
                        <AlertCircle size={48} className="text-muted mb-3 opacity-25" />
                        <p className="text-muted">No entries recorded for this week.</p>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </div>

            {/* Right Column: Feedback & Info */}
            <div className="col-lg-4">
              <div className="d-flex flex-column gap-4">
                {/* Internship Info Card */}
                <Card className={`log-detail-card shadow-sm border-0 rounded-4 ${isDarkMode ? 'bg-dark' : 'bg-white'}`}>
                  <Card.Body className="p-4">
                    <h6 className="fw-bold text-muted text-uppercase small mb-4 letter-spacing-lg">Internship Details</h6>
                    <div className="d-flex align-items-center gap-3 mb-3">
                        <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <div className="fw-bold">{internship?.title}</div>
                            <div className="small text-muted">@{internship?.employer_name}</div>
                        </div>
                    </div>
                    <hr className="my-4 opacity-10" />
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted">Department</span>
                        <span className="small fw-medium">{internship?.department_name || 'IT'}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="small text-muted">Total Entries</span>
                        <span className="badge bg-primary rounded-pill px-3">{sortedDates.length} Days</span>
                    </div>
                  </Card.Body>
                </Card>

                {/* Supervisor Feedback Card */}
                <Card className={`log-detail-card shadow-sm border-0 rounded-4 ${isDarkMode ? 'bg-dark' : 'bg-white'}`}>
                  <Card.Body className="p-4">
                    <h6 className="fw-bold text-muted text-uppercase small mb-4 letter-spacing-lg">Supervisor Reviews</h6>
                    
                    {/* Employer Feedback */}
                    <div className={`p-3 rounded-4 mb-3 border-start border-4 border-info ${isDarkMode ? 'bg-info bg-opacity-5' : 'bg-info bg-opacity-10'}`}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <User size={16} className="text-info" />
                            <span className="fw-bold small text-info text-uppercase">Employer Review</span>
                        </div>
                        <p className="small mb-0 text-dark opacity-90">
                            {evidence.employer_review_notes || "No feedback yet from the employer supervisor."}
                        </p>
                    </div>

                    {/* Institution Feedback */}
                    <div className={`p-3 rounded-4 border-start border-4 border-warning ${isDarkMode ? 'bg-warning bg-opacity-5' : 'bg-warning bg-opacity-10'}`}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <User size={16} className="text-warning" />
                            <span className="fw-bold small text-warning text-uppercase">Institution Review</span>
                        </div>
                        <p className="small mb-0 text-dark opacity-90">
                            {evidence.institution_review_notes || "No feedback yet from the institution supervisor."}
                        </p>
                    </div>
                  </Card.Body>
                </Card>

                {/* Quick Actions */}
                <div className="d-grid gap-2">
                    <Button 
                      variant="outline-primary" 
                      className="py-2 rounded-3 d-flex align-items-center justify-content-center gap-2 border-2 fw-bold shadow-sm"
                      onClick={handleDownloadPDF}
                    >
                        <Download size={18} />
                        Download PDF Report
                    </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLogbookDetail;
