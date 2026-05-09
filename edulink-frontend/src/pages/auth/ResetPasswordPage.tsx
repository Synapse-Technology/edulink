import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
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

.rp-page {
  width: 100vw;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 440px 1fr;
  background: var(--bg);
  font-family: var(--font);
  color: var(--ink);
  overflow: hidden;
}

/* LEFT */
.rp-left {
  min-height: 100vh;
  background: var(--brand-bg);
  position: relative;
  overflow: hidden;
}

.rp-glow {
  position: absolute;
  width: 580px;
  height: 580px;
  top: -170px;
  right: -210px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(220,255,248,.24), transparent 58%);
}

.rp-glow-2 {
  position: absolute;
  width: 340px;
  height: 340px;
  bottom: -100px;
  left: -80px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(210,255,247,.14), transparent 62%);
}

.rp-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
  background-size: 38px 38px;
}

.rp-left-inner {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding: 38px 42px 40px;
  display: flex;
  flex-direction: column;
}

.rp-logo {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 10px 28px rgba(0,0,0,.22);
}

.rp-logo-img {
  height: 38px;
  width: auto;
}

.rp-hero {
  margin-top: 28px;
}

.rp-eyebrow {
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

.rp-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--brand-hi);
  box-shadow: 0 0 16px rgba(11,191,163,.75);
}

.rp-title {
  max-width: 340px;
  font-size: clamp(2rem, 2.7vw, 2.75rem);
  line-height: 1.06;
  letter-spacing: -.7px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 15px;
}

.rp-title span {
  color: var(--brand-hi);
}

.rp-sub {
  max-width: 320px;
  color: rgba(255,255,255,.74);
  font-size: .89rem;
  line-height: 1.75;
}

.rp-features {
  margin-top: 38px;
  display: flex;
  flex-direction: column;
}

.rp-feature {
  display: flex;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255,255,255,.055);
}

.rp-feature:last-child {
  border-bottom: 0;
}

.rp-feature-icon {
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

.rp-feature-title {
  color: rgba(255,255,255,.92);
  font-size: .83rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.rp-feature-desc {
  color: rgba(255,255,255,.64);
  font-size: .74rem;
  line-height: 1.5;
}

/* RIGHT */
.rp-right {
  min-height: 100vh;
  overflow-y: auto;
  background:
    radial-gradient(circle at top right, rgba(6,155,142,.08), transparent 36%),
    var(--bg);
}

.rp-right-inner {
  width: 100%;
  max-width: 560px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 32px 48px 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.rp-topbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 26px;
}

.rp-top-link {
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
}

.rp-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  padding: 34px 32px 30px;
  box-shadow: 0 18px 55px rgba(17,24,39,.045);
}

.rp-main-icon {
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

.rp-step {
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

.rp-heading {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -.55px;
  margin-bottom: 7px;
}

.rp-helper {
  color: var(--muted);
  font-size: .88rem;
  line-height: 1.65;
  margin-bottom: 24px;
}

.rp-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rp-label {
  color: var(--ink-2);
  font-size: .73rem;
  font-weight: 800;
  letter-spacing: .05em;
  text-transform: uppercase;
}

.rp-wrap {
  position: relative;
}

.rp-input-icon {
  position: absolute;
  top: 50%;
  left: 13px;
  transform: translateY(-50%);
  color: var(--faint);
  display: flex;
}

.rp-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: var(--r);
  padding: 0 44px 0 42px;
  font: 600 .9rem var(--font);
  color: var(--ink);
  outline: none;
  transition: border-color var(--ease), box-shadow var(--ease);
}

.rp-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-ring);
}

.rp-input::placeholder {
  color: var(--placeholder);
}

.rp-eye {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: 0;
  background: none;
  color: var(--faint);
  cursor: pointer;
  display: flex;
}

