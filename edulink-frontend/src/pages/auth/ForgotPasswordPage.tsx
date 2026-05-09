import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { authService } from '../../services/auth/authService';
import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';

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
  --placeholder: #c7ced8;
  --bg: #f6faf9;
  --surface: #ffffff;
  --border: #e5e7eb;
  --border-2: #f3f4f6;

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
  --ease: .16s cubic-bezier(.4,0,.2,1);
}

.fp-page {
  width: 100vw;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 440px 1fr;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font);
  overflow: hidden;
}

/* LEFT PANEL */
.fp-left {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--brand-bg);
}

.fp-glow {
  position: absolute;
  width: 580px;
  height: 580px;
  top: -170px;
  right: -210px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(220,255,248,.24), transparent 58%);
  pointer-events: none;
}

.fp-glow-2 {
  position: absolute;
  width: 340px;
  height: 340px;
  bottom: -100px;
  left: -80px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(210,255,247,.14), transparent 62%);
  pointer-events: none;
}

.fp-grid-tex {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
  background-size: 38px 38px;
  pointer-events: none;
}

.fp-left-inner {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding: 38px 42px 40px;
  display: flex;
  flex-direction: column;
}

.fp-logo {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 10px 28px rgba(0,0,0,.22);
  text-decoration: none;
}

.fp-logo-img {
  height: 38px;
  width: auto;
}

.fp-hero {
  margin-top: 28px;
}

.fp-eyebrow {
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

.fp-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--brand-hi);
  box-shadow: 0 0 16px rgba(11,191,163,.75);
}

.fp-headline {
  max-width: 345px;
  font-size: clamp(1.95rem, 2.6vw, 2.7rem);
  line-height: 1.08;
  letter-spacing: -.7px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 15px;
}

.fp-headline span {
  color: var(--brand-hi);
}

.fp-sub {
  max-width: 315px;
  color: rgba(255,255,255,.74);
  font-size: .89rem;
  line-height: 1.75;
}

.fp-features {
  margin-top: 38px;
  display: flex;
  flex-direction: column;
}

.fp-feature {
  display: flex;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255,255,255,.055);
}

.fp-feature:last-child {
  border-bottom: 0;
}

.fp-feature-icon {
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

.fp-feature-title {
  color: rgba(255,255,255,.92);
  font-size: .83rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.fp-feature-desc {
  color: rgba(255,255,255,.64);
  font-size: .74rem;
  line-height: 1.5;
}

/* RIGHT PANEL */
.fp-right {
  min-height: 100vh;
  overflow-y: auto;
  background:
    radial-gradient(circle at top right, rgba(6,155,142,.08), transparent 36%),
    var(--bg);
}

.fp-right-inner {
  width: 100%;
  max-width: 560px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 32px 48px 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.fp-topbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 26px;
}

.fp-back-top {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--brand);
  background: var(--brand-tint);
  border: 1.5px solid var(--brand-ring);
  padding: 8px 15px;
  border-radius: var(--r);
  text-decoration: none;
  font-size: .82rem;
  font-weight: 800;
  transition: background var(--ease), border-color var(--ease);
}

.fp-back-top:hover {
  background: rgba(6,155,142,.14);
  border-color: rgba(6,155,142,.38);
}

.fp-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  padding: 34px 32px 30px;
  box-shadow: 0 18px 55px rgba(17,24,39,.045);
}

.fp-icon-main {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: var(--brand-tint);
  border: 1px solid rgba(6,155,142,.16);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.fp-step-tag {
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
  margin-bottom: 12px;
}

.fp-title {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -.55px;
  color: var(--ink);
  margin-bottom: 7px;
}

.fp-helper {
  color: var(--muted);
  font-size: .88rem;
  line-height: 1.65;
  margin-bottom: 24px;
}

.fp-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fp-label {
  color: var(--ink-2);
  font-size: .73rem;
  font-weight: 800;
  letter-spacing: .05em;
  text-transform: uppercase;
}

.fp-wrap {
  position: relative;
}

.fp-input-icon {
  position: absolute;
  top: 50%;
  left: 13px;
  transform: translateY(-50%);
  color: var(--faint);
  display: flex;
  pointer-events: none;
}

.fp-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: var(--r);
  padding: 0 14px 0 42px;
  font: 600 .9rem var(--font);
  color: var(--ink);
  outline: none;
  transition: border-color var(--ease), box-shadow var(--ease), background var(--ease);
}

.fp-input:hover:not(:focus) {
  border-color: #d1d5db;
  background: var(--bg);
}

