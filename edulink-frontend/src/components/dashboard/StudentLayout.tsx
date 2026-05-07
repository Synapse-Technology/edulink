import React, { useState } from 'react';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';
import { useTheme } from '../../contexts/ThemeContext';

const LAYOUT_STYLES = `
  /* ── Shell ── */
  .sl-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #f9f8f6;
  }
  .sl-shell.dark { background: #141414; }

  /* ── Sidebar column ── */
  .sl-sidebar-col {
    width: 272px;
    flex-shrink: 0;
    height: 100%;
    position: relative;
    z-index: 10;
  }

  /* ── Mobile overlay ── */
  .sl-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    z-index: 1039;
    animation: sl-fade 0.15s ease;
  }
  @keyframes sl-fade { from { opacity: 0; } to { opacity: 1; } }

  /* ── Mobile sidebar drawer ── */
  .sl-drawer {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 272px;
    z-index: 1040;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sl-drawer.open { transform: translateX(0); }

  /* ── Main column ── */
  .sl-main {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Content scroll area ── */
  .sl-content {
    flex: 1;
    overflow-y: auto;
    padding: 28px 28px 48px;
    scroll-behavior: smooth;
  }
  .sl-content::-webkit-scrollbar { width: 5px; }
  .sl-content::-webkit-scrollbar-track { background: transparent; }
  .sl-content::-webkit-scrollbar-thumb { background: #d1ccc5; border-radius: 4px; }
  .sl-shell.dark .sl-content::-webkit-scrollbar-thumb { background: #353535; }

  /* ── Responsive: hide sidebar on mobile, show drawer ── */
  @media (max-width: 1024px) {
    .sl-sidebar-col { display: none; }
    .sl-overlay { display: block; }
    .sl-content { padding: 16px 16px 48px; }
  }
`;

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const { isDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openMenu  = () => setIsMobileMenuOpen(true);
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <style>{LAYOUT_STYLES}</style>
      <div className={`sl-shell${isDarkMode ? ' dark' : ''}`}>

        {/* Desktop sidebar */}
        <div className="sl-sidebar-col">
          <StudentSidebar isDarkMode={isDarkMode} />
        </div>

        {/* Mobile: overlay + drawer */}
        {isMobileMenuOpen && (
          <div className="sl-overlay" onClick={closeMenu} aria-hidden="true" />
        )}
        <div className={`sl-drawer${isMobileMenuOpen ? ' open' : ''}`} aria-hidden={!isMobileMenuOpen}>
          <StudentSidebar isDarkMode={isDarkMode} />
        </div>

        {/* Main */}
        <main className="sl-main">
          <StudentHeader
            onMobileMenuClick={isMobileMenuOpen ? closeMenu : openMenu}
            isMobileMenuOpen={isMobileMenuOpen}
          />
          <div className="sl-content">
            {children}
          </div>
        </main>

      </div>
    </>
  );
};

export default StudentLayout;