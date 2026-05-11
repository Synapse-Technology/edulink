import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Lock,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import { institutionService } from '../../../services';
import FullPageFormSkeleton from '../../../components/admin/skeletons/FullPageFormSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const InstitutionActivate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isSupervisor = location.pathname.includes('/staff/activate');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [institutionName, setInstitutionName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inviteId = searchParams.get('id');
  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      if (!inviteId || !token) {
        setError('Invalid activation link.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await institutionService.validateInviteToken(
          inviteId,
          token,
        );

        if (response.valid) {
          setEmail(response.email);
          setInstitutionName(response.institution_name);

          if (response.website_url) {
            setWebsiteUrl(response.website_url);
          }

          if (response.role === 'INSTITUTION_ADMIN') {
            if (response.representative_name) {
              const names =
                response.representative_name.trim().split(' ');

              setFormData((prev) => ({
                ...prev,
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
              }));
            }

            if (response.contact_phone) {
              setFormData((prev) => ({
                ...prev,
                phone: response.contact_phone || '',
              }));
            }
          }
        } else {
          setError('Invalid or expired activation link.');
        }
      } catch (err: any) {
        const sanitized = sanitizeAdminError(err);
        setError(
          sanitized.message ||
            sanitized.userMessage ||
            'Unable to verify invitation.',
        );
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

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      if (isSupervisor) {
        await institutionService.activateSupervisorAccount({
          invite_id: inviteId,
          token,
          first_name: formData.firstName,
          last_name: formData.lastName,
          password: formData.password,
          phone_number: formData.phone,
        });
      } else {
        await institutionService.activateAccount({
          invite_id: inviteId,
          token,
          first_name: formData.firstName,
          last_name: formData.lastName,
          password: formData.password,
          phone_number: formData.phone,
        });
      }

      navigate('/institution/login', {
        state: {
          message:
            'Account activated successfully. Please sign in.',
        },
      });
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      setError(
        sanitized.message ||
          sanitized.userMessage ||
          'Failed to activate account.',
      );

      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FullPageFormSkeleton />;
  }

  if (error) {
    return (
      <main className="institution-activate-page">
        <section className="activation-error-card">
          <div className="error-icon">
            <AlertTriangle size={36} />
          </div>

          <span>Activation failed</span>

          <h1>Unable to verify invitation</h1>

          <p>{error}</p>

          <button
            type="button"
            className="activate-submit"
            onClick={() => navigate('/')}
          >
            Return to homepage
            <ArrowRight size={15} />
          </button>
        </section>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="institution-activate-page">
      <section className="institution-shell">
        <aside className="institution-context">
          <div className="context-icon">
            <GraduationCap size={30} />
          </div>

          <span className="context-kicker">
            Institution onboarding
          </span>

          <h1>
            Activate verified institutional access
          </h1>

          <p>
            Complete your EduLink institution account setup to
            manage attachment workflows, assessments,
            placements, and verified student records.
          </p>

          <div className="context-points">
            <div>
              <ShieldCheck size={16} />
              <span>Verified institution administration</span>
            </div>

            <div>
              <Users size={16} />
              <span>Staff and assessor management</span>
            </div>

            <div>
              <GraduationCap size={16} />
              <span>Attachment and internship oversight</span>
            </div>
          </div>

          <div className="institution-summary">
            <div>
              <span>Institution</span>
              <strong>{institutionName}</strong>
            </div>

            <div>
              <span>Official email</span>
              <strong>{email}</strong>
            </div>

            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe size={14} />
                Visit institution website
              </a>
            )}
          </div>
        </aside>

        <section className="institution-card">
          <header className="institution-card-header">
            <div className="header-icon">
              <Building2 size={24} />
            </div>

            <span>
              {isSupervisor
                ? 'Staff activation'
                : 'Institution activation'}
            </span>

            <h2>
              Complete your profile setup
            </h2>

            <p>
              This account will be linked to{' '}
              <strong>{institutionName}</strong>.
            </p>
          </header>

          {error && (
            <div className="form-alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="activate-form">
            <div className="name-grid">
              <label className="field">
                <span>First name</span>

                <div
                  className={`input-wrap ${
                    formErrors.firstName ? 'invalid' : ''
                  }`}
                >
                  <User size={16} />

                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                  />
                </div>

                {formErrors.firstName && (
                  <small>{formErrors.firstName}</small>
                )}
              </label>

              <label className="field">
                <span>Last name</span>

                <div
                  className={`input-wrap ${
                    formErrors.lastName ? 'invalid' : ''
                  }`}
                >
                  <User size={16} />

                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                  />
                </div>

                {formErrors.lastName && (
                  <small>{formErrors.lastName}</small>
                )}
              </label>
            </div>

            <label className="field">
              <span>Phone number</span>

              <div className="input-wrap">
                <Phone size={16} />

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                />
              </div>
            </label>

            <label className="field">
              <span>Create password</span>

              <div
                className={`input-wrap ${
                  formErrors.password ? 'invalid' : ''
                }`}
              >
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
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>

              {formErrors.password && (
                <small>{formErrors.password}</small>
              )}
            </label>

            <label className="field">
              <span>Confirm password</span>

              <div
                className={`input-wrap ${
                  formErrors.confirmPassword
                    ? 'invalid'
                    : ''
                }`}
              >
                <Lock size={16} />

                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (prev) => !prev,
                    )
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>

              {formErrors.confirmPassword && (
                <small>
                  {formErrors.confirmPassword}
                </small>
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
                <span
                  style={{
                    width: `${(passwordScore / 5) * 100}%`,
                  }}
                />
              </div>

              <div className="password-checks">
                <span
                  className={
                    passwordChecks.length ? 'passed' : ''
                  }
                >
                  8+ characters
                </span>

                <span
                  className={
                    passwordChecks.uppercase
                      ? 'passed'
                      : ''
                  }
                >
                  Uppercase
                </span>

                <span
                  className={
                    passwordChecks.lowercase
                      ? 'passed'
                      : ''
                  }
                >
                  Lowercase
                </span>

                <span
                  className={
                    passwordChecks.number
                      ? 'passed'
                      : ''
                  }
                >
                  Number
                </span>

                <span
                  className={
                    passwordChecks.match ? 'passed' : ''
                  }
                >
                  Match
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="activate-submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Activating account...'
                : 'Activate institution account'}

              {!isSubmitting && <ArrowRight size={15} />}
            </button>

            <p className="terms-copy">
              By activating, you agree to EduLink’s{' '}
              <Link to="/terms">Terms</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </form>
        </section>
      </section>

      <style>{styles}</style>
    </main>
  );
};

