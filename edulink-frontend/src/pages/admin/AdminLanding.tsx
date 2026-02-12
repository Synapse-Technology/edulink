import React from 'react';
import { Link } from 'react-router-dom';
import AdminNavigation from '../../components/admin/AdminNavigation';
import AdminFooter from '../../components/admin/AdminFooter';

const AdminLanding: React.FC = () => {
  return (
    <div className="admin-landing">
      <AdminNavigation />
      <main className="admin-landing-main">
        {/* Hero Section */}
        <section className="admin-hero">
          <div className="admin-container">
            <div className="admin-hero-content">
              <h1 className="admin-hero-title">
                Connecting Students with
                <span className="admin-hero-highlight"> Opportunities</span>
              </h1>
              
              <p className="admin-hero-description">
                Edulink facilitates seamless connections between students seeking internships and organizations offering opportunities while providing robust management tools for educational institutions and employers.
              </p>
              
              <div className="admin-hero-actions">
                <Link to="/institution/request" className="admin-btn-primary">
                  <svg className="admin-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Institution Portal
                </Link>
                <Link to="/employer/onboarding" className="admin-btn-secondary">
                  <svg className="admin-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Employer Portal
                </Link>
                <Link to="/admin/login" className="admin-btn-secondary">
                  <svg className="admin-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  System Admin Login
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Institutional Administration Section */}
        <section id="institutions" className="admin-section">
          <div className="admin-container">
            <div className="admin-section-header">
              <h2 className="admin-section-title">For Educational Institutions</h2>
              <p className="admin-section-description">
                Comprehensive tools to monitor student activities, manage partnerships, and ensure academic compliance
              </p>
            </div>
            
            <div className="admin-grid">
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Student Oversight</h3>
                <p className="admin-card-description">
                  Monitor student internship activities, track progress, and facilitate academic integration with real-time updates.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Employer Relations</h3>
                <p className="admin-card-description">
                  Manage partnerships with industry organizations and coordinate placement opportunities efficiently.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Academic Integration</h3>
                <p className="admin-card-description">
                  Link internship activities with academic credit requirements and curriculum goals seamlessly.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Reporting System</h3>
                <p className="admin-card-description">
                  Generate comprehensive reports on program outcomes, placement rates, and student performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Employer Administration Section */}
        <section id="employers" className="admin-section alt">
          <div className="admin-container">
            <div className="admin-section-header">
              <h2 className="admin-section-title">For Employers</h2>
              <p className="admin-section-description">
                Streamline your recruitment process and manage internship programs with powerful tools
              </p>
            </div>
            
            <div className="admin-grid">
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Opportunity Posting</h3>
                <p className="admin-card-description">
                  Create detailed internship listings with specific requirements and descriptions to attract the right talent.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Candidate Management</h3>
                <p className="admin-card-description">
                  Review applications, shortlist candidates, and manage your hiring pipeline from a single dashboard.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Student Evaluation</h3>
                <p className="admin-card-description">
                  Assess intern performance with structured evaluation forms and provide valuable feedback.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Analytics Dashboard</h3>
                <p className="admin-card-description">
                  Monitor recruitment metrics and internship program effectiveness with advanced analytics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* System Value Section */}
        <section id="features" className="admin-section">
          <div className="admin-container">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Why Edulink?</h2>
              <p className="admin-section-description">
                Empowering administrators with control, clarity, and compliance
              </p>
            </div>
            
            <div className="admin-grid">
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Centralized Control</h3>
                <p className="admin-card-description">
                  Manage all stakeholders, programs, and settings from a single, unified dashboard.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Data-Driven Insights</h3>
                <p className="admin-card-description">
                  Make informed decisions with real-time analytics on placement rates and performance.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Secure Compliance</h3>
                <p className="admin-card-description">
                  Ensure adherence to academic regulations and data privacy standards automatically.
                </p>
              </div>
              
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Seamless Communication</h3>
                <p className="admin-card-description">
                  Facilitate direct dialogue between students, employers, and supervisors effortlessly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="admin-section admin-cta-section">
          <div className="admin-container">
            <div className="admin-cta-content">
              <h2 className="admin-cta-title">Ready to optimize your internship management?</h2>
              <p className="admin-cta-description">
                Join hundreds of institutions and employers transforming their internship programs with Edulink.
              </p>
              <div className="admin-cta-actions">
                <a href="/docs" className="admin-btn-primary">View Documentation</a>
                <a href="mailto:support@edulink.jhubafrica.com" className="admin-btn-secondary" id="contact-support-btn">Contact Support</a>
              </div>
            </div>
          </div>
        </section>
        </main>
      
      <AdminFooter />
      
      <style>{`
         .admin-landing {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .admin-landing a {
          text-decoration: none;
        }
        
        /* Renamed from .admin-main to prevent conflict with global admin-dashboard.css styles which add a sidebar margin */
        .admin-landing-main {
          flex: 1;
          padding-top: 4rem;
          width: 100%;
        }
        
        /* Global Container - Matches Navigation/Footer */
        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          width: 100%;
        }
        
        /* Hero Section */
        .admin-hero {
          background-image: url('/images/admin_hero.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          padding: 4rem 0;
          position: relative;
        }
        
        .admin-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1;
        }
        
        .admin-hero-content {
          text-align: left;
          max-width: 800px;
          margin-left: 0;
        }
        
        .admin-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(5, 150, 105, 0.1);
          color: #059669;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }
        
        .admin-badge-icon {
          width: 1rem;
          height: 1rem;
        }
        
        .admin-hero-title {
          font-size: 3rem;
          font-weight: 800;
          color: white;
          line-height: 1.2;
          margin-bottom: 1.5rem;
          letter-spacing: -0.025em;
          position: relative;
          z-index: 2;
        }
        
        .admin-hero-highlight {
          color: #10b981;
        }
        
        .admin-hero-description {
          font-size: 1.25rem;
          color: white;
          line-height: 1.7;
          margin-bottom: 2.5rem;
          max-width: 700px;
          position: relative;
          z-index: 2;
        }
        
        .admin-hero-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          justify-content: flex-start;
          position: relative;
          z-index: 2;
        }
        
        .admin-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #059669;
          color: white;
          text-decoration: none;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border: 2px solid #059669;
        }
        
        .admin-btn-primary:hover {
          background: #047857;
          border-color: #047857;
        }
        
        .admin-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: transparent;
          color: white;
          text-decoration: none;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border: 2px solid white;
        }
        
        .admin-btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .admin-btn-icon {
          width: 1.25rem;
          height: 1.25rem;
        }
        
        /* Sections */
        .admin-section {
          padding: 5rem 0;
        }
        
        .admin-section.alt {
          background: #f9fafb;
        }
        
        .admin-section-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .admin-section-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1rem;
          letter-spacing: -0.025em;
        }
        
        .admin-section-description {
          font-size: 1.125rem;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.7;
        }
        
        /* Grid */
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        
        .admin-card {
          background: white;
          padding: 2rem;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
        }
        
        .admin-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-color: #059669;
        }
        
        .admin-card-icon {
          width: 3rem;
          height: 3rem;
          background: rgba(5, 150, 105, 0.1);
          color: #059669;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        
        .admin-card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .admin-card-description {
          color: #6b7280;
          line-height: 1.6;
        }
        
        /* CTA Section */
        .admin-cta-section {
          background: #f9fafb;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        .admin-cta-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .admin-cta-title {
          font-size: 2.25rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1.5rem;
          letter-spacing: -0.025em;
          position: relative;
          z-index: 2;
        }
        
        .admin-cta-description {
          font-size: 1.25rem;
          color: #6b7280;
          margin-bottom: 2.5rem;
          line-height: 1.6;
          position: relative;
          z-index: 2;
        }
        
        .admin-cta-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .admin-cta-actions a {
          text-decoration: none;
        }
        
        /* Remove underlines from all links in AdminLanding */
        .admin-landing-main a {
          text-decoration: none !important;
        }
        
        .admin-hero-actions a {
          text-decoration: none !important;
        }
        
        .admin-card a {
          text-decoration: none !important;
        }
        
        #contact-support-btn {
          color: #374151;
          border-color: #374151;
          background: white;
        }
        
        #contact-support-btn:hover {
          color: white;
          background: #374151;
          border-color: #374151;
        }

        /* Responsive Design */
        @media (min-width: 640px) {
          .admin-container {
            padding: 0 1.5rem;
          }
          
          .admin-hero-actions {
            flex-direction: row;
          }
          
          .admin-section {
            padding: 5rem 0;
          }
          
          .admin-section-title {
            font-size: 3rem;
          }
          
          .admin-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 768px) {
          .admin-hero {
            padding: 6rem 0;
          }
          
          .admin-hero-title {
            font-size: 3.5rem;
          }
          
          .admin-hero-description {
            font-size: 1.5rem;
          }
        }
        
        @media (min-width: 1024px) {
          .admin-container {
            padding: 0 2rem;
          }
          
          .admin-hero {
            padding: 8rem 0;
          }
          
          .admin-section {
            padding: 6rem 0;
          }
          
          .admin-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLanding;
