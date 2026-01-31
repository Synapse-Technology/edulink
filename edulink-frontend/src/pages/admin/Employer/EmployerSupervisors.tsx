import React, { useState, useEffect } from 'react';
import { Plus, Mail, Trash2, Shield, Users } from 'lucide-react';
import { EmployerLayout } from '../../../components/admin/employer';
import { useAuth } from '../../../contexts/AuthContext';
// import TableSkeleton from '../../../components/admin/skeletons/TableSkeleton';
import { employerService } from '../../../services/employer/employerService';
import type { Supervisor } from '../../../services/employer/employerService';

const EmployerSupervisors: React.FC = () => {
  const { user } = useAuth();
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'SUPERVISOR'
  });

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

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsInviting(true);
      await employerService.inviteSupervisor({
        email: inviteData.email,
        role: inviteData.role
      });
      // Show success message or toast
      alert('Supervisor invited successfully');
      setShowInviteModal(false);
      setInviteData({ email: '', role: 'SUPERVISOR' });
      // Refresh the list
      fetchSupervisors();
    } catch (error) {
      console.error('Failed to invite supervisor:', error);
      alert('Failed to invite supervisor');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveSupervisor = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this supervisor? They will no longer have access.')) {
      return;
    }
    try {
      await employerService.removeSupervisor(id);
      fetchSupervisors();
    } catch (error) {
      console.error('Failed to remove supervisor:', error);
      alert('Failed to remove supervisor');
    }
  };

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">Supervisors</h2>
            <p className="text-muted mb-0">Manage your team members and their access.</p>
          </div>
          <button 
            className="btn btn-primary d-flex align-items-center"
            onClick={() => setShowInviteModal(true)}
          >
            <Plus size={20} className="me-2" />
            Invite Supervisor
          </button>
        </div>

        {/* Supervisors List */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 ps-4 py-3">Supervisor</th>
                    <th className="border-0 py-3">Role</th>
                    <th className="border-0 py-3">Contact</th>
                    <th className="border-0 py-3">Status</th>
                    <th className="border-0 py-3 text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : supervisors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        <Users size={32} className="mb-2 opacity-50" />
                        <p className="mb-0">No supervisors found. Invite your team members.</p>
                      </td>
                    </tr>
                  ) : (
                    supervisors.map((sup) => (
                      <tr key={sup.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center">
                            <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                              <span className="fw-bold text-success">
                                {sup.name?.charAt(0) || sup.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="mb-0 fw-semibold">{sup.name || 'Pending Activation'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="d-flex align-items-center text-muted">
                            <Shield size={14} className="me-1" />
                            {sup.role === 'ADMIN' ? 'Admin' : 'Supervisor'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-column small">
                            <span className="d-flex align-items-center mb-1">
                              <Mail size={14} className="me-2 text-muted" />
                              {sup.email}
                            </span>
                          </div>
                        </td>
                        <td><span className={`badge ${sup.is_active ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary'}`}>{sup.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="text-end pe-4">
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveSupervisor(sup.id)}
                            disabled={user?.email === sup.email}
                            title={user?.email === sup.email ? "You cannot remove your own account" : "Remove Supervisor"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Invite New Supervisor</h5>
                <button type="button" className="btn-close" onClick={() => setShowInviteModal(false)}></button>
              </div>
              <form onSubmit={handleInviteSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      required 
                      value={inviteData.email}
                      onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select 
                      className="form-select"
                      value={inviteData.role}
                      onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                    >
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <div className="form-text">
                      Admins have full access to manage the company profile and other supervisors.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowInviteModal(false)} disabled={isInviting}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  );
};

export default EmployerSupervisors;
