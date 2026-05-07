import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  Image as ImageIcon,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import { EmployerLayout } from '../../../components/admin/employer';
import {
  employerService,
  type Employer,
} from '../../../services/employer/employerService';
import { showToast } from '../../../utils/toast';
import { SEO } from '../../../components/common';

const STYLES = `
  .ep-page { color: var(--el-ink); }

  .ep-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    margin-bottom: 22px;
  }

  .ep-command-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    padding: 28px;
    box-shadow: var(--el-shadow);
  }

  .ep-kicker {
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

  .ep-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .ep-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .ep-sub {
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0 0 22px;
    max-width: 700px;
  }

  .ep-hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ep-btn-primary,
  .ep-btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 14px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid transparent;
    transition: transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .ep-btn-primary {
    background: var(--el-accent);
    color: #fff;
    border-color: var(--el-accent);
    box-shadow: 0 10px 26px rgba(26,92,255,0.22);
  }

  .ep-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 32px rgba(26,92,255,0.30);
  }

  .ep-btn-ghost {
    background: var(--el-surface-2);
    color: var(--el-ink);
    border-color: var(--el-border);
  }

  .ep-btn-ghost:hover {
    transform: translateY(-1px);
    background: var(--el-surface);
  }

  .ep-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
  }

  .ep-health-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .ep-health-label,
  .ep-card-label,
  .ep-section-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ep-health-score {
    font-size: 3rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .ep-health-icon {
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

  .ep-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .ep-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    align-items: start;
  }

  .ep-main,
  .ep-side {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  .ep-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .ep-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .ep-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    margin: 0;
    color: var(--el-ink);
  }

  .ep-card-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .ep-card-body {
    padding: 22px;
  }

  .ep-company-head {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .ep-logo {
    width: 86px;
    height: 86px;
    border-radius: 24px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    object-fit: cover;
    flex-shrink: 0;
  }

  .ep-logo-empty {
    width: 86px;
    height: 86px;
    border-radius: 24px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-muted);
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    text-align: center;
    flex-shrink: 0;
  }

  .ep-company-name {
    font-size: 1.4rem;
    font-weight: 820;
    letter-spacing: -0.03em;
    margin: 0 0 8px;
  }

  .ep-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 10px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 800;
  }

  .ep-detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .ep-detail {
    border: 1px solid var(--el-border);
    border-radius: 18px;
    background: var(--el-surface-2);
    padding: 14px;
  }

  .ep-detail-label {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .ep-detail-value {
    color: var(--el-ink);
    font-size: 13px;
    font-weight: 760;
    word-break: break-word;
    margin: 0;
  }

  .ep-detail-value a {
    color: var(--el-accent);
    text-decoration: none;
  }

  .ep-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .ep-form-section {
    grid-column: 1 / -1;
    margin-top: 8px;
  }

  .ep-form-group {
    min-width: 0;
  }

  .ep-label {
    display: block;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .ep-input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    border-radius: 16px;
    padding: 0 14px;
    height: 46px;
  }

  .ep-input-wrap svg {
    color: var(--el-muted);
    flex-shrink: 0;
  }

  .ep-input,
  .ep-select {
    width: 100%;
    height: 44px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--el-ink);
    font-size: 13px;
    font-weight: 700;
  }

  .ep-input-error {
    border-color: rgba(239,68,68,0.35);
  }

  .ep-error {
    color: #dc2626;
    font-size: 12px;
    font-weight: 700;
    margin-top: 6px;
  }

  .ep-logo-edit {
    grid-column: 1 / -1;
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface-2);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .ep-file-input {
    width: 100%;
    border: 1px solid var(--el-border);
    border-radius: 14px;
    background: var(--el-surface);
    padding: 9px 12px;
    font-size: 13px;
    color: var(--el-muted);
  }

  .ep-help-text {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.5;
    margin: 8px 0 0;
  }

  .ep-form-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }

  .ep-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 0;
    border-bottom: 1px solid var(--el-border);
  }

  .ep-status-row:last-child {
    border-bottom: 0;
  }

  .ep-status-label {
    color: var(--el-muted);
    font-size: 12px;
    font-weight: 800;
  }

  .ep-status-value {
    color: var(--el-ink);
    font-size: 12px;
    font-weight: 800;
    text-align: right;
  }

  .ep-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 800;
  }

  .ep-status-badge.active {
    background: rgba(18,183,106,0.12);
    color: #0f9f62;
  }

  .ep-status-badge.rejected {
    background: rgba(239,68,68,0.12);
    color: #dc2626;
  }

  .ep-status-badge.pending {
    background: rgba(245,158,11,0.12);
    color: #b45309;
  }

  .ep-support-card {
    border: 1px solid rgba(26,92,255,0.18);
    border-radius: 22px;
    background:
      radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 36%),
      var(--el-accent);
    color: white;
    padding: 22px;
    box-shadow: 0 14px 34px rgba(26,92,255,0.22);
  }

  .ep-support-title {
    font-size: 1rem;
    font-weight: 820;
    margin: 0 0 8px;
  }

  .ep-support-text {
    font-size: 13px;
    line-height: 1.65;
    opacity: 0.82;
    margin: 0 0 18px;
  }

  .ep-support-btn {
    width: 100%;
    border: 0;
    border-radius: 14px;
    background: white;
    color: var(--el-accent);
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 850;
  }

  .ep-loading {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ep-spinner {
    width: 38px;
    height: 38px;
    border: 3px solid var(--el-surface-2);
    border-top-color: var(--el-accent);
    border-radius: 999px;
    animation: ep-spin 0.8s linear infinite;
  }

  .ep-failed {
    border: 1px solid rgba(239,68,68,0.18);
    background: rgba(239,68,68,0.08);
    color: #dc2626;
    border-radius: 18px;
    padding: 16px;
    font-size: 13px;
    font-weight: 750;
  }

  @keyframes ep-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1180px) {
    .ep-hero,
    .ep-layout {
      grid-template-columns: 1fr;
    }

    .ep-health-card {
      max-width: 520px;
    }
  }

  @media (max-width: 760px) {
    .ep-command-card,
    .ep-health-card,
    .ep-card-header,
    .ep-card-body {
      padding-left: 18px;
      padding-right: 18px;
    }

    .ep-detail-grid,
    .ep-form-grid {
      grid-template-columns: 1fr;
    }

    .ep-logo-edit,
    .ep-company-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .ep-form-actions {
      justify-content: stretch;
      flex-direction: column-reverse;
    }

    .ep-btn-primary,
    .ep-btn-ghost {
      justify-content: center;
      width: 100%;
    }
  }
`;

