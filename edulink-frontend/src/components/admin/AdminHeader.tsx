import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings, Key, Menu } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface AdminHeaderProps {
  userEmail?: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  userEmail = '', 
  userName = '',
  userRole = '',
  onLogout,
  onToggleSidebar
}) => {
  const { admin } = useAdminAuth();
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminRefreshToken');
    window.location.href = '/admin/login';
  };

  return (
    <nav className="navbar navbar-expand navbar-light bg-white border-bottom sticky-top px-3">
      <div className="d-flex align-items-center w-100">
        <button 
          className="btn btn-link text-dark p-0 me-3 d-lg-none" 
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} />
        </button>

        <h5 className="mb-0 d-none d-md-block text-primary fw-bold">System Administration</h5>
        
        <div className="d-flex align-items-center ms-auto gap-3">
          {/* Notifications */}
          <NotificationBell userId={admin?.id} linkTo="/admin/logs" />

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
                <span className="fw-bold">{userName.charAt(0)}</span>
              </div>
              <div className="d-none d-md-block text-start">
                <div className="fw-semibold text-dark small">{userName}</div>
                <div className="text-muted small" style={{fontSize: '0.7rem'}}>{userRole.replace('_', ' ')}</div>
              </div>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
              <li className="px-3 py-2 border-bottom mb-2 bg-light">
                <div className="fw-semibold text-dark">{userName}</div>
                <div className="small text-muted text-truncate" style={{maxWidth: '200px'}}>{userEmail}</div>
              </li>
              <li>
                <Link to="/admin/users" className="dropdown-item py-2 d-flex align-items-center">
                  <Settings size={16} className="me-2 text-secondary" />
                  Account Settings
                </Link>
              </li>
              <li>
                <Link to="/admin/users" className="dropdown-item py-2 d-flex align-items-center">
                  <Key size={16} className="me-2 text-secondary" />
                  Security
                </Link>
              </li>
              <li><hr className="dropdown-divider my-2" /></li>
              <li>
                <button
                  className="dropdown-item py-2 d-flex align-items-center text-danger"
                  onClick={onLogout || handleLogout}
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

export default AdminHeader;
