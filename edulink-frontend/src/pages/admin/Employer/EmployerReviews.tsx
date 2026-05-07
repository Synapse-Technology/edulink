import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  CheckSquare,
  FileText,
  Info,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmployerLayout } from '../../../components/admin/employer';
import { employerService } from '../../../services/employer/employerService';
import { internshipService } from '../../../services/internship/internshipService';
import { SEO } from '../../../components/common';

const STYLES = `
  .er-page { color: var(--el-ink); }

  .er-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    margin-bottom: 22px;
  }

  .er-command-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    padding: 28px;
    box-shadow: var(--el-shadow);
  }

  .er-kicker {
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

  .er-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .er-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .er-sub {
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
    max-width: 680px;
  }

  .er-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
  }

  .er-health-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .er-health-label,
  .er-card-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .er-health-score {
    font-size: 3rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .er-health-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    background: var(--el-accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 28px rgba(26,92,255,0.25);
  }

  .er-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .er-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .er-metric {
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface);
    padding: 18px;
    min-height: 126px;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .er-metric:hover {
    transform: translateY(-2px);
    border-color: var(--el-accent);
    box-shadow: var(--el-shadow);
  }

  .er-metric-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .er-metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .er-metric-value {
    font-size: 2rem;
    font-weight: 820;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .er-metric-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .er-metric-note {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  .er-review-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .er-review-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    padding: 22px;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .er-review-card:hover {
    transform: translateY(-2px);
    border-color: var(--el-accent);
    box-shadow: var(--el-shadow);
  }

  .er-review-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 18px;
  }

  .er-review-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .er-review-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 800;
    background: var(--el-surface-2);
    color: var(--el-muted);
    white-space: nowrap;
  }

  .er-review-badge.active {
    background: rgba(245,158,11,0.12);
    color: #b45309;
  }

  .er-review-title {
    font-size: 1rem;
    font-weight: 800;
    margin: 0 0 8px;
    color: var(--el-ink);
  }

  .er-review-desc {
    color: var(--el-muted);
    font-size: 13px;
    line-height: 1.65;
    margin: 0;
    flex: 1;
  }

  .er-info {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    border: 1px solid rgba(14,165,233,0.16);
    background: rgba(14,165,233,0.08);
    color: var(--el-muted);
    border-radius: 16px;
    padding: 12px;
    font-size: 12px;
    line-height: 1.55;
    margin: 18px 0 0;
  }

  .er-info svg {
    color: #0284c7;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .er-review-action {
    margin-top: 22px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 7px;
    border-radius: 14px;
    padding: 10px 14px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-accent);
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    transition: transform 0.12s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .er-review-action:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--el-accent);
    background: var(--el-accent-soft);
  }

  .er-review-action.primary {
    background: var(--el-accent);
    color: #fff;
    border-color: var(--el-accent);
    box-shadow: 0 10px 26px rgba(26,92,255,0.22);
  }

  .er-review-action:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .er-caught-up {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top left, rgba(18,183,106,0.12), transparent 32%),
      var(--el-surface);
    padding: 42px 22px;
    text-align: center;
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
  }

  .er-caught-icon {
    width: 68px;
    height: 68px;
    border-radius: 24px;
    background: rgba(18,183,106,0.12);
    color: #0f9f62;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .er-caught-title {
    margin: 0 0 6px;
    color: var(--el-ink);
    font-size: 1.1rem;
    font-weight: 820;
  }

  .er-caught-text {
    color: var(--el-muted);
    margin: 0;
    font-size: 13px;
  }

  .er-loading {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .er-spinner {
    width: 38px;
    height: 38px;
    border: 3px solid var(--el-surface-2);
    border-top-color: var(--el-accent);
    border-radius: 999px;
    animation: er-spin 0.8s linear infinite;
  }

  @keyframes er-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1180px) {
    .er-hero { grid-template-columns: 1fr; }
    .er-health-card { max-width: 520px; }
    .er-review-grid,
    .er-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .er-command-card,
    .er-health-card {
      padding-left: 18px;
      padding-right: 18px;
    }

    .er-review-grid,
    .er-metrics {
      grid-template-columns: 1fr;
    }
  }
`;

type ReviewCardProps = {
  title: string;
  count: number;
  icon: React.ElementType;
  description: string;
  actionLabel: string;
  link?: string;
  disabled?: boolean;
  infoText?: string;
};

