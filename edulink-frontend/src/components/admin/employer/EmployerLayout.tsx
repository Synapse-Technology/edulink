import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import EmployerSidebar from './EmployerSidebar';
import EmployerHeader from './EmployerHeader';

interface EmployerLayoutProps {
  children: React.ReactNode;
}

const EmployerLayout: React.FC<EmployerLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const location = useLocation();

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

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="employer-layout min-vh-100 bg-light">
      <EmployerSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => isMobile && setIsSidebarOpen(false)}
        isMobile={isMobile}
      />
      
      <div 
        className="main-content d-flex flex-column min-vh-100 transition-all"
        style={{ 
          marginLeft: isMobile ? 0 : '260px', 
          transition: 'margin-left 0.3s ease-in-out',
          width: isMobile ? '100%' : 'calc(100% - 260px)'
        }}
      >
        <EmployerHeader 
          onToggleSidebar={toggleSidebar}
          notificationCount={0} // To be implemented with real data
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
                <small className="text-muted">Employer Portal</small>
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

export default EmployerLayout;
