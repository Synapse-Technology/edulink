import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  Briefcase, 
  Calendar,
  TrendingUp,
  Users,
  FileText,
  Star,
  ChevronRight,
  User,
  Search,
  Building2
} from 'lucide-react';
import StudentHeader from '../../components/dashboard/StudentHeader';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import { useAuth } from '../../contexts/AuthContext';
import ProfileWizard from '../../components/student/ProfileWizard';
import { studentService } from '../../services/student/studentService';
import type { StudentProfile } from '../../services/student/studentService';
import { internshipService } from '../../services/internship/internshipService';
import type { Internship } from '../../services/internship/internshipService';
import StudentDashboardSkeleton from '../../components/student/skeletons/StudentDashboardSkeleton';

interface EventItem {
  title: string;
  date: string;
  time: string;
  type: 'interview' | 'deadline' | 'meeting';
}

// Progress Ring Component
const ProgressRing: React.FC<{ progress: number; size: number; strokeWidth: number; isDarkMode?: boolean }> = ({ 
  progress, 
  size, 
  strokeWidth,
  isDarkMode = false 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="position-relative d-inline-block">
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="transform-90"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDarkMode ? "#374151" : "#e9ecef"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDarkMode ? "#20c997" : "#0d6efd"}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="position-absolute top-50 start-50 translate-middle text-center">
        <span className={`h6 fw-bold ${isDarkMode ? 'text-info' : 'text-primary'}`} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.3)' } : {}}>{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  isDarkMode?: boolean;
  link?: string;
}> = ({ title, value, icon, description, trend, isDarkMode = false, link }) => {
  const CardContent = () => (
    <div className={`card h-100 hover-shadow transition-all ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
      <div className="card-body d-flex flex-column justify-content-between">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <p className={`small mb-1 ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`}>{title}</p>
            <h4 className={`fw-bold mb-0 ${isDarkMode ? 'text-info' : 'text-primary'}`} style={isDarkMode ? { textShadow: '0 0 10px rgba(32, 201, 151, 0.5)' } : {}}>{value}</h4>
          </div>
          <div className="bg-primary bg-opacity-10 rounded-circle p-3">
            {icon}
          </div>
        </div>
        {description && (
          <p className={`small mb-2 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>{description}</p>
        )}
        {trend && (
          <div className="d-flex align-items-center gap-1">
            <TrendingUp 
              size={14} 
              className={trend.isPositive ? (isDarkMode ? 'text-success' : 'text-success') : (isDarkMode ? 'text-danger' : 'text-danger')} 
            />
            <small className={trend.isPositive ? (isDarkMode ? 'text-success' : 'text-success') : (isDarkMode ? 'text-danger' : 'text-danger')} style={isDarkMode ? { textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' } : {}}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </small>
          </div>
        )}
      </div>
    </div>
  );

  return link ? (
    <Link to={link} className="text-decoration-none text-inherit h-100 d-block">
      <CardContent />
    </Link>
  ) : (
    <CardContent />
  );
};

// Action Step Component
const ActionStep: React.FC<{
  number: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  actionText?: string;
  actionLink?: string;
  isDarkMode?: boolean;
}> = ({ number, title, description, status, actionText, actionLink, isDarkMode = false }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-success bg-opacity-10 border-success',
          numberBg: 'bg-success text-white',
          text: 'text-success'
        };
      case 'current':
        return {
          bg: 'bg-primary bg-opacity-10 border-primary',
          numberBg: 'bg-primary text-white',
          text: 'text-primary'
        };
      default:
        return {
          bg: 'bg-light border-light',
          numberBg: 'bg-secondary text-white',
          text: 'text-muted'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`card mb-3 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${styles.numberBg}`} 
                 style={{ width: '40px', height: '40px' }}>
              {status === 'completed' ? <CheckCircle size={20} /> : number}
            </div>
            <div>
              <h6 className={`fw-semibold mb-1 ${isDarkMode ? 'text-info' : styles.text}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>{title}</h6>
              <p className={`small mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>{description}</p>
            </div>
          </div>
          {actionText && actionLink && status === 'current' && (
            <Link to={actionLink} className="btn btn-primary btn-sm">
              {actionText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// Upcoming Event Component
const UpcomingEvent: React.FC<{
  title: string;
  date: string;
  time: string;
  type: 'interview' | 'deadline' | 'meeting';
  isDarkMode?: boolean;
}> = ({ title, date, time, type, isDarkMode = false }) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'interview':
        return <Users className={isDarkMode ? 'text-info' : 'text-info'} size={16} />;
      case 'deadline':
        return <Clock className={isDarkMode ? 'text-warning' : 'text-warning'} size={16} />;
      default:
        return <Calendar className={isDarkMode ? 'text-info' : 'text-primary'} size={16} />;
    }
  };

  return (
    <div className="d-flex align-items-center gap-3 p-3 border-bottom border-light">
      <div className={`rounded-circle p-2 ${isDarkMode ? 'bg-secondary' : 'bg-light'}`}>
        {getTypeIcon()}
      </div>
      <div className="flex-grow-1">
        <h6 className={`fw-semibold mb-1 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.3)' } : {}}>{title}</h6>
        <p className={`small mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>{date} at {time}</p>
      </div>
      <ChevronRight size={16} className={isDarkMode ? 'text-light opacity-75' : 'text-muted'} />
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  // Initialize theme from localStorage to persist user preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Default to light theme if no preference is saved, or if saved is 'light'
    return savedTheme === 'dark';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeInternship, setActiveInternship] = useState<any | null>(null);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [readinessScore, setReadinessScore] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const profileData = await studentService.getProfile();
        const [apps, active, allInternships, stats] = await Promise.all([
          studentService.getApplications(),
          studentService.getActiveInternship(),
          internshipService.getInternships({ status: 'OPEN' }),
          studentService.getDashboardStats(profileData.id)
        ]);

        setProfile(profileData);
        setStudentId(profileData.id);
        setApplications(apps);
        setActiveInternship(active);
        setDashboardStats(stats);
        
        // Derive upcoming events from applications
        const events: EventItem[] = [];
        apps.forEach((app: any) => {
          if (app.status === 'SHORTLISTED') {
            events.push({
              title: `Interview: ${app.title}`,
              date: 'Pending Schedule',
              time: 'TBA',
              type: 'interview'
            });
          }
        });
        setUpcomingEvents(events);
        
        const openOpportunities = allInternships.filter((i: Internship) => i.status === 'OPEN' && !i.student_has_applied);
        setOpportunitiesCount(openOpportunities.length);

        if (stats && stats.profile && typeof stats.profile.score === 'number') {
          setReadinessScore(stats.profile.score);
        }

        // Check if profile is incomplete
        const isProfileIncomplete = !profileData.course_of_study || 
                                   !profileData.skills || 
                                   profileData.skills.length === 0 || 
                                   !profileData.cv;
                                   
        if (isProfileIncomplete) {
          setShowProfileWizard(true);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED': return 'primary';
      case 'SHORTLISTED': return 'info';
      case 'ACCEPTED': return 'success';
      case 'REJECTED': return 'danger';
      case 'ACTIVE': return 'success';
      default: return 'secondary';
    }
  };

  // Real data stats
  const quickStats = [
    {
      title: 'Applications',
      value: applications.length.toString(),
      icon: <FileText size={24} className="text-primary" />,
      description: `${applications.filter(a => ['APPLIED', 'SHORTLISTED'].includes(a.status)).length} pending review`,
      trend: dashboardStats
        ? {
            value: Math.abs(dashboardStats.applications?.trend_value ?? 0),
            isPositive: dashboardStats.applications?.trend_positive ?? true
          }
        : undefined,
      link: '/dashboard/student/applications'
    },
    {
      title: ['COMPLETED', 'CERTIFIED'].includes(activeInternship?.status) ? 'Completed Internship' : 'Active Internship',
      value: activeInternship ? '1' : '0',
      icon: <Users size={24} className={['COMPLETED', 'CERTIFIED'].includes(activeInternship?.status) ? 'text-primary' : 'text-success'} />,
      description: activeInternship ? (['COMPLETED', 'CERTIFIED'].includes(activeInternship.status) ? 'Certificate available' : 'View details') : 'No active internship',
      trend: dashboardStats
        ? {
            value: Math.abs(dashboardStats.active_internship?.trend_value ?? 0),
            isPositive: dashboardStats.active_internship?.trend_positive ?? true
          }
        : undefined,
      link: '/dashboard/student/internship'
    },
    {
      title: 'Opportunities',
      value: opportunitiesCount.toString(),
      icon: <Briefcase size={24} className="text-info" />,
      description: 'Available now',
      trend: dashboardStats
        ? {
            value: Math.abs(dashboardStats.opportunities?.trend_value ?? 0),
            isPositive: dashboardStats.opportunities?.trend_positive ?? true
          }
        : undefined,
      link: '/opportunities'
    },
    {
      title: 'Profile Score',
      value: `${Math.round(readinessScore)}%`,
      icon: <Star size={24} className="text-warning" />,
      description: 'Complete your profile',
      trend: dashboardStats
        ? {
            value: Math.abs(dashboardStats.profile?.trend_value ?? 0),
            isPositive: dashboardStats.profile?.trend_positive ?? true
          }
        : undefined,
      link: '/dashboard/student/profile'
    }
  ];

  const actionSteps = [
    {
      number: 1,
      title: 'Complete Profile',
      description: 'Upload your CV and Admission Letter',
      status: readinessScore >= 80 ? 'completed' : 'current',
      actionText: 'Update Profile',
      actionLink: '/dashboard/student/profile'
    },
    {
      number: 2,
      title: 'Browse Opportunities',
      description: 'Find internships that match your skills',
      status: readinessScore >= 80 ? (applications.length > 0 ? 'completed' : 'current') : 'pending',
      actionText: 'Browse Now',
      actionLink: '/opportunities'
    },
    {
      number: 3,
      title: 'Track Applications',
      description: 'Monitor status of your applications',
      status: applications.length > 0 ? 'current' : 'pending',
      actionLink: '/dashboard/student/applications'
    }
  ] as const;

  // Replaced with dynamic state derived in useEffect

  const recentApplications = applications.slice(0, 3).map(app => ({
    company: app.employer_details?.name || app.employer_name || 'Unknown Employer',
    position: app.title,
    status: app.status,
    appliedDate: new Date(app.created_at).toLocaleDateString(),
    statusColor: getStatusColor(app.status)
  }));

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={closeMobileMenu}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      {/* Main Content */}
      <div 
        className="d-flex flex-column min-vh-100 overflow-auto main-content-margin"
        onClick={isMobileMenuOpen ? closeMobileMenu : undefined}
      >
        {/* Desktop margin adjustment */}
        <style>{`
          .main-content-margin {
            margin-left: 0;
            max-width: 100vw;
            overflow-x: hidden;
            box-sizing: border-box;
          }
          @media (min-width: 992px) {
            .main-content-margin {
              margin-left: 280px !important;
              max-width: calc(100vw - 280px) !important;
            }
          }
          .card {
            background-color: ${isDarkMode ? '#1e293b' : 'white'} !important;
            border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'} !important;
            transition: all 0.3s ease;
          }
          .card:hover {
            border-color: ${isDarkMode ? '#475569' : '#cbd5e1'} !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'}) !important;
          }
          .text-muted {
            color: ${isDarkMode ? '#94a3b8' : '#6c757d'} !important;
          }
          .bg-light {
            background-color: ${isDarkMode ? '#1e293b' : '#f8f9fa'} !important;
          }
          .border-bottom {
            border-bottom-color: ${isDarkMode ? '#334155' : '#dee2e6'} !important;
          }
          .hover-lift:hover {
            transform: translateY(-4px);
          }
          
          /* Responsive adjustments for ProgressRing */
          @media (min-width: 768px) {
            .position-relative.d-inline-block svg {
              max-width: 80px;
              max-height: 80px;
            }
            .position-relative.d-inline-block .h6 {
              font-size: 1rem;
            }
          }
          /* Ensure proper content containment */
          .container-fluid, .container {
            max-width: 100% !important;
          }
        `}</style>
        <div className="w-100" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          {/* Header */}
          <div className="px-4 px-lg-5 pt-4">
            <StudentHeader
              onMobileMenuClick={toggleMobileMenu}
              isMobileMenuOpen={isMobileMenuOpen}
              isDarkMode={isDarkMode}
              onToggleDarkMode={toggleDarkMode}
            />
          </div>

          {/* Dashboard Content */}
          {loading ? (
            <StudentDashboardSkeleton />
          ) : (
            <div className="flex-grow-1 px-4 px-lg-5 pb-4">
            {/* Welcome Section */}
            <div className="row align-items-center mb-4">
              <div className="col-lg-8">
                <h1 className={`display-6 fw-bold mb-2 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 10px rgba(32, 201, 151, 0.5)' } : {}}>
                  Welcome back, {user ? user.firstName : 'Student'}! 👋
                </h1>
                <p className={`mb-0 ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.3)' } : {}}>
                  Track your verification progress and unlock internship opportunities
                </p>
              </div>
              <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                <div className="d-inline-block text-center">
                  <div className={`text-uppercase fw-semibold small mb-2 ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`}>
                    Profile Readiness
                  </div>
                  <ProgressRing progress={readinessScore} size={80} strokeWidth={8} isDarkMode={isDarkMode} />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="row g-4 mb-5">
              {quickStats.map((stat, index) => (
            <div key={index} className="col-sm-6 col-lg-3">
              <StatCard {...stat} isDarkMode={isDarkMode} />
            </div>
          ))}
            </div>

            {/* Main Content Grid */}
            <div className="row g-4">
              {/* Left Column */}
              <div className="col-lg-8">
                {/* Action Steps */}
                <div className={`card mb-4 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                  <div className="card-body p-4">
                    <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>
                      <CheckCircle className={`me-2 ${isDarkMode ? 'text-info' : 'text-primary'}`} size={20} />
                      Next Steps
                    </h5>
                    {actionSteps.map((step) => (
                      <ActionStep key={step.number} {...step} isDarkMode={isDarkMode} />
                    ))}
                  </div>
                </div>

                {/* Recent Applications */}
                <div className={`card ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h5 className={`fw-bold mb-0 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>Recent Applications</h5>
                      <Link to="/dashboard/student/applications" className={`btn btn-sm ${isDarkMode ? 'btn-outline-info' : 'btn-outline-primary'}`}>
                        View All
                      </Link>
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className={`table table-hover align-middle ${isDarkMode ? 'table-dark' : ''} mb-0`}>
                        <thead className={`${isDarkMode ? 'table-dark' : ''} sticky-top bg-white`} style={{ zIndex: 1 }}>
                          <tr>
                            <th className={isDarkMode ? 'text-info border-secondary bg-dark' : 'bg-white'}>Company</th>
                            <th className={isDarkMode ? 'text-info border-secondary bg-dark' : 'bg-white'}>Position</th>
                            <th className={isDarkMode ? 'text-info border-secondary bg-dark' : 'bg-white'}>Status</th>
                            <th className={isDarkMode ? 'text-info border-secondary bg-dark' : 'bg-white'}>Applied</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentApplications.map((app, index) => (
                            <tr key={index} className={isDarkMode ? 'border-secondary' : ''}>
                              <td className={`fw-semibold ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>{app.company}</td>
                              <td className={isDarkMode ? 'text-info opacity-75' : ''} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.2)' } : {}}>{app.position}</td>
                              <td>
                                <span className={`badge ${isDarkMode ? 'bg-info' : `bg-${app.statusColor}`}`}>
                                  {app.status}
                                </span>
                              </td>
                              <td className={`small ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`} style={isDarkMode ? { textShadow: '0 0 4px rgba(32, 201, 151, 0.2)' } : {}}>{app.appliedDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-lg-4">
                {/* Upcoming Events */}
                <div className={`card mb-4 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h5 className={`fw-bold mb-0 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>
                        <Calendar className={`me-2 ${isDarkMode ? 'text-info' : 'text-primary'}`} size={20} />
                        Upcoming Events
                      </h5>
                      {/* No calendar page yet, redirect to applications where status is visible */}
                      <Link to="/dashboard/student/applications" className={`btn btn-sm ${isDarkMode ? 'btn-link text-info' : 'btn-link'}`}>
                        View All
                      </Link>
                    </div>
                    <div>
                      {upcomingEvents.map((event: EventItem, index: number) => (
                        <UpcomingEvent key={index} {...event} isDarkMode={isDarkMode} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className={`card ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                  <div className="card-body p-4">
                    <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>Quick Actions</h5>
                    <div className="d-grid gap-2">
                      <Link to="/opportunities" className={`btn ${isDarkMode ? 'btn-info' : 'btn-primary'}`}>
                        <Search className="me-2" size={16} />
                        Browse Internships
                      </Link>
                      <Link to="/dashboard/student/profile" className={`btn ${isDarkMode ? 'btn-outline-info' : 'btn-outline-primary'}`}>
                        <FileText className="me-2" size={16} />
                        Update Documents
                      </Link>
                      <Link to="/dashboard/student/affiliation" className={`btn ${isDarkMode ? 'btn-outline-info' : 'btn-outline-primary'}`}>
                        <Building2 className="me-2" size={16} />
                        Claim Affiliation
                      </Link>
                      <Link to="/dashboard/student/profile" className={`btn ${isDarkMode ? 'btn-outline-info' : 'btn-outline-secondary'}`}>
                        <User className="me-2" size={16} />
                        Edit Profile
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
        <ProfileWizard 
          show={showProfileWizard} 
          onHide={() => setShowProfileWizard(false)}
          studentId={studentId}
          initialData={profile ? {
            course_of_study: profile.course_of_study,
            current_year: profile.current_year,
            registration_number: profile.registration_number,
            skills: profile.skills,
            cv: profile.cv,
            admission_letter: profile.admission_letter,
            id_document: profile.id_document
          } : undefined}
          onComplete={() => {
            setShowProfileWizard(false);
            window.location.reload();
          }}
        />
        <style>{`
      .transform-90 {
        transform: rotate(-90deg);
      }
      .hover-shadow:hover {
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
      }
      .transition-all {
        transition: all 0.3s ease;
      }
      
      /* Custom scrollbar for main content */
      .overflow-auto::-webkit-scrollbar {
        width: 6px;
      }
      .overflow-auto::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
      }
      .overflow-auto::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      .overflow-auto::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }
      
      /* Dark mode scrollbar */
      .bg-dark .overflow-auto::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
      }
      .bg-dark .overflow-auto::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }
      .bg-dark .overflow-auto::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `}</style>
      </div>
    </div>
  );
};

export default StudentDashboard;
  
