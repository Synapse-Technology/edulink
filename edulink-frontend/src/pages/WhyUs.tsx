import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common';

const roleBenefits = [
  {
    title: 'Students',
    eyebrow: 'Career transition',
    icon: 'bi-mortarboard',
    body:
      'Move from campus to work with verified opportunities, placement declarations, logbooks, and shareable proof of experience.',
    points: [
      'Discover internal and external internship opportunities',
      'Declare externally secured placements for institution approval',
      'Build a record of verified workplace activity',
      'Use certificates and artifacts as career proof',
    ],
  },
  {
    title: 'Institutions',
    eyebrow: 'Placement governance',
    icon: 'bi-bank',
    body:
      'Coordinate attachments and internships without leaking employer application workflows into institution monitoring.',
    points: [
      'Verify student affiliations and placement declarations',
      'Monitor cohorts, current placements, and placement history',
      'Assign institution assessors to review student progress',
      'Certify completion from verified placement records',
    ],
  },
  {
    title: 'Employers',
    eyebrow: 'Talent pipeline',
    icon: 'bi-briefcase',
    body:
      'Post opportunities, manage applications, supervise interns, and identify students with verifiable work experience.',
    points: [
      'Publish EduLink-hosted opportunities',
      'Manage employer-specific applications and interns',
      'Assign employer supervisors for workplace review',
      'Access stronger signals than CV claims alone',
    ],
  },
];

const workflow = [
  {
    title: 'Opportunity discovery',
    text: 'Students find EduLink-hosted listings and curated external opportunities in one place.',
  },
  {
    title: 'Application or external apply',
    text: 'Internal applications stay in EduLink. External listings redirect to the source portal.',
  },
  {
    title: 'Placement verification',
    text: 'Institutions approve student-declared external placements before logbooks unlock.',
  },
  {
    title: 'Evidence and supervision',
    text: 'Students submit logbooks while institution assessors and employer supervisors review within their own scope.',
  },
  {
    title: 'Talent proof',
    text: 'Completed placements become trusted career evidence for students and future employer matching.',
  },
];

const trustItems = [
  'Role-separated access for students, institutions, employers, assessors, and supervisors',
  'Application privacy between employer workflows and institution placement monitoring',
  'Verifiable logbooks, placement history, and completion records',
  'A growing talent pool of students with real workplace evidence',
];

