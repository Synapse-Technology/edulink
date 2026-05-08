import React from 'react';
import {
  Menu,
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface SupervisorHeaderProps {
  onMobileMenuClick: () => void;
}

export const SupervisorHeader: React.FC<SupervisorHeaderProps> = ({
  onMobileMenuClick,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/employer/login');
  };

  return (
    <header className="supervisor-header">
      <div className="container-fluid h-100 px-3 px-lg-4">
        <div className="d-flex align-items-center justify-content-between h-100 gap-3">
          <div className="d-flex align-items-center gap-3 flex-grow-1">
            <button
              className="mobile-menu-btn d-lg-none"
              onClick={onMobileMenuClick}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="supervisor-search d-none d-md-flex">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search interns, logbooks, incidents..."
              />
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button className="header-icon-btn position-relative" aria-label="Notifications">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <div className="header-divider d-none d-md-block" />

            <div className="dropdown">
              <button
                className="profile-trigger"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="profile-text d-none d-sm-block">
                  <div>{user?.firstName} {user?.lastName}</div>
                  <span>Employer Supervisor</span>
                </div>

                <div className="profile-avatar">
                  {user?.firstName?.[0] || <User size={17} />}
                </div>
              </button>

              <ul className="dropdown-menu dropdown-menu-end supervisor-dropdown">
                <li className="dropdown-user">
                  <div className="dropdown-avatar">
                    {user?.firstName?.[0] || 'S'}
                  </div>
                  <div>
                    <strong>{user?.firstName} {user?.lastName}</strong>
                    <span>Supervisor Account</span>
                  </div>
                </li>

                <li><hr className="dropdown-divider" /></li>

                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => navigate('/employer/supervisor/profile')}
                  >
                    <Settings size={15} />
                    Profile Settings
                  </button>
                </li>

                <li>
                  <button className="dropdown-item">
                    <ShieldCheck size={15} />
                    Access Level: Supervisor
                  </button>
                </li>

                <li><hr className="dropdown-divider" /></li>

                <li>
                  <button
                    className="dropdown-item text-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .supervisor-header {
          position: sticky;
          top: 0;
          height: 68px;
          z-index: 1040;
          background: rgba(255, 255, 255, 0.88);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(16px);
        }

        .mobile-menu-btn,
        .header-icon-btn {
          width: 40px;
          height: 40px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 14px;
          background: #ffffff;
          color: #334155;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .supervisor-search {
          width: min(420px, 100%);
          height: 42px;
          align-items: center;
          gap: 0.65rem;
          padding: 0 0.9rem;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.06);
          color: #94a3b8;
        }

        .supervisor-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 0.88rem;
          color: #0f172a;
        }

        .supervisor-search input::placeholder {
          color: #94a3b8;
        }

        .notification-dot {
          position: absolute;
          top: 9px;
          right: 10px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #ef4444;
          border: 2px solid #ffffff;
        }

        .header-divider {
          width: 1px;
          height: 28px;
          background: rgba(15, 23, 42, 0.08);
        }

        .profile-trigger {
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.25rem;
        }

        .profile-text {
          text-align: right;
          line-height: 1.2;
        }

        .profile-text div {
          color: #0f172a;
          font-size: 0.86rem;
          font-weight: 800;
        }

        .profile-text span {
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 600;
        }

        .profile-avatar,
        .dropdown-avatar {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 800;
          border: 1px solid rgba(37, 99, 235, 0.12);
        }

        .supervisor-dropdown {
          width: 260px;
          padding: 0.65rem;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
        }

        .dropdown-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem;
        }

        .dropdown-user strong {
          display: block;
          color: #0f172a;
          font-size: 0.88rem;
        }

        .dropdown-user span {
          display: block;
          color: #64748b;
          font-size: 0.76rem;
        }

        .supervisor-dropdown .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.65rem 0.7rem;
          border-radius: 12px;
          font-size: 0.86rem;
          font-weight: 650;
          color: #334155;
        }

        .supervisor-dropdown .dropdown-item:hover {
          background: #f8fafc;
        }
      `}</style>
    </header>
  );
};

export default SupervisorHeader;