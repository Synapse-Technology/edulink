import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection?: string; // Kept for backward compatibility if needed, though sidebar will use routing
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
      if (window.innerWidth >= 992) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout min-vh-100 bg-light">
      <AdminSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => isMobile && setIsSidebarOpen(false)}
        isMobile={isMobile}
      />
      
      <div 
        className="admin-main-content d-flex flex-column min-vh-100 transition-all"
        style={{ 
          marginLeft: isMobile ? 0 : '260px', 
          transition: 'margin-left 0.3s ease-in-out',
          width: isMobile ? '100%' : 'calc(100% - 260px)'
        }}
      >
        <AdminHeader 
          onToggleSidebar={toggleSidebar}
          userName={admin?.first_name && admin?.last_name ? `${admin.first_name} ${admin.last_name}` : (admin?.email?.split('@')[0] || 'Admin')}
          userEmail={admin?.email}
          userRole={admin?.role}
          onLogout={handleLogout}
        />
        
        <main className="flex-grow-1 p-4">
          {children}
        </main>
        
        <footer className="bg-white py-3 px-4 border-top">
          <div className="container-fluid">
            <div className="row align-items-center">
              <div className="col-md-6 text-center text-md-start">
                <small className="text-muted">© {new Date().getFullYear()} Edulink. All rights reserved.</small>
              </div>
              <div className="col-md-6 text-center text-md-end">
                <small className="text-muted">Version 1.0.0</small>
              </div>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
