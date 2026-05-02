import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { artifactService, type Artifact } from '../../services/reports/artifactService';
import { studentService } from '../../services/student/studentService';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { dateFormatter } from '../../utils/dateFormatter';
import type { Internship } from '../../types/internship';
import StudentDashboardSkeleton from '../../components/student/skeletons/StudentDashboardSkeleton';
import '../../styles/student-portal.css';

const ARTIFACT_LIMITS = {
  CERTIFICATE: 2,
  LOGBOOK_REPORT: 5,
  PERFORMANCE_SUMMARY: 5,
};

const StudentArtifacts: React.FC = () => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [artifactData, internshipData] = await Promise.all([
          artifactService.getArtifacts(),
          studentService.getActiveInternship(),
        ]);
        setArtifacts(artifactData);
        if (internshipData) {
          setInternship((internshipData as any).internship || (internshipData as any));
        }
      } catch (err) {
        const message = getErrorMessage(err, { action: 'Load Artifacts' });
        showToast.error(message);
        logError(err, { action: 'Load Artifacts' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownload = async (artifact: Artifact) => {
    let toastId: string | undefined;
    try {
      toastId = showToast.loading('Preparing download...');
      await artifactService.downloadArtifact(artifact);
      if (toastId) showToast.dismiss(toastId);
      showToast.success('Download started');
    } catch (err) {
      if (toastId) showToast.dismiss(toastId);
      const message = getErrorMessage(err, { action: 'Download Artifact' });
      showToast.error(message);
      logError(err, { action: 'Download Artifact', data: { artifactId: artifact.id } });
    }
  };

  const handleGenerate = async (type: keyof typeof ARTIFACT_LIMITS) => {
    if (!internship) {
      showToast.error('You need an active internship before generating artifacts.');
      return;
    }

    const label = type === 'CERTIFICATE' ? 'Certificate' : type === 'LOGBOOK_REPORT' ? 'Logbook Report' : 'Performance Summary';
    let toastId: string | undefined;

    try {
      setGenerating(type);
      toastId = showToast.loading(`Generating ${label}...`);
      const newArtifact = await artifactService.generateArtifact(internship.id, type);
      setArtifacts([newArtifact, ...artifacts]);
      if (toastId) showToast.dismiss(toastId);
      showToast.success(`${label} generated successfully`);
    } catch (err) {
      if (toastId) showToast.dismiss(toastId);
      const message = getErrorMessage(err, { action: `Generate ${label}` });
      showToast.error(message);
      logError(err, { action: 'Generate Artifact', data: { type, internshipId: internship.id } });
    } finally {
      setGenerating(null);
    }
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'CERTIFICATE':
        return <Award size={20} />;
      case 'LOGBOOK_REPORT':
        return <FileText size={20} />;
      case 'PERFORMANCE_SUMMARY':
        return <RefreshCw size={20} />;
      default:
        return <FileDown size={20} />;
    }
  };

  const getGenerationCount = (type: string) => artifacts.filter(artifact => artifact.artifact_type === type).length;
  const isLimitReached = (type: keyof typeof ARTIFACT_LIMITS) => getGenerationCount(type) >= ARTIFACT_LIMITS[type];

  const generationActions = [
    {
      type: 'LOGBOOK_REPORT' as const,
      title: 'Logbook report',
      copy: 'Generate a formal report from your recorded and reviewed placement evidence.',
      available: Boolean(internship),
    },
    {
      type: 'PERFORMANCE_SUMMARY' as const,
      title: 'Performance summary',
      copy: 'Create a compact summary of your placement performance and review history.',
      available: Boolean(internship),
    },
    {
      type: 'CERTIFICATE' as const,
      title: 'Completion certificate',
      copy: 'Available after the institution certifies your completed placement.',
      available: Boolean(internship && internship.status === 'CERTIFIED'),
    },
  ];

  return (
    <StudentLayout>
      {loading ? (
        <StudentDashboardSkeleton />
      ) : (
        <div className="student-workspace">
          <section className="student-command-hero">
            <div className="student-command-copy">
              <span className="student-kicker">Verified document vault</span>
              <h1>Artifacts & Reports</h1>
              <p>Access certificates, logbook reports, and official internship records that can be verified by employers and institutions.</p>
              <div className="student-command-meta">
                <span><FileText size={15} /> {artifacts.length} generated</span>
                <span><ShieldCheck size={15} /> Public verification enabled</span>
                <span><Clock size={15} /> Snapshot at generation time</span>
              </div>
            </div>
            <div className="student-command-card">
              <span className="student-kicker">Active placement</span>
              <strong>{internship ? 'Ready' : 'Locked'}</strong>
              <p className="student-command-note">{internship ? internship.title : 'Start or declare a placement before generating reports.'}</p>
            </div>
          </section>

          <div className="student-workspace-grid">
            <main>
              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Your Generated Documents</h2>
                      <p className="student-muted mb-0">Download records or open a public verification page.</p>
                    </div>
                  </div>
                  {artifacts.length > 0 ? (
                    <div className="student-evidence-rail">
                      {artifacts.map(artifact => (
                        <div className="student-evidence-row" key={artifact.id}>
                          <div className="student-evidence-icon success">{getArtifactIcon(artifact.artifact_type)}</div>
                          <div>
                            <strong>{artifact.artifact_type_display}</strong>
                            <span>ID {artifact.id.substring(0, 8)} · Generated {dateFormatter.shortDate(artifact.created_at)}</span>
                          </div>
                          <div className="d-flex gap-2">
                            <Link to={`/verify/${artifact.id}`} target="_blank" className="btn btn-sm btn-outline-info">
                              <ExternalLink size={14} />
                            </Link>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleDownload(artifact)}>
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <div className="student-empty-icon mx-auto mb-3">
                        <FileText size={34} />
                      </div>
                      <h4 className="fw-bold mb-2">No Artifacts Found</h4>
                      <p className="student-muted mb-0">Generate reports once your placement evidence is ready.</p>
                    </div>
                  )}
                </div>
              </section>
            </main>

            <aside>
              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Generate New</h2>
                      <p className="student-muted mb-0">Each artifact has a generation limit to protect record integrity.</p>
                    </div>
                  </div>
                  <div className="student-history-list">
                    {generationActions.map(action => (
                      <div className="student-history-item" key={action.type}>
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                          <div>
                            <div className="fw-bold">{action.title}</div>
                            <span className="student-muted small">{action.copy}</span>
                          </div>
                          <span className="badge bg-light text-muted border">
                            {getGenerationCount(action.type)}/{ARTIFACT_LIMITS[action.type]}
                          </span>
                        </div>
                        <button
                          className="btn btn-sm btn-primary w-100"
                          onClick={() => handleGenerate(action.type)}
                          disabled={!action.available || !!generating || isLimitReached(action.type)}
                        >
                          {generating === action.type ? 'Generating...' : isLimitReached(action.type) ? 'Limit reached' : 'Generate'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Security & Audit</h2>
                      <p className="student-muted mb-0">Artifacts capture your profile and logbook data at the exact generation moment.</p>
                    </div>
                  </div>
                  <div className="d-flex gap-3">
                    <ShieldCheck size={20} className="text-success flex-shrink-0" />
                    <p className="small text-muted mb-0">Generated artifacts are recorded in the EduLink ledger for verification by employers and academic boards.</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentArtifacts;
