import React, { useState, useEffect } from 'react';
import { Briefcase, Users, FileText, UserCheck, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { EmployerLayout } from '../../../components/admin/employer';
import { EmployerDashboardSkeleton } from '../../../components/admin/skeletons';
import TrustProgressWidget from '../../../components/dashboard/TrustProgressWidget';
import { SEO } from '../../../components/common';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import { employerService } from '../../../services/employer/employerService';
import type { Employer } from '../../../services/employer/employerService';
import SupervisionPipeline from '../../../components/admin/Employer/SupervisionPipeline';
import TrustTimeline from '../../../components/student/dashboard/TrustTimeline';
import { ledgerService, LedgerEvent } from '../../../services/ledger/ledgerService';

const EmployerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentEmployer, setCurrentEmployer] = useState<Employer | null>(null);
  const [trustStats, setTrustStats] = useState<any>(null);
  const [stats, setStats] = useState({
    activeInternships: 0,
    pendingApplications: 0,
    scheduledInterviews: 0,
    totalSupervisors: 0
  });
  const [recentApplications, setRecentApplications] = useState<InternshipApplication[]>([]);
  const [allApplications, setAllApplications] = useState<InternshipApplication[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // 1. Fetch current employer
      let employer: Employer | null = null;
      try {
          employer = await employerService.getCurrentEmployer();
          setCurrentEmployer(employer);
      } catch (e) {
          console.warn("Could not fetch employer details", e);
      }

      // Fetch Trust Stats
      try {
          const trustData = await employerService.getTrustProgress();
          setTrustStats(trustData);
      } catch (e) {
          console.warn("Failed to fetch trust stats", e);
      }

      // 2. Fetch Applications (Engagements)
      const [applications, ledgerData] = await Promise.all([
        internshipService.getApplications(),
        ledgerService.getEvents({ page_size: 5 })
      ]);
      setAllApplications(applications);
      setLedgerEvents(ledgerData.results);

      // Calculate stats based on Applications
      const active = applications.filter(a => a.status === 'ACTIVE').length;
      const pending = applications.filter(a => a.status === 'APPLIED').length;
      const shortlisted = applications.filter(a => a.status === 'SHORTLISTED').length;
      
      // Supervisors
      let supervisorList: any[] = [];
      try {
        supervisorList = await employerService.getSupervisors();
        setSupervisors(supervisorList);
      } catch (e) {
        console.warn("Failed to fetch supervisors", e);
      }

      setStats({
        activeInternships: active,
        pendingApplications: pending,
        scheduledInterviews: shortlisted,
        totalSupervisors: supervisorList.length
      });

      // Recent Applications (Recruitment only)
      const recent = applications
        .filter(a => !['ACTIVE', 'COMPLETED'].includes(a.status))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5);
      
      setRecentApplications(recent);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSupervisor = async (internId: string, supervisorId: string) => {
    try {
      await internshipService.assignSupervisor(internId, supervisorId, 'EMPLOYER');
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to assign supervisor:', error);
      alert('Failed to assign supervisor. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <EmployerLayout>
        <EmployerDashboardSkeleton />
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <SEO 
        title="Employer Dashboard"
        description="Manage your internship opportunities, review applications, and track intern performance on EduLink KE."
      />
      <div className="container-fluid p-0">
        <div className="row mb-4">
          <div className="col-12">
            <h2 className="fw-bold text-dark">Dashboard</h2>
            <p className="text-muted">
              Welcome back, {user?.firstName}! Here's what's happening with your internships.
            </p>
            
            {/* Unverified Warning (Level 0 only) */}
            {currentEmployer && currentEmployer.trust_level < 1 && (
              <div className="alert alert-warning d-flex align-items-center" role="alert">
                <AlertTriangle size={20} className="me-2" />
                <div>
                  <strong>Account Unverified:</strong> Your employer profile is pending activation. 
                  Please check your email to activate your account.
                </div>
              </div>
            )}

            {/* Level 1 Info (Verified but no internships yet) */}
            {currentEmployer && currentEmployer.trust_level === 1 && (
              <div className="alert alert-info d-flex align-items-center" role="alert">
                <UserCheck size={20} className="me-2" />
                <div>
                  <strong>Welcome Aboard!</strong> Your account is verified (Level 1). 
                  Complete your first successful internship to reach Level 2 (Trusted Employer).
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted small text-uppercase fw-semibold mb-1">Active Internships</p>
                    <h2 className="display-6 fw-bold text-primary mb-0">{stats.activeInternships}</h2>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
                    <Briefcase size={24} />
                  </div>
                </div>
                <div className="mt-3">
                  <Link to="/employer/dashboard/interns" className="text-decoration-none small fw-semibold d-flex align-items-center">
                    View All <ArrowRight size={14} className="ms-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted small text-uppercase fw-semibold mb-1">Pending Applications</p>
                    <h2 className="display-6 fw-bold text-warning mb-0">{stats.pendingApplications}</h2>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded-circle text-warning">
                    <FileText size={24} />
                  </div>
                </div>
                <div className="mt-3">
                  <Link to="/employer/dashboard/applications" className="text-decoration-none small fw-semibold d-flex align-items-center text-warning">
                    Review Now <ArrowRight size={14} className="ms-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted small text-uppercase fw-semibold mb-1">Scheduled Interviews</p>
                    <h2 className="display-6 fw-bold text-info mb-0">{stats.scheduledInterviews}</h2>
                  </div>
                  <div className="bg-info bg-opacity-10 p-3 rounded-circle text-info">
                    <Clock size={24} />
                  </div>
                </div>
                <div className="mt-3">
                  <Link to="/employer/dashboard/applications?status=SHORTLISTED" className="text-decoration-none small fw-semibold d-flex align-items-center text-info">
                    View Schedule <ArrowRight size={14} className="ms-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted small text-uppercase fw-semibold mb-1">Total Supervisors</p>
                    <h2 className="display-6 fw-bold text-success mb-0">{stats.totalSupervisors}</h2>
                  </div>
                  <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success">
                    <Users size={24} />
                  </div>
                </div>
                <div className="mt-3">
                  <Link to="/employer/dashboard/supervisors" className="text-decoration-none small fw-semibold d-flex align-items-center text-success">
                    Manage Team <ArrowRight size={14} className="ms-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            {/* Supervision Pipeline */}
            <SupervisionPipeline 
              interns={allApplications} 
              supervisors={supervisors}
              onAssignSupervisor={handleAssignSupervisor}
            />

            {/* Recent Applications */}
            <div className="card border-0 shadow-sm h-100 mb-4">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Recent Applications</h5>
                <Link to="/employer/dashboard/applications" className="btn btn-sm btn-outline-primary">View All</Link>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="border-0 ps-4">Candidate</th>
                        <th className="border-0">Position</th>
                        <th className="border-0">Date</th>
                        <th className="border-0">Status</th>
                        <th className="border-0">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                  {recentApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No recent applications found.
                      </td>
                    </tr>
                  ) : (
                    recentApplications.map((app) => (
                      <tr key={app.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                              <span className="fw-bold text-primary">
                                {app.student_info?.name?.charAt(0) || 'S'}
                              </span>
                            </div>
                            <div>
                              <p className="mb-0 fw-semibold">{app.student_info?.name || 'Unknown'}</p>
                              <small className="text-muted">{app.student_info?.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{app.title}</td>
                        <td>{app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`badge ${
                            app.status === 'APPLIED' ? 'bg-warning text-dark' :
                            app.status === 'ACTIVE' ? 'bg-success' :
                            app.status === 'REJECTED' ? 'bg-danger' : 'bg-secondary'
                          }`}>
                            {app.status}
                          </span>
                          {app.employer_supervisor_id ? (
                            <div className="mt-1 d-flex align-items-center gap-1 text-success" style={{ fontSize: '0.7rem' }}>
                              <UserCheck size={10} />
                              Assigned
                            </div>
                          ) : (
                            (app.status === 'ACCEPTED' || app.status === 'ACTIVE') && (
                              <div className="mt-1 d-flex align-items-center gap-1 text-warning" style={{ fontSize: '0.7rem' }}>
                                <AlertTriangle size={10} />
                                No Mentor
                              </div>
                            )
                          )}
                        </td>
                        <td>
                          <Link to={`/employer/dashboard/applications/${app.id}`} className="btn btn-sm btn-light text-primary fw-semibold">
                            Review
                          </Link>
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

          {/* Quick Actions */}
          <div className="col-lg-4 mb-4">
            <div className="mb-4">
                <TrustProgressWidget data={trustStats} isLoading={isLoading} userType="employer" />
            </div>

            {/* Trust Timeline */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold">Audit History</h5>
              </div>
              <div className="card-body">
                <TrustTimeline events={ledgerEvents} isDarkMode={false} />
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold">Quick Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-3">
                  <Link to="/employer/dashboard/opportunities" className="btn btn-outline-primary text-start p-3 d-flex align-items-center text-decoration-none">
                    <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h6 className="mb-0 fw-semibold">Post New Internship</h6>
                      <small className="text-muted">Create a new opportunity</small>
                    </div>
                  </Link>
                  
                  <Link to="/employer/dashboard/profile-requests" className="btn btn-outline-success text-start p-3 d-flex align-items-center text-decoration-none">
                    <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-0 fw-semibold">Review Profile Requests</h6>
                      <small className="text-muted">Manage staff access</small>
                    </div>
                  </Link>
                  
                  <Link to="/employer/dashboard/supervisors" className="btn btn-outline-info text-start p-3 d-flex align-items-center text-decoration-none">
                    <div className="bg-info bg-opacity-10 p-2 rounded me-3">
                      <Users size={20} />
                    </div>
                    <div>
                      <h6 className="mb-0 fw-semibold">Invite Supervisor</h6>
                      <small className="text-muted">Add team members</small>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerDashboard;
