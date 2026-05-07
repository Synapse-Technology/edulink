import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { EmployerLayout } from '../../../components/admin/employer';
import { authService } from '../../../services/auth/authService';
import { FeedbackModal } from '../../../components/common';
import { SEO } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const STYLES = `
  .eset-page { color: var(--el-ink); }

  .eset-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    margin-bottom: 22px;
  }

  .eset-command-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    padding: 28px;
    box-shadow: var(--el-shadow);
  }

  .eset-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .eset-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .eset-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .eset-sub {
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
    max-width: 700px;
  }

  .eset-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
  }

  .eset-health-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .eset-health-label,
  .eset-card-label,
  .eset-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .eset-health-score {
    font-size: 3rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .eset-health-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    background: var(--el-accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 28px rgba(26,92,255,0.25);
  }

  .eset-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .eset-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: start;
  }

  .eset-main,
  .eset-side {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  .eset-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .eset-card.danger {
    border-color: rgba(239,68,68,0.2);
    background:
      radial-gradient(circle at top right, rgba(239,68,68,0.08), transparent 36%),
      var(--el-surface);
  }

  .eset-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .eset-card-icon {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .eset-card-icon.danger {
    background: rgba(239,68,68,0.1);
    color: #dc2626;
  }

  .eset-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    margin: 0;
    color: var(--el-ink);
  }

  .eset-card-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .eset-card-body {
    padding: 22px;
  }

  .eset-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .eset-form-group {
    min-width: 0;
  }

  .eset-input-wrap {
    display: flex;
    align-items: center;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    border-radius: 16px;
    height: 46px;
    overflow: hidden;
  }

  .eset-input-wrap.error {
    border-color: rgba(239,68,68,0.35);
  }

  .eset-input {
    flex: 1;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--el-ink);
    padding: 0 14px;
    font-size: 13px;
    font-weight: 700;
  }

  .eset-eye-btn {
    width: 46px;
    height: 46px;
    border: 0;
    border-left: 1px solid var(--el-border);
    background: transparent;
    color: var(--el-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .eset-error {
    color: #dc2626;
    font-size: 12px;
    font-weight: 700;
    margin-top: 6px;
  }

  .eset-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }

  .eset-primary-btn,
  .eset-danger-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 14px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid transparent;
    transition: transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .eset-primary-btn {
    background: var(--el-accent);
    color: white;
    border-color: var(--el-accent);
    box-shadow: 0 10px 26px rgba(26,92,255,0.22);
  }

  .eset-primary-btn:hover:not(:disabled),
  .eset-danger-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .eset-danger-btn {
    background: rgba(239,68,68,0.08);
    border-color: rgba(239,68,68,0.22);
    color: #dc2626;
  }

  .eset-danger-btn:hover:not(:disabled) {
    background: rgba(239,68,68,0.14);
  }

  .eset-primary-btn:disabled,
  .eset-danger-btn:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .eset-textarea {
    width: 100%;
    min-height: 104px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    border-radius: 16px;
    padding: 13px 14px;
    outline: 0;
    resize: vertical;
    font-size: 13px;
    line-height: 1.6;
  }

  .eset-warning-copy {
    color: var(--el-muted);
    font-size: 13px;
    line-height: 1.7;
    margin: 0 0 18px;
  }

  .eset-security-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    padding: 22px;
  }

  .eset-security-title {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--el-ink);
    font-size: 1rem;
    font-weight: 820;
    margin: 0 0 16px;
  }

  .eset-tip-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .eset-tip {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 9px;
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.55;
  }

  .eset-tip-icon {
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }

  .eset-alert {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border: 1px solid rgba(245,158,11,0.18);
    background: rgba(245,158,11,0.1);
    color: var(--el-muted);
    border-radius: 18px;
    padding: 14px;
    font-size: 12px;
    line-height: 1.6;
  }

  .eset-alert svg {
    color: #b45309;
    flex-shrink: 0;
    margin-top: 2px;
  }

  @media (max-width: 1180px) {
    .eset-hero,
    .eset-layout {
      grid-template-columns: 1fr;
    }

    .eset-health-card {
      max-width: 520px;
    }
  }

  @media (max-width: 760px) {
    .eset-command-card,
    .eset-health-card,
    .eset-card-header,
    .eset-card-body {
      padding-left: 18px;
      padding-right: 18px;
    }

    .eset-actions {
      justify-content: stretch;
    }

    .eset-primary-btn,
    .eset-danger-btn {
      width: 100%;
    }
  }
`;

