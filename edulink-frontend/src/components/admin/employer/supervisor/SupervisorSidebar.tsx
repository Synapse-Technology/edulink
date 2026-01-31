import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  X,
  Building2,
  AlertTriangle,
  Award,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

interface SupervisorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const SupervisorSidebar: React.FC<SupervisorSidebarProps> = ({ 
  isOpen = true, 
  onClose,
  isMobile = false
}) => {
  const { user } = useAuth();
  
  // Use admin-sidebar class for consistent theming
  const sidebarClasses = `admin-sidebar bg-dark text-white d-flex flex-column h-100 ${
    isMobile ? 'shadow-lg' : ''
  }`;

  const style = {
    width: '260px',
    left: 0, // Override CSS default of -280px
    zIndex: 1050,
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s ease-in-out',
  };

  const NavItem = ({ to, icon: Icon, label, end = false }: { to: string, icon: any, label: string, end?: boolean }) => (
    <NavLink 
      to={to} 
      end={end}
      className={({ isActive }) => 
        `nav-link d-flex align-items-center px-3 py-2.5 mb-1 rounded transition-colors ${
          isActive 
            ? 'bg-white bg-opacity-10 text-white shadow-sm border-start border-3 border-info' 
            : 'text-white text-opacity-75 hover-bg-white-10 hover-text-white'
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
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-white border-opacity-10">
        <Link to="/employer/supervisor/dashboard" className="text-decoration-none text-white d-flex align-items-center gap-2">
          <div className="bg-white bg-opacity-10 rounded p-1">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h6 className="mb-0 fw-bold">EduLink</h6>
            <small className="text-white-50" style={{fontSize: '0.7rem'}}>Supervisor Portal</small>
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
          Supervision
        </small>
        <nav className="nav flex-column mb-4">
          <NavItem to="/employer/supervisor/dashboard" icon={LayoutDashboard} label="Dashboard" end />
          <NavItem to="/employer/supervisor/internships" icon={Users} label="My Interns" />
          <NavItem to="/employer/supervisor/logbooks" icon={FileText} label="Logbook Reviews" />
          <NavItem to="/employer/supervisor/milestones" icon={Award} label="Milestones" />
          <NavItem to="/employer/supervisor/incidents" icon={AlertTriangle} label="Incidents" />
        </nav>

        <small className="text-uppercase text-white-50 fw-bold mb-2 d-block px-3" style={{fontSize: '0.75rem'}}>
          Account
        </small>
        <nav className="nav flex-column mb-4">
          <NavItem to="/employer/supervisor/profile" icon={UserIcon} label="My Profile" />
        </nav>
      </div>
      
      {/* User Profile Summary */}
      <div className="p-3 border-top border-white border-opacity-10 bg-black bg-opacity-20">
        <div className="d-flex align-items-center">
          <div className="avatar bg-white bg-opacity-10 text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: '32px', height: '32px'}}>
            {user?.firstName?.[0] || 'S'}
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-truncate" style={{fontSize: '0.9rem'}}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-white-50 text-truncate" style={{fontSize: '0.75rem'}}>
              {user?.role === 'supervisor' ? 'Supervisor' : user?.role}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default SupervisorSidebar;