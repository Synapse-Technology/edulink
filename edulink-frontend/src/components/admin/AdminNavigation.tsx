import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AdminNavigationProps {
  className?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  current: boolean;
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({
  className = '',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const location = useLocation();

  const navigation: NavigationItem[] = [
    {
      name: 'Institutions',
      href: '/institutions/request',
      current: location.pathname.startsWith('/institutions'),
    },
    {
      name: 'Employers',
      href: '/employer/onboarding',
      current: location.pathname.startsWith('/employer'),
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={`admin-navigation ${
        isScrolled ? 'scrolled' : ''
      } ${className}`}
    >
      <div className="admin-nav-container">
        {/* Brand */}
        <div className="admin-nav-brand">
          <Link to="/" className="admin-logo">
            <div className="admin-logo-stack">
              <span className="admin-logo-text">EduLink</span>
              <span className="admin-logo-subtext">
                Institution & Employer Access
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="admin-nav-menu">
          <ul className="admin-nav-list">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`admin-nav-link ${
                    item.current ? 'active' : ''
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right */}
        <div className="admin-nav-actions">
          <Link to="/admin/login" className="system-admin-link">
            System Admin
          </Link>

          <button
            className="admin-mobile-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
          >
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className={`admin-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-mobile-menu-content">
          <ul className="admin-mobile-nav-list">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`admin-mobile-nav-link ${
                    item.current ? 'active' : ''
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="admin-mobile-divider" />

          <Link
            to="/admin/login"
            className="admin-mobile-system-link"
          >
            System Admin Access
          </Link>
        </div>
      </div>

      <style>{`
        .admin-navigation {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 1000;
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(229,231,235,.72);
          transition: all .24s ease;
        }

        .admin-navigation.scrolled {
          background: rgba(255,255,255,.98);
          box-shadow: 0 10px 34px rgba(15,23,42,.05);
        }

        .admin-nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          height: 4.4rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .admin-logo {
          text-decoration: none;
        }

        .admin-logo-stack {
          display: flex;
          flex-direction: column;
          line-height: 1.05;
        }

        .admin-logo-text {
          font-size: 1.4rem;
          font-weight: 850;
          letter-spacing: -.04em;
          color: #111827;
        }

        .admin-logo-subtext {
          margin-top: 4px;
          font-size: .68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #6b7280;
        }

        .admin-nav-menu {
          display: none;
          margin-left: auto;
        }

        .admin-nav-list {
          display: flex;
          align-items: center;
          gap: 1.4rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .admin-nav-link {
          position: relative;
          padding: .5rem 0;
          font-size: .92rem;
          font-weight: 700;
          color: #6b7280;
          text-decoration: none;
          transition: color .2s ease;
        }

        .admin-nav-link:hover {
          color: #111827;
        }

        .admin-nav-link.active {
          color: #111827;
        }

        .admin-nav-link.active::before {
          content: '';
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 18px;
          border-radius: 999px;
          background: #0f766e;
        }

        .admin-nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .system-admin-link {
          display: none;
          font-size: .8rem;
          font-weight: 700;
          color: #6b7280;
          text-decoration: none;
          transition: color .2s ease;
        }

        .system-admin-link:hover {
          color: #111827;
        }

        .admin-mobile-toggle {
          width: 2.3rem;
          height: 2.3rem;
          border: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: .28rem;
          padding: 0;
          cursor: pointer;
        }

        .hamburger-line {
          width: 1.3rem;
          height: 2px;
          background: #374151;
          border-radius: 999px;
          transition: all .25s ease;
        }

        .hamburger-line.open:nth-child(1) {
          transform: rotate(45deg) translate(4px, 4px);
        }

        .hamburger-line.open:nth-child(2) {
          opacity: 0;
        }

        .hamburger-line.open:nth-child(3) {
          transform: rotate(-45deg) translate(4px, -4px);
        }

        .admin-mobile-menu {
          position: fixed;
          top: 4.4rem;
          left: 0;
          right: 0;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(10px);
          border-top: 1px solid #eef2f7;
          transform: translateY(-12px);
          opacity: 0;
          visibility: hidden;
          transition: all .24s ease;
        }

        .admin-mobile-menu.open {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }

        .admin-mobile-menu-content {
          padding: 1rem;
        }

        .admin-mobile-nav-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .admin-mobile-nav-link {
          display: block;
          padding: .85rem 0;
          font-size: .95rem;
          font-weight: 700;
          color: #374151;
          text-decoration: none;
          border-bottom: 1px solid #f1f5f9;
        }

        .admin-mobile-nav-link.active {
          color: #0f766e;
        }

        .admin-mobile-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 1rem 0;
        }

        .admin-mobile-system-link {
          display: block;
          font-size: .85rem;
          font-weight: 700;
          color: #6b7280;
          text-decoration: none;
        }

        @media (min-width: 768px) {
          .admin-nav-menu {
            display: block;
          }

          .system-admin-link {
            display: inline-block;
          }

          .admin-mobile-toggle {
            display: none;
          }
        }

        @media (min-width: 1024px) {
          .admin-nav-container {
            padding: 0 2rem;
          }
        }

        @media (max-width: 560px) {
          .admin-logo-text {
            font-size: 1.2rem;
          }

          .admin-logo-subtext {
            font-size: .62rem;
          }
        }
      `}</style>
    </nav>
  );
};

export default AdminNavigation;