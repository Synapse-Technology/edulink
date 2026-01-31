import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, User, Settings, HelpCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import TrustBadge, { type TrustLevel } from '../../common/TrustBadge';
import { employerService } from '../../../services/employer/employerService';
import type { Employer } from '../../../services/employer/employerService';

interface EmployerHeaderProps {
  onToggleSidebar: () => void;
  notificationCount?: number;
}

const EmployerHeader: React.FC<EmployerHeaderProps> = ({ 
  onToggleSidebar,
  notificationCount = 0
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentEmployer, setCurrentEmployer] = useState<Employer | null>(null);

  useEffect(() => {
    const fetchEmployer = async () => {
      try {
        const employer = await employerService.getCurrentEmployer();
        setCurrentEmployer(employer);
      } catch (error) {
        console.warn('Failed to fetch employer context for header', error);
      }
    };
    fetchEmployer();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/employer/login');
  };

  const trustLevel = currentEmployer?.trust_level ?? (user?.trustLevel as number) ?? 0;

  return (
    <nav className="navbar navbar-expand navbar-light bg-white border-bottom sticky-top px-3" style={{ height: '64px' }}>
      <div className="d-flex align-items-center w-100">
        <button 
          className="btn btn-link text-dark p-0 me-3 d-lg-none" 
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} />
        </button>

        <h5 className="mb-0 d-none d-md-block text-primary fw-bold">Employer Portal</h5>
        
        <div className="d-flex align-items-center ms-auto gap-3">
          {/* Trust Badge */}
          {(user || currentEmployer) && (
            <div className="d-none d-md-block">
               <TrustBadge 
                 level={trustLevel as TrustLevel} 
                 entityType="employer" 
                 size="sm"
               />
            </div>
          )}

          {/* Notifications */}
          <div className="dropdown">
            <button 
              className="btn btn-light rounded-circle position-relative p-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <Bell size={20} className="text-secondary" />
              {notificationCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white">
                  {notificationCount}
                  <span className="visually-hidden">unread messages</span>
                </span>
              )}
            </button>
            <div className="dropdown-menu dropdown-menu-end shadow border-0" style={{minWidth: '300px'}}>
              <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light rounded-top">
                <span className="fw-semibold small text-uppercase text-muted">Notifications</span>
                {notificationCount > 0 && <span className="badge bg-primary rounded-pill">{notificationCount} New</span>}
              </div>
              <div className="p-4 text-center text-muted">
                <small>No new notifications</small>
              </div>
            </div>
          </div>

          <div className="vr h-50 my-auto text-muted opacity-25"></div>

          {/* User Menu */}
          <div className="dropdown">
            <button 
              className="btn btn-link text-decoration-none dropdown-toggle d-flex align-items-center p-0"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 shadow-sm" style={{width: '36px', height: '36px'}}>
                <span className="fw-bold">{user?.firstName?.charAt(0) || 'U'}</span>
              </div>
              <div className="d-none d-md-block text-start">
                <p className="mb-0 small fw-bold text-dark">{user?.firstName} {user?.lastName}</p>
                <p className="mb-0 x-small text-muted" style={{fontSize: '0.75rem'}}>
                  {user?.role === 'employer_admin' ? 'Administrator' : 'Supervisor'}
                </p>
              </div>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
              <li>
                <div className="px-3 py-2 d-md-none">
                  <p className="mb-0 small fw-bold">{user?.firstName} {user?.lastName}</p>
                  <p className="mb-0 x-small text-muted">{user?.email}</p>
                  <div className="mt-2">
                    <TrustBadge 
                      level={trustLevel as TrustLevel} 
                      entityType="employer" 
                      size="sm"
                    />
                  </div>
                </div>
              </li>
              <li><hr className="dropdown-divider d-md-none" /></li>
              <li>
                <Link className="dropdown-item d-flex align-items-center py-2" to="/employer/dashboard/profile">
                  <User size={16} className="me-2 text-muted" />
                  Profile
                </Link>
              </li>
              <li>
                <Link className="dropdown-item d-flex align-items-center py-2" to="/employer/dashboard/settings">
                  <Settings size={16} className="me-2 text-muted" />
                  Settings
                </Link>
              </li>
              <li>
                <Link className="dropdown-item d-flex align-items-center py-2" to="/employer/dashboard/support">
                  <HelpCircle size={16} className="me-2 text-muted" />
                  Help & Support
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item d-flex align-items-center py-2 text-danger" onClick={handleLogout}>
                  <LogOut size={16} className="me-2" />
                  Sign Out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default EmployerHeader;
