import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldAlert,
} from 'lucide-react';

import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { getLoginErrorMessage } from '../../../utils/loginErrorMessage';
import DemoCredentialsPanel, {
  type DemoCredential,
} from '../../../components/auth/DemoCredentialsPanel';

interface LoginFormData {
  email: string;
  password: string;
}

const css = `
*, *::before, *::after {
  box-sizing: border-box;
}

:root {
  --bg: #f3f4f6;
  --surface: #ffffff;
  --surface-muted: #f9fafb;
  --border: #d1d5db;
  --border-strong: #9ca3af;
  --text: #111827;
  --muted: #6b7280;
  --faint: #9ca3af;
  --primary: #111827;
  --primary-hover: #0f172a;
  --danger: #b91c1c;
  --danger-bg: #fef2f2;
  --danger-border: #fecaca;
}

.admin-login-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(17,24,39,.04), transparent 22%),
    #f3f4f6;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.admin-login-shell {
  width: 100%;
  max-width: 430px;
}

.admin-header {
  margin-bottom: 18px;
}

.admin-system-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.admin-title {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 8px;
  letter-spacing: -0.045em;
  color: #0f172a;
}

.admin-subtitle {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.admin-card {
  background: var(--surface);
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 18px 42px rgba(17, 24, 39, .06);
}

.admin-card-top {
  padding: 16px 18px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-card-title {
  font-size: 14px;
  font-weight: 750;
  margin: 0;
  color: #111827;
}

.admin-card-meta {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  margin-top: 2px;
}

.admin-card-body {
  padding: 18px;
}

.admin-error {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  color: var(--danger);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 14px;
}

.admin-demo {
  margin-bottom: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #f9fafb;
}

.admin-demo summary {
  cursor: pointer;
  list-style: none;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 750;
  color: var(--text);
}

.admin-demo summary::-webkit-details-marker {
  display: none;
}

.admin-demo-body {
  padding: 0 12px 12px;
}

.admin-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.admin-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-label {
  font-size: 12px;
  font-weight: 750;
  color: #111827;
}

.admin-input-wrap {
  position: relative;
}

.admin-input-icon {
  position: absolute;
  top: 50%;
  left: 11px;
  transform: translateY(-50%);
  color: var(--faint);
  display: flex;
  pointer-events: none;
}

.admin-input {
  width: 100%;
  height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  padding: 0 42px 0 40px;
  font-size: 14px;
  outline: none;
  transition:
    border-color .16s ease,
    box-shadow .16s ease;
}

.admin-input:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 3px rgba(156,163,175,.16);
}

.admin-input::placeholder {
  color: var(--faint);
}

.admin-eye {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  padding: 3px;
}

.admin-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.admin-check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}

.admin-check input {
  accent-color: var(--primary);
}

.admin-link {
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.admin-link:hover {
  text-decoration: underline;
}

.admin-submit {
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    background .16s ease,
    transform .12s ease;
}

.admin-submit:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.admin-submit:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.admin-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255,255,255,.35);
  border-top-color: #fff;
  border-radius: 999px;
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.admin-notice {
  margin-top: 14px;
  padding: 11px 12px;
  border-radius: 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  display: flex;
  gap: 9px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.55;
}

.admin-footer {
  margin-top: 14px;
  color: var(--muted);
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.admin-footer a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 650;
}

.admin-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 520px) {
  .admin-login-page {
    padding: 16px;
    align-items: flex-start;
  }

  .admin-login-shell {
    margin-top: 32px;
  }

  .admin-row,
  .admin-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;

const SystemAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const demoCredentials: DemoCredential[] = [
    {
      label: 'System admin',
      email: 'demo.admin@edulink.test',
      password: 'DemoPass12345!',
      description:
        'Inspect platform health, support, contact, user, and audit flows.',
    },
  ];

  const useDemoCredential = (credential: DemoCredential) => {
    setFormData({
      email: credential.email,
      password: credential.password,
    });

    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');

    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail || !formData.password) {
      setError('Email and password are required.');
      return;
    }

    /**
     * FIXED:
     * Previous regex was over-escaped:
     * /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
     *
     * That incorrectly rejected valid emails.
     */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setError('Enter a valid admin email address.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      await login(trimmedEmail, formData.password);

      navigate('/dashboard/admin');
    } catch (error) {
      setError(
        getLoginErrorMessage(error, {
          portal: 'admin',
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <main className="admin-login-page">
        <section
          className="admin-login-shell"
          aria-label="System admin login"
        >
          <header className="admin-header">
            <div className="admin-system-label">
              <ShieldAlert size={14} />
              Platform administration
            </div>

            <h1 className="admin-title">
              System Admin Login
            </h1>

            <p className="admin-subtitle">
              Authenticate to access platform operations,
              moderation, support, audit, and administrative controls.
            </p>
          </header>

          <div className="admin-card">
            <div className="admin-card-top">
              <div>
                <p className="admin-card-title">
                  Authentication required
                </p>

                <p className="admin-card-meta">
                  Admin console access
                </p>
              </div>

              <Lock size={20} color="#6b7280" />
            </div>

            <div className="admin-card-body">
              {error && (
                <div className="admin-error" role="alert">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <details className="admin-demo">
                <summary>Demo access</summary>

                <div className="admin-demo-body">
                  <DemoCredentialsPanel
                    credentials={demoCredentials}
                    onUse={useDemoCredential}
                    compact
                  />
                </div>
              </details>

              <form
                onSubmit={handleSubmit}
                className="admin-form"
                noValidate
              >
                <div className="admin-field">
                  <label
                    htmlFor="email"
                    className="admin-label"
                  >
                    Admin email
                  </label>

                  <div className="admin-input-wrap">
                    <span className="admin-input-icon">
                      <Mail size={15} />
                    </span>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="admin-input"
                      placeholder="admin@edulink.internal"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label
                    htmlFor="password"
                    className="admin-label"
                  >
                    Password
                  </label>

                  <div className="admin-input-wrap">
                    <span className="admin-input-icon">
                      <Lock size={15} />
                    </span>

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="admin-input"
                      placeholder="Enter password"
                      disabled={isLoading}
                    />

                    <button
                      type="button"
                      className="admin-eye"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      disabled={isLoading}
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="admin-row">
                  <label className="admin-check">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) =>
                        setRememberMe(e.target.checked)
                      }
                      disabled={isLoading}
                    />

                    Keep me signed in
                  </label>

                  <a
                    href="/admin/forgot-password"
                    className="admin-link"
                  >
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !formData.email ||
                    !formData.password
                  }
                  className="admin-submit"
                >
                  {isLoading ? (
                    <>
                      <span className="admin-spinner" />
                      Authenticating
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      Sign in to console
                    </>
                  )}
                </button>
              </form>

              <div className="admin-notice">
                <ShieldAlert size={15} />

                <span>
                  Authorized system administrators only.
                  Sign-in attempts and console activity
                  may be logged for audit and security review.
                </span>
              </div>
            </div>
          </div>

          <footer className="admin-footer">
            <a href="/">
              Return to main site
            </a>

            <span>
              EduLink Platform Console
            </span>
          </footer>
        </section>
      </main>
    </>
  );
};

export default SystemAdminLogin;