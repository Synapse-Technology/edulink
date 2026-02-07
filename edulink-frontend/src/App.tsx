import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './routes';
import { Layout, HybridLayout } from './components';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Search from './pages/Search';
import Support from './pages/Support';
import TicketHistory from './pages/TicketHistory';
import TicketDetail from './pages/TicketDetail';
import Opportunities from './pages/Opportunities';
import OpportunityDetails from './pages/OpportunityDetails';
import WhyUs from './pages/WhyUs';
import VerifyArtifact from './pages/VerifyArtifact';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import InstitutionRequest from './pages/admin/Institution/InstitutionRequest';
import InstitutionActivate from './pages/admin/Institution/InstitutionActivate';
import InstitutionLogin from './pages/admin/Institution/InstitutionLogin';
import InstitutionDashboard from './pages/admin/Institution/InstitutionDashboard';
import ReportsAnalytics from './pages/admin/Institution/ReportsAnalytics';
import InstitutionStudents from './pages/admin/Institution/InstitutionStudents';
import InstitutionStaff from './pages/admin/Institution/InstitutionStaff';
import InstitutionInternships from './pages/admin/Institution/InstitutionInternships';
import InstitutionApplications from './pages/admin/Institution/InstitutionApplications';
import InstitutionCertifications from './pages/admin/Institution/InstitutionCertifications';
import StudentVerification from './pages/admin/Institution/StudentVerification';
import InstitutionSettings from './pages/admin/Institution/InstitutionSettings';
import AcademicStructure from './components/admin/institution/AcademicStructure';
import InstitutionLayout from './components/admin/institution/InstitutionLayout';
import SupervisorDashboard from './pages/admin/Institution/supervisor/SupervisorDashboard';
import SupervisorOverview from './pages/admin/Institution/supervisor/SupervisorOverview';
import SupervisorLogbooks from './pages/admin/Institution/supervisor/SupervisorLogbooks';
import SupervisorStudents from './pages/admin/Institution/supervisor/SupervisorStudents';
import SupervisorIncidents from './pages/admin/Institution/supervisor/SupervisorIncidents';
import SupervisorSettings from './pages/admin/Institution/supervisor/SupervisorSettings';
import StudentLogbookHistory from './pages/admin/shared/StudentLogbookHistory';
import StudentDashboard from './pages/student/StudentDashboardPage';
import StudentApplications from './pages/student/StudentApplications';
import StudentInternship from './pages/student/StudentInternship';
import StudentLogbook from './pages/student/StudentLogbook';
import StudentLogbookDetail from './pages/student/StudentLogbookDetail';
import StudentArtifacts from './pages/student/StudentArtifacts';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentProfile from './pages/student/StudentProfile';
import StudentAffiliation from './pages/student/StudentAffiliation';
import StudentApplicationDetail from './pages/student/StudentApplicationDetail';
import AdminLanding from './pages/admin/AdminLanding';
import SystemAdminDashboard from './pages/admin/SystemAdmin/SystemAdminDashboard';
import SystemAdminLogin from './pages/admin/SystemAdmin/SystemAdminLogin';
import UserManagement from './pages/admin/SystemAdmin/UserManagement';
import InstitutionManagement from './pages/admin/SystemAdmin/InstitutionManagement';
import InstitutionInterestAnalytics from './pages/admin/SystemAdmin/InstitutionInterestAnalytics';
import PlatformStaffManagement from './pages/admin/SystemAdmin/PlatformStaffManagement';
import StaffInviteForm from './pages/admin/SystemAdmin/StaffInviteForm';
import AcceptInvite from './pages/admin/SystemAdmin/AcceptInvite';
import SystemHealthDashboard from './pages/admin/SystemAdmin/SystemHealthDashboard';
import AuditLog from './pages/admin/SystemAdmin/AuditLog';
import RequestSubmission from './pages/admin/Employer/RequestSubmission';
import RequestTracking from './pages/admin/Employer/RequestTracking';
import ActivateAdmin from './pages/admin/Employer/ActivateAdmin';
import EmployerLogin from './pages/admin/Employer/EmployerLogin';
import EmployerDashboard from './pages/admin/Employer/EmployerDashboard';
import EmployerOpportunities from './pages/admin/Employer/EmployerOpportunities';
import EmployerApplications from './pages/admin/Employer/EmployerApplications';
import EmployerInterns from './pages/admin/Employer/EmployerInterns';
import EmployerApplicationDetail from './pages/admin/Employer/EmployerApplicationDetail';
import EmployerSupervisors from './pages/admin/Employer/EmployerSupervisors';
import EmployerProfile from './pages/admin/Employer/EmployerProfile';
import EmployerSettings from './pages/admin/Employer/EmployerSettings';
import EmployerProfileRequests from './pages/admin/Employer/EmployerProfileRequests';
import EmployerReviews from './pages/admin/Employer/EmployerReviews';
import EmployerSupervisorDashboard from './pages/admin/Employer/Supervisor/SupervisorDashboard';
import EmployerSupervisorLogbooks from './pages/admin/Employer/Supervisor/SupervisorLogbooks';
import EmployerSupervisorIncidents from './pages/admin/Employer/Supervisor/SupervisorIncidents';
import EmployerSupervisorInternships from './pages/admin/Employer/Supervisor/SupervisorInternships';
import EmployerSupervisorMilestones from './pages/admin/Employer/Supervisor/SupervisorMilestones';
import EmployerSupervisorProfile from './pages/admin/Employer/Supervisor/SupervisorProfile';

