import React, { useState, useEffect } from 'react';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  return (
    <div className={`min-vh-100 d-flex ${isDarkMode ? 'bg-dark text-white' : 'bg-light'}`}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      {/* Main Content */}
      <div 
        className="flex-grow-1 d-flex flex-column min-vh-100 overflow-auto main-content-margin"
        onClick={isMobileMenuOpen ? () => setIsMobileMenuOpen(false) : undefined}
      >
        <style>{`
          .main-content-margin {
            margin-left: 0;
            max-width: 100vw;
          }
          @media (min-width: 992px) {
            .main-content-margin {
              margin-left: 280px !important;
              max-width: calc(100vw - 280px) !important;
            }
          }
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isMobileMenuOpen={isMobileMenuOpen}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </div>

        <div className="flex-grow-1 px-4 px-lg-5 pb-4">
            {children}
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;
