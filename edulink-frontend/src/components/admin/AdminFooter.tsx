import React from 'react';
import { Link } from 'react-router-dom';

interface AdminFooterProps {
  className?: string;
}

const AdminFooter: React.FC<AdminFooterProps> = ({
  className = '',
}) => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    access: [
      { name: 'Institutions', href: '/institutions/request' },
      { name: 'Employer Onboarding', href: '/employer/onboarding' },
      { name: 'Student Opportunities', href: '/opportunities' },
    ],

    support: [
      { name: 'Support Center', href: '/support' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Contact', href: '/contact' },
    ],

    trust: [
      { name: 'Trust & Verification', href: '/trust-policy' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  };

  return (
    <footer className={`admin-footer ${className}`}>
      <div className="admin-footer-container">
        {/* Top */}
        <div className="admin-footer-content">
          {/* Brand */}
          <div className="admin-footer-brand">
            <Link to="/" className="admin-footer-logo">
              <div className="admin-footer-logo-stack">
                <span className="admin-footer-logo-text">
                  EduLink
                </span>

                <span className="admin-footer-logo-badge">
                  Partner Access
                </span>
              </div>
            </Link>

            <p className="admin-footer-description">
              EduLink KE helps institutions and employers
              manage verified attachment and internship
              workflows through structured placement,
              supervision, reporting, and completion records.
            </p>

            <div className="admin-footer-meta">
              Verified placements · Institutional oversight · Trusted outcomes
            </div>
          </div>

          {/* Links */}
          <div className="admin-footer-links">
            <div className="admin-footer-links-group">
              <h3>Access</h3>

              <ul>
                {footerLinks.access.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="admin-footer-links-group">
              <h3>Support</h3>

              <ul>
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="admin-footer-links-group">
              <h3>Trust</h3>

              <ul>
                {footerLinks.trust.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="admin-footer-bottom">
          <div className="admin-footer-bottom-content">
            <p className="admin-footer-copyright">
              © {currentYear} EduLink KE. All rights reserved.
            </p>

            <div className="admin-footer-bottom-right">
              <span>Built by</span>

              <a
                href="https://sinapstechnology.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-footer-design-link"
              >
                Sinaps Technology
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-footer {
          background: #0f172a;
          color: #d1d5db;
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,.05);
        }

        .admin-footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 1rem 2rem;
        }

        .admin-footer-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          margin-bottom: 2.5rem;
        }

        .admin-footer-brand {
          max-width: 28rem;
        }

        .admin-footer-logo {
          text-decoration: none;
          display: inline-block;
          margin-bottom: 1.2rem;
        }

        .admin-footer-logo-stack {
          display: flex;
          flex-direction: column;
        }

        .admin-footer-logo-text {
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 850;
          letter-spacing: -.04em;
        }

        .admin-footer-logo-badge {
          margin-top: 4px;
          color: #10b981;
          font-size: .72rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .admin-footer-description {
          color: #94a3b8;
          line-height: 1.8;
          font-size: .92rem;
          margin-bottom: 1rem;
        }

        .admin-footer-meta {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
          line-height: 1.6;
        }

        .admin-footer-links {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 2rem;
        }

        .admin-footer-links-group h3 {
          color: #ffffff;
          font-size: .82rem;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 1rem;
        }

        .admin-footer-links-group ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .admin-footer-links-group li {
          margin-bottom: .75rem;
        }

        .admin-footer-links-group a {
          color: #94a3b8;
          text-decoration: none;
          font-size: .9rem;
          transition: color .2s ease;
        }

        .admin-footer-links-group a:hover {
          color: #ffffff;
        }

        .admin-footer-bottom {
          border-top: 1px solid rgba(255,255,255,.06);
          padding-top: 1.5rem;
        }

        .admin-footer-bottom-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .admin-footer-copyright {
          margin: 0;
          color: #64748b;
          font-size: .84rem;
        }

        .admin-footer-bottom-right {
          display: flex;
          align-items: center;
          gap: .45rem;
          color: #64748b;
          font-size: .84rem;
        }

        .admin-footer-design-link {
          color: #10b981;
          text-decoration: none;
          font-weight: 700;
        }

        .admin-footer-design-link:hover {
          color: #34d399;
        }

        @media (min-width: 768px) {
          .admin-footer-content {
            grid-template-columns: 1fr 1.2fr;
          }

          .admin-footer-links {
            grid-template-columns: repeat(3,1fr);
          }

          .admin-footer-bottom-content {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        @media (min-width: 1024px) {
          .admin-footer-container {
            padding: 4.5rem 2rem 2rem;
          }
        }

        @media (max-width: 560px) {
          .admin-footer-links {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
};

export default AdminFooter;