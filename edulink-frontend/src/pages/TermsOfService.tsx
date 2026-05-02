import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common';

const terms = [
  {
    title: 'Platform purpose',
    body:
      'EduLink helps students discover opportunities, submit applications, declare external placements, maintain logbooks, and receive verifiable internship or attachment records.',
  },
  {
    title: 'User responsibilities',
    body:
      'Users must provide accurate information, protect their account access, and only submit applications, placement declarations, evidence, and reviews they are authorized to submit.',
  },
  {
    title: 'Institution and employer access',
    body:
      'Institutions and employers are responsible for managing their staff, supervisors, assessors, opportunity data, placement actions, and review activity according to their assigned roles.',
  },
  {
    title: 'External opportunities',
    body:
      'Some opportunities may redirect students to third-party application portals. EduLink may list those opportunities for discovery, but the external application process remains controlled by the source portal.',
  },
  {
    title: 'Acceptable use',
    body:
      'Users may not misuse the platform, access records outside their role, submit false placement data, tamper with logbooks, or attempt to bypass authorization controls.',
  },
];

const TermsOfService: React.FC = () => (
  <>
    <SEO
      title="Terms of Service - EduLink KE"
      description="EduLink KE terms of service for students, institutions, employers, and supervisors."
      keywords="EduLink terms, internship platform terms, attachment platform rules"
    />
    <main className="terms-page">
      <section className="terms-hero">
        <div className="container">
          <h1>Terms of Service</h1>
          <p>
            The basic rules for using EduLink as a student, institution,
            employer, supervisor, or assessor.
          </p>
        </div>
      </section>

      <section className="container terms-content">
        {terms.map(section => (
          <article className="terms-section" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
        <div className="terms-note">
          <p>
            This page is a beta-ready product summary and should be reviewed by
            legal counsel before live public rollout.
          </p>
          <Link to="/privacy" className="btn btn-outline-primary">
            Read Privacy Policy
          </Link>
        </div>
      </section>

      <style>{`
        .terms-page {
          background: #f8fafc;
        }

        .terms-hero {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 56px 0 36px;
        }

        .terms-hero h1 {
          color: #0f172a;
          font-size: 2.35rem;
          font-weight: 800;
          margin: 0 0 10px;
        }

        .terms-hero p {
          color: #64748b;
          line-height: 1.7;
          margin: 0;
          max-width: 720px;
        }

        .terms-content {
          padding: 36px 0 56px;
        }

        .terms-section,
        .terms-note {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 12px;
          padding: 22px;
        }

        .terms-section h2 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .terms-section p,
        .terms-note p {
          color: #475569;
          line-height: 1.7;
          margin: 0;
        }

        .terms-note p {
          margin-bottom: 16px;
        }

        @media (max-width: 575.98px) {
          .terms-hero {
            padding: 40px 0 28px;
          }

          .terms-hero h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </main>
  </>
);

export default TermsOfService;
