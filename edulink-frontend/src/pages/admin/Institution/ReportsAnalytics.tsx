import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Button,
  Alert,
  ProgressBar,
  Badge,
} from 'react-bootstrap';

import {
  Download,
  BarChart2,
  TrendingUp,
  Users,
  AlertCircle,
  FileText,
  Shield,
  PieChart,
  Activity,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

import { institutionService } from '../../../services/institution/institutionService';

import type {
  PlacementStats,
  TimeToPlacementStats,
} from '../../../services/institution/institutionService';

import ReportsAnalyticsSkeleton from '../../../components/admin/skeletons/ReportsAnalyticsSkeleton';

import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

const ReportsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [placementStats, setPlacementStats] =
    useState<PlacementStats | null>(null);

  const [timeStats, setTimeStats] =
    useState<TimeToPlacementStats | null>(null);

  const [exporting, setExporting] = useState(false);

  const [dateFrom, setDateFrom] =
    useState<string>('');

  const [dateTo, setDateTo] =
    useState<string>('');

  const fetchData = async (
    from?: string,
    to?: string
  ) => {
    setLoading(true);

    try {
      const filters: any = {};

      if (from) filters.date_from = from;
      if (to) filters.date_to = to;

      const [pStats, tStats] = await Promise.all([
        institutionService.getPlacementSuccessStats(
          filters
        ),
        institutionService.getTimeToPlacementStats(
          filters
        ),
      ]);

      setPlacementStats(pStats);
      setTimeStats(tStats);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      setError(
        sanitized.userMessage ||
          'Failed to load analytics data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDateFilterChange = () => {
    fetchData(
      dateFrom || undefined,
      dateTo || undefined
    );
  };

  const buildDateFilters = () => {
    const filters: any = {};

    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;

    return filters;
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const blob =
        await institutionService.exportReport(
          buildDateFilters()
        );

      const url =
        window.URL.createObjectURL(blob);

      const a =
        document.createElement('a');

      a.href = url;

      a.download = `institution_analytics_${
        new Date()
          .toISOString()
          .split('T')[0]
      }.csv`;

      document.body.appendChild(a);

      a.click();

      window.URL.revokeObjectURL(url);

      document.body.removeChild(a);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      setError(
        sanitized.userMessage ||
          'Failed to export report'
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <ReportsAnalyticsSkeleton />;
  }

  const summary = placementStats?.summary;
  const funnel = placementStats?.funnel;
  const quality =
    placementStats?.quality_control;
  const sources =
    placementStats?.source_breakdown;

  const summaryCards = [
    {
      title: 'Placement Rate',
      value: `${summary?.placement_rate}%`,
      sub: `of ${summary?.total_students} students`,
      icon: PieChart,
    },
    {
      title: 'Avg Placement Time',
      value: `${timeStats?.average_days}d`,
      sub: `Median: ${timeStats?.median_days}d`,
      icon: TrendingUp,
    },
    {
      title: 'Audit Readiness',
      value: `${quality?.audit_readiness_score}%`,
      sub: 'Institution quality score',
      icon: Shield,
    },
    {
      title: 'Active Incidents',
      value: quality?.unresolved_incidents,
      sub: `${quality?.total_incidents} total incidents`,
      icon: AlertCircle,
    },
  ];

  return (
    <InstitutionWorkspacePage className="institution-analytics-page">

      <style>{`
        .institution-analytics-page {
          min-height: 100vh;
        }

        .analytics-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 32px;
        }

        .analytics-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #f4f6f8;
          border: 1px solid #e6e9ee;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 18px;
        }

        .analytics-title {
          font-size: clamp(1.9rem, 3vw, 2.6rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 14px;
        }

        .analytics-subtitle {
          max-width: 760px;
          color: #64748b;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .analytics-primary-btn {
          height: 46px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: none !important;
          font-weight: 650 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .analytics-soft-btn {
          height: 46px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 650 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .analytics-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .analytics-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
          height: 100%;
        }

        .analytics-stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
        }

        .analytics-stat-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          margin-bottom: 10px;
        }

        .analytics-stat-value {
          font-size: 2rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          line-height: 1;
          margin-bottom: 8px;
        }

        .analytics-stat-sub {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 0;
        }

        .analytics-section-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.03em;
        }

        .analytics-table {
          margin-bottom: 0;
        }

        .analytics-table thead th {
          border: none !important;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          padding: 16px;
        }

        .analytics-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px 16px;
          vertical-align: middle;
        }

        .analytics-row-title {
          font-weight: 650;
          color: #111827;
        }

        .analytics-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 0.78rem;
          font-weight: 600;
          color: #475569;
        }

        .analytics-filter-shell {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
        }

        .analytics-input {
          height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .analytics-input:focus {
          border-color: #111827 !important;
        }

        .analytics-funnel-step {
          margin-bottom: 22px;
        }

        .analytics-funnel-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .analytics-funnel-label {
          font-size: 0.84rem;
          font-weight: 650;
          color: #475569;
        }

        .analytics-funnel-value {
          font-size: 0.84rem;
          font-weight: 700;
          color: #111827;
        }

        .analytics-empty-state {
          border: 1px dashed #dbe2ea;
          border-radius: 18px;
          padding: 48px 24px;
          text-align: center;
          background: #ffffff;
        }

        .analytics-recommendation {
          background: #ffffff;
          border: 1px solid #edf0f4;
          border-radius: 20px;
          padding: 22px;
        }

        .analytics-soft-panel {
          background: #fbfcfd;
          border: 1px solid #edf0f4;
          border-radius: 20px;
          padding: 22px;
        }

        @media (max-width: 768px) {
          .analytics-hero {
            padding: 24px;
          }
        }
      `}</style>

      {/* HERO */}

      <div className="analytics-hero mb-4">

        <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">

          <div>
            <div className="analytics-eyebrow">
              <BarChart2 size={14} />
              Institutional Intelligence
            </div>

            <h1 className="analytics-title">
              Placement analytics, audit visibility, and institutional reporting.
            </h1>

            <p className="analytics-subtitle">
              Track placement outcomes, supervision quality,
              certification performance, and operational trends
              across departments and cohorts.
            </p>
          </div>

          <div className="d-flex gap-2 align-self-xl-start flex-wrap">
            <Button
              className="analytics-soft-btn d-flex align-items-center gap-2"
              onClick={() => window.print()}
            >
              <FileText size={16} />
              Print Summary
            </Button>

            <Button
              className="analytics-primary-btn d-flex align-items-center gap-2"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={16} />
              {exporting
                ? 'Exporting...'
                : 'Export Raw Data'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert
          variant="danger"
          className="rounded-4 border-0"
        >
          {error}
        </Alert>
      )}

      {/* FILTERS */}

      <div className="analytics-filter-shell mb-4">

        <div className="d-flex align-items-center gap-2 mb-4">
          <Calendar
            size={18}
            className="text-muted"
          />

          <div>
            <div className="fw-semibold text-dark">
              Date Range Filters
            </div>

            <div className="small text-muted">
              Refine analytics and export windows
            </div>
          </div>
        </div>

        <Row className="g-3">
          <Col md={3}>
            <FormLabel label="From Date" />

            <input
              type="date"
              className="form-control analytics-input"
              value={dateFrom}
              onChange={e =>
                setDateFrom(e.target.value)
              }
            />
          </Col>

          <Col md={3}>
            <FormLabel label="To Date" />

            <input
              type="date"
              className="form-control analytics-input"
              value={dateTo}
              onChange={e =>
                setDateTo(e.target.value)
              }
            />
          </Col>

          <Col
            md={6}
            className="d-flex align-items-end gap-2"
          >
            <Button
              className="analytics-primary-btn"
              onClick={handleDateFilterChange}
            >
              Apply Filters
            </Button>

            <Button
              className="analytics-soft-btn"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                fetchData();
              }}
            >
              Clear
            </Button>
          </Col>
        </Row>
      </div>

      {/* SUMMARY CARDS */}

      <Row className="g-4 mb-4">
        {summaryCards.map((stat, idx) => (
          <Col
            key={idx}
            xl={3}
            md={6}
          >
            <div className="analytics-stat-card">

              <div className="d-flex justify-content-between align-items-start mb-4">

                <div className="analytics-stat-icon">
                  <stat.icon size={22} />
                </div>

                <div className="analytics-pill">
                  Real-time
                </div>
              </div>

              <div className="analytics-stat-label">
                {stat.title}
              </div>

              <div className="analytics-stat-value">
                {stat.value}
              </div>

              <p className="analytics-stat-sub">
                {stat.sub}
              </p>
            </div>
          </Col>
        ))}
      </Row>

      {/* SOURCE BREAKDOWN */}

      <Row className="g-4 mb-4">

        {[
          {
            title: 'EduLink Managed',
            value:
              sources?.managed_edulink || 0,
            sub: `${sources?.managed_applications || 0} institution-run applications`,
            icon: Shield,
          },

          {
            title: 'Employer Sourced',
            value:
              sources?.employer_sourced || 0,
            sub: 'Placements from employers',
            icon: Users,
          },

          {
            title: 'External Declared',
            value:
              sources?.external_declared || 0,
            sub: `${sources?.external_declarations || 0} external approvals`,
            icon: Activity,
          },
        ].map((stat, idx) => (
          <Col
            key={idx}
            lg={4}
          >
            <div className="analytics-stat-card">

              <div className="d-flex justify-content-between align-items-start mb-4">

                <div className="analytics-stat-icon">
                  <stat.icon size={20} />
                </div>

                <div className="analytics-pill">
                  Source
                </div>
              </div>

              <div className="analytics-stat-value">
                {stat.value}
              </div>

              <div className="analytics-stat-label">
                {stat.title}
              </div>

              <p className="analytics-stat-sub">
                {stat.sub}
              </p>
            </div>
          </Col>
        ))}
      </Row>

      {/* FUNNEL + DEPARTMENTS */}

      <Row className="g-4 mb-4">

        <Col lg={4}>
          <div className="analytics-card h-100">
            <div className="p-4">

              <div className="d-flex align-items-center gap-2 mb-4">
                <BarChart2
                  size={18}
                  className="text-muted"
                />

                <div className="analytics-section-title">
                  Conversion Funnel
                </div>
              </div>

              {funnel &&
                [
                  {
                    label: 'Applied',
                    value: funnel.applied,
                    color: 'secondary',
                  },

                  {
                    label: 'Shortlisted',
                    value: funnel.shortlisted,
                    color: 'info',
                  },

                  {
                    label: 'Accepted',
                    value: funnel.accepted,
                    color: 'primary',
                  },

                  {
                    label: 'Active',
                    value: funnel.active,
                    color: 'warning',
                  },

                  {
                    label: 'Certified',
                    value: funnel.certified,
                    color: 'success',
                  },
                ].map((step, idx) => {
                  const percentage =
                    funnel.applied > 0
                      ? (step.value /
                          funnel.applied) *
                        100
                      : 0;

                  return (
                    <div
                      key={idx}
                      className="analytics-funnel-step"
                    >
                      <div className="analytics-funnel-header">
                        <div className="analytics-funnel-label">
                          {step.label}
                        </div>

                        <div className="analytics-funnel-value">
                          {step.value}
                        </div>
                      </div>

                      <ProgressBar
                        now={percentage}
                        variant={step.color}
                        style={{
                          height: '7px',
                        }}
                        className="rounded-pill"
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        </Col>

        <Col lg={8}>
          <div className="analytics-card h-100">

            <div className="p-4 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="analytics-section-title">
                    Department Performance
                  </div>

                  <div className="small text-muted">
                    Placement outcomes across academic units
                  </div>
                </div>

                <div className="analytics-pill">
                  Live Metrics
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table analytics-table align-middle">

                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Placement Rate</th>
                    <th>Active / Total</th>
                    <th>Certified</th>
                    <th className="text-end">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {placementStats?.departments.map(
                    (dept, idx) => (
                      <tr key={idx}>

                        <td>
                          <div className="analytics-row-title">
                            {dept.name}
                          </div>
                        </td>

                        <td style={{ minWidth: 180 }}>
                          <div className="d-flex align-items-center gap-3">

                            <div className="flex-grow-1">
                              <ProgressBar
                                now={
                                  dept.placement_rate
                                }
                                style={{
                                  height: '5px',
                                }}
                              />
                            </div>

                            <div className="small fw-bold">
                              {
                                dept.placement_rate
                              }
                              %
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="fw-bold text-dark">
                            {dept.placements}
                          </span>{' '}
                          /{' '}
                          {
                            dept.total_students
                          }
                        </td>

                        <td>
                          <Badge
                            bg={
                              dept.certified > 0
                                ? 'success'
                                : 'light'
                            }
                            text={
                              dept.certified > 0
                                ? undefined
                                : 'dark'
                            }
                            className="rounded-pill px-3 py-2"
                          >
                            {dept.certified}{' '}
                            Certified
                          </Badge>
                        </td>

                        <td className="text-end">
                          <Button
                            variant="link"
                            className="text-decoration-none fw-semibold p-0 d-inline-flex align-items-center gap-1"
                          >
                            View
                            <ArrowUpRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>

      {/* COHORT PERFORMANCE */}

      <div className="analytics-card mb-4">

        <div className="p-4 border-bottom">
          <div className="analytics-section-title">
            Cohort Performance
          </div>

          <div className="small text-muted mt-1">
            Placement progression by intake groups
          </div>
        </div>

        {placementStats?.cohorts &&
        placementStats.cohorts.length > 0 ? (
          <div className="table-responsive">

            <table className="table analytics-table align-middle">

              <thead>
                <tr>
                  <th>Cohort</th>
                  <th>Placement Rate</th>
                  <th>Active / Total</th>
                  <th>Certified</th>
                  <th>Avg Time</th>
                  <th className="text-end">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {placementStats.cohorts.map(
                  (cohort, idx) => (
                    <tr key={idx}>

                      <td>
                        <div className="analytics-row-title">
                          {cohort.name}
                        </div>
                      </td>

                      <td style={{ minWidth: 180 }}>
                        <div className="d-flex align-items-center gap-3">

                          <div className="flex-grow-1">
                            <ProgressBar
                              now={
                                cohort.placement_rate
                              }
                              variant="info"
                              style={{
                                height: '5px',
                              }}
                            />
                          </div>

                          <div className="small fw-bold">
                            {
                              cohort.placement_rate
                            }
                            %
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="fw-bold text-dark">
                          {
                            cohort.placements
                          }
                        </span>{' '}
                        /{' '}
                        {
                          cohort.total_students
                        }
                      </td>

                      <td>
                        <Badge
                          bg={
                            cohort.certified > 0
                              ? 'success'
                              : 'light'
                          }
                          text={
                            cohort.certified > 0
                              ? undefined
                              : 'dark'
                          }
                          className="rounded-pill px-3 py-2"
                        >
                          {
                            cohort.certified
                          }{' '}
                          Certified
                        </Badge>
                      </td>

                      <td>
                        <div className="analytics-pill">
                          {
                            cohort.avg_time_to_placement
                          }{' '}
                          days
                        </div>
                      </td>

                      <td className="text-end">
                        <Button
                          variant="link"
                          className="text-decoration-none fw-semibold p-0 d-inline-flex align-items-center gap-1"
                        >
                          View
                          <ArrowUpRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="analytics-empty-state">
            <Users
              size={44}
              className="text-muted mb-3"
            />

            <h6 className="fw-semibold">
              No cohort analytics available
            </h6>

            <p className="text-muted mb-0">
              Cohort performance metrics will appear here.
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM PANELS */}

      <Row className="g-4">

        <Col lg={6}>
          <div className="analytics-card h-100">

            <div className="p-4 border-bottom">
              <div className="analytics-section-title">
                Audit & Compliance
              </div>

              <div className="small text-muted mt-1">
                Evidence quality and institutional readiness
              </div>
            </div>

            <div className="p-4">

              <Row className="g-4 mb-4">

                <Col sm={6}>
                  <div className="analytics-soft-panel">

                    <div className="analytics-stat-label">
                      Evidence Frequency
                    </div>

                    <div className="analytics-stat-value">
                      {
                        quality?.avg_evidence_per_placement
                      }
                    </div>

                    <div className="analytics-stat-sub">
                      submissions per student
                    </div>
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="analytics-soft-panel">

                    <div className="analytics-stat-label">
                      Total Logbooks
                    </div>

                    <div className="analytics-stat-value">
                      {
                        quality?.evidence_count
                      }
                    </div>

                    <div className="analytics-stat-sub">
                      verified ledger entries
                    </div>
                  </div>
                </Col>
              </Row>

              <div className="analytics-recommendation">

                <div className="d-flex align-items-start gap-3">

                  <div className="analytics-stat-icon">
                    <Shield size={18} />
                  </div>

                  <div>
                    <div className="fw-semibold mb-2">
                      Quality Control Recommendation
                    </div>

                    <div className="small text-muted">
                      {quality?.unresolved_incidents &&
                      quality.unresolved_incidents >
                        0
                        ? `You currently have ${quality.unresolved_incidents} unresolved incidents affecting audit readiness.`
                        : 'All operational quality metrics are within acceptable institutional thresholds.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Col>

        <Col lg={6}>
          <div className="analytics-card h-100">

            <div className="p-4 border-bottom">
              <div className="analytics-section-title">
                Engagement Velocity
              </div>

              <div className="small text-muted mt-1">
                Month-over-month activity momentum
              </div>
            </div>

            <div className="p-4">

              <div className="analytics-soft-panel text-center py-5">

                <Activity
                  size={54}
                  className="text-muted opacity-50 mb-3"
                />

                <div className="analytics-stat-value mb-3">
                  {summary?.total_trend}%
                </div>

                <div className="fw-semibold text-dark mb-2">
                  Monthly Growth Trend
                </div>

                <p className="text-muted small mb-0">
                  Engagement velocity is trending{' '}
                  {summary?.total_trend &&
                  summary.total_trend > 0
                    ? 'upward'
                    : 'downward'}{' '}
                  compared to the previous reporting cycle.
                </p>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </InstitutionWorkspacePage>
  );
};

const FormLabel = ({
  label,
}: {
  label: string;
}) => (
  <label className="small fw-semibold text-muted mb-2 d-block">
    {label}
  </label>
);

export default ReportsAnalytics;
