import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Mail,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { FeedbackModal } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { EmployerLayout } from '../../../components/admin/employer';
import { useAuth } from '../../../contexts/AuthContext';
import { employerService } from '../../../services/employer/employerService';
import type { Supervisor } from '../../../services/employer/employerService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import { SEO } from '../../../components/common';

const STYLES = `
  .es-page { color: var(--el-ink); }

  .es-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    margin-bottom: 22px;
  }

  .es-command-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    padding: 28px;
    box-shadow: var(--el-shadow);
  }

  .es-kicker {
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

  .es-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .es-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .es-sub {
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0 0 22px;
    max-width: 680px;
  }

  .es-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 14px;
    padding: 10px 16px;
    background: var(--el-accent);
    color: #fff;
    border: 1px solid var(--el-accent);
    font-size: 13px;
    font-weight: 800;
    box-shadow: 0 10px 26px rgba(26,92,255,0.22);
    transition: transform 0.12s ease, box-shadow 0.15s ease;
  }

  .es-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 32px rgba(26,92,255,0.3);
  }

  .es-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
  }

  .es-health-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .es-health-label,
  .es-card-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .es-health-score {
    font-size: 3rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .es-health-icon {
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

  .es-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .es-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .es-metric {
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface);
    padding: 18px;
    min-height: 126px;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .es-metric:hover {
    transform: translateY(-2px);
    border-color: var(--el-accent);
    box-shadow: var(--el-shadow);
  }

  .es-metric-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .es-metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .es-metric-value {
    font-size: 2rem;
    font-weight: 820;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .es-metric-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .es-metric-note {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  .es-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .es-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .es-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    margin: 0;
    color: var(--el-ink);
  }

  .es-card-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .es-table-wrap { overflow-x: auto; }

  .es-table {
    width: 100%;
    border-collapse: collapse;
  }

  .es-table th {
    padding: 16px 22px 12px;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .es-table td {
    padding: 16px 22px;
    border-top: 1px solid var(--el-border);
    vertical-align: middle;
    color: var(--el-ink);
    font-size: 13px;
  }

  .es-person {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 230px;
  }

  .es-avatar {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: rgba(18,183,106,0.12);
    color: #0f9f62;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    flex-shrink: 0;
  }

  .es-name {
    font-weight: 780;
    margin: 0;
  }

  .es-muted {
    color: var(--el-muted);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .es-role,
  .es-contact {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--el-muted);
    font-size: 12px;
    font-weight: 700;
  }

  .es-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .es-status.active {
    background: rgba(18,183,106,0.12);
    color: #0f9f62;
  }

  .es-status.inactive {
    background: var(--el-surface-2);
    color: var(--el-muted);
  }

  .es-remove-btn {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    border: 1px solid rgba(239,68,68,0.18);
    background: rgba(239,68,68,0.08);
    color: #dc2626;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .es-remove-btn:hover:not(:disabled) {
    background: rgba(239,68,68,0.14);
    transform: translateY(-1px);
  }

  .es-remove-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .es-empty,
  .es-loading {
    padding: 52px 20px;
    text-align: center;
    color: var(--el-muted);
  }

  .es-empty-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: var(--el-surface-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }

  .es-empty-title {
    color: var(--el-ink);
    font-size: 15px;
    font-weight: 800;
    margin: 0 0 5px;
  }

  .es-empty-text {
    margin: 0;
    color: var(--el-muted);
    font-size: 13px;
  }

  .es-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid var(--el-surface-2);
    border-top-color: var(--el-accent);
    border-radius: 999px;
    animation: es-spin 0.8s linear infinite;
    margin: 0 auto 12px;
  }

  @keyframes es-spin {
    to { transform: rotate(360deg); }
  }

  .es-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.48);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .es-modal {
    width: min(520px, 100%);
    border-radius: 24px;
    background: var(--el-surface);
    border: 1px solid var(--el-border);
    box-shadow: 0 24px 80px rgba(15,23,42,0.22);
    overflow: hidden;
  }

  .es-modal-header {
    padding: 20px 22px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .es-modal-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  .es-modal-close {
    border: 0;
    background: var(--el-surface-2);
    color: var(--el-muted);
    width: 34px;
    height: 34px;
    border-radius: 12px;
    font-weight: 900;
  }

  .es-modal-body {
    padding: 22px;
  }

  .es-field {
    margin-bottom: 18px;
  }

  .es-label {
    display: block;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .es-input,
  .es-select {
    width: 100%;
    height: 46px;
    border-radius: 16px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    padding: 0 14px;
    font-size: 13px;
    font-weight: 700;
    outline: none;
  }

  .es-help {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    color: var(--el-muted);
    font-size: 12px;
    margin-top: 10px;
    line-height: 1.5;
  }

  .es-modal-footer {
    padding: 16px 22px 20px;
    border-top: 1px solid var(--el-border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .es-modal-secondary,
  .es-modal-primary {
    border-radius: 14px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid var(--el-border);
  }

  .es-modal-secondary {
    background: var(--el-surface-2);
    color: var(--el-muted);
  }

  .es-modal-primary {
    background: var(--el-accent);
    color: white;
    border-color: var(--el-accent);
  }

  .es-modal-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 1180px) {
    .es-hero { grid-template-columns: 1fr; }
    .es-health-card { max-width: 520px; }
  }

  @media (max-width: 760px) {
    .es-metrics {
      grid-template-columns: 1fr;
    }

    .es-command-card,
    .es-health-card,
    .es-card-header {
      padding-left: 18px;
      padding-right: 18px;
    }

    .es-table {
      min-width: 760px;
    }
  }
`;

