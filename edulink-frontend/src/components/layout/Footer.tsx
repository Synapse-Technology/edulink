import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setShowLoading(true);
    setMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      setIsSuccess(true);
      setMessage('Thank you. You have joined the EduLink KE updates list.');
      setEmail('');
    } catch {
      setIsSuccess(false);
      setMessage('Unable to process your subscription. Please try again.');
    } finally {
      setShowLoading(false);

      setTimeout(() => {
        setMessage('');
        setIsSuccess(false);
      }, 5000);
    }
  };

  return (
    <footer id="footer" className={`footer footer-brand ${className}`}>
      <div className="container footer-top">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-about">
            <Link to="/" className="footer-logo">
              EduLink KE
            </Link>

            <p className="footer-summary">
              Verified attachments, internships, digital logbooks, and career
              transition workflows for students, employers, and institutions.
            </p>

            <div className="footer-contact">
              <p>JKUAT, Juja</p>
              <p>Kenya</p>
              <p className="mt-3">
                <strong>Email:</strong>{' '}
                <a href="mailto:info@sinapstechnology.tech">
                  info@sinapstechnology.tech
                </a>
              </p>
            </div>

            <div className="social-links">
              <a
                href="https://twitter.com/edulinkke"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
              >
                <i className="bi bi-twitter-x"></i>
              </a>

              <a
                href="https://facebook.com/edulinkke"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <i className="bi bi-facebook"></i>
              </a>

              <a
                href="https://instagram.com/edulinkke"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <i className="bi bi-instagram"></i>
              </a>

              <a
                href="https://linkedin.com/company/synapsetechnology/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <i className="bi bi-linkedin"></i>
              </a>
            </div>
          </div>

          {/* Platform */}
          <div className="footer-links">
            <h4>Platform</h4>
            <ul>
              <li><Link to="/opportunities">Find Opportunities</Link></li>
              <li><Link to="/login">Student Portal</Link></li>
              <li><Link to="/employer/login">Employer Portal</Link></li>
              <li><Link to="/institution/login">Institution Portal</Link></li>
              <li><Link to="/success-stories">Student Outcomes</Link></li>
            </ul>
          </div>

          {/* Partners */}
          <div className="footer-links">
            <h4>Partners</h4>
            <ul>
              <li><Link to="/institutions/request">Institution Onboarding</Link></li>
              <li><Link to="/employer/onboarding">Employer Onboarding</Link></li>
              <li><Link to="/edulink-beta">Beta & Pilot Partners</Link></li>
              <li><Link to="/trust-policy">Trust & Pilot Policy</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="footer-links">
            <h4>Support</h4>
            <ul>
              <li><Link to="/support">Support Center</Link></li>
              <li><Link to="/support/history">Track Tickets</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="footer-newsletter">
            <h4>Join Our Newsletter</h4>

            <p>
              Get updates on verified internships, pilot opportunities, product
              improvements, and student career events.
            </p>

            <form onSubmit={handleNewsletterSubmit}>
              <div className="newsletter-form">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={showLoading}
                  required
                />

                <button type="submit" disabled={showLoading || !email.trim()}>
                  {showLoading ? 'Joining…' : 'Subscribe'}
                </button>
              </div>

              {showLoading && <div className="loading">Processing subscription…</div>}
              {!isSuccess && message && <div className="error-message">{message}</div>}
              {isSuccess && <div className="sent-message">{message}</div>}
            </form>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>
          © {new Date().getFullYear()}{' '}
          <strong>EduLink KE</strong>. All Rights Reserved.
        </p>

        <div className="credits">
          Built under{' '}
          <a
            href="https://sinapstechnology.tech"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sinaps Technology
          </a>
        </div>
      </div>

      <style>{`
        .footer-brand {
          background:
            radial-gradient(circle at top left, rgba(6,155,142,.12), transparent 30%),
            #0b1f1c;
          color: rgba(255,255,255,.66);
          padding: 70px 0 28px;
          font-size: 14px;
        }

        .footer-brand .container {
          max-width: 1180px;
          width: 100%;
          margin: 0 auto;
          padding: 0 20px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.3fr .85fr .95fr .85fr 1.25fr;
          gap: 34px;
          align-items: flex-start;
        }

        .footer-logo {
          display: inline-flex;
          color: #ffffff;
          text-decoration: none;
          font-size: 1.55rem;
          font-weight: 800;
          letter-spacing: -.04em;
          margin-bottom: 15px;
        }

        .footer-summary {
          max-width: 310px;
          line-height: 1.75;
          color: rgba(255,255,255,.52);
          margin: 0 0 20px;
        }

        .footer-contact p {
          margin: 0 0 6px;
          color: rgba(255,255,255,.58);
        }

        .footer-contact strong {
          color: rgba(255,255,255,.86);
        }

        .footer-contact a {
          color: rgba(255,255,255,.65);
          text-decoration: none;
        }

        .footer-contact a:hover {
          color: #0bbfa3;
        }

        .social-links {
          display: flex;
          gap: 9px;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        .social-links a {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.08);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,.78);
          font-size: 15px;
          text-decoration: none;
          transition: background .16s ease, color .16s ease, transform .16s ease;
        }

        .social-links a:hover {
          background: rgba(11,191,163,.15);
          color: #0bbfa3;
          transform: translateY(-2px);
        }

        .footer-links h4,
        .footer-newsletter h4 {
          color: #ffffff;
          font-size: .82rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin: 0 0 16px;
        }

        .footer-links ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .footer-links a {
          color: rgba(255,255,255,.55);
          text-decoration: none;
          line-height: 1.45;
          transition: color .16s ease;
        }

        .footer-links a:hover {
          color: #0bbfa3;
        }

        .footer-newsletter {
          padding: 20px;
          border-radius: 18px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.08);
        }

        .footer-newsletter p {
          color: rgba(255,255,255,.55);
          line-height: 1.65;
          margin: 0 0 18px;
        }

        .newsletter-form {
          display: flex;
          align-items: stretch;
          gap: 8px;
        }

        .newsletter-form input[type=email] {
          min-width: 0;
          flex: 1;
          height: 42px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.06);
          color: #ffffff;
          padding: 0 12px;
          outline: none;
          font-size: .88rem;
        }

        .newsletter-form input[type=email]::placeholder {
          color: rgba(255,255,255,.36);
        }

        .newsletter-form input[type=email]:focus {
          border-color: rgba(11,191,163,.7);
          box-shadow: 0 0 0 3px rgba(11,191,163,.14);
        }

        .newsletter-form input[type=email]:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .newsletter-form button {
          height: 42px;
          border: 0;
          border-radius: 10px;
          background: #069b8e;
          color: #ffffff;
          padding: 0 15px;
          font-weight: 800;
          font-size: .84rem;
          cursor: pointer;
          transition: background .16s ease, transform .12s ease;
          white-space: nowrap;
        }

        .newsletter-form button:hover:not(:disabled) {
          background: #057e73;
          transform: translateY(-1px);
        }

        .newsletter-form button:disabled {
          opacity: .58;
          cursor: not-allowed;
        }

        .loading,
        .error-message,
        .sent-message {
          margin-top: 10px;
          font-size: .8rem;
          line-height: 1.5;
        }

        .loading {
          color: rgba(255,255,255,.48);
        }

        .error-message {
          color: #ffb4b4;
        }

        .sent-message {
          color: #86efac;
        }

        .footer-bottom {
          margin-top: 46px;
          padding-top: 22px !important;
          border-top: 1px solid rgba(255,255,255,.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          color: rgba(255,255,255,.42);
          font-size: .82rem;
        }

        .footer-bottom p {
          margin: 0;
        }

        .footer-bottom strong {
          color: rgba(255,255,255,.76);
        }

        .credits {
          color: rgba(255,255,255,.42);
        }

        .credits a {
          color: rgba(255,255,255,.56);
          text-decoration: none;
          font-weight: 800;
        }

        .credits a:hover {
          color: #0bbfa3;
        }

        @media (max-width: 1100px) {
          .footer-grid {
            grid-template-columns: 1.4fr 1fr 1fr;
          }

          .footer-newsletter {
            grid-column: span 2;
          }
        }

        @media (max-width: 768px) {
          .footer-brand {
            padding: 54px 0 24px;
          }

          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 30px;
          }

          .footer-about,
          .footer-newsletter {
            grid-column: 1 / -1;
          }

          .footer-summary {
            max-width: 520px;
          }
        }

        @media (max-width: 560px) {
          .footer-grid {
            grid-template-columns: 1fr;
          }

          .footer-about,
          .footer-newsletter {
            grid-column: auto;
          }

          .newsletter-form {
            flex-direction: column;
          }

          .newsletter-form button {
            width: 100%;
          }

          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;