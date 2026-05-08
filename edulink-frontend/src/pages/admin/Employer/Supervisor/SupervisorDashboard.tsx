import React, { useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  Users,
  FileText,
  AlertTriangle,
  LayoutGrid,
  ChevronRight,
  Clock,
  Calendar,
  User,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { Incident } from '../../../../services/internship/internshipService';
import { Link } from 'react-router-dom';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorDashboardSkeleton from '../../../../components/admin/skeletons/SupervisorDashboardSkeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePusher } from '../../../../hooks/usePusher';
import { SupervisorWorkspacePage } from '../../../../components/employer/supervisor/workspace';

const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['supervisor-dashboard-data'],
    queryFn: async () => {
      const [applicationsResponse, pendingEvidenceResponse, incidentsResponse] =
        await Promise.all([
          internshipService.getApplications(),
          internshipService.getPendingEvidence(),
          internshipService.getIncidents(),
        ]);

      const applications = Array.isArray(applicationsResponse)
        ? applicationsResponse
        : (applicationsResponse as any)?.results || [];

      const pendingEvidence = Array.isArray(pendingEvidenceResponse)
        ? pendingEvidenceResponse
        : (pendingEvidenceResponse as any)?.results || [];

      const incidents = Array.isArray(incidentsResponse)
        ? incidentsResponse
        : (incidentsResponse as any)?.results || [];

      return {
        interns: applications.length,
        pendingLogbooks: pendingEvidence.length,
        openIncidents: incidents.filter((i: Incident) => i.status === 'OPEN').length,
        recentLogbooks: pendingEvidence.slice(0, 5),
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['supervisor-dashboard-data'] });
  }, [queryClient]);

  usePusher(
    user ? `user-${user.id}` : undefined,
    'notification-received',
    handleRealtimeUpdate
  );

  const stats = dashboardData || {
    interns: 0,
    pendingLogbooks: 0,
    openIncidents: 0,
    recentLogbooks: [],
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const reviewLoadStatus =
    stats.pendingLogbooks > 8
      ? 'Heavy review queue'
      : stats.pendingLogbooks > 0
      ? 'Reviews pending'
      : 'Clear review queue';

  const incidentStatus =
    stats.openIncidents > 0 ? 'Requires attention' : 'No active incidents';

  const statCards = [
    {
      label: 'Assigned Interns',
      value: stats.interns,
      helper: 'Students currently under your supervision',
      icon: Users,
      tone: 'blue',
      link: '/employer/supervisor/internships',
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingLogbooks,
      helper: reviewLoadStatus,
      icon: FileText,
      tone: 'amber',
      link: '/employer/supervisor/logbooks',
    },
    {
      label: 'Open Incidents',
      value: stats.openIncidents,
      helper: incidentStatus,
      icon: AlertTriangle,
      tone: 'red',
      link: '/employer/supervisor/incidents',
    },
  ];

  if (loading) {
    return <SupervisorDashboardSkeleton />;
  }

  return (
    <SupervisorLayout>
      <SupervisorWorkspacePage className="supervisor-dashboard">
        <div className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
          {/* Header */}
          <div className="dashboard-hero mb-4">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
              <div>
                <div className="eyebrow mb-3">
                  <LayoutGrid size={15} />
                  Employer Supervisor Workspace
                </div>

                <h1 className="page-title mb-2">
                  Good day, {user?.firstName || 'Supervisor'}
                </h1>

                <p className="page-subtitle mb-0">
                  Review intern evidence, monitor progress, and keep workplace
                  supervision records accountable.
                </p>
              </div>

              <div className="hero-meta">
                <div className="meta-item">
                  <Calendar size={16} />
                  <span>{formattedDate}</span>
                </div>

                <div className="meta-item meta-success">
                  <ShieldCheck size={16} />
                  <span>Supervisor Access</span>
                </div>
              </div>
            </div>

            <div className="hero-summary-grid mt-4">
              <div className="hero-summary-card primary">
                <div>
                  <span className="summary-label">Main priority</span>
                  <h2>{stats.pendingLogbooks}</h2>
                  <p>Evidence submissions awaiting review</p>
                </div>

                <Link to="/employer/supervisor/logbooks" className="summary-action">
                  Review queue
                  <ArrowUpRight size={16} />
                </Link>
              </div>

              <div className="hero-summary-card">
                <span className="summary-label">Interns</span>
                <h2>{stats.interns}</h2>
                <p>Assigned to you</p>
              </div>

              <div className="hero-summary-card">
                <span className="summary-label">Incidents</span>
                <h2>{stats.openIncidents}</h2>
                <p>{incidentStatus}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="row g-3 g-xl-4 mb-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="col-12 col-md-6 col-xl-4">
                <Link to={stat.link} className="text-decoration-none">
                  <div className={`metric-card tone-${stat.tone}`}>
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div className="metric-icon">
                        <stat.icon size={20} />
                      </div>

                      <div className="metric-arrow">
                        <ArrowUpRight size={15} />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="metric-label">{stat.label}</p>
                      <h3>{stat.value}</h3>
                      <span>{stat.helper}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          <div className="row g-4">
            {/* Review Queue */}
            <div className="col-12 col-xl-8">
              <div className="workspace-card h-100">
                <div className="workspace-card-header">
                  <div>
                    <div className="section-kicker">
                      <Activity size={14} />
                      Review Workflow
                    </div>
                    <h5>Pending Reviews</h5>
                    <p>Recent logbooks and milestones requiring supervisor action.</p>
                  </div>

                  <Link to="/employer/supervisor/logbooks" className="soft-link">
                    View all
                    <ChevronRight size={16} />
                  </Link>
                </div>

                <div className="review-list">
                  {stats.recentLogbooks.length > 0 ? (
                    stats.recentLogbooks.map((evidence: any) => (
                      <div key={evidence.id} className="review-item">
                        <div className="review-main">
                          <div className="review-icon">
                            <FileText size={19} />
                          </div>

                          <div className="min-w-0">
                            <h6>{evidence.title}</h6>

                            <div className="review-meta">
                              <span>
                                <User size={13} />
                                {evidence.student_info?.name || 'Unknown Intern'}
                              </span>

                              <span>
                                <Clock size={13} />
                                {new Date(evidence.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="review-side">
                          <span className="type-pill">
                            {evidence.evidence_type}
                          </span>

                          <span className="status-pill warning">
                            <Clock size={12} />
                            Pending
                          </span>

                          <Link
                            to={
                              evidence.evidence_type === 'MILESTONE'
                                ? '/employer/supervisor/milestones'
                                : '/employer/supervisor/logbooks'
                            }
                            className="review-btn"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <CheckCircle2 size={34} />
                      </div>

                      <h6>All caught up</h6>
                      <p>
                        No pending reviews right now. New intern submissions will appear
                        here automatically.
                      </p>

                      <Link to="/employer/supervisor/internships" className="empty-link">
                        View assigned interns
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-12 col-xl-4">
              <div className="d-flex flex-column gap-4">
                <div className="workspace-card">
                  <div className="workspace-card-header compact">
                    <div>
                      <div className="section-kicker">
                        <ShieldCheck size={14} />
                        Attention
                      </div>
                      <h5>Supervisor Focus</h5>
                    </div>
                  </div>

                  <div className="focus-stack">
                    <div className="focus-item">
                      <div className="focus-dot amber" />
                      <div>
                        <h6>{reviewLoadStatus}</h6>
                        <p>
                          {stats.pendingLogbooks > 0
                            ? `${stats.pendingLogbooks} submission${
                                stats.pendingLogbooks === 1 ? '' : 's'
                              } need review.`
                            : 'No evidence currently waiting for approval.'}
                        </p>
                      </div>
                    </div>

                    <div className="focus-item">
                      <div
                        className={`focus-dot ${
                          stats.openIncidents > 0 ? 'red' : 'green'
                        }`}
                      />
                      <div>
                        <h6>{incidentStatus}</h6>
                        <p>
                          {stats.openIncidents > 0
                            ? 'Resolve or escalate incidents to maintain supervision trust.'
                            : 'No misconduct or escalation item is currently open.'}
                        </p>
                      </div>
                    </div>

                    <div className="focus-item">
                      <div className="focus-dot blue" />
                      <div>
                        <h6>Intern oversight active</h6>
                        <p>
                          {stats.interns} intern{stats.interns === 1 ? '' : 's'} linked
                          to your supervisor account.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="workspace-card">
                  <div className="workspace-card-header compact">
                    <div>
                      <div className="section-kicker">
                        <ArrowUpRight size={14} />
                        Quick Actions
                      </div>
                      <h5>Common Tasks</h5>
                    </div>
                  </div>

                  <div className="quick-action-list">
                    <Link to="/employer/supervisor/logbooks" className="quick-action">
                      <span className="quick-icon blue">
                        <FileText size={17} />
                      </span>
                      <span>
                        <strong>Review Logbooks</strong>
                        <small>Approve or reject submitted evidence</small>
                      </span>
                      <ChevronRight size={16} />
                    </Link>

                    <Link to="/employer/supervisor/internships" className="quick-action">
                      <span className="quick-icon slate">
                        <Users size={17} />
                      </span>
                      <span>
                        <strong>My Interns</strong>
                        <small>View assigned students and placements</small>
                      </span>
                      <ChevronRight size={16} />
                    </Link>

                    <Link to="/employer/supervisor/incidents" className="quick-action">
                      <span className="quick-icon red">
                        <AlertTriangle size={17} />
                      </span>
                      <span>
                        <strong>Report Incident</strong>
                        <small>Flag misconduct or workplace concerns</small>
                      </span>
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .supervisor-dashboard {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 32rem),
              linear-gradient(180deg, #f8fafc 0%, #ffffff 52%, #f8fafc 100%);
            color: #0f172a;
          }

          .dashboard-hero {
            padding: 1.5rem;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.86);
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.045);
            backdrop-filter: blur(14px);
          }

          .eyebrow,
          .section-kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            font-size: 0.76rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #2563eb;
          }

          .page-title {
            font-size: clamp(1.75rem, 3vw, 2.35rem);
            font-weight: 800;
            letter-spacing: -0.045em;
            color: #0f172a;
          }

          .page-subtitle {
            max-width: 680px;
            color: #64748b;
            font-size: 0.98rem;
            line-height: 1.65;
          }

          .hero-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            align-items: flex-start;
            justify-content: flex-end;
          }

          .meta-item {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.72rem 0.95rem;
            border-radius: 999px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
            color: #475569;
            font-size: 0.86rem;
            font-weight: 600;
            white-space: nowrap;
          }

          .meta-success {
            color: #047857;
            background: #ecfdf5;
            border-color: #bbf7d0;
          }

          .hero-summary-grid {
            display: grid;
            grid-template-columns: 1.4fr 0.8fr 0.8fr;
            gap: 1rem;
          }

          .hero-summary-card {
            padding: 1.15rem;
            border-radius: 20px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .hero-summary-card.primary {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            color: #ffffff;
          }

          .summary-label {
            display: block;
            margin-bottom: 0.4rem;
            color: #64748b;
            font-size: 0.76rem;
            font-weight: 700;
            letter-spacing: 0.035em;
            text-transform: uppercase;
          }

          .hero-summary-card.primary .summary-label,
          .hero-summary-card.primary p {
            color: rgba(255, 255, 255, 0.72);
          }

          .hero-summary-card h2 {
            margin: 0;
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -0.04em;
          }

          .hero-summary-card p {
            margin: 0.15rem 0 0;
            color: #64748b;
            font-size: 0.9rem;
          }

          .summary-action {
            align-self: flex-start;
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            padding: 0.65rem 0.8rem;
            border-radius: 999px;
            color: #0f172a;
            background: #ffffff;
            font-size: 0.82rem;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
          }

          .metric-card,
          .workspace-card {
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 22px;
            background: #ffffff;
            box-shadow: 0 16px 35px rgba(15, 23, 42, 0.045);
          }

          .metric-card {
            height: 100%;
            padding: 1.25rem;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .metric-card:hover {
            transform: translateY(-3px);
            border-color: rgba(37, 99, 235, 0.18);
            box-shadow: 0 22px 42px rgba(15, 23, 42, 0.075);
          }

          .metric-icon,
          .metric-arrow {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
          }

          .metric-icon {
            width: 42px;
            height: 42px;
          }

          .metric-arrow {
            width: 32px;
            height: 32px;
            color: #94a3b8;
            background: #f8fafc;
          }

          .tone-blue .metric-icon {
            color: #2563eb;
            background: #eff6ff;
          }

          .tone-amber .metric-icon {
            color: #b45309;
            background: #fffbeb;
          }

          .tone-red .metric-icon {
            color: #dc2626;
            background: #fef2f2;
          }

          .metric-label {
            margin-bottom: 0.3rem;
            color: #64748b;
            font-size: 0.84rem;
            font-weight: 700;
          }

          .metric-card h3 {
            margin: 0;
            color: #0f172a;
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -0.04em;
          }

          .metric-card span {
            display: block;
            margin-top: 0.3rem;
            color: #64748b;
            font-size: 0.86rem;
          }

          .workspace-card {
            overflow: hidden;
          }

          .workspace-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.35rem 1.35rem 1rem;
            border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          }

          .workspace-card-header.compact {
            padding-bottom: 0.85rem;
          }

          .workspace-card-header h5 {
            margin: 0.35rem 0 0.25rem;
            color: #0f172a;
            font-size: 1.05rem;
            font-weight: 800;
            letter-spacing: -0.02em;
          }

          .workspace-card-header p {
            margin: 0;
            color: #64748b;
            font-size: 0.88rem;
          }

          .soft-link {
            display: inline-flex;
            align-items: center;
            gap: 0.2rem;
            color: #2563eb;
            font-size: 0.86rem;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
          }

          .review-list {
            padding: 0.35rem;
          }

          .review-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 18px;
            transition: background 0.18s ease;
          }

          .review-item:hover {
            background: #f8fafc;
          }

          .review-main {
            display: flex;
            align-items: center;
            gap: 0.9rem;
            min-width: 0;
          }

          .review-icon {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 15px;
            color: #2563eb;
            background: #eff6ff;
          }

          .review-main h6 {
            margin: 0 0 0.4rem;
            color: #0f172a;
            font-size: 0.94rem;
            font-weight: 800;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .review-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            color: #64748b;
            font-size: 0.8rem;
          }

          .review-meta span {
            display: inline-flex;
            align-items: center;
            gap: 0.32rem;
          }

          .review-side {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.55rem;
            flex-wrap: wrap;
          }

          .type-pill,
          .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.45rem 0.65rem;
            border-radius: 999px;
            font-size: 0.73rem;
            font-weight: 800;
            white-space: nowrap;
          }

          .type-pill {
            color: #334155;
            background: #f1f5f9;
          }

          .status-pill.warning {
            color: #92400e;
            background: #fef3c7;
          }

          .review-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 34px;
            padding: 0.45rem 0.8rem;
            border-radius: 999px;
            color: #ffffff;
            background: #2563eb;
            font-size: 0.78rem;
            font-weight: 800;
            text-decoration: none;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.18);
          }

          .review-btn:hover {
            color: #ffffff;
            background: #1d4ed8;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 1.5rem;
            text-align: center;
          }

          .empty-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            margin-bottom: 1rem;
            border-radius: 24px;
            color: #059669;
            background: #ecfdf5;
          }

          .empty-state h6 {
            margin-bottom: 0.35rem;
            color: #0f172a;
            font-size: 1rem;
            font-weight: 800;
          }

          .empty-state p {
            max-width: 380px;
            margin-bottom: 1rem;
            color: #64748b;
            font-size: 0.9rem;
            line-height: 1.55;
          }

          .empty-link {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            color: #2563eb;
            font-size: 0.86rem;
            font-weight: 800;
            text-decoration: none;
          }

          .focus-stack,
          .quick-action-list {
            padding: 0.35rem 1rem 1rem;
          }

          .focus-item {
            display: flex;
            gap: 0.8rem;
            padding: 0.9rem 0;
            border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          }

          .focus-item:last-child {
            border-bottom: 0;
          }

          .focus-dot {
            width: 10px;
            height: 10px;
            margin-top: 0.35rem;
            border-radius: 999px;
            flex: 0 0 auto;
          }

          .focus-dot.amber {
            background: #f59e0b;
          }

          .focus-dot.red {
            background: #ef4444;
          }

          .focus-dot.green {
            background: #10b981;
          }

          .focus-dot.blue {
            background: #2563eb;
          }

          .focus-item h6 {
            margin: 0 0 0.22rem;
            color: #0f172a;
            font-size: 0.9rem;
            font-weight: 800;
          }

          .focus-item p {
            margin: 0;
            color: #64748b;
            font-size: 0.82rem;
            line-height: 1.5;
          }

          .quick-action {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 0.75rem;
            padding: 0.85rem;
            border-radius: 17px;
            color: #0f172a;
            text-decoration: none;
            transition: background 0.18s ease, transform 0.18s ease;
          }

          .quick-action:hover {
            background: #f8fafc;
            transform: translateX(2px);
            color: #0f172a;
          }

          .quick-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 14px;
          }

          .quick-icon.blue {
            color: #2563eb;
            background: #eff6ff;
          }

          .quick-icon.slate {
            color: #475569;
            background: #f1f5f9;
          }

          .quick-icon.red {
            color: #dc2626;
            background: #fef2f2;
          }

          .quick-action strong {
            display: block;
            margin-bottom: 0.15rem;
            font-size: 0.88rem;
            font-weight: 800;
          }

          .quick-action small {
            display: block;
            color: #64748b;
            font-size: 0.76rem;
            line-height: 1.35;
          }

          .min-w-0 {
            min-width: 0;
          }

          @media (max-width: 991.98px) {
            .hero-summary-grid {
              grid-template-columns: 1fr;
            }

            .hero-summary-card.primary {
              flex-direction: column;
            }

            .hero-meta {
              justify-content: flex-start;
            }
          }

          @media (max-width: 767.98px) {
            .dashboard-hero {
              padding: 1.1rem;
              border-radius: 20px;
            }

            .review-item {
              align-items: flex-start;
              flex-direction: column;
            }

            .review-side {
              justify-content: flex-start;
              width: 100%;
              padding-left: 3.25rem;
            }

            .workspace-card-header {
              flex-direction: column;
            }
          }
        `}</style>
      </SupervisorWorkspacePage>
    </SupervisorLayout>
  );
};

export default SupervisorDashboard;
