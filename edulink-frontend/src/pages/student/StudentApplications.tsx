import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Building
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePusher } from '../../hooks/usePusher';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { studentService } from '../../services/student/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import StudentApplicationsSkeleton from '../../components/student/skeletons/StudentApplicationsSkeleton';

const ApplicationStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return { color: 'bg-primary', icon: Clock, text: 'Applied' };
      case 'SHORTLISTED':
        return { color: 'bg-info', icon: CheckCircle, text: 'Shortlisted' };
      case 'ACCEPTED':
        return { color: 'bg-success', icon: CheckCircle, text: 'Accepted' };
      case 'REJECTED':
        return { color: 'bg-danger', icon: XCircle, text: 'Rejected' };
      case 'ACTIVE':
        return { color: 'bg-success', icon: Briefcase, text: 'Active' };
      default:
        return { color: 'bg-secondary', icon: AlertCircle, text: status };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`badge ${config.color} d-inline-flex align-items-center gap-1`}>
      <Icon size={12} />
      {config.text}
    </span>
  );
};

const StudentApplications: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Fetch applications using TanStack Query
  const { data: applications, isLoading: loading, isError } = useQuery({
    queryKey: ['applications'],
    queryFn: () => studentService.getApplications(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle real-time updates via Pusher
  const handleStatusUpdate = useCallback((data: any) => {
    console.log('Real-time application update:', data);
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  }, [queryClient]);

  usePusher(
    user ? `user-${user.id}` : undefined,
    'application-status-updated',
    handleStatusUpdate
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Sidebar & Mobile Menu (Reused from Dashboard pattern) */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      <div 
        className="d-flex flex-column min-vh-100 overflow-auto main-content-margin"
        onClick={isMobileMenuOpen ? () => setIsMobileMenuOpen(false) : undefined}
      >
        <style>{`
          .main-content-margin {
            margin-left: 0;
            max-width: 100vw;
          }
          @media (min-width: 992px) {
            .main-content-margin {
              margin-left: 280px !important;
              max-width: calc(100vw - 280px) !important;
            }
          }
        `}</style>
        
        <div className="px-3 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        <div className="flex-grow-1 px-3 px-lg-5 py-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link to="/dashboard/student" className={`btn btn-sm ${isDarkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}>
              <ArrowLeft size={16} />
            </Link>
            <h1 className={`h3 fw-bold mb-0 ${isDarkMode ? 'text-info' : ''}`}>My Applications</h1>
          </div>

          {loading ? (
            <StudentApplicationsSkeleton isDarkMode={isDarkMode} />
          ) : isError ? (
            <div className="alert alert-danger">Failed to load applications. Please try again later.</div>
          ) : applications?.length === 0 ? (
            <div className="card text-center p-5">
              <div className="card-body">
                <Briefcase size={48} className="mb-3 text-muted" />
                <h5 className="fw-bold">No Applications Yet</h5>
                <p className="text-muted">Start browsing opportunities to apply!</p>
                <Link to="/opportunities" className="btn btn-primary mt-3 px-4">
                  Browse Opportunities
                </Link>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {applications?.map((app) => (
                <div key={app.id} className="col-12">
                  <div className="card border-0 shadow-sm rounded-4">
                    <div className="card-body p-4">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <div className="d-flex align-items-start">
                            <div className="me-3">
                              {app.employer_details?.logo ? (
                                <img 
                                  src={app.employer_details.logo} 
                                  alt={app.employer_details?.name || 'Employer'} 
                                  className="rounded-circle object-fit-cover border"
                                  style={{ width: '48px', height: '48px' }}
                                />
                              ) : (
                                <div className={`rounded-circle d-flex align-items-center justify-content-center border ${isDarkMode ? 'bg-dark border-secondary' : 'bg-light'}`} style={{ width: '48px', height: '48px' }}>
                                  <Building size={24} className={isDarkMode ? 'text-secondary' : 'text-muted'} />
                                </div>
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-start justify-content-between mb-1">
                                <div>
                                  <h5 className={`fw-bold mb-1 ${isDarkMode ? 'text-info' : 'text-primary'}`}>
                                    {app.title}
                                  </h5>
                                  <p className={`mb-1 small ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                                    {app.employer_details?.name || 'Unknown Employer'}
                                  </p>
                                </div>
                                <div className="d-md-none">
                                  <ApplicationStatusBadge status={app.status} />
                                </div>
                              </div>
                              
                              <p className={`mb-2 small ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                                {app.department || 'General Department'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="d-flex flex-wrap gap-3 mt-2 ms-5 ps-2">
                            <div className={`d-flex align-items-center gap-1 small ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                              <MapPin size={14} />
                              <span>{app.location || 'Remote'} ({app.location_type})</span>
                            </div>
                            <div className={`d-flex align-items-center gap-1 small ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                              <Calendar size={14} />
                              <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-md-4 text-md-end mt-3 mt-md-0 d-flex flex-column align-items-md-end justify-content-center gap-3">
                          <div className="d-none d-md-block">
                            <ApplicationStatusBadge status={app.status} />
                          </div>
                          
                          <Link to={`/dashboard/student/applications/${app.id}`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
                            View Details <ChevronRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentApplications;
