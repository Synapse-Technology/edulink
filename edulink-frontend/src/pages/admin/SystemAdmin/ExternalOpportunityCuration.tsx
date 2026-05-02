import React, { useState } from 'react';
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setPublishing(true);
      const opportunity = await internshipService.createOpportunity({
        title: formData.title,
        description: formData.description,
        department: formData.department,
        skills: formData.skills.split(',').map(skill => skill.trim()).filter(Boolean),
        location: formData.location,
        location_type: formData.location_type,
        duration: formData.duration,
        application_deadline: formData.application_deadline || undefined,
        application_mode: 'EXTERNAL',
        origin: 'ADMIN_CURATED_EXTERNAL',
        external_employer_name: formData.external_employer_name,
        external_source_name: formData.external_source_name,
        external_apply_url: formData.external_apply_url,
        external_reference: formData.external_reference,
      });
      await internshipService.publishOpportunity(opportunity.id);
      showToast.success('External opportunity published.');
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
      showToast.error(sanitized.userMessage || 'Failed to publish external opportunity.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">Curate External Opportunity</h1>
        <p className="text-muted mb-0">Post verified internships or attachments found on trusted external portals. Students apply on the source site.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label">Opportunity title</label>
                <input className="form-control" name="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Employer name</label>
                <input className="form-control" name="external_employer_name" value={formData.external_employer_name} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Source name</label>
                <input className="form-control" name="external_source_name" value={formData.external_source_name} onChange={handleChange} placeholder="e.g. BrighterMonday, company careers page" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Apply URL</label>
                <input type="url" className="form-control" name="external_apply_url" value={formData.external_apply_url} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">External reference</label>
                <input className="form-control" name="external_reference" value={formData.external_reference} onChange={handleChange} placeholder="Job ID or slug if available" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Application deadline</label>
                <input type="datetime-local" className="form-control" name="application_deadline" value={formData.application_deadline} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={5} name="description" value={formData.description} onChange={handleChange} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Department/category</label>
                <input className="form-control" name="department" value={formData.department} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Skills</label>
                <input className="form-control" name="skills" value={formData.skills} onChange={handleChange} placeholder="Comma separated" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Duration</label>
                <input className="form-control" name="duration" value={formData.duration} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Location</label>
                <input className="form-control" name="location" value={formData.location} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Work mode</label>
                <select className="form-select" name="location_type" value={formData.location_type} onChange={handleChange}>
                  <option value="ONSITE">On-site</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary mt-4" disabled={publishing}>
              {publishing ? 'Publishing...' : 'Publish External Opportunity'}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ExternalOpportunityCuration;
