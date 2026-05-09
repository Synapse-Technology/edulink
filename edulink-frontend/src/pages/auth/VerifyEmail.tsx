import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';
import { authService } from '../../services/auth/authService';

type VerifyStatus = 'pending' | 'verifying' | 'success' | 'error' | 'resent';

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

  --warning: #d97706;
  --warning-bg: #fffbeb;
  --warning-bd: #fde68a;

  --success-bg: #f0fdf9;
  --success-bd: #99f6e4;
  --success-tx: #0f766e;

  --resent-bg: #eff6ff;
  --resent-bd: #bfdbfe;
  --resent-tx: #1d4ed8;

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

/* State icon */
.ve-state-icon {
  width: 86px;
  height: 86px;
  border-radius: 999px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .3s ease;
}

.ve-state-icon.loading {
  background: rgba(6,155,142,.08);
  border: 1.5px solid rgba(6,155,142,.16);
  color: var(--brand);
}

.ve-state-icon.pending {
  background: var(--warning-bg);
  border: 1.5px solid var(--warning-bd);
  color: var(--warning);
}

.ve-state-icon.success {
  background: var(--success-bg);
  border: 1.5px solid var(--success-bd);
  color: var(--success-tx);
}

.ve-state-icon.resent {
  background: var(--resent-bg);
  border: 1.5px solid var(--resent-bd);
  color: var(--resent-tx);
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
  to { transform: rotate(360deg); }
}

/* Status badge */
.ve-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.ve-badge.brand {
  color: var(--brand);
  background: var(--brand-tint);
  border: 1px solid rgba(6,155,142,.14);
}

.ve-badge.success {
  color: var(--success-tx);
  background: var(--success-bg);
  border: 1px solid var(--success-bd);
}

.ve-badge.resent {
  color: var(--resent-tx);
  background: var(--resent-bg);
  border: 1px solid var(--resent-bd);
}

.ve-badge.warning {
  color: var(--warning);
  background: var(--warning-bg);
  border: 1px solid var(--warning-bd);
}

.ve-badge.danger {
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger-bd);
}

/* Toast banner for resent confirmation */
.ve-toast {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  background: var(--resent-bg);
  border: 1.5px solid var(--resent-bd);
  border-radius: var(--r-lg);
  padding: 14px 16px;
  margin-bottom: 20px;
  text-align: left;
  animation: slideDown .3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ve-toast-icon {
  color: var(--resent-tx);
  flex-shrink: 0;
  margin-top: 1px;
}

.ve-toast-title {
  font-size: .82rem;
  font-weight: 800;
  color: var(--resent-tx);
  margin-bottom: 2px;
}

.ve-toast-body {
  font-size: .77rem;
  color: #3b82f6;
  line-height: 1.5;
}

/* Email hint chip */
.ve-email-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--brand-tint);
  border: 1px solid var(--brand-ring);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: .78rem;
  font-weight: 700;
  color: var(--brand-lo);
  margin: 14px auto 0;
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

/* Cooldown hint */
.ve-cooldown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  font-size: .76rem;
  color: var(--faint);
  font-weight: 600;
}

.ve-actions {
  margin-top: 28px;
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
  cursor: pointer;
  transition: opacity .15s, transform .12s;
}

.ve-btn:hover:not(:disabled) {
  opacity: .92;
  transform: translateY(-1px);
}

.ve-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
  transform: none;
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
  cursor: pointer;
  transition: background .15s, border-color .15s;
}

.ve-btn-secondary:hover {
  background: var(--bg);
  border-color: #d1d5db;
}

/* Divider */
.ve-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
}

