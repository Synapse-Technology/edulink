import React, { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmployerLayout } from '../../../components/admin/employer';
import TableSkeleton from '../../../components/admin/skeletons/TableSkeleton';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';

const EmployerApplications: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [trustFilter, setTrustFilter] = useState<string>('ALL');

  useEffect(() => {
    // Check for query param filters on mount
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    fetchApplications();
  }, [searchParams]);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const apps = await internshipService.getApplications();
      // Filter out active and completed internships
      const recruitmentApps = apps.filter(app => !['ACTIVE', 'COMPLETED'].includes(app.status));
      setApplications(recruitmentApps);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewClick = (appId: string) => {
    navigate(`/employer/dashboard/applications/${appId}`);
  };

  const filteredApplications = applications.filter(app => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    
    if (trustFilter !== 'ALL') {
      const studentTier = app.student_info?.trust_level ?? 0;
      if (studentTier !== parseInt(trustFilter)) return false;
    }
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    const baseClasses = "badge rounded-pill px-3 py-2 fw-medium";
    switch (status) {
      case 'APPLIED': return <span className={`${baseClasses} bg-warning bg-opacity-10 text-warning-emphasis`}>Pending</span>;
      case 'SHORTLISTED': return <span className={`${baseClasses} bg-info bg-opacity-10 text-info-emphasis`}>Shortlisted</span>;
      case 'ACCEPTED': return <span className={`${baseClasses} bg-primary bg-opacity-10 text-primary-emphasis`}>Accepted</span>;
      case 'REJECTED': return <span className={`${baseClasses} bg-danger bg-opacity-10 text-danger-emphasis`}>Rejected</span>;
      default: return <span className={`${baseClasses} bg-secondary bg-opacity-10 text-secondary-emphasis`}>{status}</span>;
    }
  };

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">Applications</h2>
            <p className="text-muted mb-0">Review and manage student applications.</p>
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
                  <input type="text" className="form-control border-start-0" placeholder="Search applicant or position..." />
                </div>
              </div>
              <div className="col-md-3">
                <select 
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPLIED">Pending</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="ACTIVE">Active</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div className="col-md-4">
                <select 
                  className="form-select form-select-sm"
                  value={trustFilter}
                  onChange={(e) => setTrustFilter(e.target.value)}
                >
                  <option value="ALL">All Trust Tiers</option>
                  <option value="0">Unverified (Tier 0)</option>
                  <option value="1">Basic Verified (Tier 1)</option>
                  <option value="2">Inst. Linked (Tier 2)</option>
                  <option value="3">Internship Ready (Tier 3)</option>
                  <option value="4">Certified Pro (Tier 4)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light border-bottom">
                  <tr>
                    <th className="border-0 ps-4 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Candidate</th>
                    <th className="border-0 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Applied For</th>
                    <th className="border-0 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Applied Date</th>
                    <th className="border-0 py-3 text-uppercase small fw-bold text-muted" style={{ letterSpacing: '0.025em' }}>Recruitment Status</th>
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
                  ) : filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        <FileText size={32} className="mb-2 opacity-50" />
                        <p className="mb-0">No applications found matching your criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr key={app.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '32px', height: '32px'}}>
                              <span className="small fw-bold text-primary">
                                {app.student_info?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="mb-0 fw-semibold text-dark small">{app.student_info?.name || 'Unknown Student'}</span>
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
                        <td className="small text-muted">{app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-2">
                            <button 
                              className="btn btn-xs btn-outline-primary py-1 px-2 small"
                              onClick={() => handleReviewClick(app.id)}
                              style={{ fontSize: '0.75rem' }}
                            >
                              Review
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

export default EmployerApplications;
