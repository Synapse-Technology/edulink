import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common';

const sections = [
  {
    title: 'Information we collect',
    body:
      'EduLink stores account details, student affiliation records, placement data, applications, logbook submissions, support requests, and verification records needed to operate the platform.',
  },
  {
    title: 'How we use information',
    body:
      'We use platform data to connect students with opportunities, support institution placement monitoring, allow employer supervision, issue verification artifacts, and maintain security and audit records.',
  },
  {
    title: 'Role-based access',
    body:
      'Access is separated by role. Employers manage their own applications and interns. Institutions monitor their affiliated students and placements. Students control their own profile and submissions.',
  },
  {
    title: 'Data retention',
    body:
      'Placement, certification, and audit records may be retained for institutional reporting, verification, compliance, and dispute resolution purposes.',
  },
  {
    title: 'Contact',
    body:
      'For privacy questions or correction requests, contact EduLink support through the support center.',
  },
];

const PrivacyPolicy: React.FC = () => (
  <>
    <SEO
      title="Privacy Policy - EduLink KE"
      description="EduLink KE privacy policy for students, institutions, employers, and supervisors."
      keywords="EduLink privacy policy, student data, internship platform privacy"
    />
    <main className="legal-page">
      <section className="legal-hero">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p>
            How EduLink handles student, institution, employer, placement, and
            verification data.
          </p>
        </div>
      </section>

      <section className="container legal-content">
        {sections.map(section => (
          <article className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
        <div className="legal-note">
          <p>
            This page is a product-facing policy summary for beta use. Formal
            legal review should be completed before broad public rollout.
          </p>
          <Link to="/support" className="btn btn-primary">
            Contact Support
          </Link>
        </div>
      </section>

      <style>{`
        .legal-page {
          background: #f8fafc;
        }

        .legal-hero {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 56px 0 36px;
        }

        .legal-hero h1 {
          color: #0f172a;
          font-size: 2.35rem;
          font-weight: 800;
          margin: 0 0 10px;
        }

        .legal-hero p {
          color: #64748b;
          line-height: 1.7;
          margin: 0;
          max-width: 720px;
        }

        .legal-content {
          padding: 36px 0 56px;
        }

        .legal-section,
        .legal-note {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 12px;
          padding: 22px;
        }

        .legal-section h2 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .legal-section p,
        .legal-note p {
          color: #475569;
          line-height: 1.7;
          margin: 0;
        }

        .legal-note p {
          margin-bottom: 16px;
        }

        @media (max-width: 575.98px) {
          .legal-hero {
            padding: 40px 0 28px;
          }

          .legal-hero h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </main>
  </>
);

export default PrivacyPolicy;
