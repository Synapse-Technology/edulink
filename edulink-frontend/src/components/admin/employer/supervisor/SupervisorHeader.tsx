import React from 'react';
import { Menu, Bell, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SupervisorHeaderProps {
  onMobileMenuClick: () => void;
}

const SupervisorHeader: React.FC<SupervisorHeaderProps> = ({ 
  onMobileMenuClick 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/employer/login');
  };

  return (
    <header className="bg-white border-bottom sticky-top" style={{ height: '64px', zIndex: 1040 }}>
      <div className="container-fluid h-100 px-4">
        <div className="d-flex align-items-center justify-content-between h-100">
          {/* Left: Mobile Toggle & Search */}
          <div className="d-flex align-items-center gap-3">
            <button 
              className="btn btn-link text-dark p-0 d-lg-none"
              onClick={onMobileMenuClick}
            >
              <Menu size={24} />
            </button>
            
            <div className="d-none d-md-block position-relative" style={{ width: '300px' }}>
              <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
              <input 
                type="text" 
                className="form-control bg-light border-0 ps-5" 
                placeholder="Search interns, logbooks..." 
              />
            </div>
          </div>

          {/* Right: Actions & Profile */}
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-link text-dark p-1 position-relative">
              <Bell size={20} />
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                <span className="visually-hidden">New alerts</span>
              </span>
            </button>

            <div className="vr h-50 mx-2 text-muted"></div>

            <div className="dropdown">
              <button 
                className="btn btn-link text-dark text-decoration-none p-0 d-flex align-items-center gap-2"
                data-bs-toggle="dropdown"
              >
                <div className="text-end d-none d-sm-block">
                  <div className="fw-medium small">{user?.firstName} {user?.lastName}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Supervisor</div>
                </div>
                <div className="avatar bg-light text-primary rounded-circle d-flex align-items-center justify-content-center border" style={{ width: '36px', height: '36px' }}>
                  <User size={18} />
                </div>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2">
                <li><h6 className="dropdown-header">Account</h6></li>
                <li><button className="dropdown-item small" onClick={() => navigate('/employer/supervisor/profile')}>Profile Settings</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item small text-danger d-flex align-items-center gap-2" onClick={handleLogout}>
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SupervisorHeader;