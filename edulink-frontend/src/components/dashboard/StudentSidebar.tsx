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
  ClipboardPlus,
  LifeBuoy as LifePreserver, 
  LogOut as BoxArrowRight 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';
import '../../styles/student-portal.css';

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
  { to: '/dashboard/student/external-placement', label: 'Declare Placement', icon: <ClipboardPlus size={18} /> },
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
      <aside
        role="navigation"
        aria-label="Student dashboard navigation"
        className={`student-sidebar ${isDarkMode ? 'dark' : ''} d-flex flex-column h-100`}
      >
      {/* Logo Section */}
      <div className="student-sidebar-brand d-flex align-items-center gap-3">
        <div className="student-brand-mark">
          <img src={edulinkLogo} alt="EduLink" />
        </div>
        <div>
          <h1 className="student-sidebar-title">EduLink</h1>
          <p className="student-sidebar-subtitle">Student portal</p>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav className="student-sidebar-nav">
        <ul className="nav flex-column gap-1">
          {navItems.map((item) => (
            <li key={item.to} className="nav-item">
              <Link
                to={item.to}
                className={`student-nav-link ${isActiveRoute(item.to) ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Fixed Logout Button */}
      <div className="student-sidebar-footer mt-auto">
        <button
          type="button"
          onClick={handleLogout}
          className="btn student-logout-btn w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <BoxArrowRight size={16} />
          <span className="fw-medium">Log Out</span>
        </button>
      </div>
      </aside>
  );
};

export default StudentSidebar;
