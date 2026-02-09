import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  AlertTriangle,
  Settings,
  School,
  X
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';

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
  const { user } = useAuthStore();
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
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/institution/supervisor-dashboard/overview' },
    { id: 'logbooks', label: 'Logbooks', icon: FileText, path: '/institution/supervisor-dashboard/logbooks' },
    { id: 'students', label: 'Students', icon: Users, path: '/institution/supervisor-dashboard/students' },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, path: '/institution/supervisor-dashboard/incidents' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/institution/supervisor-dashboard/settings' },
  ];

  return (
    <aside className={sidebarClasses} style={style}>
      {/* Sidebar Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
        <Link to="/institution/supervisor-dashboard" className="text-decoration-none text-white d-flex align-items-center gap-2">
          <div className="bg-primary rounded p-1">
            <School size={24} className="text-white" />
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
          Main Menu
        </small>
        <nav className="nav flex-column mb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            return (
              <NavLink 
                key={item.id}
                to={item.path}
                className={({ isActive }) => `nav-link d-flex align-items-center px-3 py-2.5 mb-1 rounded transition-colors text-start ${
                  isActive 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-transparent text-white-50 hover-text-white hover-bg-white-10'
                }`}
                style={{ fontSize: '0.95rem' }}
                onClick={() => {
                  if (isMobile && onClose) onClose();
                }}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={`me-3 ${isActive ? 'text-white' : 'text-white-50'}`} />
                    <span className="fw-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile Summary */}
      <div className="p-3 border-top border-secondary bg-black bg-opacity-25">
        <div className="d-flex align-items-center">
          <div className="avatar bg-primary bg-opacity-20 text-white rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm border border-primary border-opacity-25" style={{width: '38px', height: '38px', fontSize: '0.9rem'}}>
            {user?.firstName?.[0] || 'S'}
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-truncate fw-bold mb-0" style={{fontSize: '0.9rem'}}>
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-white-50 text-truncate" style={{fontSize: '0.75rem'}}>
              Institution Supervisor
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SupervisorSidebar;
