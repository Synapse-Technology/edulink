import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  CheckSquare,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { employerService } from '../../../services/employer/employerService';

interface EmployerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const STYLES = `
  .es-sidebar {
    width: 280px;
    z-index: 1050;
    background:
      radial-gradient(circle at top left, rgba(26,92,255,0.16), transparent 34%),
      var(--el-sidebar);
    border-right: 1px solid rgba(255,255,255,0.08);
    color: #fff;
    transition: transform 0.28s ease;
  }

  .es-brand {
    padding: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  .es-brand-link {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #fff;
    text-decoration: none;
  }

  .es-logo {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    background: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 12px 28px rgba(26,92,255,0.28);
  }

  .es-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .es-brand-title {
    font-size: 15px;
    font-weight: 800;
    line-height: 1.1;
    margin: 0;
  }

  .es-brand-sub {
    font-size: 11px;
    color: rgba(255,255,255,0.54);
    margin: 3px 0 0;
  }

  .es-close {
    margin-left: auto;
    border: none;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.7);
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .es-nav-wrap {
    padding: 18px 14px;
    overflow-y: auto;
  }

  .es-section-label {
    display: block;
    color: rgba(255,255,255,0.38);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 18px 10px 9px;
  }

  .es-section-label:first-child {
    margin-top: 0;
  }

  .es-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .es-nav-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    color: rgba(255,255,255,0.62);
    text-decoration: none;
    border-radius: 15px;
    padding: 11px 12px;
    font-size: 13px;
    font-weight: 650;
    transition: color 0.15s ease, background 0.15s ease, transform 0.12s ease;
  }

  .es-nav-link:hover {
    color: #fff;
    background: rgba(255,255,255,0.07);
  }

  .es-nav-link.active {
    color: #fff;
    background: rgba(26,92,255,0.18);
    box-shadow: inset 0 0 0 1px rgba(77,127,255,0.28);
  }

  .es-nav-link.active::before {
    content: '';
    position: absolute;
    left: -14px;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 999px;
    background: var(--el-accent);
  }

  .es-trust-card {
    margin: 10px 14px 16px;
    padding: 14px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(26,92,255,0.16), rgba(255,255,255,0.05));
    border: 1px solid rgba(255,255,255,0.08);
  }

  .es-trust-top {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #fff;
    font-size: 12px;
    font-weight: 750;
    margin-bottom: 6px;
  }

  .es-trust-copy {
    color: rgba(255,255,255,0.52);
    font-size: 11px;
    line-height: 1.5;
    margin: 0;
  }

  .es-footer {
    padding: 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.18);
  }

  .es-user {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .es-user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 13px;
    background: rgba(255,255,255,0.12);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    flex-shrink: 0;
  }

  .es-user-name {
    color: #fff;
    font-size: 13px;
    font-weight: 750;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .es-user-email {
    color: rgba(255,255,255,0.48);
    font-size: 11px;
    margin: 2px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const EmployerSidebar: React.FC<EmployerSidebarProps> = ({
  isOpen = true,
  onClose,
  isMobile = false,
}) => {
  const { user } = useAuth();
  const [employerLogo, setEmployerLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchEmployerLogo = async () => {
      if (user?.role === 'employer_admin' || user?.role === 'supervisor') {
        try {
          const employer = await employerService.getCurrentEmployer();
          setEmployerLogo(employer.logo || null);
        } catch (error) {
          console.error('Failed to fetch employer logo:', error);
        }
      }
    };

    fetchEmployerLogo();
  }, [user]);

  const sidebarStyle: React.CSSProperties = {
    transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
  };

  const NavItem = ({
    to,
    icon: Icon,
    label,
    end = false,
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
    end?: boolean;
  }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `es-nav-link${isActive ? ' active' : ''}`}
      onClick={() => isMobile && onClose?.()}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside
      className={`es-sidebar position-fixed top-0 start-0 d-flex flex-column h-100 ${
        isMobile ? 'shadow-lg' : ''
      }`}
      style={sidebarStyle}
    >
      <style>{STYLES}</style>

      <div className="es-brand">
        <div className="d-flex align-items-center">
          <Link to="/employer/dashboard" className="es-brand-link">
            <div className="es-logo">
              {employerLogo ? (
                <img src={employerLogo} alt="Employer logo" />
              ) : (
                <Building2 size={23} />
              )}
            </div>

            <div>
              <p className="es-brand-title">Employer Console</p>
              <p className="es-brand-sub">EduLink operations</p>
            </div>
          </Link>

          {isMobile && (
            <button type="button" className="es-close" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="es-nav-wrap flex-grow-1">
        <span className="es-section-label">Command</span>
        <nav className="es-nav">
          <NavItem to="/employer/dashboard" icon={LayoutDashboard} label="Overview" end />
          <NavItem to="/employer/dashboard/opportunities" icon={Briefcase} label="Opportunities" />
          <NavItem to="/employer/dashboard/applications" icon={FileText} label="Applications" />
        </nav>

        <span className="es-section-label">Talent Operations</span>
        <nav className="es-nav">
          <NavItem to="/employer/dashboard/interns" icon={GraduationCap} label="Interns" />
          <NavItem to="/employer/dashboard/supervisors" icon={Users} label="Supervisors" />
          {user?.role === 'employer_admin' && (
            <NavItem to="/employer/dashboard/reviews" icon={CheckSquare} label="Reviews & Approvals" />
          )}
        </nav>

        {user?.role === 'employer_admin' && (
          <>
            <span className="es-section-label">Administration</span>
            <nav className="es-nav">
              <NavItem to="/employer/dashboard/profile-requests" icon={UserCog} label="Profile Requests" />
              <NavItem to="/employer/dashboard/profile" icon={Building2} label="Company Profile" />
              <NavItem to="/employer/dashboard/settings" icon={Settings} label="Settings" />
            </nav>
          </>
        )}
      </div>

      <div className="es-trust-card">
        <div className="es-trust-top">
          <ShieldCheck size={15} />
          Employer trust layer
        </div>
        <p className="es-trust-copy">
          Verified employers get better applicant confidence and smoother institution workflows.
        </p>
      </div>

      <div className="es-footer">
        <div className="es-user">
          <div className="es-user-avatar">
            {user?.firstName?.charAt(0) || 'E'}
          </div>
          <div className="min-w-0">
            <p className="es-user-name">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="es-user-email">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EmployerSidebar;