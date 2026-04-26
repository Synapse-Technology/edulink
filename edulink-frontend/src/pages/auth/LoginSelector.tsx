/**
 * Unified Login Entry Point
 *
 * Single page that allows users to select which portal/role they want to log into.
 * Provides a better UX than having separate /login, /employer/login, /institution/login URLs.
 *
 * New users see this page first and can choose their role.
 * Existing URLs like /employer/login still work for deep linking.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import styles from './LoginSelector.module.css';

type LoginPortal = 'student' | 'employer' | 'institution' | 'admin';

interface PortalOption {
  id: LoginPortal;
  label: string;
  description: string;
  icon: string; // icon class name
  route: string;
  color: string;
}

const LOGIN_PORTALS: PortalOption[] = [
  {
    id: 'student',
    label: 'Student',
    description: 'Log in to find and apply for internship opportunities',
    icon: 'user-graduate',
    route: '/login/student',
    color: '#3b82f6', // blue
  },
  {
    id: 'employer',
    label: 'Employer',
    description: 'Log in to post opportunities and manage applications',
    icon: 'briefcase',
    route: '/login/employer',
    color: '#10b981', // green
  },
  {
    id: 'institution',
    label: 'Institution',
    description: 'Log in to manage student affiliations and internships',
    icon: 'building',
    route: '/login/institution',
    color: '#f59e0b', // amber
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Log in to the admin dashboard',
    icon: 'cog',
    route: '/admin/login',
    color: '#8b5cf6', // purple
  },
];

/**
 * LoginSelectorPage - Portal selection entry point
 *
 * Displays options for:
 * - Student login
 * - Employer login
 * - Institution login
 * - Admin login
 *
 * Routes to appropriate login page based on selection.
 */
const LoginSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, admin } = useAuthStore();
  const [selectedPortal, setSelectedPortal] = useState<LoginPortal | null>(
    null
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    if (admin) {
      navigate('/admin', { replace: true });
      return;
    }

    if (user) {
      let dashboard = '/dashboard/student';
      if (['employer', 'employer_admin'].includes(user.role)) {
        dashboard = '/employer/dashboard';
      } else if (
        ['institution', 'institution_admin', 'supervisor'].includes(user.role)
      ) {
        dashboard = '/dashboard/institution';
      }
      navigate(dashboard, { replace: true });
    }
  }, [admin, isAuthenticated, navigate, user]);

  // Auto-select portal based on URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const portal = params.get('portal') as LoginPortal;
    if (portal && LOGIN_PORTALS.some(p => p.id === portal)) {
      const option = LOGIN_PORTALS.find(p => p.id === portal);
      if (option) {
        navigate(option.route, { replace: true });
      }
    }
  }, [location.search, navigate]);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return null;
  }

  const handlePortalClick = (portal: LoginPortal) => {
    setSelectedPortal(portal);
    const option = LOGIN_PORTALS.find(p => p.id === portal);
    if (option) {
      navigate(option.route, { replace: true });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>EduLink</h1>
          <p className={styles.subtitle}>Choose your login portal</p>
          <p className={styles.description}>
            Select the portal that matches your role to get started
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className={styles.gridContainer}>
          {LOGIN_PORTALS.map(portal => (
            <button
              key={portal.id}
              className={`${styles.portalCard} ${selectedPortal === portal.id ? styles.selected : ''}`}
              onClick={() => handlePortalClick(portal.id)}
              style={{
                borderColor:
                  selectedPortal === portal.id ? portal.color : undefined,
                backgroundColor:
                  selectedPortal === portal.id
                    ? `${portal.color}10`
                    : undefined,
              }}
            >
              <div className={styles.icon}>{portal.icon}</div>
              <h2 className={styles.portalLabel}>{portal.label}</h2>
              <p className={styles.portalDescription}>{portal.description}</p>
              <div
                className={styles.colorAccent}
                style={{ backgroundColor: portal.color }}
              />
            </button>
          ))}
        </div>

        {/* Help Text */}
        <div className={styles.helpText}>
          <p>
            Don't have an account? <a href="/register">Register here</a>
          </p>
          <p className={styles.contactSupport}>
            Need help? <a href="/support">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginSelectorPage;
