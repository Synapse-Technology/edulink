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
import StudentDashboard from '../pages/dashboard/studentdashboard';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For now, we'll use a simple mock authentication check
  // In a real app, this would check for a valid JWT token or session
  const isAuthenticated = localStorage.getItem('authToken') !== null;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken') !== null;
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard/student" replace />;
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
  STUDENT_INTERNSHIPS: '/dashboard/student/internships',
  STUDENT_REPORTS: '/dashboard/student/reports',
  STUDENT_CV: '/dashboard/student/cv',
  STUDENT_SUPPORT: '/dashboard/student/support',
  STUDENT_PROFILE: '/dashboard/student/profile',
  STUDENT_MESSAGES: '/dashboard/student/messages',
  
  // Employer dashboard routes
  EMPLOYER_DASHBOARD: '/dashboard/employer',
  EMPLOYER_INTERNSHIPS: '/dashboard/employer/internships',
  EMPLOYER_APPLICATIONS: '/dashboard/employer/applications',
  EMPLOYER_STUDENTS: '/dashboard/employer/students',
  EMPLOYER_REPORTS: '/dashboard/employer/reports',
  EMPLOYER_PROFILE: '/dashboard/employer/profile',
  
  // Institution dashboard routes
  INSTITUTION_DASHBOARD: '/dashboard/institution',
  INSTITUTION_STUDENTS: '/dashboard/institution/students',
  INSTITUTION_EMPLOYERS: '/dashboard/institution/employers',
  INSTITUTION_INTERNSHIPS: '/dashboard/institution/internships',
  INSTITUTION_REPORTS: '/dashboard/institution/reports',
  INSTITUTION_SETTINGS: '/dashboard/institution/settings',
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
  
  // Default redirect
  {
    path: '*',
    element: <Navigate to={ROUTES.HOME} replace />,
    isPublic: true,
    requiresLayout: false,
  },
];

export default ROUTES;