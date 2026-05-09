import React from 'react';
import { Link } from 'react-router-dom';
import AdminNavigation from '../../components/admin/AdminNavigation';
import AdminFooter from '../../components/admin/AdminFooter';

const AdminLanding: React.FC = () => {
  return (
    <div className="admin-landing">
      <AdminNavigation />

      <main className="admin-landing-main">
        <section className="admin-hero">
          <div className="admin-container">
            <div className="admin-hero-content">
              <h1 className="admin-hero-title">
                Admin Workflows for
                <span className="admin-hero-highlight"> Institutions & Employers</span>
              </h1>

              <p className="admin-hero-description">
                EduLink KE gives institution and employer admins the tools to
                manage verified students, placements, applications, supervisors,
                logbooks, reports, and completion evidence from one structured
                workflow.
              </p>

              <div className="admin-hero-actions">
                <Link to="/institutions/request" className="admin-btn-primary">
                  <svg className="admin-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Request Institution Access
                </Link>

                <Link to="/employer/onboarding" className="admin-btn-secondary">
                  <svg className="admin-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Employer Onboarding
                </Link>
              </div>

              <div className="admin-system-link-wrap">
                <Link to="/admin/login" className="admin-system-link">
                  System admin access
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="institutions" className="admin-section">
          <div className="admin-container">
            <div className="admin-section-header">
              <span className="admin-section-kicker">Institution administration</span>
              <h2 className="admin-section-title">Run attachment oversight with clarity.</h2>
              <p className="admin-section-description">
                Give departments and faculty teams visibility into students,
                placements, assessors, logbooks, incidents, reports, and
                completion certification.
              </p>
            </div>

            <div className="admin-grid">
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0118 14.5C18 17.538 15.314 20 12 20s-6-2.462-6-5.5c0-1.375.31-2.675.86-3.922L12 14z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Cohort Verification</h3>
                <p className="admin-card-description">
                  Verify students by institution, department, course, and cohort
                  before they access placement workflows.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Assessor Management</h3>
                <p className="admin-card-description">
                  Assign supervisors and assessors, track review workload, and
                  reduce manual follow-up across active placements.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Logbook Review</h3>
                <p className="admin-card-description">
                  Review weekly evidence, employer feedback, incidents, and
                  student progress without relying on paper logbooks.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0016.586 3H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Outcome Reports</h3>
                <p className="admin-card-description">
                  Generate placement, completion, department, employer, and
                  cohort-level reports for academic oversight.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="employers" className="admin-section alt">
          <div className="admin-container">
            <div className="admin-section-header">
              <span className="admin-section-kicker">Employer administration</span>
              <h2 className="admin-section-title">Manage internship programs from application to completion.</h2>
              <p className="admin-section-description">
                Employer admins can publish opportunities, review candidates,
                assign supervisors, validate tasks, and build a verified junior
                talent pipeline.
              </p>
            </div>

            <div className="admin-grid">
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Opportunity Posting</h3>
                <p className="admin-card-description">
                  Publish structured internships and attachments with role,
                  duration, skills, location, and eligibility requirements.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Candidate Review</h3>
                <p className="admin-card-description">
                  Review applicants, shortlist candidates, manage decisions, and
                  identify students with verified profiles.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Supervisor Validation</h3>
                <p className="admin-card-description">
                  Assign workplace supervisors, review submitted work evidence,
                  approve tasks, and provide structured feedback.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M4 20h16M4 4h16v12H4V4z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Program Visibility</h3>
                <p className="admin-card-description">
                  Monitor active interns, pending reviews, completed placements,
                  and the quality of your internship pipeline.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="admin-section">
          <div className="admin-container">
            <div className="admin-section-header">
              <span className="admin-section-kicker">Shared admin value</span>
              <h2 className="admin-section-title">One workflow across students, schools, and employers.</h2>
              <p className="admin-section-description">
                EduLink KE gives partner admins the structure needed to reduce
                fraud, improve oversight, and make attachment records easier to
                trust.
              </p>
            </div>

            <div className="admin-grid">
              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Centralized Workflow</h3>
                <p className="admin-card-description">
                  Bring applications, placements, supervision, evidence, and
                  reporting into one operational environment.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6h6zm6 0V5a2 2 0 012-2h2a2 2 0 012 2v14h-6zm-6 0V9a2 2 0 012-2h2a2 2 0 012 2v10H9z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Placement Insights</h3>
                <p className="admin-card-description">
                  Understand placement volume, completion trends, pending tasks,
                  supervisor workload, and employer participation.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Trust & Verification</h3>
                <p className="admin-card-description">
                  Support student affiliation checks, employer credibility, audit
                  trails, and evidence-backed completion records.
                </p>
              </div>

              <div className="admin-card">
                <div className="admin-card-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1M7 8H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l4-4h3" />
                  </svg>
                </div>
                <h3 className="admin-card-title">Issue Escalation</h3>
                <p className="admin-card-description">
                  Track incidents, support requests, placement issues, and
                  supervisor feedback with better visibility.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section admin-cta-section">
          <div className="admin-container">
            <div className="admin-cta-content">
              <h2 className="admin-cta-title">Ready to manage attachments with better structure?</h2>
              <p className="admin-cta-description">
                Start with an institution pilot or employer onboarding and help
                shape verified placement workflows for Kenyan students.
              </p>

              <div className="admin-cta-actions">
                <Link to="/institutions/request" className="admin-btn-primary">
                  Request Institution Pilot
                </Link>
                <Link to="/employer/onboarding" className="admin-btn-dark">
                  Employer Onboarding
                </Link>
                <Link to="/support" className="admin-btn-light">
                  Contact Support
                </Link>
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

        .admin-landing-main {
          flex: 1;
          padding-top: 4rem;
          width: 100%;
        }

        .admin-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          width: 100%;
        }

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
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(7, 26, 24, 0.82),
            rgba(7, 26, 24, 0.58)
          );
          z-index: 1;
        }

        .admin-hero-content {
          text-align: left;
          max-width: 850px;
          margin-left: 0;
          position: relative;
          z-index: 2;
        }

        .admin-hero-title {
          font-size: 3rem;
          font-weight: 800;
          color: white;
          line-height: 1.12;
          margin-bottom: 1.5rem;
          letter-spacing: -0.045em;
        }

        .admin-hero-highlight {
          color: #10b981;
        }

        .admin-hero-description {
          font-size: 1.2rem;
          color: rgba(255,255,255,.88);
          line-height: 1.7;
          margin-bottom: 2.2rem;
          max-width: 760px;
        }

        .admin-hero-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          justify-content: flex-start;
        }

        .admin-system-link-wrap {
          margin-top: 1.15rem;
        }

        .admin-system-link {
          color: rgba(255,255,255,.66);
          font-size: .82rem;
          font-weight: 700;
          text-decoration: underline !important;
          text-underline-offset: 4px;
        }

        .admin-system-link:hover {
          color: #ffffff;
        }

        .admin-btn-primary,
        .admin-btn-secondary,
        .admin-btn-dark,
        .admin-btn-light {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.78rem 1.5rem;
          border-radius: 0.65rem;
          font-weight: 700;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .admin-btn-primary {
          background: #059669;
          color: white;
          border-color: #059669;
        }

        .admin-btn-primary:hover {
          background: #047857;
          border-color: #047857;
          color: #ffffff;
        }

        .admin-btn-secondary {
          background: rgba(255,255,255,.08);
          color: white;
          border-color: rgba(255,255,255,.78);
        }

        .admin-btn-secondary:hover {
          background: white;
          border-color: white;
          color: #071a18;
        }

        .admin-btn-dark {
          background: #071a18;
          color: white;
          border-color: #071a18;
        }

        .admin-btn-dark:hover {
          background: #102c28;
          color: white;
        }

        .admin-btn-light {
          background: white;
          color: #374151;
          border-color: #d1d5db;
        }

        .admin-btn-light:hover {
          border-color: #059669;
          color: #059669;
        }

        .admin-btn-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .admin-section {
          padding: 5rem 0;
        }

        .admin-section.alt {
          background: #f6faf9;
        }

        .admin-section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .admin-section-kicker {
          display: inline-block;
          color: #059669;
          font-size: .76rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-bottom: .75rem;
        }

        .admin-section-title {
          font-size: 2.45rem;
          font-weight: 850;
          color: #111827;
          margin-bottom: 1rem;
          letter-spacing: -0.045em;
          line-height: 1.08;
        }

        .admin-section-description {
          font-size: 1.05rem;
          color: #6b7280;
          max-width: 680px;
          margin: 0 auto;
          line-height: 1.7;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.4rem;
        }

        .admin-card {
          background: white;
          padding: 1.75rem;
          border-radius: 1rem;
          box-shadow: 0 12px 32px rgba(17, 24, 39, 0.055);
          transition: all 0.24s ease;
          border: 1px solid #e5e7eb;
        }

        .admin-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 44px rgba(17, 24, 39, 0.08);
          border-color: rgba(5,150,105,.35);
        }

        .admin-card-icon {
          width: 3rem;
          height: 3rem;
          background: rgba(5, 150, 105, 0.1);
          color: #059669;
          border-radius: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.35rem;
        }

        .admin-card-icon svg {
          width: 1.65rem;
          height: 1.65rem;
        }

        .admin-card-title {
          font-size: 1.08rem;
          font-weight: 800;
          color: #111827;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #eef2f7;
        }

        .admin-card-description {
          color: #6b7280;
          line-height: 1.65;
          margin: 0;
          font-size: .92rem;
        }

        .admin-cta-section {
          background: #071a18;
          text-align: center;
        }

        .admin-cta-content {
          max-width: 820px;
          margin: 0 auto;
        }

        .admin-cta-title {
          font-size: 2.25rem;
          font-weight: 850;
          color: #ffffff;
          margin-bottom: 1rem;
          letter-spacing: -0.045em;
          line-height: 1.12;
        }

        .admin-cta-description {
          font-size: 1.1rem;
          color: rgba(255,255,255,.58);
          margin-bottom: 2rem;
          line-height: 1.7;
        }

        .admin-cta-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .admin-landing-main a {
          text-decoration: none !important;
        }

        .admin-system-link {
          text-decoration: underline !important;
        }

        @media (min-width: 640px) {
          .admin-container {
            padding: 0 1.5rem;
          }

          .admin-hero-actions {
            flex-direction: row;
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
            font-size: 1.35rem;
          }
        }

        @media (min-width: 1024px) {
          .admin-container {
            padding: 0 2rem;
          }

          .admin-hero {
            padding: 7.5rem 0;
          }

          .admin-section {
            padding: 6rem 0;
          }

          .admin-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 560px) {
          .admin-landing-main {
            padding-top: 3.5rem;
          }

          .admin-hero-title {
            font-size: 2.25rem;
          }

          .admin-hero-description {
            font-size: 1rem;
          }

          .admin-section-title,
          .admin-cta-title {
            font-size: 1.85rem;
          }

          .admin-cta-actions,
          .admin-hero-actions {
            width: 100%;
          }

          .admin-btn-primary,
          .admin-btn-secondary,
          .admin-btn-dark,
          .admin-btn-light {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLanding;