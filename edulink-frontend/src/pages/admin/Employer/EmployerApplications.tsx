import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmployerLayout } from '../../../components/admin/employer';
import TableSkeleton from '../../../components/admin/skeletons/TableSkeleton';
import { internshipService } from '../../../services/internship/internshipService';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { showToast } from '../../../utils/toast';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import { SEO } from '../../../components/common';

const STYLES = `
  .ea-page {
    color: var(--el-ink);
  }

  .ea-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: stretch;
    margin-bottom: 22px;
  }

  .ea-command-card {
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

  .ea-kicker {
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

  .ea-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .ea-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .ea-sub {
    max-width: 700px;
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
  }

  .ea-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .ea-health-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .ea-health-label,
  .ea-card-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ea-health-score {
    font-size: 3.1rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 0.95;
    color: var(--el-ink);
  }

  .ea-health-icon {
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

  .ea-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin: 18px 0 0;
  }

  .ea-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .ea-metric {
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface);
    padding: 18px;
    min-height: 126px;
    color: var(--el-ink);
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .ea-metric:hover {
    transform: translateY(-2px);
    box-shadow: var(--el-shadow);
    border-color: var(--el-accent);
  }

  .ea-metric-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }

  .ea-metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ea-metric-value {
    font-size: 2rem;
    font-weight: 820;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .ea-metric-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ea-metric-note {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  .ea-toolbar {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    padding: 18px;
    margin-bottom: 22px;
  }

  .ea-toolbar-grid {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) auto auto;
    gap: 12px;
    align-items: center;
  }

  .ea-search {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--el-surface-2);
    border: 1px solid var(--el-border);
    border-radius: 16px;
    padding: 0 14px;
    height: 46px;
  }

  .ea-search svg {
    color: var(--el-muted);
    flex-shrink: 0;
  }

  .ea-search input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--el-ink);
    font-size: 13px;
  }

  .ea-select {
    height: 46px;
    border-radius: 16px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    font-size: 13px;
    font-weight: 700;
    padding: 0 14px;
    min-width: 180px;
    outline: none;
  }

  .ea-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .ea-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .ea-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    color: var(--el-ink);
    margin: 0;
  }

  .ea-card-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .ea-table-wrap {
    overflow-x: auto;
  }

  .ea-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ea-table th {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 16px 22px 12px;
    white-space: nowrap;
    background: var(--el-surface);
  }

  .ea-table td {
    padding: 16px 22px;
    border-top: 1px solid var(--el-border);
    vertical-align: middle;
    color: var(--el-ink);
    font-size: 13px;
  }

  .ea-candidate {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 250px;
  }

  .ea-avatar {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    flex-shrink: 0;
  }

  .ea-name-line {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .ea-name {
    font-weight: 780;
    margin: 0;
    color: var(--el-ink);
  }

  .ea-email,
  .ea-muted {
    color: var(--el-muted);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .ea-role {
    font-weight: 760;
    margin: 0 0 3px;
    color: var(--el-ink);
  }

  .ea-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .ea-status.applied {
    color: #b45309;
    background: rgba(245,158,11,0.12);
  }

  .ea-status.shortlisted {
    color: #0369a1;
    background: rgba(14,165,233,0.12);
  }

  .ea-status.accepted {
    color: #0f9f62;
    background: rgba(18,183,106,0.12);
  }

  .ea-status.rejected {
    color: #dc2626;
    background: rgba(239,68,68,0.12);
  }

  .ea-status.default {
    color: var(--el-muted);
    background: var(--el-surface-2);
  }

  .ea-signal {
    margin-top: 7px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 700;
  }

  .ea-signal.good {
    color: #12b76a;
  }

  .ea-signal.warn {
    color: #f59e0b;
  }

  .ea-review-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 12px;
    background: var(--el-surface-2);
    color: var(--el-accent);
    border: 1px solid var(--el-border);
    padding: 8px 12px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 800;
    transition: background 0.15s ease, transform 0.12s ease, border-color 0.15s ease;
  }

  .ea-review-btn:hover {
    color: var(--el-accent);
    background: var(--el-accent-soft);
    border-color: var(--el-accent);
    transform: translateY(-1px);
  }

  .ea-empty {
    padding: 52px 20px;
    text-align: center;
    color: var(--el-muted);
    font-size: 13px;
  }

  .ea-empty-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: var(--el-surface-2);
    color: var(--el-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }

  .ea-empty-title {
    color: var(--el-ink);
    font-size: 15px;
    font-weight: 800;
    margin: 0 0 5px;
  }

  .ea-empty-text {
    margin: 0;
    color: var(--el-muted);
    font-size: 13px;
  }

  @media (max-width: 1180px) {
    .ea-hero {
      grid-template-columns: 1fr;
    }

    .ea-health-card {
      max-width: 520px;
    }

    .ea-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ea-toolbar-grid {
      grid-template-columns: 1fr;
    }

    .ea-select {
      width: 100%;
    }
  }

  @media (max-width: 680px) {
    .ea-command-card,
    .ea-health-card,
    .ea-card-header,
    .ea-toolbar {
      padding-left: 18px;
      padding-right: 18px;
    }

    .ea-metrics {
      grid-template-columns: 1fr;
    }

    .ea-table {
      min-width: 820px;
    }
  }
`;

