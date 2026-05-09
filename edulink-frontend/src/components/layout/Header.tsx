import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Opportunities', path: '/opportunities' },
  { label: 'Why EduLink', path: '/why-us' },
  { label: 'About', path: '/about' },
  { label: 'For Admins', path: '/admin' },
  { label: 'Support', path: '/support' },
  { label: 'Contact', path: '/contact' },
];

  return (
    <header
      id="header"
      className={`edulink-header ${className} ${isScrolled ? 'scrolled' : ''}`}
    >
      <div className="header-container">
        <Link to="/" className="header-logo" onClick={closeMobileMenu}>
          <img src={edulinkLogo} alt="EduLink symbol" className="logo-mark" />

          <span className="logo-divider" aria-hidden="true" />

          <span className="logo-wordmark">
            <span className="sitename">
              <span className="sitename-edu">Edu</span>
              <span className="sitename-link">Link</span>
              <span className="sitename-ke"> KE</span>
            </span>
            <span className="logo-tagline">CONNECT • LEARN • GROW</span>
          </span>
        </Link>

        <nav className={`navmenu ${isMobileMenuOpen ? 'open' : ''}`}>
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions">
          <Link to="/login" className="btn-signin">
            Sign In
          </Link>

          <Link to="/register" className="btn-getstarted">
            Get Started
          </Link>

          <button
            type="button"
            className={`mobile-nav-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
            aria-controls="navmenu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="mobile-backdrop"
          onClick={closeMobileMenu}
          aria-label="Close navigation"
        />
      )}

      <style>{`
        .edulink-header {
          position: sticky;
          top: 0;
          z-index: 1020;
          width: 100%;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          transition: box-shadow .18s ease, border-color .18s ease;
        }

        .edulink-header.scrolled {
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          border-bottom-color: rgba(15, 23, 42, 0.08);
        }

        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .header-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .logo-mark {
          height: 31px;
          width: auto;
          flex-shrink: 0;
        }

        .logo-divider {
          width: 1px;
          height: 28px;
          background: rgba(15, 23, 42, 0.22);
          flex-shrink: 0;
        }

        .logo-wordmark {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
        }

        .sitename {
          display: inline-flex;
          align-items: baseline;
          color: #0f172a;
          font-family: Poppins, Inter, system-ui, sans-serif;
          line-height: 1;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.03em;
        }

        .sitename-edu {
          font-weight: 500;
        }

        .sitename-link {
          font-weight: 750;
        }

        .sitename-ke {
          font-size: 0.58em;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-left: 5px;
        }

        .logo-tagline {
          color: rgba(15, 23, 42, 0.72);
          font-family: Inter, system-ui, sans-serif;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .navmenu {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .navmenu ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .navmenu li {
          position: relative;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          color: #475569;
          font-size: 14px;
          font-weight: 650;
          text-decoration: none;
          border-radius: 999px;
          transition: color .16s ease, background .16s ease;
          white-space: nowrap;
        }

        .nav-link:hover {
          color: #069b8e;
          background: rgba(6, 155, 142, 0.07);
          text-decoration: none;
        }

        .nav-link.active {
          color: #069b8e;
          background: rgba(6, 155, 142, 0.1);
        }

        .header-actions {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .btn-signin {
          color: #334155;
          text-decoration: none;
          font-size: 14px;
          font-weight: 750;
          padding: 8px 13px;
          border-radius: 999px;
          transition: color .16s ease, background .16s ease;
        }

        .btn-signin:hover {
          color: #069b8e;
          background: rgba(6, 155, 142, 0.07);
          text-decoration: none;
        }

        .btn-getstarted {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 18px;
          border-radius: 999px;
          background: #069b8e;
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          transition: background .16s ease, transform .12s ease;
        }

        .btn-getstarted:hover {
          background: #057e73;
          color: #ffffff;
          text-decoration: none;
          transform: translateY(-1px);
        }

        .mobile-nav-toggle {
          display: none;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 11px;
          background: #ffffff;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
          padding: 0;
          position: relative;
          z-index: 1040;
        }

        .mobile-nav-toggle span {
          width: 17px;
          height: 2px;
          background: #0f172a;
          border-radius: 999px;
          transition: transform .18s ease, opacity .18s ease;
        }

        .mobile-nav-toggle.active span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }

        .mobile-nav-toggle.active span:nth-child(2) {
          opacity: 0;
        }

        .mobile-nav-toggle.active span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        .mobile-backdrop {
          display: none;
        }

        @media (max-width: 1100px) {
          .header-container {
            gap: 16px;
          }

          .nav-link {
            padding: 10px 9px;
            font-size: 13.5px;
          }

          .btn-signin {
            display: none;
          }
        }

        @media (max-width: 992px) {
          .header-container {
            padding: 10px 18px;
          }

          .navmenu {
            position: fixed;
            top: 68px;
            left: 18px;
            right: 18px;
            display: none;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.1);
            border-radius: 18px;
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
            z-index: 1035;
            overflow: hidden;
          }

          .navmenu.open {
            display: block;
          }

          .navmenu ul {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            padding: 8px;
          }

          .navmenu li {
            width: 100%;
          }

          .nav-link {
            width: 100%;
            justify-content: flex-start;
            border-radius: 12px;
            padding: 13px 14px;
            font-size: 15px;
          }

          .mobile-nav-toggle {
            display: inline-flex;
          }

          .mobile-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 1030;
            background: rgba(15, 23, 42, 0.38);
            border: 0;
            padding: 0;
          }
        }

        @media (max-width: 640px) {
          .header-container {
            padding: 8px 14px;
          }

          .logo-mark {
            height: 28px;
          }

          .logo-divider {
            height: 24px;
          }

          .sitename {
            font-size: 23px;
          }

          .logo-tagline {
            display: none;
          }

          .btn-getstarted {
            min-height: 34px;
            padding: 0 12px;
            font-size: 12px;
          }

          .mobile-nav-toggle {
            width: 35px;
            height: 35px;
          }

          .navmenu {
            top: 58px;
            left: 12px;
            right: 12px;
          }
        }

        @media (max-width: 420px) {
          .logo-divider {
            display: none;
          }

          .sitename {
            font-size: 21px;
          }

          .btn-getstarted {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;