.fp-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-ring);
  background: var(--surface);
}

.fp-input::placeholder {
  color: var(--placeholder);
  font-weight: 500;
}

.fp-submit {
  width: 100%;
  height: 49px;
  border: 0;
  border-radius: var(--r);
  background: var(--brand);
  color: #fff;
  font: 800 .92rem var(--font);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  box-shadow: 0 2px 14px rgba(6,155,142,.30);
  transition: background var(--ease), box-shadow var(--ease), transform .1s;
}

.fp-submit:hover:not(:disabled) {
  background: var(--brand-lo);
  box-shadow: 0 4px 20px rgba(6,155,142,.40);
}

.fp-submit:active:not(:disabled) {
  transform: scale(.985);
}

.fp-submit:disabled {
  opacity: .6;
  cursor: not-allowed;
  box-shadow: none;
}

.fp-spinner {
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fp-note {
  margin-top: 16px;
  padding: 13px 14px;
  border-radius: var(--r);
  background: var(--bg);
  border: 1px solid var(--border-2);
  color: var(--muted);
  font-size: .8rem;
  line-height: 1.55;
}

/* SUCCESS */
.fp-success {
  text-align: center;
}

.fp-success-icon {
  width: 78px;
  height: 78px;
  margin: 0 auto 22px;
  border-radius: 999px;
  background: rgba(6,155,142,.08);
  border: 1.5px solid rgba(6,155,142,.18);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fp-success-title {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -.55px;
  color: var(--ink);
  margin-bottom: 10px;
}

.fp-success-desc {
  max-width: 360px;
  margin: 0 auto 24px;
  color: var(--muted);
  font-size: .9rem;
  line-height: 1.7;
}

.fp-success-email {
  color: var(--brand);
  font-weight: 800;
}

.fp-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fp-secondary-btn {
  width: 100%;
  height: 46px;
  border: 1.5px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  color: var(--ink-2);
  font: 800 .88rem var(--font);
  cursor: pointer;
  transition: border-color var(--ease), background var(--ease);
}

.fp-secondary-btn:hover {
  border-color: #d1d5db;
  background: var(--bg);
}

/* TOAST */
.fp-toast-wrap {
  position: fixed;
  top: 24px;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding: 0 20px;
  pointer-events: none;
}

.fp-toast {
  width: 100%;
  max-width: 440px;
  pointer-events: auto;
  border-radius: var(--r-lg);
  padding: 13px 46px 13px 14px;
  font-size: .84rem;
  font-weight: 700;
  line-height: 1.5;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  position: relative;
  box-shadow: 0 18px 48px rgba(17,24,39,.16);
  animation: toastIn .2s ease forwards;
}

.fp-toast.error {
  background: var(--danger-bg);
  border: 1px solid var(--danger-bd);
  color: var(--danger);
}

.fp-toast.success {
  background: var(--success-bg);
  border: 1px solid var(--success-bd);
  color: var(--success-tx);
}

.fp-toast.closing {
  animation: toastOut .18s ease forwards;
}

.fp-toast-close {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: 0;
  background: none;
  cursor: pointer;
  color: inherit;
  opacity: .65;
  font-size: 20px;
  line-height: 1;
}

.fp-toast-close:hover {
  opacity: 1;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: none; }
}

@keyframes toastOut {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(-8px); }
}

