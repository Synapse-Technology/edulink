import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock,
  AlertCircle,
  Briefcase, 
  Calendar,
  FileText,
  User,
  Search,
  Building2,
  ShieldCheck,
  ArrowRight,
  Upload,
  BookOpen,
  MapPin,
  Award
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { SEO } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import ProfileWizard from '../../components/student/ProfileWizard';
import ProgressRing from '../../components/student/dashboard/ProgressRing';
import { studentService } from '../../services/student/studentService';
import { ledgerService } from '../../services/ledger/ledgerService';
import type { LedgerEvent } from '../../services/ledger/ledgerService';
import type { Affiliation, StudentProfile } from '../../services/student/studentService';
import { internshipService } from '../../services/internship/internshipService';
import type { Internship } from '../../services/internship/internshipService';
import StudentDashboardSkeleton from '../../components/student/skeletons/StudentDashboardSkeleton';
import '../../styles/student-portal.css';

interface EventItem {
  title: string;
  date: string;
  time: string;
  type: 'interview' | 'deadline' | 'meeting';
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeInternship, setActiveInternship] = useState<any | null>(null);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [readinessScore, setReadinessScore] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [trustLevel, setTrustLevel] = useState(0);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);  // Prevent infinite login loop

  useEffect(() => {
    if (hasLoggedOut) return;  // Don't re-fetch after logout
    
    // Track if component is still mounted to prevent state updates after unmount
    let isMounted = true;
    const controller = new AbortController();
    
    const fetchDashboardData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        
        const profileData = await studentService.getProfile();
        
        // Check if component is still mounted before continuing
        if (!isMounted) return;
        
        const [apps, active, allInternships, stats, ledgerData, affiliationData] = await Promise.all([
          studentService.getApplications(),
          studentService.getActiveInternship(),
          internshipService.getInternships({ status: 'OPEN' }),
          studentService.getDashboardStats(profileData.id),
          ledgerService.getEvents({ page_size: 5 }),
          studentService.getAffiliations(profileData.id).catch(() => [])
        ]);

        // Check if component is still mounted before setting state
        if (!isMounted) return;
        
        // Handle paginated responses - extract array from { results: [...] } if needed
        const appsList = Array.isArray(apps) ? apps : (apps as any).results || [];
        
        setProfile(profileData);
        setStudentId(profileData.id);
        setApplications(appsList);
        setActiveInternship(active);
        setLedgerEvents(ledgerData.results);
        setAffiliations(affiliationData);
        
        // Calculate dynamic trust level based on profile and applications
        let calculatedLevel = Math.floor(profileData.trust_level || 0);
        const hasCompleted = appsList.some((a: any) => a.status === 'COMPLETED');
        const hasCertified = appsList.some((a: any) => a.status === 'CERTIFIED');
        
        if (hasCertified) {
          calculatedLevel = Math.max(calculatedLevel, 4);
        } else if (hasCompleted) {
          calculatedLevel = Math.max(calculatedLevel, 3);
        }
        setTrustLevel(calculatedLevel);
        
        // Derive upcoming events from applications
        const events: EventItem[] = [];
        appsList.forEach((app: any) => {
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
        
        // Handle paginated internships response
        const internshipsList = Array.isArray(allInternships) ? allInternships : (allInternships as any).results || [];
        const openOpportunities = internshipsList.filter((i: Internship) => i.status === 'OPEN' && !i.student_has_applied);
        setOpportunitiesCount(openOpportunities.length);

        if (stats && stats.profile && typeof stats.profile.score === 'number') {
          setReadinessScore(stats.profile.score);
        }

        // Calculate missing items for nudge
        const missing: string[] = [];
        const currentAffiliation = affiliationData.find((a: Affiliation) =>
          ['approved', 'verified', 'pending'].includes(a.status)
        );
        if (!profileData.cv) missing.push('CV / Resume');
        if (!profileData.admission_letter) missing.push('Admission Letter');
        if (!profileData.id_document) missing.push('School ID');
        if (!profileData.skills || profileData.skills.length === 0) missing.push('Skills');
        if (!profileData.course_of_study) missing.push('Academic Info');
        if (!profileData.is_verified && !currentAffiliation) missing.push('Institution Verification');
        setMissingItems(missing);

        // Check if profile is incomplete
        const isProfileIncomplete = !profileData.course_of_study || 
                                   !profileData.skills || 
                                   profileData.skills.length === 0 || 
                                   !profileData.cv ||
                                   !profileData.admission_letter ||
                                   !profileData.id_document ||
                                   (!profileData.is_verified && !currentAffiliation);
                                   
        if (isProfileIncomplete) {
          setShowProfileWizard(true);
        }
      } catch (error) {
        // Don't process errors if component unmounted
        if (!isMounted) return;
        
        const is401 = (error as any)?.status === 401 || 
                     (error as any)?.response?.status === 401 ||
                     (error as any)?.message?.includes('Unauthorized') ||
                     (error as any)?.message?.includes('Session expired');
        
        if (is401) {
          // Session expired - set flag first to prevent re-fetch, then logout
          setHasLoggedOut(true);
          await logout();
          showToast.error('Session expired. Please log in again.');
          navigate('/login', { replace: true });
        } else {
          // Use error mapper to convert technical errors to user-friendly messages
          const message = getErrorMessage(error, { action: 'Load Dashboard Data' });
          // Always show user-friendly message, never technical details
          showToast.error(message || 'Failed to load dashboard. Please refresh the page.');
        }
        logError(error, { action: 'Load Dashboard Data' });
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (user && !hasLoggedOut) {
      fetchDashboardData();
    }

    // Cleanup function: mark as unmounted and abort requests
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user, hasLoggedOut, logout, navigate]);

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

  const recentApplications = applications.slice(0, 3).map(app => ({
    company: app.employer_details?.name || app.employer_name || 'Unknown Employer',
    position: app.title,
    status: app.status,
    appliedDate: new Date(app.created_at).toLocaleDateString(),
    statusColor: getStatusColor(app.status)
  }));

  const currentAffiliation = affiliations.find((a) =>
    ['approved', 'verified', 'pending'].includes(a.status)
  );
  const isAffiliationVerified = profile?.is_verified || currentAffiliation?.status === 'approved' || currentAffiliation?.status === 'verified';
  const isAffiliationPending = currentAffiliation?.status === 'pending';
  const hasCoreProfile = !!profile?.course_of_study && !!profile?.current_year && !!profile?.registration_number;
  const hasSkills = !!profile?.skills && profile.skills.length > 0;
  const hasDocuments = !!profile?.cv && !!profile?.admission_letter && !!profile?.id_document;
  const isReadyToApply = hasCoreProfile && hasSkills && hasDocuments && !!isAffiliationVerified;

  const onboardingSteps = [
    {
      title: 'Academic profile',
      description: hasCoreProfile ? 'Course, year, and registration number are complete.' : 'Add your course, current year, and registration number.',
      complete: hasCoreProfile,
      action: 'Complete profile',
      href: '/dashboard/student/profile'
    },
    {
      title: 'Skills profile',
      description: hasSkills ? `${profile?.skills.length} skills listed for matching.` : 'Add at least one skill employers can search for.',
      complete: hasSkills,
      action: 'Add skills',
      href: '/dashboard/student/profile'
    },
    {
      title: 'Institution verification',
      description: isAffiliationVerified
        ? 'Your student status is verified.'
        : isAffiliationPending
          ? 'Your institution claim is pending review.'
          : 'Claim your institution so employers can trust your student status.',
      complete: !!isAffiliationVerified,
      pending: isAffiliationPending,
      action: isAffiliationPending ? 'View status' : 'Verify institution',
      href: '/dashboard/student/affiliation'
    },
    {
      title: 'Required documents',
      description: hasDocuments ? 'CV, admission letter, and school ID are uploaded.' : 'Upload your CV, admission letter, and school ID.',
      complete: hasDocuments,
      action: 'Upload documents',
      href: '/dashboard/student/profile'
    }
  ];

  const activeStart = activeInternship?.start_date ? new Date(activeInternship.start_date) : null;
  const activeEnd = activeInternship?.end_date ? new Date(activeInternship.end_date) : null;
  const activeTotalDays = activeStart && activeEnd
    ? Math.max(1, Math.ceil((activeEnd.getTime() - activeStart.getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const activeElapsedDays = activeStart
    ? Math.max(0, Math.ceil((Date.now() - activeStart.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const activeProgress = activeInternship ? Math.min(100, Math.max(0, Math.round((activeElapsedDays / activeTotalDays) * 100))) : 0;
  const activeDaysLeft = activeEnd ? Math.max(0, Math.ceil((activeEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const pendingApplications = applications.filter(a => ['APPLIED', 'SHORTLISTED'].includes(a.status)).length;
  const primarySetupStep = onboardingSteps.find((step) => !step.complete);

  const dashboardMetrics = [
    {
      label: 'Applications',
      value: applications.length,
      detail: `${pendingApplications} pending review`,
      icon: FileText,
      href: '/dashboard/student/applications'
    },
    {
      label: 'Placement',
      value: activeInternship ? 'Active' : 'None',
      detail: activeInternship ? activeInternship.title : 'No active internship',
      icon: Briefcase,
      href: '/dashboard/student/internship'
    },
    {
      label: 'Open roles',
      value: opportunitiesCount,
      detail: 'Matched opportunities',
      icon: Search,
      href: '/opportunities'
    },
    {
      label: 'Trust level',
      value: trustLevel,
      detail: isAffiliationVerified ? 'Institution verified' : 'Verification needed',
      icon: ShieldCheck,
      href: '/dashboard/student/affiliation'
    }
  ];

  const nextActions = [
    {
      title: primarySetupStep ? primarySetupStep.title : 'Browse verified internships',
      description: primarySetupStep ? primarySetupStep.description : 'Your profile is ready for trusted opportunities.',
      href: primarySetupStep ? primarySetupStep.href : '/opportunities',
      icon: primarySetupStep ? Upload : Search,
      cta: primarySetupStep ? primarySetupStep.action : 'Browse roles',
      priority: 'Primary'
    },
    {
      title: activeInternship ? 'Update today’s logbook' : 'Track applications',
      description: activeInternship ? 'Keep daily evidence current for supervisor review.' : 'Monitor your application status and next employer steps.',
      href: activeInternship ? '/dashboard/student/logbook' : '/dashboard/student/applications',
      icon: activeInternship ? BookOpen : FileText,
      cta: activeInternship ? 'Open logbook' : 'View applications',
      priority: 'Workflow'
    },
    {
      title: 'Build your evidence trail',
      description: 'Keep documents and verified records ready for institutions and employers.',
      href: '/dashboard/student/artifacts',
      icon: Award,
      cta: 'View artifacts',
      priority: 'Trust'
    }
  ];

  return (
    <StudentLayout>
      <SEO 
        title="Student Dashboard"
        description="Manage your internship applications, track progress, and update your professional profile on EduLink KE."
      />
      {/* Dashboard Content */}
      {loading ? (
        <StudentDashboardSkeleton />
      ) : (
        <div className="edulink-dashboard">
          <section className="edulink-hero">
            <div className="edulink-hero-main">
              <div className="student-header-label">EduLink student workspace</div>
              <h1>Welcome back, {user ? user.firstName : 'Student'}.</h1>
              <p>
                Move from verified profile to trusted placement with a clear view of what needs action today.
              </p>
              <div className="edulink-hero-actions">
                <Link
                  to={activeInternship ? '/dashboard/student/logbook' : (primarySetupStep?.href || '/opportunities')}
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                >
                  {activeInternship ? <BookOpen size={16} /> : <ShieldCheck size={16} />}
                  {activeInternship ? 'Open today’s logbook' : primarySetupStep ? primarySetupStep.action : 'Browse verified roles'}
                </Link>
                <Link to="/opportunities" className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
                  <Search size={16} />
                  Explore opportunities
                </Link>
              </div>
            </div>

            <div className="edulink-readiness-card">
              <div>
                <div className="student-header-label">Readiness passport</div>
                <h2>{Math.round(readinessScore)}%</h2>
                <p className="student-muted mb-0">
                  {isReadyToApply ? 'Profile verified and ready for trusted applications.' : `${missingItems.length} item${missingItems.length === 1 ? '' : 's'} still need attention.`}
                </p>
              </div>
              <ProgressRing progress={readinessScore} size={92} strokeWidth={9} />
            </div>
          </section>

          <section className="edulink-metrics" aria-label="Student dashboard metrics">
            {dashboardMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Link to={metric.href} className="edulink-metric" key={metric.label}>
                  <Icon size={20} />
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.detail}</small>
                </Link>
              );
            })}
          </section>

          <section className="edulink-readiness-flow">
            <div className="edulink-section-copy">
              <span className="student-header-label">Student onboarding</span>
              <h2>{isReadyToApply ? 'You are application-ready' : 'Complete the checks that build employer trust'}</h2>
              <p>EduLink’s student journey is built around verification first, then matching, placement, logbooks, and evidence.</p>
            </div>
            <div className="edulink-check-grid">
              {onboardingSteps.map((step) => {
                const Icon = step.complete ? CheckCircle : step.pending ? Clock : AlertCircle;
                return (
                  <Link to={step.href} className={`edulink-check ${step.complete ? 'complete' : step.pending ? 'pending' : ''}`} key={step.title}>
                    <Icon size={20} />
                    <div>
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="edulink-dashboard-flow">
            <main>
              <section className="edulink-placement-panel">
                <div className="edulink-section-header">
                  <div>
                    <span className="student-header-label">Current placement</span>
                    <h2>{activeInternship ? activeInternship.title : 'No active internship yet'}</h2>
                  </div>
                  <Link to="/dashboard/student/internship" className="btn btn-sm btn-outline-primary">
                    View details
                  </Link>
                </div>

                {activeInternship ? (
                  <>
                    <div className="edulink-placement-meta">
                      <span><Building2 size={15} /> {activeInternship.employer_name || activeInternship.employer_details?.name || 'Employer pending'}</span>
                      <span><MapPin size={15} /> {activeInternship.location || 'Location pending'}</span>
                      <span><Calendar size={15} /> Ends {activeEnd ? activeEnd.toLocaleDateString() : 'TBA'}</span>
                    </div>
                    <div className="edulink-progress-row">
                      <div>
                        <span className="student-header-label">Placement progress</span>
                        <strong>{activeProgress}%</strong>
                      </div>
                      <div className="edulink-progress-track">
                        <span style={{ width: `${activeProgress}%` }} />
                      </div>
                      <small>{activeDaysLeft !== null ? `${activeDaysLeft} days left` : 'Timeline pending'}</small>
                    </div>
                    <div className="edulink-placement-actions">
                      <Link to="/dashboard/student/logbook" className="btn btn-primary">
                        Update logbook
                      </Link>
                      <Link to="/dashboard/student/artifacts" className="btn btn-outline-primary">
                        View evidence
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="edulink-empty-workspace">
                    <Briefcase size={28} />
                    <p>Once you accept a verified opportunity, this area becomes your daily placement workspace.</p>
                    <Link to="/opportunities" className="btn btn-primary btn-sm">Find opportunities</Link>
                  </div>
                )}
              </section>

              <section className="edulink-action-board">
                <div className="edulink-section-header">
                  <div>
                    <span className="student-header-label">Next best actions</span>
                    <h2>What to do next</h2>
                  </div>
                </div>
                <div className="edulink-action-grid">
                  {nextActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link to={action.href} className="edulink-action-card" key={action.title}>
                        <span>{action.priority}</span>
                        <Icon size={22} />
                        <strong>{action.title}</strong>
                        <p>{action.description}</p>
                        <small>{action.cta} <ArrowRight size={13} /></small>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="edulink-table-panel">
                <div className="edulink-section-header">
                  <div>
                    <span className="student-header-label">Applications</span>
                    <h2>Recent activity</h2>
                  </div>
                  <Link to="/dashboard/student/applications" className="btn btn-sm btn-outline-primary">View all</Link>
                </div>
                {recentApplications.length > 0 ? (
                  <div className="table-responsive">
                    <table className="student-dashboard-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Position</th>
                          <th>Status</th>
                          <th>Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app, index) => (
                          <tr key={index}>
                            <td className="fw-semibold">{app.company}</td>
                            <td>{app.position}</td>
                            <td><span className={`badge bg-${app.statusColor}`}>{app.status}</span></td>
                            <td className="student-muted small">{app.appliedDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="edulink-empty-workspace compact">
                    <FileText size={24} />
                    <p>No applications yet. Start with verified roles that match your profile.</p>
                  </div>
                )}
              </section>
            </main>

            <aside>
              <section className="edulink-side-panel">
                <span className="student-header-label">Trust journey</span>
                <h2>Level {trustLevel}</h2>
                <div className="edulink-trust-steps">
                  {['Documents', 'Institution', 'Internship', 'Certificate'].map((label, index) => {
                    const complete = trustLevel >= index + 1;
                    return (
                      <div className={complete ? 'complete' : ''} key={label}>
                        <span>{complete ? <CheckCircle size={14} /> : index + 1}</span>
                        <strong>{label}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="edulink-side-panel">
                <div className="edulink-section-header compact">
                  <h2>Upcoming</h2>
                  <Calendar size={18} />
                </div>
                {upcomingEvents.length > 0 ? (
                  <div className="edulink-event-list">
                    {upcomingEvents.map((event, index) => (
                      <div key={index}>
                        <strong>{event.title}</strong>
                        <span>{event.date} at {event.time}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="student-muted small mb-0">No interviews or deadlines scheduled yet.</p>
                )}
              </section>

              <section className="edulink-side-panel">
                <div className="edulink-section-header compact">
                  <h2>Trust history</h2>
                  <ShieldCheck size={18} />
                </div>
                {ledgerEvents.length > 0 ? (
                  <div className="edulink-event-list">
                    {ledgerEvents.slice(0, 4).map((event) => (
                      <div key={event.id}>
                        <strong>{event.event_type.split('_').join(' ').toLowerCase()}</strong>
                        <span>{new Date(event.occurred_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="student-muted small mb-0">No trust events recorded yet.</p>
                )}
              </section>

              <section className="edulink-side-actions">
                <Link to="/opportunities"><Search size={16} /> Browse internships</Link>
                <Link to="/dashboard/student/profile"><User size={16} /> Edit profile</Link>
                <Link to="/dashboard/student/affiliation"><Building2 size={16} /> Institution status</Link>
              </section>
            </aside>
          </div>
        </div>
          )}
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
            id_document: profile.id_document,
            institution_id: profile.institution_id,
            is_verified: profile.is_verified,
            has_affiliation_claim: !!currentAffiliation
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
    </StudentLayout>
  );
};

export default StudentDashboard;
  
