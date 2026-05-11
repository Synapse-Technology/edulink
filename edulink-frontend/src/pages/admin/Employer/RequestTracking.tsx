import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck,
  Loader2,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { employerService } from '../../../services/employer/employerService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import type { EmployerRequestStatusResponse } from '../../../services/employer/employerService';

const RequestTracking: React.FC = () => {
  const navigate = useNavigate();

  const [trackingCode, setTrackingCode] = useState('');
  const [statusData, setStatusData] =
    useState<EmployerRequestStatusResponse | null>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTrack = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!trackingCode.trim()) {
      setError('Please enter a valid tracking code.');
      return;
    }

    setIsLoading(true);
    setError('');
    setStatusData(null);

    try {
      const data = await employerService.getRequestStatus(
        trackingCode.trim(),
      );

      setStatusData(data);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      setError(
        sanitized.message ||
          sanitized.userMessage ||
          'Unable to retrieve request status.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          icon: <CheckCircle2 size={18} />,
          label: 'Approved',
          className: 'approved',
          description:
            'Your organization has been verified and onboarding access has been issued.',
        };

      case 'REJECTED':
        return {
          icon: <XCircle size={18} />,
          label: 'Rejected',
          className: 'rejected',
          description:
            'The request could not be approved based on the submitted review criteria.',
        };

      default:
        return {
          icon: <Clock3 size={18} />,
          label: 'Pending Review',
          className: 'pending',
          description:
            'Your onboarding request is currently under administrative review.',
        };
    }
  };

  const statusMeta = statusData
    ? getStatusMeta(statusData.status)
    : null;

  return (
    <main className="tracking-page">
      <section className="tracking-shell">
        <aside className="tracking-context">
          <div className="context-icon">
            <ShieldCheck size={30} />
          </div>

          <span className="context-kicker">
            Employer onboarding
          </span>

          <h1>Track organization verification status</h1>

          <p>
            EduLink reviews employer onboarding requests to
            maintain verified internship and attachment
            opportunities for students and institutions.
          </p>

          <div className="context-points">
            <div>
              <CheckCircle2 size={16} />
              <span>Verified employer onboarding</span>
            </div>

            <div>
              <FileCheck size={16} />
              <span>Institution trust alignment</span>
            </div>

            <div>
              <BriefcaseBusiness size={16} />
              <span>Secure internship opportunity workflows</span>
            </div>
          </div>

          <div className="review-note">
            <strong>Review process</strong>

            <p>
              Requests are reviewed for organizational legitimacy,
              contact verification, and operational fit before
              approval.
            </p>
          </div>
        </aside>

        <section className="tracking-card">
          <header className="tracking-header">
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={15} />
              Back to home
            </button>

            <div className="tracking-header-content">
              <div className="tracking-header-icon">
                <Search size={24} />
              </div>

              <span>Request tracking</span>

              <h2>Check onboarding status</h2>

              <p>
                Enter the tracking code issued during employer
                onboarding submission.
              </p>
            </div>
          </header>

          <form onSubmit={handleTrack} className="tracking-form">
            <label className="tracking-field">
              <span>Tracking code</span>

              <div className="tracking-input">
                <Search size={16} />

                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) =>
                    setTrackingCode(e.target.value.toUpperCase())
                  }
                  placeholder="EMP-XXXXXX"
                />

                <button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      Checking
                    </>
                  ) : (
                    <>
                      Track request
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </label>
          </form>

          {error && (
            <div className="tracking-alert error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          {statusData && statusMeta && (
            <section className="status-card">
              <div className="status-top">
                <div>
                  <span className="status-label">
                    Organization
                  </span>

                  <h3>{statusData.name}</h3>

                  <small>
                    Submitted on{' '}
                    {new Date(
                      statusData.submitted_at,
                    ).toLocaleDateString()}
                  </small>
                </div>

                <div className={`status-pill ${statusMeta.className}`}>
                  {statusMeta.icon}
                  {statusMeta.label}
                </div>
              </div>

              <p className="status-description">
                {statusMeta.description}
              </p>

              <div className="timeline">
                <div className="timeline-item complete">
                  <div className="timeline-dot">
                    <CheckCircle2 size={14} />
                  </div>

                  <div>
                    <strong>Request submitted</strong>
                    <span>
                      Your onboarding request was received.
                    </span>
                  </div>
                </div>

                <div
                  className={`timeline-item ${
                    statusData.status !== 'PENDING'
                      ? 'complete'
                      : 'active'
                  }`}
                >
                  <div className="timeline-dot">
                    {statusData.status !== 'PENDING' ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Clock3 size={14} />
                    )}
                  </div>

                  <div>
                    <strong>Administrative review</strong>
                    <span>
                      Verification and onboarding checks are
                      being processed.
                    </span>
                  </div>
                </div>

                {statusData.status === 'APPROVED' && (
                  <div className="timeline-item complete">
                    <div className="timeline-dot">
                      <CheckCircle2 size={14} />
                    </div>

                    <div>
                      <strong>Approved and activated</strong>
                      <span>
                        Employer onboarding approved and access
                        invitation issued.
                      </span>
                    </div>
                  </div>
                )}

                {statusData.status === 'REJECTED' && (
                  <div className="timeline-item rejected">
                    <div className="timeline-dot">
                      <XCircle size={14} />
                    </div>

                    <div>
                      <strong>Request rejected</strong>
                      <span>
                        The onboarding request did not meet
                        review requirements.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {statusData.status === 'APPROVED' && (
                <div className="tracking-alert success">
                  <CheckCircle2 size={17} />

                  <span>
                    Your organization has been approved. Check
                    your official email address for activation
                    instructions.
                  </span>
                </div>
              )}

              {statusData.status === 'REJECTED' &&
                statusData.rejection_reason && (
                  <div className="tracking-alert reject">
                    <AlertTriangle size={17} />

                    <span>
                      <strong>Reason:</strong>{' '}
                      {statusData.rejection_reason}
                    </span>
                  </div>
                )}
            </section>
          )}
        </section>
      </section>

      <style>{styles}</style>
    </main>
  );
};

