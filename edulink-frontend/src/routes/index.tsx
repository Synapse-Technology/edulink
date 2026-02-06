import React from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '../components';
import Home from '../pages/Home';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Support from '../pages/Support';
import Search from '../pages/Search';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import StudentDashboard from '../pages/student/StudentDashboardPage';
import StudentAffiliation from '../pages/student/StudentAffiliation';

// Admin imports
import AdminNavigation from '../components/admin/AdminNavigation';
import SystemAdminLogin from '../pages/admin/SystemAdmin/SystemAdminLogin';
import SystemAdminDashboard from '../pages/admin/SystemAdmin/SystemAdminDashboard';
import SystemHealthDashboard from '../pages/admin/SystemAdmin/SystemHealthDashboard';
import UserManagement from '../pages/admin/SystemAdmin/UserManagement';
import InstitutionManagement from '../pages/admin/SystemAdmin/InstitutionManagement';
import PlatformStaffManagement from '../pages/admin/SystemAdmin/PlatformStaffManagement';
import StaffInviteForm from '../pages/admin/SystemAdmin/StaffInviteForm';
import AcceptInvite from '../pages/admin/SystemAdmin/AcceptInvite';
import AuditLog from '../pages/admin/SystemAdmin/AuditLog';
import RequestSubmission from '../pages/admin/Employer/RequestSubmission';
import RequestTracking from '../pages/admin/Employer/RequestTracking';
import ActivateAdmin from '../pages/admin/Employer/ActivateAdmin';
import SupervisorDashboard from '../pages/admin/Employer/Supervisor/SupervisorDashboard';
import SupervisorInternships from '../pages/admin/Employer/Supervisor/SupervisorInternships';
import SupervisorLogbooks from '../pages/admin/Employer/Supervisor/SupervisorLogbooks';
import SupervisorMilestones from '../pages/admin/Employer/Supervisor/SupervisorMilestones';
import SupervisorIncidents from '../pages/admin/Employer/Supervisor/SupervisorIncidents';
import SupervisorLayout from '../components/admin/employer/supervisor/SupervisorLayout';
// import AdminReview from '../pages/admin/Employer/AdminReview';
import { AdminProtectedRoute, AdminPublicRoute } from '../components/admin/AdminRouteGuards';
import { useAuthStore } from '../stores/authStore';

import { useLocation } from 'react-router-dom';

// Protected Route Component
export const ProtectedRoute: React.FC<{ children: React.ReactNode, role?: string | string[] }> = ({ children, role }) => {
  // Use Zustand store for reactive authentication state
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Determine redirect path based on current location
    const path = location.pathname;
    let loginPath = '/login'; // Default to student login
    
    if (path.startsWith('/institution') || path.startsWith('/dashboard/institution')) {
      loginPath = '/institution/login';
    } else if (path.startsWith('/employer') || path.startsWith('/dashboard/employer')) {
      loginPath = '/employer/login';
    } else if (path.startsWith('/admin') || path.startsWith('/dashboard/admin')) {
      loginPath = '/admin/login';
    }
    
    return <Navigate to={loginPath} replace />;
  }

  // Check role if specified
  if (role && user) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
      // Redirect to their own dashboard if they try to access a route they don't have access to
      let dashboardPath = '/dashboard/student';
      if (user.role === 'employer' || user.role === 'employer_admin') {
        dashboardPath = '/employer/dashboard';
      } else if (user.role === 'institution' || user.role === 'institution_admin' || user.role === 'supervisor') {
        dashboardPath = '/institution/dashboard';
      } else if (user.role === 'system_admin') {
        dashboardPath = '/admin';
      }
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return <>{children}</>;
};

