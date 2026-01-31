import React, { useState } from 'react';
import { 
  CheckCircle,
  Info
} from 'lucide-react';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';

const StudentNotifications: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Sidebar & Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      <div 
        className="d-flex flex-column min-vh-100 overflow-auto main-content-margin"
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
          .card {
            background-color: ${isDarkMode ? '#1e293b' : 'white'} !important;
            border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'} !important;
            transition: all 0.3s ease;
          }
          .list-group-item {
            background-color: ${isDarkMode ? '#1e293b' : 'white'} !important;
            border-color: ${isDarkMode ? '#334155' : '#dee2e6'} !important;
            color: ${isDarkMode ? '#f8fafc' : 'inherit'} !important;
          }
          .text-muted {
            color: ${isDarkMode ? '#94a3b8' : '#6c757d'} !important;
          }
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </div>

        <div className="flex-grow-1 px-4 px-lg-5 pb-4">
            {/* Header */}
            <div className="mb-4 text-center">
               <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                  <span className="line d-none d-md-block" style={{ width: '60px', height: '2px', backgroundColor: '#0d6efd' }}></span>
                  <h2 className={`fw-bold mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>Notifications</h2>
                  <span className="line d-none d-md-block" style={{ width: '60px', height: '2px', backgroundColor: '#0d6efd' }}></span>
               </div>
               <p className={`${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>Stay updated with important alerts and messages.</p>
            </div>

            {/* Notifications List */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
               <div className="list-group list-group-flush">
                  {/* Placeholder Notification 1 */}
                  <div className="list-group-item p-4 border-0">
                     <div className="d-flex w-100 justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center">
                           <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3 text-primary">
                              <Info size={20} />
                           </div>
                           <h5 className="mb-0 fw-bold">Welcome to Edulink!</h5>
                        </div>
                        <small className="text-muted">Just now</small>
                     </div>
                     <p className="mb-1 ms-5 ps-2 text-muted">
                        Your student account has been successfully created. Complete your profile to get started.
                     </p>
                  </div>

                  {/* Placeholder Notification 2 */}
                  <div className="list-group-item p-4 border-top">
                     <div className="d-flex w-100 justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center">
                           <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3 text-success">
                              <CheckCircle size={20} />
                           </div>
                           <h5 className="mb-0 fw-bold">Email Verified</h5>
                        </div>
                        <small className="text-muted">1 day ago</small>
                     </div>
                     <p className="mb-1 ms-5 ps-2 text-muted">
                        Your email address has been verified. You can now apply for internships.
                     </p>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentNotifications;