const styles = `
  .tracking-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(4,120,87,.08), transparent 28%),
      radial-gradient(circle at bottom left, rgba(15,23,42,.06), transparent 26%),
      #f8fafc;
    padding: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #111827;
    font-family:
      Inter,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .tracking-shell {
    width: min(1120px, 100%);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 520px;
    gap: 18px;
  }

  .tracking-context,
  .tracking-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 28px;
    box-shadow: 0 24px 70px rgba(15,23,42,.06);
  }

  .tracking-context {
    padding: 38px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .context-icon {
    width: 68px;
    height: 68px;
    border-radius: 22px;
    background: #ecfdf5;
    color: #047857;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }

  .context-kicker {
    color: #047857;
    font-size: .72rem;
    font-weight: 900;
    letter-spacing: .09em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .tracking-context h1 {
    color: #0f172a;
    font-size: clamp(2.2rem, 4vw, 3.3rem);
    line-height: 1;
    font-weight: 950;
    letter-spacing: -.07em;
    margin: 0 0 16px;
  }

  .tracking-context p {
    color: #64748b;
    line-height: 1.75;
    margin: 0;
  }

  .context-points {
    display: grid;
    gap: 12px;
    margin-top: 28px;
  }

  .context-points div {
    min-height: 48px;
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    color: #334155;
    font-weight: 800;
    font-size: .88rem;
  }

  .context-points svg {
    color: #047857;
  }

  .review-note {
    margin-top: 34px;
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
  }

  .review-note strong {
    display: block;
    color: #0f172a;
    margin-bottom: 8px;
    font-weight: 900;
  }

  .review-note p {
    font-size: .9rem;
  }

  .tracking-card {
    overflow: hidden;
  }

  .tracking-header {
    padding: 22px 24px 20px;
    border-bottom: 1px solid #eef2f7;
  }

  .back-btn {
    border: 0;
    background: transparent;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 800;
    margin-bottom: 22px;
    cursor: pointer;
  }

  .tracking-header-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: #0f172a;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18px;
  }

  .tracking-header-content > span {
    display: block;
    color: #047857;
    font-size: .72rem;
    font-weight: 900;
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .tracking-header-content h2 {
    color: #0f172a;
    font-size: 1.45rem;
    font-weight: 950;
    letter-spacing: -.04em;
    margin: 0 0 8px;
  }

  .tracking-header-content p {
    color: #64748b;
    line-height: 1.7;
    margin: 0;
  }

  .tracking-form {
    padding: 24px;
  }

  .tracking-field {
    display: grid;
    gap: 8px;
  }

  .tracking-field > span {
    color: #334155;
    font-size: .82rem;
    font-weight: 850;
  }

  .tracking-input {
    min-height: 54px;
    border: 1px solid #dbe3ea;
    border-radius: 16px;
    background: #ffffff;
    display: flex;
    align-items: center;
    padding-left: 14px;
    gap: 10px;
    color: #94a3b8;
  }

  .tracking-input:focus-within {
    border-color: #047857;
    box-shadow: 0 0 0 4px rgba(4,120,87,.08);
  }

  .tracking-input input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    color: #111827;
    font-weight: 700;
    letter-spacing: .04em;
  }

  .tracking-input button {
    height: 54px;
    border: 0;
    background: #0f172a;
    color: #ffffff;
    padding: 0 18px;
    border-radius: 15px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 900;
    cursor: pointer;
  }

  .tracking-input button:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .tracking-alert {
    margin: 0 24px 24px;
    border-radius: 16px;
    padding: 14px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: .88rem;
    font-weight: 750;
  }

  .tracking-alert.error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .tracking-alert.success {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #047857;
    margin: 22px 0 0;
  }

  .tracking-alert.reject {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    color: #c2410c;
    margin: 22px 0 0;
  }

  .status-card {
    padding: 0 24px 24px;
  }

  .status-top {
    border-radius: 22px;
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .status-label {
    display: block;
    color: #64748b;
    font-size: .7rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .08em;
    margin-bottom: 6px;
  }

  .status-top h3 {
    color: #0f172a;
    font-size: 1.1rem;
    font-weight: 900;
    margin: 0 0 4px;
  }

  .status-top small {
    color: #64748b;
  }

  .status-pill {
    border-radius: 999px;
    padding: 10px 14px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: .78rem;
    font-weight: 900;
    white-space: nowrap;
  }

  .status-pill.approved {
    background: #ecfdf5;
    color: #047857;
  }

  .status-pill.pending {
    background: #eff6ff;
    color: #2563eb;
  }

  .status-pill.rejected {
    background: #fef2f2;
    color: #b91c1c;
  }

  .status-description {
    color: #64748b;
    line-height: 1.7;
    margin: 18px 0 24px;
  }

  .timeline {
    display: grid;
    gap: 18px;
  }

  .timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .timeline-dot {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
  }

  .timeline-item.complete .timeline-dot {
    background: #ecfdf5;
    color: #047857;
  }

  .timeline-item.active .timeline-dot {
    background: #eff6ff;
    color: #2563eb;
  }

  .timeline-item.rejected .timeline-dot {
    background: #fef2f2;
    color: #b91c1c;
  }

  .timeline-item strong {
    display: block;
    color: #0f172a;
    font-size: .9rem;
    font-weight: 900;
    margin-bottom: 4px;
  }

  .timeline-item span {
    color: #64748b;
    font-size: .85rem;
    line-height: 1.6;
  }

  .spin {
    animation: spin .9s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 980px) {
    .tracking-shell {
      grid-template-columns: 1fr;
    }

    .tracking-context {
      display: none;
    }
  }

  @media (max-width: 620px) {
    .tracking-page {
      padding: 14px;
      align-items: flex-start;
    }

    .tracking-card {
      border-radius: 22px;
    }

    .tracking-header,
    .tracking-form,
    .status-card {
      padding-left: 18px;
      padding-right: 18px;
    }

    .status-top {
      flex-direction: column;
    }

    .tracking-input {
      flex-wrap: wrap;
      padding: 12px;
      height: auto;
    }

    .tracking-input button {
      width: 100%;
    }
  }
`;

export default RequestTracking;