import React, { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  MapPin,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react';

import AdminLayout from '../../../components/admin/AdminLayout';
import { internshipService } from '../../../services/internship/internshipService';
import { showToast } from '../../../utils/toast';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const ExternalOpportunityCuration: React.FC = () => {
  const [publishing, setPublishing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    external_employer_name: '',
    external_source_name: '',
    external_apply_url: '',
    external_reference: '',
    description: '',
    department: '',
    skills: '',
    location: '',
    location_type: 'ONSITE' as 'ONSITE' | 'REMOTE' | 'HYBRID',
    duration: '',
    application_deadline: '',
  });

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setPublishing(true);

      const opportunity = await internshipService.createOpportunity({
        title: formData.title,
        description: formData.description,
        department: formData.department,
        skills: formData.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        location: formData.location,
        location_type: formData.location_type,
        duration: formData.duration,
        application_deadline:
          formData.application_deadline || undefined,
        application_mode: 'EXTERNAL',
        origin: 'ADMIN_CURATED_EXTERNAL',
        external_employer_name:
          formData.external_employer_name,
        external_source_name:
          formData.external_source_name,
        external_apply_url:
          formData.external_apply_url,
        external_reference:
          formData.external_reference,
      });

      await internshipService.publishOpportunity(opportunity.id);

      showToast.success(
        'External opportunity published successfully.',
      );

      setFormData({
        title: '',
        external_employer_name: '',
        external_source_name: '',
        external_apply_url: '',
        external_reference: '',
        description: '',
        department: '',
        skills: '',
        location: '',
        location_type: 'ONSITE',
        duration: '',
        application_deadline: '',
      });
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);

      showToast.error(
        sanitized.userMessage ||
          'Failed to publish external opportunity.',
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="external-curation-page">
        {/* Header */}
        <header className="curation-header">
          <div>
            <span className="curation-kicker">
              <ShieldCheck size={14} />
              Platform opportunity curation
            </span>

            <h1>External Opportunity Publishing</h1>

            <p>
              Publish verified internships and attachments
              sourced from trusted employer portals,
              recruitment platforms, and partner websites.
            </p>
          </div>

          <div className="curation-badge">
            <CheckCircle2 size={16} />
            Trust moderated publishing
          </div>
        </header>

        {/* Top Insights */}
        <section className="curation-insights">
          <article>
            <div className="insight-icon blue">
              <ShieldCheck size={20} />
            </div>

            <strong>Verified Sources</strong>

            <span>
              Only publish opportunities from trusted
              organizations or recognized platforms.
            </span>
          </article>

          <article>
            <div className="insight-icon emerald">
              <Sparkles size={20} />
            </div>

            <strong>Student Safe</strong>

            <span>
              Reduce fake listings and improve internship
              application quality.
            </span>
          </article>

          <article>
            <div className="insight-icon amber">
              <AlertTriangle size={20} />
            </div>

            <strong>Review Carefully</strong>

            <span>
              Published opportunities become visible across
              the platform immediately.
            </span>
          </article>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="curation-layout">
            {/* Main Form */}
            <section className="curation-main">
              {/* Opportunity Information */}
              <div className="curation-card">
                <div className="card-heading">
                  <div>
                    <span>Opportunity details</span>
                    <h2>Role Information</h2>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field full">
                    <label>
                      <Briefcase size={15} />
                      Opportunity title
                    </label>

                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g Software Engineering Intern"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>
                      <Building2 size={15} />
                      Employer name
                    </label>

                    <input
                      type="text"
                      name="external_employer_name"
                      value={formData.external_employer_name}
                      onChange={handleChange}
                      placeholder="Organization name"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>
                      <Globe size={15} />
                      Source platform
                    </label>

                    <input
                      type="text"
                      name="external_source_name"
                      value={formData.external_source_name}
                      onChange={handleChange}
                      placeholder="e.g BrighterMonday"
                    />
                  </div>

                  <div className="field full">
                    <label>
                      <ExternalLink size={15} />
                      External application URL
                    </label>

                    <input
                      type="url"
                      name="external_apply_url"
                      value={formData.external_apply_url}
                      onChange={handleChange}
                      placeholder="https://..."
                      required
                    />
                  </div>

                  <div className="field">
                    <label>
                      <Link2 size={15} />
                      External reference
                    </label>

                    <input
                      type="text"
                      name="external_reference"
                      value={formData.external_reference}
                      onChange={handleChange}
                      placeholder="Job ID or reference"
                    />
                  </div>

                  <div className="field">
                    <label>
                      <Calendar size={15} />
                      Application deadline
                    </label>

                    <input
                      type="datetime-local"
                      name="application_deadline"
                      value={formData.application_deadline}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field full">
                    <label>Description</label>

                    <textarea
                      rows={7}
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Provide a concise but informative opportunity summary..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="curation-card">
                <div className="card-heading">
                  <div>
                    <span>Classification</span>
                    <h2>Opportunity Metadata</h2>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="field">
                    <label>Department / Category</label>

                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g Software Engineering"
                    />
                  </div>

                  <div className="field">
                    <label>Duration</label>

                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="e.g 3 months"
                    />
                  </div>

                  <div className="field">
                    <label>
                      <MapPin size={15} />
                      Location
                    </label>

                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g Nairobi"
                    />
                  </div>

                  <div className="field">
                    <label>Work mode</label>

                    <select
                      name="location_type"
                      value={formData.location_type}
                      onChange={handleChange}
                    >
                      <option value="ONSITE">
                        On-site
                      </option>

                      <option value="HYBRID">
                        Hybrid
                      </option>

                      <option value="REMOTE">
                        Remote
                      </option>
                    </select>
                  </div>

                  <div className="field full">
                    <label>Skills</label>

                    <input
                      type="text"
                      name="skills"
                      value={formData.skills}
                      onChange={handleChange}
                      placeholder="React, UI Design, Communication..."
                    />

                    <small>
                      Separate skills using commas.
                    </small>
                  </div>
                </div>
              </div>
            </section>

            {/* Sidebar */}
            <aside className="curation-sidebar">
              <div className="sidebar-card">
                <span className="sidebar-label">
                  Publishing mode
                </span>

                <h3>External curated listing</h3>

                <p>
                  Students will apply externally using the
                  source application link provided.
                </p>

                <div className="sidebar-meta">
                  <div>
                    <span>Visibility</span>
                    <strong>Public</strong>
                  </div>

                  <div>
                    <span>Origin</span>
                    <strong>
                      Admin curated
                    </strong>
                  </div>

                  <div>
                    <span>Application flow</span>
                    <strong>External redirect</strong>
                  </div>
                </div>
              </div>

              <div className="sidebar-card warning">
                <div className="warning-header">
                  <AlertTriangle size={18} />
                  <strong>Verification reminder</strong>
                </div>

                <ul>
                  <li>
                    Verify the employer domain before
                    publishing.
                  </li>

                  <li>
                    Avoid suspicious shortened links.
                  </li>

                  <li>
                    Ensure internship details are accurate.
                  </li>

                  <li>
                    Reject unclear or misleading listings.
                  </li>
                </ul>
              </div>

              <div className="sidebar-card">
                <div className="preview-header">
                  <TimerReset size={16} />
                  <span>Quick preview</span>
                </div>

                <div className="preview-card">
                  <h4>
                    {formData.title ||
                      'Opportunity title'}
                  </h4>

                  <p>
                    {formData.external_employer_name ||
                      'Employer name'}
                  </p>

                  <div className="preview-tags">
                    {formData.department && (
                      <span>
                        {formData.department}
                      </span>
                    )}

                    {formData.location_type && (
                      <span>
                        {formData.location_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="publish-btn"
                disabled={publishing}
              >
                {publishing
                  ? 'Publishing opportunity...'
                  : 'Publish External Opportunity'}
              </button>
            </aside>
          </div>
        </form>
      </div>

      <style>{`
        .external-curation-page {
          color: #111827;
        }

        .curation-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .curation-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 10px;
        }

        .curation-kicker svg {
          color: #047857;
        }

        .curation-header h1 {
          font-size: clamp(2rem, 3vw, 2.8rem);
          font-weight: 900;
          letter-spacing: -.06em;
          color: #0f172a;
          margin-bottom: 10px;
        }

        .curation-header p {
          max-width: 760px;
          color: #64748b;
          line-height: 1.7;
          margin: 0;
        }

        .curation-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: .82rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .curation-insights {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .curation-insights article,
        .curation-card,
        .sidebar-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 28px rgba(15,23,42,.04);
        }

        .curation-insights article {
          border-radius: 18px;
          padding: 18px;
        }

        .insight-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .emerald {
          background: #ecfdf5;
          color: #047857;
        }

        .amber {
          background: #fffbeb;
          color: #b45309;
        }

        .curation-insights strong {
          display: block;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .curation-insights span {
          color: #64748b;
          font-size: .88rem;
          line-height: 1.6;
        }

        .curation-layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) 340px;
          gap: 20px;
        }

        .curation-main {
          display: grid;
          gap: 20px;
        }

        .curation-card,
        .sidebar-card {
          border-radius: 22px;
        }

        .curation-card {
          padding: 22px;
        }

        .card-heading {
          margin-bottom: 22px;
        }

        .card-heading span {
          display: block;
          font-size: .72rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #64748b;
          margin-bottom: 6px;
        }

        .card-heading h2 {
          font-size: 1.15rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #334155;
          font-size: .82rem;
          font-weight: 800;
        }

        .field input,
        .field textarea,
        .field select {
          width: 100%;
          border: 1px solid #dbe3ea;
          background: #fff;
          border-radius: 14px;
          padding: 13px 14px;
          font: inherit;
          color: #0f172a;
          outline: none;
        }

        .field textarea {
          resize: vertical;
        }

        .field small {
          color: #94a3b8;
          font-size: .75rem;
        }

        .curation-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-card {
          padding: 18px;
        }

        .sidebar-label {
          display: inline-block;
          font-size: .7rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 10px;
        }

        .sidebar-card h3 {
          font-size: 1rem;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 10px;
        }

        .sidebar-card p {
          color: #64748b;
          line-height: 1.6;
          font-size: .88rem;
        }

        .sidebar-meta {
          margin-top: 16px;
          display: grid;
          gap: 12px;
        }

        .sidebar-meta div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #e5e7eb;
        }

        .sidebar-meta span {
          color: #64748b;
          font-size: .8rem;
        }

        .sidebar-meta strong {
          color: #0f172a;
          font-size: .82rem;
        }

        .warning {
          border-color: #fde68a;
          background: #fffbeb;
        }

        .warning-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #b45309;
          font-weight: 900;
          margin-bottom: 14px;
        }

        .warning ul {
          padding-left: 18px;
          margin: 0;
          color: #92400e;
          display: grid;
          gap: 10px;
          font-size: .84rem;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: .8rem;
          font-weight: 800;
          color: #64748b;
          margin-bottom: 14px;
        }

        .preview-card {
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          padding: 16px;
        }

        .preview-card h4 {
          font-size: .95rem;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .preview-card p {
          font-size: .84rem;
          color: #64748b;
          margin-bottom: 14px;
        }

        .preview-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .preview-tags span {
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #dbe3ea;
          padding: 6px 10px;
          font-size: .72rem;
          font-weight: 800;
          color: #334155;
        }

        .publish-btn {
          min-height: 52px;
          border: 0;
          border-radius: 16px;
          background: #0f172a;
          color: #ffffff;
          font-weight: 900;
          cursor: pointer;
          transition: .2s ease;
        }

        .publish-btn:hover {
          transform: translateY(-1px);
        }

        .publish-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        @media (max-width: 1100px) {
          .curation-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .curation-header {
            flex-direction: column;
          }

          .curation-insights {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default ExternalOpportunityCuration;