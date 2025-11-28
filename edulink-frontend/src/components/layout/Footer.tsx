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
      // Simulate API call with loading state
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
      setMessage('Your subscription request has been sent. Thank you!');
      setEmail('');
      setShowLoading(false);
    } catch {
      setIsSuccess(false);
      setMessage('There was an error processing your subscription.');
      setShowLoading(false);
    } finally {
      // Auto-clear message after 5 seconds
      setTimeout(() => {
        setMessage('');
        setIsSuccess(false);
      }, 5000);
    }
  };

  return (
    <footer id="footer" className={`footer position-relative footer-brand ${className}`}>
      <div className="container footer-top">
        <div className="row gy-4">
          {/* About Section */}
          <div className="col-lg-4 col-md-6 footer-about">
            <a href="/" className="logo d-flex align-items-center">
              <span className="sitename">EduLink KE</span>
            </a>
            <div className="footer-contact pt-3">
              <p>JKUAT, Juja</p>
              <p>Nairobi, Kenya</p>
              <p className="mt-3"><strong>Phone:</strong> <span>+254 712 345 678</span></p>
              <p><strong>Email:</strong> <span>info@edulink.co.ke</span></p>
            </div>
            <div className="social-links d-flex mt-4">
              <a href="https://twitter.com/edulinkke" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <i className="bi bi-twitter-x"></i>
              </a>
              <a href="https://facebook.com/edulinkke" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://instagram.com/edulinkke" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="bi bi-instagram"></i>
              </a>
              <a href="https://linkedin.com/company/synapsetechnology/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <i className="bi bi-linkedin"></i>
              </a>
            </div>
          </div>

          {/* Useful Links */}
          <div className="col-lg-2 col-md-3 footer-links">
            <h4>Useful Links</h4>
            <ul>
              <li><Link to="/download">Download App</Link></li>
              <li><Link to="/policy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
              <li><Link to="/help">Help</Link></li>
              <li><Link to="/chat">Chat with Staff</Link></li>
            </ul>
          </div>

          {/* Our Services */}
          <div className="col-lg-2 col-md-3 footer-links">
            <h4>Our Services</h4>
            <ul>
              <li><Link to="/internships">Internship Listings</Link></li>
              <li><Link to="/certifications">Digital Certifications</Link></li>
              <li><Link to="/tracking">Performance Tracking</Link></li>
              <li><Link to="/employer-dashboard">Employer Dashboard</Link></li>
              <li><Link to="/reports">Institution Reports</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-lg-4 col-md-12 footer-newsletter">
            <h4>Our Newsletter</h4>
            <p>Stay updated on verified internships, new features, and student career events.</p>
            <form onSubmit={handleNewsletterSubmit} className="">
              <div className="newsletter-form">
                <input 
                  type="email" 
                  name="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input 
                  type="submit" 
                  value="Subscribe" 
                />
              </div>
              {showLoading && <div className="loading">Loading</div>}
              {!isSuccess && message && <div className="error-message">{message}</div>}
              {isSuccess && <div className="sent-message">{message}</div>}
            </form>
          </div>
        </div>
      </div>

      <div className="container copyright text-center mt-4">
        <p>© <span>Copyright</span> <strong className="px-1 sitename">EduLink KE</strong> <span>All Rights Reserved</span></p>
        <div className="credits">
          Designed &amp; Developed by <a href="https://synapsetechnology.co.ke" target="_blank" rel="noopener noreferrer">Synapse Technology</a>
        </div>
      </div>

      <style>{`
        /* Let Bootstrap handle the grid layout - remove conflicting flex properties */
        .footer-brand .row {
          /* Bootstrap handles this automatically */
        }
        
        .footer-brand {
          background: #112019;
          color: #c0c0c0;
          padding: 60px 0 30px 0;
          font-size: 14px;
          position: relative;
        }

        .footer-brand .footer-top {
          padding-top: 50px;
        }

        .footer-brand .footer-about .logo {
          margin-bottom: 0;
          text-decoration: none;
        }

        .footer-brand .footer-about .logo span {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 1px;
          font-family: var(--heading-font, 'Raleway', sans-serif);
          color: #ffffff;
        }

        .footer-brand .footer-contact p {
          color: #c0c0c0;
          margin-bottom: 5px;
        }

        .footer-brand .footer-contact strong {
          color: #ffffff;
        }

        .footer-brand .social-links a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          font-size: 16px;
          color: #ffffff;
          margin-right: 8px;
          transition: 0.3s;
          text-decoration: none;
        }

        .footer-brand .social-links a:hover {
          background: #28a745;
          color: #ffffff;
          transform: translateY(-2px);
        }

        .footer-brand h4 {
          font-size: 16px;
          font-weight: 600;
          position: relative;
          padding-bottom: 12px;
          color: #ffffff;
        }

        .footer-brand .footer-links {
          margin-bottom: 30px;
        }

        .footer-brand .footer-links ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-brand .footer-links ul li {
          padding: 6px 0;
          display: flex;
          align-items: center;
        }

        .footer-brand .footer-links ul li:first-child {
          padding-top: 0;
        }

        .footer-brand .footer-links ul a {
          color: #c0c0c0;
          display: inline-block;
          line-height: 1;
          transition: 0.3s;
          text-decoration: none;
        }

        .footer-brand .footer-links ul a:hover {
          color: rgb(10, 189, 174);
          text-decoration: none;
        }

        .footer-brand .footer-newsletter .newsletter-form {
          margin-top: 30px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }

        .footer-brand .footer-newsletter .newsletter-form input[type=email] {
          background: transparent;
          border: solid 1px rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 10px;
          flex: 1;
          margin-right: 10px;
        }

        .footer-brand .footer-newsletter .newsletter-form input[type=email]:focus {
          outline: none;
          border-color: rgb(10, 189, 174);
        }

        .footer-brand .footer-newsletter .newsletter-form input[type=submit] {
          background: rgb(6, 165, 144);
          padding: 10px 20px;
          border: 0;
          color: #ffffff;
          cursor: pointer;
          transition: 0.3s;
        }

        .footer-brand .footer-newsletter .newsletter-form input[type=submit]:hover {
          background: rgba(6, 165, 144, 0.8);
        }

        .footer-brand .footer-newsletter .newsletter-form input[type=submit]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Message divs styling to match original */
        .footer-brand .footer-newsletter .loading,
        .footer-brand .footer-newsletter .error-message,
        .footer-brand .footer-newsletter .sent-message {
          font-size: 14px;
          margin-top: 10px;
        }
        
        /* Ensure newsletter section aligns properly */
        .footer-brand .footer-newsletter {
          padding-left: 15px;
          padding-right: 15px;
        }
        
        .footer-brand .footer-newsletter h4 {
          margin-bottom: 15px;
        }
        
        .footer-brand .footer-newsletter p {
          margin-bottom: 20px;
        }
        
        .footer-brand .footer-newsletter .loading {
          color: #c0c0c0;
        }
        
        .footer-brand .footer-newsletter .error-message {
          color: #ff6b6b;
        }
        
        .footer-brand .footer-newsletter .sent-message {
          color: #51cf66;
        }

        .footer-brand .footer-newsletter .newsletter-form input[type=email]:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Ensure proper spacing between sections */
        .footer-brand .footer-about,
        .footer-brand .footer-links,
        .footer-brand .footer-newsletter {
          padding-bottom: 1rem;
        }
        
        /* Ensure consistent vertical alignment */
        .footer-brand .row {
          align-items: flex-start;
        }
        
        /* Container styling to match original layout */
        .footer-brand .container {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 15px;
          width: 100%;
        }
        
        .footer-brand .footer-top {
          padding-top: 50px;
          padding-left: 15px;
          padding-right: 15px;
        }
        
        /* Ensure proper row spacing */
        .footer-brand .row {
          margin-left: -15px;
          margin-right: -15px;
        }
        
        /* Ensure proper column spacing */
        .footer-brand .col-lg-4,
        .footer-brand .col-lg-2,
        .footer-brand .col-md-6,
        .footer-brand .col-md-3,
        .footer-brand .col-md-12 {
          padding-left: 15px;
          padding-right: 15px;
        }
        
        /* Fix logo section alignment to match other sections */
        .footer-brand .footer-about {
          padding-left: 15px;
          padding-right: 15px;
        }
        
        .footer-brand .footer-about .logo {
          margin-left: 0;
          padding-left: 0;
          text-decoration: none;
        }
        
        /* Ensure consistent baseline alignment across all sections */
        .footer-brand .footer-about,
        .footer-brand .footer-links,
        .footer-brand .footer-newsletter {
          margin-top: 0;
          padding-top: 0;
        }
        
        /* Ensure proper alignment of all footer sections */
        .footer-brand .footer-about,
        .footer-brand .footer-links,
        .footer-brand .footer-newsletter {
          box-sizing: border-box;
        }

        .footer-brand .loading,
        .footer-brand .error-message,
        .footer-brand .sent-message {
          font-size: 14px;
          margin-top: 10px;
        }

        .footer-brand .loading {
          color: #c0c0c0;
          display: block;
        }

        .footer-brand .error-message {
          color: #ff6b6b;
        }

        .footer-brand .sent-message {
          color: #51cf66;
        }

        .footer-brand .copyright {
          padding-top: 30px;
          padding-bottom: 25px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background-color: rgba(255, 255, 255, 0.05);
          margin-top: 30px;
        }

        .footer-brand .copyright p {
          margin-bottom: 0;
          color: #c0c0c0;
        }

        .footer-brand .credits {
          margin-top: 6px;
          font-size: 13px;
          color: #999999;
        }

        .footer-brand .credits a {
          color: #999999;
          text-decoration: none;
          transition: 0.3s;
        }

        .footer-brand .credits a:hover {
          color: #28a745;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .footer-brand .col-md-6 {
            flex: 0 0 50%;
            max-width: 50%;
          }
          
          .footer-brand .col-md-3 {
            flex: 0 0 50%;
            max-width: 50%;
          }
          
          .footer-brand .col-md-12 {
            flex: 0 0 100%;
            max-width: 100%;
          }
          
          .footer-brand {
            padding: 40px 0 20px 0;
          }
          
          .footer-brand .footer-top {
            padding-top: 30px;
          }
          
          .footer-brand .footer-about,
          .footer-brand .footer-links,
          .footer-brand .footer-newsletter {
            margin-bottom: 2rem;
          }
        }

        @media (max-width: 576px) {
          .footer-brand .col-lg-4,
          .footer-brand .col-lg-2,
          .footer-brand .col-md-6,
          .footer-brand .col-md-3,
          .footer-brand .col-md-12 {
            flex: 0 0 100%;
            max-width: 100%;
          }
          
          .footer-brand .footer-newsletter .newsletter-form {
            flex-direction: column;
          }
          
          .footer-brand .footer-newsletter .newsletter-form input[type=email] {
            margin-right: 0;
            margin-bottom: 10px;
          }
          
          .footer-brand .footer-newsletter .newsletter-form input[type=submit] {
            width: 100%;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;