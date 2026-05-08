import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import SupervisorSidebar from './SupervisorSidebar';
import { SupervisorHeader } from './SupervisorHeader';
import '../../../employer/supervisor/workspace/SupervisorWorkspace.css';

interface SupervisorLayoutProps {
  children?: React.ReactNode;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  return (
    <div className="supervisor-shell">
      <SupervisorSidebar
        isOpen={isMobile ? isMobileMenuOpen : true}
        onClose={() => setIsMobileMenuOpen(false)}
        isMobile={isMobile}
      />

      <div
        className="supervisor-main"
        style={{
          marginLeft: isMobile ? 0 : 280,
          width: isMobile ? '100%' : 'calc(100% - 280px)',
        }}
      >
        <SupervisorHeader onMobileMenuClick={toggleMobileMenu} />

        <main className="supervisor-content">
          {children || <Outlet />}
        </main>
      </div>

      {isMobile && isMobileMenuOpen && (
        <button
          className="supervisor-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <style>{`
        .supervisor-shell {
          --sv-bg: #f7f9fb;
          --sv-surface: #ffffff;
          --sv-surface-2: #f0f4f8;
          --sv-ink: #0d2137;
          --sv-muted: #8896a7;
          --sv-text: #4a5568;
          --sv-border: rgba(13, 33, 55, 0.09);
          --sv-border-md: rgba(13, 33, 55, 0.14);
          --sv-accent: #2f6fed;
          --sv-accent-soft: #ebf2ff;
          --sv-radius: 10px;
          --sv-shadow-xs: 0 1px 3px rgba(13, 33, 55, 0.07), 0 1px 2px rgba(13, 33, 55, 0.05);
          --sv-shadow-sm: 0 2px 8px rgba(13, 33, 55, 0.08), 0 1px 3px rgba(13, 33, 55, 0.06);
          min-height: 100vh;
          display: flex;
          background: var(--sv-bg);
          color: var(--sv-ink);
        }

        .supervisor-main {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.25s ease, width 0.25s ease;
        }

        .supervisor-content {
          flex: 1;
          min-width: 0;
          overflow-x: hidden;
          padding: 2rem 1.75rem;
          max-width: 1400px;
          width: 100%;
        }

        .supervisor-overlay {
          position: fixed;
          inset: 0;
          z-index: 1045;
          border: 0;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(2px);
        }

        .supervisor-sidebar {
          background: var(--sv-surface) !important;
          color: var(--sv-ink) !important;
          border-right: 1px solid var(--sv-border) !important;
          box-shadow: none !important;
        }

        .supervisor-sidebar .sidebar-brand,
        .supervisor-sidebar .sidebar-footer {
          border-color: var(--sv-border) !important;
          background: var(--sv-surface) !important;
        }

        .supervisor-sidebar .brand-link,
        .supervisor-sidebar .sidebar-context strong,
        .supervisor-sidebar .access-card strong,
        .supervisor-sidebar .user-card strong {
          color: var(--sv-ink) !important;
        }

        .supervisor-sidebar .brand-link span,
        .supervisor-sidebar .sidebar-context span,
        .supervisor-sidebar .access-card span,
        .supervisor-sidebar .user-card span,
        .supervisor-sidebar .nav-copy small {
          color: var(--sv-muted) !important;
        }

        .supervisor-sidebar .brand-mark,
        .supervisor-sidebar .nav-icon,
        .supervisor-sidebar .context-icon,
        .supervisor-sidebar .access-icon,
        .supervisor-sidebar .user-avatar {
          background: var(--sv-accent-soft) !important;
          color: var(--sv-accent) !important;
          border-color: rgba(47, 111, 237, 0.15) !important;
        }

        .supervisor-sidebar .sidebar-context,
        .supervisor-sidebar .access-card {
          background: var(--sv-surface-2) !important;
          border-color: var(--sv-border) !important;
          border-radius: 10px !important;
        }

        .supervisor-sidebar .nav-section-title {
          color: var(--sv-muted) !important;
        }

        .supervisor-sidebar .supervisor-nav-link {
          color: var(--sv-text) !important;
          border-radius: 8px !important;
          transform: none !important;
        }

        .supervisor-sidebar .supervisor-nav-link:hover {
          color: var(--sv-ink) !important;
          background: var(--sv-surface-2) !important;
        }

        .supervisor-sidebar .supervisor-nav-link.active {
          color: var(--sv-accent) !important;
          background: var(--sv-accent-soft) !important;
          box-shadow: none !important;
        }

        .supervisor-sidebar .supervisor-nav-link.active::before {
          background: var(--sv-accent) !important;
        }

        .workspace-card,
        .summary-card,
        .hero-summary-card,
        .internship-hero,
        .logbook-hero,
        .milestone-hero,
        .incident-hero,
        .profile-hero {
          border-radius: 12px !important;
          border: 1px solid var(--sv-border) !important;
          box-shadow: var(--sv-shadow-xs) !important;
        }

        .summary-card.dark,
        .hero-summary-card.primary {
          background: var(--sv-surface) !important;
          color: var(--sv-ink) !important;
        }

        .page-title,
        .workspace-header h5,
        .workspace-card h5 {
          color: var(--sv-ink) !important;
          letter-spacing: -0.025em;
        }

        .eyebrow,
        .section-kicker {
          color: var(--sv-accent) !important;
          letter-spacing: 0.08em;
        }

        .action-btn,
        .btn {
          border-radius: 8px !important;
        }

        .modal {
          z-index: 11000 !important;
        }

        .modal-backdrop {
          z-index: 10990 !important;
        }

        @media (max-width: 991.98px) {
          .supervisor-main {
            margin-left: 0 !important;
            width: 100% !important;
          }

          .supervisor-content {
            padding: 1.25rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SupervisorLayout;
