import React, { useCallback } from 'react';
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
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { showToast } from '../../utils/toast';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { studentService } from '../../services/student/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import StudentApplicationsSkeleton from '../../components/student/skeletons/StudentApplicationsSkeleton';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';

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
      case 'WITHDRAWN':
        return { color: 'bg-warning', icon: AlertCircle, text: 'Withdrawn' };
      case 'ACTIVE':
        return { color: 'bg-success', icon: Briefcase, text: 'Active' };
      case 'COMPLETED':
        return { color: 'bg-dark', icon: CheckCircle, text: 'Completed' };
      case 'CERTIFIED':
        return { color: 'bg-success', icon: CheckCircle, text: 'Certified' };
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

const OpportunityClosedBadge = () => {
  return (
    <span className="badge bg-warning bg-opacity-10 text-warning d-inline-flex align-items-center gap-1">
      <Clock size={12} />
      Opp. Closed
    </span>
  );
};

const StudentApplications: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  const { handleError: handleApplicationError } = useErrorHandler({
    onNotFound: () => showToast.error('No applications found'),
    onAuthError: () => showToast.error('Please sign in again to view your applications.'),
    onUnexpected: (error) => showToast.error(getUserFacingErrorMessage(error.message) || 'We could not load your applications. Please try again.'),
  });

  // Fetch applications using TanStack Query
  const { data: applicationsResponse, isLoading: loading, isError, error } = useQuery({
    queryKey: ['applications'],
    queryFn: () => studentService.getApplications(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle paginated response - extract array from { results: [...] } if needed
  const applications = Array.isArray(applicationsResponse) 
    ? applicationsResponse 
    : (applicationsResponse as any)?.results || [];

  // Handle query errors
  if (isError && error) {
    handleApplicationError(error);
  }

  // Handle real-time updates via Pusher with fallback polling
  const handleStatusUpdate = useCallback((data: any) => {
    console.log('Real-time application update:', data);
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  }, [queryClient]);

  const fallbackPollApplications = useCallback(async () => {
    try {
      await studentService.getApplications();
      return null; // Handle refresh via TanStack Query
    } catch (error) {
      console.warn('Fallback poll failed:', error);
      return null;
    }
  }, []);

  const { isPolling } = usePusher(
    user ? `user-${user.id}` : undefined,
    'application-status-updated',
    handleStatusUpdate,
    {
      fallbackPoll: fallbackPollApplications,
      fallbackDelay: 10000, // 10 seconds before fallback
      pollingInterval: 3000, // Poll every 3 seconds
    }
  );

  return (
    <StudentLayout>
      <div className="student-workspace">
          <section className="student-command-hero">
            <div className="student-command-copy">
              <span className="student-kicker">Application pipeline</span>
              <h1>Application Tracker</h1>
              <p>Follow each application from submission to placement decision, with every status connected to a clear next action.</p>
              <div className="student-command-meta">
                <span><Briefcase size={15} /> {applications.length} total</span>
                <span><CheckCircle size={15} /> {applications.filter((app: any) => ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)).length} progressing</span>
                <span><Clock size={15} /> {applications.filter((app: any) => ['APPLIED', 'SHORTLISTED'].includes(app.status)).length} under review</span>
              </div>
            </div>
            <div className="student-command-card">
              <span className="student-kicker">Next move</span>
              <strong>{applications.length || 0}</strong>
              <p className="student-command-note mb-3">Track current submissions or browse verified opportunities that match your profile.</p>
              <Link to="/opportunities" className="btn btn-primary btn-sm">Browse Opportunities</Link>
            </div>
          </section>

          <div className="student-page-heading mb-0">
            <div className="d-flex align-items-center gap-3">
            <Link to="/dashboard/student" className={`btn btn-sm ${isDarkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}>
              <ArrowLeft size={16} />
            </Link>
              <div>
                <h1 className="h4">Tracked Applications</h1>
                <p>Compact view of employer, status, and date submitted.</p>
              </div>
            </div>

            {isPolling && (
              <div className={`alert alert-warning mt-3 d-flex align-items-center gap-2 ${isDarkMode ? 'bg-dark border-warning-subtle' : ''}`} role="alert">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Connection latency detected. Updates may be delayed.</span>
              </div>
            )}
          </div>

          {loading ? (
            <StudentApplicationsSkeleton isDarkMode={isDarkMode} />
          ) : isError ? (
            <div className="alert alert-danger">Failed to load applications. Please try again later.</div>
          ) : applications?.length === 0 ? (
            <div className="student-panel text-center p-5">
              <div className="student-panel-body">
                <Briefcase size={48} className="mb-3 text-muted" />
                <h5 className="fw-bold">No Applications Yet</h5>
                <p className="text-muted">Start browsing opportunities to apply!</p>
                <Link to="/opportunities" className="btn btn-primary mt-3 px-4">
                  Browse Opportunities
                </Link>
              </div>
            </div>
          ) : (
            <div className="student-surface">
              <div className="student-surface-body">
              <div className="student-evidence-rail">
              {applications?.map((app: any) => (
                <div key={app.id} className="student-evidence-row">
                  <div className="student-evidence-icon">
                    {app.employer_details?.logo ? (
                      <img
                        src={app.employer_details.logo}
                        alt={app.employer_details?.name || 'Employer'}
                        className="rounded object-fit-cover"
                        style={{ width: '28px', height: '28px' }}
                      />
                    ) : (
                      <Building size={18} />
                    )}
                  </div>
                  <div>
                      <div className="row align-items-center">
                        <div className="col-md-8">
                              <div className="d-flex align-items-start justify-content-between mb-1">
                                <div>
                                  <h5 className="fw-bold mb-1">
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
                          
                          <div className="d-flex flex-wrap gap-3 mt-2">
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
                            <div className="d-flex gap-2 flex-wrap justify-content-md-end">
                              <ApplicationStatusBadge status={app.status} />
                              {(app.status === 'OPEN' || (typeof app.opportunity === 'object' && !app.opportunity?.status) || (typeof app.opportunity === 'object' && app.opportunity?.status === 'CLOSED')) && (
                                <OpportunityClosedBadge />
                              )}
                            </div>
                          </div>
                          
                          <Link to={`/dashboard/student/applications/${app.id}`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
                            View Details <ChevronRight size={16} />
                          </Link>
                        </div>
                      </div>
                  </div>
                </div>
              ))}
              </div>
              </div>
            </div>
          )}
      </div>
    </StudentLayout>
  );
};

export default StudentApplications;
