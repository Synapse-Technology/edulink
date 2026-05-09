import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';

type VerifyStatus = 'verifying' | 'success' | 'error';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --brand: #069b8e;
  --brand-hi: #0bbfa3;
  --brand-lo: #057e73;
  --brand-bg: #0a4f4a;
  --brand-tint: rgba(6,155,142,.08);
  --brand-ring: rgba(6,155,142,.22);

  --ink: #111827;
  --ink-2: #1f2937;
  --muted: #6b7280;
  --faint: #9ca3af;
  --bg: #f6faf9;
  --surface: #ffffff;
  --border: #e5e7eb;

  --danger: #dc2626;
  --danger-bg: #fef2f2;
  --danger-bd: #fecaca;

  --success-bg: #f0fdf9;
  --success-bd: #99f6e4;
  --success-tx: #0f766e;

  --r: 10px;
  --r-lg: 14px;
  --r-xl: 20px;
  --r-2xl: 26px;

  --font: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.ve-page {
  width: 100vw;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 440px 1fr;
  background: var(--bg);
  font-family: var(--font);
  overflow: hidden;
}

/* LEFT */
.ve-left {
  min-height: 100vh;
  background: var(--brand-bg);
  position: relative;
  overflow: hidden;
}

.ve-glow {
  position: absolute;
  width: 580px;
  height: 580px;
  top: -170px;
  right: -210px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(220,255,248,.24), transparent 58%);
}

.ve-glow-2 {
  position: absolute;
  width: 340px;
  height: 340px;
  bottom: -100px;
  left: -80px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(210,255,247,.14), transparent 62%);
}

.ve-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
  background-size: 38px 38px;
}

.ve-left-inner {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding: 38px 42px 40px;
  display: flex;
  flex-direction: column;
}

.ve-logo {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 10px 28px rgba(0,0,0,.22);
}

.ve-logo-img {
  height: 38px;
  width: auto;
}

.ve-hero {
  margin-top: 28px;
}

.ve-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--brand-hi);
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .11em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.ve-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--brand-hi);
  box-shadow: 0 0 16px rgba(11,191,163,.75);
}

.ve-title {
  max-width: 340px;
  font-size: clamp(2rem, 2.7vw, 2.75rem);
  line-height: 1.06;
  letter-spacing: -.7px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 15px;
}

.ve-title span {
  color: var(--brand-hi);
}

.ve-sub {
  max-width: 320px;
  color: rgba(255,255,255,.74);
  font-size: .89rem;
  line-height: 1.75;
}

.ve-features {
  margin-top: 38px;
  display: flex;
  flex-direction: column;
}

.ve-feature {
  display: flex;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255,255,255,.055);
}

.ve-feature:last-child {
  border-bottom: 0;
}

.ve-feature-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(11,191,163,.11);
  border: 1px solid rgba(11,191,163,.16);
  color: var(--brand-hi);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ve-feature-title {
  color: rgba(255,255,255,.92);
  font-size: .83rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.ve-feature-desc {
  color: rgba(255,255,255,.64);
  font-size: .74rem;
  line-height: 1.5;
}

/* RIGHT */
.ve-right {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(6,155,142,.08), transparent 36%),
    var(--bg);
}

.ve-right-inner {
  width: 100%;
  max-width: 560px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 32px 48px 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ve-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  padding: 42px 34px;
  box-shadow: 0 18px 55px rgba(17,24,39,.045);
  text-align: center;
}

