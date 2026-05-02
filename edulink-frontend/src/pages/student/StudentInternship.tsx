import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building,
  Calendar,
  Check,
  Download,
  FileText,
  Loader,
  Mail,
  MapPin,
  Share2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { studentService } from '../../services/student/studentService';
import type { Artifact } from '../../services/reports/artifactService';
import { artifactService } from '../../services/reports/artifactService';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { dateFormatter } from '../../utils/dateFormatter';
import type { Internship } from '../../types/internship';
import StudentInternshipSkeleton from '../../components/student/skeletons/StudentInternshipSkeleton';
import ReportIncidentModal from '../../components/student/ReportIncidentModal';
import '../../styles/student-portal.css';

const COMPLETED_STATUSES = ['COMPLETED', 'CERTIFIED'];
const CLOSED_STATUSES = ['COMPLETED', 'CERTIFIED', 'TERMINATED'];

const StudentInternship: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [generatingArtifacts, setGeneratingArtifacts] = useState<Record<string, boolean>>({});
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedArtifactForShare, setSelectedArtifactForShare] = useState<Artifact | null>(null);

  useEffect(() => {
    const fetchActiveInternship = async () => {
      try {
        const data = await studentService.getActiveInternship();
        if (data) {
          setInternship((data as any).internship || (data as any));
        }
        setArtifacts(await artifactService.getArtifacts());
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

    setGeneratingArtifacts(prev => ({ ...prev, [artifactType]: true }));
    let toastId: string | undefined;

    try {
      toastId = showToast.loading(`Generating ${artifactType.replace('_', ' ').toLowerCase()}...`);
      const artifact = await artifactService.generateArtifact(internship.id, artifactType);
      const finalStatus: any = artifact.status === 'SUCCESS' || artifact.file
        ? { status: 'SUCCESS' }
        : await artifactService.pollArtifactStatus(artifact.id, 12, 1000);

      if (finalStatus.status === 'SUCCESS') {
        const updatedArtifacts = await artifactService.getArtifacts();
        setArtifacts(updatedArtifacts);
        if (toastId) {
          showToast.dismiss(toastId);
          toastId = undefined;
        }
        showToast.success(`${artifactType.replace('_', ' ')} generated successfully!`);

        if (artifactType === 'CERTIFICATE') {
          const generatedArtifact = updatedArtifacts.find(item => item.artifact_type === 'CERTIFICATE' && item.id === artifact.id);
          if (generatedArtifact) {
            setTimeout(() => artifactService.downloadArtifact(generatedArtifact), 500);
          }
        }
      } else if (finalStatus.status === 'FAILED') {
        if (toastId) {
          showToast.dismiss(toastId);
          toastId = undefined;
        }
        showToast.error(finalStatus.error_message || 'We could not generate this artifact. Please try again.');
      }
    } catch (err) {
      const updatedArtifacts = await artifactService.getArtifacts().catch(() => []);
      const generatedArtifact = updatedArtifacts.find(item => item.artifact_type === artifactType);
      if (generatedArtifact) {
        setArtifacts(updatedArtifacts);
        if (toastId) {
          showToast.dismiss(toastId);
          toastId = undefined;
        }
        showToast.success(`${artifactType.replace('_', ' ')} generated successfully!`);
        return;
      }
      const message = getErrorMessage(err, { action: 'Generate Artifact' });
      showToast.error(message);
      logError(err, { action: 'Generate Artifact', data: { artifactType } });
    } finally {
      if (toastId) showToast.dismiss(toastId);
      setGeneratingArtifacts(prev => ({ ...prev, [artifactType]: false }));
    }
  };

  const handleShareArtifact = (artifact: Artifact) => {
    setSelectedArtifactForShare(artifact);
    setShowShareModal(true);
  };

  const copyVerificationLink = async (artifactId: string) => {
    if (!artifactId || typeof artifactId !== 'string') {
      showToast.error('Invalid artifact. Please refresh and try again.');
      return;
    }

    const link = `${window.location.origin}/verify/${artifactId}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        showToast.success('Verification link copied to clipboard');
        return;
      }

      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      if (document.execCommand('copy')) {
        showToast.success('Verification link copied to clipboard');
      } else {
        throw new Error('Copy command not supported');
      }

      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Clipboard error:', err);
      showToast.error('Could not copy link. Please copy it manually from the modal.');
    }
  };

  const artifactActions = [
    {
      type: 'LOGBOOK_REPORT',
      title: 'Logbook report',
      copy: 'A consolidated evidence report from accepted logbook submissions.',
      icon: <FileText size={18} />,
      disabled: !internship,
    },
    {
      type: 'PERFORMANCE_SUMMARY',
      title: 'Performance summary',
      copy: 'A summary of placement performance and review outcomes.',
      icon: <Award size={18} />,
      disabled: !internship,
    },
    {
      type: 'CERTIFICATE',
      title: 'Completion certificate',
      copy: 'Available after final institution certification.',
      icon: <ShieldCheck size={18} />,
      disabled: !internship || internship.status !== 'CERTIFIED',
    },
  ];

  const renderSupervisor = (
    title: string,
    icon: React.ReactNode,
    supervisor?: { name?: string; email?: string } | null,
    pending?: boolean,
  ) => (
    <div className="student-evidence-row">
      <div className="student-evidence-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        {supervisor ? (
          <span>{supervisor.name || 'Assigned'}{supervisor.email ? ` · ${supervisor.email}` : ''}</span>
        ) : (
          <span>{pending ? 'Resolving supervisor profile.' : 'Pending assignment.'}</span>
        )}
      </div>
      {supervisor?.email && (
        <a className="btn btn-sm btn-outline-primary" href={`mailto:${supervisor.email}`}>
          <Mail size={14} />
        </a>
      )}
    </div>
  );

  return (
    <StudentLayout>
      {loading ? (
        <StudentInternshipSkeleton isDarkMode={isDarkMode} />
      ) : !internship ? (
        <div className="student-surface">
          <div className="student-surface-body text-center py-5">
            <div className="student-empty-icon mx-auto mb-3">
              <Briefcase size={34} />
            </div>
            <h3 className="fw-bold">No Active Internship</h3>
            <p className="student-muted mb-4">Once a placement becomes active, supervision, logbooks, artifacts, and support actions will appear here.</p>
            <Link to="/opportunities" className="btn btn-primary">Browse Opportunities</Link>
          </div>
        </div>
      ) : (
        <div className="student-workspace">
          <section className="student-command-hero">
            <div className="student-command-copy">
              <span className="student-kicker">Placement workspace</span>
              <h1>{internship.title}</h1>
              <p>{internship.description || 'Track your active attachment, submit professional evidence, and keep every supervisor-facing record in one trusted workflow.'}</p>
              <div className="student-command-meta">
                <span><Building size={15} /> {internship.employer_details?.name || 'Employer pending'}</span>
                <span><MapPin size={15} /> {internship.location || 'Remote'}</span>
                <span><Calendar size={15} /> Started {dateFormatter.shortDate(internship.start_date || internship.created_at)}</span>
              </div>
            </div>
            <div className="student-command-card">
              <span className="student-kicker">Placement status</span>
              <strong>{COMPLETED_STATUSES.includes(internship.status) ? 'Complete' : 'Active'}</strong>
              <p className="student-command-note mb-3">
                {internship.logbook_count > 0
                  ? `${internship.logbook_count} logbook${internship.logbook_count > 1 ? 's' : ''} submitted.`
                  : 'No logbooks submitted yet.'}
              </p>
              <div className="student-action-strip">
                <Link to="/dashboard/student/logbook" className="btn btn-primary btn-sm">
                  Logbook
                </Link>
                <button className="btn btn-outline-danger btn-sm" onClick={() => setShowIncidentModal(true)}>
                  Report Incident
                </button>
              </div>
            </div>
          </section>

          <div className="student-workspace-grid">
            <main>
              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Supervision & Trust</h2>
                      <p className="student-muted mb-0">Know who is responsible for your employer and institution review.</p>
                    </div>
                    <span className="badge bg-success">{internship.status}</span>
                  </div>
                  <div className="student-evidence-rail">
                    {renderSupervisor(
                      'Employer supervisor',
                      <UserCheck size={18} />,
                      internship.employer_supervisor_details,
                      Boolean(internship.employer_supervisor_id),
                    )}
                    {renderSupervisor(
                      'Institution supervisor',
                      <ShieldCheck size={18} />,
                      internship.institution_supervisor_details,
                      Boolean(internship.institution_supervisor_id),
                    )}
                    <div className="student-evidence-row">
                      <div className={`student-evidence-icon ${internship.logbook_count > 0 ? 'success' : 'warn'}`}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <strong>Weekly evidence</strong>
                        <span>{internship.logbook_count || 0} logbook submissions recorded for this placement.</span>
                      </div>
                      <Link to="/dashboard/student/logbook" className="btn btn-sm btn-outline-primary">Open</Link>
                    </div>
                  </div>
                </div>
              </section>

              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Placement Evidence Actions</h2>
                      <p className="student-muted mb-0">Create documents only when the underlying placement records are ready.</p>
                    </div>
                    <Link to="/dashboard/student/artifacts" className="btn btn-sm btn-outline-primary">Open vault</Link>
                  </div>
                  <div className="student-evidence-rail">
                    {artifactActions.map(action => {
                      const hasArtifact = artifacts.some(artifact => artifact.artifact_type === action.type);
                      return (
                        <div className="student-evidence-row" key={action.type}>
                          <div className={`student-evidence-icon ${hasArtifact ? 'success' : 'warn'}`}>
                            {hasArtifact ? <Check size={18} /> : action.icon}
                          </div>
                          <div>
                            <strong>{action.title}</strong>
                            <span>{action.copy}</span>
                          </div>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleGenerateArtifact(action.type)}
                            disabled={action.disabled || generatingArtifacts[action.type]}
                          >
                            {generatingArtifacts[action.type] ? <Loader size={14} className="spinner-animation" /> : 'Generate'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </main>

            <aside>
              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Generated Artifacts</h2>
                      <p className="student-muted mb-0">Verified records you can download or share.</p>
                    </div>
                  </div>
                  {artifacts.length > 0 ? (
                    <div className="student-history-list">
                      {artifacts.map(artifact => (
                        <div className="student-history-item" key={artifact.id}>
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-bold">{artifact.artifact_type_display}</div>
                              <span className="student-muted small">{dateFormatter.shortDate(artifact.created_at)}</span>
                            </div>
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-outline-primary" onClick={() => artifactService.downloadArtifact(artifact)} title="Download">
                                <Download size={14} />
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => handleShareArtifact(artifact)} title="Share">
                                <Share2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="student-muted mb-0">No artifacts generated yet.</p>
                  )}
                </div>
              </section>

              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Safety & Support</h2>
                      <p className="student-muted mb-0">Use this for urgent placement concerns or workplace incidents.</p>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setShowIncidentModal(true)}
                    disabled={CLOSED_STATUSES.includes(internship.status)}
                  >
                    <AlertTriangle size={16} />
                    Report an Incident
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {showShareModal && selectedArtifactForShare && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowShareModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(event) => event.stopPropagation()}>
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
                <p className="mb-3 text-muted">Share this link with anyone who needs to verify the authenticity of your artifact.</p>
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
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowShareModal(false)}>
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
    </StudentLayout>
  );
};

export default StudentInternship;
