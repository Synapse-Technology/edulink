import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  House, 
  Search, 
  ListCheck, 
  Briefcase, 
  BookOpen, 
  FileText, 
  Building2,
  Bell,
  FolderOpen,
  LifeBuoy as LifePreserver, 
  LogOut as BoxArrowRight 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Add Pacifico font import
const PacificoFont = () => (
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet" />
);

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface StudentSidebarProps {
  isDarkMode?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard/student', label: 'Dashboard', icon: <House size={18} /> },
  { to: '/opportunities', label: 'Browse Internships', icon: <Search size={18} /> },
  { to: '/dashboard/student/applications', label: 'Application Tracker', icon: <ListCheck size={18} /> },
  { to: '/dashboard/student/internship', label: 'Active Internship', icon: <Briefcase size={18} /> },
  { to: '/dashboard/student/logbook', label: 'Logbook & History', icon: <BookOpen size={18} /> },
  { to: '/dashboard/student/artifacts', label: 'Artifacts & Reports', icon: <FolderOpen size={18} /> },
  { to: '/dashboard/student/profile', label: 'Profile & CV', icon: <FileText size={18} /> },
  { to: '/dashboard/student/affiliation', label: 'Institution Affiliation', icon: <Building2 size={18} /> },
  { to: '/dashboard/student/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { to: '/support', label: 'Support', icon: <LifePreserver size={18} /> },
];

interface StudentSidebarProps {
  isDarkMode?: boolean;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ isDarkMode = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      <PacificoFont />
      <aside
        role="navigation"
        aria-label="Student dashboard navigation"
        className={`d-flex flex-column h-100 ${isDarkMode ? 'text-white' : 'text-dark'}`}
        style={{ 
          width: '280px', 
          backgroundColor: isDarkMode ? '#1e293b' : '#14b8a6',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: isDarkMode ? '1px solid #374151' : '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
      {/* Logo Section */}
      <div className="text-center py-4 mb-2 border-bottom" style={{ borderColor: isDarkMode ? '#374151' : 'rgba(255, 255, 255, 0.2)' }}>
        <h1 
          className={`mb-1 fw-bold ${isDarkMode ? 'text-white' : 'text-white'}`}
          style={{ fontFamily: "'Pacifico', cursive", fontSize: '1.7rem', fontWeight: '400', letterSpacing: '1px' }}
        >
          EduLink
        </h1>
        <p className={`mb-0 text-uppercase fw-semibold small tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-white-50'}`}>
          Student Space
        </p>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-grow-1 pt-4 px-3 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <ul className="nav nav-pills flex-column gap-1">
          {navItems.map((item) => (
            <li key={item.to} className="nav-item">
              <Link
                to={item.to}
                className={`nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-2 transition-all ${
                  isActiveRoute(item.to)
                    ? `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white'} fw-semibold shadow-sm`
                    : isDarkMode ? 'text-gray-300 hover:text-white' : 'text-white-50 hover:text-white'
                }`}
                style={{
                  backgroundColor: isActiveRoute(item.to) 
                    ? (isDarkMode ? '#374151' : 'white') 
                    : 'transparent',
                  color: isActiveRoute(item.to) 
                    ? (isDarkMode ? 'white' : '#14b8a6') 
                    : undefined,
                  fontSize: '0.875rem',
                  border: isDarkMode && isActiveRoute(item.to) ? '1px solid #4b5563' : 'none'
                }}
              >
                {item.icon}
                <span className="fw-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Fixed Logout Button */}
      <div className="p-3 border-top mt-auto" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-pill"
        >
          <BoxArrowRight size={16} />
          <span className="fw-medium">Log Out</span>
        </button>
      </div>

      <style>{`
        .bg-primary-light {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .text-white-50 {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .text-white-50:hover {
          color: white !important;
        }
        .tracking-wide {
          letter-spacing: 0.1em;
        }
        .nav-link.active {
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;
        }
        .nav-link:not(.active):hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }
        /* Custom scrollbar for navigation */
        nav::-webkit-scrollbar {
          width: 4px;
        }
        nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }
        nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        /* Firefox scrollbar */
        nav {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
        }
      `}</style>
      </aside>
    </>
  );
};

export default StudentSidebar;