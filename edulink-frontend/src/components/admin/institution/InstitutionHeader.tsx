import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, User, Settings, LogOut, Search } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import TrustBadge, { type TrustLevel } from '../../common/TrustBadge';

interface InstitutionHeaderProps {
  onToggleSidebar: () => void;
  notificationCount?: number;
}

const InstitutionHeader: React.FC<InstitutionHeaderProps> = ({
  onToggleSidebar,
  notificationCount = 0,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/institution/login');
  };

  return (
    <nav
      className="sticky-top px-3 px-md-4"
      style={{
        width: '100%',
        height: 72,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e7eaf0',
        zIndex: 1020,
        left: 0,
        right: 0,
      }}
    >
      <div className="h-100 d-flex align-items-center justify-content-between gap-3">
        <button
          className="btn d-lg-none d-flex align-items-center justify-content-center"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <Menu size={21} />
        </button>

        <div className="d-none d-md-block">
          <div
            className="fw-semibold text-dark"
            style={{
              fontSize: '0.98rem',
              letterSpacing: '-0.02em',
            }}
          >
            Institution Portal
          </div>
          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
            Placement oversight and verification
          </div>
        </div>

        <div
          className="d-none d-xl-flex align-items-center ms-3 px-3"
          style={{
            height: 42,
            width: 340,
            borderRadius: 14,
            background: '#f6f7f9',
            border: '1px solid #edf0f4',
          }}
        >
          <Search size={16} className="text-muted me-2" />
          <span className="text-muted small">
            Search students, reports, applications...
          </span>
        </div>

        <div className="d-flex align-items-center gap-2 gap-md-3" style={{ marginLeft: 'auto' }}>
          {user && (
            <div className="d-none d-lg-block">
              <TrustBadge
                level={(user.trustLevel as TrustLevel) || 0}
                entityType="institution"
                size="sm"
              />
            </div>
          )}

          <div className="dropdown">
            <button
              className="btn position-relative d-flex align-items-center justify-content-center"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
              }}
            >
              <Bell size={18} className="text-secondary" />

              {notificationCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white">
                  {notificationCount}
                </span>
              )}
            </button>

            <div
              className="dropdown-menu dropdown-menu-end border-0 mt-2 p-0 overflow-hidden"
              style={{
                minWidth: 320,
                borderRadius: 18,
                boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)',
              }}
            >
              <div className="px-4 py-3 border-bottom bg-white">
                <div className="fw-semibold text-dark">Notifications</div>
                <small className="text-muted">
                  Updates from your institution workflow
                </small>
              </div>

              <div className="p-4 text-center text-muted">
                <small>No new notifications</small>
              </div>
            </div>
          </div>

          <div className="dropdown">
            <button
              className="btn text-decoration-none d-flex align-items-center gap-2 p-1"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
              }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: 36,
                  height: 36,
                  background: '#111827',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {user?.firstName?.charAt(0) || 'A'}
              </div>

              <div className="d-none d-md-block text-start pe-2">
                <p className="mb-0 small fw-semibold text-dark">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mb-0 text-muted" style={{ fontSize: '0.72rem' }}>
                  Institution Admin
                </p>
              </div>
            </button>

            <ul
              className="dropdown-menu dropdown-menu-end border-0 mt-2 p-2"
              style={{
                minWidth: 230,
                borderRadius: 18,
                boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)',
              }}
            >
              <li className="px-3 py-2">
                <p className="mb-0 small fw-semibold">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                  {user?.email}
                </p>
              </li>

              <li><hr className="dropdown-divider" /></li>

              <li>
                <button className="dropdown-item rounded-3 d-flex align-items-center py-2">
                  <User size={16} className="me-2 text-muted" />
                  Profile
                </button>
              </li>

              <li>
                <button className="dropdown-item rounded-3 d-flex align-items-center py-2">
                  <Settings size={16} className="me-2 text-muted" />
                  Settings
                </button>
              </li>

              <li><hr className="dropdown-divider" /></li>

              <li>
                <button
                  className="dropdown-item rounded-3 d-flex align-items-center py-2 text-danger"
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

export default InstitutionHeader;