import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Clock,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { EmployerLayout, SupervisionPipeline } from '../../../components/admin/employer';
import PendingLogbooksWidget from '../../../components/dashboard/PendingLogbooksWidget';
import { EmployerDashboardSkeleton } from '../../../components/admin/skeletons';
import TrustProgressWidget from '../../../components/dashboard/TrustProgressWidget';
import { SEO } from '../../../components/common';
import { internshipService } from '../../../services/internship/internshipService';
import type {
  InternshipApplication,
  InternshipEvidence,
} from '../../../services/internship/internshipService';
import { employerService } from '../../../services/employer/employerService';
import type { Employer } from '../../../services/employer/employerService';
// ledger events removed from employer dashboard
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { showToast } from '../../../utils/toast';
import PilotReadinessPanel, { type PilotReadinessItem } from '../../../components/pilot/PilotReadinessPanel';

const STYLES = `
  .ed-page {
    color: var(--el-ink);
  }

  .ed-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: stretch;
    margin-bottom: 22px;
  }

  .ed-command-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    box-shadow: var(--el-shadow);
    padding: 28px;
  }

  .ed-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .ed-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .ed-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .ed-sub {
    max-width: 680px;
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0 0 22px;
  }

  .ed-hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .ed-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 14px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    border: 1px solid transparent;
    transition: transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .ed-btn:hover {
    transform: translateY(-1px);
  }

  .ed-btn-primary {
    background: var(--el-accent);
    color: #fff;
    box-shadow: 0 10px 26px rgba(26,92,255,0.22);
  }

  .ed-btn-primary:hover {
    color: #fff;
    box-shadow: 0 14px 32px rgba(26,92,255,0.30);
  }

  .ed-btn-ghost {
    background: var(--el-surface-2);
    border-color: var(--el-border);
    color: var(--el-ink);
  }

  .ed-btn-ghost:hover {
    color: var(--el-ink);
    background: var(--el-surface);
  }

  .ed-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .ed-health-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .ed-health-label,
  .ed-card-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ed-health-score {
    font-size: 3.1rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 0.95;
    color: var(--el-ink);
  }

  .ed-health-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    background: var(--el-accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 28px rgba(26,92,255,0.25);
  }

  .ed-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin: 18px 0 0;
  }

  .ed-alert {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    border-radius: 18px;
    padding: 14px 16px;
    margin-bottom: 18px;
    border: 1px solid var(--el-border);
    background: var(--el-surface);
    font-size: 13px;
    color: var(--el-muted);
  }

  .ed-alert strong {
    color: var(--el-ink);
  }

  .ed-alert.warning {
    background: rgba(245,158,11,0.10);
    border-color: rgba(245,158,11,0.18);
  }

  .ed-alert.info {
    background: var(--el-accent-soft);
    border-color: rgba(26,92,255,0.18);
  }

  .ed-alert.warning svg {
    color: #f59e0b;
  }

  .ed-alert.info svg {
    color: var(--el-accent);
  }

  .ed-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .ed-metric {
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface);
    padding: 18px;
    min-height: 126px;
    text-decoration: none;
    color: var(--el-ink);
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .ed-metric:hover {
    transform: translateY(-2px);
    box-shadow: var(--el-shadow);
    border-color: var(--el-accent);
    color: var(--el-ink);
  }

  .ed-metric-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }

  .ed-metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ed-metric-value {
    font-size: 2rem;
    font-weight: 820;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .ed-metric-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ed-metric-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--el-accent);
    font-size: 12px;
    font-weight: 750;
  }

  .ed-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: start;
  }

  .ed-main,
  .ed-side {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  .ed-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .ed-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .ed-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    color: var(--el-ink);
    margin: 0;
  }

  .ed-card-body {
    padding: 20px 22px;
  }

  .ed-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ed-table th {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0 0 12px;
  }

  .ed-table td {
    padding: 14px 0;
    border-top: 1px solid var(--el-border);
    vertical-align: middle;
    color: var(--el-ink);
    font-size: 13px;
  }

  .ed-candidate {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 210px;
  }

  .ed-avatar {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    flex-shrink: 0;
  }

  .ed-name {
    font-weight: 760;
    margin: 0 0 2px;
  }

  .ed-email {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  .ed-status {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .ed-status.applied {
    color: #b45309;
    background: rgba(245,158,11,0.12);
  }

  .ed-status.active {
    color: #0f9f62;
    background: rgba(18,183,106,0.12);
  }

  .ed-status.rejected {
    color: #dc2626;
    background: rgba(239,68,68,0.12);
  }

  .ed-status.default {
    color: var(--el-muted);
    background: var(--el-surface-2);
  }

  .ed-substatus {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
  }

  .ed-substatus.ok {
    color: #12b76a;
  }

  .ed-substatus.warn {
    color: #f59e0b;
  }

  .ed-review-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    background: var(--el-surface-2);
    color: var(--el-accent);
    border: 1px solid var(--el-border);
    padding: 8px 11px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 800;
  }

  .ed-review-btn:hover {
    color: var(--el-accent);
    background: var(--el-accent-soft);
  }

  .ed-empty {
    padding: 38px 20px;
    text-align: center;
    color: var(--el-muted);
    font-size: 13px;
  }

  .ed-action-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .ed-action {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: var(--el-ink);
    background: var(--el-surface-2);
    border: 1px solid var(--el-border);
    border-radius: 18px;
    padding: 14px;
    transition: transform 0.12s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .ed-action:hover {
    color: var(--el-ink);
    background: var(--el-surface);
    border-color: var(--el-accent);
    transform: translateY(-1px);
  }

  .ed-action-icon {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ed-action-title {
    font-size: 13px;
    font-weight: 800;
    margin: 0 0 2px;
  }

  .ed-action-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  @media (max-width: 1180px) {
    .ed-hero,
    .ed-grid {
      grid-template-columns: 1fr;
    }

    .ed-health-card {
      max-width: 520px;
    }

    .ed-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .ed-command-card,
    .ed-health-card,
    .ed-card-body,
    .ed-card-header {
      padding-left: 18px;
      padding-right: 18px;
    }

    .ed-metrics {
      grid-template-columns: 1fr;
    }

    .ed-table {
      min-width: 720px;
    }

    .ed-table-wrap {
      overflow-x: auto;
    }
  }
`;

