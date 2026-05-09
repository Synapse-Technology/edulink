import React from 'react';
import { Link } from 'react-router-dom';
import {
  Key,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
} from 'lucide-react';

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
  onToggleSidebar,
}) => {
  const { admin } = useAdminAuth();

  const displayName = userName || admin?.first_name || 'Admin';
  const displayEmail = userEmail || admin?.email || '';
  const displayRole = (userRole || admin?.role || 'SYSTEM_ADMIN')
    .replace(/_/g, ' ')
    .toLowerCase();

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminRefreshToken');
    window.location.href = '/admin/login';
  };

  return (
    <>
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="admin-topbar-title">
            <span className="admin-topbar-kicker">
              <ShieldCheck size={14} />
              Platform operations
            </span>
            <h1>System Administration</h1>
          </div>
        </div>

        <div className="admin-topbar-right">
          <NotificationBell userId={admin?.id} linkTo="/admin/logs" />

          <div className="admin-topbar-divider" />

          <div className="dropdown">
            <button
              className="admin-user-trigger"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span className="admin-user-avatar">
                {initials || 'A'}
              </span>

              <span className="admin-user-meta">
                <strong>{displayName}</strong>
                <small>{displayRole}</small>
              </span>
            </button>

            <ul className="dropdown-menu dropdown-menu-end admin-user-menu">
              <li className="admin-user-menu-head">
                <strong>{displayName}</strong>
                {displayEmail && <span>{displayEmail}</span>}
              </li>

              <li>
                <Link
                  to="/admin/users"
                  className="dropdown-item admin-dropdown-item"
                >
                  <Settings size={16} />
                  Account Settings
                </Link>
              </li>

              <li>
                <Link
                  to="/admin/users"
                  className="dropdown-item admin-dropdown-item"
                >
                  <Key size={16} />
                  Security
                </Link>
              </li>

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button
                  type="button"
                  className="dropdown-item admin-dropdown-item danger"
                  onClick={onLogout || handleLogout}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <style>{`
        .admin-topbar {
          position: sticky;
          top: 0;
          z-index: 1020;
          height: 68px;
          padding: 0 22px;
          background: rgba(255, 255, 255, .94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .admin-topbar-left,
        .admin-topbar-right {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .admin-sidebar-toggle {
          width: 40px;
          height: 40px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .admin-sidebar-toggle:hover {
          background: #f8fafc;
        }

        .admin-topbar-title {
          min-width: 0;
        }

        .admin-topbar-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: .68rem;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .admin-topbar-kicker svg {
          color: #047857;
        }

        .admin-topbar-title h1 {
          color: #0f172a;
          font-size: 1.08rem;
          font-weight: 900;
          letter-spacing: -.025em;
          margin: 0;
        }

        .admin-topbar-divider {
          width: 1px;
          height: 30px;
          background: #e5e7eb;
        }

        .admin-user-trigger {
          border: 0;
          background: transparent;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .admin-user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #0f172a;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: .78rem;
          font-weight: 900;
          flex-shrink: 0;
        }

        .admin-user-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.15;
        }

        .admin-user-meta strong {
          color: #111827;
          font-size: .86rem;
          font-weight: 850;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-user-meta small {
          color: #64748b;
          font-size: .7rem;
          font-weight: 700;
          text-transform: capitalize;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-user-menu {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 18px 44px rgba(15,23,42,.12);
          padding: 8px;
          min-width: 240px;
        }

        .admin-user-menu-head {
          padding: 10px 12px 12px;
          border-bottom: 1px solid #eef2f7;
          margin-bottom: 6px;
        }

        .admin-user-menu-head strong {
          display: block;
          color: #111827;
          font-size: .9rem;
          font-weight: 850;
        }

        .admin-user-menu-head span {
          display: block;
          color: #64748b;
          font-size: .78rem;
          margin-top: 2px;
          max-width: 210px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-dropdown-item {
          border-radius: 10px;
          padding: 9px 10px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #334155;
          font-size: .86rem;
          font-weight: 700;
        }

        .admin-dropdown-item:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .admin-dropdown-item.danger {
          color: #b91c1c;
        }

        .admin-dropdown-item.danger:hover {
          background: #fef2f2;
          color: #991b1b;
        }

        @media (max-width: 991px) {
          .admin-sidebar-toggle {
            display: inline-flex;
          }
        }

        @media (max-width: 640px) {
          .admin-topbar {
            height: 62px;
            padding: 0 14px;
          }

          .admin-topbar-title h1 {
            font-size: .96rem;
          }

          .admin-topbar-kicker {
            display: none;
          }

          .admin-topbar-divider,
          .admin-user-meta {
            display: none;
          }

          .admin-user-avatar {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </>
  );
};

export default AdminHeader;