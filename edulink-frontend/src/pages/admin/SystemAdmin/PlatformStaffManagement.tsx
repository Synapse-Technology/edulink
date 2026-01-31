import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Mail, 
  Shield, 
  Clock, 
  XCircle, 
  Users,
  Key,
  AlertCircle,
  UserCheck,
  UserX,
  Eye,
  RefreshCw,
  Crown,
  Settings,
  Activity,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import PlatformStaffManagementSkeleton from '../../../components/admin/skeletons/PlatformStaffManagementSkeleton';

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
  const [error, setError] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<PlatformStaff | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    superAdmins: 0,
    platformAdmins: 0,
    moderators: 0,
    auditors: 0,
    active: 0,
    inactive: 0,
    pendingInvites: 0
  });

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No authentication token');

      const [staffResponse, invitesResponse] = await Promise.all([
        axios.get('/api/admin/staff/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get('/api/admin/staff/invites/', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      setStaff(staffResponse.data);
      setInvites(invitesResponse.data);
      calculateStats(staffResponse.data, invitesResponse.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to load staff data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (staffData: PlatformStaff[], invitesData: StaffInvite[]) => {
    const stats = {
      total: staffData.length,
      superAdmins: staffData.filter(s => s.role === 'SUPER_ADMIN').length,
      platformAdmins: staffData.filter(s => s.role === 'PLATFORM_ADMIN').length,
      moderators: staffData.filter(s => s.role === 'MODERATOR').length,
      auditors: staffData.filter(s => s.role === 'AUDITOR').length,
      active: staffData.filter(s => s.is_active).length,
      inactive: staffData.filter(s => !s.is_active).length,
      pendingInvites: invitesData.filter(i => !i.is_accepted).length
    };
    setStats(stats);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
          <Crown size={12} className="me-1" />
          Super Admin
        </span>;
      case 'PLATFORM_ADMIN':
        return <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
          <Shield size={12} className="me-1" />
          Platform Admin
        </span>;
      case 'MODERATOR':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
          <UserCheck size={12} className="me-1" />
          Moderator
        </span>;
      case 'AUDITOR':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
          <Eye size={12} className="me-1" />
          Auditor
        </span>;
      default:
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
          {role.replace('_', ' ')}
        </span>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Active</span>
      : <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">Inactive</span>;
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && member.is_active) ||
      (filterStatus === 'inactive' && !member.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/staff/invites/${inviteId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStaffData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to cancel invite');
      }
    }
  };

  const handleToggleStatus = async (staffId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`/api/admin/staff/${staffId}/`, {
        is_active: !isActive
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStaffData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to update status');
      }
    }
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
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 fw-bold mb-1">Platform Staff Management</h1>
                <p className="text-muted mb-0">Manage platform administrators and staff permissions</p>
              </div>
              <div className="d-flex">
                <button 
                  className="btn btn-outline-primary me-2"
                  onClick={fetchStaffData}
                >
                  <RefreshCw size={16} className="me-2" />
                  Refresh
                </button>
                <Link to="/admin/dashboard" className="btn btn-outline-secondary">
                  ← Back to Dashboard
                </Link>
              </div>
            </div>

        {/* Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100 overflow-hidden">
              <div className="card-body position-relative">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-3 bg-primary bg-opacity-10 p-2 me-3">
                    <Users size={20} className="text-primary" />
                  </div>
                  <h6 className="card-subtitle text-muted mb-0 fw-semibold small text-uppercase letter-spacing-1">Workforce Overview</h6>
                </div>
                <div className="d-flex align-items-end justify-content-between">
                  <div>
                    <h2 className="display-6 fw-bold mb-0 text-dark">{stats.total}</h2>
                    <p className="text-muted mb-0 small">Total Platform Staff</p>
                  </div>
                  <div className="text-end">
                    <div className="text-success small fw-bold d-flex align-items-center">
                      <Activity size={12} className="me-1" />
                      {stats.active} Active
                    </div>
                    <div className="text-muted small">{stats.inactive} Inactive</div>
                  </div>
                </div>
                <div className="progress mt-3" style={{ height: '4px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    role="progressbar" 
                    style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100 overflow-hidden">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-3 bg-danger bg-opacity-10 p-2 me-3">
                    <Shield size={20} className="text-danger" />
                  </div>
                  <h6 className="card-subtitle text-muted mb-0 fw-semibold small text-uppercase letter-spacing-1">Administrators</h6>
                </div>
                <div className="row g-0">
                  <div className="col-6 border-end pe-3">
                    <h2 className="fw-bold mb-0 text-dark">{stats.superAdmins}</h2>
                    <p className="text-muted mb-0 small">Super Admins</p>
                  </div>
                  <div className="col-6 ps-3">
                    <h2 className="fw-bold mb-0 text-dark">{stats.platformAdmins}</h2>
                    <p className="text-muted mb-0 small">Platform Admins</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100 overflow-hidden">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-3 bg-warning bg-opacity-10 p-2 me-3">
                    <Eye size={20} className="text-warning" />
                  </div>
                  <h6 className="card-subtitle text-muted mb-0 fw-semibold small text-uppercase letter-spacing-1">Specialized Roles</h6>
                </div>
                <div className="row g-0">
                  <div className="col-6 border-end pe-3">
                    <h2 className="fw-bold mb-0 text-dark">{stats.auditors}</h2>
                    <p className="text-muted mb-0 small">Auditors</p>
                  </div>
                  <div className="col-6 ps-3">
                    <h2 className="fw-bold mb-0 text-dark">{stats.moderators}</h2>
                    <p className="text-muted mb-0 small">Moderators</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100 overflow-hidden">
              <div className="card-body bg-light bg-opacity-50">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-3 bg-secondary bg-opacity-10 p-2 me-3">
                    <Mail size={20} className="text-secondary" />
                  </div>
                  <h6 className="card-subtitle text-muted mb-0 fw-semibold small text-uppercase letter-spacing-1">Onboarding</h6>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h2 className="display-6 fw-bold mb-0 text-dark">{stats.pendingInvites}</h2>
                    <p className="text-muted mb-0 small">Pending Invitations</p>
                  </div>
                  <div className="bg-white rounded-circle p-2 shadow-sm">
                    <Clock size={24} className="text-warning animate-pulse" />
                  </div>
                </div>
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
                    <h4 className="card-title mb-1">Staff Management</h4>
                    <p className="text-muted mb-0 small">Manage platform administrators and staff permissions</p>
                  </div>
                  <div className="d-flex">
                    <Link
                      to="/admin/staff/invite"
                      className="btn btn-primary"
                    >
                      <UserPlus size={16} className="me-2" />
                      Invite Staff
                    </Link>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show mt-3" role="alert">
                    <AlertCircle size={18} className="me-2" />
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
                        placeholder="Search by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                    >
                      <option value="all">All Roles</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="PLATFORM_ADMIN">Platform Admin</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="AUDITOR">Auditor</option>
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
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <button className="btn btn-outline-secondary w-100">
                      <Filter size={16} className="me-2" />
                      Filter
                    </button>
                  </div>
                </div>

                {/* Staff Table */}
                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="table table-hover align-middle mb-0">
                    <thead className="sticky-top bg-white" style={{ zIndex: 1 }}>
                      <tr>
                        <th className="ps-4 py-3">Staff Member</th>
                        <th className="py-3">Role</th>
                        <th className="py-3 text-center">Status</th>
                        <th className="py-3">Last Activity</th>
                        <th className="py-3">Permissions</th>
                        <th className="text-end pe-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((member) => (
                        <tr key={member.id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center">
                              <div className="rounded-3 bg-primary bg-opacity-10 p-2 me-3">
                                <Mail size={16} className="text-primary" />
                              </div>
                              <div>
                                <div className="fw-bold text-dark">{member.email}</div>
                                <div className="small text-muted d-flex align-items-center">
                                  <Calendar size={12} className="me-1" />
                                  Joined: {new Date(member.created_at).toLocaleDateString('en-GB')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {getRoleBadge(member.role)}
                          </td>
                          <td className="text-center">
                            {getStatusBadge(member.is_active)}
                          </td>
                          <td>
                            <div className="small">
                              {member.last_login ? (
                                <div>
                                  <div className="text-success fw-semibold d-flex align-items-center">
                                    <Activity size={12} className="me-1" />
                                    {new Date(member.last_login).toLocaleString('en-GB')}
                                  </div>
                                  <div className="text-muted" style={{fontSize: '10px'}}>LAST SYSTEM ACCESS</div>
                                </div>
                              ) : (
                                <div className="text-muted d-flex align-items-center">
                                  <Clock size={12} className="me-1" />
                                  Never logged in
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {member.permissions.slice(0, 2).map((permission, index) => (
                                <span key={index} className="badge bg-light text-dark border fw-normal">
                                  {permission}
                                </span>
                              ))}
                              {member.permissions.length > 2 && (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary border">+{member.permissions.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="text-end pe-4">
                            <div className="dropdown">
                              <button 
                                className="btn btn-light btn-sm btn-icon rounded-circle"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                              >
                                <Settings size={16} className="text-muted" />
                              </button>
                              <div className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                <button 
                                  className="dropdown-item py-2"
                                  onClick={() => {
                                    setSelectedStaff(member);
                                    setShowStaffModal(true);
                                  }}
                                >
                                  <Eye size={14} className="me-2 text-primary" />
                                  View Details
                                </button>
                                <Link to={`/admin/staff/${member.id}/edit`} className="dropdown-item py-2">
                                  <Settings size={14} className="me-2 text-info" />
                                  Edit Profile
                                </Link>
                                <Link to={`/admin/staff/${member.id}/permissions`} className="dropdown-item py-2">
                                  <Key size={14} className="me-2 text-warning" />
                                  Manage Permissions
                                </Link>
                                <div className="dropdown-divider"></div>
                                <button 
                                  className={`dropdown-item py-2 ${member.is_active ? 'text-danger' : 'text-success'}`}
                                  onClick={() => handleToggleStatus(member.id, member.is_active)}
                                >
                                  {member.is_active ? (
                                    <>
                                      <UserX size={14} className="me-2" />
                                      Deactivate Access
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck size={14} className="me-2" />
                                      Activate Access
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pending Invites Section */}
                {invites.length > 0 && (
                  <div className="mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">
                        <Clock size={18} className="me-2 text-warning" />
                        Pending Invitations ({invites.length})
                      </h5>
                    </div>
                    
                    <div className="row g-3">
                      {invites.filter(i => !i.is_accepted).map((invite) => (
                        <div key={invite.id} className="col-md-6 col-lg-4">
                          <div className="card border-warning">
                            <div className="card-body">
                              <div className="d-flex align-items-start mb-3">
                                <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                                  <Mail size={20} className="text-warning" />
                                </div>
                                <div className="flex-grow-1">
                                  <h6 className="card-title mb-1">{invite.email}</h6>
                                  <div className="small text-muted mb-2">
                                    <div className="d-flex align-items-center mb-1">
                                      <Shield size={12} className="me-1" />
                                      Role: {invite.role.replace('_', ' ')}
                                    </div>
                                    <div className="d-flex align-items-center">
                                      <UserPlus size={12} className="me-1" />
                                      Invited by: {invite.invited_by}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="d-flex justify-content-between align-items-center mt-3">
                                <div className="small text-muted">
                                  <div className="d-flex align-items-center">
                                    <Clock size={12} className="me-1" />
                                    Expires: {new Date(invite.expires_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleCancelInvite(invite.id)}
                                  className="btn btn-outline-danger btn-sm"
                                >
                                  <XCircle size={14} className="me-1" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white py-3">
                <div className="d-flex align-items-center">
                  <div className="bg-white bg-opacity-20 p-2 rounded-3 me-3">
                    <Shield size={20} className="text-white" />
                  </div>
                  <h5 className="modal-title fw-bold mb-0">Platform Staff Profile</h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowStaffModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  <div className="col-md-4">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body text-center py-4">
                        <div className="position-relative d-inline-block mb-3">
                          <div className="rounded-circle bg-primary bg-opacity-10 p-4 shadow-sm">
                            <Mail size={48} className="text-primary" />
                          </div>
                          {selectedStaff.is_active && (
                            <span className="position-absolute bottom-0 end-0 bg-success border border-white border-2 rounded-circle p-2" title="Active"></span>
                          )}
                        </div>
                        <h5 className="fw-bold mb-1 text-break">{selectedStaff.email}</h5>
                        <p className="text-muted small mb-3">System Identity</p>
                        <div className="d-flex flex-column gap-2 mt-4">
                          {getRoleBadge(selectedStaff.role)}
                          {getStatusBadge(selectedStaff.is_active)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1 d-flex align-items-center">
                        <Activity size={14} className="me-2 text-primary" />
                        Activity & Access Logs
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Joined Platform</label>
                            <div className="d-flex align-items-center">
                              <Calendar size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{new Date(selectedStaff.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Last System Access</label>
                            <div className="d-flex align-items-center">
                              <Clock size={14} className="me-2 text-muted" />
                              <span className={`fw-semibold ${selectedStaff.last_login ? 'text-success' : 'text-muted'}`}>
                                {selectedStaff.last_login 
                                  ? new Date(selectedStaff.last_login).toLocaleString('en-GB')
                                  : 'Never logged in'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1 d-flex align-items-center">
                        <Key size={14} className="me-2 text-primary" />
                        Assigned Permissions
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="d-flex flex-wrap gap-2">
                          {selectedStaff.permissions.length > 0 ? (
                            selectedStaff.permissions.map((permission, index) => (
                              <span key={index} className="badge bg-light text-primary border border-primary border-opacity-10 fw-medium">
                                {permission}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted small italic">No specific permissions assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-top-0 p-3">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary px-4"
                  onClick={() => setShowStaffModal(false)}
                >
                  Close
                </button>
                <Link 
                  to={`/admin/staff/${selectedStaff.id}/edit`}
                  className="btn btn-primary px-4"
                >
                  <Settings size={16} className="me-2" />
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PlatformStaffManagement;