import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Lock,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import { employerService } from '../../../services/employer/employerService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const ActivateAdmin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [email, setEmail] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [isPreFilled, setIsPreFilled] = useState(false);
  const [isPhonePreFilled, setIsPhonePreFilled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inviteId = searchParams.get('id');
  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      if (!inviteId || !token) {
        setError('Invalid activation link. Missing parameters.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await employerService.validateInviteToken(inviteId, token);

        if (response.valid) {
          setEmail(response.email);
          setEmployerName(response.employer_name);

          if (response.role === 'ADMIN') {
            if (response.contact_person) {
              const names = response.contact_person.trim().split(' ');
              const firstName = names[0] || '';
              const lastName = names.slice(1).join(' ') || '';

              setFormData((prev) => ({
                ...prev,
                firstName,
                lastName,
              }));

              setIsPreFilled(true);
            }

            if (response.phone_number) {
              setFormData((prev) => ({
                ...prev,
                phoneNumber: response.phone_number || '',
              }));

              setIsPhonePreFilled(true);
            }
          }
        } else {
          setError('Invalid or expired activation link.');
        }
      } catch (err: any) {
        const sanitized = sanitizeAdminError(err);
        setError(sanitized.message || sanitized.userMessage || 'Failed to verify invitation.');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [inviteId, token]);

  const passwordChecks = useMemo(() => {
    const password = formData.password;

    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      match:
        formData.confirmPassword.length > 0 &&
        formData.password === formData.confirmPassword,
    };
  }, [formData.password, formData.confirmPassword]);

  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }

    if (error) setError('');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required.';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (!passwordChecks.length) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setFormErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;
    if (!inviteId || !token) return;

    setIsSubmitting(true);

    try {
      await employerService.activateAccount({
        invite_id: inviteId,
        token,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone_number: formData.phoneNumber.trim(),
        password: formData.password,
      });

      navigate('/employer/login', {
        state: {
          message: 'Account activated successfully. Please log in with your credentials.',
        },
      });
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.message || sanitized.userMessage || 'Failed to activate account.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="activate-page">
        <section className="activation-loading">
          <div className="loading-icon">
            <ShieldCheck size={34} />
          </div>

          <span>Verifying invitation</span>
          <h1>Checking employer access link</h1>
          <p>Please wait while EduLink verifies this secure activation request.</p>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="activate-page">
        <section className="activation-error-card">
          <div className="error-icon">
            <AlertTriangle size={38} />
          </div>

          <span>Activation failed</span>
          <h1>Unable to verify this invitation</h1>
          <p>{error}</p>

          <button type="button" onClick={() => navigate('/')} className="activate-submit">
            Return to EduLink
            <ArrowRight size={16} />
          </button>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="activate-page">
      <section className="activate-shell">
        <aside className="activate-context">
          <div className="brand-mark">
            <ShieldCheck size={30} />
          </div>

          <span className="context-kicker">EduLink employer access</span>

          <h1>Activate verified employer workspace</h1>

          <p>
            Complete your account setup to manage internship opportunities,
            supervisors, student placements, and verified attachment workflows.
          </p>

          <div className="trust-list">
            <div>
              <ShieldCheck size={16} />
              <span>Verified employer onboarding</span>
            </div>

            <div>
              <Users size={16} />
              <span>Manage supervisors and student placements</span>
            </div>

            <div>
              <BriefcaseBusiness size={16} />
              <span>Publish and track internship opportunities</span>
            </div>
          </div>

          <div className="context-footer">
            <strong>{employerName}</strong>
            <span>{email}</span>
          </div>
        </aside>

        <section className="activate-card">
          <header className="activate-card-header">
            <div className="card-icon">
              <BriefcaseBusiness size={24} />
            </div>

            <span>Secure account activation</span>
            <h2>Complete your employer admin profile</h2>
            <p>
              This account will be linked to <strong>{employerName}</strong>.
            </p>
          </header>

          {error && (
            <div className="form-alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="employer-strip">
            <div>
              <span>Organization</span>
              <strong>{employerName}</strong>
            </div>

            <div>
              <span>Admin email</span>
              <strong>{email}</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="activate-form">
            <div className="name-grid">
              <label className="field">
                <span>First name</span>

                <div className={`input-wrap ${formErrors.firstName ? 'invalid' : ''}`}>
                  <User size={16} />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                    readOnly={isPreFilled}
                  />
                </div>

                {formErrors.firstName && <small>{formErrors.firstName}</small>}
              </label>

              <label className="field">
                <span>Last name</span>

                <div className={`input-wrap ${formErrors.lastName ? 'invalid' : ''}`}>
                  <User size={16} />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    readOnly={isPreFilled}
                  />
                </div>

                {formErrors.lastName && <small>{formErrors.lastName}</small>}
              </label>
            </div>

            <label className="field">
              <span>Phone number</span>

              <div className="input-wrap">
                <Phone size={16} />
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                  readOnly={isPhonePreFilled}
                />
              </div>
            </label>

            <label className="field">
              <span>Create password</span>

              <div className={`input-wrap ${formErrors.password ? 'invalid' : ''}`}>
                <Lock size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minimum 8 characters"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {formErrors.password && <small>{formErrors.password}</small>}
            </label>

            <label className="field">
              <span>Confirm password</span>

              <div className={`input-wrap ${formErrors.confirmPassword ? 'invalid' : ''}`}>
                <Lock size={16} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter password"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {formErrors.confirmPassword && (
                <small>{formErrors.confirmPassword}</small>
              )}
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
                  Match
                </span>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="activate-submit">
              {isSubmitting ? 'Activating account...' : 'Activate employer account'}
              {!isSubmitting && <ArrowRight size={16} />}
            </button>

            <p className="terms-copy">
              By activating, you agree to EduLink’s{' '}
              <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </form>
        </section>
      </section>

      <style>{styles}</style>
    </main>
  );
};

const styles = `
  .activate-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(4, 120, 87, .09), transparent 28%),
      radial-gradient(circle at bottom left, rgba(15, 23, 42, .08), transparent 26%),
      #f8fafc;
    color: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
    font-family:
      Inter,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .activate-shell {
    width: min(1120px, 100%);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 500px;
    gap: 18px;
  }

  .activate-context,
  .activate-card,
  .activation-loading,
  .activation-error-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    box-shadow: 0 24px 70px rgba(15, 23, 42, .08);
    border-radius: 28px;
  }

  .activate-context {
    padding: 38px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 680px;
  }

  .brand-mark,
  .card-icon,
  .loading-icon,
  .error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-mark {
    width: 68px;
    height: 68px;
    border-radius: 22px;
    background: #ecfdf5;
    color: #047857;
    margin-bottom: 24px;
  }

  .context-kicker,
  .activate-card-header > span,
  .activation-loading > span,
  .activation-error-card > span {
    display: block;
    color: #047857;
    font-size: .72rem;
    font-weight: 900;
    letter-spacing: .09em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .activate-context h1 {
    color: #0f172a;
    font-size: clamp(2.25rem, 4vw, 3.45rem);
    line-height: .98;
    font-weight: 950;
    letter-spacing: -.07em;
    margin: 0 0 16px;
    max-width: 580px;
  }

  .activate-context p,
  .activate-card-header p,
  .activation-loading p,
  .activation-error-card p {
    color: #64748b;
    line-height: 1.75;
    margin: 0;
    max-width: 620px;
  }

  .trust-list {
    display: grid;
    gap: 12px;
    margin-top: 30px;
  }

  .trust-list div {
    min-height: 48px;
    border-radius: 16px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 14px;
    color: #334155;
    font-size: .9rem;
    font-weight: 800;
  }

  .trust-list svg {
    color: #047857;
  }

  .context-footer {
    margin-top: 34px;
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
  }

  .context-footer strong {
    display: block;
    color: #0f172a;
    font-weight: 900;
    margin-bottom: 4px;
  }

  .context-footer span {
    color: #64748b;
    font-size: .86rem;
  }

  .activate-card {
    overflow: hidden;
  }

  .activate-card-header {
    padding: 26px 28px 20px;
    border-bottom: 1px solid #eef2f7;
  }

  .card-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: #0f172a;
    color: #ffffff;
    margin-bottom: 18px;
  }

  .activate-card-header h2 {
    color: #0f172a;
    font-size: 1.45rem;
    font-weight: 950;
    letter-spacing: -.04em;
    margin: 0 0 8px;
  }

  .activate-card-header strong {
    color: #047857;
  }

  .form-alert {
    margin: 18px 28px 0;
    border-radius: 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: .88rem;
    font-weight: 750;
  }

  .employer-strip {
    margin: 20px 28px 0;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: hidden;
  }

  .employer-strip div {
    padding: 14px;
  }

  .employer-strip div + div {
    border-left: 1px solid #e5e7eb;
  }

  .employer-strip span {
    display: block;
    color: #64748b;
    font-size: .7rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .07em;
    margin-bottom: 5px;
  }

  .employer-strip strong {
    color: #0f172a;
    font-size: .86rem;
    font-weight: 900;
    word-break: break-word;
  }

  .activate-form {
    padding: 24px 28px 28px;
    display: grid;
    gap: 15px;
  }

  .name-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .field {
    display: grid;
    gap: 7px;
  }

  .field > span {
    color: #334155;
    font-size: .82rem;
    font-weight: 850;
  }

  .field small {
    color: #b91c1c;
    font-size: .76rem;
    font-weight: 750;
  }

  .input-wrap {
    min-height: 46px;
    border: 1px solid #dbe3ea;
    background: #ffffff;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
    color: #94a3b8;
  }

  .input-wrap:focus-within {
    border-color: #047857;
    box-shadow: 0 0 0 4px rgba(4, 120, 87, .08);
  }

  .input-wrap.invalid {
    border-color: #ef4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, .08);
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

  .input-wrap input[readonly] {
    color: #64748b;
    cursor: default;
  }

  .input-wrap button {
    border: 0;
    background: transparent;
    color: #64748b;
    padding: 0;
    display: flex;
    cursor: pointer;
  }

  .password-panel {
    border-radius: 16px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
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
    height: 100%;
    display: block;
    border-radius: inherit;
    background: #047857;
    transition: width .2s ease;
  }

  .password-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .password-checks span {
    border-radius: 999px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    color: #94a3b8;
    padding: 6px 8px;
    font-size: .7rem;
    font-weight: 850;
  }

  .password-checks span.passed {
    background: #ecfdf5;
    border-color: #bbf7d0;
    color: #047857;
  }

  .activate-submit {
    min-height: 50px;
    border: 0;
    border-radius: 15px;
    background: #0f172a;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 950;
    cursor: pointer;
    margin-top: 2px;
  }

  .activate-submit:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .terms-copy {
    color: #64748b;
    text-align: center;
    font-size: .78rem;
    line-height: 1.6;
    margin: 0;
  }

  .terms-copy a {
    color: #047857;
    font-weight: 850;
    text-decoration: none;
  }

  .activation-loading,
  .activation-error-card {
    width: min(560px, 100%);
    padding: 38px;
    text-align: center;
  }

  .loading-icon,
  .error-icon {
    width: 82px;
    height: 82px;
    border-radius: 26px;
    margin: 0 auto 20px;
  }

  .loading-icon {
    background: #ecfdf5;
    color: #047857;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .error-icon {
    background: #fef2f2;
    color: #b91c1c;
  }

  .activation-loading h1,
  .activation-error-card h1 {
    color: #0f172a;
    font-size: 1.8rem;
    font-weight: 950;
    letter-spacing: -.04em;
    margin: 0 0 10px;
  }

  .activation-error-card .activate-submit {
    width: 100%;
    margin-top: 22px;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }

    50% {
      transform: scale(.96);
      opacity: .78;
    }
  }

  @media (max-width: 980px) {
    .activate-shell {
      grid-template-columns: 1fr;
    }

    .activate-context {
      min-height: auto;
      padding: 30px;
    }
  }

  @media (max-width: 620px) {
    .activate-page {
      padding: 14px;
      align-items: flex-start;
    }

    .activate-context {
      display: none;
    }

    .activate-card {
      border-radius: 22px;
    }

    .activate-card-header,
    .activate-form {
      padding-left: 20px;
      padding-right: 20px;
    }

    .employer-strip {
      margin-left: 20px;
      margin-right: 20px;
      grid-template-columns: 1fr;
    }

    .employer-strip div + div {
      border-left: 0;
      border-top: 1px solid #e5e7eb;
    }

    .name-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default ActivateAdmin;