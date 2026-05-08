import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart2,
  Users,
  BookOpen,
  FileText,
  Settings,
  School,
  X,
  ClipboardList,
  GraduationCap,
  Award,
  ClipboardCheck,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { institutionService } from '../../../services/institution/institutionService';

interface InstitutionSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const SIDEBAR_WIDTH = 280;

const InstitutionSidebar: React.FC<InstitutionSidebarProps> = ({
  isOpen = true,
  onClose,
  isMobile = false,
}) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const [institutionLogo, setInstitutionLogo] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    const fetchInstitutionLogo = async () => {
      try {
        const profile = await institutionService.getProfile();
        setInstitutionLogo(profile.logo || null);
      } catch (error) {
        console.error('Failed to fetch institution logo:', error);
      }
    };

    fetchInstitutionLogo();
  }, []);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/institution/dashboard' },
    { id: 'reports', label: 'Reports', icon: BarChart2, path: '/institution/dashboard/reports' },
    { id: 'students', label: 'Students', icon: GraduationCap, path: '/institution/dashboard/students' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/institution/dashboard/staff' },
    { id: 'academic', label: 'Academic Structure', icon: School, path: '/institution/dashboard/academic' },
    { id: 'internships', label: 'Internships', icon: BookOpen, path: '/institution/dashboard/internships' },
    { id: 'external-placements', label: 'External Placements', icon: ClipboardCheck, path: '/institution/dashboard/external-placements' },
    { id: 'applications', label: 'Applications', icon: ClipboardList, path: '/institution/dashboard/applications' },
    { id: 'certifications', label: 'Certifications', icon: Award, path: '/institution/dashboard/certifications' },
    { id: 'verification', label: 'Student Verification', icon: FileText, path: '/institution/dashboard/verification' },
    { id: 'incidents', label: 'Incident Management', icon: AlertTriangle, path: '/institution/dashboard/incidents' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/institution/dashboard/settings' },
  ];

  return (
    <aside
      className="d-flex flex-column position-fixed top-0 start-0 h-100"
      style={{
        width: SIDEBAR_WIDTH,
        zIndex: 1050,
        background: '#ffffff',
        borderRight: '1px solid #e7eaf0',
        transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.25s ease',
      }}
    >
      <div className="p-3 border-bottom" style={{ borderColor: '#e7eaf0' }}>
        <div className="d-flex align-items-center justify-content-between">
          <Link
            to="/institution/dashboard"
            className="text-decoration-none d-flex align-items-center gap-3"
          >
            {institutionLogo ? (
              <img
                src={institutionLogo}
                alt="Institution logo"
                className="rounded-3 object-fit-cover"
                style={{
                  width: 42,
                  height: 42,
                  border: '1px solid #e5e7eb',
                }}
              />
            ) : (
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: '#111827',
                  color: '#ffffff',
                }}
              >
                <School size={21} />
              </div>
            )}

            <div>
              <h6
                className="mb-0 text-dark"
                style={{
                  fontWeight: 750,
                  letterSpacing: '-0.03em',
                }}
              >
                EduLink KE
              </h6>
              <small className="text-muted">
                Institution Portal
              </small>
            </div>
          </Link>

          {isMobile && (
            <button
              className="btn d-flex align-items-center justify-content-center"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: '#f6f7f9',
                border: '1px solid #e2e8f0',
              }}
            >
              <X size={19} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto px-3 py-4">
        <div
          className="text-uppercase text-muted fw-bold px-2 mb-2"
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
          }}
        >
          Workspace
        </div>

        <nav className="nav flex-column gap-1">
          {menuItems.map(item => {
            const Icon = item.icon;

            const isActive =
              item.id === 'overview'
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => {
                  if (isMobile && onClose) onClose();
                }}
                className="text-decoration-none"
              >
                <div
                  className="d-flex align-items-center gap-3 px-3 py-2"
                  style={{
                    minHeight: 44,
                    borderRadius: 14,
                    color: isActive ? '#111827' : '#64748b',
                    background: isActive ? '#f1f5f9' : 'transparent',
                    border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.4 : 2}
                    color={isActive ? '#111827' : '#64748b'}
                  />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-top" style={{ borderColor: '#e7eaf0' }}>
        <div
          className="p-3"
          style={{
            borderRadius: 18,
            background: '#f8fafc',
            border: '1px solid #edf0f4',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-3">
            <ShieldCheck size={17} color="#16a34a" />
            <small className="fw-semibold text-dark">
              Institution workspace
            </small>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 34,
                height: 34,
                background: '#111827',
                color: '#ffffff',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user?.firstName?.charAt(0) || 'I'}
            </div>

            <div className="overflow-hidden">
              <p className="mb-0 small fw-semibold text-dark text-truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p
                className="mb-0 text-muted text-truncate"
                style={{ fontSize: '0.72rem' }}
              >
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default InstitutionSidebar;