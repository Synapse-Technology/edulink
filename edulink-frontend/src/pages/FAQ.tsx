import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common';

const faqs = [
  {
    question: 'How do students apply for opportunities?',
    answer:
      'Students can browse open opportunities, apply inside EduLink where supported, or follow the source portal for curated external listings.',
  },
  {
    question: 'What happens after a student secures an external placement?',
    answer:
      'The student declares the placement in EduLink. Their institution reviews it, and once approved the placement becomes active for logbook submission.',
  },
  {
    question: 'Can institutions see every application a student submits?',
    answer:
      'No. Institutions view placement, cohort, certification, and monitoring records for their students. Employer application workflows remain scoped to the relevant employer.',
  },
  {
    question: 'Who reviews logbooks?',
    answer:
      'Assigned institution assessors and employer supervisors review logbooks according to the placement setup and role permissions.',
  },
  {
    question: 'How do employers join EduLink?',
    answer:
      'Employers submit an onboarding request, then activate their account after approval.',
  },
];

const FAQ: React.FC = () => (
  <>
    <SEO
      title="FAQ - EduLink KE"
      description="Answers to common EduLink questions for students, institutions, and employers."
      keywords="EduLink FAQ, internship platform questions, attachment placement help"
    />
    <main className="simple-info-page">
      <section className="simple-info-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p>
            Practical answers about applications, placements, logbooks, and
            role access in EduLink.
          </p>
        </div>
      </section>

      <section className="container simple-info-content">
        <div className="faq-list">
          {faqs.map(item => (
            <article className="faq-item" key={item.question}>
              <h2>{item.question}</h2>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>

        <div className="simple-info-cta">
          <h2>Still need help?</h2>
          <p>Contact support or browse current opportunities.</p>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/support" className="btn btn-primary">
              Support Center
            </Link>
            <Link to="/opportunities" className="btn btn-outline-primary">
              Find Opportunities
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        .simple-info-page {
          background: #f8fafc;
        }

        .simple-info-hero {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 56px 0 36px;
        }

        .simple-info-hero h1 {
          color: #0f172a;
          font-size: 2.35rem;
          font-weight: 800;
          margin: 0 0 10px;
        }

        .simple-info-hero p {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.7;
          margin: 0;
          max-width: 720px;
        }

        .simple-info-content {
          padding: 36px 0 56px;
        }

        .faq-list {
          display: grid;
          gap: 12px;
        }

        .faq-item,
        .simple-info-cta {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 22px;
        }

        .faq-item h2,
        .simple-info-cta h2 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .faq-item p,
        .simple-info-cta p {
          color: #475569;
          line-height: 1.7;
          margin: 0;
        }

        .simple-info-cta {
          margin-top: 18px;
        }

        .simple-info-cta p {
          margin-bottom: 16px;
        }

        @media (max-width: 575.98px) {
          .simple-info-hero {
            padding: 40px 0 28px;
          }

          .simple-info-hero h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </main>
  </>
);

export default FAQ;
