import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../../contexts/AdminAuthContext';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
}

const SIDEBAR_WIDTH = 280;
const MOBILE_BREAKPOINT = 992;

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;

      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const userName =
    admin?.first_name && admin?.last_name
      ? `${admin.first_name} ${admin.last_name}`
      : admin?.email?.split('@')[0] || 'Admin';

  return (
    <div className="admin-layout">
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        isMobile={isMobile}
      />

      <div
        className="admin-main-content"
        style={{
          marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
          width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`,
        }}
      >
        <AdminHeader
          onToggleSidebar={handleToggleSidebar}
          userName={userName}
          userEmail={admin?.email}
          userRole={admin?.role}
          onLogout={handleLogout}
        />

        <main className="admin-page-content">
          {children}
        </main>

        <footer className="admin-layout-footer">
          <span>
            © {new Date().getFullYear()} EduLink KE. Platform Console.
          </span>

          <span>Version 1.0.0</span>
        </footer>
      </div>

      <style>{`
        .admin-layout {
          min-height: 100vh;
          background: #f8fafc;
        }

        .admin-main-content {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          transition: margin-left .28s ease, width .28s ease;
        }

        .admin-page-content {
          flex: 1;
          padding: 24px;
        }

        .admin-layout-footer {
          min-height: 54px;
          padding: 0 24px;
          background: #ffffff;
          border-top: 1px solid #e5e7eb;
          color: #64748b;
          font-size: .8rem;
          font-weight: 650;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        @media (max-width: 640px) {
          .admin-page-content {
            padding: 16px;
          }

          .admin-layout-footer {
            min-height: auto;
            padding: 14px 16px;
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;