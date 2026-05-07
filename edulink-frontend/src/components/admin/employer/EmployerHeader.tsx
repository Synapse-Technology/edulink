import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import TrustBadge, { type TrustLevel } from '../../common/TrustBadge';
import { employerService } from '../../../services/employer/employerService';
import type { Employer } from '../../../services/employer/employerService';

interface EmployerHeaderProps {
  onToggleSidebar: () => void;
  notificationCount?: number;
}

const STYLES = `
  .eh-header {
    position: sticky;
    top: 0;
    z-index: 1030;
    min-height: 72px;
    padding: 14px 28px;
    background: color-mix(in srgb, var(--el-surface), transparent 4%);
    border-bottom: 1px solid var(--el-border);
    backdrop-filter: blur(16px);
  }

  .eh-inner {
    display: flex;
    align-items: center;
    gap: 18px;
    width: 100%;
  }

  .eh-menu-btn,
  .eh-icon-btn {
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
  }

  .eh-menu-btn {
    width: 42px;
    height: 42px;
  }

  .eh-icon-btn {
    width: 40px;
    height: 40px;
    position: relative;
  }

  .eh-menu-btn:hover,
  .eh-icon-btn:hover {
    background: var(--el-surface);
    border-color: var(--el-accent);
    transform: translateY(-1px);
  }

  .eh-context {
    min-width: 0;
  }

  .eh-kicker {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .eh-title {
    color: var(--el-ink);
    font-size: 16px;
    font-weight: 750;
    margin: 0;
    line-height: 1.2;
  }

  .eh-search {
    width: min(360px, 34vw);
    position: relative;
    margin-left: auto;
  }

  .eh-search svg {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--el-muted);
  }

  .eh-search input {
    width: 100%;
    min-height: 40px;
    border-radius: 14px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    padding: 10px 14px 10px 38px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .eh-search input:focus {
    border-color: var(--el-accent);
    box-shadow: 0 0 0 3px var(--el-accent-soft);
    background: var(--el-surface);
  }

  .eh-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .eh-notification-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--el-surface);
  }

  .eh-user-btn {
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    border-radius: 16px;
    padding: 6px 10px 6px 6px;
    color: var(--el-ink);
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .eh-user-btn:hover {
    background: var(--el-surface);
    border-color: var(--el-border);
  }

  .eh-avatar {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    background: var(--el-accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .eh-user-meta {
    text-align: left;
    line-height: 1.1;
  }

  .eh-user-name {
    font-size: 13px;
    font-weight: 750;
    color: var(--el-ink);
    margin: 0 0 3px;
  }

  .eh-user-role {
    font-size: 11px;
    color: var(--el-muted);
    margin: 0;
  }

  .eh-dropdown {
    border: 1px solid var(--el-border);
    background: var(--el-surface);
    border-radius: 16px;
    box-shadow: var(--el-shadow);
    padding: 8px;
    min-width: 230px;
  }

  .eh-dropdown .dropdown-item {
    border-radius: 12px;
    padding: 9px 10px;
    font-size: 13px;
    color: var(--el-ink);
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .eh-dropdown .dropdown-item:hover {
    background: var(--el-surface-2);
  }

  .eh-dropdown .dropdown-divider {
    border-color: var(--el-border);
  }

  @media (max-width: 992px) {
    .eh-header {
      padding: 12px 18px;
    }

    .eh-search {
      display: none;
    }

    .eh-context {
      flex: 1;
    }
  }

  @media (max-width: 640px) {
    .eh-user-meta,
    .eh-user-btn svg,
    .eh-trust {
      display: none;
    }

    .eh-user-btn {
      padding: 5px;
    }
  }
`;

const pageTitles: Record<string, string> = {
  '/employer/dashboard': 'Dashboard',
  '/employer/dashboard/opportunities': 'Opportunities',
  '/employer/dashboard/applications': 'Applications',
  '/employer/dashboard/interns': 'Interns',
  '/employer/dashboard/supervisors': 'Supervisors',
  '/employer/dashboard/profile-requests': 'Profile Requests',
  '/employer/dashboard/reviews': 'Reviews & Approvals',
  '/employer/dashboard/profile': 'Company Profile',
  '/employer/dashboard/settings': 'Settings',
  '/employer/dashboard/support': 'Support',
};

const EmployerHeader: React.FC<EmployerHeaderProps> = ({
  onToggleSidebar,
  notificationCount = 0,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const pageTitle = pageTitles[location.pathname] || 'Employer Console';

  return (
    <header className="eh-header">
      <style>{STYLES}</style>

      <div className="eh-inner">
        <button
          type="button"
          className="eh-menu-btn d-lg-none"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="eh-context">
          <div className="eh-kicker">
            <ShieldCheck size={12} />
            Employer Console
          </div>
          <h1 className="eh-title">{pageTitle}</h1>
        </div>

        <div className="eh-search">
          <Search size={15} />
          <input placeholder="Search applicants, roles, interns..." />
        </div>

        <div className="eh-actions">
          {(user || currentEmployer) && (
            <div className="eh-trust">
              <TrustBadge
                level={trustLevel as TrustLevel}
                entityType="employer"
                size="sm"
              />
            </div>
          )}

          <div className="dropdown">
            <button
              className="eh-icon-btn"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="eh-notification-dot">{notificationCount}</span>
              )}
            </button>

            <div className="dropdown-menu dropdown-menu-end eh-dropdown">
              <div className="px-2 py-2">
                <strong style={{ fontSize: 13 }}>Notifications</strong>
                <p className="mb-0" style={{ fontSize: 12, color: 'var(--el-muted)' }}>
                  No new employer updates.
                </p>
              </div>
            </div>
          </div>

          <div className="dropdown">
            <button
              className="eh-user-btn"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span className="eh-avatar">
                {user?.firstName?.charAt(0) || 'E'}
              </span>

              <span className="eh-user-meta">
                <p className="eh-user-name">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="eh-user-role">
                  {user?.role === 'employer_admin' ? 'Administrator' : 'Supervisor'}
                </p>
              </span>

              <ChevronDown size={15} />
            </button>

            <ul className="dropdown-menu dropdown-menu-end eh-dropdown mt-2">
              <li>
                <Link className="dropdown-item" to="/employer/dashboard/profile">
                  <User size={15} />
                  Profile
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/employer/dashboard/settings">
                  <Settings size={15} />
                  Settings
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/employer/dashboard/support">
                  <HelpCircle size={15} />
                  Help & Support
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={handleLogout}>
                  <LogOut size={15} />
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EmployerHeader;