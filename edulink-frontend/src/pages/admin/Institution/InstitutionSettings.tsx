import React, { useState, useEffect } from 'react';
import {
  Form,
  Button,
  Row,
  Col,
  Nav,
  Spinner,
} from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import {
  Save,
  Globe,
  Building2,
  Mail,
  Phone,
  GraduationCap,
  Shield,
  CheckCircle,
  XCircle,
  X,
  PenTool,
  Image as ImageIcon,
  Settings,
  MapPin,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import {
  institutionService,
  type InstitutionProfile,
} from '../../../services/institution/institutionService';

import AcademicStructure from '../../../components/admin/institution/AcademicStructure';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';
import InstitutionSettingsSkeleton from '../../../components/admin/skeletons/InstitutionSettingsSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const InstitutionSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<InstitutionProfile | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Partial<InstitutionProfile>>();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);

    try {
      const data = await institutionService.getProfile();

      setProfile(data);
      setLogoPreview(data.logo || null);
      reset(data);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      toast.error(sanitized.userMessage || 'Failed to load profile');
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

  const onSubmit = async (data: Partial<InstitutionProfile>) => {
    setIsSaving(true);

    try {
      let payload: Partial<InstitutionProfile> | FormData;

      if (logoFile) {
        const formData = new FormData();

        if (data.website_url) formData.append('website_url', data.website_url);
        if (data.contact_email) formData.append('contact_email', data.contact_email);
        if (data.contact_phone) formData.append('contact_phone', data.contact_phone);
        if (data.address) formData.append('address', data.address);
        if (data.description) formData.append('description', data.description);

        formData.append('logo', logoFile);

        payload = formData;
      } else {
        payload = {
          website_url: data.website_url,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          address: data.address,
          description: data.description,
        };
      }

      const updatedProfile = await institutionService.updateProfile(payload);

      setProfile(updatedProfile);
      setLogoPreview(updatedProfile.logo || null);
      setLogoFile(null);
      reset(updatedProfile);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      toast.error(sanitized.userMessage || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profile) {
    return <InstitutionSettingsSkeleton />;
  }

  return (
    <InstitutionWorkspacePage className="institution-settings-page">
      <style>{`
        .settings-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .settings-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #f4f6f8;
          border: 1px solid #e6e9ee;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 18px;
        }

        .settings-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .settings-subtitle {
          color: #64748b;
          max-width: 780px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .settings-shell {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
        }

        .settings-side-card,
        .settings-main-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .settings-side-card {
          position: sticky;
          top: 92px;
        }

        .settings-nav {
          padding: 10px;
          gap: 6px;
        }

        .settings-nav .nav-link {
          border-radius: 16px;
          color: #64748b;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 13px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .settings-nav .nav-link.active {
          background: #111827;
          color: #ffffff;
        }

        .settings-main-header {
          padding: 24px;
          border-bottom: 1px solid #eef2f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .settings-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.08rem;
          font-weight: 740;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .settings-section-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .settings-primary-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .settings-soft-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .profile-identity-card {
          background: #fbfcfd;
          border: 1px solid #edf0f4;
          border-radius: 24px;
          padding: 22px;
        }

        .profile-logo {
          width: 86px;
          height: 86px;
          border-radius: 24px;
          object-fit: cover;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .profile-logo-placeholder {
          width: 86px;
          height: 86px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }

        .settings-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .settings-pill-success {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .settings-pill-warning {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .settings-pill-info {
          background: #eff6ff;
          border-color: #dbeafe;
          color: #1d4ed8;
        }

        .settings-info-card {
          background: #ffffff;
          border: 1px solid #edf0f4;
          border-radius: 22px;
          padding: 20px;
          height: 100%;
        }

        .settings-info-label {
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .settings-info-value {
          color: #111827;
          font-weight: 700;
          line-height: 1.55;
          word-break: break-word;
        }

        .settings-muted-value {
          color: #64748b;
          line-height: 1.65;
          margin-bottom: 0;
        }

        .settings-input,
        .settings-textarea,
        .settings-file {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .settings-textarea {
          min-height: auto;
        }

        .settings-input:focus,
        .settings-textarea:focus,
        .settings-file:focus {
          border-color: #111827 !important;
        }

        .settings-input-group {
          position: relative;
        }

        .settings-input-icon {
          position: absolute;
          top: 50%;
          left: 14px;
          transform: translateY(-50%);
          color: #64748b;
          z-index: 2;
        }

        .settings-input-with-icon {
          padding-left: 42px !important;
        }

        .readonly-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        @media (max-width: 992px) {
          .settings-shell {
            grid-template-columns: 1fr;
          }

          .settings-side-card {
            position: static;
          }

          .settings-main-header {
            flex-direction: column;
          }

          .readonly-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .settings-hero {
            padding: 22px;
          }
        }
      `}</style>

      <div className="settings-hero">
        <div>
          <div className="settings-eyebrow">
            <Settings size={15} />
            Institution Settings
          </div>

          <h1 className="settings-title">
            Manage your institution profile and academic configuration.
          </h1>

          <p className="settings-subtitle">
            Keep your institution identity, contact information, verification status,
            and academic structure clean, accurate, and ready for placement workflows.
          </p>
        </div>
      </div>

      <div className="settings-shell">
        <aside className="settings-side-card">
          <Nav
            className="settings-nav flex-column"
            activeKey={activeTab}
            onSelect={key => setActiveTab(key || 'profile')}
          >
            <Nav.Link eventKey="profile">
              <Building2 size={18} />
              Institution Profile
            </Nav.Link>

            <Nav.Link eventKey="academic">
              <GraduationCap size={18} />
              Academic Structure
            </Nav.Link>
          </Nav>
        </aside>

        <section className="settings-main-card">
          {activeTab === 'academic' && (
            <>
              <div className="settings-main-header">
                <div>
                  <div className="settings-section-title">
                    <GraduationCap size={19} />
                    Academic Structure
                  </div>

                  <p className="settings-section-subtitle">
                    Manage departments and cohorts used across verification, reporting, and placement workflows.
                  </p>
                </div>
              </div>

              <div className="p-4">
                <AcademicStructure />
              </div>
            </>
          )}

          {activeTab === 'profile' && profile && (
            <>
              <div className="settings-main-header">
                <div>
                  <div className="settings-section-title">
                    <Building2 size={19} />
                    Institution Profile
                  </div>

                  <p className="settings-section-subtitle">
                    Public institution identity and contact details used across EduLink.
                  </p>
                </div>

                {!isEditing && (
                  <Button
                    className="settings-primary-btn d-flex align-items-center gap-2"
                    onClick={() => setIsEditing(true)}
                  >
                    <PenTool size={16} />
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="p-4">
                {isEditing ? (
                  <Form onSubmit={handleSubmit(onSubmit)}>
                    <div className="profile-identity-card mb-4">
                      <div className="d-flex align-items-center gap-4 flex-wrap">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            className="profile-logo"
                          />
                        ) : (
                          <div className="profile-logo-placeholder">
                            <ImageIcon size={24} />
                            <small>No logo</small>
                          </div>
                        )}

                        <div className="flex-grow-1">
                          <Form.Label className="small fw-semibold">
                            Institution Logo
                          </Form.Label>

                          <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="settings-file"
                          />

                          <Form.Text className="text-muted small">
                            Recommended size: 200x200px. Max size: 2MB.
                          </Form.Text>
                        </div>
                      </div>
                    </div>

                    <Row className="g-4 mb-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">
                            Institution Name
                          </Form.Label>

                          <Form.Control
                            type="text"
                            value={profile.name}
                            disabled
                            className="settings-input bg-light"
                          />

                          <Form.Text className="text-muted">
                            Institution name cannot be changed directly.
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">
                            Website URL
                          </Form.Label>

                          <div className="settings-input-group">
                            <Globe size={16} className="settings-input-icon" />

                            <Form.Control
                              type="text"
                              {...register('website_url')}
                              placeholder="https://example.edu"
                              className="settings-input settings-input-with-icon"
                            />
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row className="g-4 mb-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">
                            Contact Email
                          </Form.Label>

                          <div className="settings-input-group">
                            <Mail size={16} className="settings-input-icon" />

                            <Form.Control
                              type="email"
                              {...register('contact_email', {
                                required: 'Contact email is required',
                                pattern: {
                                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                  message: 'Invalid email address',
                                },
                              })}
                              className={`settings-input settings-input-with-icon ${
                                errors.contact_email ? 'is-invalid' : ''
                              }`}
                              placeholder="contact@example.edu"
                            />

                            {errors.contact_email && (
                              <div className="invalid-feedback">
                                {errors.contact_email.message}
                              </div>
                            )}
                          </div>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">
                            Contact Phone
                          </Form.Label>

                          <div className="settings-input-group">
                            <Phone size={16} className="settings-input-icon" />

                            <Form.Control
                              type="text"
                              {...register('contact_phone')}
                              placeholder="e.g. +254 700 000 000"
                              className="settings-input settings-input-with-icon"
                            />
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-semibold">
                        Address
                      </Form.Label>

                      <Form.Control
                        as="textarea"
                        rows={3}
                        {...register('address')}
                        placeholder="Enter physical address..."
                        className="settings-textarea"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-semibold">
                        Description
                      </Form.Label>

                      <Form.Control
                        as="textarea"
                        rows={4}
                        {...register('description')}
                        placeholder="Tell us about your institution..."
                        className="settings-textarea"
                      />
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        className="settings-soft-btn d-flex align-items-center gap-2"
                        onClick={() => {
                          reset(profile);
                          setLogoPreview(profile.logo || null);
                          setLogoFile(null);
                          setIsEditing(false);
                        }}
                        disabled={isSaving}
                      >
                        <X size={17} />
                        Cancel
                      </Button>

                      <Button
                        className="settings-primary-btn d-flex align-items-center gap-2"
                        type="submit"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <Save size={17} />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </Form>
                ) : (
                  <>
                    <div className="profile-identity-card mb-4">
                      <div className="d-flex align-items-center gap-4 flex-wrap">
                        {profile.logo ? (
                          <img
                            src={profile.logo}
                            alt="Institution Logo"
                            className="profile-logo"
                          />
                        ) : (
                          <div className="profile-logo-placeholder">
                            <ImageIcon size={24} />
                            <small>No logo</small>
                          </div>
                        )}

                        <div>
                          <h4 className="fw-bold mb-1">
                            {profile.name}
                          </h4>

                          <p className="text-muted mb-3">
                            {profile.description || 'No description provided.'}
                          </p>

                          <div className="d-flex flex-wrap gap-2">
                            {profile.is_active ? (
                              <span className="settings-pill settings-pill-success">
                                <CheckCircle size={13} />
                                Active
                              </span>
                            ) : (
                              <span className="settings-pill settings-pill-warning">
                                <XCircle size={13} />
                                Inactive
                              </span>
                            )}

                            {profile.is_verified && (
                              <span className="settings-pill settings-pill-info">
                                <Shield size={13} />
                                Verified
                              </span>
                            )}

                            <span className="settings-pill">
                              <BadgeCheck size={13} />
                              Trust Level {profile.trust_level || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="readonly-grid">
                      <div className="settings-info-card">
                        <div className="settings-info-label">
                          Institution Name
                        </div>
                        <div className="settings-info-value">
                          {profile.name}
                        </div>
                      </div>

                      <div className="settings-info-card">
                        <div className="settings-info-label">
                          Primary Domain
                        </div>
                        <div className="settings-info-value">
                          {profile.domain || 'Not set'}
                        </div>
                      </div>

                      <div className="settings-info-card">
                        <div className="settings-info-label d-flex align-items-center gap-2">
                          <Mail size={14} />
                          Email
                        </div>
                        <div className="settings-info-value">
                          {profile.contact_email || 'N/A'}
                        </div>
                      </div>

                      <div className="settings-info-card">
                        <div className="settings-info-label d-flex align-items-center gap-2">
                          <Phone size={14} />
                          Phone
                        </div>
                        <div className="settings-info-value">
                          {profile.contact_phone || 'N/A'}
                        </div>
                      </div>

                      <div className="settings-info-card">
                        <div className="settings-info-label d-flex align-items-center gap-2">
                          <Globe size={14} />
                          Website
                        </div>

                        {profile.website_url ? (
                          <a
                            href={profile.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="settings-info-value text-decoration-none d-inline-block"
                          >
                            {profile.website_url}
                          </a>
                        ) : (
                          <div className="settings-info-value">N/A</div>
                        )}
                      </div>

                      <div className="settings-info-card">
                        <div className="settings-info-label d-flex align-items-center gap-2">
                          <MapPin size={14} />
                          Address
                        </div>
                        <p className="settings-muted-value">
                          {profile.address || 'N/A'}
                        </p>
                      </div>

                      <div className="settings-info-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="settings-info-label">
                          Institution Description
                        </div>
                        <p className="settings-muted-value">
                          {profile.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </InstitutionWorkspacePage>
  );
};

export default InstitutionSettings;
