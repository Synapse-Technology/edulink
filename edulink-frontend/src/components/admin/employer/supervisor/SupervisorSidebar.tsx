import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardCheck,
  X,
  Building2,
  AlertTriangle,
  Award,
  User as UserIcon,
  ShieldCheck,
  BriefcaseBusiness,
  Video,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

interface SupervisorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  description?: string;
  end?: boolean;
}

const SupervisorSidebar: React.FC<SupervisorSidebarProps> = ({
  isOpen = true,
  onClose,
  isMobile = false,
}) => {
  const { user } = useAuth();

  const NavItem = ({
    to,
    icon: Icon,
    label,
    description,
    end = false,
  }: NavItemProps) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => isMobile && onClose?.()}
      className={({ isActive }) =>
        `supervisor-nav-link ${isActive ? 'active' : ''}`
      }
    >
      <span className="nav-icon">
        <Icon size={18} />
      </span>

      <span className="nav-copy">
        <span>{label}</span>
        {description && <small>{description}</small>}
      </span>
    </NavLink>
  );

  return (
    <aside
      className="supervisor-sidebar"
      style={{
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      <div className="sidebar-brand">
        <Link to="/employer/supervisor/dashboard" className="brand-link">
          <div className="brand-mark">
            <Building2 size={24} />
          </div>

          <div>
            <h6>EduLink KE</h6>
            <span>Supervisor Portal</span>
          </div>
        </Link>

        {isMobile && (
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={22} />
          </button>
        )}
      </div>

      <div className="sidebar-context">
        <div className="context-icon">
          <BriefcaseBusiness size={18} />
        </div>

        <div>
          <strong>Employer Workspace</strong>
          <span>Internship supervision</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="nav-section">
          <span className="nav-section-title">Supervision</span>

          <nav className="nav flex-column">
            <NavItem
              to="/employer/supervisor/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              description="Overview & priorities"
              end
            />

            <NavItem
              to="/employer/supervisor/internships"
              icon={Users}
              label="My Interns"
              description="Assigned students"
            />

            <NavItem
              to="/employer/supervisor/assignments"
              icon={ClipboardCheck}
              label="Assignments"
              description="Accept requests"
            />

            <NavItem
              to="/employer/supervisor/check-ins"
              icon={Video}
              label="Check-ins"
              description="Remote supervision"
            />

            <NavItem
              to="/employer/supervisor/logbooks"
              icon={FileText}
              label="Logbook Reviews"
              description="Evidence approvals"
            />

            <NavItem
              to="/employer/supervisor/milestones"
              icon={Award}
              label="Milestones"
              description="Progress checkpoints"
            />

            <NavItem
              to="/employer/supervisor/incidents"
              icon={AlertTriangle}
              label="Incidents"
              description="Reports & escalations"
            />
          </nav>
        </div>

        <div className="nav-section">
          <span className="nav-section-title">Account</span>

          <nav className="nav flex-column">
            <NavItem
              to="/employer/supervisor/profile"
              icon={UserIcon}
              label="My Profile"
              description="Account details"
            />
          </nav>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="access-card">
          <div className="access-icon">
            <ShieldCheck size={17} />
          </div>

          <div>
            <strong>Supervisor Access</strong>
            <span>Evidence review enabled</span>
          </div>
        </div>

        <div className="user-card">
          <div className="user-avatar">
            {user?.firstName?.[0] || 'S'}
          </div>

          <div className="user-meta">
            <strong>{user?.firstName} {user?.lastName}</strong>
            <span>{user?.role === 'supervisor' ? 'Employer Supervisor' : user?.role}</span>
          </div>
        </div>
      </div>

      <style>{`
        .supervisor-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          z-index: 1050;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 18rem),
            linear-gradient(180deg, #0f172a 0%, #111827 55%, #020617 100%);
          color: #ffffff;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          transition: transform 0.25s ease;
        }

        .sidebar-brand {
          min-height: 78px;
          padding: 1.1rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #ffffff;
          text-decoration: none;
        }

        .brand-mark {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #bfdbfe;
        }

        .brand-link h6 {
          margin: 0;
          font-size: 0.98rem;
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        .brand-link span {
          display: block;
          margin-top: 0.12rem;
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.72rem;
          font-weight: 650;
        }

        .sidebar-close {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.08);
        }

        .sidebar-context {
          margin: 1rem;
          padding: 0.9rem;
          border-radius: 18px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .context-icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #bfdbfe;
          background: rgba(37, 99, 235, 0.18);
        }

        .sidebar-context strong,
        .access-card strong,
        .user-card strong {
          display: block;
          color: #ffffff;
          font-size: 0.84rem;
          font-weight: 800;
        }

        .sidebar-context span,
        .access-card span,
        .user-card span {
          display: block;
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.73rem;
          margin-top: 0.1rem;
        }

        .sidebar-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 0.3rem 0.85rem 1rem;
        }

        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.16);
          border-radius: 999px;
        }

        .nav-section {
          margin-bottom: 1.35rem;
        }

        .nav-section-title {
          display: block;
          padding: 0 0.65rem;
          margin-bottom: 0.55rem;
          color: rgba(255, 255, 255, 0.38);
          font-size: 0.68rem;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .supervisor-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.78rem 0.75rem;
          margin-bottom: 0.28rem;
          border-radius: 16px;
          color: rgba(255, 255, 255, 0.68);
          text-decoration: none;
          transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .supervisor-nav-link:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.07);
          transform: translateX(2px);
        }

        .supervisor-nav-link.active {
          color: #ffffff;
          background: rgba(37, 99, 235, 0.22);
          box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18);
        }

        .supervisor-nav-link.active::before {
          content: '';
          position: absolute;
          left: -0.85rem;
          top: 50%;
          width: 4px;
          height: 26px;
          border-radius: 999px;
          transform: translateY(-50%);
          background: #60a5fa;
        }

        .nav-icon {
          width: 36px;
          height: 36px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
        }

        .supervisor-nav-link.active .nav-icon {
          color: #bfdbfe;
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-copy span {
          display: block;
          font-size: 0.86rem;
          font-weight: 780;
          line-height: 1.2;
        }

        .nav-copy small {
          display: block;
          margin-top: 0.18rem;
          color: rgba(255, 255, 255, 0.42);
          font-size: 0.7rem;
          line-height: 1.2;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 23, 0.34);
        }

        .access-card {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          border-radius: 16px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.16);
        }

        .access-icon {
          width: 34px;
          height: 34px;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6ee7b7;
          background: rgba(16, 185, 129, 0.12);
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-width: 0;
        }

        .user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 850;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .user-meta {
          min-width: 0;
        }

        .user-meta strong,
        .user-meta span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 991.98px) {
          .supervisor-sidebar {
            box-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
          }
        }
      `}</style>
    </aside>
  );
};

export default SupervisorSidebar;
