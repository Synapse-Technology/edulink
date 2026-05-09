import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Crown,
  Eye,
  Lock,
  Mail,
  Shield,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';

import { adminAuthService } from '../../../services/auth/adminAuthService';
import AdminLayout from '../../../components/admin/AdminLayout';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

interface InviteFormData {
  email: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  message?: string;
}

const roleConfigs = {
  SUPER_ADMIN: {
    title: 'Super Administrator',
    icon: Crown,
    tone: 'danger',
    risk: 'Critical',
    description: 'Complete platform and staff-control access.',
    permissions: [
      'Full platform administration',
      'Staff and role management',
      'System configuration',
      'Institution and user controls',
      'Audit and evidence access',
      'Operational override authority',
    ],
  },
  PLATFORM_ADMIN: {
    title: 'Platform Administrator',
    icon: Shield,
    tone: 'blue',
    risk: 'High',
    description: 'Broad operational administration access.',
    permissions: [
      'User and institution management',
      'Employer and support workflows',
      'Content moderation',
      'Reports and analytics',
      'Operational configuration',
    ],
  },
  MODERATOR: {
    title: 'Moderator',
    icon: UserCheck,
    tone: 'green',
    risk: 'Medium',
    description: 'Support, review, and moderation access.',
    permissions: [
      'Content moderation',
      'Support queue handling',
      'User account review',
      'Report review',
    ],
  },
  AUDITOR: {
    title: 'Auditor',
    icon: Eye,
    tone: 'amber',
    risk: 'Low',
    description: 'Read-only oversight and audit review.',
    permissions: [
      'Read-only audit logs',
      'Analytics and reports',
      'Evidence review',
      'No modification access',
    ],
  },
};

const StaffInviteForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    role: 'MODERATOR',
    message: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const activeConfig = roleConfigs[formData.role];
  const ActiveIcon = activeConfig.icon;

  const riskWidth = useMemo(() => {
    switch (formData.role) {
      case 'SUPER_ADMIN':
        return '100%';
      case 'PLATFORM_ADMIN':
        return '78%';
      case 'MODERATOR':
        return '55%';
      case 'AUDITOR':
        return '34%';
      default:
        return '40%';
    }
  }, [formData.role]);

  const handleInputChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError('');
  };

  const handleRoleSelect = (role: InviteFormData['role']) => {
    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!formData.email.trim()) {
      setError('Email address is required.');
      return;
    }

    setIsLoading(true);

    try {
      await adminAuthService.inviteStaff({
        ...formData,
        email: formData.email.trim(),
      });

      setSuccess(true);

      setTimeout(() => {
        navigate('/admin/staff');
      }, 3000);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to send invitation.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AdminLayout>
        <div className="invite-success-page">
          <section className="success-card">
            <div className="success-icon">
              <CheckCircle size={46} />
            </div>

            <span className="success-kicker">Invitation dispatched</span>

            <h1>Staff invitation sent</h1>

            <p>
              An access invitation has been sent to{' '}
              <strong>{formData.email}</strong>. The recipient must accept it
              before the invitation expires.
            </p>

            <div className="success-actions">
              <button
                type="button"
                className="invite-btn primary"
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    email: '',
                    role: 'MODERATOR',
                    message: '',
                  });
                }}
              >
                <UserPlus size={16} />
                Send another invite
              </button>

              <button
                type="button"
                className="invite-btn secondary"
                onClick={() => navigate('/admin/staff')}
              >
                Back to staff access
              </button>
            </div>

            <small>Redirecting to staff management shortly...</small>
          </section>
        </div>

        <style>{styles}</style>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="invite-page">
        <div className="invite-breadcrumb">
          <Link to="/admin/staff">
            <ArrowLeft size={15} />
            Staff access
          </Link>

          <span>/</span>
          <strong>Invite staff</strong>
        </div>

        <header className="invite-header">
          <div>
            <span className="invite-kicker">
              <Shield size={14} />
              Internal access provisioning
            </span>

            <h1>Invite Platform Staff</h1>

            <p>
              Provision internal platform access using least-privilege role
              assignment. Every invitation and acceptance event should remain
              auditable.
            </p>
          </div>

          <button
            type="button"
            className="invite-btn secondary"
            onClick={() => navigate('/admin/staff')}
          >
            <ArrowLeft size={16} />
            Back to staff
          </button>
        </header>

        {error && (
          <div className="invite-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="invite-layout">
            <main className="invite-main">
              <section className="invite-panel">
                <div className="panel-header">
                  <div>
                    <span>Recipient</span>
                    <h2>Invitation target</h2>
                  </div>
                </div>

                <div className="field-grid">
                  <label className="field full">
                    <span>
                      <Mail size={15} />
                      Email address
                    </span>

                    <input
                      type="email"
                      name="email"
                      placeholder="staff.email@organization.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />

                    <small>
                      The invitation link will be sent to this address.
                    </small>
                  </label>

                  <label className="field full">
                    <span>
                      <Mail size={15} />
                      Personal message
                    </span>

                    <textarea
                      name="message"
                      rows={5}
                      placeholder="Optional welcome or access context..."
                      value={formData.message}
                      onChange={handleInputChange}
                    />

                    <small>
                      Include why this person is being invited and what role
                      they are expected to perform.
                    </small>
                  </label>
                </div>
              </section>

              <section className="invite-panel">
                <div className="panel-header">
                  <div>
                    <span>Role assignment</span>
                    <h2>Select access level</h2>
                  </div>
                </div>

                <div className="role-grid">
                  {Object.entries(roleConfigs).map(([role, config]) => {
                    const Icon = config.icon;
                    const isActive = formData.role === role;

                    return (
                      <button
                        type="button"
                        key={role}
                        className={`role-card ${config.tone} ${
                          isActive ? 'active' : ''
                        }`}
                        onClick={() =>
                          handleRoleSelect(role as InviteFormData['role'])
                        }
                      >
                        <div className="role-card-top">
                          <div className="role-icon">
                            <Icon size={20} />
                          </div>

                          {isActive && (
                            <span className="selected-pill">
                              Selected
                            </span>
                          )}
                        </div>

                        <h3>{config.title}</h3>
                        <p>{config.description}</p>

                        <span className="risk-label">
                          {config.risk} risk access
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="invite-panel">
                <div className="panel-header">
                  <div>
                    <span>Permission preview</span>
                    <h2>{activeConfig.title}</h2>
                  </div>

                  <span className={`risk-pill ${activeConfig.tone}`}>
                    {activeConfig.risk} risk
                  </span>
                </div>

                <div className="permission-layout">
                  <div className="permission-list">
                    {activeConfig.permissions.map((permission) => (
                      <div key={permission}>
                        <CheckCircle size={15} />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>

                  <aside className="risk-card">
                    <div className={`risk-icon ${activeConfig.tone}`}>
                      <ActiveIcon size={24} />
                    </div>

                    <h3>Access risk profile</h3>

                    <div className="risk-meter">
                      <span
                        className={activeConfig.tone}
                        style={{ width: riskWidth }}
                      />
                    </div>

                    <dl>
                      <div>
                        <dt>Read access</dt>
                        <dd>Full</dd>
                      </div>

                      <div>
                        <dt>Write access</dt>
                        <dd>
                          {formData.role === 'AUDITOR' ? 'None' : 'Enabled'}
                        </dd>
                      </div>

                      <div>
                        <dt>Admin controls</dt>
                        <dd>
                          {formData.role === 'SUPER_ADMIN' ||
                          formData.role === 'PLATFORM_ADMIN'
                            ? 'Full'
                            : 'Limited'}
                        </dd>
                      </div>
                    </dl>
                  </aside>
                </div>
              </section>

              <section className="security-note">
                <Shield size={18} />

                <div>
                  <strong>Security guideline</strong>
                  <p>
                    Invite only trusted staff. Assign the minimum role needed
                    for their responsibility. Staff invitations expire after 7
                    days and access provisioning should be reviewed regularly.
                  </p>
                </div>
              </section>
            </main>

            <aside className="invite-sidebar">
              <section className="side-card">
                <span className="side-label">Invitation summary</span>

                <div className={`side-role-icon ${activeConfig.tone}`}>
                  <ActiveIcon size={26} />
                </div>

                <h3>{activeConfig.title}</h3>

                <p>{activeConfig.description}</p>

                <dl>
                  <div>
                    <dt>Recipient</dt>
                    <dd>{formData.email || 'Not set'}</dd>
                  </div>

                  <div>
                    <dt>Access risk</dt>
                    <dd>{activeConfig.risk}</dd>
                  </div>

                  <div>
                    <dt>Expiration</dt>
                    <dd>7 days</dd>
                  </div>
                </dl>
              </section>

              <section className="side-card warning">
                <div className="side-card-title">
                  <Lock size={16} />
                  Access warning
                </div>

                <p>
                  Super Admin and Platform Admin roles should be rare. They can
                  affect user trust, institution records, support outcomes, and
                  audit-sensitive workflows.
                </p>
              </section>

              <button
                type="submit"
                className="invite-submit"
                disabled={isLoading}
              >
                <UserPlus size={16} />
                {isLoading ? 'Sending invitation...' : 'Send invitation'}
              </button>
            </aside>
          </div>
        </form>
      </div>

      <style>{styles}</style>
    </AdminLayout>
  );
};

const styles = `
  .invite-page {
    color: #111827;
  }

  .invite-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    color: #64748b;
    font-size: .84rem;
    font-weight: 750;
  }

  .invite-breadcrumb a {
    color: #334155;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .invite-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 20px;
  }

  .invite-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #64748b;
    font-size: .72rem;
    font-weight: 850;
    letter-spacing: .09em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .invite-kicker svg {
    color: #047857;
  }

  .invite-header h1 {
    margin: 0 0 8px;
    color: #0f172a;
    font-size: clamp(1.85rem, 3vw, 2.6rem);
    line-height: 1.05;
    font-weight: 900;
    letter-spacing: -.055em;
  }

  .invite-header p {
    max-width: 760px;
    color: #64748b;
    line-height: 1.65;
    margin: 0;
  }

  .invite-btn {
    min-height: 42px;
    border-radius: 12px;
    padding: 0 14px;
    border: 1px solid transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 850;
    cursor: pointer;
    text-decoration: none;
  }

  .invite-btn.primary {
    background: #0f172a;
    color: #ffffff;
  }

  .invite-btn.secondary {
    background: #ffffff;
    border-color: #dbe3ea;
    color: #334155;
  }

  .invite-error {
    margin-bottom: 18px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #991b1b;
    border-radius: 14px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .invite-error button {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .invite-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 18px;
  }

  .invite-main {
    display: grid;
    gap: 18px;
  }

  .invite-panel,
  .side-card,
  .security-note,
  .success-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 26px rgba(15,23,42,.04);
  }

  .invite-panel,
  .side-card,
  .security-note {
    border-radius: 22px;
  }

  .panel-header {
    padding: 18px 20px;
    border-bottom: 1px solid #eef2f7;
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .panel-header span {
    color: #64748b;
    font-size: .72rem;
    font-weight: 850;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .panel-header h2 {
    color: #0f172a;
    font-size: 1.15rem;
    font-weight: 900;
    margin: 5px 0 0;
  }

  .field-grid {
    padding: 20px;
    display: grid;
    gap: 18px;
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .field span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #334155;
    font-size: .84rem;
    font-weight: 850;
  }

  .field input,
  .field textarea {
    width: 100%;
    border: 1px solid #dbe3ea;
    border-radius: 14px;
    padding: 13px 14px;
    outline: none;
    color: #111827;
    font: inherit;
  }

  .field textarea {
    resize: vertical;
  }

  .field small {
    color: #94a3b8;
    font-size: .76rem;
  }

  .role-grid {
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .role-card {
    text-align: left;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    border-radius: 18px;
    padding: 16px;
    cursor: pointer;
    transition: .18s ease;
  }

  .role-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(15,23,42,.06);
  }

  .role-card.active {
    border-color: #0f172a;
    box-shadow: 0 14px 32px rgba(15,23,42,.08);
  }

  .role-card-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }

  .role-icon,
  .side-role-icon,
  .risk-icon {
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .role-icon {
    width: 40px;
    height: 40px;
  }

  .role-card.danger .role-icon,
  .risk-icon.danger,
  .side-role-icon.danger {
    background: #fef2f2;
    color: #b91c1c;
  }

  .role-card.blue .role-icon,
  .risk-icon.blue,
  .side-role-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .role-card.green .role-icon,
  .risk-icon.green,
  .side-role-icon.green {
    background: #ecfdf5;
    color: #047857;
  }

  .role-card.amber .role-icon,
  .risk-icon.amber,
  .side-role-icon.amber {
    background: #fffbeb;
    color: #b45309;
  }

  .selected-pill,
  .risk-pill {
    border-radius: 999px;
    padding: 6px 9px;
    font-size: .7rem;
    font-weight: 900;
    background: #0f172a;
    color: #ffffff;
  }

  .risk-pill.danger { background: #fef2f2; color: #b91c1c; }
  .risk-pill.blue { background: #eff6ff; color: #2563eb; }
  .risk-pill.green { background: #ecfdf5; color: #047857; }
  .risk-pill.amber { background: #fffbeb; color: #b45309; }

  .role-card h3 {
    color: #0f172a;
    font-size: .96rem;
    font-weight: 900;
    margin: 0 0 8px;
  }

  .role-card p {
    color: #64748b;
    font-size: .82rem;
    line-height: 1.5;
    margin: 0 0 12px;
  }

  .risk-label {
    color: #334155;
    font-size: .74rem;
    font-weight: 850;
  }

  .permission-layout {
    padding: 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 18px;
  }

  .permission-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .permission-list div {
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: #334155;
    font-size: .84rem;
    font-weight: 750;
  }

  .permission-list svg {
    color: #047857;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .risk-card {
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    border-radius: 18px;
    padding: 16px;
  }

  .risk-icon {
    width: 46px;
    height: 46px;
    margin-bottom: 14px;
  }

  .risk-card h3 {
    color: #0f172a;
    font-size: .95rem;
    font-weight: 900;
    margin: 0 0 14px;
  }

  .risk-meter {
    height: 8px;
    background: #e5e7eb;
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .risk-meter span {
    display: block;
    height: 100%;
    border-radius: inherit;
  }

  .risk-meter .danger { background: #dc2626; }
  .risk-meter .blue { background: #2563eb; }
  .risk-meter .green { background: #059669; }
  .risk-meter .amber { background: #f59e0b; }

  .risk-card dl,
  .side-card dl {
    margin: 0;
    display: grid;
    gap: 10px;
  }

  .risk-card div,
  .side-card dl div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .risk-card dt,
  .side-card dt {
    color: #64748b;
    font-size: .78rem;
    font-weight: 800;
  }

  .risk-card dd,
  .side-card dd {
    color: #0f172a;
    font-size: .8rem;
    font-weight: 900;
    margin: 0;
    text-align: right;
    word-break: break-word;
  }

  .security-note {
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .security-note svg {
    color: #047857;
    flex-shrink: 0;
  }

  .security-note strong {
    display: block;
    color: #0f172a;
    font-weight: 900;
    margin-bottom: 4px;
  }

  .security-note p {
    color: #64748b;
    margin: 0;
    line-height: 1.6;
    font-size: .88rem;
  }

  .invite-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .side-card {
    padding: 18px;
  }

  .side-label {
    display: block;
    color: #64748b;
    font-size: .72rem;
    font-weight: 850;
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .side-role-icon {
    width: 54px;
    height: 54px;
    margin-bottom: 14px;
  }

  .side-card h3 {
    color: #0f172a;
    font-size: 1rem;
    font-weight: 900;
    margin: 0 0 8px;
  }

  .side-card p {
    color: #64748b;
    line-height: 1.6;
    margin: 0 0 16px;
    font-size: .88rem;
  }

  .side-card.warning {
    background: #fffbeb;
    border-color: #fde68a;
  }

  .side-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #b45309;
    font-weight: 900;
    margin-bottom: 10px;
  }

  .invite-submit {
    min-height: 52px;
    border: 0;
    border-radius: 16px;
    background: #0f172a;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 900;
    cursor: pointer;
  }

  .invite-submit:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .invite-success-page {
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .success-card {
    width: min(560px, 100%);
    border-radius: 24px;
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

  .success-kicker {
    display: block;
    color: #047857;
    font-size: .72rem;
    font-weight: 900;
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .success-card h1 {
    color: #0f172a;
    font-size: 1.8rem;
    font-weight: 900;
    margin: 0 0 10px;
  }

  .success-card p {
    color: #64748b;
    line-height: 1.7;
    margin: 0 0 22px;
  }

  .success-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 14px;
  }

  .success-card small {
    color: #94a3b8;
  }

  @media (max-width: 1180px) {
    .invite-layout,
    .permission-layout {
      grid-template-columns: 1fr;
    }

    .invite-sidebar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .invite-submit {
      grid-column: 1 / -1;
    }

    .role-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .invite-header,
    .panel-header,
    .success-actions {
      flex-direction: column;
    }

    .invite-header {
      display: flex;
    }

    .invite-btn,
    .invite-submit {
      width: 100%;
    }

    .role-grid,
    .permission-list,
    .invite-sidebar {
      grid-template-columns: 1fr;
    }
  }
`;

export default StaffInviteForm;