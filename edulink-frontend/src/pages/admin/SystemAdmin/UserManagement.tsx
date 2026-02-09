import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserX, 
  UserCheck, 
  Mail, 
  Calendar, 
  AlertTriangle, 
  Shield,
  Eye,
  Download,
  RefreshCw,
  User,
  Building,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Activity, 
  ChevronLeft, 
  ChevronRight,
  Info,
  ExternalLink
} from 'lucide-react';
import { adminAuthService } from '../../../services';
import AdminLayout from '../../../components/admin/AdminLayout';
import UserManagementSkeleton from '../../../components/admin/skeletons/UserManagementSkeleton';

interface User {
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

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB').format(date); // en-GB uses DD/MM/YYYY
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(50);
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    employers: 0,
    institutionAdmins: 0,
    supervisors: 0,
    active: 0,
    suspended: 0,
    verified: 0,
    pending: 0
  });

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, searchTerm, filterType, filterStatus]);

  const fetchUsers = async (page: number) => {
    try {
      setIsLoading(true);
      const response = await adminAuthService.getAdminUsers({ 
        page, 
        pageSize,
        search: searchTerm,
        role: filterType,
        status: filterStatus
      });
      
      // The API now returns a paginated object { results: User[], count: number, next, previous }
      const usersData = (response as any).results || [];
      const totalCount = (response as any).count || 0;
      
      setUsers(usersData);
      setTotalUsers(totalCount);
      
      // Calculate stats (Note: these stats might only be for the current page if using server-side stats, 
      // but usually the summary cards come from a separate dashboard API. 
      // For now, we'll use the total count from the paginated response for the main card)
      calculateStats(usersData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load user data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (usersData: User[]) => {
    const stats = {
      total: totalUsers || usersData.length,
      students: usersData.filter(u => u.role === 'student').length,
      employers: usersData.filter(u => u.role === 'employer_admin').length,
      institutionAdmins: usersData.filter(u => u.role === 'institution_admin').length,
      supervisors: usersData.filter(u => u.role === 'supervisor').length,
      active: usersData.filter(u => u.is_active).length,
      suspended: usersData.filter(u => !u.is_active).length,
      verified: usersData.filter(u => u.is_email_verified).length,
      pending: usersData.filter(u => !u.is_email_verified).length
    };
    setStats(stats);
  };

  const handleSuspendUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to suspend this user? This will prevent them from accessing the platform.')) return;

    try {
      await adminAuthService.suspendUser(userId, 'Administrative suspension');
      fetchUsers(currentPage); // Refresh from server
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to suspend user');
      }
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await adminAuthService.reactivateUser(userId, 'Administrative reactivation');
      fetchUsers(currentPage); // Refresh from server
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to reactivate user');
      }
    }
  };

  const getUserTypeBadge = (role: string, roleDisplay: string) => {
    switch (role) {
      case 'student':
        return <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
          <User size={12} className="me-1" />
          {roleDisplay}
        </span>;
      case 'employer_admin':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
          <Briefcase size={12} className="me-1" />
          {roleDisplay}
        </span>;
      case 'institution_admin':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
          <Building size={12} className="me-1" />
          {roleDisplay}
        </span>;
      case 'supervisor':
        return <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
          <Shield size={12} className="me-1" />
          {roleDisplay}
        </span>;
      default:
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
          {roleDisplay}
        </span>;
    }
  };

  const getStatusBadge = (isActive: boolean, isEmailVerified: boolean) => {
    if (!isActive) return (
      <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
        <XCircle size={12} className="me-1" />
        Suspended
      </span>
    );
    if (isEmailVerified) return (
      <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
        <CheckCircle size={12} className="me-1" />
        Verified
      </span>
    );
    return (
      <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
        <Clock size={12} className="me-1" />
        Pending
      </span>
    );
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
      <div className="container-fluid mt-4">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 fw-bold mb-1">User Management</h1>
                <p className="text-muted mb-0">Manage platform users and their accounts</p>
              </div>
              <div className="d-flex">
                <button 
                  className="btn btn-outline-primary me-2"
                  onClick={() => fetchUsers(currentPage)}
                >
                  <RefreshCw size={16} className="me-2" />
                  Refresh
                </button>
                <button className="btn btn-outline-secondary">
                  <Download size={16} className="me-2" />
                  Export
                </button>
              </div>
            </div>

        {/* Stats Overview */}
        <div className="row g-4 mb-4">
          <div className="col-lg-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 d-inline-block mb-2">
                  <Users size={20} className="text-primary" />
                </div>
                <h4 className="fw-bold mb-1">{stats.total}</h4>
                <p className="text-muted mb-0 small text-nowrap">Total Users</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <div className="rounded-circle bg-info bg-opacity-10 p-3 d-inline-block mb-2">
                  <User size={20} className="text-info" />
                </div>
                <h4 className="fw-bold mb-1">{stats.students}</h4>
                <p className="text-muted mb-0 small">Students</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <div className="rounded-circle bg-success bg-opacity-10 p-3 d-inline-block mb-2">
                  <Briefcase size={20} className="text-success" />
                </div>
                <h4 className="fw-bold mb-1">{stats.employers}</h4>
                <p className="text-muted mb-0 small">Employers</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3 d-inline-block mb-2">
                  <Building size={20} className="text-warning" />
                </div>
                <h4 className="fw-bold mb-1">{stats.institutionAdmins}</h4>
                <p className="text-muted mb-0 small lh-sm">Institution Admins</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <div className="rounded-circle bg-danger bg-opacity-10 p-3 d-inline-block mb-2">
                  <UserX size={20} className="text-danger" />
                </div>
                <h4 className="fw-bold mb-1">{stats.suspended}</h4>
                <p className="text-muted mb-0 small">Suspended</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center p-3">
                <div className="rounded-circle bg-secondary bg-opacity-10 p-3 d-inline-block mb-2">
                  <Clock size={20} className="text-secondary" />
                </div>
                <h4 className="fw-bold mb-1">{stats.pending}</h4>
                <p className="text-muted mb-0 small lh-sm">Pending Verification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="card-title mb-1">User Management</h4>
                    <p className="text-muted mb-0 small">Manage platform users and their accounts</p>
                  </div>
                  <div className="d-flex">
                    <span className="badge bg-primary bg-opacity-10 text-primary">
                      {totalUsers} Users Found
                    </span>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show mt-3" role="alert">
                    <AlertTriangle size={18} className="me-2" />
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                )}
              </div>

              <div className="card-body">
                {/* Search and Filter Bar */}
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, email, institution..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">All User Types</option>
                      <option value="student">Students</option>
                      <option value="employer_admin">Employers</option>
                      <option value="institution_admin">Institution Admins</option>
                      <option value="supervisor">Supervisors</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="suspended">Suspended Only</option>
                      <option value="verified">Verified Only</option>
                      <option value="pending">Pending Verification</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <button className="btn btn-outline-secondary w-100">
                      <Filter size={16} className="me-2" />
                      Filter
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="table table-hover mb-0">
                    <thead className="sticky-top bg-white" style={{ zIndex: 1 }}>
                      <tr>
                        <th>User</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Activity</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-muted mt-2">Loading users...</p>
                          </td>
                        </tr>
                      ) : users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                  <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                                    <User size={16} className="text-primary" />
                                  </div>
                                </div>
                                <div className="flex-grow-1">
                                  <div className="fw-semibold">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <small className="text-muted d-block">
                                    <Mail size={12} className="me-1" />
                                    {user.email}
                                  </small>
                                  {user.institution_name && (
                                    <small className="text-muted d-block">
                                      <Building size={12} className="me-1" />
                                      {user.institution_name}
                                    </small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              {getUserTypeBadge(user.role, user.role_display)}
                            </td>
                            <td>
                              {getStatusBadge(user.is_active, user.is_email_verified)}
                            </td>
                            <td>
                              <div className="small">
                                {user.last_login ? (
                                  <div className="text-success">
                                    <Activity size={12} className="me-1" />
                                    {formatDate(user.last_login)}
                                  </div>
                                ) : (
                                  <div className="text-muted">
                                    <Clock size={12} className="me-1" />
                                    Never logged in
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="small text-muted">
                                <Calendar size={12} className="me-1" />
                                {formatDate(user.date_joined)}
                              </div>
                            </td>
                            <td>
                              <div className="dropdown">
                                <button 
                                  className="btn btn-outline-secondary btn-sm dropdown-toggle"
                                  type="button"
                                  data-bs-toggle="dropdown"
                                >
                                  Actions
                                </button>
                                <div className="dropdown-menu">
                                  <button 
                                    className="dropdown-item"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowUserModal(true);
                                    }}
                                  >
                                    <Eye size={14} className="me-2" />
                                    View Details
                                  </button>
                                  <div className="dropdown-divider"></div>
                                  {user.is_active ? (
                                    <button 
                                      className="dropdown-item text-danger"
                                      onClick={() => handleSuspendUser(user.id)}
                                    >
                                      <UserX size={14} className="me-2" />
                                      Suspend User
                                    </button>
                                  ) : (
                                    <button 
                                      className="dropdown-item text-success"
                                      onClick={() => handleReactivateUser(user.id)}
                                    >
                                      <CheckCircle size={14} className="me-2" />
                                      Reactivate User
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-5">
                            <div className="text-muted">No users found matching your criteria.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center py-3">
                  <div className="text-muted small">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalUsers)} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
                  </div>
                  <nav aria-label="User pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1 || isLoading}
                        >
                          <ChevronLeft size={14} />
                        </button>
                      </li>
                      <li className="page-item disabled">
                        <span className="page-link">Page {currentPage} of {Math.ceil(totalUsers / pageSize) || 1}</span>
                      </li>
                      <li className={`page-item ${currentPage >= Math.ceil(totalUsers / pageSize) ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          disabled={currentPage >= Math.ceil(totalUsers / pageSize) || isLoading}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="alert alert-info bg-info bg-opacity-10 border border-info border-opacity-25 mt-4">
              <div className="d-flex align-items-start">
                <Shield size={20} className="me-3 flex-shrink-0 text-info" />
                <div>
                  <h6 className="alert-heading mb-2">Security Guidelines</h6>
                  <ul className="mb-0 small">
                    <li className="mb-1">All user management actions are logged for audit purposes</li>
                    <li className="mb-1">Suspended users cannot access the platform until reactivated</li>
                    <li className="mb-1">Verification status affects user permissions and access levels</li>
                    <li>Contact platform administrators for complex user issues</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white py-3">
                <div className="d-flex align-items-center">
                  <div className="bg-white bg-opacity-20 p-2 rounded-3 me-3">
                    <Info size={20} className="text-white" />
                  </div>
                  <h5 className="modal-title fw-bold mb-0">User Account Profile</h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowUserModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  {/* Sidebar Info */}
                  <div className="col-md-4">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body text-center py-4">
                        <div className="position-relative d-inline-block mb-3">
                          <div className="rounded-circle bg-primary bg-opacity-10 p-4 shadow-sm">
                            <User size={48} className="text-primary" />
                          </div>
                          {selectedUser.is_active ? (
                            <span className="position-absolute bottom-0 end-0 bg-success border border-white border-2 rounded-circle p-2" title="Active"></span>
                          ) : (
                            <span className="position-absolute bottom-0 end-0 bg-danger border border-white border-2 rounded-circle p-2" title="Suspended"></span>
                          )}
                        </div>
                        <h5 className="fw-bold mb-1">{selectedUser.first_name} {selectedUser.last_name}</h5>
                        <p className="text-muted small mb-3">@{selectedUser.username}</p>
                        
                        <div className="d-flex flex-column gap-2 mt-4">
                          {getUserTypeBadge(selectedUser.role, selectedUser.role_display)}
                          {getStatusBadge(selectedUser.is_active, selectedUser.is_email_verified)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Details */}
                  <div className="col-md-8">
                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                        <Mail size={14} className="me-2" />
                        Contact Details
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Email Address</label>
                            <span className="fw-semibold text-break">{selectedUser.email}</span>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Username</label>
                            <span className="fw-semibold">{selectedUser.username}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                        <Activity size={14} className="me-2" />
                        Account Activity
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Last Login</label>
                            <span className={`fw-semibold ${selectedUser.last_login ? 'text-success' : 'text-muted'}`}>
                              {selectedUser.last_login 
                                ? formatDateTime(selectedUser.last_login)
                                : 'Never logged in'}
                            </span>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Member Since</label>
                            <div className="d-flex align-items-center">
                              <span className="fw-semibold">{formatDate(selectedUser.date_joined)}</span>
                              <span className="badge bg-light text-dark ms-2 fw-normal border">
                                {Math.floor((new Date().getTime() - new Date(selectedUser.date_joined).getTime()) / (1000 * 60 * 60 * 24))} days ago
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedUser.institution_name && (
                      <div>
                        <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                          <Building size={14} className="me-2" />
                          Affiliation
                        </h6>
                        <div className="bg-white rounded-3 border p-3">
                          <div className="d-flex align-items-center">
                            <div className="bg-warning bg-opacity-10 p-2 rounded-2 me-3">
                              <Building size={18} className="text-warning" />
                            </div>
                            <div>
                              <label className="text-muted small d-block">Institution / Employer</label>
                              <span className="fw-bold text-primary">{selectedUser.institution_name}</span>
                            </div>
                            <ExternalLink size={14} className="ms-auto text-muted cursor-pointer" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-top-0 p-3">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary px-4"
                  onClick={() => setShowUserModal(false)}
                >
                  Close
                </button>
                {selectedUser.is_active ? (
                  <button 
                    type="button" 
                    className="btn btn-danger px-4 d-flex align-items-center"
                    onClick={() => {
                      handleSuspendUser(selectedUser.id);
                      setShowUserModal(false);
                    }}
                  >
                    <UserX size={16} className="me-2" />
                    Suspend Account
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-success px-4 d-flex align-items-center"
                    onClick={() => {
                      handleReactivateUser(selectedUser.id);
                      setShowUserModal(false);
                    }}
                  >
                    <UserCheck size={16} className="me-2" />
                    Reactivate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default UserManagement;