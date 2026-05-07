import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { ProtectedRoute } from './routes';
import { Layout, HybridLayout, KeepAlive } from './components';
import InstitutionLayout from './components/admin/institution/InstitutionLayout';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { AdminProtectedRoute } from './components/admin/AdminRouteGuards';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import EdiChatbot from './components/common/EdiChatbot';
import { ToastProvider } from './components/providers/ToastProvider';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import NotFound from './pages/NotFound';
import './App.css';
import './styles/admin-dashboard.css';
import './styles/admin-landing.css';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Search = lazy(() => import('./pages/Search'));
const Support = lazy(() => import('./pages/Support'));
const FAQ = lazy(() => import('./pages/FAQ'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const SuccessStories = lazy(() => import('./pages/SuccessStories'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const TrustPolicy = lazy(() => import('./pages/TrustPolicy'));
const TicketHistory = lazy(() => import('./pages/TicketHistory'));
const TicketDetail = lazy(() => import('./pages/TicketDetail'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
const OpportunityDetails = lazy(() => import('./pages/OpportunityDetails'));
const WhyUs = lazy(() => import('./pages/WhyUs'));
const VerifyArtifact = lazy(() => import('./pages/VerifyArtifact'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const InstitutionRequest = lazy(() => import('./pages/admin/Institution/InstitutionRequest'));
const InstitutionActivate = lazy(() => import('./pages/admin/Institution/InstitutionActivate'));
const InstitutionDashboard = lazy(() => import('./pages/admin/Institution/InstitutionDashboard'));
const ReportsAnalytics = lazy(() => import('./pages/admin/Institution/ReportsAnalytics'));
const InstitutionStudents = lazy(() => import('./pages/admin/Institution/InstitutionStudents'));
const InstitutionStaff = lazy(() => import('./pages/admin/Institution/InstitutionStaff'));
const InstitutionInternships = lazy(() => import('./pages/admin/Institution/InstitutionInternships'));
const InstitutionApplications = lazy(() => import('./pages/admin/Institution/InstitutionApplications'));
const InstitutionCertifications = lazy(() => import('./pages/admin/Institution/InstitutionCertifications'));
const ExternalPlacements = lazy(() => import('./pages/admin/Institution/ExternalPlacements'));
const StudentVerification = lazy(() => import('./pages/admin/Institution/StudentVerification'));
const InstitutionIncidentsManagement = lazy(() => import('./pages/admin/Institution/InstitutionIncidentsManagement'));
const InstitutionSettings = lazy(() => import('./pages/admin/Institution/InstitutionSettings'));
const AcademicStructure = lazy(() => import('./components/admin/institution/AcademicStructure'));
const SupervisorDashboard = lazy(() => import('./pages/admin/Institution/supervisor/SupervisorDashboard'));
const SupervisorOverview = lazy(() => import('./pages/admin/Institution/supervisor/SupervisorOverview'));
const SupervisorLogbooks = lazy(() => import('./pages/admin/Institution/supervisor/SupervisorLogbooks'));
const SupervisorStudents = lazy(() => import('./pages/admin/Institution/supervisor/SupervisorStudents'));
const SupervisorIncidents = lazy(() => import('./pages/admin/Institution/supervisor/SupervisorIncidents'));
const SupervisorSettings = lazy(() => import('./pages/admin/Institution/supervisor/SupervisorSettings'));
const StudentLogbookHistory = lazy(() => import('./pages/admin/shared/StudentLogbookHistory'));

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboardPage'));
const StudentApplications = lazy(() => import('./pages/student/StudentApplications'));
const StudentInternship = lazy(() => import('./pages/student/StudentInternship'));
const StudentLogbook = lazy(() => import('./pages/student/StudentLogbook'));
const StudentLogbookDetail = lazy(() => import('./pages/student/StudentLogbookDetail'));
const ExternalPlacement = lazy(() => import('./pages/student/ExternalPlacement'));
const StudentArtifacts = lazy(() => import('./pages/student/StudentArtifacts'));
const StudentNotifications = lazy(() => import('./pages/student/StudentNotifications'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const StudentAffiliation = lazy(() => import('./pages/student/StudentAffiliation'));
const StudentApplicationDetail = lazy(() => import('./pages/student/StudentApplicationDetail'));

const AdminLanding = lazy(() => import('./pages/admin/AdminLanding'));
const SystemAdminDashboard = lazy(() => import('./pages/admin/SystemAdmin/SystemAdminDashboard'));
const SystemAdminLogin = lazy(() => import('./pages/admin/SystemAdmin/SystemAdminLogin'));
const UserManagement = lazy(() => import('./pages/admin/SystemAdmin/UserManagement'));
const InstitutionManagement = lazy(() => import('./pages/admin/SystemAdmin/InstitutionManagement'));
const InstitutionInterestAnalytics = lazy(() => import('./pages/admin/SystemAdmin/InstitutionInterestAnalytics'));
const PlatformStaffManagement = lazy(() => import('./pages/admin/SystemAdmin/PlatformStaffManagement'));
const StaffInviteForm = lazy(() => import('./pages/admin/SystemAdmin/StaffInviteForm'));
const AcceptInvite = lazy(() => import('./pages/admin/SystemAdmin/AcceptInvite'));
const SystemHealthDashboard = lazy(() => import('./pages/admin/SystemAdmin/SystemHealthDashboard'));
const AuditLog = lazy(() => import('./pages/admin/SystemAdmin/AuditLog'));
const ExternalOpportunityCuration = lazy(() => import('./pages/admin/SystemAdmin/ExternalOpportunityCuration'));
const EmployerRequestReview = lazy(() => import('./pages/admin/SystemAdmin/EmployerRequestReview'));
const SupportManagement = lazy(() => import('./pages/admin/SystemAdmin/SupportManagement'));
const AdminSupportTicketDetail = lazy(() => import('./pages/admin/SystemAdmin/AdminSupportTicketDetail'));
const ContactManagement = lazy(() => import('./pages/admin/SystemAdmin/ContactManagement'));

const RequestSubmission = lazy(() => import('./pages/admin/Employer/RequestSubmission'));
const RequestTracking = lazy(() => import('./pages/admin/Employer/RequestTracking'));
const ActivateAdmin = lazy(() => import('./pages/admin/Employer/ActivateAdmin'));
const EmployerDashboard = lazy(() => import('./pages/admin/Employer/EmployerDashboard'));
const EmployerOpportunities = lazy(() => import('./pages/admin/Employer/EmployerOpportunities'));
const EmployerApplications = lazy(() => import('./pages/admin/Employer/EmployerApplications'));
const EmployerInterns = lazy(() => import('./pages/admin/Employer/EmployerInterns'));
const EmployerApplicationDetail = lazy(() => import('./pages/admin/Employer/EmployerApplicationDetail'));
const EmployerSupervisors = lazy(() => import('./pages/admin/Employer/EmployerSupervisors'));
const EmployerProfile = lazy(() => import('./pages/admin/Employer/EmployerProfile'));
const EmployerSettings = lazy(() => import('./pages/admin/Employer/EmployerSettings'));
const EmployerProfileRequests = lazy(() => import('./pages/admin/Employer/EmployerProfileRequests'));
const EmployerReviews = lazy(() => import('./pages/admin/Employer/EmployerReviews'));
const EmployerSupervisorDashboard = lazy(() => import('./pages/admin/Employer/Supervisor/SupervisorDashboard'));
const EmployerSupervisorLogbooks = lazy(() => import('./pages/admin/Employer/Supervisor/SupervisorLogbooks'));
const EmployerSupervisorIncidents = lazy(() => import('./pages/admin/Employer/Supervisor/SupervisorIncidents'));
const EmployerSupervisorInternships = lazy(() => import('./pages/admin/Employer/Supervisor/SupervisorInternships'));
const EmployerSupervisorMilestones = lazy(() => import('./pages/admin/Employer/Supervisor/SupervisorMilestones'));
const EmployerSupervisorProfile = lazy(() => import('./pages/admin/Employer/Supervisor/SupervisorProfile'));

const AdminRoute = ({ children }: { children: ReactNode }) => (
  <AdminAuthProvider>
    <AdminProtectedRoute>{children}</AdminProtectedRoute>
  </AdminAuthProvider>
);

const EmployerAdminRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute role="employer_admin" portal="employer">
    {children}
  </ProtectedRoute>
);

const EmployerSupervisorRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute role="supervisor" portal="employer">{children}</ProtectedRoute>
);

const InstitutionSupervisorRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute role="supervisor" portal="institution">{children}</ProtectedRoute>
);

const RouteFallback = () => (
  <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
    <div className="text-center">
      <div className="spinner-border text-primary mb-3" role="status" aria-label="Loading" />
      <div className="fw-semibold text-muted">Loading EduLink...</div>
    </div>
  </div>
);

function App() {
  useSessionTimeout();

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <KeepAlive />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public routes with layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="why-us" element={<WhyUs />} />
              <Route path="contact" element={<Contact />} />
              <Route path="search" element={<Search />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="success-stories" element={<SuccessStories />} />
              <Route path="terms" element={<TermsOfService />} />
              <Route path="trust-policy" element={<TrustPolicy />} />
            </Route>
            <Route path="/verify/:artifactId" element={<VerifyArtifact />} />
            <Route
              path="/support"
              element={
                <HybridLayout>
                  <Support />
                </HybridLayout>
              }
            />
            <Route
              path="/support/history"
              element={
                <ProtectedRoute>
                  <HybridLayout>
                    <TicketHistory />
                  </HybridLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/support/tickets/:trackingCode"
              element={
                <ProtectedRoute>
                  <HybridLayout>
                    <TicketDetail />
                  </HybridLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/opportunities"
              element={
                <HybridLayout>
                  <Opportunities />
                </HybridLayout>
              }
            />
            <Route
              path="/opportunities/:id"
              element={
                <HybridLayout>
                  <OpportunityDetails />
                </HybridLayout>
              }
            />
            {/* Auth routes without layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email/:token/" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/reset-password/:token"
              element={<ResetPasswordPage />}
            />
            {/* Admin routes without layout */}
            <Route path="/admin" element={<AdminLanding />} />
            <Route path="/admin/accept-invite" element={<AcceptInvite />} />
            <Route
              path="/admin/login"
              element={
                <AdminAuthProvider>
                  <SystemAdminLogin />
                </AdminAuthProvider>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <AdminRoute>
                  <SystemAdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/institutions"
              element={
                <AdminRoute>
                  <InstitutionManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <AdminRoute>
                  <PlatformStaffManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/opportunities/external"
              element={
                <AdminRoute>
                  <ExternalOpportunityCuration />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/staff/invite"
              element={
                <AdminRoute>
                  <StaffInviteForm />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/health"
              element={
                <AdminRoute>
                  <SystemHealthDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminRoute>
                  <SystemHealthDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/analytics/institutions"
              element={
                <AdminRoute>
                  <InstitutionInterestAnalytics />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <SystemHealthDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AdminRoute>
                  <AuditLog />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <SystemAdminDashboard />
                </AdminRoute>
              }
            />
            {/* Student dashboard routes without layout */}
            <Route
              path="/dashboard/student/*"
              element={
                <ThemeProvider>
                  <Routes>
                    <Route
                      index
                      element={
                        <ProtectedRoute role="student">
                          <StudentDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="applications"
                      element={
                        <ProtectedRoute role="student">
                          <StudentApplications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="applications/:id"
                      element={
                        <ProtectedRoute role="student">
                          <StudentApplicationDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="internship"
                      element={
                        <ProtectedRoute role="student">
                          <StudentInternship />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="external-placement"
                      element={
                        <ProtectedRoute role="student">
                          <ExternalPlacement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="logbook"
                      element={
                        <ProtectedRoute role="student">
                          <StudentLogbook />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="logbook/:evidenceId"
                      element={
                        <ProtectedRoute role="student">
                          <StudentLogbookDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="artifacts"
                      element={
                        <ProtectedRoute role="student">
                          <StudentArtifacts />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="notifications"
                      element={
                        <ProtectedRoute role="student">
                          <StudentNotifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <ProtectedRoute role="student">
                          <StudentProfile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="affiliation"
                      element={
                        <ProtectedRoute role="student">
                          <StudentAffiliation />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </ThemeProvider>
              }
            />
            {/* Institution onboarding request */}
            <Route
              path="/institutions/request"
              element={<InstitutionRequest />}
            />
            <Route
              path="/institution/request"
              element={<InstitutionRequest />}
            />{' '}
            {/* Legacy/Alias */}
            <Route
              path="/institution/activate"
              element={<InstitutionActivate />}
            />
            <Route
              path="/institution/staff/activate"
              element={<InstitutionActivate />}
            />
            {/* Institution Routes */}
            <Route path="/institution/login" element={<Login portalIntent="institution" />} />
            <Route
              path="/institution/dashboard"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/reports"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <ReportsAnalytics />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/students"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <InstitutionStudents />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/staff"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <InstitutionStaff />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/academic"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <AcademicStructure />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/internships"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <InstitutionInternships />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/external-placements"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <ExternalPlacements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/applications"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <InstitutionApplications />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/certifications"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <InstitutionCertifications />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/verification"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <StudentVerification />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/incidents"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <InstitutionIncidentsManagement />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/dashboard/settings"
              element={
                <ProtectedRoute role="institution_admin" portal="institution">
                  <InstitutionLayout>
                    <InstitutionSettings />
                  </InstitutionLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/institution/supervisor-dashboard"
              element={
                <InstitutionSupervisorRoute>
                  <SupervisorDashboard />
                </InstitutionSupervisorRoute>
              }
            >
              <Route index element={<SupervisorOverview />} />
              <Route path="overview" element={<SupervisorOverview />} />
              <Route path="logbooks" element={<SupervisorLogbooks />} />
              <Route path="students" element={<SupervisorStudents />} />
              <Route
                path="students/:applicationId/logbook"
                element={<StudentLogbookHistory />}
              />
              <Route path="incidents" element={<SupervisorIncidents />} />
              <Route path="settings" element={<SupervisorSettings />} />
            </Route>
            {/* Employer onboarding routes */}
            <Route
              path="/employer/onboarding"
              element={<RequestSubmission />}
            />
            <Route path="/employer/track" element={<RequestTracking />} />
            <Route path="/employer/activate" element={<ActivateAdmin />} />
            <Route
              path="/employer/staff/activate"
              element={<ActivateAdmin />}
            />
            <Route path="/employer/login" element={<Login portalIntent="employer" />} />
            {/* Employer Routes */}
            <Route
              path="/employer/dashboard"
              element={
                <EmployerAdminRoute>
                  <EmployerDashboard />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/opportunities"
              element={
                <EmployerAdminRoute>
                  <EmployerOpportunities />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/opportunities/:id"
              element={
                <EmployerAdminRoute>
                  <EmployerOpportunities />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/applications"
              element={
                <EmployerAdminRoute>
                  <EmployerApplications />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/interns"
              element={
                <EmployerAdminRoute>
                  <EmployerInterns />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/applications/:id"
              element={
                <EmployerAdminRoute>
                  <EmployerApplicationDetail />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/supervisors"
              element={
                <EmployerAdminRoute>
                  <EmployerSupervisors />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/profile-requests"
              element={
                <EmployerAdminRoute>
                  <EmployerProfileRequests />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/reviews"
              element={
                <EmployerAdminRoute>
                  <EmployerReviews />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/profile"
              element={
                <EmployerAdminRoute>
                  <EmployerProfile />
                </EmployerAdminRoute>
              }
            />
            <Route
              path="/employer/dashboard/settings"
              element={
                <EmployerAdminRoute>
                  <EmployerSettings />
                </EmployerAdminRoute>
              }
            />
            {/* Employer Supervisor Routes */}
            <Route
              path="/employer/supervisor/dashboard"
              element={
                <EmployerSupervisorRoute>
                  <EmployerSupervisorDashboard />
                </EmployerSupervisorRoute>
              }
            />
            <Route
              path="/employer/supervisor/logbooks"
              element={
                <EmployerSupervisorRoute>
                  <EmployerSupervisorLogbooks />
                </EmployerSupervisorRoute>
              }
            />
            <Route
              path="/employer/supervisor/incidents"
              element={
                <EmployerSupervisorRoute>
                  <EmployerSupervisorIncidents />
                </EmployerSupervisorRoute>
              }
            />
            <Route
              path="/employer/supervisor/internships"
              element={
                <EmployerSupervisorRoute>
                  <EmployerSupervisorInternships />
                </EmployerSupervisorRoute>
              }
            />
            <Route
              path="/employer/supervisor/internships/:applicationId/logbook"
              element={
                <EmployerSupervisorRoute>
                  <StudentLogbookHistory />
                </EmployerSupervisorRoute>
              }
            />
            <Route
              path="/employer/supervisor/milestones"
              element={
                <EmployerSupervisorRoute>
                  <EmployerSupervisorMilestones />
                </EmployerSupervisorRoute>
              }
            />
            <Route
              path="/employer/supervisor/profile"
              element={
                <EmployerSupervisorRoute>
                  <EmployerSupervisorProfile />
                </EmployerSupervisorRoute>
              }
            />
            <Route
              path="/admin/employers/requests"
              element={
                <AdminRoute>
                  <EmployerRequestReview />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/support"
              element={
                <AdminRoute>
                  <SupportManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/support/tickets/:trackingCode"
              element={
                <AdminRoute>
                  <AdminSupportTicketDetail />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/contact"
              element={
                <AdminRoute>
                  <ContactManagement />
                </AdminRoute>
              }
            />
            {/* Catch-all route for 404 errors */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <EdiChatbot />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
