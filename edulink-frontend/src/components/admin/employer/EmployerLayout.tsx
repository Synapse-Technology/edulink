import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import EmployerSidebar from './EmployerSidebar';
import EmployerHeader from './EmployerHeader';

interface EmployerLayoutProps {
  children: React.ReactNode;
}

const STYLES = `
  .el-shell {
    --el-bg: #f7f6f3;
    --el-surface: #ffffff;
    --el-surface-2: #f0eeea;
    --el-border: #e2ded7;
    --el-ink: #101316;
    --el-muted: #6f747b;
    --el-sidebar: #0d1013;
    --el-sidebar-2: #15191d;
    --el-accent: #1a5cff;
    --el-accent-soft: rgba(26, 92, 255, 0.1);
    --el-shadow: 0 12px 36px rgba(16, 19, 22, 0.08);
    --el-radius: 18px;
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(26,92,255,0.06), transparent 32%),
      var(--el-bg);
    color: var(--el-ink);
  }

  .dark-mode .el-shell,
  .el-shell.dark-mode {
    --el-bg: #111111;
    --el-surface: #1a1a1a;
    --el-surface-2: #232323;
    --el-border: #2c2c2c;
    --el-ink: #f0ede8;
    --el-muted: #8a8580;
    --el-sidebar: #08090a;
    --el-sidebar-2: #151719;
    --el-accent: #4d7fff;
    --el-accent-soft: rgba(77,127,255,0.12);
    --el-shadow: 0 12px 36px rgba(0,0,0,0.35);
  }

  .el-main {
    min-height: 100vh;
    transition: margin-left 0.28s ease, width 0.28s ease;
  }

  .el-content {
    padding: 28px 32px 36px;
  }

  .el-footer {
    border-top: 1px solid var(--el-border);
    background: color-mix(in srgb, var(--el-surface), transparent 6%);
    padding: 16px 32px;
  }

  .el-footer-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: var(--el-muted);
    font-size: 12px;
  }

  .el-overlay {
    position: fixed;
    inset: 0;
    z-index: 1040;
    background: rgba(0,0,0,0.48);
    backdrop-filter: blur(4px);
  }

  @media (max-width: 768px) {
    .el-content {
      padding: 22px 18px 30px;
    }

    .el-footer {
      padding: 14px 18px;
    }

    .el-footer-inner {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

const EmployerLayout: React.FC<EmployerLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const location = useLocation();

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

  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div className="el-shell">
      <style>{STYLES}</style>

      <EmployerSidebar
        isOpen={isSidebarOpen}
        onClose={() => isMobile && setIsSidebarOpen(false)}
        isMobile={isMobile}
      />

      <div
        className="el-main d-flex flex-column"
        style={{
          marginLeft: isMobile ? 0 : '280px',
          width: isMobile ? '100%' : 'calc(100% - 280px)',
        }}
      >
        <EmployerHeader
          onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
          notificationCount={0}
        />

        <main className="el-content flex-grow-1">
          {children}
        </main>

        <footer className="el-footer">
          <div className="el-footer-inner">
            <span>© {new Date().getFullYear()} EduLink. Employer operations console.</span>
            <span>Built for verified placements, applications, and supervision workflows.</span>
          </div>
        </footer>
      </div>

      {isMobile && isSidebarOpen && (
        <button
          type="button"
          className="el-overlay border-0"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default EmployerLayout;