// Public Route Component
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated && user) {
    // Redirect based on user role
    let dashboardPath = '/dashboard/student'; // Default
    
    const role = user.role;
    if (role === 'employer' || role === 'employer_admin') {
      dashboardPath = '/employer/dashboard';
    } else if (role === 'institution' || role === 'institution_admin' || role === 'supervisor') {
      dashboardPath = '/institution/dashboard';
    } else if (role === 'system_admin') {
      dashboardPath = '/admin';
    }
    
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

// Route configurations
export const ROUTES = {
  // Public routes
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
  SUPPORT: '/support',
  SEARCH: '/search',
  
  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Dashboard routes
  STUDENT_DASHBOARD: '/dashboard/student',
  STUDENT_BROWSE: '/dashboard/student/browse',
  STUDENT_APPLICATIONS: '/dashboard/student/applications',
  STUDENT_AFFILIATION: '/dashboard/student/affiliation',
  STUDENT_INTERNSHIPS: '/dashboard/student/internships',
  STUDENT_REPORTS: '/dashboard/student/reports',
  STUDENT_CV: '/dashboard/student/cv',
  STUDENT_SUPPORT: '/dashboard/student/support',
  STUDENT_PROFILE: '/dashboard/student/profile',
  STUDENT_MESSAGES: '/dashboard/student/messages',
  
  // Employer dashboard routes
  EMPLOYER_DASHBOARD: '/employer/dashboard',
  EMPLOYER_INTERNSHIPS: '/employer/dashboard/internships',
  EMPLOYER_OPPORTUNITY_DETAILS: '/employer/dashboard/opportunities/:id',
  EMPLOYER_APPLICATIONS: '/employer/dashboard/applications',
  EMPLOYER_STUDENTS: '/employer/dashboard/students',
  EMPLOYER_REPORTS: '/employer/dashboard/reports',
  EMPLOYER_PROFILE: '/employer/dashboard/profile',
  EMPLOYER_PROFILE_REQUESTS: '/employer/dashboard/profile-requests',
  EMPLOYER_REVIEWS: '/employer/dashboard/reviews',
  
  // Employer Supervisor routes
  SUPERVISOR_DASHBOARD: '/employer/supervisor',
  SUPERVISOR_INTERNSHIPS: '/employer/supervisor/internships',
  SUPERVISOR_LOGBOOKS: '/employer/supervisor/logbooks',
  SUPERVISOR_MILESTONES: '/employer/supervisor/milestones',
  SUPERVISOR_INCIDENTS: '/employer/supervisor/incidents',
  
  // Institution dashboard routes
  INSTITUTION_DASHBOARD: '/dashboard/institution',
  INSTITUTION_STUDENTS: '/dashboard/institution/students',
  INSTITUTION_EMPLOYERS: '/dashboard/institution/employers',
  INSTITUTION_INTERNSHIPS: '/dashboard/institution/internships',
  INSTITUTION_REPORTS: '/dashboard/institution/reports',
  INSTITUTION_SETTINGS: '/dashboard/institution/settings',
  
  // Admin routes
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_HEALTH: '/admin/health',
  ADMIN_USERS: '/admin/users',
  ADMIN_INSTITUTIONS: '/admin/institutions',
  ADMIN_EMPLOYER_REQUESTS: '/admin/employers/requests',
  ADMIN_STAFF: '/admin/staff',
  ADMIN_STAFF_INVITE: '/admin/staff/invite',
  ADMIN_ACCEPT_INVITE: '/admin/accept-invite',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_LOGS: '/admin/logs',

  // Employer Public Onboarding
  EMPLOYER_ONBOARDING_REQUEST: '/employer/onboarding',
  EMPLOYER_ONBOARDING_TRACK: '/employer/track',
  EMPLOYER_ACTIVATE_ADMIN: '/employer/activate',
  EMPLOYER_ACTIVATE_STAFF: '/employer/staff/activate',
};

// Route configurations with components and layout requirements
export const routeConfigs = [
  // Public routes with layout
  {
    path: ROUTES.HOME,
    element: <Layout>{null}</Layout>,
    children: [
      { index: true, element: <Home /> },
      { path: ROUTES.ABOUT, element: <About /> },
      { path: ROUTES.CONTACT, element: <Contact /> },
      { path: ROUTES.SUPPORT, element: <Support /> },
      { path: ROUTES.SEARCH, element: <Search /> },
    ],
    isPublic: true,
    requiresLayout: true,
  },
  
  // Auth routes without layout
  {
    path: ROUTES.LOGIN,
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },
  {
    path: ROUTES.REGISTER,
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },
  
  // Student dashboard routes without layout
  {
    path: ROUTES.STUDENT_DASHBOARD,
    element: (
      <ProtectedRoute>
        <StudentDashboard />
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.STUDENT_AFFILIATION,
    element: (
      <ProtectedRoute>
        <StudentAffiliation />
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  
  // Student dashboard sub-routes
  {
    path: `${ROUTES.STUDENT_DASHBOARD}/*`,
    element: (
      <ProtectedRoute>
        <StudentDashboard />
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  
  // Admin routes
  {
    path: ROUTES.ADMIN_LOGIN,
    element: (
      <AdminPublicRoute>
        <SystemAdminLogin />
      </AdminPublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_ACCEPT_INVITE,
    element: (
      <AdminPublicRoute>
        <AcceptInvite />
      </AdminPublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_DASHBOARD,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        <SystemAdminDashboard />
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_HEALTH,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        <SystemHealthDashboard />
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_USERS,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        <UserManagement />
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_INSTITUTIONS,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        <InstitutionManagement />
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_STAFF,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        <PlatformStaffManagement />
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_STAFF_INVITE,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        <StaffInviteForm />
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.ADMIN_LOGS,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        <AuditLog />
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  
  // Employer Public Onboarding Routes
  {
    path: ROUTES.EMPLOYER_ONBOARDING_REQUEST,
    element: (
      <PublicRoute>
        <RequestSubmission />
      </PublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },
  {
    path: ROUTES.EMPLOYER_ONBOARDING_TRACK,
    element: (
      <PublicRoute>
        <RequestTracking />
      </PublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },
  {
    path: ROUTES.EMPLOYER_ACTIVATE_ADMIN,
    element: (
      <AdminPublicRoute>
        <ActivateAdmin />
      </AdminPublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },
  {
    path: ROUTES.EMPLOYER_ACTIVATE_STAFF,
    element: (
      <AdminPublicRoute>
        <ActivateAdmin />
      </AdminPublicRoute>
    ),
    isPublic: true,
    requiresLayout: false,
  },

  // Employer Supervisor Routes
  {
    path: ROUTES.SUPERVISOR_DASHBOARD,
    element: (
      <ProtectedRoute>
        <SupervisorLayout>
          <SupervisorDashboard />
        </SupervisorLayout>
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.SUPERVISOR_INTERNSHIPS,
    element: (
      <ProtectedRoute>
        <SupervisorLayout>
          <SupervisorInternships />
        </SupervisorLayout>
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.SUPERVISOR_LOGBOOKS,
    element: (
      <ProtectedRoute>
        <SupervisorLayout>
          <SupervisorLogbooks />
        </SupervisorLayout>
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.SUPERVISOR_MILESTONES,
    element: (
      <ProtectedRoute>
        <SupervisorLayout>
          <SupervisorMilestones />
        </SupervisorLayout>
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  {
    path: ROUTES.SUPERVISOR_INCIDENTS,
    element: (
      <ProtectedRoute>
        <SupervisorLayout>
          <SupervisorIncidents />
        </SupervisorLayout>
      </ProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },

  // Admin Review Route
  {
    path: ROUTES.ADMIN_EMPLOYER_REQUESTS,
    element: (
      <AdminProtectedRoute>
        <AdminNavigation />
        {/* <AdminReview /> */}
      </AdminProtectedRoute>
    ),
    isPublic: false,
    requiresLayout: false,
  },
  
  // Default redirect
  {
    path: '*',
    element: <Navigate to={ROUTES.HOME} replace />,
    isPublic: true,
    requiresLayout: false,
  },
];

export default ROUTES;