const EmployerReviews: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    profileRequests: 0,
    applications: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [profileRequests, applicationsResponse] = await Promise.all([
        employerService.getProfileUpdateRequests('pending'),
        internshipService.getApplications(),
      ]);

      const allApplications = Array.isArray(applicationsResponse)
        ? applicationsResponse
        : (applicationsResponse as any)?.results || [];

      const pendingApps = allApplications.filter(
        (item: any) =>
          item.student_id && (item.status === 'APPLIED' || item.status === 'PENDING')
      );

      setStats({
        profileRequests: profileRequests.length,
        applications: pendingApps.length,
      });
    } catch (error: any) {
      console.error('Failed to fetch review stats', error);
    } finally {
      setLoading(false);
    }
  };

  const reviewLoad = stats.profileRequests + stats.applications;

  const reviewHealth = useMemo(() => {
    if (reviewLoad === 0) return 100;
    if (reviewLoad <= 3) return 82;
    if (reviewLoad <= 7) return 64;
    return 41;
  }, [reviewLoad]);

  const ReviewCard = ({
    title,
    count,
    icon: Icon,
    description,
    actionLabel,
    link,
    disabled = false,
    infoText,
  }: ReviewCardProps) => (
    <div className="er-review-card">
      <div className="er-review-top">
        <div className="er-review-icon">
          <Icon size={22} />
        </div>

        <span className={`er-review-badge ${count > 0 ? 'active' : ''}`}>
          {count} Pending
        </span>
      </div>

      <h3 className="er-review-title">{title}</h3>

      <p className="er-review-desc">{description}</p>

      {infoText && (
        <div className="er-info">
          <Info size={15} />
          <span>{infoText}</span>
        </div>
      )}

      <button
        type="button"
        className={`er-review-action ${count > 0 && !disabled ? 'primary' : ''}`}
        onClick={() => link && navigate(link)}
        disabled={disabled || !link}
      >
        {actionLabel}
        {!disabled && link && <ArrowRight size={14} />}
      </button>
    </div>
  );

  if (loading) {
    return (
      <EmployerLayout>
        <style>{STYLES}</style>
        <div className="er-loading">
          <div className="er-spinner" />
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <SEO
        title="Reviews & Approvals"
        description="Review employer profile requests, student applications, and approval items on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="er-page">
        <section className="er-hero">
          <div className="er-command-card">
            <div className="er-kicker">
              <Sparkles size={13} />
              Review Operations
            </div>

            <h1 className="er-title">
              Reviews <span>& Approvals</span>
            </h1>

            <p className="er-sub">
              Track items that need employer action, keep student applications moving,
              and avoid approval delays that weaken institution confidence.
            </p>
          </div>

          <aside className="er-health-card">
            <div className="er-health-top">
              <div>
                <div className="er-health-label">Review health</div>
                <div className="er-health-score">{reviewHealth}%</div>
              </div>

              <div className="er-health-icon">
                <TrendingUp size={20} />
              </div>
            </div>

            <p className="er-health-note">
              Estimated from pending approval load. A growing queue signals slower
              employer response cycles.
            </p>
          </aside>
        </section>

        <section className="er-metrics">
          <div className="er-metric">
            <div className="er-metric-top">
              <div>
                <div className="er-metric-label">Total pending</div>
                <div className="er-metric-value">{reviewLoad}</div>
              </div>

              <div className="er-metric-icon">
                <CheckSquare size={18} />
              </div>
            </div>

            <p className="er-metric-note">All employer-side items waiting for review.</p>
          </div>

          <div className="er-metric">
            <div className="er-metric-top">
              <div>
                <div className="er-metric-label">Profile requests</div>
                <div className="er-metric-value">{stats.profileRequests}</div>
              </div>

              <div className="er-metric-icon">
                <UserCog size={18} />
              </div>
            </div>

            <p className="er-metric-note">Staff profile updates requiring approval.</p>
          </div>

          <div className="er-metric">
            <div className="er-metric-top">
              <div>
                <div className="er-metric-label">Applications</div>
                <div className="er-metric-value">{stats.applications}</div>
              </div>

              <div className="er-metric-icon">
                <Briefcase size={18} />
              </div>
            </div>

            <p className="er-metric-note">Student applications awaiting employer action.</p>
          </div>
        </section>

        <section className="er-review-grid">
          <ReviewCard
            title="Profile Update Requests"
            count={stats.profileRequests}
            icon={UserCog}
            description="Review and approve personal detail changes requested by your staff members."
            actionLabel="Manage requests"
            link="/employer/dashboard/profile-requests"
          />

          <ReviewCard
            title="Internship Applications"
            count={stats.applications}
            icon={Briefcase}
            description="Review incoming student applications for posted opportunities and keep the recruitment queue moving."
            actionLabel="View applications"
            link="/employer/dashboard/applications"
          />

          <ReviewCard
            title="Student Logbooks"
            count={0}
            icon={FileText}
            description="Daily logbooks submitted by interns during active placements."
            actionLabel="Managed by supervisors"
            infoText="Logbook reviews are handled directly by assigned supervisors, not employer administrators."
            disabled
          />
        </section>

        {reviewLoad === 0 && (
          <section className="er-caught-up">
            <div className="er-caught-icon">
              <CheckCircle2 size={34} />
            </div>

            <h2 className="er-caught-title">All caught up.</h2>

            <p className="er-caught-text">
              There are no pending employer approvals at this time.
            </p>
          </section>
        )}
      </div>
    </EmployerLayout>
  );
};

export default EmployerReviews;