const getStatusClass = (status?: string) => {
  if (status === 'ACTIVE') return 'active';
  if (status === 'REJECTED') return 'rejected';
  return 'pending';
};

const EmployerProfile: React.FC = () => {
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Partial<Employer>>();

  useEffect(() => {
    fetchEmployerData();
  }, []);

  const fetchEmployerData = async () => {
    try {
      setIsLoading(true);

      const data = await employerService.getCurrentEmployer();

      setEmployer(data);
      setLogoPreview(data.logo || null);
      reset(data);
    } catch (error) {
      console.error('Error:', error);
      showToast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: Partial<Employer>) => {
    if (!employer) return;

    try {
      setIsSaving(true);

      let payload: Partial<Employer> | FormData;

      if (logoFile) {
        const formData = new FormData();

        if (data.name) formData.append('name', data.name);
        if (data.organization_type) formData.append('organization_type', data.organization_type);
        if (data.official_email) formData.append('official_email', data.official_email);
        if (data.domain) formData.append('domain', data.domain);
        if (data.contact_person) formData.append('contact_person', data.contact_person);
        if (data.phone_number) formData.append('phone_number', data.phone_number);
        if (data.website_url) formData.append('website_url', data.website_url);
        if (data.registration_number) {
          formData.append('registration_number', data.registration_number);
        }

        formData.append('logo', logoFile);
        payload = formData;
      } else {
        payload = data;
      }

      const updatedEmployer = await employerService.updateProfile(employer.id, payload);

      setEmployer(updatedEmployer);
      setLogoPreview(updatedEmployer.logo || null);
      setLogoFile(null);
      setIsEditing(false);

      showToast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error:', error);
      showToast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const profileHealth = useMemo(() => {
    if (!employer) return 0;

    const fields = [
      employer.name,
      employer.organization_type,
      employer.official_email,
      employer.domain,
      employer.contact_person,
      employer.phone_number,
      employer.website_url,
      employer.registration_number,
      employer.logo,
    ];

    const completed = fields.filter(Boolean).length;

    return Math.round((completed / fields.length) * 100);
  }, [employer]);

  if (isLoading) {
    return (
      <EmployerLayout>
        <style>{STYLES}</style>
        <div className="ep-loading">
          <div className="ep-spinner" />
        </div>
      </EmployerLayout>
    );
  }

  if (!employer) {
    return (
      <EmployerLayout>
        <style>{STYLES}</style>
        <div className="ep-failed">Failed to load profile data.</div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <SEO
        title="Company Profile"
        description="Manage employer profile details, contact information, and account status on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="ep-page">
        <section className="ep-hero">
          <div className="ep-command-card">
            <div className="ep-kicker">
              <Sparkles size={13} />
              Employer Identity
            </div>

            <h1 className="ep-title">
              Company <span>Profile</span>
            </h1>

            <p className="ep-sub">
              Keep your employer information accurate, credible, and institution-ready.
              Students and universities rely on this profile to trust placement opportunities.
            </p>

            <div className="ep-hero-actions">
              {!isEditing ? (
                <button
                  type="button"
                  className="ep-btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <User size={16} />
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  className="ep-btn-ghost"
                  onClick={() => {
                    reset(employer);
                    setLogoPreview(employer.logo || null);
                    setLogoFile(null);
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                >
                  <X size={16} />
                  Cancel editing
                </button>
              )}
            </div>
          </div>

          <aside className="ep-health-card">
            <div className="ep-health-top">
              <div>
                <div className="ep-health-label">Profile completeness</div>
                <div className="ep-health-score">{profileHealth}%</div>
              </div>

              <div className="ep-health-icon">
                <ShieldCheck size={20} />
              </div>
            </div>

            <p className="ep-health-note">
              Complete employer records improve student confidence and reduce institution
              verification friction.
            </p>
          </aside>
        </section>

        <div className="ep-layout">
          <main className="ep-main">
            <section className="ep-card">
              <div className="ep-card-header">
                <div>
                  <div className="ep-card-label">Employer record</div>
                  <h2 className="ep-card-title">
                    {isEditing ? 'Edit company information' : 'Verified company details'}
                  </h2>
                  <p className="ep-card-sub">
                    {isEditing
                      ? 'Update employer information visible across the placement workflow.'
                      : 'Profile information used across applications, internships, and verification.'}
                  </p>
                </div>
              </div>

              <div className="ep-card-body">
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="ep-form-grid">
                      <div className="ep-logo-edit">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo Preview" className="ep-logo" />
                        ) : (
                          <div className="ep-logo-empty">
                            <ImageIcon size={22} />
                            <span>No logo</span>
                          </div>
                        )}

                        <div style={{ flex: 1 }}>
                          <label className="ep-label">Company logo</label>
                          <input
                            type="file"
                            className="ep-file-input"
                            accept="image/*"
                            onChange={handleLogoChange}
                          />
                          <p className="ep-help-text">
                            Recommended size: 200x200px. Max size: 2MB.
                          </p>
                        </div>
                      </div>

                      <div className="ep-form-section">
                        <div className="ep-section-label">Basic information</div>
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Company name</label>
                        <div className={`ep-input-wrap ${errors.name ? 'ep-input-error' : ''}`}>
                          <Building2 size={17} />
                          <input
                            type="text"
                            className="ep-input"
                            {...register('name', {
                              required: 'Company name is required',
                            })}
                          />
                        </div>
                        {errors.name && <div className="ep-error">{errors.name.message}</div>}
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Organization type</label>
                        <div className="ep-input-wrap">
                          <Building2 size={17} />
                          <select className="ep-select" {...register('organization_type')}>
                            <option value="COMPANY">Private Company</option>
                            <option value="GOVERNMENT">Government</option>
                            <option value="NGO">NGO</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Official email</label>
                        <div
                          className={`ep-input-wrap ${
                            errors.official_email ? 'ep-input-error' : ''
                          }`}
                        >
                          <Mail size={17} />
                          <input
                            type="email"
                            className="ep-input"
                            {...register('official_email', {
                              required: 'Email is required',
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address',
                              },
                            })}
                          />
                        </div>
                        {errors.official_email && (
                          <div className="ep-error">{errors.official_email.message}</div>
                        )}
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Domain</label>
                        <div className="ep-input-wrap">
                          <Globe size={17} />
                          <input type="text" className="ep-input" {...register('domain')} />
                        </div>
                      </div>

                      <div className="ep-form-section">
                        <div className="ep-section-label">Contact details</div>
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Contact person</label>
                        <div
                          className={`ep-input-wrap ${
                            errors.contact_person ? 'ep-input-error' : ''
                          }`}
                        >
                          <User size={17} />
                          <input
                            type="text"
                            className="ep-input"
                            {...register('contact_person', {
                              required: 'Contact person is required',
                            })}
                          />
                        </div>
                        {errors.contact_person && (
                          <div className="ep-error">{errors.contact_person.message}</div>
                        )}
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Phone number</label>
                        <div className="ep-input-wrap">
                          <Phone size={17} />
                          <input
                            type="text"
                            className="ep-input"
                            {...register('phone_number')}
                          />
                        </div>
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Website URL</label>
                        <div className="ep-input-wrap">
                          <Globe size={17} />
                          <input
                            type="url"
                            className="ep-input"
                            placeholder="https://"
                            {...register('website_url')}
                          />
                        </div>
                      </div>

                      <div className="ep-form-group">
                        <label className="ep-label">Registration number</label>
                        <div className="ep-input-wrap">
                          <FileText size={17} />
                          <input
                            type="text"
                            className="ep-input"
                            {...register('registration_number')}
                          />
                        </div>
                      </div>

                      <div className="ep-form-actions">
                        <button
                          type="button"
                          className="ep-btn-ghost"
                          onClick={() => {
                            reset(employer);
                            setLogoPreview(employer.logo || null);
                            setLogoFile(null);
                            setIsEditing(false);
                          }}
                          disabled={isSaving}
                        >
                          <X size={16} />
                          Cancel
                        </button>

                        <button type="submit" className="ep-btn-primary" disabled={isSaving}>
                          <Save size={16} />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="ep-company-head">
                      {employer.logo ? (
                        <img src={employer.logo} alt="Company Logo" className="ep-logo" />
                      ) : (
                        <div className="ep-logo-empty">
                          <ImageIcon size={22} />
                          <span>Not customized</span>
                        </div>
                      )}

                      <div>
                        <h3 className="ep-company-name">{employer.name}</h3>
                        <span className="ep-chip">
                          <Building2 size={13} />
                          {employer.organization_type}
                        </span>
                      </div>
                    </div>

                    <div className="ep-section-label">Organization details</div>

                    <div className="ep-detail-grid" style={{ marginBottom: 20 }}>
                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <Building2 size={14} />
                          Type
                        </div>
                        <p className="ep-detail-value">{employer.organization_type}</p>
                      </div>

                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <FileText size={14} />
                          Registration number
                        </div>
                        <p className="ep-detail-value">
                          {employer.registration_number || 'N/A'}
                        </p>
                      </div>

                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <Globe size={14} />
                          Domain
                        </div>
                        <p className="ep-detail-value">{employer.domain || 'N/A'}</p>
                      </div>

                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <ShieldCheck size={14} />
                          Status
                        </div>
                        <p className="ep-detail-value">{employer.status}</p>
                      </div>
                    </div>

                    <div className="ep-section-label">Contact information</div>

                    <div className="ep-detail-grid">
                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <User size={14} />
                          Contact person
                        </div>
                        <p className="ep-detail-value">{employer.contact_person || 'N/A'}</p>
                      </div>

                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <Mail size={14} />
                          Official email
                        </div>
                        <p className="ep-detail-value">{employer.official_email}</p>
                      </div>

                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <Phone size={14} />
                          Phone
                        </div>
                        <p className="ep-detail-value">{employer.phone_number || 'N/A'}</p>
                      </div>

                      <div className="ep-detail">
                        <div className="ep-detail-label">
                          <Globe size={14} />
                          Website
                        </div>
                        <p className="ep-detail-value">
                          {employer.website_url ? (
                            <a
                              href={employer.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {employer.website_url}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </main>

          <aside className="ep-side">
            <section className="ep-card">
              <div className="ep-card-header">
                <div>
                  <div className="ep-card-label">Account state</div>
                  <h2 className="ep-card-title">Status summary</h2>
                </div>
              </div>

              <div className="ep-card-body">
                <div className="ep-status-row">
                  <span className="ep-status-label">Status</span>
                  <span className={`ep-status-badge ${getStatusClass(employer.status)}`}>
                    {employer.status === 'ACTIVE' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    {employer.status}
                  </span>
                </div>

                <div className="ep-status-row">
                  <span className="ep-status-label">Member since</span>
                  <span className="ep-status-value">
                    {new Date(employer.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="ep-status-row">
                  <span className="ep-status-label">Last updated</span>
                  <span className="ep-status-value">
                    {new Date(employer.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </section>

            <section className="ep-support-card">
              <h2 className="ep-support-title">Need help?</h2>
              <p className="ep-support-text">
                Contact support if you need to update sensitive employer information or
                resolve verification issues.
              </p>

              <button type="button" className="ep-support-btn">
                Contact Support
              </button>
            </section>
          </aside>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerProfile;