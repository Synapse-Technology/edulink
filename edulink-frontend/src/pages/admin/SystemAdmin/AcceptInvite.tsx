import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Shield,
  User,
} from 'lucide-react';

import adminAuthService from '../../../services/auth/adminAuthService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const AcceptInvite: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
    }
  }, [token]);

  const passwordChecks = useMemo(() => {
    const password = formData.password;

    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      match:
        formData.confirmPassword.length > 0 &&
        password === formData.confirmPassword,
    };
  }, [formData.password, formData.confirmPassword]);

  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.');
      return false;
    }

    if (!passwordChecks.length) {
      setError('Password must be at least 8 characters long.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Missing invitation token.');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await adminAuthService.acceptInvite({
        token,
        password: formData.password,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      });

      setSuccess(true);

      setTimeout(() => {
        navigate('/admin/login');
      }, 3000);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setError(
        sanitized.userMessage ||
          'Failed to accept invitation. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="accept-page">
        <section className="accept-success-card">
          <div className="success-icon">
            <CheckCircle size={46} />
          </div>

          <span>Account activated</span>

          <h1>Admin account setup complete</h1>

          <p>
            Your platform staff account has been created successfully. You can
            now sign in through the system admin console.
          </p>

          <button
            type="button"
            className="accept-submit"
            onClick={() => navigate('/admin/login')}
          >
            Go to login
            <ArrowRight size={16} />
          </button>

          <small>Redirecting to login shortly...</small>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="accept-page">
      <section className="accept-shell">
        <aside className="accept-context">
          <div className="context-icon">
            <Shield size={30} />
          </div>

          <span>Secure staff activation</span>

          <h1>Complete your platform admin profile</h1>

          <p>
            This link provisions internal EduLink platform access. Use your real
            name and create a strong password before continuing.
          </p>

          <div className="context-list">
            <div>
              <Lock size={16} />
              <span>Invitation-token protected</span>
            </div>

            <div>
              <Shield size={16} />
              <span>Admin access audit trail</span>
            </div>

            <div>
              <CheckCircle size={16} />
              <span>Redirects to console login after setup</span>
            </div>
          </div>
        </aside>

        <section className="accept-card">
          <header className="accept-card-header">
            <span>Account setup</span>
            <h2>Activate invitation</h2>
            <p>Enter your identity details and secure your account.</p>
          </header>

          {error && (
            <div className="accept-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="accept-form">
            <div className="name-grid">
              <label className="accept-field">
                <span>First name</span>

                <div className="input-wrap">
                  <User size={16} />
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </label>

              <label className="accept-field">
                <span>Last name</span>

                <div className="input-wrap">
                  <User size={16} />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </label>
            </div>

            <label className="accept-field">
              <span>Create password</span>

              <div className="input-wrap">
                <Lock size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="accept-field">
              <span>Confirm password</span>

              <div className="input-wrap">
                <Lock size={16} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </label>

            <div className="password-panel">
              <div className="password-panel-top">
                <span>Password strength</span>
                <strong>
                  {passwordScore >= 4
                    ? 'Strong'
                    : passwordScore >= 2
                      ? 'Moderate'
                      : 'Weak'}
                </strong>
              </div>

              <div className="password-meter">
                <span style={{ width: `${(passwordScore / 5) * 100}%` }} />
              </div>

              <div className="password-checks">
                <span className={passwordChecks.length ? 'passed' : ''}>
                  8+ characters
                </span>
                <span className={passwordChecks.uppercase ? 'passed' : ''}>
                  Uppercase
                </span>
                <span className={passwordChecks.lowercase ? 'passed' : ''}>
                  Lowercase
                </span>
                <span className={passwordChecks.number ? 'passed' : ''}>
                  Number
                </span>
                <span className={passwordChecks.match ? 'passed' : ''}>
                  Passwords match
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="accept-submit"
              disabled={isLoading || !token}
            >
              {isLoading ? 'Activating account...' : 'Complete setup'}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>
        </section>
      </section>

      <style>{styles}</style>
    </main>
  );
};

const styles = `
  .accept-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(15,23,42,.08), transparent 28%),
      #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: #111827;
    font-family:
      Inter,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .accept-shell {
    width: min(1040px, 100%);
    display: grid;
    grid-template-columns: 1fr 460px;
    gap: 18px;
  }

  .accept-context,
  .accept-card,
  .accept-success-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    box-shadow: 0 24px 70px rgba(15,23,42,.08);
    border-radius: 26px;
  }

  .accept-context {
    padding: 34px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .context-icon {
    width: 62px;
    height: 62px;
    border-radius: 20px;
    background: #ecfdf5;
    color: #047857;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
  }

  .accept-context > span,
  .accept-card-header > span,
  .accept-success-card > span {
    color: #047857;
    font-size: .72rem;
    font-weight: 900;
    letter-spacing: .09em;
    text-transform: uppercase;
    margin-bottom: 8px;
    display: block;
  }

  .accept-context h1 {
    color: #0f172a;
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.02;
    font-weight: 900;
    letter-spacing: -.06em;
    margin: 0 0 14px;
  }

  .accept-context p,
  .accept-card-header p,
  .accept-success-card p {
    color: #64748b;
    line-height: 1.7;
    margin: 0;
  }

  .context-list {
    display: grid;
    gap: 10px;
    margin-top: 26px;
  }

  .context-list div {
    min-height: 44px;
    border-radius: 14px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    color: #334155;
    font-weight: 800;
    font-size: .86rem;
  }

  .context-list svg {
    color: #047857;
  }

  .accept-card {
    overflow: hidden;
  }

  .accept-card-header {
    padding: 24px;
    border-bottom: 1px solid #eef2f7;
  }

  .accept-card-header h2,
  .accept-success-card h1 {
    color: #0f172a;
    font-size: 1.45rem;
    font-weight: 900;
    letter-spacing: -.035em;
    margin: 0 0 6px;
  }

  .accept-error {
    margin: 18px 24px 0;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #991b1b;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-weight: 750;
  }

  .accept-error svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .accept-form {
    padding: 24px;
    display: grid;
    gap: 16px;
  }

  .name-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .accept-field {
    display: grid;
    gap: 7px;
  }

  .accept-field > span {
    color: #334155;
    font-size: .82rem;
    font-weight: 850;
  }

  .input-wrap {
    min-height: 46px;
    border: 1px solid #dbe3ea;
    border-radius: 14px;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
    color: #94a3b8;
  }

  .input-wrap input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    color: #111827;
    font-weight: 650;
    background: transparent;
  }

  .input-wrap button {
    border: 0;
    background: transparent;
    color: #64748b;
    display: flex;
    cursor: pointer;
    padding: 0;
  }

  .password-panel {
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    border-radius: 16px;
    padding: 14px;
  }

  .password-panel-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .password-panel-top span {
    color: #64748b;
    font-size: .78rem;
    font-weight: 850;
  }

  .password-panel-top strong {
    color: #0f172a;
    font-size: .8rem;
    font-weight: 900;
  }

  .password-meter {
    height: 8px;
    border-radius: 999px;
    background: #e5e7eb;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .password-meter span {
    display: block;
    height: 100%;
    background: #047857;
    border-radius: inherit;
    transition: width .2s ease;
  }

  .password-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .password-checks span {
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #94a3b8;
    border-radius: 999px;
    padding: 6px 8px;
    font-size: .72rem;
    font-weight: 850;
  }

  .password-checks span.passed {
    background: #ecfdf5;
    border-color: #bbf7d0;
    color: #047857;
  }

  .accept-submit {
    min-height: 48px;
    border: 0;
    border-radius: 14px;
    background: #0f172a;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 900;
    cursor: pointer;
  }

  .accept-submit:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .accept-success-card {
    width: min(560px, 100%);
    padding: 34px;
    text-align: center;
  }

  .success-icon {
    width: 82px;
    height: 82px;
    border-radius: 26px;
    background: #ecfdf5;
    color: #047857;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18px;
  }

  .accept-success-card p {
    margin-bottom: 22px;
  }

  .accept-success-card small {
    display: block;
    color: #94a3b8;
    margin-top: 14px;
  }

  @media (max-width: 920px) {
    .accept-shell {
      grid-template-columns: 1fr;
    }

    .accept-context {
      display: none;
    }
  }

  @media (max-width: 560px) {
    .accept-page {
      padding: 14px;
      align-items: flex-start;
    }

    .name-grid {
      grid-template-columns: 1fr;
    }

    .accept-card-header,
    .accept-form {
      padding: 18px;
    }

    .accept-error {
      margin: 14px 18px 0;
    }
  }
`;

export default AcceptInvite;