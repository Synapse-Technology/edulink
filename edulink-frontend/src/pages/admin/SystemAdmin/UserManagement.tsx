import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  Users,
  UserX,
  X,
  XCircle,
} from 'lucide-react';

import { adminAuthService } from '../../../services';
import AdminLayout from '../../../components/admin/AdminLayout';
import UserManagementSkeleton from '../../../components/admin/skeletons/UserManagementSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

interface UserRecord {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  is_active: boolean;
  is_email_verified: boolean;
  date_joined: string;
  last_login: string | null;
  institution_id: string | null;
  institution_name: string | null;
  is_platform_staff: boolean;
}

const PAGE_SIZE = 50;

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchUsers(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, filterType, filterStatus]);

  const fetchUsers = async (page: number) => {
    try {
      if (isLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await adminAuthService.getAdminUsers({
        page,
        pageSize: PAGE_SIZE,
        search: searchTerm,
        role: filterType,
        status: filterStatus,
      });

      const usersData = (response as any).results || [];
      const totalCount = (response as any).count || 0;

      setUsers(usersData);
      setTotalUsers(totalCount);
      setError('');
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to load user data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';

    return new Intl.DateTimeFormat('en-GB').format(new Date(dateString));
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getDisplayName = (user: UserRecord) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.username || user.email;
  };

  const getInitials = (user: UserRecord) =>
    getDisplayName(user)
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  const getDaysSince = (dateString: string | null | undefined) => {
    if (!dateString) return null;

    const diff =
      new Date().getTime() - new Date(dateString).getTime();

    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const pageStats = useMemo(() => {
    const suspended = users.filter((user) => !user.is_active).length;
    const pending = users.filter((user) => !user.is_email_verified).length;
    const staff = users.filter((user) => user.is_platform_staff).length;
    const neverLoggedIn = users.filter((user) => !user.last_login).length;
    const institutionless = users.filter(
      (user) =>
        ['student', 'institution_admin', 'supervisor'].includes(user.role) &&
        !user.institution_name,
    ).length;

    return {
      total: totalUsers,
      suspended,
      pending,
      staff,
      neverLoggedIn,
      institutionless,
    };
  }, [totalUsers, users]);

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE) || 1;

  const handleSuspendUser = async (userId: string) => {
    if (
      !window.confirm(
        'Suspend this user? They will lose access until reactivated.',
      )
    ) {
      return;
    }

    try {
      await adminAuthService.suspendUser(
        userId,
        'Administrative suspension',
      );

      await fetchUsers(currentPage);
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to suspend user.');
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await adminAuthService.reactivateUser(
        userId,
        'Administrative reactivation',
      );

      await fetchUsers(currentPage);
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to reactivate user.');
    }
  };

  const applyQuickScope = (scope: string) => {
    setCurrentPage(1);

    switch (scope) {
      case 'suspended':
        setFilterStatus('suspended');
        setFilterType('all');
        break;

      case 'pending':
        setFilterStatus('pending');
        setFilterType('all');
        break;

      case 'students':
        setFilterType('student');
        setFilterStatus('all');
        break;

      case 'institutions':
        setFilterType('institution_admin');
        setFilterStatus('all');
        break;

      case 'employers':
        setFilterType('employer_admin');
        setFilterStatus('all');
        break;

      default:
        setFilterType('all');
        setFilterStatus('all');
        break;
    }
  };

  const getRoleMeta = (role: string) => {
    switch (role) {
      case 'student':
        return {
          label: 'Student',
          className: 'role-blue',
        };
      case 'employer_admin':
        return {
          label: 'Employer Admin',
          className: 'role-green',
        };
      case 'institution_admin':
        return {
          label: 'Institution Admin',
          className: 'role-amber',
        };
      case 'supervisor':
        return {
          label: 'Supervisor',
          className: 'role-indigo',
        };
      default:
        return {
          label: role.replace(/_/g, ' ') || 'User',
          className: 'role-muted',
        };
    }
  };

  const getAccountStatus = (user: UserRecord) => {
    if (!user.is_active) {
      return {
        label: 'Suspended',
        className: 'status-danger',
        icon: <XCircle size={13} />,
      };
    }

    if (!user.is_email_verified) {
      return {
        label: 'Pending verification',
        className: 'status-warning',
        icon: <Clock size={13} />,
      };
    }

    return {
      label: 'Verified',
      className: 'status-success',
      icon: <CheckCircle size={13} />,
    };
  };

  if (isLoading && currentPage === 1) {
    return (
      <AdminLayout>
        <UserManagementSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="identity-page">
        <header className="identity-header">
          <div>
            <span className="identity-kicker">
              <Shield size={14} />
              Identity operations
            </span>

            <h1>Identity & Access Operations</h1>

            <p>
              Monitor account health, verification status, platform access,
              institutional affiliation, and user lifecycle actions.
            </p>
          </div>

          <div className="identity-header-actions">
            <button
              type="button"
              className="identity-btn secondary"
              onClick={() => fetchUsers(currentPage)}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? 'spin-animation' : ''}
              />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>

            <button type="button" className="identity-btn ghost">
              <Download size={16} />
              Export
            </button>
          </div>
        </header>

        {error && (
          <div className="identity-error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>

            <button type="button" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}

        <section className="identity-signal-grid">
          <article className="identity-signal-card">
            <div className="signal-icon neutral">
              <Users size={20} />
            </div>
            <strong>{pageStats.total.toLocaleString()}</strong>
            <span>Total accounts</span>
          </article>

          <article className="identity-signal-card">
            <div className="signal-icon danger">
              <UserX size={20} />
            </div>
            <strong>{pageStats.suspended}</strong>
            <span>Suspended on page</span>
          </article>

          <article className="identity-signal-card">
            <div className="signal-icon warning">
              <Clock size={20} />
            </div>
            <strong>{pageStats.pending}</strong>
            <span>Pending verification</span>
          </article>

          <article className="identity-signal-card">
            <div className="signal-icon indigo">
              <Shield size={20} />
            </div>
            <strong>{pageStats.staff}</strong>
            <span>Platform staff on page</span>
          </article>

          <article className="identity-signal-card">
            <div className="signal-icon muted">
              <Activity size={20} />
            </div>
            <strong>{pageStats.neverLoggedIn}</strong>
            <span>Never logged in</span>
          </article>

          <article className="identity-signal-card">
            <div className="signal-icon amber">
              <Building size={20} />
            </div>
            <strong>{pageStats.institutionless}</strong>
            <span>Missing affiliation</span>
          </article>
        </section>

        <section className="identity-panel">
          <div className="identity-panel-header">
            <div>
              <span className="identity-panel-kicker">
                Account registry
              </span>

              <h2>User records</h2>

              <p>
                Search, filter, inspect, suspend, or reactivate user accounts.
              </p>
            </div>

            <span className="identity-count">
              {totalUsers.toLocaleString()} users found
            </span>
          </div>

          <div className="identity-scopes">
            {[
              { label: 'All', value: 'all' },
              { label: 'Students', value: 'students' },
              { label: 'Institutions', value: 'institutions' },
              { label: 'Employers', value: 'employers' },
              { label: 'Pending', value: 'pending' },
              { label: 'Suspended', value: 'suspended' },
            ].map((scope) => (
              <button
                key={scope.value}
                type="button"
                onClick={() => applyQuickScope(scope.value)}
                className={
                  (scope.value === 'all' &&
                    filterType === 'all' &&
                    filterStatus === 'all') ||
                  (scope.value === 'pending' &&
                    filterStatus === 'pending') ||
                  (scope.value === 'suspended' &&
                    filterStatus === 'suspended') ||
                  (scope.value === 'students' &&
                    filterType === 'student') ||
                  (scope.value === 'institutions' &&
                    filterType === 'institution_admin') ||
                  (scope.value === 'employers' &&
                    filterType === 'employer_admin')
                    ? 'active'
                    : ''
                }
              >
                {scope.label}
              </button>
            ))}
          </div>

          <div className="identity-filter-bar">
            <div className="identity-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search name, email, username, institution..."
                value={searchTerm}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearchTerm(e.target.value);
                }}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => {
                setCurrentPage(1);
                setFilterType(e.target.value);
              }}
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="employer_admin">Employer admins</option>
              <option value="institution_admin">Institution admins</option>
              <option value="supervisor">Supervisors</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setCurrentPage(1);
                setFilterStatus(e.target.value);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="suspended">Suspended only</option>
              <option value="verified">Verified only</option>
              <option value="pending">Pending verification</option>
            </select>

            <button type="button" className="identity-filter-btn">
              <Filter size={16} />
              Filters
            </button>
          </div>

          <div className="identity-table-wrap">
            <table className="identity-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Affiliation</th>
                  <th>Activity</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="identity-loading">
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user) => {
                    const role = getRoleMeta(user.role);
                    const status = getAccountStatus(user);

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="identity-user-cell">
                            <div className="identity-avatar">
                              {getInitials(user)}
                            </div>

                            <div>
                              <strong>{getDisplayName(user)}</strong>
                              <span>{user.email}</span>
                              <small>@{user.username}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`identity-role ${role.className}`}>
                            {role.label}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`identity-status ${status.className}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </td>

                        <td>
                          {user.institution_name ? (
                            <span className="identity-affiliation">
                              <Building size={13} />
                              {user.institution_name}
                            </span>
                          ) : (
                            <span className="identity-muted">
                              Not linked
                            </span>
                          )}
                        </td>

                        <td>
                          {user.last_login ? (
                            <span className="identity-activity good">
                              <Activity size={13} />
                              {formatDate(user.last_login)}
                            </span>
                          ) : (
                            <span className="identity-activity muted">
                              <Clock size={13} />
                              Never
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="identity-date">
                            <Calendar size={13} />
                            {formatDate(user.date_joined)}
                          </span>
                        </td>

                        <td>
                          <div className="identity-row-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                            >
                              <Eye size={14} />
                              View
                            </button>

                            {user.is_active ? (
                              <button
                                type="button"
                                className="danger"
                                onClick={() => handleSuspendUser(user.id)}
                              >
                                <UserX size={14} />
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="success"
                                onClick={() => handleReactivateUser(user.id)}
                              >
                                <UserCheck size={14} />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="identity-empty">
                        No users found matching your criteria.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="identity-pagination">
            <span>
              Showing{' '}
              {totalUsers === 0
                ? 0
                : Math.min((currentPage - 1) * PAGE_SIZE + 1, totalUsers)}{' '}
              to {Math.min(currentPage * PAGE_SIZE, totalUsers)} of{' '}
              {totalUsers.toLocaleString()} users
            </span>

            <div>
              <button
                type="button"
                disabled={currentPage === 1 || isLoading}
                onClick={() =>
                  setCurrentPage((prev) => Math.max(prev - 1, 1))
                }
              >
                <ChevronLeft size={15} />
              </button>

              <strong>
                Page {currentPage} of {totalPages}
              </strong>

              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>

        <section className="identity-policy">
          <Shield size={18} />

          <div>
            <strong>Security guideline</strong>
            <p>
              Account lifecycle actions are audit-sensitive. Suspension,
              reactivation, verification, and access decisions should be tied to
              clear operational reasons.
            </p>
          </div>
        </section>
      </div>

      {showUserModal && selectedUser && (
        <div className="identity-modal-backdrop">
          <div className="identity-modal">
            <header className="identity-modal-header">
              <div>
                <span>Identity record</span>
                <h2>{getDisplayName(selectedUser)}</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowUserModal(false)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="identity-modal-body">
              <aside className="identity-record-summary">
                <div className="identity-record-avatar">
                  {getInitials(selectedUser)}
                </div>

                <h3>{getDisplayName(selectedUser)}</h3>
                <p>{selectedUser.email}</p>

                <div className="identity-record-badges">
                  <span
                    className={`identity-role ${
                      getRoleMeta(selectedUser.role).className
                    }`}
                  >
                    {getRoleMeta(selectedUser.role).label}
                  </span>

                  <span
                    className={`identity-status ${
                      getAccountStatus(selectedUser).className
                    }`}
                  >
                    {getAccountStatus(selectedUser).icon}
                    {getAccountStatus(selectedUser).label}
                  </span>
                </div>
              </aside>

              <section className="identity-record-details">
                <div className="record-block">
                  <h4>
                    <Mail size={14} />
                    Contact
                  </h4>

                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{selectedUser.email}</dd>
                    </div>

                    <div>
                      <dt>Username</dt>
                      <dd>{selectedUser.username || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Activity size={14} />
                    Account activity
                  </h4>

                  <dl>
                    <div>
                      <dt>Last login</dt>
                      <dd>
                        {selectedUser.last_login
                          ? formatDateTime(selectedUser.last_login)
                          : 'Never logged in'}
                      </dd>
                    </div>

                    <div>
                      <dt>Joined</dt>
                      <dd>
                        {formatDate(selectedUser.date_joined)}
                        {getDaysSince(selectedUser.date_joined) !== null && (
                          <span>
                            {getDaysSince(selectedUser.date_joined)} days ago
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Building size={14} />
                    Affiliation
                  </h4>

                  <dl>
                    <div>
                      <dt>Institution / organization</dt>
                      <dd>
                        {selectedUser.institution_name || 'Not linked'}
                      </dd>
                    </div>

                    <div>
                      <dt>Platform staff</dt>
                      <dd>
                        {selectedUser.is_platform_staff ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>

            <footer className="identity-modal-footer">
              <button
                type="button"
                className="identity-btn ghost"
                onClick={() => setShowUserModal(false)}
              >
                Close
              </button>

              {selectedUser.is_active ? (
                <button
                  type="button"
                  className="identity-btn danger"
                  onClick={() => {
                    handleSuspendUser(selectedUser.id);
                    setShowUserModal(false);
                  }}
                >
                  <UserX size={15} />
                  Suspend account
                </button>
              ) : (
                <button
                  type="button"
                  className="identity-btn success"
                  onClick={() => {
                    handleReactivateUser(selectedUser.id);
                    setShowUserModal(false);
                  }}
                >
                  <UserCheck size={15} />
                  Reactivate account
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      <style>{`
        .identity-page {
          color: #111827;
        }

        .identity-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .identity-kicker,
        .identity-panel-kicker {
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

        .identity-kicker svg {
          color: #047857;
        }

        .identity-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .identity-header p {
          max-width: 760px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .identity-header-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .identity-btn {
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

        .identity-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .identity-btn.ghost {
          background: #ffffff;
          border-color: #e5e7eb;
          color: #475569;
        }

        .identity-btn.danger {
          background: #dc2626;
          color: #ffffff;
        }

        .identity-btn.success {
          background: #047857;
          color: #ffffff;
        }

        .identity-error {
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

        .identity-error button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          display: flex;
          cursor: pointer;
        }

        .identity-signal-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .identity-signal-card,
        .identity-panel,
        .identity-policy {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .identity-signal-card {
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

        .signal-icon.neutral {
          color: #334155;
          background: #f1f5f9;
        }

        .signal-icon.danger {
          color: #b91c1c;
          background: #fef2f2;
        }

        .signal-icon.warning {
          color: #b45309;
          background: #fffbeb;
        }

        .signal-icon.indigo {
          color: #4338ca;
          background: #eef2ff;
        }

        .signal-icon.muted {
          color: #64748b;
          background: #f8fafc;
        }

        .signal-icon.amber {
          color: #b45309;
          background: #fffbeb;
        }

        .identity-signal-card strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          letter-spacing: -.05em;
          line-height: 1;
          margin-bottom: 6px;
        }

        .identity-signal-card span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .identity-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .identity-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .identity-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
          letter-spacing: -.02em;
        }

        .identity-panel-header p {
          color: #64748b;
          margin: 0;
          line-height: 1.55;
          font-size: .9rem;
        }

        .identity-count {
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: .78rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .identity-scopes {
          padding: 14px 20px 0;
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }

        .identity-scopes button {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: .82rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .identity-scopes button.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .identity-filter-bar {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 180px 190px auto;
          gap: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .identity-search {
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

        .identity-search input {
          width: 100%;
          border: 0;
          outline: none;
          color: #111827;
          font-weight: 650;
          font-size: .9rem;
        }

        .identity-filter-bar select,
        .identity-filter-btn {
          min-height: 44px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          padding: 0 12px;
          font-weight: 750;
          outline: none;
        }

        .identity-filter-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
        }

        .identity-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .identity-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1080px;
        }

        .identity-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #eef2f7;
          white-space: nowrap;
        }

        .identity-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .identity-user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 260px;
        }

        .identity-avatar,
        .identity-record-avatar {
          border-radius: 14px;
          background: #f1f5f9;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          flex-shrink: 0;
        }

        .identity-avatar {
          width: 42px;
          height: 42px;
          font-size: .78rem;
        }

        .identity-user-cell strong {
          display: block;
          color: #0f172a;
          font-size: .9rem;
          font-weight: 850;
        }

        .identity-user-cell span,
        .identity-user-cell small {
          display: block;
          color: #64748b;
          font-size: .78rem;
          line-height: 1.45;
        }

        .identity-role,
        .identity-status,
        .identity-affiliation,
        .identity-activity,
        .identity-date,
        .identity-muted {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .role-blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .role-green {
          background: #ecfdf5;
          color: #047857;
        }

        .role-amber {
          background: #fffbeb;
          color: #b45309;
        }

        .role-indigo {
          background: #eef2ff;
          color: #4338ca;
        }

        .role-muted {
          background: #f8fafc;
          color: #475569;
        }

        .status-success,
        .identity-activity.good {
          background: #ecfdf5;
          color: #047857;
        }

        .status-warning {
          background: #fffbeb;
          color: #b45309;
        }

        .status-danger {
          background: #fef2f2;
          color: #b91c1c;
        }

        .identity-affiliation {
          background: #f8fafc;
          color: #334155;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .identity-activity.muted,
        .identity-muted,
        .identity-date {
          background: #f8fafc;
          color: #64748b;
        }

        .identity-row-actions {
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }

        .identity-row-actions button {
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
        }

        .identity-row-actions button.danger {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .identity-row-actions button.success {
          color: #047857;
          border-color: #bbf7d0;
        }

        .identity-loading,
        .identity-empty {
          text-align: center;
          padding: 42px;
          color: #64748b;
          font-weight: 700;
        }

        .identity-pagination {
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .identity-pagination span {
          color: #64748b;
          font-size: .82rem;
          font-weight: 650;
        }

        .identity-pagination div {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .identity-pagination button {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid #dbe3ea;
          background: #ffffff;
          color: #334155;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .identity-pagination button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .identity-pagination strong {
          color: #334155;
          font-size: .82rem;
          font-weight: 850;
        }

        .identity-policy {
          margin-top: 18px;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          color: #334155;
        }

        .identity-policy svg {
          color: #047857;
          flex-shrink: 0;
        }

        .identity-policy strong {
          display: block;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .identity-policy p {
          margin: 0;
          color: #64748b;
          line-height: 1.6;
          font-size: .88rem;
        }

        .identity-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.48);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .identity-modal {
          width: min(880px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #ffffff;
          border-radius: 22px;
          box-shadow: 0 24px 80px rgba(15,23,42,.24);
        }

        .identity-modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .identity-modal-header span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .identity-modal-header h2 {
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -.03em;
        }

        .identity-modal-header button {
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
        }

        .identity-modal-body {
          padding: 20px;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
        }

        .identity-record-summary {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          text-align: center;
        }

        .identity-record-avatar {
          width: 74px;
          height: 74px;
          margin: 0 auto 14px;
          font-size: 1.05rem;
        }

        .identity-record-summary h3 {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
          margin: 0 0 4px;
        }

        .identity-record-summary p {
          color: #64748b;
          font-size: .82rem;
          word-break: break-word;
          margin: 0 0 14px;
        }

        .identity-record-badges {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .identity-record-details {
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

        .record-block div {
          display: grid;
          grid-template-columns: 150px 1fr;
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
          word-break: break-word;
        }

        .record-block dd span {
          display: inline-flex;
          margin-left: 8px;
          color: #64748b;
          font-weight: 650;
        }

        .identity-modal-footer {
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
          .identity-signal-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .identity-filter-bar {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 760px) {
          .identity-header {
            flex-direction: column;
          }

          .identity-header-actions {
            width: 100%;
            flex-direction: column;
          }

          .identity-btn {
            width: 100%;
          }

          .identity-signal-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .identity-filter-bar {
            grid-template-columns: 1fr;
          }

          .identity-panel-header,
          .identity-pagination {
            flex-direction: column;
            align-items: flex-start;
          }

          .identity-modal-body {
            grid-template-columns: 1fr;
          }

          .record-block div {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .identity-modal-footer {
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .identity-signal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default UserManagement;