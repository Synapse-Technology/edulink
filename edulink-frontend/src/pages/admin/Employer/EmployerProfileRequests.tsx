import React, { useState, useEffect } from 'react';
import { Check, X, User, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { EmployerLayout } from '../../../components/admin/employer';
import { employerService, type EmployerStaffProfileRequest } from '../../../services/employer/employerService';

const EmployerProfileRequests: React.FC = () => {
  const [requests, setRequests] = useState<EmployerStaffProfileRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
    // For reject, we might want to ask for a reason, but for now simple prompt or default empty reason
    let feedback = '';
    if (action === 'reject') {
      const reason = window.prompt('Please provide a reason for rejection (optional):');
      if (reason === null) return; // Cancelled
      feedback = reason;
    }

    try {
      setProcessingId(requestId);
      await employerService.reviewProfileUpdateRequest(requestId, {
        action,
        admin_feedback: feedback
      });
      
      toast.success(`Request ${action}d successfully`);
      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error: any) {
      console.error(`Failed to ${action} request:`, error);
      toast.error(error.message || `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">Profile Update Requests</h2>
            <p className="text-muted mb-0">Review personal detail changes requested by your staff.</p>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 ps-4 py-3">Staff Member</th>
                    <th className="border-0 py-3">Requested Changes</th>
                    <th className="border-0 py-3">Submitted</th>
                    <th className="border-0 py-3 text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5 text-muted">
                        <User size={32} className="mb-2 opacity-50" />
                        <p className="mb-0">No pending profile update requests.</p>
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                              <span className="fw-bold text-primary">
                                {req.staff.name?.charAt(0) || 'S'}
                              </span>
                            </div>
                            <div>
                              <p className="mb-0 fw-semibold">{req.staff.name}</p>
                              <small className="text-muted">{req.staff.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="small">
                            {Object.entries(req.requested_changes).map(([key, value]) => (
                              <div key={key} className="mb-1">
                                <span className="text-muted text-capitalize">{key.replace('_', ' ')}:</span>
                                <span className="ms-2 fw-medium text-dark">{value}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center text-muted small">
                            <Calendar size={14} className="me-2" />
                            {new Date(req.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              className="btn btn-sm btn-success d-flex align-items-center"
                              onClick={() => handleReview(req.id, 'approve')}
                              disabled={processingId === req.id}
                            >
                              {processingId === req.id ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              ) : (
                                <Check size={16} className="me-1" />
                              )}
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger d-flex align-items-center"
                              onClick={() => handleReview(req.id, 'reject')}
                              disabled={processingId === req.id}
                            >
                              <X size={16} className="me-1" />
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
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerProfileRequests;