const EmployerSettings: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  const navigate = useNavigate();
  const { feedbackProps, showError, showConfirm } = useFeedbackModal();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm();

  const securityScore = useMemo(() => {
    if (isChangingPassword || isDeactivating) return 72;
    return 86;
  }, [isChangingPassword, isDeactivating]);

  const onChangePassword = async (data: any) => {
    try {
      setIsChangingPassword(true);

      await authService.changePassword({
        old_password: data.currentPassword,
        new_password: data.newPassword,
        new_password_confirm: data.confirmPassword,
      });

      toast.success('Password changed successfully');
      resetPassword();
    } catch (error: any) {
      console.error('Failed to change password:', error);

      const sanitized = sanitizeAdminError(error);

      showError(sanitized.title, sanitized.message, sanitized.details);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onDeactivateAccount = async () => {
    showConfirm({
      title: 'Deactivate Account',
      message:
        'Are you sure you want to deactivate your account? This action cannot be undone immediately.',
      variant: 'error',
      confirmLabel: 'Deactivate',
      onConfirm: async () => {
        try {
          setIsDeactivating(true);

          await authService.deactivateAccount(deactivateReason);

          toast.success('Account deactivated successfully');
          authService.logout();
          navigate('/employer/login');
        } catch (error: any) {
          console.error('Failed to deactivate account:', error);

          const sanitized = sanitizeAdminError(error);

          showError(sanitized.title, sanitized.message, sanitized.details);
        } finally {
          setIsDeactivating(false);
        }
      },
    });
  };

  return (
    <EmployerLayout>
      <SEO
        title="Settings"
        description="Manage employer account security settings and password preferences on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="eset-page">
        <section className="eset-hero">
          <div className="eset-command-card">
            <div className="eset-kicker">
              <Sparkles size={13} />
              Account Security
            </div>

            <h1 className="eset-title">
              Security <span>Settings</span>
            </h1>

            <p className="eset-sub">
              Manage password protection and sensitive account actions. This area controls
              employer portal access, so changes should be made carefully.
            </p>
          </div>

          <aside className="eset-health-card">
            <div className="eset-health-top">
              <div>
                <div className="eset-health-label">Security posture</div>
                <div className="eset-health-score">{securityScore}%</div>
              </div>

              <div className="eset-health-icon">
                <Shield size={20} />
              </div>
            </div>

            <p className="eset-health-note">
              Estimated account security readiness based on password hygiene and sensitive
              account action state.
            </p>
          </aside>
        </section>

        <div className="eset-layout">
          <main className="eset-main">
            <section className="eset-card">
              <div className="eset-card-header">
                <div className="eset-card-icon">
                  <Lock size={20} />
                </div>

                <div>
                  <div className="eset-card-label">Password control</div>
                  <h2 className="eset-card-title">Change password</h2>
                  <p className="eset-card-sub">
                    Update your employer account password securely.
                  </p>
                </div>
              </div>

              <div className="eset-card-body">
                <form className="eset-form" onSubmit={handleSubmitPassword(onChangePassword)}>
                  <div className="eset-form-group">
                    <label className="eset-label">Current password</label>

                    <div
                      className={`eset-input-wrap ${
                        passwordErrors.currentPassword ? 'error' : ''
                      }`}
                    >
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        className="eset-input"
                        {...registerPassword('currentPassword', {
                          required: 'Current password is required',
                        })}
                      />

                      <button
                        className="eset-eye-btn"
                        type="button"
                        onClick={() => setShowCurrentPassword((value) => !value)}
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {passwordErrors.currentPassword && (
                      <div className="eset-error">
                        {passwordErrors.currentPassword.message as string}
                      </div>
                    )}
                  </div>

                  <div className="eset-form-group">
                    <label className="eset-label">New password</label>

                    <div
                      className={`eset-input-wrap ${
                        passwordErrors.newPassword ? 'error' : ''
                      }`}
                    >
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="eset-input"
                        {...registerPassword('newPassword', {
                          required: 'New password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                          },
                        })}
                      />

                      <button
                        className="eset-eye-btn"
                        type="button"
                        onClick={() => setShowNewPassword((value) => !value)}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {passwordErrors.newPassword && (
                      <div className="eset-error">
                        {passwordErrors.newPassword.message as string}
                      </div>
                    )}
                  </div>

                  <div className="eset-form-group">
                    <label className="eset-label">Confirm new password</label>

                    <div
                      className={`eset-input-wrap ${
                        passwordErrors.confirmPassword ? 'error' : ''
                      }`}
                    >
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="eset-input"
                        {...registerPassword('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: (value: string) => {
                            if (watch('newPassword') !== value) {
                              return 'Your passwords do not match';
                            }

                            return true;
                          },
                        })}
                      />

                      <button
                        className="eset-eye-btn"
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {passwordErrors.confirmPassword && (
                      <div className="eset-error">
                        {passwordErrors.confirmPassword.message as string}
                      </div>
                    )}
                  </div>

                  <div className="eset-actions">
                    <button
                      type="submit"
                      className="eset-primary-btn"
                      disabled={isChangingPassword}
                    >
                      <Save size={16} />
                      {isChangingPassword ? 'Updating password...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section className="eset-card danger">
              <div className="eset-card-header">
                <div className="eset-card-icon danger">
                  <ShieldAlert size={20} />
                </div>

                <div>
                  <div className="eset-card-label">Sensitive action</div>
                  <h2 className="eset-card-title">Deactivate account</h2>
                  <p className="eset-card-sub">
                    Disable your access to the employer portal.
                  </p>
                </div>
              </div>

              <div className="eset-card-body">
                <p className="eset-warning-copy">
                  Deactivating your account will disable platform access. Your data will be
                  preserved, but you will not be able to log in. If you are the only admin,
                  the employer profile may become inaccessible.
                </p>

                <div className="eset-form-group">
                  <label className="eset-label">Reason for leaving optional</label>

                  <textarea
                    className="eset-textarea"
                    value={deactivateReason}
                    onChange={(event) => setDeactivateReason(event.target.value)}
                    placeholder="Please tell us why you are leaving..."
                  />
                </div>

                <div className="eset-actions">
                  <button
                    type="button"
                    className="eset-danger-btn"
                    onClick={onDeactivateAccount}
                    disabled={isDeactivating}
                  >
                    {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
                  </button>
                </div>
              </div>
            </section>
          </main>

          <aside className="eset-side">
            <section className="eset-security-card">
              <h2 className="eset-security-title">
                <Shield size={18} />
                Security tips
              </h2>

              <ul className="eset-tip-list">
                <li className="eset-tip">
                  <span className="eset-tip-icon">
                    <CheckCircle2 size={12} />
                  </span>
                  <span>
                    Use a strong password with at least 8 characters, including numbers
                    and symbols.
                  </span>
                </li>

                <li className="eset-tip">
                  <span className="eset-tip-icon">
                    <CheckCircle2 size={12} />
                  </span>
                  <span>Do not share your password with anyone.</span>
                </li>

                <li className="eset-tip">
                  <span className="eset-tip-icon">
                    <CheckCircle2 size={12} />
                  </span>
                  <span>
                    Change your password immediately if you suspect unauthorized access.
                  </span>
                </li>

                <li className="eset-tip">
                  <span className="eset-tip-icon">
                    <CheckCircle2 size={12} />
                  </span>
                  <span>Contact support if you have trouble accessing your account.</span>
                </li>
              </ul>
            </section>

            <section className="eset-alert">
              <AlertCircle size={16} />
              <span>
                For stronger protection later, add two-factor authentication and admin
                recovery controls. Password-only security is not enough for employer
                accounts handling student placement records.
              </span>
            </section>
          </aside>
        </div>
      </div>

      <FeedbackModal {...feedbackProps} />
    </EmployerLayout>
  );
};

export default EmployerSettings;