const styles = `
  .institution-activate-page {
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

  .institution-shell {
    width: min(1140px, 100%);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 520px;
    gap: 18px;
  }

  .institution-context,
  .institution-card,
  .activation-error-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 28px;
    box-shadow: 0 24px 70px rgba(15,23,42,.06);
  }

  .institution-context {
    padding: 40px;
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

  .context-kicker,
  .institution-card-header > span,
  .activation-error-card > span {
    display: block;
    color: #047857;
    font-size: .72rem;
    font-weight: 900;
    letter-spacing: .09em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .institution-context h1 {
    color: #0f172a;
    font-size: clamp(2.2rem, 4vw, 3.35rem);
    line-height: 1;
    font-weight: 950;
    letter-spacing: -.07em;
    margin: 0 0 16px;
  }

  .institution-context p,
  .institution-card-header p,
  .activation-error-card p {
    color: #64748b;
    line-height: 1.75;
    margin: 0;
  }

  .context-points {
    display: grid;
    gap: 12px;
    margin-top: 30px;
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

  .institution-summary {
    margin-top: 34px;
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
    display: grid;
    gap: 14px;
  }

  .institution-summary span {
    display: block;
    color: #64748b;
    font-size: .72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .08em;
    margin-bottom: 5px;
  }

  .institution-summary strong {
    color: #0f172a;
    font-size: .92rem;
    font-weight: 900;
  }

  .institution-summary a {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
    color: #047857;
    font-size: .84rem;
    font-weight: 850;
  }

  .institution-card {
    overflow: hidden;
  }

  .institution-card-header {
    padding: 26px 28px 20px;
    border-bottom: 1px solid #eef2f7;
  }

  .header-icon {
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

  .institution-card-header h2,
  .activation-error-card h1 {
    color: #0f172a;
    font-size: 1.45rem;
    font-weight: 950;
    letter-spacing: -.04em;
    margin: 0 0 8px;
  }

  .institution-card-header strong {
    color: #047857;
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
    border-radius: 14px;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
    color: #94a3b8;
  }

  .input-wrap:focus-within {
    border-color: #047857;
    box-shadow: 0 0 0 4px rgba(4,120,87,.08);
  }

  .input-wrap.invalid {
    border-color: #ef4444;
    box-shadow: 0 0 0 4px rgba(239,68,68,.08);
  }

  .input-wrap input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: #111827;
    font-weight: 650;
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
    border: 1px solid #e5e7eb;
    background: #ffffff;
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

  .activation-error-card {
    width: min(560px, 100%);
    padding: 38px;
    text-align: center;
  }

  .error-icon {
    width: 82px;
    height: 82px;
    border-radius: 26px;
    background: #fef2f2;
    color: #b91c1c;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }

  @media (max-width: 980px) {
    .institution-shell {
      grid-template-columns: 1fr;
    }

    .institution-context {
      display: none;
    }
  }

  @media (max-width: 620px) {
    .institution-activate-page {
      padding: 14px;
      align-items: flex-start;
    }

    .institution-card {
      border-radius: 22px;
    }

    .institution-card-header,
    .activate-form {
      padding-left: 18px;
      padding-right: 18px;
    }

    .name-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default InstitutionActivate;