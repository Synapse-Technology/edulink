import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Headphones,
  Home,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { Layout } from '../components';
import '../styles/error-page.css';

const NotFound: React.FC = () => {
  const navigationOptions = [
    {
      icon: <Briefcase size={22} />,
      title: 'Browse Opportunities',
      description:
        'Explore verified internships, attachments, and early career opportunities.',
      link: '/opportunities',
      linkText: 'View opportunities',
    },
    {
      icon: <ShieldCheck size={22} />,
      title: 'For Admins',
      description:
        'Learn how institutions and employers manage placements, supervision, and reports.',
      link: '/admin',
      linkText: 'View admin workflows',
    },
    {
      icon: <Headphones size={22} />,
      title: 'Get Support',
      description:
        'Need help with your account, applications, tickets, or platform access?',
      link: '/support',
      linkText: 'Visit support',
    },
  ];

  return (
    <Layout>
      <main className="not-found-page">
        <section className="not-found-hero">
          <div className="not-found-container">
            <div className="not-found-badge">
              <Search size={15} />
              Page not found
            </div>

            <h1>404</h1>

            <h2>This page does not exist.</h2>

            <p>
              The link may be broken, moved, or no longer available. Use one of
              the options below to continue using EduLink KE.
            </p>

            <div className="not-found-actions">
              <Link to="/" className="not-found-primary">
                <Home size={16} />
                Go home
              </Link>

              <button
                type="button"
                className="not-found-secondary"
                onClick={() => window.history.back()}
              >
                <ArrowLeft size={16} />
                Go back
              </button>
            </div>
          </div>
        </section>

        <section className="not-found-options">
          <div className="not-found-container">
            <div className="not-found-section-head">
              <h3>Useful places to continue</h3>
              <p>
                These are the most relevant pages depending on what you were
                trying to access.
              </p>
            </div>

            <div className="not-found-grid">
              {navigationOptions.map((option) => (
                <Link to={option.link} className="not-found-card" key={option.title}>
                  <div className="not-found-card-icon">{option.icon}</div>

                  <div>
                    <h4>{option.title}</h4>
                    <p>{option.description}</p>
                    <span>{option.linkText}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .not-found-page {
          background: #f6faf9;
        }

        .not-found-container {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .not-found-hero {
          padding: 96px 0 56px;
          text-align: center;
          background:
            radial-gradient(circle at top, rgba(6,155,142,.12), transparent 34%),
            #ffffff;
        }

        .not-found-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(6,155,142,.08);
          color: #069b8e;
          font-size: .78rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: 18px;
        }

        .not-found-hero h1 {
          font-size: clamp(4.5rem, 12vw, 8rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.08em;
          color: #021f1c;
          margin: 0 0 10px;
        }

        .not-found-hero h2 {
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 850;
          letter-spacing: -.04em;
          color: #111827;
          margin-bottom: 12px;
        }

        .not-found-hero p {
          max-width: 560px;
          margin: 0 auto;
          color: #6b7280;
          line-height: 1.75;
          font-size: .96rem;
        }

        .not-found-actions {
          margin-top: 28px;
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .not-found-primary,
        .not-found-secondary {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          text-decoration: none;
          border: 0;
          cursor: pointer;
        }

        .not-found-primary {
          background: #069b8e;
          color: #ffffff;
        }

        .not-found-primary:hover {
          background: #057e73;
          color: #ffffff;
        }

        .not-found-secondary {
          background: #ffffff;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .not-found-secondary:hover {
          background: #f9fafb;
        }

        .not-found-options {
          padding: 56px 0 84px;
        }

        .not-found-section-head {
          text-align: center;
          margin-bottom: 30px;
        }

        .not-found-section-head h3 {
          color: #111827;
          font-size: 1.35rem;
          font-weight: 850;
          letter-spacing: -.03em;
          margin-bottom: 8px;
        }

        .not-found-section-head p {
          color: #6b7280;
          margin: 0;
        }

        .not-found-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .not-found-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 22px;
          display: flex;
          gap: 16px;
          text-decoration: none;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }

        .not-found-card:hover {
          transform: translateY(-3px);
          border-color: rgba(6,155,142,.28);
          box-shadow: 0 18px 44px rgba(17,24,39,.08);
        }

        .not-found-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(6,155,142,.08);
          color: #069b8e;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .not-found-card h4 {
          color: #111827;
          font-size: .98rem;
          font-weight: 850;
          margin: 0 0 6px;
        }

        .not-found-card p {
          color: #6b7280;
          line-height: 1.6;
          font-size: .86rem;
          margin: 0 0 12px;
        }

        .not-found-card span {
          color: #069b8e;
          font-size: .84rem;
          font-weight: 850;
        }

        @media (max-width: 860px) {
          .not-found-grid {
            grid-template-columns: 1fr;
          }

          .not-found-hero {
            padding: 72px 0 44px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default NotFound;