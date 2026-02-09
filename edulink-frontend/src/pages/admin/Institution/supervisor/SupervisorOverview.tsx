import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { Users, FileText, Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { SupervisorDashboardContext } from './SupervisorDashboard';

const SupervisorOverview: React.FC = () => {
  const {
    user,
    profile,
    assignedStudentsCount,
    pendingLogbooksCount,
    hoursLoggedCount,
    recentEvidence,
    incidents
  } = useOutletContext<SupervisorDashboardContext>();
  
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h2 className="fw-bold text-dark mb-1">Welcome back, {user?.firstName}!</h2>
          <p className="text-muted mb-0">Here's what's happening with your assigned students.</p>
        </div>
        <div className="d-none d-md-block">
          <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary-subtle px-3 py-2 rounded-pill">
            <Clock size={14} className="me-2" />
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Badge>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {[
          { label: 'Assigned Students', value: assignedStudentsCount, icon: Users, color: 'primary' },
          { label: 'Pending Logbooks', value: pendingLogbooksCount, icon: FileText, color: 'warning' },
          { label: 'Incidents', value: incidents.length, icon: AlertTriangle, color: 'danger' },
          { label: 'Hours Logged', value: hoursLoggedCount, icon: Clock, color: 'info' },
        ].map((stat, idx) => (
          <Col md={3} key={idx}>
            <Card className="border-0 shadow-sm h-100 overflow-hidden">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className={`bg-${stat.color} bg-opacity-10 p-3 rounded-3`}>
                    <stat.icon className={`text-${stat.color}`} size={24} />
                  </div>
                </div>
                <div>
                  <h3 className="fw-bold mb-1 text-dark">{stat.value}</h3>
                  <p className="text-muted small mb-0 fw-medium uppercase-tracking">{stat.label}</p>
                </div>
              </Card.Body>
              <div className={`bg-${stat.color}`} style={{ height: '4px', opacity: 0.6 }}></div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100 overflow-hidden">
            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">Recent Logbook Submissions</h5>
              {recentEvidence.length > 0 && (
                 <button 
                  className="btn btn-sm btn-link text-decoration-none d-flex align-items-center gap-1 fw-semibold" 
                  onClick={() => navigate('/institution/supervisor-dashboard/logbooks')}
                >
                    View All <ChevronRight size={14} />
                 </button>
              )}
            </Card.Header>
            <Card.Body className="p-0">
               {recentEvidence.length > 0 ? (
                 <div className="table-responsive">
                   <table className="table table-hover mb-0 align-middle">
                     <thead className="bg-light">
                       <tr>
                         <th className="ps-4 py-3 text-muted small text-uppercase fw-semibold border-0">Student / Title</th>
                         <th className="py-3 text-muted small text-uppercase fw-semibold border-0">Date</th>
                         <th className="py-3 text-muted small text-uppercase fw-semibold border-0">Status</th>
                         <th className="py-3 text-muted small text-uppercase fw-semibold border-0">Type</th>
                       </tr>
                     </thead>
                     <tbody>
                       {recentEvidence.slice(0, 5).map(evidence => (
                         <tr key={evidence.id} className="border-bottom">
                           <td className="ps-4 py-3">
                              <div className="fw-bold text-dark">{evidence.student_info?.name || 'Student'}</div>
                              <div className="small text-muted">{evidence.title}</div>
                           </td>
                           <td className="py-3 text-muted small">
                              {new Date(evidence.created_at).toLocaleDateString()}
                           </td>
                           <td className="py-3">
                              <span className="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle px-2 py-1 rounded-pill fw-medium">
                                Pending Review
                              </span>
                           </td>
                           <td className="py-3">
                              <Badge bg="light" text="dark" className="border fw-normal">
                                {evidence.evidence_type}
                              </Badge>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="p-5 text-center text-muted">
                    <div className="bg-light rounded-circle p-4 d-inline-block mb-3">
                      <FileText size={48} className="opacity-25" />
                    </div>
                    <h5>No pending submissions</h5>
                    <p className="small mb-0">When students submit logbooks, they'll appear here.</p>
                 </div>
               )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
           <Card className="border-0 shadow-sm h-100 overflow-hidden">
              <Card.Header className="bg-white py-3 px-4 border-bottom">
                 <h5 className="mb-0 fw-bold">My Profile</h5>
              </Card.Header>
              <Card.Body className="p-4">
                 {profile ? (
                    <div className="d-flex flex-column gap-4">
                       <div className="d-flex align-items-center gap-3 mb-2">
                          <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{width: 56, height: 56, fontSize: '1.4rem'}}>
                            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                          </div>
                          <div>
                            <h6 className="fw-bold mb-0 text-dark">{user?.firstName} {user?.lastName}</h6>
                            <p className="text-muted small mb-0">{user?.email}</p>
                          </div>
                       </div>
                       
                       <hr className="my-0 opacity-10" />

                       <div className="row g-3">
                          <div className="col-12">
                             <label className="text-muted small text-uppercase fw-bold mb-1 d-block">Institution</label>
                             <div className="fw-medium text-dark bg-light p-2 rounded border-start border-primary border-3">{profile.institution_name}</div>
                          </div>
                          <div className="col-12">
                             <label className="text-muted small text-uppercase fw-bold mb-1 d-block">Department</label>
                             <div className="fw-medium text-dark">{profile.department || 'N/A'}</div>
                          </div>
                          <div className="col-6">
                             <label className="text-muted small text-uppercase fw-bold mb-1 d-block">Cohort</label>
                             <div className="fw-medium text-dark">{profile.cohort || 'All Cohorts'}</div>
                          </div>
                          <div className="col-6">
                             <label className="text-muted small text-uppercase fw-bold mb-1 d-block">Role</label>
                             <div>
                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium">
                                   {profile.role || 'Supervisor'}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="text-center text-muted py-5">
                       <Users size={48} className="opacity-25 mb-3" />
                       <p className="mb-0">Profile information unavailable</p>
                    </div>
                 )}
              </Card.Body>
           </Card>
        </Col>
      </Row>
    </>
  );
};

export default SupervisorOverview;