.ve-divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.ve-divider-text {
  font-size: .72rem;
  color: var(--faint);
  font-weight: 600;
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

// Cooldown in seconds before user can resend again
const RESEND_COOLDOWN = 60;

const VerifyEmail: React.FC = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const verificationEmail = searchParams.get('email')?.trim() || '';

  const [status, setStatus] = useState<VerifyStatus>(token ? 'verifying' : 'pending');
  const [isResending, setIsResending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const [message, setMessage] = useState(
    token
      ? 'Verifying your email address securely...'
      : 'Check your inbox for a verification link to activate your EduLink account.'
  );

  const verifyCalledToken = useRef<string | null>(null);

  // Token verification on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('pending');
        setMessage('Check your inbox for a verification link to activate your EduLink account.');
        return;
      }

      const cleanToken = token.trim().replace(/\/$/, '');
      if (verifyCalledToken.current === cleanToken) return;
      verifyCalledToken.current = cleanToken;

      try {
        await authService.verifyEmailToken(cleanToken);
        setStatus('success');
        setMessage('Your email has been verified successfully. You can now sign in to your EduLink workspace.');
      } catch {
        setStatus('error');
        setMessage('The verification link is invalid or has expired. Request a new one below.');
      }
    };

    verify();
  }, [token]);

  // Cooldown ticker
  useEffect(() => {
    if (!resentAt) return;
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - resentAt) / 1000);
      const left = Math.max(0, RESEND_COOLDOWN - elapsed);
      setCooldownLeft(left);
      if (left === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [resentAt]);

  const handleResend = async () => {
    if (!verificationEmail) {
      setStatus('error');
      setMessage('Missing email address. Please return to sign in and try again.');
      return;
    }

    setIsResending(true);
    try {
      await authService.resendVerificationEmail(verificationEmail);
      setStatus('resent');
      setResentAt(Date.now());
      setCooldownLeft(RESEND_COOLDOWN);
      setMessage('A new verification link has been sent to your email. Check your inbox (and spam folder).');
    } catch {
      setStatus('error');
      setMessage('Unable to resend the verification email. Please wait a moment and try again.');
    } finally {
      setIsResending(false);
    }
  };

  const isLoading = status === 'verifying';
  const isPending = status === 'pending';
  const isSuccess = status === 'success';
  const isResent = status === 'resent';
  const isError = status === 'error';

  // Icon per state
  const iconClass = isLoading
    ? 'loading'
    : isSuccess
    ? 'success'
    : isResent
    ? 'resent'
    : isPending
    ? 'pending'
    : 'error';

  // Badge config per state
  const badge = isLoading
    ? { cls: 'brand', icon: <Loader2 size={10} className="ve-spinner" />, label: 'Verifying' }
    : isSuccess
    ? { cls: 'success', icon: <CheckCircle2 size={10} />, label: 'Verified' }
    : isResent
    ? { cls: 'resent', icon: <MailCheck size={10} />, label: 'Email sent' }
    : isPending
    ? { cls: 'warning', icon: <Clock size={10} />, label: 'Awaiting verification' }
    : { cls: 'danger', icon: <AlertTriangle size={10} />, label: 'Verification failed' };

  const heading = {
    verifying: 'Verifying your email',
    pending: 'Check your inbox',
    success: 'Email verified!',
    resent: 'New email sent!',
    error: 'Verification failed',
  }[status];

  const canResend = !isResending && cooldownLeft === 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="ve-page">
        {/* LEFT PANEL */}
        <aside className="ve-left">
          <div className="ve-glow" />
          <div className="ve-glow-2" />
          <div className="ve-grid" />

          <div className="ve-left-inner">
            <Link to="/" className="ve-logo">
              <img src={edulinkLogo} alt="EduLink" className="ve-logo-img" />
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
                {features.map((f) => (
                  <div className="ve-feature" key={f.title}>
                    <div className="ve-feature-icon">{f.icon}</div>
                    <div>
                      <div className="ve-feature-title">{f.title}</div>
                      <div className="ve-feature-desc">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <main className="ve-right">
          <div className="ve-right-inner">
            <section className="ve-card">

              {/* State icon */}
              <div className={`ve-state-icon ${iconClass}`}>
                {isLoading && <Loader2 size={34} className="ve-spinner" />}
                {isSuccess && <CheckCircle2 size={36} />}
                {isResent && <MailCheck size={36} />}
                {isPending && <Mail size={34} />}
                {isError && <AlertTriangle size={36} />}
              </div>

              {/* Status badge */}
              <div className={`ve-badge ${badge.cls}`}>
                {badge.icon}
                {badge.label}
              </div>

              <h1 className="ve-heading">{heading}</h1>

              {/* Resent success toast — shown above message when resent */}
              {isResent && (
                <div className="ve-toast">
                  <MailCheck size={16} className="ve-toast-icon" />
                  <div>
                    <div className="ve-toast-title">Verification email delivered</div>
                    <div className="ve-toast-body">
                      We sent a new link to <strong>{verificationEmail || 'your email'}</strong>. It expires in 24 hours.
                    </div>
                  </div>
                </div>
              )}

              <p className="ve-message">{message}</p>

              {/* Email chip — shown when waiting or resent */}
              {(isPending || isResent) && verificationEmail && (
                <div className="ve-email-chip">
                  <Mail size={12} />
                  {verificationEmail}
                </div>
              )}

              {/* Cooldown hint */}
              {isResent && cooldownLeft > 0 && (
                <div className="ve-cooldown">
                  <Clock size={12} />
                  Resend available in {cooldownLeft}s
                </div>
              )}

              {/* Actions */}
              {!isLoading && (
                <div className="ve-actions">
                  {isSuccess && (
                    <Link to="/login" className="ve-btn">
                      Continue to sign in
                      <ArrowRight size={16} />
                    </Link>
                  )}

                  {(isPending || isResent) && (
                    <>
                      {verificationEmail ? (
                        <button
                          type="button"
                          className="ve-btn"
                          onClick={handleResend}
                          disabled={!canResend}
                        >
                          {isResending ? (
                            <><Loader2 size={15} className="ve-spinner" /> Sending…</>
                          ) : isResent && cooldownLeft > 0 ? (
                            <><RefreshCw size={15} /> Resend again in {cooldownLeft}s</>
                          ) : (
                            <><RefreshCw size={15} /> {isResent ? 'Resend again' : 'Resend verification email'}</>
                          )}
                        </button>
                      ) : (
                        <Link to="/register" className="ve-btn">
                          Return to registration
                          <ArrowRight size={16} />
                        </Link>
                      )}

                      <div className="ve-divider">
                        <div className="ve-divider-line" />
                        <span className="ve-divider-text">or</span>
                        <div className="ve-divider-line" />
                      </div>

                      <Link to="/login" className="ve-btn-secondary">
                        <ArrowLeft size={15} />
                        Back to sign in
                      </Link>
                    </>
                  )}

                  {isError && (
                    <>
                      {verificationEmail ? (
                        <button
                          type="button"
                          className="ve-btn"
                          onClick={handleResend}
                          disabled={!canResend}
                        >
                          {isResending ? (
                            <><Loader2 size={15} className="ve-spinner" /> Sending…</>
                          ) : (
                            <><RefreshCw size={15} /> Resend verification email</>
                          )}
                        </button>
                      ) : (
                        <Link to="/register" className="ve-btn">
                          Return to registration
                          <ArrowRight size={16} />
                        </Link>
                      )}

                      <div className="ve-divider">
                        <div className="ve-divider-line" />
                        <span className="ve-divider-text">or</span>
                        <div className="ve-divider-line" />
                      </div>

                      <Link to="/login" className="ve-btn-secondary">
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