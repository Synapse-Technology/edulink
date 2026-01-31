import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  ShieldCheck, 
  BarChart2, 
  Activity, 
  Settings, 
  X,
  FileText,
  Database,
  Briefcase
} from 'lucide-react';

interface AdminSidebarProps {
  activeSection?: string; // Legacy prop, kept for compatibility
  onSectionChange?: (section: string) => void; // Legacy prop
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  isOpen = true, 
  onClose,
  isMobile = false
}) => {
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
        <Link to="/dashboard/admin" className="text-decoration-none text-white d-flex align-items-center gap-2">
          <div className="bg-primary rounded p-1">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <h6 className="mb-0 fw-bold">EduLink</h6>
            <small className="text-white-50" style={{fontSize: '0.7rem'}}>Administration</small>
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
          <NavItem to="/dashboard/admin" icon={LayoutDashboard} label="Dashboard" end />
          <NavItem to="/admin/users" icon={Users} label="User Management" />
          <NavItem to="/admin/institutions" icon={Building2} label="Institutions" />
          <NavItem to="/admin/employers/requests" icon={Briefcase} label="Employer Management" />
          <NavItem to="/admin/staff" icon={ShieldCheck} label="Platform Staff" />
        </nav>

        <small className="text-uppercase text-white-50 fw-bold mb-2 d-block px-3" style={{fontSize: '0.75rem'}}>
          Monitoring
        </small>
        <nav className="nav flex-column mb-4">
          <NavItem to="/admin/analytics" icon={BarChart2} label="Analytics" />
          <NavItem to="/admin/health" icon={Activity} label="System Health" />
          <NavItem to="/admin/reports" icon={FileText} label="Reports" />
        </nav>

        <small className="text-uppercase text-white-50 fw-bold mb-2 d-block px-3" style={{fontSize: '0.75rem'}}>
          Settings
        </small>
        <nav className="nav flex-column">
          <NavItem to="/admin/settings" icon={Settings} label="Configuration" />
          <NavItem to="/admin/health" icon={Database} label="Backups" />
        </nav>
      </div>

      {/* Footer */}
      <div className="p-3 border-top border-secondary bg-darker">
        <div className="d-flex align-items-center p-2 rounded bg-white bg-opacity-10">
          <div className="flex-shrink-0">
            <div className="rounded-circle bg-success p-1" style={{width: '8px', height: '8px'}}></div>
          </div>
          <div className="flex-grow-1 ms-2">
            <small className="text-white d-block" style={{fontSize: '0.75rem'}}>System Status</small>
            <small className="text-success fw-bold" style={{fontSize: '0.7rem'}}>Operational</small>
          </div>
        </div>
      </div>

      {/* CSS for hover effect */}
      <style>{`
        .hover-bg-white-10:hover { background-color: rgba(255, 255, 255, 0.1); color: white !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      `}</style>
    </aside>
  );
};

export default AdminSidebar;
