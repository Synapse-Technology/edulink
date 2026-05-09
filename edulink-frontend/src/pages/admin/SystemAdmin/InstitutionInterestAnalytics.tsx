import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Mail,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  adminAuthService,
  type InstitutionInterestStats,
} from '../../../services/auth/adminAuthService';

const InstitutionInterestAnalytics: React.FC = () => {
  const [stats, setStats] = useState<InstitutionInterestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingOutreach, setSendingOutreach] = useState<Record<string, boolean>>({});
  const [outreachStatus, setOutreachStatus] = useState<
    Record<string, 'success' | 'error' | null>
  >({});

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const data = await adminAuthService.getInstitutionInterestStats();

      setStats(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load institution demand analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOutreach = async (interestId: string) => {
    if (sendingOutreach[interestId]) return;

    try {
      setSendingOutreach((prev) => ({
        ...prev,
        [interestId]: true,
      }));

      setOutreachStatus((prev) => ({
        ...prev,
        [interestId]: null,
      }));

      await adminAuthService.sendInstitutionInterestOutreach(interestId);

      setOutreachStatus((prev) => ({
        ...prev,
        [interestId]: 'success',
      }));

      setTimeout(() => {
        setOutreachStatus((prev) => ({
          ...prev,
          [interestId]: null,
        }));
      }, 3000);
    } catch (err) {
      console.error(err);

      setOutreachStatus((prev) => ({
        ...prev,
        [interestId]: 'error',
      }));

      setTimeout(() => {
        setOutreachStatus((prev) => ({
          ...prev,
          [interestId]: null,
        }));
      }, 3000);
    } finally {
      setSendingOutreach((prev) => ({
        ...prev,
        [interestId]: false,
      }));
    }
  };

  const strongestInstitution = useMemo(() => {
    if (!stats?.top_requested?.length) return null;
    return stats.top_requested[0];
  }, [stats]);

  const avgGrowth = useMemo(() => {
    if (!stats?.requests_over_time?.length) return 0;

    return (
      stats.total_requests / stats.requests_over_time.length
    ).toFixed(1);
  }, [stats]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="interest-loading">
          <Building2 size={26} />
          <span>Loading institutional demand intelligence...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="interest-page">
        <div className="interest-breadcrumb">
          <Link to="/dashboard/admin">
            <ArrowLeft size={15} />
            Admin overview
          </Link>

          <span>/</span>

          <strong>Institution demand</strong>
        </div>

        <header className="interest-header">
          <div>
            <span className="interest-kicker">
              <Sparkles size={14} />
              Expansion intelligence
            </span>

            <h1>Institution Demand Analytics</h1>

            <p>
              Analyze unmet institutional demand signals from students,
              identify high-potential acquisition targets, and coordinate
              outreach expansion strategy across the EduLink ecosystem.
            </p>
          </div>

          <div className="interest-header-actions">
            <button
              type="button"
              className="interest-btn secondary"
              onClick={fetchStats}
            >
              <Clock3 size={16} />
              Refresh analytics
            </button>
          </div>
        </header>

        {error && (
          <div className="interest-error">
            <XCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <section className="interest-hero">
          <div className="hero-main-card">
            <div className="hero-main-top">
              <div className="hero-icon">
                <Target size={24} />
              </div>

              <span className="signal-live">
                <TrendingUp size={13} />
                Student-driven growth signal
              </span>
            </div>

            <h2>
              {strongestInstitution?.name || 'No dominant institution yet'}
            </h2>

            <p>
              Highest concentration of institution demand requests currently
              observed across student onboarding attempts.
            </p>

            <div className="hero-stats">
              <div>
                <span>Requests</span>
                <strong>
                  {strongestInstitution?.request_count || 0}
                </strong>
              </div>

              <div>
                <span>Total market signals</span>
                <strong>{stats?.total_requests || 0}</strong>
              </div>

              <div>
                <span>Avg. monthly growth</span>
                <strong>{avgGrowth}</strong>
              </div>
            </div>
          </div>

          <div className="hero-side-card">
            <div className="hero-side-top">
              <Globe2 size={18} />
              <span>Expansion readiness</span>
            </div>

            <strong>
              {stats?.top_requested?.length || 0} institutions
            </strong>

            <p>
              Institutions have already shown organic onboarding demand
              through student request submissions.
            </p>

            <div className="expansion-meter">
              <span
                style={{
                  width: `${Math.min(
                    ((stats?.total_requests || 0) / 100) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>

            <small>
              Demand confidence grows as repeated requests accumulate.
            </small>
          </div>
        </section>

        <section className="interest-signal-grid">
          <article>
            <div className="signal-icon blue">
              <BarChart3 size={20} />
            </div>

            <strong>{stats?.total_requests || 0}</strong>

            <span>Total requests</span>

            <small>All institution interest submissions</small>
          </article>

          <article>
            <div className="signal-icon green">
              <Building2 size={20} />
            </div>

            <strong>{stats?.top_requested?.length || 0}</strong>

            <span>Unique institutions</span>

            <small>Distinct institution names identified</small>
          </article>

          <article>
            <div className="signal-icon amber">
              <TrendingUp size={20} />
            </div>

            <strong>{avgGrowth}</strong>

            <span>Monthly demand avg.</span>

            <small>Average monthly request volume</small>
          </article>

          <article>
            <div className="signal-icon indigo">
              <Users size={20} />
            </div>

            <strong>
              {stats?.recent_requests?.length || 0}
            </strong>

            <span>Recent submissions</span>

            <small>Most recent onboarding signals</small>
          </article>
        </section>

        <div className="interest-layout">
          <main className="interest-main">
            <section className="interest-panel">
              <div className="panel-header">
                <div>
                  <span>Acquisition priority</span>
                  <h2>Most requested institutions</h2>
                </div>

                <div className="panel-pill">
                  Ranked by demand
                </div>
              </div>

              <div className="institution-list">
                {stats?.top_requested?.length ? (
                  stats.top_requested.map((item, index) => {
                    const percentage =
                      (item.request_count / stats.total_requests) * 100;

                    return (
                      <article className="institution-row" key={index}>
                        <div className="institution-rank">
                          #{index + 1}
                        </div>

                        <div className="institution-main">
                          <div className="institution-top">
                            <strong>{item.name}</strong>

                            <span>
                              {item.request_count} requests
                            </span>
                          </div>

                          <div className="institution-bar">
                            <span
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>

                          <small>
                            Represents {percentage.toFixed(1)}% of
                            captured institutional demand.
                          </small>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="interest-empty">
                    <Building2 size={42} />
                    <h3>No institution requests yet</h3>
                    <p>
                      Institution demand signals will appear here once students
                      begin requesting unavailable institutions.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="interest-panel">
              <div className="panel-header">
                <div>
                  <span>Market timeline</span>
                  <h2>Demand growth trend</h2>
                </div>

                <div className="panel-pill">
                  Historical interest
                </div>
              </div>

              <div className="timeline-list">
                {stats?.requests_over_time?.length ? (
                  stats.requests_over_time.map((item, index) => (
                    <article className="timeline-row" key={index}>
                      <div className="timeline-icon">
                        <Calendar size={16} />
                      </div>

                      <div className="timeline-main">
                        <strong>
                          {new Date(item.month).toLocaleDateString(
                            undefined,
                            {
                              month: 'long',
                              year: 'numeric',
                            },
                          )}
                        </strong>

                        <span>
                          Student demand submissions recorded
                        </span>
                      </div>

                      <div className="timeline-value">
                        {item.count}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="interest-empty">
                    <Calendar size={42} />
                    <h3>No timeline data available</h3>
                    <p>
                      Growth intelligence becomes available after repeated
                      monthly submissions.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="interest-sidebar">
            <section className="side-card emphasis">
              <div className="side-card-header">
                <Target size={16} />
                <h3>Strategic insight</h3>
              </div>

              <p>
                Student onboarding friction is indirectly revealing which
                institutions should be prioritized for EduLink expansion and
                partnership outreach.
              </p>
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <TrendingUp size={16} />
                <h3>Expansion interpretation</h3>
              </div>

              <ul className="insight-list">
                <li>Repeated institution requests indicate unmet demand.</li>
                <li>Institution clusters may signal regional traction.</li>
                <li>Email domains help validate legitimacy and affiliation.</li>
                <li>High-frequency institutions should enter partnership pipeline.</li>
              </ul>
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <Mail size={16} />
                <h3>Outreach readiness</h3>
              </div>

              <p>
                Students who provide institutional email indicators can be used
                to validate expansion opportunities and pilot conversations.
              </p>
            </section>
          </aside>
        </div>

        <section className="interest-panel outreach-panel">
          <div className="panel-header">
            <div>
              <span>Lead generation</span>
              <h2>Recent institutional requests</h2>
            </div>

            <div className="panel-pill">
              Outreach opportunities
            </div>
          </div>

          <div className="outreach-grid">
            {stats?.recent_requests?.length ? (
              stats.recent_requests.map((req) => (
                <article className="outreach-card" key={req.id}>
                  <div className="outreach-top">
                    <div className="outreach-icon">
                      <Building2 size={18} />
                    </div>

                    <span className="request-date">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3>{req.name}</h3>

                  <div className="domain-pill">
                    @{req.email_domain}
                  </div>

                  <div className="outreach-meta">
                    <span>
                      <Users size={13} />
                      Student-originated request
                    </span>

                    <span>
                      <Mail size={13} />
                      {req.user_email ? 'Contact available' : 'No email'}
                    </span>
                  </div>

                  {req.user_email ? (
                    <button
                      type="button"
                      disabled={sendingOutreach[req.id]}
                      onClick={() => handleSendOutreach(req.id)}
                      className={`outreach-btn ${
                        outreachStatus[req.id] === 'success'
                          ? 'success'
                          : outreachStatus[req.id] === 'error'
                            ? 'error'
                            : ''
                      }`}
                    >
                      {sendingOutreach[req.id] ? (
                        <>
                          <Clock3 size={14} />
                          Sending...
                        </>
                      ) : outreachStatus[req.id] === 'success' ? (
                        <>
                          <CheckCircle2 size={14} />
                          Outreach sent
                        </>
                      ) : outreachStatus[req.id] === 'error' ? (
                        <>
                          <XCircle size={14} />
                          Send failed
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Start outreach
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="outreach-btn disabled"
                    >
                      <ExternalLink size={14} />
                      No contact available
                    </button>
                  )}
                </article>
              ))
            ) : (
              <div className="interest-empty large">
                <Search size={48} />
                <h3>No recent submissions</h3>
                <p>
                  Recent onboarding requests will appear here once students
                  begin submitting unavailable institutions.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .interest-page {
          color: #111827;
        }

        .interest-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          color: #64748b;
          font-size: .84rem;
          font-weight: 750;
        }

        .interest-breadcrumb a {
          color: #334155;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .interest-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 20px;
        }

        .interest-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .interest-kicker svg {
          color: #047857;
        }

        .interest-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.9rem, 3vw, 2.7rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .interest-header p {
          max-width: 780px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .interest-btn {
          min-height: 44px;
          border-radius: 12px;
          padding: 0 14px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          cursor: pointer;
        }

        .interest-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .interest-error {
          margin-bottom: 18px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .interest-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 16px;
          margin-bottom: 18px;
        }

        .hero-main-card,
        .hero-side-card,
        .interest-panel,
        .side-card,
        .interest-signal-grid article {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .hero-main-card,
        .hero-side-card {
          border-radius: 22px;
          padding: 20px;
        }

        .hero-main-top,
        .hero-side-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .hero-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: #ecfdf5;
          color: #047857;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .signal-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          background: #eff6ff;
          color: #2563eb;
          padding: 7px 10px;
          font-size: .74rem;
          font-weight: 850;
        }

        .hero-main-card h2 {
          color: #0f172a;
          font-size: 1.8rem;
          font-weight: 900;
          margin: 0 0 10px;
          letter-spacing: -.04em;
        }

        .hero-main-card p,
        .hero-side-card p,
        .side-card p {
          color: #64748b;
          line-height: 1.65;
          margin: 0;
          font-size: .92rem;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .hero-stats div {
          border-radius: 16px;
          background: #f8fafc;
          padding: 14px;
        }

        .hero-stats span,
        .hero-side-top span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .05em;
          margin-bottom: 5px;
        }

        .hero-stats strong,
        .hero-side-card strong {
          color: #0f172a;
          font-size: 1.3rem;
          font-weight: 900;
        }

        .hero-side-card {
          display: flex;
          flex-direction: column;
        }

        .expansion-meter {
          height: 9px;
          border-radius: 999px;
          background: #eef2f7;
          overflow: hidden;
          margin: 18px 0 10px;
        }

        .expansion-meter span {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: linear-gradient(90deg, #2563eb, #10b981);
        }

        .hero-side-card small {
          color: #94a3b8;
          line-height: 1.5;
        }

        .interest-signal-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .interest-signal-grid article {
          border-radius: 18px;
          padding: 16px;
        }

        .signal-icon {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .signal-icon.blue { background: #eff6ff; color: #2563eb; }
        .signal-icon.green { background: #ecfdf5; color: #047857; }
        .signal-icon.amber { background: #fffbeb; color: #b45309; }
        .signal-icon.indigo { background: #eef2ff; color: #4338ca; }

        .interest-signal-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.65rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .interest-signal-grid span {
          display: block;
          color: #334155;
          font-size: .84rem;
          font-weight: 850;
        }

        .interest-signal-grid small {
          display: block;
          margin-top: 5px;
          color: #94a3b8;
          font-size: .74rem;
        }

        .interest-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 18px;
          margin-bottom: 18px;
        }

        .interest-main {
          display: grid;
          gap: 18px;
        }

        .interest-panel,
        .side-card {
          border-radius: 22px;
          overflow: hidden;
        }

        .panel-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .panel-header span {
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .panel-header h2 {
          color: #0f172a;
          font-size: 1.15rem;
          font-weight: 900;
          margin: 5px 0 0;
        }

        .panel-pill {
          align-self: flex-start;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #334155;
          padding: 8px 10px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .institution-list,
        .timeline-list {
          padding: 20px;
          display: grid;
          gap: 14px;
        }

        .institution-row,
        .timeline-row {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .institution-rank,
        .timeline-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #f1f5f9;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .84rem;
          font-weight: 900;
          flex-shrink: 0;
        }

        .institution-main,
        .timeline-main {
          flex: 1;
          min-width: 0;
        }

        .institution-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .institution-top strong,
        .timeline-main strong {
          color: #0f172a;
          font-size: .95rem;
          font-weight: 900;
        }

        .institution-top span,
        .timeline-main span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 750;
        }

        .institution-bar {
          height: 8px;
          border-radius: 999px;
          background: #eef2f7;
          overflow: hidden;
          margin-bottom: 7px;
        }

        .institution-bar span {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: linear-gradient(90deg, #2563eb, #10b981);
        }

        .institution-main small {
          color: #94a3b8;
          font-size: .72rem;
        }

        .timeline-row {
          align-items: center;
        }

        .timeline-value {
          min-width: 48px;
          text-align: right;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
        }

        .interest-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .side-card {
          padding: 18px;
        }

        .side-card.emphasis {
          background: linear-gradient(135deg, #0f172a, #111827);
          color: #ffffff;
          border: 0;
        }

        .side-card.emphasis p {
          color: rgba(255,255,255,.72);
        }

        .side-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .side-card-header h3 {
          margin: 0;
          font-size: .96rem;
          font-weight: 900;
        }

        .insight-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 10px;
          color: #64748b;
          font-size: .86rem;
          line-height: 1.6;
        }

        .outreach-panel {
          margin-bottom: 10px;
        }

        .outreach-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .outreach-card {
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 16px;
        }

        .outreach-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .outreach-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .request-date {
          color: #94a3b8;
          font-size: .74rem;
          font-weight: 750;
        }

        .outreach-card h3 {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
          margin: 0 0 10px;
        }

        .domain-pill {
          display: inline-flex;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #334155;
          padding: 7px 10px;
          font-size: .76rem;
          font-weight: 850;
          margin-bottom: 14px;
        }

        .outreach-meta {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
        }

        .outreach-meta span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
        }

        .outreach-btn {
          width: 100%;
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid #dbe3ea;
          background: #0f172a;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          cursor: pointer;
        }

        .outreach-btn.success {
          background: #047857;
          border-color: #047857;
        }

        .outreach-btn.error {
          background: #b91c1c;
          border-color: #b91c1c;
        }

        .outreach-btn.disabled {
          background: #f8fafc;
          color: #94a3b8;
          border-color: #e5e7eb;
          cursor: not-allowed;
        }

        .interest-empty {
          padding: 44px 20px;
          text-align: center;
          color: #64748b;
        }

        .interest-empty.large {
          grid-column: 1 / -1;
        }

        .interest-empty svg {
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .interest-empty h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .interest-loading {
          min-height: 320px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #64748b;
          font-weight: 850;
        }

        @media (max-width: 1180px) {
          .interest-hero,
          .interest-layout,
          .outreach-grid {
            grid-template-columns: 1fr;
          }

          .interest-sidebar {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .interest-header,
          .hero-stats,
          .interest-signal-grid,
          .interest-sidebar,
          .outreach-grid {
            grid-template-columns: 1fr;
            flex-direction: column;
          }

          .interest-header {
            display: flex;
          }

          .panel-header,
          .institution-top,
          .hero-main-top,
          .hero-side-top {
            flex-direction: column;
            align-items: flex-start;
          }

          .interest-btn {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
};
export default InstitutionInterestAnalytics;