@media (max-width: 980px) {
  .fp-page {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .fp-left {
    display: none;
  }

  .fp-right {
    min-height: 100vh;
  }

  .fp-right-inner {
    max-width: 100%;
    padding: 24px 20px 40px;
    justify-content: flex-start;
  }

  .fp-card {
    padding: 26px 20px 22px;
    border-radius: var(--r-xl);
  }

  .fp-topbar {
    justify-content: center;
    margin-bottom: 18px;
  }
}

@media (max-width: 640px) {
  .fp-title,
  .fp-success-title {
    font-size: 1.5rem;
  }

  .fp-input {
    font-size: 16px;
  }
}
`;

const recoveryFeatures = [
  {
    icon: <ShieldCheck size={16} />,
    title: 'Secure reset flow',
    desc: 'Only verified account emails can start a password recovery request.',
  },
  {
    icon: <Mail size={16} />,
    title: 'Email-based recovery',
    desc: 'A private reset link is sent directly to your registered inbox.',
  },
  {
    icon: <FileText size={16} />,
    title: 'Workspace access restored',
    desc: 'Return to your placements, logbooks, approvals, and records safely.',
  },
];

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);

  const hideToast = () => {
    setToastClosing(true);

    setTimeout(() => {
      setShowToast(false);
      setToastClosing(false);
    }, 180);
  };

  const showToastMessage = (msg: string, type: 'error' | 'success') => {
    setMessage(msg);
    setMessageType(type);
    setShowToast(true);
    setToastClosing(false);

    setTimeout(() => {
      hideToast();
    }, type === 'success' ? 6000 : 10000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showToastMessage('Please enter your email address', 'error');
      return;
    }

    setIsLoading(true);

    try {
      await authService.requestPasswordReset(trimmedEmail);
      setEmail(trimmedEmail);
      setIsSubmitted(true);
      showToastMessage('Reset link sent successfully.', 'success');
    } catch (err: any) {
      showToastMessage(
        getUserFacingErrorMessage(err?.message, err?.status) ||
          'Failed to send reset link. Please try again.',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="fp-toast-wrap">
        {showToast && (
          <div
            className={`fp-toast ${messageType === 'success' ? 'success' : 'error'} ${
              toastClosing ? 'closing' : ''
            }`}
            role="alert"
            aria-live="assertive"
          >
            {messageType === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}

            <span>{message}</span>

            <button
              type="button"
              className="fp-toast-close"
              onClick={hideToast}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="fp-page">
        <aside className="fp-left" aria-hidden="true">
          <div className="fp-glow" />
          <div className="fp-glow-2" />
          <div className="fp-grid-tex" />

          <div className="fp-left-inner">
            <Link to="/" className="fp-logo">
              <img src={edulinkLogo} alt="EduLink" className="fp-logo-img" />
            </Link>

            <div className="fp-hero">
              <div className="fp-eyebrow">
                <span className="fp-eyebrow-dot" />
                Account recovery
              </div>

              <h1 className="fp-headline">
                Get back into your workspace <span>securely.</span>
              </h1>

              <p className="fp-sub">
                Reset your password and continue managing placements, digital
                logbooks, supervision, and verified career records.
              </p>

              <div className="fp-features">
                {recoveryFeatures.map((feature) => (
                  <div className="fp-feature" key={feature.title}>
                    <div className="fp-feature-icon">{feature.icon}</div>
                    <div>
                      <div className="fp-feature-title">{feature.title}</div>
                      <div className="fp-feature-desc">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </aside>

        <main className="fp-right">
          <div className="fp-right-inner">
            <div className="fp-topbar">
              <Link to="/login" className="fp-back-top">
                <ArrowLeft size={13} />
                Back to sign in
              </Link>
            </div>

            <section className="fp-card" aria-label="Password reset panel">
              {isSubmitted ? (
                <div className="fp-success">
                  <div className="fp-success-icon">
                    <CheckCircle size={32} />
                  </div>

                  <h1 className="fp-success-title">Check your email</h1>

                  <p className="fp-success-desc">
                    We sent password reset instructions to{' '}
                    <span className="fp-success-email">{email}</span>. Check
                    your inbox and spam folder.
                  </p>

                  <div className="fp-actions">
                    <Link to="/login" className="fp-submit" style={{ textDecoration: 'none' }}>
                      Return to sign in
                      <ArrowRight size={16} />
                    </Link>

                    <button
                      type="button"
                      className="fp-secondary-btn"
                      onClick={() => setIsSubmitted(false)}
                    >
                      Try another email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="fp-icon-main">
                    <LockKeyhole size={24} />
                  </div>

                  <div className="fp-step-tag">
                    <Sparkles size={11} />
                    Password reset
                  </div>

                  <h1 className="fp-title">Forgot your password?</h1>

                  <p className="fp-helper">
                    Enter the email connected to your EduLink account. We’ll
                    send you a secure link to reset your password.
                  </p>

                  <form className="fp-form" onSubmit={handleSubmit} noValidate>
                    <div className="fp-field">
                      <label htmlFor="email" className="fp-label">
                        Email address
                      </label>

                      <div className="fp-wrap">
                        <span className="fp-input-icon" aria-hidden="true">
                          <Mail size={16} />
                        </span>

                        <input
                          id="email"
                          type="email"
                          className="fp-input"
                          placeholder="you@university.ac.ke"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          autoFocus
                        />
                      </div>
                    </div>

                    <button type="submit" className="fp-submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 size={17} className="fp-spinner" />
                          Sending reset link…
                        </>
                      ) : (
                        <>
                          Send reset link
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="fp-note">
                    For your safety, the reset link should only be opened from
                    your own email inbox. EduLink will never ask for your
                    password through WhatsApp, SMS, or phone calls.
                  </div>

                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default ForgotPasswordPage;