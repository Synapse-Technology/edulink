import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, FileCheck2, GraduationCap, ShieldCheck } from 'lucide-react';
import { SEO } from '../components/common';

const TrustPolicy: React.FC = () => {
  const principles = [
    {
      icon: Building2,
      title: 'Institutions control academic truth',
      body: 'Departments, cohorts, student eligibility, and final certification are institution-owned records. Student claims are preserved as evidence, but they do not become official data until reviewed.',
    },
    {
      icon: ShieldCheck,
      title: 'Employers are verified before scale',
      body: 'Pilot employers go through onboarding and review before their opportunities are treated as trusted. Suspicious listings can be reported and removed from circulation.',
    },
    {
      icon: FileCheck2,
      title: 'Every placement needs evidence',
      body: 'Applications, supervisor assignments, logbooks, artifacts, feedback, incidents, and completion decisions create an auditable record for the pilot.',
    },
    {
      icon: GraduationCap,
      title: 'Students should not pay to apply',
      body: 'EduLink is designed around institution and employer trust. Any opportunity that asks students to pay application, placement, or interview fees should be escalated for review.',
    },
  ];

  return (
    <main className="trust-policy-page">
      <SEO
        title="Trust & Pilot Policy"
        description="EduLink KE trust policy for verified student attachments, employer onboarding, institutional control, and scam prevention."
        keywords="EduLink trust policy, verified attachments Kenya, internship scam prevention"
      />

      <section className="trust-policy-hero">
        <div className="container">
          <span className="trust-policy-eyebrow">Trust & pilot policy</span>
          <h1>How EduLink keeps attachment workflows credible</h1>
          <p>
            The beta pilot is built around verified identity, verified employers,
            institution-owned academic records, supervised evidence, and transparent
            completion outcomes.
          </p>
          <div className="d-flex flex-wrap gap-3">
            <Link to="/institutions/request" className="btn btn-primary">
              Request Institution Pilot
            </Link>
            <Link to="/support" className="btn btn-outline-dark">
              Report a Concern
            </Link>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row g-4">
            {principles.map(item => (
              <div className="col-md-6" key={item.title}>
                <article className="trust-policy-card h-100">
                  <div className="trust-policy-icon">
                    <item.icon size={24} />
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.body}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-policy-band">
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-lg-5">
              <div className="d-flex align-items-center gap-2 mb-3">
                <AlertTriangle size={22} className="text-warning" />
                <h2 className="h4 fw-bold mb-0">Pilot red flags</h2>
              </div>
              <p className="text-muted mb-0">
                These issues should pause an opportunity or placement until an
                institution admin, employer admin, or platform admin reviews it.
              </p>
            </div>
            <div className="col-lg-7">
              <ul className="trust-policy-list">
                <li>Any request for student payment to apply, interview, or secure placement.</li>
                <li>Unverified employer domains, mismatched contacts, or unofficial email-only recruitment.</li>
                <li>Placement claims that bypass institution verification for department, cohort, or eligibility.</li>
                <li>Active internships without assigned supervision or logbook/evidence review.</li>
                <li>Completion decisions without final feedback, reviewed evidence, and institution certification.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .trust-policy-page {
          background: #ffffff;
          color: #0f172a;
        }

        .trust-policy-hero {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 88px 0 64px;
        }

        .trust-policy-eyebrow {
          color: var(--accent-color);
          display: block;
          font-size: 0.78rem;
          font-weight: 800;
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .trust-policy-hero h1 {
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1.08;
          margin: 0 0 18px;
          max-width: 820px;
        }

        .trust-policy-hero p {
          color: #475569;
          font-size: 1.08rem;
          line-height: 1.8;
          margin-bottom: 28px;
          max-width: 780px;
        }

        .trust-policy-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
        }

        .trust-policy-icon {
          align-items: center;
          background: #e6f7f7;
          border-radius: 8px;
          color: var(--accent-color);
          display: inline-flex;
          height: 48px;
          justify-content: center;
          margin-bottom: 18px;
          width: 48px;
        }

        .trust-policy-card h2 {
          font-size: 1.15rem;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .trust-policy-card p,
        .trust-policy-list {
          color: #475569;
          line-height: 1.75;
        }

        .trust-policy-band {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 48px 0;
        }

        .trust-policy-list {
          margin: 0;
          padding-left: 1.2rem;
        }

        .trust-policy-list li + li {
          margin-top: 10px;
        }
      `}</style>
    </main>
  );
};

export default TrustPolicy;
