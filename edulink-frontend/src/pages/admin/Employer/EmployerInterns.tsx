import React, { useState, useEffect } from 'react';
import { Search, FileText, UserCheck, AlertCircle, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmployerLayout } from '../../../components/admin/employer';
import TableSkeleton from '../../../components/admin/skeletons/TableSkeleton';
import { employerService } from '../../../services/employer/employerService';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import { toast } from 'react-hot-toast';
import { FeedbackModal } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';

const EmployerInterns: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  // Modal states
  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const apps = await internshipService.getApplications();
      // Filter for ongoing and completed internships
      const interns = apps.filter(app => ['ACTIVE', 'COMPLETED'].includes(app.status));
      setApplications(interns);
    } catch (error) {
      console.error('Failed to fetch interns:', error);
      toast.error('Failed to load interns data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    if (supervisors.length > 0) return;
    try {
      const data = await employerService.getSupervisors();
      setSupervisors(data);
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
    }
  };

  const handleReviewClick = (appId: string) => {
    navigate(`/employer/dashboard/applications/${appId}`);
  };

  const handleAssignClick = async (app: InternshipApplication) => {
    setSelectedApp(app);
    if (app.employer_supervisor_id) {
      setSelectedSupervisor(app.employer_supervisor_id);
    } else {
      setSelectedSupervisor('');
    }
    await fetchSupervisors();
    setShowAssignModal(true);
  };

  const handleAssignSupervisor = async () => {
    if (!selectedApp || !selectedSupervisor) return;
    
    if (selectedApp.employer_supervisor_id && selectedApp.employer_supervisor_id !== selectedSupervisor) {
      showConfirm({
        title: 'Change Mentor',
        message: 'This student already has a mentor assigned. Are you sure you want to change them?',
        onConfirm: executeAssignment
      });
    } else {
      executeAssignment();
    }
  };

  const executeAssignment = async () => {
    if (!selectedApp || !selectedSupervisor) return;
    try {
      setActionLoading(true);
      await internshipService.assignSupervisor(selectedApp.id, selectedSupervisor, 'employer');
      showSuccess('Mentor Assigned', 'The mentor has been assigned successfully.');
      setShowAssignModal(false);
      fetchApplications();
    } catch (error: any) {
      console.error('Failed to assign supervisor:', error);
      showError('Assignment Failed', 'We could not assign the mentor at this time.', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInterns = applications.filter(app => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const baseClasses = "badge rounded-pill px-3 py-2 fw-medium";
    switch (status) {
      case 'ACTIVE': return <span className={`${baseClasses} bg-success bg-opacity-10 text-success-emphasis`}>Active</span>;
      case 'COMPLETED': return <span className={`${baseClasses} bg-dark bg-opacity-10 text-dark-emphasis`}>Completed</span>;
      default: return <span className={`${baseClasses} bg-secondary bg-opacity-10 text-secondary-emphasis`}>{status}</span>;
    }
  };

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">My Interns</h2>
            <p className="text-muted mb-0">Manage ongoing internships and supervisor assignments.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body py-3">
            <div className="row g-3 align-items-center">
              <div className="col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <Search size={16} className="text-muted" />
                  </span>
                  <input type="text" className="form-control border-start-0" placeholder="Search by name or position..." />
                </div>
              </div>
              <div className="col-md-3">
                <select 
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Interns</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Interns Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light border-bottom">
                  <tr>
                    <th className="border-0 ps-4 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Intern</th>
                    <th className="border-0 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Position</th>
                    <th className="border-0 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Start Date</th>
                    <th className="border-0 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Status & Mentor</th>
                    <th className="border-0 py-3 text-end pe-4 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-0 border-0">
                        <TableSkeleton rows={5} columns={5} hasHeader={false} hasActions={true} />
                      </td>
                    </tr>
                  ) : filteredInterns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        <GraduationCap size={32} className="mb-2 opacity-50" />
                        <p className="mb-0">No interns found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInterns.map((app) => (
                      <tr key={app.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '32px', height: '32px'}}>
                              <span className="small fw-bold text-primary">
                                {app.student_info?.name?.charAt(0) || 'I'}
                              </span>
                            </div>
                            <div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="mb-0 fw-semibold text-dark small">{app.student_info?.name || 'Unknown Intern'}</span>
                                <TrustBadge 
                                  level={(app.student_info?.trust_level as TrustLevel) || 0} 
                                  entityType="student" 
                                  size="sm"
                                  showLabel={false}
                                />
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{app.student_info?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark small">{app.title}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{app.department}</div>
                        </td>
                        <td className="small text-muted">{app.start_date ? new Date(app.start_date).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          {getStatusBadge(app.status)}
                          {app.employer_supervisor_id ? (
                            <div className="mt-1 d-flex align-items-center gap-1 text-success small fw-medium" style={{ fontSize: '0.7rem' }}>
                              <UserCheck size={12} />
                              Assigned
                            </div>
                          ) : (
                            app.status === 'ACTIVE' && (
                              <div className="mt-1 d-flex align-items-center gap-1 text-warning small fw-medium" style={{ fontSize: '0.7rem' }}>
                                <AlertCircle size={12} />
                                No Mentor
                              </div>
                            )
                          )}
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-2">
                            <button 
                              className="btn btn-xs btn-outline-primary py-1 px-2 small"
                              onClick={() => handleReviewClick(app.id)}
                              style={{ fontSize: '0.75rem' }}
                            >
                              Details
                            </button>
                            {app.status === 'ACTIVE' && (
                              <button 
                                className={`btn btn-xs ${app.employer_supervisor_id ? 'btn-outline-success' : 'btn-outline-secondary'} py-1 px-2 small`}
                                onClick={() => handleAssignClick(app)}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {app.employer_supervisor_id ? 'Reassign' : 'Assign'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Assign Supervisor Modal */}
        {showAssignModal && selectedApp && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold">Assign Mentor</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAssignModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-4 p-3 bg-light rounded border">
                    <div className="small text-muted mb-1">Assigning Mentor for:</div>
                    <div className="fw-bold text-dark">{selectedApp.student_info?.name}</div>
                    <div className="small text-muted">{selectedApp.title}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted text-uppercase">Select Supervisor</label>
                    <select 
                      className="form-select"
                      value={selectedSupervisor}
                      onChange={(e) => setSelectedSupervisor(e.target.value)}
                    >
                      <option value="">Choose a mentor...</option>
                      {supervisors.map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name} ({sup.email})
                        </option>
                      ))}
                    </select>
                    <div className="form-text small mt-2">
                      <AlertCircle size={12} className="me-1" />
                      Assigned mentors will be notified and can track logbooks.
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light border-0">
                  <button type="button" className="btn btn-link text-decoration-none text-muted" onClick={() => setShowAssignModal(false)}>Cancel</button>
                  <button 
                    type="button" 
                    className="btn btn-primary px-4"
                    onClick={handleAssignSupervisor}
                    disabled={actionLoading || !selectedSupervisor}
                  >
                    {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <FeedbackModal {...feedbackProps} />
    </EmployerLayout>
  );
};

export default EmployerInterns;
