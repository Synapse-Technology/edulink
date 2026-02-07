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
import { SEO } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ProfileWizard from '../../components/student/ProfileWizard';
import ProgressRing from '../../components/student/dashboard/ProgressRing';
import StatCard from '../../components/student/dashboard/StatCard';
import ActionStep from '../../components/student/dashboard/ActionStep';
import UpcomingEvent from '../../components/student/dashboard/UpcomingEvent';
import TrustJourneyRoadmap from '../../components/student/dashboard/TrustJourneyRoadmap';
import ProfileNudge from '../../components/student/dashboard/ProfileNudge';
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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
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
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [trustLevel, setTrustLevel] = useState(0);

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
        
        // Calculate dynamic trust level based on profile and applications
        let calculatedLevel = Math.floor(profileData.trust_level || 0);
        const hasCompleted = apps.some((a: any) => a.status === 'COMPLETED');
        const hasCertified = apps.some((a: any) => a.status === 'CERTIFIED');
        
        if (hasCertified) {
          calculatedLevel = Math.max(calculatedLevel, 4);
        } else if (hasCompleted) {
          calculatedLevel = Math.max(calculatedLevel, 3);
        }
        setTrustLevel(calculatedLevel);
        
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

        // Calculate missing items for nudge
        const missing: string[] = [];
        if (!profileData.cv) missing.push('CV / Resume');
        if (!profileData.admission_letter) missing.push('Admission Letter');
        if (!profileData.id_document) missing.push('School ID');
        if (!profileData.skills || profileData.skills.length === 0) missing.push('Skills');
        if (!profileData.course_of_study) missing.push('Academic Info');
        setMissingItems(missing);

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
      <SEO 
        title="Student Dashboard"
        description="Manage your internship applications, track progress, and update your professional profile on EduLink KE."
      />
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
                  <ProgressRing progress={readinessScore} size={80} strokeWidth={8} />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="row g-4 mb-5">
              {quickStats.map((stat, index) => (
            <div key={index} className="col-sm-6 col-lg-3">
              <StatCard {...stat} />
            </div>
          ))}
            </div>

            {/* Main Content Grid */}
            <div className="row g-4">
              {/* Left Column */}
              <div className="col-lg-8">
                {/* Profile Completion Nudge */}
                <ProfileNudge score={readinessScore} missingItems={missingItems} />

                {/* Action Steps */}
                <div className={`card mb-4 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                  <div className="card-body p-4">
                    <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>
                      <CheckCircle className={`me-2 ${isDarkMode ? 'text-info' : 'text-primary'}`} size={20} />
                      Next Steps
                    </h5>
                    {actionSteps.map((step) => (
                      <ActionStep key={step.number} {...step} />
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
                {/* Trust Journey Roadmap */}
                <div className="mb-4">
                  <TrustJourneyRoadmap currentLevel={trustLevel} />
                </div>

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
                        <UpcomingEvent key={index} {...event} />
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
  
