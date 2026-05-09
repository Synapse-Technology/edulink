import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Mail,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

import AdminLayout from '../../../components/admin/AdminLayout';
import AdminDashboardSkeleton from '../../../components/admin/skeletons/AdminDashboardSkeleton';
import { adminAuthService } from '../../../services/auth/adminAuthService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: string;
  last_check: string;
  services: {
    database: 'healthy' | 'degraded' | 'critical';
    email_service: 'healthy' | 'degraded' | 'critical';
    file_storage: 'healthy' | 'degraded' | 'critical';
  };
}

interface SystemStats {
  total_users: number;
  total_users_trend: number;
  active_users: number;
  total_institutions: number;
  total_institutions_trend: number;
  total_internships: number;
  total_internships_trend: number;
  total_applications: number;
  total_applications_trend: number;
  system_load: number;
  response_time: number;
  memory_usage: number;
  disk_usage: number;
  api_requests: number;
}

interface RecentActivity {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

type TabKey = 'overview' | 'services' | 'performance' | 'activity';

const SystemHealthDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetchSystemData();

    const interval = setInterval(() => {
      fetchSystemData(true);
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemData = async (autoRefresh = false) => {
    try {
      if (!isLoading) setIsRefreshing(true);

      const [healthData, statsData, activityData] = await Promise.all([
        adminAuthService.getSystemHealth(),
        adminAuthService.getSystemStats(),
        adminAuthService.getSystemActivity(),
      ]);

      setSystemHealth(healthData as any);
      setSystemStats(statsData);
      setRecentActivity(activityData);
      setLastUpdatedAt(new Date());
      setError('');

      if (autoRefresh) setRefreshCount((prev) => prev + 1);
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to load system health data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshCount((prev) => prev + 1);
    fetchSystemData(false);
  };

  const healthMeta = useMemo(() => {
    switch (systemHealth?.status) {
      case 'healthy':
        return {
          label: 'Operational',
          description: 'All monitored systems are reporting healthy.',
          className: 'health-success',
          icon: <CheckCircle size={18} />,
        };

      case 'degraded':
        return {
          label: 'Degraded',
          description: 'Some services may be slower or partially impaired.',
          className: 'health-warning',
          icon: <AlertTriangle size={18} />,
        };

      case 'critical':
        return {
          label: 'Critical',
          description: 'Immediate infrastructure attention is required.',
          className: 'health-danger',
          icon: <AlertTriangle size={18} />,
        };

      default:
        return {
          label: 'Unknown',
          description: 'System health has not been confirmed.',
          className: 'health-muted',
          icon: <Activity size={18} />,
        };
    }
  }, [systemHealth?.status]);

  const platformMetrics = [
    {
      label: 'Total users',
      value: systemStats?.total_users || 0,
      detail: `${systemStats?.active_users || 0} active users`,
      trend: systemStats?.total_users_trend || 0,
      icon: <Users size={20} />,
      tone: 'blue',
    },
    {
      label: 'Institutions',
      value: systemStats?.total_institutions || 0,
      detail: 'Educational partners',
      trend: systemStats?.total_institutions_trend || 0,
      icon: <Building size={20} />,
      tone: 'green',
    },
    {
      label: 'Internships',
      value: systemStats?.total_internships || 0,
      detail: 'Available positions',
      trend: systemStats?.total_internships_trend || 0,
      icon: <TrendingUp size={20} />,
      tone: 'amber',
    },
    {
      label: 'Applications',
      value: systemStats?.total_applications || 0,
      detail: 'Submitted records',
      trend: systemStats?.total_applications_trend || 0,
      icon: <Activity size={20} />,
      tone: 'red',
    },
  ];

  const performanceMetrics = [
    {
      label: 'CPU load',
      value: systemStats?.system_load || 0,
      unit: '%',
      icon: <Cpu size={18} />,
      threshold: { warning: 60, danger: 80 },
    },
    {
      label: 'Memory usage',
      value: systemStats?.memory_usage || 0,
      unit: '%',
      icon: <HardDrive size={18} />,
      threshold: { warning: 70, danger: 90 },
    },
    {
      label: 'Disk usage',
      value: systemStats?.disk_usage || 0,
      unit: '%',
      icon: <Database size={18} />,
      threshold: { warning: 70, danger: 90 },
    },
    {
      label: 'API latency',
      value: systemStats?.response_time || 0,
      unit: 'ms',
      icon: <Clock size={18} />,
      threshold: { warning: 200, danger: 500 },
      max: 700,
    },
  ];

  const getUsageClass = (
    value: number,
    threshold: { warning: number; danger: number },
  ) => {
    if (value >= threshold.danger) return 'danger';
    if (value >= threshold.warning) return 'warning';
    return 'success';
  };

  const getServiceIcon = (service: string) => {
    if (service === 'database') return <Database size={18} />;
    if (service === 'email_service') return <Mail size={18} />;
    if (service === 'file_storage') return <Globe size={18} />;
    return <Activity size={18} />;
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'healthy':
        return { label: 'Healthy', className: 'status-success' };
      case 'degraded':
        return { label: 'Degraded', className: 'status-warning' };
      case 'critical':
        return { label: 'Critical', className: 'status-danger' };
      case 'warning':
        return { label: 'Warning', className: 'status-warning' };
      case 'error':
        return { label: 'Error', className: 'status-danger' };
      case 'info':
      default:
        return { label: status || 'Info', className: 'status-info' };
    }
  };

  const renderTrend = (trend: number) => {
    const positive = trend >= 0;
    const Icon = positive ? ArrowUpRight : ArrowDownRight;

    return (
      <span className={`health-trend ${positive ? 'positive' : 'negative'}`}>
        <Icon size={13} />
        {positive ? '+' : ''}
        {trend}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminDashboardSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="system-health-page">
        <header className="health-header">
          <div>
            <span className="health-kicker">
              <Server size={14} />
              Infrastructure monitoring
            </span>

            <h1>System Health Console</h1>

            <p>
              Monitor service availability, platform growth, infrastructure
              utilization, API performance, and recent operational activity.
            </p>
          </div>

          <div className="health-header-actions">
            <div className={`health-status-card ${healthMeta.className}`}>
              {healthMeta.icon}

              <div>
                <span>Platform status</span>
                <strong>{healthMeta.label}</strong>
              </div>
            </div>

            <button
              type="button"
              className="health-btn secondary"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? 'spin-animation' : ''}
              />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </header>

        {error && (
          <div className="health-error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}

        <section className="health-summary">
          <div className={`health-overview-card ${healthMeta.className}`}>
            <div className="health-overview-main">
              <div className="health-overview-icon">{healthMeta.icon}</div>

              <div>
                <span>Current platform condition</span>
                <h2>{healthMeta.label}</h2>
                <p>{healthMeta.description}</p>
              </div>
            </div>

            <div className="health-overview-meta">
              <div>
                <span>Uptime</span>
                <strong>{systemHealth?.uptime || 'N/A'}</strong>
              </div>

              <div>
                <span>Last check</span>
                <strong>
                  {systemHealth?.last_check
                    ? new Date(systemHealth.last_check).toLocaleTimeString()
                    : 'N/A'}
                </strong>
              </div>
            </div>
          </div>

          <div className="health-refresh-card">
            <span>Monitoring cadence</span>
            <strong>5 minutes</strong>
            <p>
              Last updated:{' '}
              {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : 'N/A'} ·
              Refresh count: {refreshCount}
            </p>
          </div>
        </section>

        <section className="health-metric-grid">
          {platformMetrics.map((metric) => (
            <article className={`health-metric-card ${metric.tone}`} key={metric.label}>
              <div className="metric-top">
                <div className="metric-icon">{metric.icon}</div>
                {renderTrend(metric.trend)}
              </div>

              <strong>{metric.value.toLocaleString()}</strong>
              <span>{metric.label}</span>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className="health-panel">
          <div className="health-panel-header">
            <div>
              <span className="health-panel-kicker">Monitoring workspace</span>
              <h2>System dashboard</h2>
              <p>Inspect services, performance metrics, and operational events.</p>
            </div>

            <span className="health-count">
              {Object.keys(systemHealth?.services || {}).length} services tracked
            </span>
          </div>

          <div className="health-tabs">
            {[
              { key: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
              { key: 'services', label: 'Services', icon: <Server size={15} /> },
              { key: 'performance', label: 'Performance', icon: <Cpu size={15} /> },
              { key: 'activity', label: 'Activity', icon: <Activity size={15} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'active' : ''}
                onClick={() => setActiveTab(tab.key as TabKey)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="health-panel-body">
            {activeTab === 'overview' && (
              <div className="overview-grid">
                <section className="monitor-card">
                  <div className="monitor-card-header">
                    <Server size={17} />
                    <h3>Service health</h3>
                  </div>

                  <div className="service-list">
                    {Object.entries(systemHealth?.services || {}).map(
                      ([service, status]) => {
                        const statusMeta = getStatusMeta(status);

                        return (
                          <div className="service-row" key={service}>
                            <div className="service-icon">
                              {getServiceIcon(service)}
                            </div>

                            <div>
                              <strong>{service.replace(/_/g, ' ')}</strong>
                              <span>Core service</span>
                            </div>

                            <span className={`health-status ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>

                <section className="monitor-card">
                  <div className="monitor-card-header">
                    <Cpu size={17} />
                    <h3>Performance snapshot</h3>
                  </div>

                  <div className="perf-list">
                    {performanceMetrics.map((metric) => {
                      const percent =
                        metric.unit === 'ms'
                          ? Math.min((metric.value / (metric.max || 700)) * 100, 100)
                          : metric.value;

                      const usage = getUsageClass(metric.value, metric.threshold);

                      return (
                        <div className="perf-row" key={metric.label}>
                          <div className="perf-row-top">
                            <span>
                              {metric.icon}
                              {metric.label}
                            </span>

                            <strong>
                              {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                              {metric.unit}
                            </strong>
                          </div>

                          <div className="usage-track">
                            <span
                              className={`usage-fill ${usage}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="service-grid">
                {Object.entries(systemHealth?.services || {}).map(
                  ([service, status]) => {
                    const statusMeta = getStatusMeta(status);

                    return (
                      <article className="service-card" key={service}>
                        <div className="service-card-top">
                          <div className="service-icon large">
                            {getServiceIcon(service)}
                          </div>

                          <span className={`health-status ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </div>

                        <h3>{service.replace(/_/g, ' ')}</h3>
                        <p>
                          Current monitored state for this platform dependency.
                        </p>
                      </article>
                    );
                  },
                )}

                <article className="service-card muted">
                  <div className="service-card-top">
                    <div className="service-icon large">
                      <Shield size={18} />
                    </div>

                    <span className={`health-status ${healthMeta.className}`}>
                      {healthMeta.label}
                    </span>
                  </div>

                  <h3>Overall status</h3>
                  <p>{healthMeta.description}</p>
                </article>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="performance-grid">
                {performanceMetrics.map((metric) => {
                  const percent =
                    metric.unit === 'ms'
                      ? Math.min((metric.value / (metric.max || 700)) * 100, 100)
                      : metric.value;

                  const usage = getUsageClass(metric.value, metric.threshold);

                  return (
                    <article className="performance-card" key={metric.label}>
                      <div className="performance-icon">{metric.icon}</div>

                      <span>{metric.label}</span>

                      <strong>
                        {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                        {metric.unit}
                      </strong>

                      <div className="usage-track">
                        <span
                          className={`usage-fill ${usage}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </article>
                  );
                })}

                <article className="performance-card">
                  <div className="performance-icon">
                    <Globe size={18} />
                  </div>

                  <span>API requests</span>
                  <strong>{systemStats?.api_requests?.toLocaleString() || 0}/min</strong>

                  <p className="performance-note">
                    Request volume is shown as a throughput signal.
                  </p>
                </article>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="activity-list">
                {recentActivity.length === 0 ? (
                  <div className="health-empty">
                    <Activity size={38} />
                    <h3>No recent activity</h3>
                    <p>System activity will appear here when events are recorded.</p>
                  </div>
                ) : (
                  recentActivity.map((item) => {
                    const severity = getStatusMeta(item.severity);

                    return (
                      <article className="activity-row" key={item.id}>
                        <div className={`activity-icon ${severity.className}`}>
                          <Activity size={15} />
                        </div>

                        <div className="activity-main">
                          <strong>{item.action}</strong>
                          <span>{item.details}</span>
                        </div>

                        <div className="activity-meta">
                          <span>{item.actor}</span>
                          <time>{new Date(item.timestamp).toLocaleString()}</time>
                        </div>

                        <span className={`health-status ${severity.className}`}>
                          {severity.label}
                        </span>
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .system-health-page {
          color: #111827;
        }

        .health-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .health-kicker,
        .health-panel-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .health-kicker svg {
          color: #047857;
        }

        .health-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .health-header p {
          max-width: 760px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .health-header-actions {
          display: flex;
          gap: 10px;
          align-items: stretch;
          flex-shrink: 0;
        }

        .health-btn {
          min-height: 48px;
          border-radius: 12px;
          padding: 0 14px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          cursor: pointer;
          text-decoration: none;
        }

        .health-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .health-status-card {
          min-height: 48px;
          border-radius: 12px;
          padding: 8px 13px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid;
          min-width: 190px;
        }

        .health-status-card span {
          display: block;
          font-size: .7rem;
          text-transform: uppercase;
          letter-spacing: .06em;
          font-weight: 850;
          opacity: .78;
        }

        .health-status-card strong {
          display: block;
          font-size: .88rem;
          font-weight: 900;
        }

        .health-success {
          background: #ecfdf5;
          color: #047857;
          border-color: #bbf7d0;
        }

        .health-warning {
          background: #fffbeb;
          color: #b45309;
          border-color: #fde68a;
        }

        .health-danger {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .health-muted {
          background: #f8fafc;
          color: #475569;
          border-color: #e2e8f0;
        }

        .health-error {
          margin-bottom: 18px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .health-error button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 20px;
          cursor: pointer;
        }

        .health-summary {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 14px;
          margin-bottom: 18px;
        }

        .health-overview-card,
        .health-refresh-card,
        .health-metric-card,
        .health-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .health-overview-card {
          border-radius: 20px;
          padding: 18px;
          display: flex;
          justify-content: space-between;
          gap: 18px;
        }

        .health-overview-main {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .health-overview-icon {
          width: 46px;
          height: 46px;
          border-radius: 15px;
          background: rgba(255,255,255,.64);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .health-overview-main span,
        .health-refresh-card span {
          display: block;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 6px;
          opacity: .78;
        }

        .health-overview-main h2 {
          font-size: 1.35rem;
          font-weight: 900;
          margin: 0 0 4px;
        }

        .health-overview-main p,
        .health-refresh-card p {
          margin: 0;
          line-height: 1.55;
          font-size: .88rem;
        }

        .health-overview-meta {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .health-overview-meta div {
          min-width: 110px;
          border-radius: 14px;
          padding: 12px;
          background: rgba(255,255,255,.58);
        }

        .health-overview-meta span {
          display: block;
          font-size: .7rem;
          font-weight: 850;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .health-overview-meta strong {
          font-size: .9rem;
          font-weight: 900;
        }

        .health-refresh-card {
          border-radius: 20px;
          padding: 18px;
        }

        .health-refresh-card strong {
          display: block;
          color: #0f172a;
          font-size: 1.4rem;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .health-refresh-card p {
          color: #64748b;
        }

        .health-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .health-metric-card {
          border-radius: 18px;
          padding: 16px;
        }

        .metric-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .metric-icon,
        .service-icon,
        .performance-icon,
        .activity-icon {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #334155;
          flex-shrink: 0;
        }

        .health-metric-card.blue .metric-icon { background: #eff6ff; color: #2563eb; }
        .health-metric-card.green .metric-icon { background: #ecfdf5; color: #047857; }
        .health-metric-card.amber .metric-icon { background: #fffbeb; color: #b45309; }
        .health-metric-card.red .metric-icon { background: #fef2f2; color: #b91c1c; }

        .health-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: .72rem;
          font-weight: 900;
        }

        .health-trend.positive {
          background: #ecfdf5;
          color: #047857;
        }

        .health-trend.negative {
          background: #fef2f2;
          color: #b91c1c;
        }

        .health-metric-card > strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .health-metric-card > span {
          display: block;
          color: #334155;
          font-size: .86rem;
          font-weight: 850;
        }

        .health-metric-card > small {
          display: block;
          color: #64748b;
          margin-top: 4px;
          font-size: .78rem;
        }

        .health-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .health-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .health-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
        }

        .health-panel-header p {
          color: #64748b;
          margin: 0;
          font-size: .9rem;
        }

        .health-count {
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: .78rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .health-tabs {
          padding: 14px 20px 0;
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }

        .health-tabs button {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          border-radius: 999px;
          padding: 8px 13px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: .82rem;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }

        .health-tabs button.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .health-panel-body {
          padding: 20px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .monitor-card,
        .service-card,
        .performance-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #ffffff;
        }

        .monitor-card {
          padding: 18px;
        }

        .monitor-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          margin-bottom: 16px;
        }

        .monitor-card-header h3 {
          margin: 0;
          color: #0f172a;
          font-size: .98rem;
          font-weight: 900;
        }

        .service-list,
        .perf-list,
        .activity-list {
          display: grid;
          gap: 10px;
        }

        .service-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid #eef2f7;
          border-radius: 14px;
        }

        .service-row strong {
          display: block;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
          text-transform: capitalize;
        }

        .service-row span {
          color: #64748b;
          font-size: .76rem;
        }

        .service-icon.large,
        .performance-icon {
          width: 44px;
          height: 44px;
        }

        .health-status {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .status-success { background: #ecfdf5; color: #047857; }
        .status-warning { background: #fffbeb; color: #b45309; }
        .status-danger { background: #fef2f2; color: #b91c1c; }
        .status-info { background: #eff6ff; color: #2563eb; }

        .perf-row {
          display: grid;
          gap: 8px;
        }

        .perf-row-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .perf-row-top span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: .86rem;
          font-weight: 800;
        }

        .perf-row-top strong {
          color: #0f172a;
          font-size: .9rem;
          font-weight: 900;
        }

        .usage-track {
          height: 8px;
          background: #eef2f7;
          border-radius: 999px;
          overflow: hidden;
        }

        .usage-fill {
          height: 100%;
          display: block;
          border-radius: inherit;
        }

        .usage-fill.success { background: #10b981; }
        .usage-fill.warning { background: #f59e0b; }
        .usage-fill.danger { background: #ef4444; }

        .service-grid,
        .performance-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .service-card,
        .performance-card {
          padding: 16px;
        }

        .service-card-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .service-card h3 {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
          text-transform: capitalize;
        }

        .service-card p,
        .performance-note {
          color: #64748b;
          font-size: .84rem;
          line-height: 1.55;
          margin: 0;
        }

        .performance-card {
          display: grid;
          gap: 10px;
        }

        .performance-card > span {
          color: #64748b;
          font-size: .82rem;
          font-weight: 850;
        }

        .performance-card > strong {
          color: #0f172a;
          font-size: 1.55rem;
          font-weight: 900;
          letter-spacing: -.04em;
        }

        .activity-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto auto;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border: 1px solid #eef2f7;
          border-radius: 14px;
        }

        .activity-main {
          min-width: 0;
        }

        .activity-main strong {
          display: block;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
        }

        .activity-main span {
          display: block;
          color: #64748b;
          font-size: .78rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .activity-meta {
          text-align: right;
        }

        .activity-meta span {
          display: block;
          color: #334155;
          font-size: .78rem;
          font-weight: 850;
        }

        .activity-meta time {
          display: block;
          color: #94a3b8;
          font-size: .72rem;
        }

        .health-empty {
          padding: 48px 20px;
          text-align: center;
          color: #64748b;
        }

        .health-empty svg {
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .health-empty h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .spin-animation {
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1180px) {
          .health-metric-grid,
          .service-grid,
          .performance-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .health-summary,
          .overview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .health-header,
          .health-panel-header,
          .health-overview-card {
            flex-direction: column;
          }

          .health-header-actions {
            width: 100%;
            flex-direction: column;
          }

          .health-btn,
          .health-status-card {
            width: 100%;
          }

          .health-metric-grid,
          .service-grid,
          .performance-grid {
            grid-template-columns: 1fr;
          }

          .health-overview-meta {
            width: 100%;
            flex-direction: column;
          }

          .activity-row {
            grid-template-columns: auto 1fr;
          }

          .activity-meta,
          .activity-row > .health-status {
            grid-column: 2;
            text-align: left;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default SystemHealthDashboard;