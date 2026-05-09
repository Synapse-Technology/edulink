import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Calendar,
  Clock,
  Crown,
  Eye,
  Key,
  Mail,
  RefreshCw,
  Search,
  Settings,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import axios from 'axios';

import AdminLayout from '../../../components/admin/AdminLayout';
import PlatformStaffManagementSkeleton from '../../../components/admin/skeletons/PlatformStaffManagementSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

interface PlatformStaff {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  permissions: string[];
}

interface StaffInvite {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  is_accepted: boolean;
}

const PlatformStaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<PlatformStaff[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<PlatformStaff | null>(null);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchStaffData = async () => {
    try {
      if (isLoading) setIsLoading(true);
      else setIsRefreshing(true);

      const token = getToken();
      if (!token) throw new Error('No authentication token');

      const [staffResponse, invitesResponse] = await Promise.all([
        axios.get('/api/admin/staff/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/admin/staff/invites/', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStaff(staffResponse.data);
      setInvites(invitesResponse.data);
      setError('');
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to load staff data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const pendingInvites = invites.filter((invite) => !invite.is_accepted);

    return {
      total: staff.length,
      superAdmins: staff.filter((member) => member.role === 'SUPER_ADMIN').length,
      platformAdmins: staff.filter((member) => member.role === 'PLATFORM_ADMIN').length,
      moderators: staff.filter((member) => member.role === 'MODERATOR').length,
      auditors: staff.filter((member) => member.role === 'AUDITOR').length,
      active: staff.filter((member) => member.is_active).length,
      inactive: staff.filter((member) => !member.is_active).length,
      pendingInvites: pendingInvites.length,
      neverLoggedIn: staff.filter((member) => !member.last_login).length,
    };
  }, [invites, staff]);

  const pendingInvites = invites.filter((invite) => !invite.is_accepted);

  const filteredStaff = staff.filter((member) => {
    const matchesSearch = member.email
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || member.role === filterRole;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && member.is_active) ||
      (filterStatus === 'inactive' && !member.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const token = getToken();

      await axios.delete(`/api/admin/staff/invites/${inviteId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchStaffData();
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to cancel invite.');
    }
  };

  const handleToggleStatus = async (staffId: string, isActive: boolean) => {
    try {
      const token = getToken();

      await axios.patch(
        `/api/admin/staff/${staffId}/`,
        { is_active: !isActive },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      fetchStaffData();
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to update staff access.');
    }
  };

  const getRoleMeta = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          label: 'Super Admin',
          className: 'role-danger',
          icon: <Crown size={13} />,
        };
      case 'PLATFORM_ADMIN':
        return {
          label: 'Platform Admin',
          className: 'role-blue',
          icon: <Shield size={13} />,
        };
      case 'MODERATOR':
        return {
          label: 'Moderator',
          className: 'role-green',
          icon: <UserCheck size={13} />,
        };
      case 'AUDITOR':
        return {
          label: 'Auditor',
          className: 'role-warning',
          icon: <Eye size={13} />,
        };
      default:
        return {
          label: role.replace(/_/g, ' '),
          className: 'role-muted',
          icon: <Shield size={13} />,
        };
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'Never';

    return new Date(value).toLocaleDateString('en-GB');
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return 'Never logged in';

    return new Date(value).toLocaleString('en-GB');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <PlatformStaffManagementSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="staff-page">
        <header className="staff-header">
          <div>
            <span className="staff-kicker">
              <Shield size={14} />
              Internal access control
            </span>

            <h1>Platform Staff Access</h1>

            <p>
              Manage platform administrators, moderation roles, audit access,
              pending invitations, permissions, and staff account lifecycle.
            </p>
          </div>

          <div className="staff-header-actions">
            <button
              type="button"
              className="staff-btn secondary"
              onClick={fetchStaffData}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? 'spin-animation' : ''}
              />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>

            <Link to="/admin/staff/invite" className="staff-btn primary">
              <UserPlus size={16} />
              Invite staff
            </Link>
          </div>
        </header>

        {error && (
          <div className="staff-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>

            <button type="button" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}

        <section className="staff-signal-grid">
          <article>
            <div className="signal-icon neutral">
              <Users size={20} />
            </div>
            <strong>{stats.total}</strong>
            <span>Total staff accounts</span>
          </article>

          <article>
            <div className="signal-icon success">
              <Activity size={20} />
            </div>
            <strong>{stats.active}</strong>
            <span>Active access</span>
          </article>

          <article>
            <div className="signal-icon danger">
              <UserX size={20} />
            </div>
            <strong>{stats.inactive}</strong>
            <span>Inactive access</span>
          </article>

          <article>
            <div className="signal-icon warning">
              <Clock size={20} />
            </div>
            <strong>{stats.pendingInvites}</strong>
            <span>Pending invites</span>
          </article>

          <article>
            <div className="signal-icon indigo">
              <Crown size={20} />
            </div>
            <strong>{stats.superAdmins}</strong>
            <span>Super admins</span>
          </article>

          <article>
            <div className="signal-icon muted">
              <Key size={20} />
            </div>
            <strong>{stats.neverLoggedIn}</strong>
            <span>Never logged in</span>
          </article>
        </section>

        <section className="staff-panel">
          <div className="staff-panel-header">
            <div>
              <span className="staff-panel-kicker">Access registry</span>
              <h2>Staff accounts</h2>
              <p>Review internal accounts, role assignments, permissions, and access status.</p>
            </div>

            <span className="staff-count">
              {filteredStaff.length} visible
            </span>
          </div>

          <div className="staff-filter-bar">
            <div className="staff-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search staff by email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
            >
              <option value="all">All roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="PLATFORM_ADMIN">Platform Admin</option>
              <option value="MODERATOR">Moderator</option>
              <option value="AUDITOR">Auditor</option>
            </select>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last activity</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="staff-empty">
                        No staff accounts match your filters.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const role = getRoleMeta(member.role);

                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="staff-identity">
                            <div className="staff-avatar">
                              <Mail size={16} />
                            </div>

                            <div>
                              <strong>{member.email}</strong>
                              <span>
                                <Calendar size={12} />
                                Joined {formatDate(member.created_at)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`staff-role ${role.className}`}>
                            {role.icon}
                            {role.label}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`staff-status ${
                              member.is_active ? 'status-success' : 'status-danger'
                            }`}
                          >
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`staff-activity ${
                              member.last_login ? 'active' : 'muted'
                            }`}
                          >
                            <Activity size={13} />
                            {formatDateTime(member.last_login)}
                          </span>
                        </td>

                        <td>
                          <div className="permission-list">
                            {member.permissions.length > 0 ? (
                              <>
                                {member.permissions.slice(0, 2).map((permission) => (
                                  <span key={permission}>{permission}</span>
                                ))}

                                {member.permissions.length > 2 && (
                                  <span>+{member.permissions.length - 2}</span>
                                )}
                              </>
                            ) : (
                              <span className="empty-permission">No permissions</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="staff-row-actions">
                            <button
                              type="button"
                              onClick={() => setSelectedStaff(member)}
                            >
                              <Eye size={14} />
                              View
                            </button>

                            <Link to={`/admin/staff/${member.id}/edit`}>
                              <Settings size={14} />
                              Edit
                            </Link>

                            <Link to={`/admin/staff/${member.id}/permissions`}>
                              <Key size={14} />
                              Permissions
                            </Link>

                            <button
                              type="button"
                              className={member.is_active ? 'danger' : 'success'}
                              onClick={() =>
                                handleToggleStatus(member.id, member.is_active)
                              }
                            >
                              {member.is_active ? (
                                <>
                                  <UserX size={14} />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck size={14} />
                                  Activate
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {pendingInvites.length > 0 && (
          <section className="invite-panel">
            <div className="staff-panel-header">
              <div>
                <span className="staff-panel-kicker">Pending onboarding</span>
                <h2>Staff invitations</h2>
                <p>Invitations that have not yet been accepted.</p>
              </div>
            </div>

            <div className="invite-grid">
              {pendingInvites.map((invite) => (
                <article className="invite-card" key={invite.id}>
                  <div className="invite-icon">
                    <Mail size={18} />
                  </div>

                  <div>
                    <strong>{invite.email}</strong>
                    <span>{invite.role.replace(/_/g, ' ')}</span>

                    <small>
                      Invited by {invite.invited_by} · Expires{' '}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedStaff && (
        <div className="staff-modal-backdrop">
          <div className="staff-modal">
            <header className="staff-modal-header">
              <div>
                <span>Staff identity record</span>
                <h2>{selectedStaff.email}</h2>
              </div>

              <button type="button" onClick={() => setSelectedStaff(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="staff-modal-body">
              <aside className="staff-record-summary">
                <div className="staff-record-icon">
                  <Shield size={34} />
                </div>

                <h3>{selectedStaff.email}</h3>

                <div className="staff-record-badges">
                  <span className={`staff-role ${getRoleMeta(selectedStaff.role).className}`}>
                    {getRoleMeta(selectedStaff.role).icon}
                    {getRoleMeta(selectedStaff.role).label}
                  </span>

                  <span
                    className={`staff-status ${
                      selectedStaff.is_active ? 'status-success' : 'status-danger'
                    }`}
                  >
                    {selectedStaff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </aside>

              <section className="staff-record-details">
                <div className="record-block">
                  <h4>
                    <Activity size={14} />
                    Access activity
                  </h4>

                  <dl>
                    <div>
                      <dt>Joined platform</dt>
                      <dd>{formatDate(selectedStaff.created_at)}</dd>
                    </div>

                    <div>
                      <dt>Last system access</dt>
                      <dd>{formatDateTime(selectedStaff.last_login)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Key size={14} />
                    Assigned permissions
                  </h4>

                  <div className="permission-list expanded">
                    {selectedStaff.permissions.length > 0 ? (
                      selectedStaff.permissions.map((permission) => (
                        <span key={permission}>{permission}</span>
                      ))
                    ) : (
                      <span className="empty-permission">
                        No specific permissions assigned
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <footer className="staff-modal-footer">
              <button
                type="button"
                className="staff-btn secondary"
                onClick={() => setSelectedStaff(null)}
              >
                Close
              </button>

              <Link
                to={`/admin/staff/${selectedStaff.id}/edit`}
                className="staff-btn primary"
              >
                <Settings size={15} />
                Edit profile
              </Link>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        .staff-page {
          color: #111827;
        }

        .staff-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .staff-kicker,
        .staff-panel-kicker {
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

        .staff-kicker svg {
          color: #047857;
        }

        .staff-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .staff-header p {
          max-width: 760px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .staff-header-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .staff-btn {
          min-height: 42px;
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

        .staff-btn.primary {
          background: #0f172a;
          color: #ffffff;
        }

        .staff-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .staff-error {
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

        .staff-error button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .staff-signal-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .staff-signal-grid article,
        .staff-panel,
        .invite-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .staff-signal-grid article {
          border-radius: 18px;
          padding: 16px;
        }

        .signal-icon {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .signal-icon.neutral { color: #334155; background: #f1f5f9; }
        .signal-icon.success { color: #047857; background: #ecfdf5; }
        .signal-icon.danger { color: #b91c1c; background: #fef2f2; }
        .signal-icon.warning { color: #b45309; background: #fffbeb; }
        .signal-icon.indigo { color: #4338ca; background: #eef2ff; }
        .signal-icon.muted { color: #64748b; background: #f8fafc; }

        .staff-signal-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .staff-signal-grid span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
        }

        .staff-panel,
        .invite-panel {
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 18px;
        }

        .staff-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .staff-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
        }

        .staff-panel-header p {
          color: #64748b;
          margin: 0;
          font-size: .9rem;
          line-height: 1.55;
        }

        .staff-count {
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: .78rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .staff-filter-bar {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 210px 180px;
          gap: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .staff-search {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #94a3b8;
        }

        .staff-search input {
          width: 100%;
          border: 0;
          outline: none;
          color: #111827;
          font-weight: 650;
          font-size: .9rem;
        }

        .staff-filter-bar select {
          min-height: 44px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          padding: 0 12px;
          font-weight: 750;
        }

        .staff-table-wrap {
          overflow-x: auto;
        }

        .staff-table {
          width: 100%;
          min-width: 1120px;
          border-collapse: collapse;
        }

        .staff-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .staff-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .staff-identity {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 260px;
        }

        .staff-avatar {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #f1f5f9;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .staff-identity strong {
          display: block;
          color: #0f172a;
          font-size: .9rem;
          font-weight: 900;
        }

        .staff-identity span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: .78rem;
        }

        .staff-role,
        .staff-status,
        .staff-activity {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .role-danger { background: #fef2f2; color: #b91c1c; }
        .role-blue { background: #eff6ff; color: #2563eb; }
        .role-green { background: #ecfdf5; color: #047857; }
        .role-warning { background: #fffbeb; color: #b45309; }
        .role-muted { background: #f8fafc; color: #475569; }

        .status-success,
        .staff-activity.active {
          background: #ecfdf5;
          color: #047857;
        }

        .status-danger {
          background: #fef2f2;
          color: #b91c1c;
        }

        .staff-activity.muted {
          background: #f8fafc;
          color: #64748b;
        }

        .permission-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-width: 280px;
        }

        .permission-list span {
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #334155;
          padding: 5px 8px;
          font-size: .72rem;
          font-weight: 800;
        }

        .permission-list .empty-permission {
          color: #94a3b8;
        }

        .permission-list.expanded {
          max-width: none;
        }

        .staff-row-actions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .staff-row-actions button,
        .staff-row-actions a {
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid #dbe3ea;
          background: #ffffff;
          color: #334155;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: .78rem;
          font-weight: 850;
          cursor: pointer;
          text-decoration: none;
        }

        .staff-row-actions .danger {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .staff-row-actions .success {
          color: #047857;
          border-color: #bbf7d0;
        }

        .staff-empty {
          padding: 44px 20px;
          text-align: center;
          color: #64748b;
          font-weight: 700;
        }

        .invite-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .invite-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 14px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
        }

        .invite-icon {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          background: #fffbeb;
          color: #b45309;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .invite-card strong {
          display: block;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
          word-break: break-word;
        }

        .invite-card span,
        .invite-card small {
          display: block;
          color: #64748b;
          font-size: .78rem;
          line-height: 1.5;
        }

        .invite-card button {
          grid-column: 1 / -1;
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid #fecaca;
          background: #ffffff;
          color: #b91c1c;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: .78rem;
          font-weight: 850;
          cursor: pointer;
        }

        .staff-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15,23,42,.48);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .staff-modal {
          width: min(880px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #ffffff;
          border-radius: 22px;
          box-shadow: 0 24px 80px rgba(15,23,42,.24);
        }

        .staff-modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .staff-modal-header span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .staff-modal-header h2 {
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -.03em;
          word-break: break-word;
        }

        .staff-modal-header button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .staff-modal-body {
          padding: 20px;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
        }

        .staff-record-summary {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          text-align: center;
        }

        .staff-record-icon {
          width: 76px;
          height: 76px;
          margin: 0 auto 14px;
          border-radius: 22px;
          background: #f1f5f9;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .staff-record-summary h3 {
          color: #0f172a;
          font-size: .95rem;
          font-weight: 900;
          margin: 0 0 14px;
          word-break: break-word;
        }

        .staff-record-badges {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .staff-record-details {
          display: grid;
          gap: 14px;
        }

        .record-block {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
        }

        .record-block h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
          margin: 0 0 14px;
        }

        .record-block dl {
          margin: 0;
          display: grid;
          gap: 12px;
        }

        .record-block dl > div {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 14px;
        }

        .record-block dt {
          color: #64748b;
          font-size: .78rem;
          font-weight: 800;
        }

        .record-block dd {
          margin: 0;
          color: #111827;
          font-size: .88rem;
          font-weight: 750;
        }

        .staff-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eef2f7;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .spin-animation {
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1180px) {
          .staff-signal-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .invite-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .staff-header,
          .staff-panel-header {
            flex-direction: column;
          }

          .staff-header-actions {
            width: 100%;
            flex-direction: column;
          }

          .staff-btn {
            width: 100%;
          }

          .staff-signal-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .staff-filter-bar {
            grid-template-columns: 1fr;
          }

          .invite-grid,
          .staff-modal-body {
            grid-template-columns: 1fr;
          }

          .record-block dl > div {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .staff-modal-footer {
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .staff-signal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default PlatformStaffManagement;