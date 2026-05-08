import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  User,
  Mail,
  Save,
  AlertCircle,
  ShieldCheck,
  BadgeCheck,
  Clock,
  Activity,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SupervisorLayout from '../../../../components/admin/employer/supervisor/SupervisorLayout';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  employerService,
  type EmployerStaffProfileRequestCreate,
} from '../../../../services/employer/employerService';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../../components/common';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';
import { SupervisorWorkspacePage } from '../../../../components/employer/supervisor/workspace';

const SupervisorProfile: React.FC = () => {
  const { user } = useAuth();
  const { feedbackProps } = useFeedbackModal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployerStaffProfileRequestCreate>({
    defaultValues: {
      first_name: user?.firstName || '',
      last_name: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const onSubmit = async (data: EmployerStaffProfileRequestCreate) => {
    if (
      data.first_name === user?.firstName &&
      data.last_name === user?.lastName &&
      data.email === user?.email
    ) {
      toast.error('No changes detected');
      return;
    }

    try {
      setIsSubmitting(true);

      await employerService.submitProfileUpdateRequest(data);

      toast.success(
        'Profile update request submitted successfully. An admin will review your changes.'
      );
    } catch (error: any) {
      console.error('Failed to submit profile update request:', error);
      const sanitized = sanitizeAdminError(error);
      toast.error(sanitized.userMessage || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SupervisorLayout>
      <SupervisorWorkspacePage className="profile-page">
        <div className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
          <div className="profile-hero mb-4">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
              <div>
                <div className="eyebrow mb-3">
                  <User size={15} />
                  Account Management
                </div>

                <h1 className="page-title mb-2">My Profile</h1>

                <p className="page-subtitle mb-0">
                  Manage your supervisor account details. Profile changes are reviewed
                  before they become active on the platform.
                </p>
              </div>

              <div className="hero-badge">
                <ShieldCheck size={17} />
                Employer Supervisor
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <div className="workspace-card">
                <div className="workspace-header">
                  <div>
                    <div className="section-kicker">
                      <Activity size={14} />
                      Profile Details
                    </div>

                    <h5>Personal Information</h5>

                    <p>
                      Submit a profile update request for admin review. Avoid unnecessary
                      changes unless your details are incorrect.
                    </p>
                  </div>
                </div>

                <div className="profile-form-body">
                  <div className="approval-notice mb-4">
                    <AlertCircle size={20} />

                    <div>
                      <strong>Admin approval required</strong>
                      <p>
                        Changes to your name or email are not applied instantly. An
                        administrator must verify and approve the request.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">First Name</label>

                        <div className="supervisor-input">
                          <User size={18} />
                          <input
                            type="text"
                            className={errors.first_name ? 'is-invalid' : ''}
                            {...register('first_name', {
                              required: 'First name is required',
                            })}
                          />
                        </div>

                        {errors.first_name && (
                          <div className="invalid-feedback d-block">
                            {errors.first_name.message}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Last Name</label>

                        <div className="supervisor-input">
                          <User size={18} />
                          <input
                            type="text"
                            className={errors.last_name ? 'is-invalid' : ''}
                            {...register('last_name', {
                              required: 'Last name is required',
                            })}
                          />
                        </div>

                        {errors.last_name && (
                          <div className="invalid-feedback d-block">
                            {errors.last_name.message}
                          </div>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label">Email Address</label>

                        <div className="supervisor-input">
                          <Mail size={18} />
                          <input
                            type="email"
                            className={errors.email ? 'is-invalid' : ''}
                            {...register('email', {
                              required: 'Email is required',
                              pattern: {
                                value:
                                  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address',
                              },
                            })}
                          />
                        </div>

                        {errors.email && (
                          <div className="invalid-feedback d-block">
                            {errors.email.message}
                          </div>
                        )}
                      </div>

                      <div className="col-12 mt-4">
                        <button
                          type="submit"
                          className="submit-btn"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                              />
                              Submitting Request...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Request Update
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="workspace-card account-card">
                <div className="account-avatar">
                  {user?.firstName?.[0] || 'S'}
                </div>

                <h5>{user?.firstName} {user?.lastName}</h5>
                <p>{user?.email}</p>

                <div className="account-meta">
                  <div>
                    <span>Role</span>
                    <strong>Supervisor</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong className="success-text">Active</strong>
                  </div>

                  <div>
                    <span>Access Level</span>
                    <strong>Employer Review</strong>
                  </div>
                </div>
              </div>

              <div className="workspace-card mt-4">
                <div className="side-panel">
                  <div className="side-icon">
                    <BadgeCheck size={20} />
                  </div>

                  <div>
                    <h6>Verified supervisor account</h6>
                    <p>
                      Your account is linked to employer-side supervision workflows,
                      including logbook review, milestone validation, final assessment,
                      and incident reporting.
                    </p>
                  </div>
                </div>
              </div>

              <div className="workspace-card mt-4">
                <div className="side-panel">
                  <div className="side-icon muted">
                    <Clock size={20} />
                  </div>

                  <div>
                    <h6>Profile updates are reviewed</h6>
                    <p>
                      This prevents unauthorized identity changes inside employer and
                      institution supervision records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FeedbackModal {...feedbackProps} />

        <style>{`
          .profile-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 32rem),
              linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%);
            color: #0f172a;
          }

          .profile-hero,
          .workspace-card {
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.045);
          }

          .profile-hero {
            padding: 1.5rem;
            backdrop-filter: blur(14px);
          }

          .eyebrow,
          .section-kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #2563eb;
          }

          .page-title {
            font-size: clamp(1.75rem, 3vw, 2.35rem);
            font-weight: 850;
            letter-spacing: -0.045em;
            color: #0f172a;
          }

          .page-subtitle {
            max-width: 720px;
            color: #64748b;
            font-size: 0.98rem;
            line-height: 1.65;
          }

          .hero-badge {
            align-self: flex-start;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.7rem 0.95rem;
            border-radius: 999px;
            color: #047857;
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
            font-size: 0.84rem;
            font-weight: 800;
          }

          .workspace-card {
            overflow: hidden;
          }

          .workspace-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.35rem 1.35rem 1rem;
            border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          }

          .workspace-header h5 {
            margin: 0.35rem 0 0.25rem;
            color: #0f172a;
            font-size: 1.08rem;
            font-weight: 850;
            letter-spacing: -0.02em;
          }

          .workspace-header p {
            margin: 0;
            color: #64748b;
            font-size: 0.88rem;
          }

          .profile-form-body {
            padding: 1.35rem;
          }

          .approval-notice {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.95rem;
            border-radius: 20px;
            color: #0369a1;
            background: #e0f2fe;
            border: 1px solid #bae6fd;
          }

          .approval-notice strong {
            display: block;
            font-size: 0.9rem;
            font-weight: 850;
          }

          .approval-notice p {
            margin: 0.18rem 0 0;
            font-size: 0.8rem;
            line-height: 1.45;
          }

          .form-label {
            color: #475569;
            font-size: 0.8rem;
            font-weight: 850;
          }

          .supervisor-input {
            min-height: 48px;
            display: flex;
            align-items: center;
            gap: 0.65rem;
            padding: 0 0.85rem;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.08);
            color: #64748b;
          }

          .supervisor-input:focus-within {
            border-color: rgba(37, 99, 235, 0.35);
            background: #ffffff;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
          }

          .supervisor-input input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #0f172a;
            font-size: 0.9rem;
            font-weight: 600;
          }

          .supervisor-input input.is-invalid {
            color: #b91c1c;
          }

          .invalid-feedback {
            font-size: 0.78rem;
          }

          .submit-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.55rem;
            min-height: 44px;
            padding: 0.65rem 1rem;
            border: 0;
            border-radius: 999px;
            background: #2563eb;
            color: #ffffff;
            font-size: 0.86rem;
            font-weight: 850;
            box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
          }

          .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .account-card {
            padding: 1.35rem;
            text-align: center;
          }

          .account-avatar {
            width: 76px;
            height: 76px;
            margin: 0 auto 1rem;
            border-radius: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #2563eb;
            background: #eff6ff;
            border: 1px solid rgba(37, 99, 235, 0.12);
            font-size: 1.75rem;
            font-weight: 900;
          }

          .account-card h5 {
            margin-bottom: 0.25rem;
            color: #0f172a;
            font-size: 1.05rem;
            font-weight: 850;
          }

          .account-card p {
            margin-bottom: 1rem;
            color: #64748b;
            font-size: 0.86rem;
            word-break: break-word;
          }

          .account-meta {
            display: grid;
            gap: 0.7rem;
            margin-top: 1rem;
            text-align: left;
          }

          .account-meta div {
            padding: 0.85rem;
            border-radius: 17px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .account-meta span {
            display: block;
            margin-bottom: 0.2rem;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 850;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .account-meta strong {
            color: #0f172a;
            font-size: 0.86rem;
            font-weight: 850;
          }

          .success-text {
            color: #047857 !important;
          }

          .side-panel {
            display: flex;
            align-items: flex-start;
            gap: 0.85rem;
            padding: 1.2rem;
          }

          .side-icon {
            width: 42px;
            height: 42px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #047857;
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
            flex-shrink: 0;
          }

          .side-icon.muted {
            color: #2563eb;
            background: #eff6ff;
            border-color: rgba(37, 99, 235, 0.12);
          }

          .side-panel h6 {
            margin-bottom: 0.25rem;
            color: #0f172a;
            font-size: 0.92rem;
            font-weight: 850;
          }

          .side-panel p {
            margin: 0;
            color: #64748b;
            font-size: 0.82rem;
            line-height: 1.5;
          }

          @media (max-width: 767.98px) {
            .profile-hero {
              padding: 1.1rem;
              border-radius: 20px;
            }

            .submit-btn {
              width: 100%;
            }
          }
        `}</style>
      </SupervisorWorkspacePage>
    </SupervisorLayout>
  );
};

export default SupervisorProfile;