const getStatusClass = (status: string) => {
  if (status === 'APPLIED') return 'applied';
  if (status === 'ACTIVE') return 'active';
  if (status === 'REJECTED') return 'rejected';
  return 'default';
};

const EmployerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentEmployer, setCurrentEmployer] = useState<Employer | null>(null);
  const [trustStats, setTrustStats] = useState<any>(null);
  const [stats, setStats] = useState({
    activeInternships: 0,
    pendingApplications: 0,
    scheduledInterviews: 0,
    totalSupervisors: 0,
  });
  const [recentApplications, setRecentApplications] = useState<InternshipApplication[]>([]);
  const [allApplications, setAllApplications] = useState<InternshipApplication[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [pendingLogbooks, setPendingLogbooks] = useState<InternshipEvidence[]>([]);

  useErrorHandler({});

  const fetchData = async () => {
    try {
      setIsLoading(true);

      let employer: Employer | null = null;

      try {
        employer = await employerService.getCurrentEmployer();
        setCurrentEmployer(employer);
      } catch (error) {
        if (error instanceof Error && !error.message.includes('warnings')) {
          showToast.error('Could not fetch employer details');
        }
      }

      try {
        const trustData = await employerService.getTrustProgress();
        setTrustStats(trustData);
      } catch (error) {
        if (error instanceof Error && !error.message.includes('warnings')) {
          showToast.error('Could not fetch trust stats');
        }
      }

      const [applicationsResponse, evidence] = await Promise.all([
        internshipService.getApplications(),
        internshipService.getPendingEvidence(),
      ]);

      const applications = Array.isArray(applicationsResponse)
        ? applicationsResponse
        : (applicationsResponse as any)?.results || [];

      setAllApplications(applications);

      const evidenceList = Array.isArray(evidence)
        ? evidence
        : (evidence as any)?.results || [];

      setPendingLogbooks(evidenceList.filter((item: any) => item.evidence_type === 'LOGBOOK'));

      const active = applications.filter((app: any) => app.status === 'ACTIVE').length;
      const pending = applications.filter((app: any) => app.status === 'APPLIED').length;
      const shortlisted = applications.filter((app: any) => app.status === 'SHORTLISTED').length;

      let supervisorList: any[] = [];

      try {
        supervisorList = await employerService.getSupervisors();
        setSupervisors(supervisorList);
      } catch (error) {
        if (error instanceof Error && !error.message.includes('warnings')) {
          showToast.error('Could not fetch supervisors');
        }
      }

      setStats({
        activeInternships: active,
        pendingApplications: pending,
        scheduledInterviews: shortlisted,
        totalSupervisors: supervisorList.length,
      });

      const recent = applications
        .filter((app: any) => !['ACTIVE', 'COMPLETED'].includes(app.status))
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5);

      setRecentApplications(recent);
    } catch (error) {
      console.error('Error:', error);
      showToast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSupervisor = async (internId: string, supervisorId: string) => {
    try {
      await internshipService.assignSupervisor(internId, supervisorId, 'employer');
      showToast.success('Supervisor assigned successfully');
      await fetchData();
    } catch (error) {
      console.error('Error:', error);
      showToast.error('Failed to assign supervisor. Please try again.');
    }
  };

  const responseRate = useMemo(() => {
    if (!allApplications.length) return 0;
    const progressed = allApplications.filter((app: any) => app.status !== 'APPLIED').length;
    return Math.round((progressed / allApplications.length) * 100);
  }, [allApplications]);

  const readinessItems: PilotReadinessItem[] = [
    {
      id: 'verified-employer',
      label: 'Employer profile verified',
      description: 'Students and institutions need visible proof that this employer is legitimate before applications start.',
      complete: Boolean(currentEmployer && currentEmployer.trust_level >= 1),
      actionLabel: 'Review profile',
      actionTo: '/employer/dashboard/profile',
    },
    {
      id: 'supervision-team',
      label: 'Supervisor capacity added',
      description: 'A pilot employer needs named supervisors so accepted students can be managed after placement.',
      complete: supervisors.length > 0,
      actionLabel: 'Manage supervisors',
      actionTo: '/employer/dashboard/supervisors',
    },
    {
      id: 'candidate-pipeline',
      label: 'Candidate pipeline started',
      description: 'Applications, shortlists, or active interns confirm the employer is participating in the pilot workflow.',
      complete: allApplications.length > 0,
      actionLabel: 'Open applications',
      actionTo: '/employer/dashboard/applications',
    },
    {
      id: 'response-loop',
      label: 'Application response loop active',
      description: 'Shortlisting, acceptance, or rejection reduces student uncertainty and keeps the pilot credible.',
      complete: allApplications.some((app) => app.status !== 'APPLIED'),
      actionLabel: 'Review candidates',
      actionTo: '/employer/dashboard/applications',
    },
    {
      id: 'active-supervision',
      label: 'Active supervision evidence',
      description: 'Pending or reviewed logbooks show the employer is using EduLink for supervision, not just recruiting.',
      complete:
        pendingLogbooks.length > 0 ||
        allApplications.some((app) => ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)),
      actionLabel: 'Open interns',
      actionTo: '/employer/dashboard/interns',
    },
    {
      id: 'completion-outcomes',
      label: 'Completion outcome path ready',
      description: 'Completed or certified internships become proof for the institution and student after the pilot.',
      complete: allApplications.some((app) => ['COMPLETED', 'CERTIFIED'].includes(app.status)),
      actionLabel: 'View reviews',
      actionTo: '/employer/dashboard/reviews',
    },
  ];

  if (isLoading) {
    return (
      <EmployerLayout>
        <EmployerDashboardSkeleton />
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <SEO
        title="Employer Dashboard"
        description="Manage your internship opportunities, review applications, and track intern performance on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="ed-page">
        <section className="ed-hero">
          <div className="ed-command-card">
            <div className="ed-kicker">
              <Sparkles size={13} />
              Employer Operations
            </div>

            <h1 className="ed-title">
              Placement <span>Command Center</span>
            </h1>

            <p className="ed-sub">
              Welcome back, {user?.firstName || 'Admin'}. Review candidates, coordinate supervisors,
              monitor active interns, and keep institution-facing placement evidence moving.
            </p>

            <div className="ed-hero-actions">
              <Link to="/employer/dashboard/opportunities" className="ed-btn ed-btn-primary">
                <Plus size={15} />
                Post opportunity
              </Link>

              <Link to="/employer/dashboard/applications" className="ed-btn ed-btn-ghost">
                Review applications
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <aside className="ed-health-card">
            <div>
              <div className="ed-health-top">
                <div>
                  <div className="ed-health-label">Pipeline response</div>
                  <div className="ed-health-score">{responseRate}%</div>
                </div>

                <div className="ed-health-icon">
                  <TrendingUp size={21} />
                </div>
              </div>

              <p className="ed-health-note">
                Estimated from applications that moved beyond initial submission. A weak response rate
                signals slow employer operations.
              </p>
            </div>
          </aside>
        </section>

        {currentEmployer && currentEmployer.trust_level < 1 && (
          <div className="ed-alert warning" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Account unverified.</strong> Your employer profile is pending activation.
              Students and institutions may hesitate until the profile is verified.
            </div>
          </div>
        )}

        {currentEmployer && currentEmployer.trust_level === 1 && (
          <div className="ed-alert info" role="alert">
            <UserCheck size={18} />
            <div>
              <strong>Verified employer.</strong> Complete your first successful internship to move
              toward Trusted Employer status.
            </div>
          </div>
        )}

        <section className="ed-metrics">
          <Link to="/employer/dashboard/interns" className="ed-metric">
            <div className="ed-metric-top">
              <div>
                <div className="ed-metric-label">Active interns</div>
                <div className="ed-metric-value">{stats.activeInternships}</div>
              </div>
              <div className="ed-metric-icon">
                <Briefcase size={19} />
              </div>
            </div>
            <span className="ed-metric-link">
              View interns <ArrowRight size={13} />
            </span>
          </Link>

          <Link to="/employer/dashboard/applications" className="ed-metric">
            <div className="ed-metric-top">
              <div>
                <div className="ed-metric-label">Pending applications</div>
                <div className="ed-metric-value">{stats.pendingApplications}</div>
              </div>
              <div className="ed-metric-icon">
                <FileText size={19} />
              </div>
            </div>
            <span className="ed-metric-link">
              Review queue <ArrowRight size={13} />
            </span>
          </Link>

          <Link to="/employer/dashboard/applications?status=SHORTLISTED" className="ed-metric">
            <div className="ed-metric-top">
              <div>
                <div className="ed-metric-label">Shortlisted</div>
                <div className="ed-metric-value">{stats.scheduledInterviews}</div>
              </div>
              <div className="ed-metric-icon">
                <Clock size={19} />
              </div>
            </div>
            <span className="ed-metric-link">
              View shortlist <ArrowRight size={13} />
            </span>
          </Link>

          <Link to="/employer/dashboard/supervisors" className="ed-metric">
            <div className="ed-metric-top">
              <div>
                <div className="ed-metric-label">Supervisors</div>
                <div className="ed-metric-value">{stats.totalSupervisors}</div>
              </div>
              <div className="ed-metric-icon">
                <Users size={19} />
              </div>
            </div>
            <span className="ed-metric-link">
              Manage team <ArrowRight size={13} />
            </span>
          </Link>
        </section>

        <div style={{ marginBottom: 22 }}>
          <PilotReadinessPanel
            title="Employer pilot operating checklist"
            subtitle="Confirm your team can host verified students without falling back to email-only supervision."
            items={readinessItems}
            variant="employer"
          />
        </div>

        <div className="ed-grid">
          <main className="ed-main">
            <PendingLogbooksWidget
              logbooks={pendingLogbooks}
              isLoading={isLoading}
              viewAllLink="/employer/dashboard/interns"
              reviewLinkPrefix="/employer/dashboard/applications"
            />

            <SupervisionPipeline
              interns={allApplications}
              supervisors={supervisors}
              onAssignSupervisor={handleAssignSupervisor}
            />

            <section className="ed-card">
              <div className="ed-card-header">
                <div>
                  <div className="ed-card-label">Candidate pipeline</div>
                  <h2 className="ed-card-title">Recent applications</h2>
                </div>

                <Link to="/employer/dashboard/applications" className="ed-review-btn">
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              <div className="ed-card-body">
                <div className="ed-table-wrap">
                  <table className="ed-table">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Role</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentApplications.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="ed-empty">No recent applications found.</div>
                          </td>
                        </tr>
                      ) : (
                        recentApplications.map((app) => (
                          <tr key={app.id}>
                            <td>
                              <div className="ed-candidate">
                                <div className="ed-avatar">
                                  {app.student_info?.name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <p className="ed-name">{app.student_info?.name || 'Unknown student'}</p>
                                  <p className="ed-email">{app.student_info?.email || 'No email available'}</p>
                                </div>
                              </div>
                            </td>

                            <td>{app.title}</td>

                            <td>
                              {app.created_at
                                ? new Date(app.created_at).toLocaleDateString()
                                : 'N/A'}
                            </td>

                            <td>
                              <span className={`ed-status ${getStatusClass(app.status)}`}>
                                {app.status}
                              </span>

                              {app.employer_supervisor_id ? (
                                <div className="ed-substatus ok">
                                  <UserCheck size={11} />
                                  Assigned
                                </div>
                              ) : (
                                (app.status === 'ACCEPTED' || app.status === 'ACTIVE') && (
                                  <div className="ed-substatus warn">
                                    <AlertTriangle size={11} />
                                    No mentor
                                  </div>
                                )
                              )}
                            </td>

                            <td>
                              <Link
                                to={`/employer/dashboard/applications/${app.id}`}
                                className="ed-review-btn"
                              >
                                Review
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </main>

          <aside className="ed-side">
            <TrustProgressWidget data={trustStats} isLoading={isLoading} userType="employer" />

            {/* Audit trail / Trust history removed from Employer dashboard */}

            <section className="ed-card">
              <div className="ed-card-header">
                <div>
                  <div className="ed-card-label">Command shortcuts</div>
                  <h2 className="ed-card-title">Quick actions</h2>
                </div>
              </div>

              <div className="ed-card-body">
                <div className="ed-action-list">
                  <Link to="/employer/dashboard/opportunities" className="ed-action">
                    <div className="ed-action-icon">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <p className="ed-action-title">Post new internship</p>
                      <p className="ed-action-sub">Create a verified opportunity</p>
                    </div>
                    <ArrowRight size={15} />
                  </Link>

                  <Link to="/employer/dashboard/profile-requests" className="ed-action">
                    <div className="ed-action-icon">
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <p className="ed-action-title">Review profile requests</p>
                      <p className="ed-action-sub">Approve staff access</p>
                    </div>
                    <ArrowRight size={15} />
                  </Link>

                  <Link to="/employer/dashboard/supervisors" className="ed-action">
                    <div className="ed-action-icon">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="ed-action-title">Invite supervisor</p>
                      <p className="ed-action-sub">Add supervision capacity</p>
                    </div>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerDashboard;
