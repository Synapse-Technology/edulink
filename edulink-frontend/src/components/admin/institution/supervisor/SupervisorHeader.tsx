import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, User, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';

interface SupervisorHeaderProps {
  onToggleSidebar: () => void;
  notificationCount?: number;
}

const SupervisorHeader: React.FC<SupervisorHeaderProps> = ({ 
  onToggleSidebar,
  notificationCount = 0
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/institution/login');
  };

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

        <h5 className="mb-0 d-none d-md-block text-primary fw-bold">Supervisor Portal</h5>
        
        <div className="d-flex align-items-center ms-auto gap-3">
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
              <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-2 shadow-sm" style={{width: '36px', height: '36px'}}>
                <span className="fw-bold">{user?.firstName?.charAt(0) || 'S'}</span>
              </div>
              <div className="d-none d-md-block text-start">
                <p className="mb-0 small fw-bold text-dark">{user?.firstName} {user?.lastName}</p>
                <p className="mb-0 x-small text-muted" style={{fontSize: '0.75rem'}}>
                  Supervisor
                </p>
              </div>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
              <li>
                <div className="px-3 py-2 d-md-none">
                  <p className="mb-0 small fw-bold">{user?.firstName} {user?.lastName}</p>
                  <p className="mb-0 x-small text-muted">{user?.email}</p>
                </div>
              </li>
              <li><hr className="dropdown-divider d-md-none" /></li>
              <li>
                <button className="dropdown-item d-flex align-items-center py-2">
                  <User size={16} className="me-2 text-muted" />
                  Profile
                </button>
              </li>
              <li>
                <button className="dropdown-item d-flex align-items-center py-2">
                  <Settings size={16} className="me-2 text-muted" />
                  Settings
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button 
                  className="dropdown-item d-flex align-items-center py-2 text-danger"
                  onClick={handleLogout}
                >
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

export default SupervisorHeader;