const EmployerSupervisors: React.FC = () => {
  const { user } = useAuth();

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'SUPERVISOR',
  });

  const { feedbackProps, showError, showConfirm } = useFeedbackModal();

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      setIsLoading(true);
      const data = await employerService.getSupervisors();
      setSupervisors(data);
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsInviting(true);

      await employerService.inviteSupervisor({
        email: inviteData.email,
        role: inviteData.role,
      });

      toast.success('Supervisor invited successfully');
      setShowInviteModal(false);
      setInviteData({ email: '', role: 'SUPERVISOR' });
      fetchSupervisors();
    } catch (error) {
      console.error('Failed to invite supervisor:', error);
      toast.error('Failed to invite supervisor');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveSupervisor = async (id: string) => {
    showConfirm({
      title: 'Remove Supervisor',
      message:
        'Are you sure you want to remove this supervisor? They will no longer have access to the employer portal.',
      variant: 'error',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await employerService.removeSupervisor(id);
          toast.success('Supervisor removed successfully');
          fetchSupervisors();
        } catch (error: any) {
          console.error('Failed to remove supervisor:', error);
          const sanitized = sanitizeAdminError(error);

          showError(
            'Removal Failed',
            'We encountered an error while trying to remove this supervisor.',
            sanitized.details
          );
        }
      },
    });
  };

  const metrics = useMemo(() => {
    const total = supervisors.length;
    const active = supervisors.filter((sup) => sup.is_active).length;
    const admins = supervisors.filter((sup) => sup.role === 'ADMIN').length;
    const activationRate = total ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      admins,
      activationRate,
    };
  }, [supervisors]);

  return (
    <EmployerLayout>
      <SEO
        title="Supervisors"
        description="Manage employer supervisors, roles, and team access on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="es-page">
        <section className="es-hero">
          <div className="es-command-card">
            <div className="es-kicker">
              <Sparkles size={13} />
              Supervision Team
            </div>

            <h1 className="es-title">
              Supervisor <span>Access</span>
            </h1>

            <p className="es-sub">
              Invite mentors, manage employer-side access, and make sure active interns
              have accountable supervision before placement workflows begin.
            </p>

            <button
              type="button"
              className="es-btn-primary"
              onClick={() => setShowInviteModal(true)}
            >
              <Plus size={16} />
              Invite Supervisor
              <ArrowRight size={14} />
            </button>
          </div>

          <aside className="es-health-card">
            <div className="es-health-top">
              <div>
                <div className="es-health-label">Activation rate</div>
                <div className="es-health-score">{metrics.activationRate}%</div>
              </div>

              <div className="es-health-icon">
                <TrendingUp size={20} />
              </div>
            </div>

            <p className="es-health-note">
              Active supervisors are the backbone of credible internship monitoring.
              Pending accounts create supervision bottlenecks.
            </p>
          </aside>
        </section>

        <section className="es-metrics">
          <div className="es-metric">
            <div className="es-metric-top">
              <div>
                <div className="es-metric-label">Total supervisors</div>
                <div className="es-metric-value">{metrics.total}</div>
              </div>

              <div className="es-metric-icon">
                <Users size={18} />
              </div>
            </div>

            <p className="es-metric-note">All invited employer-side users.</p>
          </div>

          <div className="es-metric">
            <div className="es-metric-top">
              <div>
                <div className="es-metric-label">Active accounts</div>
                <div className="es-metric-value">{metrics.active}</div>
              </div>

              <div className="es-metric-icon">
                <UserCheck size={18} />
              </div>
            </div>

            <p className="es-metric-note">Supervisors ready to support interns.</p>
          </div>

          <div className="es-metric">
            <div className="es-metric-top">
              <div>
                <div className="es-metric-label">Admins</div>
                <div className="es-metric-value">{metrics.admins}</div>
              </div>

              <div className="es-metric-icon">
                <Shield size={18} />
              </div>
            </div>

            <p className="es-metric-note">Team members with elevated access.</p>
          </div>
        </section>

        <section className="es-card">
          <div className="es-card-header">
            <div>
              <div className="es-card-label">Team access</div>
              <h2 className="es-card-title">Supervisor management workspace</h2>
              <p className="es-card-sub">
                Showing {supervisors.length} employer-side supervision accounts.
              </p>
            </div>
          </div>

          <div className="es-table-wrap">
            <table className="es-table">
              <thead>
                <tr>
                  <th>Supervisor</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="es-loading">
                        <div className="es-spinner" />
                        <p className="es-empty-text">Loading supervisors...</p>
                      </div>
                    </td>
                  </tr>
                ) : supervisors.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="es-empty">
                        <div className="es-empty-icon">
                          <Users size={26} />
                        </div>

                        <p className="es-empty-title">No supervisors yet.</p>

                        <p className="es-empty-text">
                          Invite your team members so active interns can be assigned
                          accountable mentors.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  supervisors.map((supervisor) => {
                    const isCurrentUser = user?.email === supervisor.email;

                    return (
                      <tr key={supervisor.id}>
                        <td>
                          <div className="es-person">
                            <div className="es-avatar">
                              {supervisor.name?.charAt(0) ||
                                supervisor.email.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <p className="es-name">
                                {supervisor.name || 'Pending Activation'}
                              </p>

                              <p className="es-muted">
                                {isCurrentUser ? 'Your account' : 'Employer team member'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="es-role">
                            <Shield size={14} />
                            {supervisor.role === 'ADMIN' ? 'Admin' : 'Supervisor'}
                          </span>
                        </td>

                        <td>
                          <span className="es-contact">
                            <Mail size={14} />
                            {supervisor.email}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`es-status ${
                              supervisor.is_active ? 'active' : 'inactive'
                            }`}
                          >
                            {supervisor.is_active ? (
                              <UserCheck size={12} />
                            ) : (
                              <AlertCircle size={12} />
                            )}

                            {supervisor.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="es-remove-btn"
                            onClick={() => handleRemoveSupervisor(supervisor.id)}
                            disabled={isCurrentUser}
                            title={
                              isCurrentUser
                                ? 'You cannot remove your own account'
                                : 'Remove Supervisor'
                            }
                          >
                            <Trash2 size={16} />
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

        {showInviteModal && (
          <div className="es-modal-backdrop">
            <div className="es-modal">
              <form onSubmit={handleInviteSubmit}>
                <div className="es-modal-header">
                  <h5 className="es-modal-title">Invite New Supervisor</h5>

                  <button
                    type="button"
                    className="es-modal-close"
                    onClick={() => setShowInviteModal(false)}
                    disabled={isInviting}
                  >
                    ×
                  </button>
                </div>

                <div className="es-modal-body">
                  <div className="es-field">
                    <label className="es-label">Email address</label>

                    <input
                      type="email"
                      className="es-input"
                      required
                      placeholder="supervisor@example.com"
                      value={inviteData.email}
                      onChange={(event) =>
                        setInviteData({
                          ...inviteData,
                          email: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="es-field">
                    <label className="es-label">Access role</label>

                    <select
                      className="es-select"
                      value={inviteData.role}
                      onChange={(event) =>
                        setInviteData({
                          ...inviteData,
                          role: event.target.value,
                        })
                      }
                    >
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="ADMIN">Admin</option>
                    </select>

                    <div className="es-help">
                      <AlertCircle size={13} />
                      <span>
                        Admins can manage company profile and other supervisors.
                        Supervisors should be used for internship mentorship access.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="es-modal-footer">
                  <button
                    type="button"
                    className="es-modal-secondary"
                    onClick={() => setShowInviteModal(false)}
                    disabled={isInviting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="es-modal-primary"
                    disabled={isInviting}
                  >
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <FeedbackModal {...feedbackProps} />
    </EmployerLayout>
  );
};

export default EmployerSupervisors;