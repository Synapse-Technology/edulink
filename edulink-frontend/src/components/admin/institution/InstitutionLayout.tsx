import React, { useState, useEffect } from 'react';
import InstitutionSidebar from './InstitutionSidebar';
import InstitutionHeader from './InstitutionHeader';
import '../../institution/workspace/InstitutionWorkspace.css';

interface InstitutionLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_WIDTH = 280;

const STYLES = `
  .institution-layout {
    --inst-bg: #f6f7f9;
    --inst-surface: #ffffff;
    --inst-surface-2: #f0fdfa;
    --inst-border: #dbe7e4;
    --inst-ink: #0f172a;
    --inst-muted: #64748b;
    --inst-accent: #1ab8aa;
    --inst-accent-soft: rgba(26, 184, 170, 0.11);
    --inst-shadow: 0 14px 38px rgba(15, 23, 42, 0.08);
    background:
      radial-gradient(circle at top right, rgba(26, 184, 170, 0.08), transparent 34%),
      var(--inst-bg);
    color: var(--inst-ink);
  }
`;

const InstitutionLayout: React.FC<InstitutionLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className="institution-layout min-vh-100"
    >
      <style>{STYLES}</style>
      <InstitutionSidebar
        isOpen={isSidebarOpen}
        onClose={() => isMobile && setIsSidebarOpen(false)}
        isMobile={isMobile}
      />

      <div
        className="institution-main d-flex flex-column min-vh-100"
        style={{
          marginLeft: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
          width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`,
          transition: 'margin-left 0.25s ease, width 0.25s ease',
        }}
      >
        <InstitutionHeader
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          notificationCount={0}
        />

        <main className="flex-grow-1 px-3 px-md-4 py-4">
          <div className="container-fluid px-0">
            {children}
          </div>
        </main>

        <footer
          className="px-3 px-md-4 py-3"
          style={{
            background: '#f6f7f9',
            borderTop: '1px solid #e7eaf0',
          }}
        >
          <div className="container-fluid px-0">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
              <small className="text-muted">
                © {new Date().getFullYear()} EduLink KE
              </small>
              <small className="text-muted">
                Institution Portal · Secure placement infrastructure
              </small>
            </div>
          </div>
        </footer>
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 1040,
            background: 'rgba(15, 23, 42, 0.38)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default InstitutionLayout;
