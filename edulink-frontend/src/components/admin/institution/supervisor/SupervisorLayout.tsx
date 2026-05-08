// ─── SupervisorLayout.tsx ──────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import SupervisorSidebar from './SupervisorSidebar';
import SupervisorHeader from './SupervisorHeader';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:       #0D2137;
    --navy-mid:   #1B3A5C;
    --accent:     #2F6FED;
    --accent-dim: #EBF2FF;
    --slate:      #4A5568;
    --steel:      #8896A7;
    --mist:       #F0F4F8;
    --fog:        #F7F9FB;
    --white:      #FFFFFF;
    --border:     rgba(13,33,55,0.09);
    --border-md:  rgba(13,33,55,0.14);
    --radius:     10px;
    --radius-sm:  6px;
    --sidebar-w:  248px;
    --header-h:   60px;
    --font:       'DM Sans', system-ui, sans-serif;
    --shadow-xs:  0 1px 3px rgba(13,33,55,0.07), 0 1px 2px rgba(13,33,55,0.05);
    --shadow-sm:  0 2px 8px rgba(13,33,55,0.08), 0 1px 3px rgba(13,33,55,0.06);
  }

  body { font-family: var(--font); background: var(--fog); color: var(--navy); }
  * { font-family: var(--font); }
  /* Ensure Bootstrap/React-Bootstrap modals appear above fixed headers */
  .modal,
  .modal.show {
    z-index: 11000 !important;
  }

  .modal-backdrop {
    z-index: 10990 !important;
  }
`;

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  background: var(--fog);
  position: relative;
`;

const MainContent = styled.div<{ $isMobile: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  margin-left: ${p => p.$isMobile ? '0' : 'var(--sidebar-w)'};
  margin-top: var(--header-h);
  transition: margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  width: ${p => p.$isMobile ? '100%' : 'calc(100% - var(--sidebar-w))'};
`;

const PageMain = styled.main`
  flex: 1;
  padding: 2rem 1.75rem;
  max-width: 1400px;
  width: 100%;

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }
`;

const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.75rem;
  border-top: 1px solid var(--border);
  background: var(--white);

  span {
    font-size: 12px;
    color: var(--steel);
    letter-spacing: 0.01em;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(13, 33, 55, 0.38);
  z-index: 1040;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

interface SupervisorLayoutProps {
  children: React.ReactNode;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 992 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <GlobalStyle />
      <Shell>
        <SupervisorSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
        />

        <MainContent $isMobile={isMobile}>
          <SupervisorHeader
            onToggleSidebar={() => setIsSidebarOpen(o => !o)}
            notificationCount={0}
          />
          <PageMain>{children}</PageMain>
          <Footer>
            <span>© {new Date().getFullYear()} Edulink — Supervisor Portal</span>
            <span>v2.1.0</span>
          </Footer>
        </MainContent>

        {isMobile && isSidebarOpen && (
          <Overlay onClick={() => setIsSidebarOpen(false)} />
        )}
      </Shell>
    </>
  );
};

export default SupervisorLayout;