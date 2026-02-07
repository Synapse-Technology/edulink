import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { Users, FileText, AlertTriangle, LayoutGrid, ChevronRight, Clock, Calendar, User, ArrowUpRight } from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { Incident, InternshipEvidence } from '../../../../services/internship/internshipService';
import { Link } from 'react-router-dom';
import { Badge } from 'react-bootstrap';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorDashboardSkeleton from '../../../../components/admin/skeletons/SupervisorDashboardSkeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePusher } from '../../../../hooks/usePusher';

const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch stats using TanStack Query
  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['supervisor-dashboard-data'],
    queryFn: async () => {
      const [applications, pendingEvidence, incidents] = await Promise.all([
        internshipService.getApplications(),
        internshipService.getPendingEvidence(),
        internshipService.getIncidents()
      ]);
      
      return {
        interns: applications.length,
        pendingLogbooks: pendingEvidence.length,
        openIncidents: incidents.filter((i: Incident) => i.status === 'OPEN').length,
        recentLogbooks: pendingEvidence.slice(0, 5)
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['supervisor-dashboard-data'] });
  }, [queryClient]);

  // Subscribe to real-time updates for the supervisor
  usePusher(
    user ? `user-${user.id}` : undefined,
    'notification-received', // Generic refresh trigger
    handleRealtimeUpdate
  );

  const stats = dashboardData || {
    interns: 0,
    pendingLogbooks: 0,
    openIncidents: 0,
    recentLogbooks: []
  };

  const statCards = [
    { 
      label: 'Assigned Interns', 
      value: stats.interns, 
      icon: Users, 
      color: 'primary', 
      bg: 'bg-primary-subtle',
      trend: '+2 this week',
      link: '/employer/supervisor/internships'
    },
    { 
      label: 'Pending Logbooks', 
      value: stats.pendingLogbooks, 
      icon: FileText, 
      color: 'warning', 
      bg: 'bg-warning-subtle',
      trend: stats.pendingLogbooks > 5 ? 'High priority' : 'On track',
      link: '/employer/supervisor/logbooks'
    },
    { 
      label: 'Open Incidents', 
      value: stats.openIncidents, 
      icon: AlertTriangle, 
      color: 'danger', 
      bg: 'bg-danger-subtle',
      trend: stats.openIncidents > 0 ? 'Needs attention' : 'All clear',
      link: '/employer/supervisor/incidents'
    },
  ];

  if (loading) {
    return <SupervisorDashboardSkeleton />;
  }

  return (
    <SupervisorLayout>
      <div className="container-fluid px-4 px-lg-5 py-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-5">
          <div className="mb-4 mb-lg-0">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                <LayoutGrid size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="h2 fw-bold mb-1">Supervisor Dashboard</h1>
                <p className="text-muted mb-0">
                  Welcome back, <span className="fw-semibold text-dark">{user?.firstName} {user?.lastName}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="d-flex gap-3">
            <div className="d-none d-md-flex align-items-center px-4 py-2 bg-light rounded-3">
              <Calendar size={18} className="text-muted me-2" />
              <span className="text-muted small">{new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="row g-4 mb-5">
          {statCards.map((stat, index) => (
            <div key={index} className="col-12 col-md-6 col-xl-4">
              <div className={`card shadow-sm h-100 border border-${stat.color} transition-all hover-lift`}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div className={`p-2 rounded-3 bg-${stat.color} bg-opacity-10`}>
                          <stat.icon size={20} className={`text-${stat.color}`} />
                        </div>
                        <span className="text-muted small fw-semibold">{stat.label}</span>
                      </div>
                      <h2 className="fw-bold mb-1 display-5">{stat.value}</h2>
                    </div>
                    <Link 
                      to={stat.link}
                      className="btn btn-sm btn-light rounded-circle p-2"
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                  <div className="mt-4 pt-3 border-top">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className={`small fw-medium text-${stat.color}`}>{stat.trend}</span>
                      <Link 
                        to={stat.link}
                        className={`text-decoration-none text-${stat.color} fw-semibold small d-flex align-items-center`}
                      >
                        View details
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4">
          {/* Pending Reviews Table - Left Column (Larger) */}
          <div className="col-12 col-xl-8">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pt-4 pb-3 px-4">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center">
                  <div className="mb-3 mb-sm-0">
                    <h5 className="fw-bold mb-1">Pending Reviews</h5>
                    <p className="text-muted small mb-0">Logbooks and milestones requiring your attention</p>
                  </div>
                  <div className="d-flex gap-2">
                    <Link 
                      to="/employer/supervisor/logbooks" 
                      className="btn btn-outline-primary btn-sm d-flex align-items-center"
                    >
                      View All
                      <ChevronRight size={16} className="ms-1" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="border-0 ps-4 py-3 text-muted small text-uppercase fw-semibold">Document</th>
                        <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Type</th>
                        <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Submitted</th>
                        <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Status</th>
                        <th className="border-0 pe-4 py-3 text-end"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentLogbooks.length > 0 ? (
                        stats.recentLogbooks.map(evidence => (
                          <tr key={evidence.id} className="border-top">
                            <td className="ps-4 py-3">
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 rounded-2 p-2 me-3">
                                  <FileText size={18} className="text-primary" />
                                </div>
                                <div>
                                  <div className="fw-semibold text-dark mb-1">{evidence.title}</div>
                                  <div className="d-flex align-items-center gap-2">
                                    <User size={14} className="text-muted" />
                                    <span className="text-muted small">
                                      {evidence.student_info?.name || 'Unknown Intern'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge 
                                bg="light" 
                                className="text-dark border px-3 py-2 fw-normal rounded-3"
                                style={{ fontSize: '0.75rem' }}
                              >
                                {evidence.evidence_type}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Clock size={14} className="text-muted me-2" />
                                <span className="text-muted">
                                  {new Date(evidence.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge 
                                bg="warning" 
                                className="bg-warning bg-opacity-10 text-warning border border-warning-subtle px-3 py-2 fw-semibold rounded-3 d-flex align-items-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                              >
                                <Clock size={12} />
                                Pending
                              </Badge>
                            </td>
                            <td className="pe-4 text-end py-3">
                              <Link 
                                to={evidence.evidence_type === 'MILESTONE' ? "/employer/supervisor/milestones" : "/employer/supervisor/logbooks"}
                                className="btn btn-primary btn-sm px-3 py-2 rounded-2 fw-semibold"
                              >
                                Review
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-5">
                            <div className="d-flex flex-column align-items-center">
                              <div className="bg-success bg-opacity-10 rounded-circle p-4 mb-3">
                                <FileText size={32} className="text-success" />
                              </div>
                              <h6 className="fw-semibold mb-2">All Caught Up!</h6>
                              <p className="text-muted mb-0">No pending reviews at the moment.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Actions & Insights */}
          <div className="col-12 col-xl-4">
            <div className="d-flex flex-column gap-4">
              
              {/* Quick Actions - Compact */}
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0 pt-4 pb-3 px-4">
                  <h5 className="fw-bold mb-1">Quick Actions</h5>
                </div>
                <div className="card-body p-4 pt-0">
                  <div className="d-grid gap-3">
                    <Link 
                      to="/employer/supervisor/incidents" 
                      className="btn btn-outline-danger d-flex align-items-center justify-content-between p-3 rounded-3 text-start transition-all hover-lift"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <AlertTriangle size={18} />
                        <span className="fw-semibold">Flag Misconduct</span>
                      </div>
                      <ChevronRight size={16} />
                    </Link>
                    
                    <Link 
                      to="/employer/supervisor/logbooks" 
                      className="btn btn-outline-primary d-flex align-items-center justify-content-between p-3 rounded-3 text-start transition-all hover-lift"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <FileText size={18} />
                        <span className="fw-semibold">Review Logbooks</span>
                      </div>
                      <ChevronRight size={16} />
                    </Link>
                    
                    <Link 
                      to="/employer/supervisor/internships" 
                      className="btn btn-outline-secondary d-flex align-items-center justify-content-between p-3 rounded-3 text-start transition-all hover-lift"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <Users size={18} />
                        <span className="fw-semibold">My Interns</span>
                      </div>
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      <style>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important;
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .card {
          border-radius: 12px !important;
        }
        .btn {
          border-radius: 8px !important;
        }
        .table > :not(caption) > * > * {
          padding: 1rem 0.5rem;
        }
      `}</style>
    </SupervisorLayout>
  );
};

export default SupervisorDashboard;