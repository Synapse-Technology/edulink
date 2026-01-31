import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  FileText, 
  Settings, 
  X,
  Building2,
  CheckSquare,
  UserCog,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface EmployerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const EmployerSidebar: React.FC<EmployerSidebarProps> = ({ 
  isOpen = true, 
  onClose,
  isMobile = false
}) => {
  const { user } = useAuth();
  const [employerLogo, setEmployerLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchEmployerLogo = async () => {
      if (user?.role === 'employer_admin' || user?.role === 'supervisor') {
        try {
          // Dynamically import to avoid circular dependencies if any, 
          // though here standard import is fine. 
          // We need to import employerService at the top level.
          const { employerService } = await import('../../../services/employer/employerService');
          const employer = await employerService.getCurrentEmployer();
          setEmployerLogo(employer.logo || null);
        } catch (error) {
          console.error('Failed to fetch employer logo:', error);
        }
      }
    };

    fetchEmployerLogo();
  }, [user]);
  
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

  const NavItem = ({ to, icon: Icon, label, end = false }: { to: string, icon: any, label: string, end?: boolean }) => (
    <NavLink 
      to={to} 
      end={end}
      className={({ isActive }) => 
        `nav-link d-flex align-items-center px-3 py-2.5 mb-1 rounded transition-colors ${
          isActive 
            ? 'bg-primary text-white shadow-sm' 
            : 'text-white-50 hover-text-white hover-bg-white-10'
        }`
      }
      onClick={() => isMobile && onClose && onClose()}
      style={{ fontSize: '0.95rem' }}
    >
      <Icon size={18} className="me-3" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className={sidebarClasses} style={style}>
      {/* Sidebar Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
        <Link to="/employer/dashboard" className="text-decoration-none text-white d-flex align-items-center gap-2">
          {employerLogo ? (
            <img 
              src={employerLogo} 
              alt="Logo" 
              className="rounded object-fit-cover bg-white"
              style={{ width: '32px', height: '32px' }}
            />
          ) : (
            <div className="bg-primary rounded p-1">
              <Building2 size={24} className="text-white" />
            </div>
          )}
          <div>
            <h6 className="mb-0 fw-bold">EduLink</h6>
            <small className="text-white-50" style={{fontSize: '0.7rem'}}>Employer Portal</small>
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
          <NavItem to="/employer/dashboard" icon={LayoutDashboard} label="Dashboard" end />
          <NavItem to="/employer/dashboard/opportunities" icon={Briefcase} label="My Opportunities" />
          <NavItem to="/employer/dashboard/applications" icon={FileText} label="Applications" />
          <NavItem to="/employer/dashboard/interns" icon={GraduationCap} label="My Interns" />
          <NavItem to="/employer/dashboard/supervisors" icon={Users} label="Supervisors" />
        </nav>

        {user?.role === 'employer_admin' && (
          <>
            <small className="text-uppercase text-white-50 fw-bold mb-2 d-block px-3" style={{fontSize: '0.75rem'}}>
              Management
            </small>
            <nav className="nav flex-column mb-4">
              <NavItem to="/employer/dashboard/profile-requests" icon={UserCog} label="Profile Requests" />
              <NavItem to="/employer/dashboard/reviews" icon={CheckSquare} label="Reviews & Approvals" />
            </nav>
          </>
        )}

        <small className="text-uppercase text-white-50 fw-bold mb-2 d-block px-3" style={{fontSize: '0.75rem'}}>
          Settings
        </small>
        <nav className="nav flex-column mb-4">
          <NavItem to="/employer/dashboard/profile" icon={Building2} label="Company Profile" />
          <NavItem to="/employer/dashboard/settings" icon={Settings} label="Settings" />
        </nav>
      </div>
      
      {/* User Info Footer */}
      <div className="p-3 border-top border-secondary bg-black bg-opacity-25">
         <div className="d-flex align-items-center">
            <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white me-2" style={{width: '32px', height: '32px'}}>
              {user?.firstName?.charAt(0) || 'E'}
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

export default EmployerSidebar;
