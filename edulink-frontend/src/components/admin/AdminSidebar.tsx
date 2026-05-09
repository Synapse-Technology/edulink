import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  History,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen = true,
  onClose,
  isMobile = false,
}) => {
  const sidebarStyle = {
    width: '280px',
    zIndex: 1045,
    transform:
      isMobile && !isOpen
        ? 'translateX(-100%)'
        : 'translateX(0)',
    transition: 'transform .28s ease',
  };

  const NavItem = ({
    to,
    icon: Icon,
    label,
    badge,
    end = false,
  }: {
    to: string;
    icon: any;
    label: string;
    badge?: string | number;
    end?: boolean;
  }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => isMobile && onClose?.()}
      className={({ isActive }) =>
        `ops-sidebar-link ${isActive ? 'active' : ''}`
      }
    >
      <div className="ops-sidebar-link-left">
        <span className="ops-sidebar-icon">
          <Icon size={17} />
        </span>

        <span className="ops-sidebar-label">
          {label}
        </span>
      </div>

      {badge ? (
        <span className="ops-sidebar-badge">
          {badge}
        </span>
      ) : (
        <ChevronRight size={14} className="ops-sidebar-arrow" />
      )}
    </NavLink>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div
          className="ops-sidebar-backdrop"
          onClick={onClose}
        />
      )}

      <aside
        className={`ops-sidebar ${
          isMobile ? 'mobile' : ''
        }`}
        style={sidebarStyle}
      >
        {/* Header */}
        <div className="ops-sidebar-header">
          <Link
            to="/dashboard/admin"
            className="ops-sidebar-brand"
          >
            <div className="ops-sidebar-brand-icon">
              <ShieldCheck size={18} />
            </div>

            <div className="ops-sidebar-brand-text">
              <strong>EduLink</strong>
              <span>Platform Operations</span>
            </div>
          </Link>

          {isMobile && (
            <button
              type="button"
              className="ops-sidebar-close"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="ops-sidebar-scroll">
          <div className="ops-sidebar-group">
            <span className="ops-sidebar-group-title">
              Overview
            </span>

            <NavItem
              to="/dashboard/admin"
              icon={LayoutDashboard}
              label="Operations Center"
              end
            />
          </div>

          <div className="ops-sidebar-group">
            <span className="ops-sidebar-group-title">
              Platform
            </span>

            <NavItem
              to="/admin/users"
              icon={Users}
              label="Users"
            />

            <NavItem
              to="/admin/institutions"
              icon={Building2}
              label="Institutions"
            />

            <NavItem
              to="/admin/employers/requests"
              icon={Briefcase}
              label="Employers"
            />
          </div>

          <div className="ops-sidebar-group">
            <span className="ops-sidebar-group-title">
              Operations
            </span>

            <NavItem
              to="/admin/support"
              icon={LifeBuoy}
              label="Support & Care"
            />

            <NavItem
              to="/admin/staff"
              icon={ShieldCheck}
              label="Platform Staff"
            />
          </div>

          <div className="ops-sidebar-group">
            <span className="ops-sidebar-group-title">
              System
            </span>

            <NavItem
              to="/admin/analytics"
              icon={BarChart3}
              label="Analytics"
            />

            <NavItem
              to="/admin/logs"
              icon={History}
              label="Audit Logs"
            />

            <NavItem
              to="/admin/health"
              icon={Activity}
              label="System Health"
            />

            <NavItem
              to="/admin/reports"
              icon={FileText}
              label="Reports"
            />

            <NavItem
              to="/admin/settings"
              icon={Settings}
              label="Platform Settings"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="ops-sidebar-footer">
          <div className="ops-sidebar-status">
            <div className="ops-status-dot" />

            <div>
              <span>Platform status</span>
              <strong>Operational</strong>
            </div>
          </div>
        </div>

        <style>{`
          .ops-sidebar-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15,23,42,.42);
            z-index: 1040;
            backdrop-filter: blur(2px);
          }

          .ops-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            background: #0f172a;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            border-right: 1px solid rgba(255,255,255,.06);
          }

          .ops-sidebar.mobile {
            box-shadow: 0 24px 64px rgba(0,0,0,.28);
          }

          .ops-sidebar-header {
            height: 72px;
            padding: 0 18px;
            border-bottom: 1px solid rgba(255,255,255,.06);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
          }

          .ops-sidebar-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
          }

          .ops-sidebar-brand-icon {
            width: 40px;
            height: 40px;
            border-radius: 14px;
            background: linear-gradient(
              135deg,
              #059669,
              #047857
            );
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            flex-shrink: 0;
          }

          .ops-sidebar-brand-text {
            display: flex;
            flex-direction: column;
            line-height: 1.05;
          }

          .ops-sidebar-brand-text strong {
            color: #ffffff;
            font-size: .95rem;
            font-weight: 900;
            letter-spacing: -.03em;
          }

          .ops-sidebar-brand-text span {
            color: #94a3b8;
            font-size: .7rem;
            font-weight: 700;
            margin-top: 4px;
            letter-spacing: .04em;
            text-transform: uppercase;
          }

          .ops-sidebar-close {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: 0;
            background: rgba(255,255,255,.06);
            color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ops-sidebar-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 18px 14px;
          }

          .ops-sidebar-scroll::-webkit-scrollbar {
            width: 5px;
          }

          .ops-sidebar-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,.08);
            border-radius: 999px;
          }

          .ops-sidebar-group {
            margin-bottom: 26px;
          }

          .ops-sidebar-group-title {
            display: block;
            padding: 0 12px;
            margin-bottom: 10px;
            color: #64748b;
            font-size: .68rem;
            font-weight: 850;
            letter-spacing: .08em;
            text-transform: uppercase;
          }

          .ops-sidebar-link {
            min-height: 48px;
            padding: 0 12px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            text-decoration: none;
            color: #cbd5e1;
            transition:
              background .18s ease,
              color .18s ease,
              transform .18s ease;
            margin-bottom: 4px;
          }

          .ops-sidebar-link:hover {
            background: rgba(255,255,255,.05);
            color: #ffffff;
          }

          .ops-sidebar-link.active {
            background: linear-gradient(
              135deg,
              rgba(5,150,105,.18),
              rgba(5,150,105,.08)
            );
            color: #ffffff;
            border: 1px solid rgba(16,185,129,.18);
          }

          .ops-sidebar-link-left {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .ops-sidebar-icon {
            width: 34px;
            height: 34px;
            border-radius: 11px;
            background: rgba(255,255,255,.05);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .ops-sidebar-link.active .ops-sidebar-icon {
            background: rgba(16,185,129,.16);
            color: #34d399;
          }

          .ops-sidebar-label {
            font-size: .88rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .ops-sidebar-arrow {
            opacity: .38;
            flex-shrink: 0;
          }

          .ops-sidebar-badge {
            min-width: 20px;
            height: 20px;
            border-radius: 999px;
            padding: 0 6px;
            background: #dc2626;
            color: #ffffff;
            font-size: .7rem;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .ops-sidebar-footer {
            padding: 14px;
            border-top: 1px solid rgba(255,255,255,.06);
            flex-shrink: 0;
          }

          .ops-sidebar-status {
            min-height: 52px;
            border-radius: 14px;
            background: rgba(255,255,255,.04);
            border: 1px solid rgba(255,255,255,.06);
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 0 14px;
          }

          .ops-status-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #22c55e;
            box-shadow: 0 0 0 4px rgba(34,197,94,.14);
            flex-shrink: 0;
          }

          .ops-sidebar-status span {
            display: block;
            color: #94a3b8;
            font-size: .7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .05em;
          }

          .ops-sidebar-status strong {
            display: block;
            color: #ffffff;
            font-size: .86rem;
            font-weight: 850;
            margin-top: 2px;
          }

          @media (max-width: 640px) {
            .ops-sidebar {
              width: 86vw !important;
              max-width: 320px;
            }
          }
        `}</style>
      </aside>
    </>
  );
};

export default AdminSidebar;