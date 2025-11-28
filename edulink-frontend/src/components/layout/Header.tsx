import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    const next = !isMobileMenuOpen;
    setIsMobileMenuOpen(next);
    document.body.classList.toggle('mobile-nav-active', next);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.classList.remove('mobile-nav-active');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.classList.remove('mobile-nav-active');
  }, [location.pathname]);

  return (
    <header id="header" className={`header d-flex align-items-center sticky-top ${className} ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container-fluid container-xl position-relative d-flex align-items-center justify-content-between">
        {/* Logo - Exact match to original */}
        <Link to="/" className="logo d-flex align-items-center me-auto">
          <h1 className="sitename">EduLink</h1>
        </Link>

        {/* Desktop Navigation - Exact structure from HTML */}
        <nav id="navmenu" className="navmenu">
          <ul>
            <li>
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Home
              </Link>
            </li>
            <li className="dropdown">
              <Link 
                to="/about" 
                className={`nav-link ${isActive('/about') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                About
              </Link>
            </li>
            <li>
              <Link 
                to="/contact" 
                className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Contact
              </Link>
            </li>
            <li>
              <Link 
                to="/support" 
                className={`nav-link ${isActive('/support') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Support Features
              </Link>
            </li>
            <li>
              <Link 
                to="/search" 
                className={`nav-link ${isActive('/search') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Search
              </Link>
            </li>
          </ul>
        </nav>

        {/* Header Actions - Exact match to original */}
        <div className="header-actions d-flex align-items-center">
          <Link to="/register" className="btn-getstarted">
            Get Started
          </Link>
          <i
            className={`mobile-nav-toggle d-xl-none bi ${isMobileMenuOpen ? 'bi-x' : 'bi-list'} ms-3`}
            onClick={toggleMobileMenu}
            style={{ cursor: 'pointer', fontSize: '28px' }}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
            aria-controls="navmenu"
          />
        </div>
      </div>

      <style>{`
        .header {
          color: var(--default-color);
          background-color: var(--background-color);
          padding: 15px 0;
          transition: all 0.5s;
          z-index: 997;
        }

        .header .logo {
          line-height: 1;
          text-decoration: none;
        }

        .header .logo img {
          max-height: 28px;
          margin-right: 6px;
        }

        .header .logo h1 {
          font-weight: 700;
          font-size: 18px;
          margin: 0;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--accent-color);
        }

        .header .btn-getstarted,
        .header .btn-getstarted:focus {
          color: var(--contrast-color);
          background: var(--accent-color);
          font-size: 14px;
          padding: 8px 25px;
          margin: 0 0 0 30px;
          border-radius: 50px;
          transition: 0.3s;
          text-decoration: none;
        }

        .header .btn-getstarted:hover,
        .header .btn-getstarted:focus:hover {
          color: var(--contrast-color);
          background: color-mix(in srgb, var(--accent-color), transparent 15%);
          text-decoration: none;
        }

        .container-fluid.container-xl {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding-left: 12px;
          padding-right: 12px;
          box-sizing: border-box;
        }

        .logo .sitename {
          font-weight: 700;
          font-size: 26px;
          margin: 0;
          line-height: 1;
          color: var(--accent-color);
        }

        .navmenu {
          padding: 0;
        }

        .navmenu ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          align-items: center;
        }

        .navmenu li {
          position: relative;
        }

        .navmenu a,
        .navmenu a:focus {
          color: var(--nav-color);
          padding: 18px 15px;
          font-size: 16px;
          font-family: var(--nav-font);
          font-weight: 400;
          display: flex;
          align-items: center;
          justify-content: space-between;
          white-space: nowrap;
          transition: 0.3s;
          text-decoration: none;
        }

        .navmenu a i,
        .navmenu a:focus i {
          font-size: 12px;
          line-height: 0;
          margin-left: 5px;
          transition: 0.3s;
        }

        .navmenu li:last-child a {
          padding-right: 0;
        }

        .navmenu li:hover>a,
        .navmenu .active,
        .navmenu .active:focus {
          color: var(--nav-hover-color);
        }

        /* Dropdown styles - Exact match from reference theme */
        .navmenu .dropdown ul {
          margin: 0;
          padding: 10px 0;
          background: var(--nav-dropdown-background-color);
          display: block;
          position: absolute;
          visibility: hidden;
          left: 14px;
          top: 130%;
          opacity: 0;
          transition: 0.3s;
          border-radius: 4px;
          z-index: 99;
          box-shadow: 0px 0px 30px rgba(127, 137, 161, 0.25);
        }

        .navmenu .dropdown ul li {
          min-width: 200px;
        }

        .navmenu .dropdown ul a {
          padding: 10px 20px;
          font-size: 15px;
          text-transform: none;
          color: var(--nav-dropdown-color);
        }

        .navmenu .dropdown ul a i {
          font-size: 12px;
        }

        .navmenu .dropdown ul a:hover,
        .navmenu .dropdown ul .active:hover,
        .navmenu .dropdown ul li:hover>a {
          color: var(--nav-dropdown-hover-color);
        }

        .navmenu .dropdown:hover>ul {
          opacity: 1;
          top: 100%;
          visibility: visible;
        }

        .header-actions {
          margin-left: 15px;
        }

        .header.scrolled {
          box-shadow: 0px 0 18px rgba(0, 0, 0, 0.1);
        }

        .mobile-nav-toggle {
          color: var(--nav-color);
          font-size: 28px;
          line-height: 0;
          margin-right: 10px;
          cursor: pointer;
          transition: color 0.3s;
          background: transparent;
          border: 0;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-nav-toggle:hover {
          color: var(--nav-hover-color);
        }



        /* Responsive Design - Exact match from reference theme */
        @media (max-width: 1200px) {
          .container-fluid.container-xl {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
          }
          .container-fluid.container-xl > .logo { order: 1; margin-right: auto !important; }
          .container-fluid.container-xl > .navmenu { order: 2; }
          .container-fluid.container-xl > .header-actions { order: 3; display: flex !important; align-items: center; }
          .header-actions .btn-getstarted { order: 1; }
          .header-actions .mobile-nav-toggle { order: 2; margin-left: 15px !important; }
        }

        @media (max-width: 1199px) {
          .navmenu {
            padding: 0;
            z-index: 9997;
          }
          
          .navmenu ul {
            display: none;
            list-style: none;
            position: absolute;
            inset: 60px 20px 20px 20px;
            padding: 10px 0;
            margin: 0;
            border-radius: 6px;
            background-color: var(--nav-mobile-background-color);
            border: 1px solid color-mix(in srgb, var(--default-color), transparent 90%);
            box-shadow: none;
            overflow-y: auto;
            transition: 0.3s;
            z-index: 9998;
          }
          
          .navmenu a,
          .navmenu a:focus {
            color: var(--nav-dropdown-color);
            padding: 10px 20px;
            font-family: var(--nav-font);
            font-size: 17px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: space-between;
            white-space: nowrap;
            transition: 0.3s;
          }
          
          .navmenu a i,
          .navmenu a:focus i {
            font-size: 12px;
            line-height: 0;
            margin-left: 5px;
          }
          
          .navmenu a:hover,
          .navmenu .active,
          .navmenu .active:focus {
            color: var(--nav-dropdown-hover-color);
          }
          
          .navmenu a,
          .navmenu a:focus {
            color: var(--nav-dropdown-color);
            padding: 10px 20px;
            font-family: var(--nav-font);
            font-size: 17px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: space-between;
            white-space: nowrap;
            transition: 0.3s;
          }
          
          .header-actions {
            margin-left: auto;
          }
          
          .navmenu a:hover,
          .navmenu .active,
          .navmenu .active:focus {
            color: var(--nav-dropdown-hover-color);
          }
          
          .mobile-nav-active {
            overflow: hidden;
          }
          
          .mobile-nav-active .mobile-nav-toggle {
            color: #fff;
            position: absolute;
            font-size: 32px;
            top: 15px;
            right: 15px;
            margin-right: 0;
            z-index: 9999;
          }
          
          .mobile-nav-active .navmenu {
            position: fixed;
            overflow: hidden;
            inset: 0;
            background: rgba(33, 37, 41, 0.8);
            transition: 0.3s;
          }
          
          .mobile-nav-active .navmenu>ul {
            display: block;
          }
        }

        @media (min-width: 1200px) {
          .mobile-nav-toggle {
            display: none;
          }
          
          .navmenu li {
            margin: 0 3px;
          }
          
          .navmenu ul {
            display: flex !important;
            align-items: center;
          }
          
          .container-fluid.container-xl {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
          }
          .container-fluid.container-xl > .logo { order: 1; margin-right: auto !important; }
          .container-fluid.container-xl > .navmenu { order: 2; }
          .container-fluid.container-xl > .header-actions { order: 3; display: flex !important; align-items: center; }
          .header-actions .btn-getstarted { order: 1; }
          .header-actions .mobile-nav-toggle { order: 2; margin-left: 12px !important; }
        }

        @media (max-width: 576px) {
          .header {
            padding: 6px 0;
            min-height: 50px;
          }
          
          .logo .sitename {
            font-size: 16px;
          }
          
          .btn-getstarted {
            padding: 3px 10px;
            font-size: 12px;
            margin-left: 8px;
          }
          
          .mobile-nav-toggle {
            font-size: 20px;
          }
        }

        /* Ensure proper spacing and alignment */
        .d-flex.align-items-center {
          align-items: center !important;
        }

        .justify-content-between {
          justify-content: space-between !important;
        }

        .position-relative {
          position: relative !important;
        }

        .me-auto {
          margin-right: auto !important;
        }

        .ms-3 {
          margin-left: 1rem !important;
        }

        .sticky-top {
          position: sticky;
          top: 0;
          z-index: 1020;
        }
      `}</style>
    </header>
  );
};

export default Header;
