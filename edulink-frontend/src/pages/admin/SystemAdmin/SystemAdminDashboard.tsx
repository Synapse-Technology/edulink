import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  Key,
  LifeBuoy,
  RefreshCw,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

import {
  adminAuthService,
  type AdminDashboardStats,
} from '../../../services/auth/adminAuthService';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import AdminLayout from '../../../components/admin/AdminLayout';
import AdminDashboardSkeleton from '../../../components/admin/skeletons/AdminDashboardSkeleton';
import { SEO } from '../../../components/common';
import { showToast } from '../../../utils/toast';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const SystemAdminDashboard: React.FC = () => {
  const { admin } = useAdminAuth();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const isAuditor = admin?.role === 'AUDITOR';
  const isModerator = admin?.role === 'MODERATOR';

  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 300000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    if (!isLoading) setIsRefreshing(true);

    try {
      const response = await adminAuthService.getDashboardStats();

      setStats(response);
      setError('');
    } catch (err) {
      const sanitized = sanitizeAdminError(err);

      console.error('Dashboard error:', sanitized.title);
      showToast.error(sanitized.userMessage);

      if ((err as any)?.status === 401 || (err as any)?.response?.status === 401) {
        setError('Session expired. Please log in again.');

        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 3000);
      } else {
        setError(sanitized.userMessage);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const systemStatus = stats?.systemHealth?.status || 'healthy';
  const systemMessage = stats?.systemHealth?.message || 'Platform operational';

  const health = {
    healthy: {
      label: 'Operational',
      className: 'ops-health-good',
      icon: <CheckCircle size={17} />,
    },
    warning: {
      label: 'Attention needed',
      className: 'ops-health-warning',
      icon: <AlertTriangle size={17} />,
    },
    error: {
      label: 'Incident active',
      className: 'ops-health-danger',
      icon: <AlertTriangle size={17} />,
    },
  }[systemStatus as 'healthy' | 'warning' | 'error'] || {
    label: 'Unknown',
    className: 'ops-health-muted',
    icon: <Activity size={17} />,
  };

  const operationalMetrics = [
    {
      label: 'Total users',
      value: stats?.totalUsers || 0,
      icon: <Users size={21} />,
      to: '/admin/users',
      action: 'View users',
      tone: 'blue',
      show: true,
    },
    {
      label: 'Institutions',
      value: stats?.totalInstitutions || 0,
      icon: <Building size={21} />,
      to: '/admin/institutions',
      action: 'Manage institutions',
      tone: 'green',
      show: true,
    },
    {
      label: 'Pending institution requests',
      value: stats?.pendingInstitutions || 0,
      icon: <Clock size={21} />,
      to: '/admin/institutions',
      action: 'Review queue',
      tone: 'amber',
      show: !isAuditor,
    },
    {
      label: 'Student interest signals',
      value: stats?.totalStudentInterests || 0,
      icon: <TrendingUp size={21} />,
      to: '/admin/analytics/institutions',
      action: 'View demand',
      tone: 'indigo',
      show: true,
    },
  ].filter((metric) => metric.show);

  const operationalAlerts = useMemo(() => {
    const alerts = [];

    if ((stats?.pendingInstitutions || 0) > 0) {
      alerts.push({
        title: 'Institution requests awaiting review',
        description: `${stats?.pendingInstitutions || 0} institution request${
          (stats?.pendingInstitutions || 0) === 1 ? '' : 's'
        } need admin action.`,
        tone: 'warning',
        to: '/admin/institutions',
      });
    }

    if ((stats?.pendingInvites || 0) > 0 && isSuperAdmin) {
      alerts.push({
        title: 'Staff invites pending',
        description: `${stats?.pendingInvites || 0} staff invitation${
          (stats?.pendingInvites || 0) === 1 ? '' : 's'
        } still pending.`,
        tone: 'info',
        to: '/admin/staff/invites',
      });
    }

    if (systemStatus !== 'healthy') {
      alerts.push({
        title: 'Platform health needs attention',
        description: systemMessage,
        tone: systemStatus === 'error' ? 'danger' : 'warning',
        to: '/admin/health',
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        title: 'No critical operational alerts',
        description: 'Platform queues and health signals look stable from the latest dashboard snapshot.',
        tone: 'success',
        to: '/admin/logs',
      });
    }

    return alerts;
  }, [
    isSuperAdmin,
    stats?.pendingInstitutions,
    stats?.pendingInvites,
    systemMessage,
    systemStatus,
  ]);

  const getSeverityClass = (severity?: string) => {
    switch (severity) {
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      case 'info':
      default:
        return 'info';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminDashboardSkeleton />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="ops-error-state">
          <AlertTriangle size={26} />
          <div>
            <h2>Dashboard Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <SEO
        title="Platform Operations Center"
        description="EduLink KE platform operations, monitoring, support, trust, institutions, employers, and administrative oversight."
      />

      <div className="ops-dashboard">
        <header className="ops-header">
          <div>
            <span className="ops-kicker">System administration</span>
            <h1>Platform Operations Center</h1>
            <p>
              Operational visibility across institutions, employers, users,
              support, trust, audit activity, and infrastructure health.
            </p>
          </div>

          <div className="ops-header-actions">
            <button
              type="button"
              className="ops-refresh-btn"
              onClick={fetchDashboardData}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? 'spin-animation' : ''}
              />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>

            <div className={`ops-health-badge ${health.className}`}>
              {health.icon}
              <div>
                <span>Platform status</span>
                <strong>{health.label}</strong>
              </div>
            </div>
          </div>
        </header>

        <section className="ops-metrics-grid">
          {operationalMetrics.map((metric) => (
            <article className={`ops-metric-card ${metric.tone}`} key={metric.label}>
              <div className="ops-metric-top">
                <div className="ops-metric-icon">{metric.icon}</div>
                <Link to={metric.to}>
                  {metric.action}
                  <ChevronRight size={14} />
                </Link>
              </div>

              <strong>{metric.value.toLocaleString()}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </section>

        <section className="ops-main-grid">
          <div className="ops-left-column">
            <section className="ops-panel">
              <div className="ops-panel-header">
                <div>
                  <span className="ops-panel-kicker">Action required</span>
                  <h2>Operational alerts</h2>
                </div>

                <Link to="/admin/logs" className="ops-small-link">
                  Audit logs
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="ops-alert-list">
                {operationalAlerts.map((alert) => (
                  <Link
                    to={alert.to}
                    className={`ops-alert-item ${alert.tone}`}
                    key={alert.title}
                  >
                    <div className="ops-alert-dot" />
                    <div>
                      <strong>{alert.title}</strong>
                      <span>{alert.description}</span>
                    </div>
                    <ChevronRight size={16} />
                  </Link>
                ))}
              </div>
            </section>

            <section className="ops-panel">
              <div className="ops-panel-header">
                <div>
                  <span className="ops-panel-kicker">Audit visibility</span>
                  <h2>Recent system actions</h2>
                </div>

                <Link to="/admin/logs" className="ops-small-link">
                  View all
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="ops-log-list">
                {stats?.recentActions && stats.recentActions.length > 0 ? (
                  stats.recentActions.slice(0, 6).map((action) => {
                    const severity = getSeverityClass(action.severity);

                    return (
                      <div className="ops-log-row" key={action.id}>
                        <div className={`ops-log-icon ${severity}`}>
                          <Activity size={15} />
                        </div>

                        <div className="ops-log-main">
                          <strong>
                            {(action.event_type || 'Unknown Event').replace(/_/g, ' ')}
                          </strong>
                          <span>
                            {action.details ||
                              `Entity ID: ${action.entity_id?.substring(0, 8) || 'N/A'}...`}
                          </span>
                        </div>

                        <div className="ops-log-meta">
                          <span>
                            {(action.entity_type || 'System').replace(/_/g, ' ')}
                          </span>
                          <time dateTime={action.timestamp}>
                            {new Date(action.timestamp).toLocaleString()}
                          </time>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="ops-empty-state">
                    No recent system actions recorded.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="ops-right-column">
            <section className="ops-panel">
              <div className="ops-panel-header">
                <div>
                  <span className="ops-panel-kicker">Growth signals</span>
                  <h2>Platform intake</h2>
                </div>
              </div>

              <div className="ops-signal-list">
                <div>
                  <span>Institution onboarding requests</span>
                  <strong>{stats?.pendingInstitutions || 0}</strong>
                </div>

                <div>
                  <span>Student interest signals</span>
                  <strong>{stats?.totalStudentInterests || 0}</strong>
                </div>

                <div>
                  <span>Registered students</span>
                  <strong>{stats?.totalStudents || 0}</strong>
                </div>
              </div>

              <Link to="/admin/analytics/institutions" className="ops-full-btn">
                <BarChart3 size={15} />
                View growth analytics
              </Link>
            </section>

            {!isModerator && (
              <section className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <span className="ops-panel-kicker">Infrastructure</span>
                    <h2>System health</h2>
                  </div>
                </div>

                <div className="ops-health-list">
                  <div>
                    <span>API status</span>
                    <strong>Operational</strong>
                  </div>
                  <div>
                    <span>Database</span>
                    <strong>Healthy</strong>
                  </div>
                  <div>
                    <span>Cache service</span>
                    <strong>Active</strong>
                  </div>
                  <div>
                    <span>Latest health message</span>
                    <strong>{systemMessage}</strong>
                  </div>
                </div>

                <Link to="/admin/health" className="ops-full-btn muted">
                  <Eye size={15} />
                  View detailed metrics
                </Link>
              </section>
            )}
          </aside>
        </section>

        <section className="ops-management-grid">
          {isSuperAdmin && (
            <article className="ops-management-card">
              <div className="ops-management-icon">
                <Shield size={19} />
              </div>

              <div>
                <h3>Staff management</h3>
                <p>Invite staff, manage roles, review access, and monitor internal actions.</p>
              </div>

              <div className="ops-action-links">
                <Link to="/admin/staff/invite">
                  <UserPlus size={15} />
                  Invite staff
                </Link>
                <Link to="/admin/staff">
                  <Key size={15} />
                  Roles & permissions
                </Link>
                <Link to="/admin/staff">
                  <Activity size={15} />
                  Staff activity
                </Link>
              </div>
            </article>
          )}

          {!isAuditor && (
            <article className="ops-management-card">
              <div className="ops-management-icon green">
                <Building size={19} />
              </div>

              <div>
                <h3>Institution management</h3>
                <p>Review onboarding requests, verification queues, institution records, and reports.</p>
              </div>

              <div className="ops-action-links">
                <Link to="/admin/institutions">
                  <Clock size={15} />
                  Pending requests
                </Link>
                <Link to="/admin/institutions">
                  <TrendingUp size={15} />
                  Institution analytics
                </Link>
                <Link to="/admin/institutions">
                  <AlertTriangle size={15} />
                  Verification queue
                </Link>
              </div>
            </article>
          )}

          {!isAuditor && (
            <article className="ops-management-card">
              <div className="ops-management-icon blue">
                <Briefcase size={19} />
              </div>

              <div>
                <h3>Employer management</h3>
                <p>Review employer onboarding requests and approve credible partner organizations.</p>
              </div>

              <div className="ops-action-links">
                <Link to="/admin/employers/requests">
                  <UserPlus size={15} />
                  Employer requests
                </Link>
              </div>
            </article>
          )}

          {!isAuditor && (
            <article className="ops-management-card">
              <div className="ops-management-icon red">
                <LifeBuoy size={19} />
              </div>

              <div>
                <h3>Support & care</h3>
                <p>Handle support tickets, user issues, account access problems, and workflow blockers.</p>
              </div>

              <div className="ops-action-links">
                <Link to="/admin/support">
                  <LifeBuoy size={15} />
                  Manage support tickets
                </Link>
              </div>
            </article>
          )}
        </section>
      </div>

      <style>{`
        .ops-dashboard {
          color: #111827;
        }

        .ops-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 24px;
        }

        .ops-kicker,
        .ops-panel-kicker {
          display: inline-flex;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .ops-header h1 {
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
          margin: 0 0 8px;
          color: #0f172a;
        }

        .ops-header p {
          max-width: 720px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .ops-header-actions {
          display: flex;
          align-items: stretch;
          gap: 10px;
          flex-shrink: 0;
        }

        .ops-refresh-btn {
          min-height: 48px;
          border: 1px solid #dbe3ea;
          background: #ffffff;
          color: #334155;
          border-radius: 12px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          cursor: pointer;
        }

        .ops-refresh-btn:disabled {
          opacity: .6;
          cursor: wait;
        }

        .spin-animation {
          animation: opsSpin .8s linear infinite;
        }

        @keyframes opsSpin {
          to { transform: rotate(360deg); }
        }

        .ops-health-badge {
          min-height: 48px;
          border-radius: 12px;
          padding: 8px 13px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid;
          min-width: 190px;
        }

        .ops-health-badge span {
          display: block;
          font-size: .7rem;
          text-transform: uppercase;
          letter-spacing: .06em;
          font-weight: 850;
          opacity: .78;
        }

        .ops-health-badge strong {
          display: block;
          font-size: .88rem;
          font-weight: 900;
        }

        .ops-health-good {
          background: #ecfdf5;
          color: #047857;
          border-color: #bbf7d0;
        }

        .ops-health-warning {
          background: #fffbeb;
          color: #b45309;
          border-color: #fde68a;
        }

        .ops-health-danger {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .ops-health-muted {
          background: #f8fafc;
          color: #475569;
          border-color: #e2e8f0;
        }

        .ops-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .ops-metric-card,
        .ops-panel,
        .ops-management-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .ops-metric-card {
          padding: 18px;
        }

        .ops-metric-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .ops-metric-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
        }

        .ops-metric-card.green .ops-metric-icon {
          color: #047857;
          background: #ecfdf5;
        }

        .ops-metric-card.amber .ops-metric-icon {
          color: #b45309;
          background: #fffbeb;
        }

        .ops-metric-card.indigo .ops-metric-icon {
          color: #4338ca;
          background: #eef2ff;
        }

        .ops-metric-top a {
          color: #64748b;
          font-size: .76rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          text-decoration: none;
        }

        .ops-metric-card > strong {
          display: block;
          color: #0f172a;
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -.05em;
          line-height: 1;
          margin-bottom: 6px;
        }

        .ops-metric-card > span {
          color: #64748b;
          font-size: .86rem;
          font-weight: 650;
        }

        .ops-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, .85fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .ops-left-column,
        .ops-right-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .ops-panel {
          padding: 18px;
        }

        .ops-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .ops-panel-header h2 {
          color: #0f172a;
          font-size: 1.08rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -.02em;
        }

        .ops-small-link {
          color: #64748b;
          font-size: .8rem;
          font-weight: 800;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .ops-alert-list,
        .ops-log-list,
        .ops-signal-list,
        .ops-health-list,
        .ops-action-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ops-alert-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 13px;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          color: #111827;
          text-decoration: none;
        }

        .ops-alert-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #64748b;
        }

        .ops-alert-item.warning {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .ops-alert-item.warning .ops-alert-dot {
          background: #f59e0b;
        }

        .ops-alert-item.info {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .ops-alert-item.info .ops-alert-dot {
          background: #2563eb;
        }

        .ops-alert-item.danger {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .ops-alert-item.danger .ops-alert-dot {
          background: #dc2626;
        }

        .ops-alert-item.success {
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .ops-alert-item.success .ops-alert-dot {
          background: #16a34a;
        }

        .ops-alert-item strong {
          display: block;
          font-size: .9rem;
          font-weight: 900;
          margin-bottom: 2px;
        }

        .ops-alert-item span {
          display: block;
          color: #64748b;
          font-size: .8rem;
          line-height: 1.5;
        }

        .ops-log-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 12px 0;
          border-top: 1px solid #eef2f7;
        }

        .ops-log-row:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .ops-log-icon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
        }

        .ops-log-icon.warning {
          background: #fffbeb;
          color: #b45309;
        }

        .ops-log-icon.danger {
          background: #fef2f2;
          color: #b91c1c;
        }

        .ops-log-icon.success {
          background: #ecfdf5;
          color: #047857;
        }

        .ops-log-main {
          min-width: 0;
        }

        .ops-log-main strong {
          display: block;
          color: #111827;
          font-size: .86rem;
          font-weight: 850;
          text-transform: capitalize;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ops-log-main span {
          color: #64748b;
          font-size: .76rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .ops-log-meta {
          text-align: right;
          min-width: 150px;
        }

        .ops-log-meta span {
          display: inline-flex;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 3px 8px;
          font-size: .7rem;
          font-weight: 800;
          text-transform: capitalize;
          margin-bottom: 5px;
        }

        .ops-log-meta time {
          display: block;
          color: #94a3b8;
          font-size: .72rem;
        }

        .ops-empty-state {
          color: #64748b;
          text-align: center;
          padding: 34px 10px;
          font-weight: 650;
        }

        .ops-signal-list div,
        .ops-health-list div {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid #eef2f7;
          padding-bottom: 10px;
        }

        .ops-signal-list div:last-child,
        .ops-health-list div:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .ops-signal-list span,
        .ops-health-list span {
          color: #64748b;
          font-size: .84rem;
        }

        .ops-signal-list strong,
        .ops-health-list strong {
          color: #0f172a;
          font-weight: 900;
          text-align: right;
        }

        .ops-full-btn {
          margin-top: 16px;
          width: 100%;
          min-height: 42px;
          border-radius: 12px;
          background: #0f172a;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          text-decoration: none;
        }

        .ops-full-btn.muted {
          background: #ffffff;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .ops-management-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .ops-management-card {
          padding: 18px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
        }

        .ops-management-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ops-management-icon.green {
          background: #ecfdf5;
          color: #047857;
        }

        .ops-management-icon.blue {
          background: #e0f2fe;
          color: #0369a1;
        }

        .ops-management-icon.red {
          background: #fef2f2;
          color: #b91c1c;
        }

        .ops-management-card h3 {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .ops-management-card p {
          color: #64748b;
          font-size: .86rem;
          line-height: 1.6;
          margin: 0 0 14px;
        }

        .ops-action-links {
          grid-column: 1 / -1;
        }

        .ops-action-links a {
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #334155;
          text-decoration: none;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 9px;
        }

        .ops-action-links a:hover,
        .ops-small-link:hover,
        .ops-metric-top a:hover {
          color: #047857;
        }

        .ops-error-state {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .ops-error-state h2 {
          font-size: 1.1rem;
          font-weight: 900;
          margin: 0 0 4px;
        }

        .ops-error-state p {
          margin: 0;
        }

        @media (max-width: 1180px) {
          .ops-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ops-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .ops-header {
            flex-direction: column;
          }

          .ops-header-actions {
            width: 100%;
            flex-direction: column;
          }

          .ops-refresh-btn,
          .ops-health-badge {
            width: 100%;
          }

          .ops-metrics-grid,
          .ops-management-grid {
            grid-template-columns: 1fr;
          }

          .ops-log-row {
            grid-template-columns: auto 1fr;
          }

          .ops-log-meta {
            grid-column: 2;
            text-align: left;
            min-width: 0;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default SystemAdminDashboard;