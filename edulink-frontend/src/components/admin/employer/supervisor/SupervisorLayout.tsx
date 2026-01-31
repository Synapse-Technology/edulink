import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SupervisorSidebar from './SupervisorSidebar';
import SupervisorHeader from './SupervisorHeader';

interface SupervisorLayoutProps {
  children?: React.ReactNode;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="d-flex h-100 bg-light admin-dashboard">
      {/* Sidebar */}
      <SupervisorSidebar 
        isOpen={isMobile ? isMobileMenuOpen : true} 
        onClose={() => setIsMobileMenuOpen(false)}
        isMobile={isMobile}
      />

      {/* Main Content Wrapper */}
      <div 
        className="flex-grow-1 d-flex flex-column min-vh-100 transition-all"
        style={{ 
          marginLeft: isMobile ? '0' : '260px',
          width: isMobile ? '100%' : 'calc(100% - 260px)'
        }}
      >
        <SupervisorHeader 
          onMobileMenuClick={toggleMobileMenu}
        />

        <main className="flex-grow-1 p-4 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-50"
          style={{ zIndex: 1045 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default SupervisorLayout;