.ve-state-icon {
  width: 86px;
  height: 86px;
  border-radius: 999px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ve-state-icon.loading {
  background: rgba(6,155,142,.08);
  border: 1.5px solid rgba(6,155,142,.16);
  color: var(--brand);
}

.ve-state-icon.success {
  background: var(--success-bg);
  border: 1.5px solid var(--success-bd);
  color: var(--success-tx);
}

.ve-state-icon.error {
  background: var(--danger-bg);
  border: 1.5px solid var(--danger-bd);
  color: var(--danger);
}

.ve-spinner {
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ve-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--brand);
  background: var(--brand-tint);
  border: 1px solid rgba(6,155,142,.14);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.ve-heading {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -.7px;
  margin-bottom: 12px;
  color: var(--ink);
}

.ve-message {
  max-width: 380px;
  margin: 0 auto;
  color: var(--muted);
  font-size: .92rem;
  line-height: 1.75;
}

.ve-actions {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ve-btn {
  width: 100%;
  height: 49px;
  border: 0;
  border-radius: var(--r);
  background: var(--brand);
  color: #fff;
  font: 800 .92rem var(--font);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  box-shadow: 0 2px 14px rgba(6,155,142,.30);
}

.ve-btn-secondary {
  width: 100%;
  height: 46px;
  border: 1.5px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  color: var(--ink-2);
  font: 800 .88rem var(--font);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@media (max-width: 980px) {
  .ve-page {
    grid-template-columns: 1fr;
  }

  .ve-left {
    display: none;
  }

  .ve-right-inner {
    max-width: 100%;
    padding: 24px 20px 40px;
  }

  .ve-card {
    padding: 30px 22px;
  }
}
`;

const features = [
  {
    icon: <ShieldCheck size={16} />,
    title: 'Secure verification flow',
    desc: 'Every account confirmation request is validated server-side.',
  },
  {
    icon: <MailCheck size={16} />,
    title: 'Verified workspace access',
    desc: 'Email confirmation unlocks secure EduLink authentication.',
  },
  {
    icon: <Sparkles size={16} />,
    title: 'Trusted identity validation',
    desc: 'Verification protects students, employers, and institutions.',
  },
];

const VerifyEmail: React.FC = () => {
  const { token } = useParams();

  const [status, setStatus] = useState<VerifyStatus>('verifying');

  const [message, setMessage] = useState(
    'Verifying your email address securely...'
  );

  const verifyCalledToken = useRef<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }

      const cleanToken = token.trim().replace(/\/$/, '');

      if (verifyCalledToken.current === cleanToken) {
        return;
      }

      verifyCalledToken.current = cleanToken;

      try {
        const response = await fetch(
          '/api/notifications/email-verification/verify/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: cleanToken }),
          }
        );

        if (!response.ok) {
          let errorMessage =
            'Verification link is invalid or has expired.';

          try {
            const data = await response.json();

            if (typeof data.error === 'string' && data.error) {
              errorMessage = data.error;
            }
          } catch {}

          setStatus('error');
          setMessage(errorMessage);
          return;
        }

        setStatus('success');

        setMessage(
          'Your email has been verified successfully. You can now sign in to your EduLink workspace.'
        );

      } catch {
        setStatus('error');

        setMessage(
          'Unable to verify your email right now. Please try again later.'
        );
      }
    };

    verify();
  }, [token]);

  const isLoading = status === 'verifying';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="ve-page">
        <aside className="ve-left">
          <div className="ve-glow" />
          <div className="ve-glow-2" />
          <div className="ve-grid" />

          <div className="ve-left-inner">
            <Link to="/" className="ve-logo">
              <img
                src={edulinkLogo}
                alt="EduLink"
                className="ve-logo-img"
              />
            </Link>

            <div className="ve-hero">
              <div className="ve-eyebrow">
                <span className="ve-eyebrow-dot" />
                Identity verification
              </div>

              <h1 className="ve-title">
                Confirm your account with <span>confidence.</span>
              </h1>

              <p className="ve-sub">
                EduLink verifies identities to secure placements,
                institutions, approvals, and digital career records.
              </p>

              <div className="ve-features">
                {features.map((feature) => (
                  <div className="ve-feature" key={feature.title}>
                    <div className="ve-feature-icon">
                      {feature.icon}
                    </div>

                    <div>
                      <div className="ve-feature-title">
                        {feature.title}
                      </div>

                      <div className="ve-feature-desc">
                        {feature.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </aside>

        <main className="ve-right">
          <div className="ve-right-inner">
            <section className="ve-card">
              <div
                className={`ve-state-icon ${
                  isLoading
                    ? 'loading'
                    : isSuccess
                    ? 'success'
                    : 'error'
                }`}
              >
                {isLoading && (
                  <Loader2 size={34} className="ve-spinner" />
                )}

                {isSuccess && (
                  <CheckCircle2 size={36} />
                )}

                {isError && (
                  <AlertTriangle size={36} />
                )}
              </div>

              <div className="ve-step">
                <Sparkles size={11} />
                Email verification
              </div>

              <h1 className="ve-heading">
                {isLoading && 'Verifying your email'}
                {isSuccess && 'Email verified'}
                {isError && 'Verification failed'}
              </h1>

              <p className="ve-message">
                {message}
              </p>

              {!isLoading && (
                <div className="ve-actions">
                  {isSuccess ? (
                    <Link to="/login" className="ve-btn">
                      Go to sign in
                      <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/register"
                        className="ve-btn"
                      >
                        Return to registration
                        <ArrowRight size={16} />
                      </Link>

                      <Link
                        to="/login"
                        className="ve-btn-secondary"
                      >
                        <ArrowLeft size={15} />
                        Back to sign in
                      </Link>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default VerifyEmail;