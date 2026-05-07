import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  UserCog,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { FeedbackModal } from '../../../components/common';
import { SEO } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { EmployerLayout } from '../../../components/admin/employer';
import {
  employerService,
  type EmployerStaffProfileRequest,
} from '../../../services/employer/employerService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const STYLES = `
  .epr-page { color: var(--el-ink); }

  .epr-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    margin-bottom: 22px;
  }

  .epr-command-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    padding: 28px;
    box-shadow: var(--el-shadow);
  }

  .epr-kicker {
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

  .epr-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .epr-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .epr-sub {
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
    max-width: 700px;
  }

  .epr-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
  }

  .epr-health-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .epr-health-label,
  .epr-card-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .epr-health-score {
    font-size: 3rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .epr-health-icon {
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

  .epr-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .epr-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .epr-metric {
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface);
    padding: 18px;
    min-height: 126px;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .epr-metric:hover {
    transform: translateY(-2px);
    border-color: var(--el-accent);
    box-shadow: var(--el-shadow);
  }

  .epr-metric-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .epr-metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .epr-metric-value {
    font-size: 2rem;
    font-weight: 820;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .epr-metric-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .epr-metric-note {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  .epr-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .epr-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
  }

  .epr-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    margin: 0;
    color: var(--el-ink);
  }

  .epr-card-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .epr-table-wrap { overflow-x: auto; }

  .epr-table {
    width: 100%;
    border-collapse: collapse;
  }

  .epr-table th {
    padding: 16px 22px 12px;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .epr-table td {
    padding: 16px 22px;
    border-top: 1px solid var(--el-border);
    vertical-align: middle;
    color: var(--el-ink);
    font-size: 13px;
  }

  .epr-staff {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 250px;
  }

  .epr-avatar {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    flex-shrink: 0;
  }

  .epr-name {
    font-weight: 780;
    margin: 0;
  }

  .epr-muted {
    color: var(--el-muted);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .epr-change-list {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 260px;
  }

  .epr-change {
    display: flex;
    align-items: baseline;
    gap: 8px;
    border-radius: 12px;
    background: var(--el-surface-2);
    border: 1px solid var(--el-border);
    padding: 8px 10px;
    font-size: 12px;
  }

  .epr-change-key {
    color: var(--el-muted);
    font-weight: 800;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .epr-change-value {
    color: var(--el-ink);
    font-weight: 760;
    word-break: break-word;
  }

  .epr-date {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--el-muted);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .epr-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .epr-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 800;
    border: 1px solid var(--el-border);
    transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
  }

  .epr-action-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .epr-action-btn.approve {
    background: rgba(18,183,106,0.12);
    color: #0f9f62;
    border-color: rgba(18,183,106,0.18);
  }

  .epr-action-btn.approve:hover:not(:disabled) {
    background: rgba(18,183,106,0.18);
  }

  .epr-action-btn.reject {
    background: rgba(239,68,68,0.08);
    color: #dc2626;
    border-color: rgba(239,68,68,0.18);
  }

  .epr-action-btn.reject:hover:not(:disabled) {
    background: rgba(239,68,68,0.14);
  }

  .epr-action-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .epr-empty,
  .epr-loading {
    padding: 52px 20px;
    text-align: center;
    color: var(--el-muted);
  }

  .epr-empty-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: var(--el-surface-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    color: var(--el-muted);
  }

  .epr-empty-title {
    color: var(--el-ink);
    font-size: 15px;
    font-weight: 800;
    margin: 0 0 5px;
  }

  .epr-empty-text {
    margin: 0;
    color: var(--el-muted);
    font-size: 13px;
  }

  .epr-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid var(--el-surface-2);
    border-top-color: var(--el-accent);
    border-radius: 999px;
    animation: epr-spin 0.8s linear infinite;
    margin: 0 auto 12px;
  }

  @keyframes epr-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1180px) {
    .epr-hero { grid-template-columns: 1fr; }
    .epr-health-card { max-width: 520px; }
  }

  @media (max-width: 760px) {
    .epr-command-card,
    .epr-health-card,
    .epr-card-header {
      padding-left: 18px;
      padding-right: 18px;
    }

    .epr-metrics {
      grid-template-columns: 1fr;
    }

    .epr-table {
      min-width: 860px;
    }
  }
`;

const formatFieldName = (key: string) =>
  key.replace(/_/g, ' ');

const EmployerProfileRequests: React.FC = () => {
  const [requests, setRequests] = useState<EmployerStaffProfileRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { feedbackProps, showError, showSuccess } = useFeedbackModal();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);

      const data = await employerService.getProfileUpdateRequests('pending');

      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch profile requests:', error);
      toast.error('Failed to load profile update requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (
    requestId: string,
    action: 'approve' | 'reject'
  ) => {
    let feedback = '';

    if (action === 'reject') {
      const reason = window.prompt(
        'Please provide a reason for rejection (optional):'
      );

      if (reason === null) return;

      feedback = reason;
    }

    try {
      setProcessingId(requestId);

      await employerService.reviewProfileUpdateRequest(requestId, {
        action,
        admin_feedback: feedback,
      });

      showSuccess(
        action === 'approve' ? 'Request Approved' : 'Request Rejected',
        `The profile update request has been ${action}d successfully.`
      );

      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error: any) {
      console.error(`Failed to ${action} request:`, error);

      const sanitized = sanitizeAdminError(error);

      showError(
        'Action Failed',
        `Failed to ${action} the request.`,
        sanitized.details
      );
    } finally {
      setProcessingId(null);
    }
  };

  const metrics = useMemo(() => {
    const total = requests.length;
    const fieldsChanged = requests.reduce(
      (sum, request) => sum + Object.keys(request.requested_changes || {}).length,
      0
    );

    return {
      total,
      fieldsChanged,
      reviewHealth: total === 0 ? 100 : total <= 3 ? 82 : total <= 7 ? 64 : 41,
    };
  }, [requests]);

  return (
    <EmployerLayout>
      <SEO
        title="Profile Update Requests"
        description="Review and approve staff profile update requests on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="epr-page">
        <section className="epr-hero">
          <div className="epr-command-card">
            <div className="epr-kicker">
              <Sparkles size={13} />
              Staff Profile Governance
            </div>

            <h1 className="epr-title">
              Profile <span>Update Requests</span>
            </h1>

            <p className="epr-sub">
              Review staff-requested profile changes before they affect employer records,
              team access, or institution-facing supervision details.
            </p>
          </div>

          <aside className="epr-health-card">
            <div className="epr-health-top">
              <div>
                <div className="epr-health-label">Review health</div>
                <div className="epr-health-score">{metrics.reviewHealth}%</div>
              </div>

              <div className="epr-health-icon">
                <UserCog size={20} />
              </div>
            </div>

            <p className="epr-health-note">
              Estimated from pending profile changes. A growing queue can create outdated
              supervisor information and access confusion.
            </p>
          </aside>
        </section>

        <section className="epr-metrics">
          <div className="epr-metric">
            <div className="epr-metric-top">
              <div>
                <div className="epr-metric-label">Pending requests</div>
                <div className="epr-metric-value">{metrics.total}</div>
              </div>

              <div className="epr-metric-icon">
                <Clock size={18} />
              </div>
            </div>

            <p className="epr-metric-note">Staff updates waiting for employer review.</p>
          </div>

          <div className="epr-metric">
            <div className="epr-metric-top">
              <div>
                <div className="epr-metric-label">Fields changed</div>
                <div className="epr-metric-value">{metrics.fieldsChanged}</div>
              </div>

              <div className="epr-metric-icon">
                <UserCog size={18} />
              </div>
            </div>

            <p className="epr-metric-note">Total profile fields affected by pending requests.</p>
          </div>

          <div className="epr-metric">
            <div className="epr-metric-top">
              <div>
                <div className="epr-metric-label">Governance state</div>
                <div className="epr-metric-value">
                  {metrics.total === 0 ? 'OK' : 'Open'}
                </div>
              </div>

              <div className="epr-metric-icon">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <p className="epr-metric-note">
              {metrics.total === 0
                ? 'No pending staff data changes.'
                : 'Staff changes require administrator action.'}
            </p>
          </div>
        </section>

        <section className="epr-card">
          <div className="epr-card-header">
            <div className="epr-card-label">Approval queue</div>
            <h2 className="epr-card-title">Staff profile change requests</h2>
            <p className="epr-card-sub">
              Showing {requests.length} pending profile update request
              {requests.length === 1 ? '' : 's'}.
            </p>
          </div>

          <div className="epr-table-wrap">
            <table className="epr-table">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Requested changes</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="epr-loading">
                        <div className="epr-spinner" />
                        <p className="epr-empty-text">Loading profile requests...</p>
                      </div>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="epr-empty">
                        <div className="epr-empty-icon">
                          <User size={26} />
                        </div>

                        <p className="epr-empty-title">No pending profile requests.</p>

                        <p className="epr-empty-text">
                          Staff profile changes that need approval will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="epr-staff">
                          <div className="epr-avatar">
                            {request.staff.name?.charAt(0) || 'S'}
                          </div>

                          <div>
                            <p className="epr-name">{request.staff.name}</p>
                            <p className="epr-muted">{request.staff.email}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="epr-change-list">
                          {Object.entries(request.requested_changes || {}).map(
                            ([key, value]) => (
                              <div key={key} className="epr-change">
                                <span className="epr-change-key">
                                  {formatFieldName(key)}:
                                </span>

                                <span className="epr-change-value">
                                  {String(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="epr-date">
                          <Calendar size={14} />
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="epr-actions">
                          <button
                            type="button"
                            className="epr-action-btn approve"
                            onClick={() => handleReview(request.id, 'approve')}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              'Processing...'
                            ) : (
                              <>
                                <Check size={15} />
                                Approve
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="epr-action-btn reject"
                            onClick={() => handleReview(request.id, 'reject')}
                            disabled={processingId === request.id}
                          >
                            <X size={15} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <FeedbackModal {...feedbackProps} />
    </EmployerLayout>
  );
};

export default EmployerProfileRequests;