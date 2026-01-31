import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Building, 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Clock,
  UserPlus,
  ChevronRight,
  Server,
  Key,
  Eye,
  RefreshCw,
  Briefcase
} from 'lucide-react';
import { adminAuthService, type AdminDashboardStats } from '../../../services/auth/adminAuthService';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import AdminLayout from '../../../components/admin/AdminLayout';
import AdminDashboardSkeleton from '../../../components/admin/skeletons/AdminDashboardSkeleton';

const SystemAdminDashboard: React.FC = () => {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Simulate real-time updates every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    if (!isLoading) setIsRefreshing(true);
    try {
      const response = await adminAuthService.getDashboardStats();
      setStats(response);
      setError('');
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          setError('Session expired. Please log in again.');
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 3000);
        } else {
          setError(err.message || 'Failed to load dashboard data');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getHealthBadgeClass = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success bg-opacity-10 text-success border border-success border-opacity-25';
      case 'warning':
        return 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25';
      case 'error':
        return 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25';
      default:
        return 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={16} className="me-2" />;
      case 'warning':
        return <AlertTriangle size={16} className="me-2" />;
      case 'error':
        return <AlertTriangle size={16} className="me-2" />;
      default:
        return <Activity size={16} className="me-2" />;
    }
  };

  const renderTrendBadge = (trend?: number) => {
    if (trend === undefined) return null;
    const isPositive = trend >= 0;
    const colorClass = isPositive ? 'success' : 'danger';
    return (
      <span className={`badge bg-${colorClass} bg-opacity-10 text-${colorClass}`}>
        {isPositive ? '+' : ''}{trend}%
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

  if (error) {
    return (
      <AdminLayout>
        <div className="alert alert-danger shadow-sm border-0">
          <div className="d-flex align-items-center">
            <AlertTriangle size={24} className="flex-shrink-0 me-3" />
            <div>
              <h5 className="alert-heading mb-1">Dashboard Error</h5>
              <p className="mb-0">{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Dashboard Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Administration Dashboard</h1>
          <p className="text-muted mb-0">Platform management and monitoring</p>
        </div>
        <div className="d-flex">
          <button 
            className="btn btn-outline-primary me-2" 
            onClick={fetchDashboardData}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={`me-2 ${isRefreshing ? 'spin-animation' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className={`badge ${getHealthBadgeClass(stats?.systemHealth?.status || 'healthy')} d-flex align-items-center`}>
            {getHealthIcon(stats?.systemHealth?.status || 'healthy')}
            {stats?.systemHealth?.message || 'System Operational'}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                  <Users size={24} className="text-primary" />
                </div>
                {renderTrendBadge(stats?.totalUsersTrend)}
              </div>
              <h3 className="card-title fw-bold">{stats?.totalUsers?.toLocaleString() || '0'}</h3>
              <p className="card-text text-muted">Total Users</p>
              <div className="progress" style={{height: '4px'}}>
                <div className="progress-bar bg-primary" style={{width: '75%'}}></div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0">
              <Link to="/admin/users" className="text-decoration-none small">
                View Details <ChevronRight size={14} className="ms-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <Building size={24} className="text-success" />
                </div>
                {renderTrendBadge(stats?.totalInstitutionsTrend)}
              </div>
              <h3 className="card-title fw-bold">{stats?.totalInstitutions?.toLocaleString() || '0'}</h3>
              <p className="card-text text-muted">Institutions</p>
              <div className="progress" style={{height: '4px'}}>
                <div className="progress-bar bg-success" style={{width: '45%'}}></div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0">
              <Link to="/admin/institutions" className="text-decoration-none small">
                Manage Institutions <ChevronRight size={14} className="ms-1" />
              </Link>
            </div>
          </div>
        </div>

        {admin?.role === 'SUPER_ADMIN' && (
          <>
            <div className="col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                      <Shield size={24} className="text-warning" />
                    </div>
                    <span className="badge bg-warning bg-opacity-10 text-warning">Active</span>
                  </div>
                  <h3 className="card-title fw-bold">{stats?.totalPlatformStaff?.toLocaleString() || '0'}</h3>
                  <p className="card-text text-muted">Platform Staff</p>
                  <div className="progress" style={{height: '4px'}}>
                    <div className="progress-bar bg-warning" style={{width: '60%'}}></div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0">
                  <Link to="/admin/staff" className="text-decoration-none small">
                    Manage Staff <ChevronRight size={14} className="ms-1" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="rounded-circle bg-info bg-opacity-10 p-3">
                      <UserPlus size={24} className="text-info" />
                    </div>
                    <span className="badge bg-info bg-opacity-10 text-info">Pending</span>
                  </div>
                  <h3 className="card-title fw-bold">{stats?.pendingInvites?.toLocaleString() || '0'}</h3>
                  <p className="card-text text-muted">Pending Invites</p>
                  <div className="progress" style={{height: '4px'}}>
                    <div className="progress-bar bg-info" style={{width: '30%'}}></div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0">
                  <Link to="/admin/staff/invites" className="text-decoration-none small">
                    Review Invites <ChevronRight size={14} className="ms-1" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Management Sections */}
      <div className="row g-4 mb-4">
        {/* Recent System Actions (Audit Trail) */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 d-flex align-items-center fw-bold">
                <Shield size={20} className="me-2 text-primary" />
                Recent System Actions
              </h5>
              <Link to="/admin/logs" className="btn btn-sm btn-light">View All Logs</Link>
            </div>
            <div className="card-body px-0 pt-2">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light bg-opacity-50">
                    <tr>
                      <th className="px-4 border-0 small text-muted text-uppercase">Event</th>
                      <th className="px-4 border-0 small text-muted text-uppercase">Entity</th>
                      <th className="px-4 border-0 small text-muted text-uppercase">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentActions && stats.recentActions.length > 0 ? (
                      stats.recentActions.map((action) => (
                        <tr key={action.id}>
                          <td className="px-4 border-0">
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                                <Activity size={14} className="text-primary" />
                              </div>
                              <div>
                                <div className="fw-semibold small">{action.event_type.replace(/_/g, ' ')}</div>
                                <div className="text-muted" style={{ fontSize: '11px' }}>ID: {action.entity_id.substring(0, 8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 border-0">
                            <span className="badge bg-light text-dark fw-normal border">{action.entity_type}</span>
                          </td>
                          <td className="px-4 border-0">
                            <div className="small text-muted d-flex align-items-center">
                              <Clock size={12} className="me-1" />
                              {new Date(action.timestamp).toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-5 text-muted">
                          No recent actions recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0 pt-4 px-4">
              <h5 className="card-title mb-0 fw-bold">Platform Growth</h5>
            </div>
            <div className="card-body px-4 pt-2">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted small">Onboarding Requests</span>
                  <span className="fw-bold text-warning">{stats?.pendingInstitutions || 0}</span>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div 
                    className="progress-bar bg-warning" 
                    style={{ width: `${Math.min(100, (stats?.pendingInstitutions || 0) > 0 ? ((stats?.pendingInstitutions || 0) / Math.max((stats?.totalInstitutions || 0) + (stats?.pendingInstitutions || 0), 1)) * 100 : 0)}%` }}
                  ></div>
                </div>
                <small className="text-muted" style={{ fontSize: '10px' }}>Formal requests from representatives</small>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted small">Student Interest</span>
                  <span className="fw-bold text-info">{stats?.totalStudentInterests || 0}</span>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div 
                    className="progress-bar bg-info" 
                    style={{ width: `${Math.min(100, (stats?.totalStudentInterests || 0) > 0 ? ((stats?.totalStudentInterests || 0) / Math.max((stats?.totalStudents || 0) + (stats?.totalStudentInterests || 0), 1)) * 100 : 0)}%` }}
                  ></div>
                </div>
                <small className="text-muted" style={{ fontSize: '10px' }}>Students wanting their institution to join</small>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted small">Student Adoption</span>
                  <span className="fw-bold text-primary">{stats?.totalStudents || 0}</span>
                </div>
                <div className="progress" style={{ height: '6px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: `${Math.min(100, ((stats?.totalStudents || 0) / Math.max(stats?.totalUsers || 1, 1)) * 100)}%` }}
                  ></div>
                </div>
                <small className="text-muted" style={{ fontSize: '10px' }}>Registered students on platform</small>
              </div>
              <Link to="/admin/analytics/institutions" className="btn btn-outline-primary btn-sm w-100 mt-2">
                <TrendingUp size={14} className="me-2" />
                Growth Analytics
              </Link>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pt-4 px-4">
              <h5 className="card-title mb-0 fw-bold">System Load</h5>
            </div>
            <div className="card-body px-4 pt-2">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-success bg-opacity-10 p-2 me-2">
                    <Server size={14} className="text-success" />
                  </div>
                  <span className="small">API Latency</span>
                </div>
                <span className="badge bg-success bg-opacity-10 text-success">24ms</span>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-2">
                    <Activity size={14} className="text-primary" />
                  </div>
                  <span className="small">Success Rate</span>
                </div>
                <span className="badge bg-primary bg-opacity-10 text-primary">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="row g-4">
        {/* Quick Actions */}
        <div className="col-lg-8">
          <div className="row g-4">
            {admin?.role === 'SUPER_ADMIN' && (
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pt-3">
                    <h5 className="card-title mb-0 d-flex align-items-center">
                      <Shield size={18} className="me-2 text-primary" />
                      Staff Management
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="list-group list-group-flush">
                      <Link to="/admin/staff/invite" className="list-group-item list-group-item-action d-flex align-items-center border-0 py-3">
                        <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                          <UserPlus size={16} className="text-primary" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">Invite Staff Member</div>
                          <small className="text-muted">Send new staff invitations</small>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                      <Link to="/admin/staff" className="list-group-item list-group-item-action d-flex align-items-center border-0 py-3">
                        <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3">
                          <Key size={16} className="text-success" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">Manage Roles & Permissions</div>
                          <small className="text-muted">Configure access controls</small>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                      <Link to="/admin/staff" className="list-group-item list-group-item-action d-flex align-items-center border-0 py-3">
                        <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                          <Activity size={16} className="text-warning" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">Staff Activity Logs</div>
                          <small className="text-muted">Monitor staff actions</small>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {admin?.role !== 'AUDITOR' && (
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pt-3">
                    <h5 className="card-title mb-0 d-flex align-items-center">
                      <Building size={18} className="me-2 text-success" />
                      Institution Management
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="list-group list-group-flush">
                      <Link to="/admin/institutions" className="list-group-item list-group-item-action d-flex align-items-center border-0 py-3">
                        <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                          <Clock size={16} className="text-warning" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">Pending Requests</div>
                          <small className="text-muted">{stats?.pendingInstitutions || 0} requests awaiting review</small>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                      <Link to="/admin/institutions" className="list-group-item list-group-item-action d-flex align-items-center border-0 py-3">
                        <div className="rounded-circle bg-info bg-opacity-10 p-2 me-3">
                          <TrendingUp size={16} className="text-info" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">Institution Analytics</div>
                          <small className="text-muted">Performance metrics and reports</small>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                      <Link to="/admin/institutions" className="list-group-item list-group-item-action d-flex align-items-center border-0 py-3">
                        <div className="rounded-circle bg-danger bg-opacity-10 p-2 me-3">
                          <AlertTriangle size={16} className="text-danger" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">Verification Queue</div>
                          <small className="text-muted">Review institution verifications</small>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {admin?.role !== 'AUDITOR' && (
            <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0 pt-3">
                    <h5 className="card-title mb-0 d-flex align-items-center">
                      <Briefcase size={18} className="me-2 text-info" />
                      Employer Management
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="list-group list-group-flush">
                      <Link to="/admin/employers/requests" className="list-group-item list-group-item-action d-flex align-items-center border-0 py-3">
                        <div className="rounded-circle bg-info bg-opacity-10 p-2 me-3">
                          <UserPlus size={16} className="text-info" />
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">Employer Requests</div>
                          <small className="text-muted">Review and approve applications</small>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        {admin?.role !== 'MODERATOR' && (
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pt-3">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <Server size={18} className="me-2 text-secondary" />
                  System Status
                </h5>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  <div className="list-group-item border-0 py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">API Status</span>
                      <span className="badge bg-success">Operational</span>
                    </div>
                  </div>
                  <div className="list-group-item border-0 py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Database</span>
                      <span className="badge bg-success">Healthy</span>
                    </div>
                  </div>
                  <div className="list-group-item border-0 py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Cache Service</span>
                      <span className="badge bg-success">Active</span>
                    </div>
                  </div>
                  <div className="list-group-item border-0 py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Storage</span>
                      <span className="badge bg-success">78% Free</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">System Load</span>
                    <span className="fw-semibold">42%</span>
                  </div>
                  <div className="progress" style={{height: '6px'}}>
                    <div className="progress-bar bg-success" style={{width: '42%'}}></div>
                  </div>
                </div>
              </div>
              <div className="card-footer bg-transparent border-0">
                <Link to="/admin/health" className="btn btn-outline-primary btn-sm w-100">
                  <Eye size={14} className="me-2" />
                  View Detailed Metrics
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SystemAdminDashboard;