const statusOptions = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'APPLIED', label: 'Awaiting Review' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'ACCEPTED', label: 'Placement Approved' },
  { value: 'REJECTED', label: 'Declined' },
];

const trustOptions = [
  { value: 'ALL', label: 'All trust tiers' },
  { value: '0', label: 'Unverified · Tier 0' },
  { value: '1', label: 'Basic Verified · Tier 1' },
  { value: '2', label: 'Institution Linked · Tier 2' },
  { value: '3', label: 'Internship Ready · Tier 3' },
  { value: '4', label: 'Certified Pro · Tier 4' },
];

const getStatusMeta = (status: string) => {
  switch (status) {
    case 'APPLIED':
      return {
        label: 'Awaiting Review',
        className: 'applied',
        icon: Clock,
      };
    case 'SHORTLISTED':
      return {
        label: 'Shortlisted',
        className: 'shortlisted',
        icon: UserCheck,
      };
    case 'ACCEPTED':
      return {
        label: 'Placement Approved',
        className: 'accepted',
        icon: CheckCircle2,
      };
    case 'REJECTED':
      return {
        label: 'Declined',
        className: 'rejected',
        icon: XCircle,
      };
    default:
      return {
        label: status,
        className: 'default',
        icon: FileText,
      };
  }
};

const EmployerApplications: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [trustFilter, setTrustFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useErrorHandler({});

  useEffect(() => {
    const statusParam = searchParams.get('status');

    if (statusParam) {
      setStatusFilter(statusParam);
    }

    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);

      const appsResponse = await internshipService.getApplications();
      const apps = Array.isArray(appsResponse)
        ? appsResponse
        : (appsResponse as any)?.results || [];

      const recruitmentApps = apps.filter(
        (app: any) => !['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)
      );

      setApplications(recruitmentApps);
    } catch (error) {
      console.error('Error:', error);
      const sanitized = sanitizeAdminError(error);
      showToast.error(sanitized.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewClick = (appId: string) => {
    navigate(`/employer/dashboard/applications/${appId}`);
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;

      const query = searchTerm.trim().toLowerCase();

      if (query) {
        const haystack = [
          app.student_info?.name,
          app.student_info?.email,
          app.title,
          app.department,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (trustFilter !== 'ALL') {
        const studentTier = app.student_info?.trust_level ?? 0;
        if (studentTier !== parseInt(trustFilter, 10)) return false;
      }

      return true;
    });
  }, [applications, searchTerm, statusFilter, trustFilter]);

  const metrics = useMemo(() => {
    const awaitingReview = applications.filter((app) => app.status === 'APPLIED').length;
    const shortlisted = applications.filter((app) => app.status === 'SHORTLISTED').length;
    const accepted = applications.filter((app) => app.status === 'ACCEPTED').length;
    const verifiedCandidates = applications.filter(
      (app) => (app.student_info?.trust_level ?? 0) >= 1
    ).length;

    const progressed = applications.filter((app) => app.status !== 'APPLIED').length;
    const responseRate = applications.length
      ? Math.round((progressed / applications.length) * 100)
      : 0;

    return {
      awaitingReview,
      shortlisted,
      accepted,
      verifiedCandidates,
      responseRate,
    };
  }, [applications]);

  return (
    <EmployerLayout>
      <SEO
        title="Applications"
        description="Review and manage student applications on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="ea-page">
        <section className="ea-hero">
          <div className="ea-command-card">
            <div className="ea-kicker">
              <Sparkles size={13} />
              Recruitment Operations
            </div>

            <h1 className="ea-title">
              Candidate <span>Pipeline</span>
            </h1>

            <p className="ea-sub">
              Review applicants, shortlist qualified students, approve placements, and keep your
              institution-facing recruitment workflow credible and responsive.
            </p>
          </div>

          <aside className="ea-health-card">
            <div>
              <div className="ea-health-top">
                <div>
                  <div className="ea-health-label">Pipeline response</div>
                  <div className="ea-health-score">{metrics.responseRate}%</div>
                </div>

                <div className="ea-health-icon">
                  <TrendingUp size={21} />
                </div>
              </div>

              <p className="ea-health-note">
                Estimated from applications that have moved beyond initial submission. A low rate
                may signal slow employer review cycles.
              </p>
            </div>
          </aside>
        </section>

        <section className="ea-metrics">
          <div className="ea-metric">
            <div className="ea-metric-top">
              <div>
                <div className="ea-metric-label">Awaiting review</div>
                <div className="ea-metric-value">{metrics.awaitingReview}</div>
              </div>
              <div className="ea-metric-icon">
                <Clock size={19} />
              </div>
            </div>
            <p className="ea-metric-note">New candidates needing employer action.</p>
          </div>

          <div className="ea-metric">
            <div className="ea-metric-top">
              <div>
                <div className="ea-metric-label">Shortlisted</div>
                <div className="ea-metric-value">{metrics.shortlisted}</div>
              </div>
              <div className="ea-metric-icon">
                <Users size={19} />
              </div>
            </div>
            <p className="ea-metric-note">Candidates moved into serious consideration.</p>
          </div>

          <div className="ea-metric">
            <div className="ea-metric-top">
              <div>
                <div className="ea-metric-label">Approved</div>
                <div className="ea-metric-value">{metrics.accepted}</div>
              </div>
              <div className="ea-metric-icon">
                <Briefcase size={19} />
              </div>
            </div>
            <p className="ea-metric-note">Students approved for placement workflow.</p>
          </div>

          <div className="ea-metric">
            <div className="ea-metric-top">
              <div>
                <div className="ea-metric-label">Verified candidates</div>
                <div className="ea-metric-value">{metrics.verifiedCandidates}</div>
              </div>
              <div className="ea-metric-icon">
                <ShieldCheck size={19} />
              </div>
            </div>
            <p className="ea-metric-note">Applicants with at least basic trust verification.</p>
          </div>
        </section>

        <section className="ea-toolbar">
          <div className="ea-toolbar-grid">
            <div className="ea-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search candidate, email, role, or department..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              className="ea-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="ea-select"
              value={trustFilter}
              onChange={(event) => setTrustFilter(event.target.value)}
            >
              {trustOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="ea-card">
          <div className="ea-card-header">
            <div>
              <div className="ea-card-label">Application queue</div>
              <h2 className="ea-card-title">Candidate review workspace</h2>
              <p className="ea-card-sub">
                Showing {filteredApplications.length} of {applications.length} recruitment-stage applications.
              </p>
            </div>
          </div>

          <div className="ea-table-wrap">
            <table className="ea-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Applied for</th>
                  <th>Applied date</th>
                  <th>Recruitment status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <TableSkeleton rows={5} columns={5} hasHeader={false} hasActions />
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="ea-empty">
                        <div className="ea-empty-icon">
                          <FileText size={25} />
                        </div>
                        <p className="ea-empty-title">No matching applications found.</p>
                        <p className="ea-empty-text">
                          Try changing the search term, status filter, or trust tier filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const statusMeta = getStatusMeta(app.status);
                    const StatusIcon = statusMeta.icon;
                    const trustLevel = (app.student_info?.trust_level as TrustLevel) || 0;
                    const isVerified = trustLevel >= 1;

                    return (
                      <tr key={app.id}>
                        <td>
                          <div className="ea-candidate">
                            <div className="ea-avatar">
                              {app.student_info?.name?.charAt(0) || 'U'}
                            </div>

                            <div>
                              <div className="ea-name-line">
                                <p className="ea-name">
                                  {app.student_info?.name || 'Unknown Student'}
                                </p>

                                <TrustBadge
                                  level={trustLevel}
                                  entityType="student"
                                  size="sm"
                                  showLabel={false}
                                />
                              </div>

                              <p className="ea-email">
                                {app.student_info?.email || 'No email available'}
                              </p>

                              {isVerified ? (
                                <span className="ea-signal good">
                                  <CheckCircle2 size={11} />
                                  Verified candidate
                                </span>
                              ) : (
                                <span className="ea-signal warn">
                                  <AlertTriangle size={11} />
                                  Trust not verified
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <p className="ea-role">{app.title || 'Untitled opportunity'}</p>
                          <p className="ea-muted">{app.department || 'No department specified'}</p>
                        </td>

                        <td>
                          <p className="ea-muted">
                            {app.created_at
                              ? new Date(app.created_at).toLocaleDateString()
                              : 'Not available'}
                          </p>
                        </td>

                        <td>
                          <span className={`ea-status ${statusMeta.className}`}>
                            <StatusIcon size={12} />
                            {statusMeta.label}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="ea-review-btn"
                            onClick={() => handleReviewClick(app.id)}
                          >
                            Review
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </EmployerLayout>
  );
};

export default EmployerApplications;