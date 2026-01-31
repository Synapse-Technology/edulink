import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Send,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Plus,
  MessageSquare,
  FileText,
  ArrowRight,
  Lock,
  FileDown
} from 'lucide-react';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { studentService } from '../../services/student/studentService';
import { artifactService } from '../../services/reports/artifactService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Badge } from 'react-bootstrap';
import { generateLogbookPDF } from '../../utils/pdfGenerator';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import StudentInternshipSkeleton from '../../components/student/skeletons/StudentInternshipSkeleton';

const StudentLogbook: React.FC = () => {
  const { user } = useAuth();
  const [internship, setInternship] = useState<any | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
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
  const [generatingReport, setGeneratingReport] = useState(false);

  // Logbook State
  const [currentWeekStart] = useState<Date>(getMonday(new Date()));
  const [logbookEntries, setLogbookEntries] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  // Calendar State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  // Submission Confirmation Modal State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Feedback Modal State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState<any>(null);

  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  const isDateInCurrentWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  const isDateInPast = (dateStr: string) => {
    const date = new Date(dateStr);
    const start = new Date(currentWeekStart);
    return date < start;
  };

  useEffect(() => {
    const fetchActiveInternship = async () => {
      try {
        const data = await studentService.getActiveInternship();
        setInternship(data);
        if (data) {
          const history = await studentService.getEvidence(data.id);
          // Filter for logbooks
          setSubmissionHistory(history.filter(e => e.evidence_type === 'LOGBOOK'));
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load active internship');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveInternship();
  }, []);

  // Load drafts from local storage when internship or week changes
  useEffect(() => {
    if (internship) {
      const key = `logbook_draft_${internship.id}_${currentWeekStart.toISOString().split('T')[0]}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setLogbookEntries(JSON.parse(saved));
      } else {
        setLogbookEntries({});
      }
    }
  }, [internship, currentWeekStart]);

  const isDateInFuture = (date: Date) => {
    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return date > end;
  };

  const handleEntryChange = (dateStr: string, content: string) => {
    const newEntries = { ...logbookEntries, [dateStr]: content };
    setLogbookEntries(newEntries);
    
    // Save to local storage
    if (internship) {
      const key = `logbook_draft_${internship.id}_${currentWeekStart.toISOString().split('T')[0]}`;
      localStorage.setItem(key, JSON.stringify(newEntries));
    }
  };

  const handleDateClick = (arg: any) => {
    const dateStr = arg.dateStr;
    const isCurrent = isDateInCurrentWeek(dateStr);
    const isPast = isDateInPast(dateStr);
    
    if (!isCurrent && !isPast) {
      toast.error("Future dates are locked.");
      return;
    }

    setSelectedDate(dateStr);
    setCurrentEntry(logbookEntries[dateStr] || '');
    setIsReadOnly(isPast);
    setEntryError(null);
    setModalOpen(true);
  };

  const handleSaveEntry = () => {
    if (!currentEntry.trim()) {
      setEntryError("Log entry content cannot be empty.");
      toast.error("Log entry content cannot be empty.");
      return;
    }
    if (selectedDate) {
      handleEntryChange(selectedDate, currentEntry);
      setModalOpen(false);
    }
  };

  const handleSubmitLogbook = () => {
    if (!internship) return;
    
    // Validate: At least one entry?
    if (Object.keys(logbookEntries).length === 0) {
      toast.error("Please add at least one entry before submitting.");
      return;
    }

    setSubmitModalOpen(true);
  };

  const confirmSubmitLogbook = async () => {
    if (!internship) return;

    try {
      setSubmitting(true);
      await studentService.submitLogbook(internship.id, {
        weekStartDate: currentWeekStart.toISOString().split('T')[0],
        entries: logbookEntries
      });
      
      setSubmissionSuccess(true);
      setSubmitModalOpen(false);
      // Clear draft
      const key = `logbook_draft_${internship.id}_${currentWeekStart.toISOString().split('T')[0]}`;
      localStorage.removeItem(key);
      toast.success("Logbook submitted successfully!");
      
      // Refresh history
      const history = await studentService.getEvidence(internship.id);
      setSubmissionHistory(history.filter(e => e.evidence_type === 'LOGBOOK'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit logbook. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!internship) {
      toast.error("No active internship found to generate report.");
      return;
    }

    if (Object.keys(logbookEntries).length === 0) {
      toast.error("Please add some log entries before downloading the PDF.");
      return;
    }

    try {
      const profile = await studentService.getProfile();
      
      generateLogbookPDF({
        studentName: user ? `${user.firstName} ${user.lastName}` : "Student",
        studentEmail: user?.email || "",
        studentReg: profile.registration_number,
        internshipTitle: internship.title,
        employerName: internship.employer_details?.name || "Employer",
        department: internship.department,
        weekStartDate: currentWeekStart.toISOString().split('T')[0],
        status: "Draft / Pending Submission",
        entries: logbookEntries
      });
      
      toast.success("PDF report generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleDownloadFullReport = async () => {
    if (!internship) return;
    
    try {
      setGeneratingReport(true);
      toast.loading('Generating full internship report...', { id: 'report-gen' });
      
      const artifact = await artifactService.generateArtifact(internship.id, 'LOGBOOK_REPORT');
      await artifactService.downloadArtifact(artifact);
      
      toast.success('Full report downloaded successfully!', { id: 'report-gen' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report. Ensure you have accepted logbook entries.', { id: 'report-gen' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Generate calendar events from entries
  const calendarEvents = Object.entries(logbookEntries).map(([date, _]) => ({
    title: 'Log Entry',
    start: date,
    allDay: true,
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd'
  }));

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
          .fc {
            --fc-border-color: ${isDarkMode ? '#334155' : '#e5e7eb'};
            --fc-button-bg-color: #0d6efd;
            --fc-button-border-color: #0d6efd;
            --fc-button-hover-bg-color: #0b5ed7;
            --fc-button-hover-border-color: #0a58ca;
            --fc-button-active-bg-color: #0a58ca;
            --fc-button-active-border-color: #0a53be;
            --fc-page-bg-color: ${isDarkMode ? '#1e293b' : 'white'};
          }
          .fc .fc-toolbar-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: ${isDarkMode ? '#f8fafc' : '#111827'};
          }
          .fc .fc-col-header-cell-cushion {
            padding: 10px 0;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            color: ${isDarkMode ? '#94a3b8' : '#6b7280'};
          }
          .fc .fc-daygrid-day-number {
            font-weight: 500;
            padding: 8px;
            color: ${isDarkMode ? '#cbd5e1' : '#374151'};
          }
          .fc-day-today {
            background-color: rgba(13, 110, 253, 0.1) !important;
          }
          .fc-day-past-week {
            background-color: ${isDarkMode ? 'rgba(13, 110, 253, 0.08)' : 'rgba(13, 110, 253, 0.03)'} !important;
          }
          .fc-day-future-locked {
            background-color: ${isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)'} !important;
            cursor: not-allowed !important;
          }
          .lock-icon-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.8;
            color: ${isDarkMode ? '#94a3b8' : '#1e293b'};
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 0 2px rgba(0,0,0,0.1));
          }
          .fc-day-today .fc-daygrid-day-number {
            background-color: #0d6efd;
            color: white !important;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 4px;
            padding: 0 !important;
          }
          .fc-event {
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 0.75rem;
            border: none;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            cursor: pointer;
            transition: transform 0.1s ease;
          }
          .fc-event:hover {
            transform: scale(1.02);
          }
          .logbook-card {
            transition: all 0.3s ease;
            border: 1px solid ${isDarkMode ? '#334155' : '#f3f4f6'};
            background-color: ${isDarkMode ? '#1e293b' : 'white'} !important;
            color: ${isDarkMode ? '#f8fafc' : 'inherit'} !important;
          }
          .logbook-card:hover {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            border-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
          }
          .btn-animate {
            transition: all 0.2s ease;
          }
          .btn-animate:hover {
            transform: translateY(-2px);
          }
          .btn-animate:active {
            transform: translateY(0);
          }
          .extra-small {
            font-size: 0.65rem;
          }
          .history-table-container {
            max-height: 400px;
            overflow-y: auto;
          }
          .history-table-container::-webkit-scrollbar {
            width: 6px;
          }
          .history-table-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .history-table-container::-webkit-scrollbar-thumb {
            background: ${isDarkMode ? '#475569' : '#e5e7eb'};
            border-radius: 10px;
          }
          .table-dark {
            --bs-table-bg: #1e293b;
            --bs-table-border-color: #334155;
          }
          .modal-content {
            background-color: ${isDarkMode ? '#1e293b' : 'white'};
            color: ${isDarkMode ? '#f8fafc' : 'inherit'};
            border: 1px solid ${isDarkMode ? '#334155' : 'rgba(0,0,0,0.2)'};
          }
          .form-control:disabled {
            background-color: ${isDarkMode ? '#0f172a' : '#e9ecef'};
            color: ${isDarkMode ? '#94a3b8' : 'inherit'};
          }
        `}</style>
        
        <div className="px-3 px-lg-5 pt-4">
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
            <div className={`p-5 rounded-circle ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-white shadow-sm'} mb-4`}>
              <Briefcase size={64} className="text-muted" />
            </div>
            <h3 className="fw-bold mb-2">No Active Internship</h3>
            <p className="text-muted max-w-md">You need an active internship to access the logbook. Check your placement status in the dashboard.</p>
          </div>
        ) : (
          <div className="flex-grow-1 px-3 px-lg-5 pb-5">
            {/* Header & Title */}
            <div className="row align-items-end mb-4 g-3">
              <div className="col-md-7">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className={`p-2 rounded-3 ${isDarkMode ? 'bg-primary bg-opacity-20' : 'bg-primary bg-opacity-10'}`}>
                    <CalendarIcon size={24} className="text-primary" />
                  </div>
                  <h2 className={`fw-bold mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Logbook & History</h2>
                </div>
                <p className={`${isDarkMode ? 'text-light opacity-75' : 'text-muted'} mb-0`}>
                  Document your professional journey and learning progress.
                </p>
              </div>
              <div className="col-md-5 text-md-end">
                <div className={`d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill ${isDarkMode ? 'bg-secondary bg-opacity-25' : 'bg-white shadow-sm'}`}>
                  <div className="position-relative">
                    <div className="rounded-circle bg-success" style={{ width: '8px', height: '8px' }}></div>
                    <div className="position-absolute top-0 start-0 rounded-circle bg-success animate-ping" style={{ width: '8px', height: '8px', opacity: 0.5 }}></div>
                  </div>
                  <span className={`small fw-semibold ${isDarkMode ? 'text-light' : 'text-dark'}`}>{internship.title}</span>
                  <span className="text-muted small">@{internship.employer_name}</span>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              {/* Main Calendar Card */}
              <div className="col-lg-8">
                <div className={`card logbook-card shadow-sm h-100 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white border-0'}`}>
                  <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">Activities Calendar</h5>
                    <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill border border-primary border-opacity-25">
                      Daily Entry Mode
                    </div>
                  </div>
                  <div className="card-body p-4">
                     <FullCalendar
                       plugins={[ dayGridPlugin, interactionPlugin, bootstrap5Plugin ]}
                       initialView="dayGridMonth"
                       headerToolbar={{
                         left: 'prev,next today',
                         center: 'title',
                         right: 'dayGridMonth,dayGridWeek'
                       }}
                       height="auto"
                       events={calendarEvents}
                       dateClick={handleDateClick}
                       dayCellClassNames={(arg) => {
                         if (isDateInFuture(arg.date)) return 'fc-day-future-locked';
                         if (isDateInPast(arg.date.toISOString().split('T')[0]) && !isDateInCurrentWeek(arg.date.toISOString().split('T')[0])) return 'fc-day-past-week';
                         return '';
                       }}
                       dayCellContent={(arg) => {
                         return (
                           <div className="position-relative h-100 w-100">
                             <span>{arg.dayNumberText}</span>
                             {isDateInFuture(arg.date) && (
                               <div className="lock-icon-container">
                                 <Lock size={20} />
                               </div>
                             )}
                           </div>
                         );
                       }}
                       editable={true}
                       selectable={true}
                       themeSystem="bootstrap5"
                     />
                  </div>
                </div>
              </div>

              {/* Sidebar Actions/Stats */}
              <div className="col-lg-4">
                <div className="d-flex flex-column gap-4">
                  {/* Action Card */}
                  <div className={`card logbook-card shadow-sm ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white border-0'}`}>
                    <div className="card-body p-4">
                      <h5 className="fw-bold mb-3">Submissions</h5>
                      <p className="small text-muted mb-4">Submit your weekly entries for review by your institution supervisor.</p>
                      
                      <button 
                        className="btn btn-primary w-100 py-3 rounded-3 d-flex align-items-center justify-content-center gap-2 mb-3 btn-animate"
                        onClick={handleSubmitLogbook}
                        disabled={submitting || submissionSuccess}
                      >
                        {submitting ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <>
                            <Send size={18} />
                            <span>Submit Week for Review</span>
                          </>
                        )}
                      </button>
                      
                      <button 
                        className={`btn w-100 py-2 rounded-3 d-flex align-items-center justify-content-center gap-2 btn-animate mb-3 ${isDarkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}
                        onClick={handleDownloadPDF}
                      >
                        <Download size={18} />
                        <span>Download Week PDF</span>
                      </button>

                      {['COMPLETED', 'CERTIFIED'].includes(internship.status) && (
                        <button 
                          className="btn btn-success w-100 py-3 rounded-3 d-flex align-items-center justify-content-center gap-2 btn-animate shadow-sm"
                          onClick={handleDownloadFullReport}
                          disabled={generatingReport}
                        >
                          {generatingReport ? (
                            <span className="spinner-border spinner-border-sm" role="status"></span>
                          ) : (
                            <FileDown size={20} />
                          )}
                          <span className="fw-bold">Export Full Logbook</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary/Tip Card */}
                  <div className={`card shadow-sm border-0 ${isDarkMode ? 'bg-primary bg-opacity-10 text-light' : 'bg-primary text-white'}`}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <AlertCircle size={20} />
                        <h6 className="fw-bold mb-0">Quick Tip</h6>
                      </div>
                      <p className="small mb-0 opacity-90">
                        Regular entries help you track your learning goals. Try to record at least one key takeaway every day!
                      </p>
                    </div>
                  </div>

                  {/* Stats Mini Card */}
                  <div className={`card logbook-card shadow-sm ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white border-0'}`}>
                    <div className="card-body p-4">
                      <h6 className="fw-bold text-muted text-uppercase small letter-spacing-lg mb-3">Current Week Progress</h6>
                      <div className="d-flex align-items-end gap-2 mb-2">
                        <h2 className="fw-bold mb-0">{Object.keys(logbookEntries).length}</h2>
                        <span className="text-muted pb-1">/ 5 days</span>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div 
                          className="progress-bar bg-primary rounded-pill" 
                          role="progressbar" 
                          style={{ width: `${(Object.keys(logbookEntries).length / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Logs History Table */}
            <div className="mb-4">
               <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                  <div>
                    <h4 className={`mb-1 fw-bold ${isDarkMode ? 'text-white' : 'text-dark'}`}>Submission History</h4>
                    <p className="text-muted small mb-0">Track the status of your submitted weekly logs.</p>
                  </div>
                  <div className="d-flex gap-2">
                     <div className="position-relative">
                       <input 
                         type="text" 
                         className={`form-control form-control-sm ps-4 ${isDarkMode ? 'bg-secondary bg-opacity-20 border-secondary text-white' : 'bg-white border-light'}`} 
                         placeholder="Filter history..." 
                         style={{ width: '200px' }} 
                       />
                       <Clock size={14} className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" />
                     </div>
                  </div>
               </div>
               
               <div className={`card logbook-card shadow-sm border-0 ${isDarkMode ? 'bg-dark' : 'bg-white'} overflow-hidden`}>
                  <div className="table-responsive history-table-container">
                     <table className={`table mb-0 align-middle ${isDarkMode ? 'table-dark' : 'table-hover'}`}>
                        <thead className="sticky-top" style={{ zIndex: 10 }}>
                           <tr className={isDarkMode ? 'bg-secondary bg-opacity-20' : 'bg-light bg-opacity-50'}>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted">Week Period</th>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted">Status</th>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted">Days</th>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted">Supervisor Feedback</th>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted">Submitted On</th>
                              <th className="py-3 px-4 border-0 small fw-bold text-uppercase text-muted text-end">Actions</th>
                           </tr>
                        </thead>
                        <tbody>
                           {submissionHistory.length > 0 ? (
                             submissionHistory.map((sub) => (
                               <tr key={sub.id}>
                                  <td className="py-3 px-4 border-0 small">
                                    <div className="fw-bold">{sub.title}</div>
                                    <div className="text-muted small">
                                      {sub.metadata?.week_start_date ? `Week of ${sub.metadata.week_start_date}` : ''}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 border-0 small">
                                    {sub.status === 'ACCEPTED' ? (
                                      <span className="badge bg-success bg-opacity-10 text-success px-2 py-1">Approved</span>
                                    ) : sub.status === 'REVISION_REQUIRED' ? (
                                      <span className="badge bg-info bg-opacity-10 text-info px-2 py-1">Revision Required</span>
                                    ) : sub.status === 'REJECTED' ? (
                                      <span className="badge bg-danger bg-opacity-10 text-danger px-2 py-1">Rejected</span>
                                    ) : sub.status === 'REVIEWED' ? (
                                      <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1">Review in Progress</span>
                                    ) : (
                                      <span className="badge bg-warning bg-opacity-10 text-warning px-2 py-1">Pending</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 border-0 small">
                                    {Object.keys(sub.metadata?.entries || {}).length} days
                                  </td>
                                  <td className="py-3 px-4 border-0 small">
                                    {(sub.employer_review_notes || sub.institution_review_notes) ? (
                                      <button 
                                        className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 px-2 py-1"
                                        onClick={() => {
                                          setActiveFeedback(sub);
                                          setFeedbackModalOpen(true);
                                        }}
                                      >
                                        <MessageSquare size={14} />
                                        <span>View Feedback</span>
                                      </button>
                                    ) : (
                                      <span className="text-muted italic small">No feedback yet</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 border-0 small text-muted">
                                    {new Date(sub.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 px-4 border-0 small text-end">
                                    <div className="d-flex justify-content-end gap-2">
                                      <Link 
                                        to={`/dashboard/student/logbook/${sub.id}`}
                                        className="btn btn-sm btn-light border d-flex align-items-center gap-1 px-3 py-2 transition-all hover-lift"
                                      >
                                        <FileText size={14} className="text-primary" />
                                        <span className="fw-semibold">View Detailed Logs</span>
                                        <ArrowRight size={14} className="ms-1 opacity-50" />
                                      </Link>
                                      {sub.status === 'REVISION_REQUIRED' && (
                                        <button 
                                          className="btn btn-sm btn-primary py-2 px-3 fw-bold d-flex align-items-center gap-2 transition-all hover-lift"
                                          onClick={() => {
                                            if (window.confirm("Load this week's logs into the calendar for revision? This will overwrite current drafts.")) {
                                              setLogbookEntries(sub.metadata.entries);
                                              toast.success("Logs loaded into calendar. You can now edit and resubmit.");
                                            }
                                          }}
                                        >
                                          <Plus size={14} />
                                          Edit & Resubmit
                                        </button>
                                      )}
                                    </div>
                                  </td>
                               </tr>
                             ))
                           ) : (
                             /* Empty State Illustration */
                             <tr>
                                <td colSpan={5} className="text-center py-5">
                                  <div className="d-flex flex-column align-items-center py-4">
                                    <div className={`p-4 rounded-circle mb-3 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                                      <Clock size={40} className="text-muted opacity-50" />
                                    </div>
                                    <h6 className="fw-bold text-muted mb-1">No submissions yet</h6>
                                    <p className="small text-muted mb-0">Your submitted weekly logs will appear here.</p>
                                  </div>
                                </td>
                             </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            {/* Entry Modal */}
            {modalOpen && (
              <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className={`modal-content shadow-lg border-0 ${isDarkMode ? 'bg-dark text-white' : 'bg-white'}`} style={{ borderRadius: '1.25rem' }}>
                    <div className="modal-header border-0 pt-4 px-4 pb-0">
                      <div>
                        <h5 className="modal-title fw-bold">Daily Log Entry</h5>
                        <p className="small text-muted mb-0">Recording for {new Date(selectedDate!).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      <button type="button" className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} onClick={() => setModalOpen(false)}></button>
                    </div>
                    <div className="modal-body px-4 pt-4">
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-muted text-uppercase mb-2">Activities & Learning Outcomes</label>
                        <textarea
                          className={`form-control p-3 ${entryError ? 'border-danger' : ''} ${isDarkMode ? 'bg-secondary bg-opacity-20 text-white border-secondary' : 'bg-light border-0'}`}
                          rows={6}
                          style={{ borderRadius: '1rem', resize: 'none' }}
                          placeholder={isReadOnly ? "No entry for this date." : "What did you work on today? Any new skills or insights gained?"}
                          value={currentEntry}
                          onChange={(e) => {
                            setCurrentEntry(e.target.value);
                            if (e.target.value.trim()) setEntryError(null);
                          }}
                          disabled={isReadOnly}
                        />
                        {entryError && (
                          <div className="text-danger small mt-2 d-flex align-items-center gap-1">
                            <AlertCircle size={14} />
                            {entryError}
                          </div>
                        )}
                        <div className="d-flex justify-content-between mt-2">
                          <span className="small text-muted">{currentEntry.length} characters</span>
                          {!isReadOnly && !entryError && <span className="small text-muted">Auto-saving draft...</span>}
                          {isReadOnly && <span className="small text-info fw-bold">Read-only (Past Entry)</span>}
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer border-0 px-4 pb-4 pt-0">
                      <button type="button" className={`btn px-4 py-2 fw-semibold ${isDarkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={() => setModalOpen(false)} style={{ borderRadius: '0.75rem' }}>{isReadOnly ? 'Close' : 'Discard'}</button>
                      {!isReadOnly && (
                        <button 
                          type="button" 
                          className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center gap-2" 
                          onClick={handleSaveEntry} 
                          style={{ borderRadius: '0.75rem' }}
                        >
                          <CheckCircle size={18} />
                          Save Entry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Modal */}
            {feedbackModalOpen && activeFeedback && (
              <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className={`modal-content shadow-lg border-0 ${isDarkMode ? 'bg-dark text-white' : 'bg-white'}`} style={{ borderRadius: '1.25rem' }}>
                    <div className="modal-header border-0 pt-4 px-4 pb-0">
                      <div>
                        <h5 className="modal-title fw-bold">Supervisor Feedback</h5>
                        <p className="small text-muted mb-0">{activeFeedback.title} - Week of {activeFeedback.metadata?.week_start_date}</p>
                      </div>
                      <button type="button" className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} onClick={() => setFeedbackModalOpen(false)}></button>
                    </div>
                    <div className="modal-body px-4 py-4">
                      <div className="row g-4">
                        <div className="col-md-6">
                          <div className={`p-4 rounded-4 h-100 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'} border-start border-4 border-info`}>
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <Briefcase size={20} className="text-info" />
                              <h6 className="fw-bold mb-0 text-info text-uppercase small">Employer Supervisor</h6>
                            </div>
                            <p className={`mb-0 ${activeFeedback.employer_review_notes ? '' : 'text-muted italic small'}`}>
                              {activeFeedback.employer_review_notes || "No feedback provided by the employer supervisor yet."}
                            </p>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className={`p-4 rounded-4 h-100 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'} border-start border-4 border-warning`}>
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <Clock size={20} className="text-warning" />
                              <h6 className="fw-bold mb-0 text-warning text-uppercase small">Institution Supervisor</h6>
                            </div>
                            <p className={`mb-0 ${activeFeedback.institution_review_notes ? '' : 'text-muted italic small'}`}>
                              {activeFeedback.institution_review_notes || "No feedback provided by the institution supervisor yet."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer border-0 px-4 pb-4 pt-0">
                      <button type="button" className="btn btn-primary px-4 py-2 fw-semibold" onClick={() => setFeedbackModalOpen(false)} style={{ borderRadius: '0.75rem' }}>Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submission Confirmation Modal */}
            {submitModalOpen && (
              <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className={`modal-content shadow-lg border-0 ${isDarkMode ? 'bg-dark text-white' : 'bg-white'}`} style={{ borderRadius: '1.25rem' }}>
                    <div className="modal-header border-0 pt-4 px-4 pb-0">
                      <div>
                        <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                          <Send size={24} className="text-primary" />
                          Review & Submit Week
                        </h5>
                        <p className="small text-muted mb-0">Please proofread your logs for the week starting {currentWeekStart.toLocaleDateString()}.</p>
                      </div>
                      <button type="button" className={`btn-close ${isDarkMode ? 'btn-close-white' : ''}`} onClick={() => setSubmitModalOpen(false)}></button>
                    </div>
                    <div className="modal-body px-4 py-4">
                      <div className={`p-3 mb-4 rounded-3 ${isDarkMode ? 'bg-primary bg-opacity-10 text-primary' : 'bg-primary bg-opacity-10 text-primary'} border border-primary border-opacity-25 d-flex align-items-center gap-3`}>
                        <AlertCircle size={20} />
                        <span className="small fw-medium">Once submitted, you won't be able to edit these logs unless a supervisor requests a revision.</span>
                      </div>
                      
                      <div className="d-flex flex-column gap-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {Object.entries(logbookEntries).sort().map(([date, content]) => (
                          <div key={date} className={`p-3 rounded-4 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'} border-start border-4 border-primary shadow-sm`}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-bold small text-primary">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                              <Badge bg="white" className="text-muted border fw-normal extra-small">{date}</Badge>
                            </div>
                            <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="modal-footer border-0 px-4 pb-4 pt-0 d-flex justify-content-between">
                      <button 
                        type="button" 
                        className={`btn px-4 py-2 fw-semibold ${isDarkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} 
                        onClick={() => setSubmitModalOpen(false)} 
                        style={{ borderRadius: '0.75rem' }}
                      >
                        Back to Editing
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary px-5 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm" 
                        onClick={confirmSubmitLogbook} 
                        style={{ borderRadius: '0.75rem' }}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <>
                            <Send size={18} />
                            <span>Confirm & Submit Week</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLogbook;