.rp-rules {
  padding: 13px 14px;
  border-radius: var(--r);
  background: var(--bg);
  border: 1px solid var(--border-2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rp-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: .8rem;
  font-weight: 600;
}

.rp-rule.pass {
  color: var(--brand);
}

.rp-submit {
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
}

.rp-submit:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.rp-spinner {
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.rp-success {
  text-align: center;
}

.rp-success-icon {
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

.rp-success-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 10px;
}

.rp-success-desc {
  max-width: 360px;
  margin: 0 auto 24px;
  color: var(--muted);
  font-size: .9rem;
  line-height: 1.7;
}

/* TOAST */
.rp-toast-wrap {
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

.rp-toast {
  width: 100%;
  max-width: 440px;
  pointer-events: auto;
  border-radius: var(--r-lg);
  padding: 13px 46px 13px 14px;
  font-size: .84rem;
  font-weight: 700;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  position: relative;
}

.rp-toast.error {
  background: var(--danger-bg);
  border: 1px solid var(--danger-bd);
  color: var(--danger);
}

.rp-toast.success {
  background: var(--success-bg);
  border: 1px solid var(--success-bd);
  color: var(--success-tx);
}

.rp-toast-close {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: 0;
  background: none;
  cursor: pointer;
  color: inherit;
  font-size: 20px;
}

@media (max-width: 980px) {
  .rp-page {
    grid-template-columns: 1fr;
  }

  .rp-left {
    display: none;
  }

  .rp-right-inner {
    max-width: 100%;
    padding: 24px 20px 40px;
  }

  .rp-card {
    padding: 26px 20px 22px;
  }

  .rp-topbar {
    justify-content: center;
  }
}
`;

const features = [
  {
    icon: <ShieldCheck size={16} />,
    title: 'Secure password rotation',
    desc: 'Reset credentials safely with verified recovery tokens.',
  },
  {
    icon: <Lock size={16} />,
    title: 'Protected account access',
    desc: 'New passwords immediately secure your EduLink workspace.',
  },
  {
    icon: <FileText size={16} />,
    title: 'Resume workflows safely',
    desc: 'Continue applications, approvals, and placements securely.',
  },
];

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);

  const showToastMessage = (msg: string, type: 'error' | 'success') => {
    setMessage(msg);
    setMessageType(type);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, type === 'success' ? 6000 : 10000);
  };

  useEffect(() => {
    if (!token) {
      showToastMessage(
        'Invalid or missing reset token. Please request a new link.',
        'error'
      );
    }
  }, [token]);

  const passwordRules = {
    min: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\\d/.test(password),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showToastMessage('Invalid or missing reset token', 'error');
      return;
    }

    if (!passwordRules.min) {
      showToastMessage(
        'Password must be at least 8 characters long',
        'error'
      );
      return;
    }

    if (password !== confirmPassword) {
      showToastMessage('Passwords do not match', 'error');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password, confirmPassword);

      setIsSuccess(true);

      showToastMessage(
        'Password reset successful! Redirecting...',
        'success'
      );

      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      showToastMessage(
        getUserFacingErrorMessage(
          err?.message,
          err?.status
        ) || 'Failed to reset password. The link may have expired.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="rp-toast-wrap">
        {showToast && (
          <div className={`rp-toast ${messageType === 'success' ? 'success' : 'error'}`}>
            {messageType === 'success'
              ? <CheckCircle size={16} />
              : <AlertCircle size={16} />
            }

            <span>{message}</span>

            <button
              className="rp-toast-close"
              onClick={() => setShowToast(false)}
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="rp-page">
        <aside className="rp-left">
          <div className="rp-glow" />
          <div className="rp-glow-2" />
          <div className="rp-grid" />

          <div className="rp-left-inner">
            <Link to="/" className="rp-logo">
              <img
                src={edulinkLogo}
                alt="EduLink"
                className="rp-logo-img"
              />
            </Link>

            <div className="rp-hero">
              <div className="rp-eyebrow">
                <span className="rp-eyebrow-dot" />
                Secure recovery
              </div>

              <h1 className="rp-title">
                Create a stronger password with <span>confidence.</span>
              </h1>

              <p className="rp-sub">
                Reset your credentials securely and regain access to your
                placements, approvals, digital logbooks, and career records.
              </p>

              <div className="rp-features">
                {features.map((feature) => (
                  <div className="rp-feature" key={feature.title}>
                    <div className="rp-feature-icon">
                      {feature.icon}
                    </div>

                    <div>
                      <div className="rp-feature-title">
                        {feature.title}
                      </div>

                      <div className="rp-feature-desc">
                        {feature.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </aside>

        <main className="rp-right">
          <div className="rp-right-inner">
            <div className="rp-topbar">
              <Link to="/login" className="rp-top-link">
                <ArrowLeft size={13} />
                Back to sign in
              </Link>
            </div>

            <section className="rp-card">
              {isSuccess ? (
                <div className="rp-success">
                  <div className="rp-success-icon">
                    <CheckCircle size={32} />
                  </div>

                  <h1 className="rp-success-title">
                    Password updated
                  </h1>

                  <p className="rp-success-desc">
                    Your password has been successfully reset.
                    You can now sign in using your new credentials.
                  </p>

                  <Link
                    to="/login"
                    className="rp-submit"
                    style={{ textDecoration: 'none' }}
                  >
                    Return to sign in
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="rp-main-icon">
                    <Lock size={24} />
                  </div>

                  <div className="rp-step">
                    <Sparkles size={11} />
                    Password recovery
                  </div>

                  <h1 className="rp-heading">
                    Set a new password
                  </h1>

                  <p className="rp-helper">
                    Create a strong password to secure your EduLink
                    workspace and restore access safely.
                  </p>

                  <form
                    className="rp-form"
                    onSubmit={handleSubmit}
                    noValidate
                  >
                    <div className="rp-field">
                      <label className="rp-label">
                        New password
                      </label>

                      <div className="rp-wrap">
                        <span className="rp-input-icon">
                          <Lock size={16} />
                        </span>

                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="rp-input"
                          placeholder="Minimum 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />

                        <button
                          type="button"
                          className="rp-eye"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword
                            ? <EyeOff size={16} />
                            : <Eye size={16} />
                          }
                        </button>
                      </div>
                    </div>

                    <div className="rp-field">
                      <label className="rp-label">
                        Confirm password
                      </label>

                      <div className="rp-wrap">
                        <span className="rp-input-icon">
                          <Lock size={16} />
                        </span>

                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="rp-input"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="rp-rules">
                      <div className={`rp-rule ${passwordRules.min ? 'pass' : ''}`}>
                        {passwordRules.min
                          ? <CheckCircle size={14} />
                          : <AlertCircle size={14} />
                        }
                        Minimum 8 characters
                      </div>

                      <div className={`rp-rule ${passwordRules.upper ? 'pass' : ''}`}>
                        {passwordRules.upper
                          ? <CheckCircle size={14} />
                          : <AlertCircle size={14} />
                        }
                        At least one uppercase letter
                      </div>

                      <div className={`rp-rule ${passwordRules.number ? 'pass' : ''}`}>
                        {passwordRules.number
                          ? <CheckCircle size={14} />
                          : <AlertCircle size={14} />
                        }
                        At least one number
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="rp-submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={17} className="rp-spinner" />
                          Updating password…
                        </>
                      ) : (
                        <>
                          Reset password
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default ResetPasswordPage;