import EmployerRequestReview from './pages/admin/SystemAdmin/EmployerRequestReview';
import SupportManagement from './pages/admin/SystemAdmin/SupportManagement';
import AdminSupportTicketDetail from './pages/admin/SystemAdmin/AdminSupportTicketDetail';
import ContactManagement from './pages/admin/SystemAdmin/ContactManagement';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import NotFound from './pages/NotFound';
import './App.css';
import './styles/admin-dashboard.css';
import './styles/admin-landing.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="why-us" element={<WhyUs />} />
          <Route path="contact" element={<Contact />} />
          <Route path="search" element={<Search />} />
        </Route>

        <Route path="/verify/:artifactId" element={<VerifyArtifact />} />
        
        <Route path="/support" element={<HybridLayout><Support /></HybridLayout>} />
        <Route path="/support/history" element={<ProtectedRoute><HybridLayout><TicketHistory /></HybridLayout></ProtectedRoute>} />
        <Route path="/support/tickets/:trackingCode" element={<ProtectedRoute><HybridLayout><TicketDetail /></HybridLayout></ProtectedRoute>} />
        <Route path="/opportunities" element={<HybridLayout><Opportunities /></HybridLayout>} />
        <Route path="/opportunities/:id" element={<HybridLayout><OpportunityDetails /></HybridLayout>} />
        
        {/* Auth routes without layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token/" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        
        {/* Admin routes without layout */}
        <Route path="/admin" element={<AdminLanding />} />
        <Route path="/admin/accept-invite" element={<AcceptInvite />} />
        <Route path="/admin/login" element={
          <AdminAuthProvider>
            <SystemAdminLogin />
          </AdminAuthProvider>
        } />
        <Route path="/dashboard/admin" element={
          <AdminAuthProvider>
            <SystemAdminDashboard />
          </AdminAuthProvider>
        } />
        <Route path="/admin/users" element={
          <AdminAuthProvider>
            <UserManagement />
          </AdminAuthProvider>
        } />
        <Route path="/admin/institutions" element={
          <AdminAuthProvider>
            <InstitutionManagement />
          </AdminAuthProvider>
        } />
        <Route path="/admin/staff" element={
          <AdminAuthProvider>
            <PlatformStaffManagement />
          </AdminAuthProvider>
        } />
        <Route path="/admin/staff/invite" element={
          <AdminAuthProvider>
            <StaffInviteForm />
          </AdminAuthProvider>
        } />
        <Route path="/admin/health" element={
          <AdminAuthProvider>
            <SystemHealthDashboard />
          </AdminAuthProvider>
        } />
        <Route path="/admin/analytics" element={
          <AdminAuthProvider>
            <SystemHealthDashboard />
          </AdminAuthProvider>
        } />
        <Route path="/admin/analytics/institutions" element={
          <AdminAuthProvider>
            <InstitutionInterestAnalytics />
          </AdminAuthProvider>
        } />
        <Route path="/admin/reports" element={
          <AdminAuthProvider>
            <SystemHealthDashboard />
          </AdminAuthProvider>
        } />
        <Route path="/admin/logs" element={
          <AdminAuthProvider>
            <AuditLog />
          </AdminAuthProvider>
        } />
        <Route path="/admin/settings" element={
          <AdminAuthProvider>
            <SystemAdminDashboard />
          </AdminAuthProvider>
        } />
        
        {/* Student dashboard routes without layout */}
        <Route path="/dashboard/student/*" element={
          <ThemeProvider>
            <Routes>
              <Route index element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="applications" element={
                <ProtectedRoute>
                  <StudentApplications />
                </ProtectedRoute>
              } />
              <Route path="applications/:id" element={
                <ProtectedRoute>
                  <StudentApplicationDetail />
                </ProtectedRoute>
              } />
              <Route path="internship" element={
                <ProtectedRoute>
                  <StudentInternship />
                </ProtectedRoute>
              } />
              <Route path="logbook" element={
                <ProtectedRoute>
                  <StudentLogbook />
                </ProtectedRoute>
              } />
              <Route path="logbook/:evidenceId" element={
                <ProtectedRoute>
                  <StudentLogbookDetail />
                </ProtectedRoute>
              } />
              <Route path="artifacts" element={
                <ProtectedRoute>
                  <StudentArtifacts />
                </ProtectedRoute>
              } />
              <Route path="notifications" element={
                <ProtectedRoute>
                  <StudentNotifications />
                </ProtectedRoute>
              } />
              <Route path="profile" element={
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              } />
              <Route path="affiliation" element={
                <ProtectedRoute>
                  <StudentAffiliation />
                </ProtectedRoute>
              } />
            </Routes>
          </ThemeProvider>
        } />
        
        {/* Institution onboarding request */}
        <Route path="/institutions/request" element={<InstitutionRequest />} />
        <Route path="/institution/request" element={<InstitutionRequest />} /> {/* Legacy/Alias */}
        <Route path="/institution/activate" element={<InstitutionActivate />} />
        <Route path="/institution/staff/activate" element={<InstitutionActivate />} />
        {/* Institution Routes */}
        <Route path="/institution/login" element={<InstitutionLogin />} />
        <Route path="/institution/dashboard" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionDashboard /></ProtectedRoute>} />
        <Route path="/institution/dashboard/reports" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><ReportsAnalytics /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/students" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><InstitutionStudents /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/staff" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><InstitutionStaff /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/academic" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><AcademicStructure /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/internships" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><InstitutionInternships /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/applications" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><InstitutionApplications /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/certifications" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><InstitutionCertifications /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/verification" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><StudentVerification /></InstitutionLayout></ProtectedRoute>} />
        <Route path="/institution/dashboard/settings" element={<ProtectedRoute role={['institution', 'institution_admin']}><InstitutionLayout><InstitutionSettings /></InstitutionLayout></ProtectedRoute>} />
        
        <Route path="/institution/supervisor-dashboard" element={<ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>}>
          <Route index element={<SupervisorOverview />} />
          <Route path="overview" element={<SupervisorOverview />} />
          <Route path="logbooks" element={<SupervisorLogbooks />} />
          <Route path="students" element={<SupervisorStudents />} />
          <Route path="students/:applicationId/logbook" element={<StudentLogbookHistory />} />
          <Route path="incidents" element={<SupervisorIncidents />} />
          <Route path="settings" element={<SupervisorSettings />} />
        </Route>

        {/* Employer onboarding routes */}
        <Route path="/employer/onboarding" element={<RequestSubmission />} />
        <Route path="/employer/track" element={<RequestTracking />} />
        <Route path="/employer/activate" element={<ActivateAdmin />} />
        <Route path="/employer/staff/activate" element={<ActivateAdmin />} />
        <Route path="/employer/login" element={<EmployerLogin />} />
        
        {/* Employer Routes */}
        <Route path="/employer/dashboard" element={<EmployerDashboard />} />
        <Route path="/employer/dashboard/opportunities" element={<EmployerOpportunities />} />
        <Route path="/employer/dashboard/applications" element={<EmployerApplications />} />
        <Route path="/employer/dashboard/interns" element={<EmployerInterns />} />
        <Route path="/employer/dashboard/applications/:id" element={<EmployerApplicationDetail />} />
        <Route path="/employer/dashboard/supervisors" element={<EmployerSupervisors />} />
        <Route path="/employer/dashboard/profile-requests" element={<EmployerProfileRequests />} />
        <Route path="/employer/dashboard/reviews" element={<EmployerReviews />} />
        <Route path="/employer/dashboard/profile" element={<EmployerProfile />} />
        <Route path="/employer/dashboard/settings" element={<EmployerSettings />} />
        
        {/* Employer Supervisor Routes */}
        <Route path="/employer/supervisor/dashboard" element={<EmployerSupervisorDashboard />} />
        <Route path="/employer/supervisor/logbooks" element={<EmployerSupervisorLogbooks />} />
        <Route path="/employer/supervisor/incidents" element={<EmployerSupervisorIncidents />} />
        <Route path="/employer/supervisor/internships" element={<EmployerSupervisorInternships />} />
        <Route path="/employer/supervisor/internships/:applicationId/logbook" element={<StudentLogbookHistory />} />
        <Route path="/employer/supervisor/milestones" element={<EmployerSupervisorMilestones />} />
        <Route path="/employer/supervisor/profile" element={<EmployerSupervisorProfile />} />

        <Route path="/admin/employers/requests" element={
          <AdminAuthProvider>
            <EmployerRequestReview />
          </AdminAuthProvider>
        } />

        <Route path="/admin/support" element={
          <AdminAuthProvider>
            <SupportManagement />
          </AdminAuthProvider>
        } />

        <Route path="/admin/support/tickets/:trackingCode" element={
          <AdminAuthProvider>
            <AdminSupportTicketDetail />
          </AdminAuthProvider>
        } />

        <Route path="/admin/contact" element={
          <AdminAuthProvider>
            <ContactManagement />
          </AdminAuthProvider>
        } />
        
        {/* Catch-all route for 404 errors */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
