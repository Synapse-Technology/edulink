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

const AdminNavigation: React.FC<AdminNavigationProps> = ({ className = '' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const navigation: NavigationItem[] = [
    { name: 'Institutional Portal', href: '/institutions/request', current: location.pathname.startsWith('/institutions/request') },
    { name: 'Employer Portal', href: '/employer/onboarding', current: location.pathname.startsWith('/employer/onboarding') },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    // This effect runs when location changes to close the mobile menu
    // The linter warning is expected behavior for this use case
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <nav className={`admin-navigation ${className} ${isScrolled ? 'scrolled' : ''}`}>
      <div className="admin-nav-container">
        {/* Logo Section */}
        <div className="admin-nav-brand">
          <Link to="/" className="admin-logo">
            <span className="admin-logo-text">EduLink</span>
            <span className="admin-logo-badge">Admin</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="admin-nav-menu">
          <ul className="admin-nav-list">
            {navigation.map((item) => (
              <li key={item.name} className="admin-nav-item">
                <Link
                  to={item.href}
                  className={`admin-nav-link ${item.current ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* User Actions */}
        <div className="admin-nav-actions">
          {/* Mobile Menu Toggle */}
          <button
            className="admin-mobile-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
          >
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`admin-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-mobile-menu-content">
          <ul className="admin-mobile-nav-list">
            {navigation.map((item) => (
              <li key={item.name} className="admin-mobile-nav-item">
                <Link
                  to={item.href}
                  className={`admin-mobile-nav-link ${item.current ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        .admin-navigation {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(229, 231, 235, 0.5);
          z-index: 1000;
          transition: all 0.3s ease;
        }

        .admin-navigation.scrolled {
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .admin-nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 4rem;
        }

        .admin-nav-brand {
          display: flex;
          align-items: center;
        }

        .admin-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
          gap: 0.5rem;
        }

        .admin-logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.025em;
        }

        .admin-logo-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: #059669;
          background: #d1fae5;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .admin-nav-menu {
          display: none;
        }

        .admin-nav-list {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 0.5rem;
        }

        .admin-nav-link {
          display: block;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .admin-nav-link:hover {
          color: #111827;
          background: #f3f4f6;
        }

        .admin-nav-link.active {
          color: #059669;
          background: #d1fae5;
        }

        .admin-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-nav-secondary-btn {
          display: none;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          text-decoration: none;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .admin-nav-secondary-btn:hover {
          color: #111827;
          background: #f3f4f6;
        }

        .admin-nav-primary-btn {
          display: none;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          background: #059669;
          text-decoration: none;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .admin-nav-primary-btn:hover {
          background: #047857;
        }

        .admin-mobile-toggle {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 2rem;
          height: 2rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          gap: 0.25rem;
        }

        .hamburger-line {
          width: 1.25rem;
          height: 0.125rem;
          background: #374151;
          transition: all 0.3s ease;
          border-radius: 0.125rem;
        }

        .hamburger-line.open:nth-child(1) {
          transform: rotate(45deg) translate(0.25rem, 0.25rem);
        }

        .hamburger-line.open:nth-child(2) {
          opacity: 0;
        }

        .hamburger-line.open:nth-child(3) {
          transform: rotate(-45deg) translate(0.25rem, -0.25rem);
        }

        .admin-mobile-menu {
          position: fixed;
          top: 4rem;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          transform: translateY(-100%);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 999;
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
          margin-bottom: 1rem;
        }

        .admin-mobile-nav-item {
          margin-bottom: 0.5rem;
        }

        .admin-mobile-nav-link {
          display: block;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          text-decoration: none;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .admin-mobile-nav-link:hover {
          color: #111827;
          background: #f3f4f6;
        }

        .admin-mobile-nav-link.active {
          color: #059669;
          background: #d1fae5;
        }

        .admin-mobile-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-mobile-secondary-btn {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          text-decoration: none;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          text-align: center;
          transition: all 0.2s ease;
        }

        .admin-mobile-secondary-btn:hover {
          color: #111827;
          background: #f3f4f6;
        }

        .admin-mobile-primary-btn {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          background: #059669;
          text-decoration: none;
          border-radius: 0.375rem;
          text-align: center;
          transition: all 0.2s ease;
        }

        .admin-mobile-primary-btn:hover {
          background: #047857;
        }

        @media (min-width: 768px) {
          .admin-nav-menu {
            display: block;
            margin-left: auto;
          }

          .admin-nav-secondary-btn {
            display: inline-block;
          }

          .admin-nav-primary-btn {
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

          .admin-nav-list {
            gap: 1rem;
          }

          .admin-nav-link {
            padding: 0.5rem 1.25rem;
            font-size: 0.9375rem;
          }
        }
      `}</style>
    </nav>
  );
};

export default AdminNavigation;