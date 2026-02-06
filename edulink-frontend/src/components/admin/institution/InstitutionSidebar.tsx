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
  Award
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';

interface InstitutionSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const InstitutionSidebar: React.FC<InstitutionSidebarProps> = ({ 
  isOpen = true,
  onClose,
  isMobile = false
}) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [institutionLogo, setInstitutionLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchInstitutionLogo = async () => {
      try {
        const { institutionService } = await import('../../../services/institution/institutionService');
        const profile = await institutionService.getProfile();
        setInstitutionLogo(profile.logo || null);
      } catch (error) {
        console.error('Failed to fetch institution logo:', error);
      }
    };

    fetchInstitutionLogo();
  }, []);

  const sidebarClasses = `admin-sidebar bg-dark text-white d-flex flex-column h-100 transition-all ${
    isMobile ? 'position-fixed top-0 start-0 w-75 shadow-lg' : 'position-fixed top-0 start-0'
  }`;

  const style = {
    width: '260px',
    zIndex: 1050,
    transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
    transition: 'transform 0.3s ease-in-out',
    borderRight: '1px solid rgba(255,255,255,0.1)'
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/institution/dashboard' },
    { id: 'reports', label: 'Reports', icon: BarChart2, path: '/institution/dashboard/reports' },
    { id: 'students', label: 'Students', icon: GraduationCap, path: '/institution/dashboard/students' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/institution/dashboard/staff' },
    { id: 'academic', label: 'Academic Structure', icon: School, path: '/institution/dashboard/academic' },
    { id: 'internships', label: 'Internships', icon: BookOpen, path: '/institution/dashboard/internships' },
    { id: 'applications', label: 'Applications', icon: ClipboardList, path: '/institution/dashboard/applications' },
    { id: 'certifications', label: 'Certifications', icon: Award, path: '/institution/dashboard/certifications' },
    { id: 'verification', label: 'Student Verification', icon: FileText, path: '/institution/dashboard/verification' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/institution/dashboard/settings' },
  ];

  return (
    <aside className={sidebarClasses} style={style}>
      {/* Sidebar Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
        <Link to="/institution/dashboard" className="text-decoration-none text-white d-flex align-items-center gap-2">
          {institutionLogo ? (
            <img 
              src={institutionLogo} 
              alt="Logo" 
              className="rounded object-fit-cover bg-white"
              style={{ width: '32px', height: '32px' }}
            />
          ) : (
            <div className="bg-primary rounded p-1">
              <School size={24} className="text-white" />
            </div>
          )}
          <div>
            <h6 className="mb-0 fw-bold">EduLink</h6>
            <small className="text-white-50" style={{fontSize: '0.7rem'}}>Institution Portal</small>
          </div>
        </Link>
        {isMobile && (
          <button className="btn btn-link text-white-50 p-0" onClick={onClose}>
            <X size={24} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-grow-1 overflow-auto p-3 custom-scrollbar">
        <small className="text-uppercase text-white-50 fw-bold mb-2 d-block px-3" style={{fontSize: '0.75rem'}}>
          Main Menu
        </small>
        <nav className="nav flex-column mb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'overview' 
              ? location.pathname === item.path 
              : location.pathname.startsWith(item.path);
            
            return (
              <NavLink 
                key={item.id}
                to={item.path}
                className={`nav-link d-flex align-items-center px-3 py-2.5 mb-1 rounded transition-colors border-0 w-100 text-start text-decoration-none ${
                  isActive 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-transparent text-white-50 hover-text-white hover-bg-white-10'
                }`}
                style={{ fontSize: '0.95rem' }}
                onClick={() => {
                  if (isMobile && onClose) onClose();
                }}
              >
                <Icon size={18} className="me-3" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Info Footer */}
      <div className="p-3 border-top border-secondary bg-black bg-opacity-25">
         <div className="d-flex align-items-center">
            <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white me-2" style={{width: '32px', height: '32px'}}>
              {user?.firstName?.charAt(0) || 'I'}
            </div>
            <div className="overflow-hidden">
              <p className="mb-0 text-white small fw-bold text-truncate">{user?.firstName} {user?.lastName}</p>
              <p className="mb-0 text-white-50 x-small text-truncate" style={{fontSize: '0.7rem'}}>{user?.email}</p>
            </div>
         </div>
      </div>
    </aside>
  );
};

export default InstitutionSidebar;
