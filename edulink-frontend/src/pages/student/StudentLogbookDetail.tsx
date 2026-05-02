import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  Download,
  FileText,
  User,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { studentService } from '../../services/student/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import LogbookDetailSkeleton from '../../components/student/skeletons/LogbookDetailSkeleton';
import { Badge, Button } from 'react-bootstrap';
import { generateLogbookPDF } from '../../utils/pdfGenerator';
import '../../styles/student-portal.css';

const StudentLogbookDetail: React.FC = () => {
  const { evidenceId } = useParams<{ evidenceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [evidence, setEvidence] = useState<any | null>(null);
  const [internship, setInternship] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!evidenceId) return;

        const activeInternship = await studentService.getActiveInternship();
        const internshipData = (activeInternship as any)?.internship || activeInternship;
        setInternship(internshipData);

        if (internshipData) {
          const history = await studentService.getEvidence(internshipData.id);
          setEvidence(history.find(e => e.id === evidenceId));
        }
      } catch (err) {
        console.error('Failed to load logbook detail:', err);
        showToast.error('We could not load this logbook submission. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [evidenceId]);

  const handleDownloadPDF = async () => {
    if (!evidence) return;

    try {
      const profile = await studentService.getProfile();
      generateLogbookPDF({
        studentName: user ? `${user.firstName} ${user.lastName}` : 'Student',
        studentEmail: user?.email || '',
        studentReg: profile.registration_number,
        internshipTitle: internship?.title || evidence.internship_title || 'Internship',
        employerName: internship?.employer_details?.name || 'Employer',
        department: internship?.department,
        weekStartDate: evidence.metadata?.week_start_date || evidence.metadata?.weekStartDate || '',
        status: evidence.status,
        entries: evidence.metadata?.entries || {},
        employerFeedback: evidence.employer_review_notes,
        institutionFeedback: evidence.institution_review_notes,
      });
      showToast.success('PDF report generated successfully');
    } catch (err) {
      console.error(err);
      showToast.error('We could not generate the PDF. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge bg="success" className="px-3 py-2 rounded-pill">Approved</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="px-3 py-2 rounded-pill">Rejected</Badge>;
      case 'REVISION_REQUIRED':
        return <Badge bg="info" className="px-3 py-2 rounded-pill">Revision Required</Badge>;
      default:
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">Pending Review</Badge>;
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <LogbookDetailSkeleton isDarkMode={isDarkMode} />
      </StudentLayout>
    );
  }

  if (!evidence) {
    return (
      <StudentLayout>
        <div className="student-surface">
          <div className="student-surface-body text-center py-5">
            <AlertCircle size={48} className="text-muted mb-3" />
            <h3>Logbook Entry Not Found</h3>
            <p className="text-muted">The requested logbook submission could not be found or you do not have access to it.</p>
            <Button variant="primary" onClick={() => navigate('/dashboard/student/logbook')}>
              Back to Logbook
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const entries = evidence.metadata?.entries || {};
  const sortedDates = Object.keys(entries).sort();

  return (
    <StudentLayout>
      <div className="student-workspace">
        <button
          className="btn btn-link text-decoration-none text-muted p-0 d-flex align-items-center gap-2"
          onClick={() => navigate('/dashboard/student/logbook')}
        >
          <ArrowLeft size={18} />
          Back to Logbook
        </button>

        <section className="student-command-hero">
          <div className="student-command-copy">
            <span className="student-kicker">Reviewed evidence</span>
            <h1>{evidence.title}</h1>
            <p>Review the submitted weekly entries, supervisor feedback, and exportable report for this logbook submission.</p>
            <div className="student-command-meta">
              <span><Calendar size={15} /> Week of {evidence.metadata?.week_start_date || 'Not set'}</span>
              <span><Clock size={15} /> Submitted {new Date(evidence.created_at).toLocaleDateString()}</span>
              <span><FileText size={15} /> {sortedDates.length} day{sortedDates.length === 1 ? '' : 's'} recorded</span>
            </div>
          </div>
          <div className="student-command-card">
            <span className="student-kicker">Review status</span>
            <div className="mb-3">{getStatusBadge(evidence.status)}</div>
            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2" onClick={handleDownloadPDF}>
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </section>

        <div className="student-workspace-grid">
          <main>
            <section className="student-surface">
              <div className="student-surface-body">
                <div className="student-surface-header">
                  <div>
                    <h2>Daily Professional Logs</h2>
                    <p className="student-muted mb-0">Submitted activities and learning outcomes for the week.</p>
                  </div>
                </div>
                <div className="student-history-list">
                  {sortedDates.length > 0 ? (
                    sortedDates.map(date => (
                      <div key={date} className="student-history-item">
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                          <div>
                            <div className="fw-bold text-primary">
                              {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}
                            </div>
                            <span className="student-muted small">
                              {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <span className="badge bg-light text-muted border">{date}</span>
                        </div>
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{entries[date]}</p>
                      </div>
                    ))
                  ) : (
                    <p className="student-muted mb-0">No entries recorded for this week.</p>
                  )}
                </div>
              </div>
            </section>
          </main>

          <aside>
            <section className="student-surface">
              <div className="student-surface-body">
                <div className="student-surface-header">
                  <div>
                    <h2>Placement Context</h2>
                    <p className="student-muted mb-0">The internship this evidence belongs to.</p>
                  </div>
                </div>
                <div className="student-history-list">
                  <div className="student-history-item">
                    <div className="d-flex align-items-center gap-2">
                      <Briefcase size={18} className="text-primary" />
                      <div>
                        <div className="fw-bold">{internship?.title || 'Internship'}</div>
                        <span className="student-muted small">{internship?.employer_details?.name || internship?.employer_name || 'Employer'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="student-history-item">
                    <span className="student-muted small">Department</span>
                    <div className="fw-bold">{internship?.department_name || internship?.department || 'Not set'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="student-surface">
              <div className="student-surface-body">
                <div className="student-surface-header">
                  <div>
                    <h2>Supervisor Reviews</h2>
                    <p className="student-muted mb-0">Feedback attached to this submission.</p>
                  </div>
                </div>
                <div className="student-history-list">
                  <div className="student-history-item">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <User size={16} className="text-info" />
                      <span className="fw-bold small text-info text-uppercase">Employer Review</span>
                    </div>
                    <p className="small mb-0">{evidence.employer_review_notes || 'No feedback yet from the employer supervisor.'}</p>
                  </div>
                  <div className="student-history-item">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <User size={16} className="text-warning" />
                      <span className="fw-bold small text-warning text-uppercase">Institution Review</span>
                    </div>
                    <p className="small mb-0">{evidence.institution_review_notes || 'No feedback yet from the institution supervisor.'}</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentLogbookDetail;