const WhyUs: React.FC = () => (
  <div className="why-us-page">
    <SEO
      title="Why EduLink KE"
      description="EduLink KE helps students transition from education to employment through verified opportunities, placements, logbooks, certifications, and talent proof."
      keywords="career transition platform Kenya, verified internships, student talent pool, attachment placement tracking"
    />

    <main>
      <section className="why-hero">
        <div className="container">
          <div className="why-hero-grid">
            <div>
              <span className="why-eyebrow">Career transition infrastructure</span>
              <h1>EduLink turns student work experience into trusted career proof.</h1>
              <p>
                Students need more than a list of vacancies. Institutions need
                visibility into placements. Employers need better signals than
                CV claims. EduLink connects the three with verified workflows.
              </p>
              <div className="why-hero-actions">
                <Link to="/opportunities" className="btn btn-primary">
                  Find Opportunities
                </Link>
                <Link to="/success-stories" className="btn btn-outline-primary">
                  View Student Outcomes
                </Link>
              </div>
            </div>

            <div className="why-proof-panel" aria-label="EduLink platform proof points">
              <div className="proof-row">
                <span>01</span>
                <strong>Verified placements</strong>
              </div>
              <div className="proof-row">
                <span>02</span>
                <strong>Structured logbooks</strong>
              </div>
              <div className="proof-row">
                <span>03</span>
                <strong>Scoped supervision</strong>
              </div>
              <div className="proof-row">
                <span>04</span>
                <strong>Talent pool readiness</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="role-section">
        <div className="container">
          <div className="section-heading">
            <span className="why-eyebrow">Who benefits</span>
            <h2>Built for the full internship and attachment ecosystem</h2>
            <p>
              Each role gets the workflow it needs without leaking access into
              another role’s responsibilities.
            </p>
          </div>

          <div className="role-grid">
            {roleBenefits.map(role => (
              <article className="role-card" key={role.title}>
                <div className="role-card-icon">
                  <i className={`bi ${role.icon}`}></i>
                </div>
                <span>{role.eyebrow}</span>
                <h3>{role.title}</h3>
                <p>{role.body}</p>
                <ul>
                  {role.points.map(point => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="workflow-section">
        <div className="container">
          <div className="section-heading compact">
            <span className="why-eyebrow">How it works</span>
            <h2>From opportunity discovery to a verified talent pool</h2>
          </div>

          <div className="workflow-list">
            {workflow.map((item, index) => (
              <article className="workflow-item" key={item.title}>
                <div className="workflow-index">{index + 1}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="container">
          <div className="trust-panel">
            <div>
              <span className="why-eyebrow">Why it matters</span>
              <h2>A better signal between campus and employment</h2>
              <p>
                EduLink is not just an internship board. It creates the
                verified evidence layer that helps students prove experience,
                institutions govern placements, and employers identify stronger
                early-career talent.
              </p>
            </div>
            <ul>
              {trustItems.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="why-cta">
        <div className="container">
          <div className="why-cta-panel">
            <div>
              <h2>Start with the workflow that fits your role.</h2>
              <p>
                Students can browse opportunities now. Institutions and
                employers can request onboarding to manage verified placements.
              </p>
            </div>
            <div className="why-cta-actions">
              <Link to="/opportunities" className="btn btn-light">
                Browse Opportunities
              </Link>
              <Link to="/institutions/request" className="btn btn-outline-light">
                Institution Onboarding
              </Link>
              <Link to="/employer/onboarding" className="btn btn-outline-light">
                Employer Onboarding
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>

    <style>{`
      .why-us-page {
        background: #f8fafc;
      }

      .why-hero {
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        padding: 64px 0;
      }

      .why-hero-grid {
        align-items: center;
        display: grid;
        gap: 36px;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
      }

      .why-eyebrow {
        color: var(--accent-color);
        display: inline-block;
        font-size: 0.78rem;
        font-weight: 800;
        margin-bottom: 10px;
        text-transform: uppercase;
      }

      .why-hero h1 {
        color: #0f172a;
        font-size: 2.65rem;
        font-weight: 850;
        line-height: 1.08;
        margin: 0 0 16px;
        max-width: 820px;
      }

      .why-hero p,
      .section-heading p,
      .trust-panel p,
      .why-cta-panel p {
        color: #64748b;
        line-height: 1.7;
      }

      .why-hero p {
        font-size: 1.02rem;
        margin: 0;
        max-width: 720px;
      }

      .why-hero-actions,
      .why-cta-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 24px;
      }

      .why-hero-actions .btn,
      .why-cta-actions .btn {
        border-radius: 7px;
        font-weight: 800;
      }

      .why-proof-panel {
        background: #0f172a;
        border-radius: 8px;
        color: #ffffff;
        padding: 18px;
      }

      .proof-row {
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.12);
        display: flex;
        gap: 14px;
        padding: 16px 4px;
      }

      .proof-row:last-child {
        border-bottom: 0;
      }

      .proof-row span {
        color: #67e8f9;
        font-weight: 850;
      }

      .proof-row strong {
        font-size: 1rem;
      }

      .role-section,
      .workflow-section,
      .trust-section {
        padding: 56px 0;
      }

      .section-heading {
        margin-bottom: 24px;
        max-width: 780px;
      }

      .section-heading.compact {
        max-width: 680px;
      }

      .section-heading h2,
      .trust-panel h2,
      .why-cta-panel h2 {
        color: #0f172a;
        font-size: 2rem;
        font-weight: 850;
        line-height: 1.16;
        margin: 0 0 10px;
      }

      .section-heading p,
      .trust-panel p,
      .why-cta-panel p {
        margin: 0;
      }

      .role-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .role-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 22px;
      }

      .role-card-icon {
        align-items: center;
        background: #e6f7f7;
        border: 1px solid rgba(0,153,153,0.18);
        border-radius: 8px;
        color: var(--accent-color);
        display: flex;
        font-size: 1.45rem;
        height: 46px;
        justify-content: center;
        margin-bottom: 16px;
        width: 46px;
      }

      .role-card span {
        color: var(--accent-color);
        display: block;
        font-size: 0.75rem;
        font-weight: 800;
        margin-bottom: 6px;
        text-transform: uppercase;
      }

      .role-card h3 {
        color: #0f172a;
        font-size: 1.15rem;
        font-weight: 850;
        margin: 0 0 8px;
      }

      .role-card p {
        color: #475569;
        line-height: 1.68;
        margin: 0 0 14px;
      }

      .role-card ul,
      .trust-panel ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .role-card li,
      .trust-panel li {
        color: #475569;
        line-height: 1.55;
        margin-bottom: 10px;
        padding-left: 24px;
        position: relative;
      }

      .role-card li:before,
      .trust-panel li:before {
        color: var(--accent-color);
        content: "✓";
        font-weight: 900;
        left: 0;
        position: absolute;
        top: 0;
      }

      .workflow-section {
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
      }

      .workflow-list {
        display: grid;
        gap: 10px;
      }

      .workflow-item {
        align-items: flex-start;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: grid;
        gap: 16px;
        grid-template-columns: 42px minmax(0, 1fr);
        padding: 18px;
      }

      .workflow-index {
        align-items: center;
        background: #0f766e;
        border-radius: 50%;
        color: #ffffff;
        display: flex;
        font-weight: 850;
        height: 36px;
        justify-content: center;
        width: 36px;
      }

      .workflow-item h3 {
        color: #0f172a;
        font-size: 1.02rem;
        font-weight: 850;
        margin: 0 0 4px;
      }

      .workflow-item p {
        color: #64748b;
        line-height: 1.65;
        margin: 0;
      }

      .trust-panel {
        align-items: start;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: grid;
        gap: 30px;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
        padding: 28px;
      }

      .why-cta {
        background: #0f766e;
        color: #ffffff;
        padding: 52px 0;
      }

      .why-cta-panel {
        align-items: center;
        display: flex;
        gap: 28px;
        justify-content: space-between;
      }

      .why-cta-panel h2 {
        color: #ffffff;
      }

      .why-cta-panel p {
        color: rgba(255,255,255,0.78);
        max-width: 720px;
      }

      .why-cta-actions {
        flex: 0 0 auto;
        justify-content: flex-end;
        margin-top: 0;
      }

      @media (max-width: 991.98px) {
        .why-hero-grid,
        .role-grid,
        .trust-panel {
          grid-template-columns: 1fr;
        }

        .why-cta-panel {
          align-items: flex-start;
          flex-direction: column;
        }

        .why-cta-actions {
          justify-content: flex-start;
        }
      }

      @media (max-width: 575.98px) {
        .why-hero,
        .role-section,
        .workflow-section,
        .trust-section,
        .why-cta {
          padding: 40px 0;
        }

        .why-hero h1 {
          font-size: 2rem;
        }

        .section-heading h2,
        .trust-panel h2,
        .why-cta-panel h2 {
          font-size: 1.55rem;
        }

        .why-hero-actions .btn,
        .why-cta-actions,
        .why-cta-actions .btn {
          width: 100%;
        }

        .workflow-item {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  </div>
);

export default WhyUs;
