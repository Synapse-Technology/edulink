import React, { useState, useEffect } from 'react';
import { 
  Building, 
  TrendingUp, 
  Clock, 
  BarChart2, 
  ArrowLeft,
  PieChart,
  Calendar,
  Search,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import { adminAuthService, type InstitutionInterestStats } from '../../../services/auth/adminAuthService';
import { CheckCircle, XCircle } from 'lucide-react';

const InstitutionInterestAnalytics: React.FC = () => {
  const [stats, setStats] = useState<InstitutionInterestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [sendingOutreach, setSendingOutreach] = useState<Record<string, boolean>>({});
  const [outreachStatus, setOutreachStatus] = useState<Record<string, 'success' | 'error' | null>>({});

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminAuthService.getInstitutionInterestStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load institution interest statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOutreach = async (interestId: string) => {
    if (sendingOutreach[interestId]) return;

    try {
      setSendingOutreach(prev => ({ ...prev, [interestId]: true }));
      setOutreachStatus(prev => ({ ...prev, [interestId]: null }));
      
      await adminAuthService.sendInstitutionInterestOutreach(interestId);
      
      setOutreachStatus(prev => ({ ...prev, [interestId]: 'success' }));
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setOutreachStatus(prev => ({ ...prev, [interestId]: null }));
      }, 3000);
    } catch (err) {
      console.error('Failed to send outreach:', err);
      setOutreachStatus(prev => ({ ...prev, [interestId]: 'error' }));
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setOutreachStatus(prev => ({ ...prev, [interestId]: null }));
      }, 3000);
    } finally {
      setSendingOutreach(prev => ({ ...prev, [interestId]: false }));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <Link to="/dashboard/admin" className="btn btn-sm btn-outline-secondary me-3">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="h3 fw-bold mb-0">Institution Interest Analytics</h1>
            <p className="text-muted small mb-0">Analysis of student registration requests for new institutions</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={fetchStats}>
          <Clock size={16} className="me-2" />
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="row g-4">
          {/* Summary Cards */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                    <BarChart2 size={24} className="text-primary" />
                  </div>
                  <div>
                    <h6 className="text-muted small mb-0">Total Requests</h6>
                    <h3 className="fw-bold mb-0">{stats?.total_requests}</h3>
                  </div>
                </div>
                <p className="small text-muted mb-0">Individual student requests for institutions not yet on the platform.</p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                    <Building size={24} className="text-success" />
                  </div>
                  <div>
                    <h6 className="text-muted small mb-0">Unique Institutions</h6>
                    <h3 className="fw-bold mb-0">{stats?.top_requested.length}</h3>
                  </div>
                </div>
                <p className="small text-muted mb-0">Unique institution names identified from student inputs.</p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                    <TrendingUp size={24} className="text-info" />
                  </div>
                  <div>
                    <h6 className="text-muted small mb-0">Avg. Requests/Month</h6>
                    <h3 className="fw-bold mb-0">
                      {stats?.requests_over_time.length ? 
                        (stats.total_requests / stats.requests_over_time.length).toFixed(1) : 0
                      }
                    </h3>
                  </div>
                </div>
                <p className="small text-muted mb-0">Average monthly growth of new institution interest.</p>
              </div>
            </div>
          </div>

          {/* Top Requested Table */}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pt-4 px-4">
                <h5 className="card-title mb-0 fw-bold d-flex align-items-center">
                  <PieChart size={20} className="me-2 text-primary" />
                  Most Requested Institutions
                </h5>
              </div>
              <div className="card-body px-0">
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light bg-opacity-50 sticky-top">
                      <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                        <th className="px-4 py-3 border-0 small text-muted text-uppercase">Institution Name</th>
                        <th className="px-4 py-3 border-0 small text-muted text-uppercase text-end">Requests</th>
                        <th className="px-4 py-3 border-0 small text-muted text-uppercase">Potential</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.top_requested && stats.top_requested.length > 0 ? (
                        stats.top_requested.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 border-0 fw-semibold">{item.name}</td>
                            <td className="px-4 border-0 text-end">
                              <span className="badge bg-primary rounded-pill">{item.request_count}</span>
                            </td>
                            <td className="px-4 border-0">
                              <div className="progress" style={{ height: '6px' }}>
                                <div 
                                  className="progress-bar bg-primary" 
                                  style={{ width: `${(item.request_count / stats.total_requests) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-5 text-muted">
                            <Building size={48} className="mb-3 opacity-25" />
                            <p className="mb-0">No institution requests found yet</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Growth Timeline */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pt-4 px-4">
                <h5 className="card-title mb-0 fw-bold d-flex align-items-center">
                  <Calendar size={20} className="me-2 text-success" />
                  Interest Timeline
                </h5>
              </div>
              <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <div className="list-group list-group-flush">
                  {stats?.requests_over_time && stats.requests_over_time.length > 0 ? (
                    stats.requests_over_time.map((item, index) => (
                      <div key={index} className="list-group-item px-0 border-0 d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-light p-2 rounded me-3 small">
                            {new Date(item.month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </div>
                          <span className="fw-medium">Monthly Requests</span>
                        </div>
                        <span className="fw-bold">{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <Calendar size={48} className="mb-3 opacity-25" />
                      <p className="mb-0">No timeline data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Individual Requests */}
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 fw-bold d-flex align-items-center">
                  <Search size={20} className="me-2 text-info" />
                  Recent Individual Requests
                </h5>
              </div>
              <div className="card-body px-0">
                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light bg-opacity-50 sticky-top">
                      <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                        <th className="px-4 py-3 border-0 small text-muted text-uppercase">Requested Name</th>
                        <th className="px-4 py-3 border-0 small text-muted text-uppercase">Email Domain</th>
                        <th className="px-4 py-3 border-0 small text-muted text-uppercase">Date</th>
                        <th className="px-4 py-3 border-0 small text-muted text-uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recent_requests && stats.recent_requests.length > 0 ? (
                        stats.recent_requests.map((req) => (
                          <tr key={req.id}>
                            <td className="px-4 border-0 fw-semibold">{req.name}</td>
                            <td className="px-4 border-0">
                              <code className="bg-light px-2 py-1 rounded text-primary">@{req.email_domain}</code>
                            </td>
                            <td className="px-4 border-0 text-muted small">
                              {new Date(req.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 border-0">
                              {req.user_email ? (
                                <button 
                                  onClick={() => handleSendOutreach(req.id)}
                                  disabled={sendingOutreach[req.id]}
                                  className={`btn btn-sm ${
                                    outreachStatus[req.id] === 'success' ? 'btn-success' : 
                                    outreachStatus[req.id] === 'error' ? 'btn-danger' : 
                                    'btn-outline-primary'
                                  } d-flex align-items-center`}
                                >
                                  {sendingOutreach[req.id] ? (
                                    <>
                                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                      Sending...
                                    </>
                                  ) : outreachStatus[req.id] === 'success' ? (
                                    <>
                                      <CheckCircle size={14} className="me-1" />
                                      Sent Successfully
                                    </>
                                  ) : outreachStatus[req.id] === 'error' ? (
                                    <>
                                      <XCircle size={14} className="me-1" />
                                      Failed to Send
                                    </>
                                  ) : (
                                    <>
                                      <ExternalLink size={14} className="me-1" />
                                      Contact Outreach
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button className="btn btn-sm btn-outline-secondary" disabled>
                                  <ExternalLink size={14} className="me-1" />
                                  No Email Provided
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-5 text-muted">
                            <Search size={48} className="mb-3 opacity-25" />
                            <p className="mb-0">No recent individual requests found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default InstitutionInterestAnalytics;
