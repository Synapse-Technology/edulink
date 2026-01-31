import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Mail, Globe, Phone, User, FileText, Save, X, Image as ImageIcon } from 'lucide-react';
import { EmployerLayout } from '../../../components/admin/employer';
import { employerService, type Employer } from '../../../services/employer/employerService';
import { toast } from 'react-hot-toast';

const EmployerProfile: React.FC = () => {
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Employer>>();

  useEffect(() => {
    fetchEmployerData();
  }, []);

  const fetchEmployerData = async () => {
    try {
      setIsLoading(true);
      const data = await employerService.getCurrentEmployer();
      setEmployer(data);
      setLogoPreview(data.logo || null);
      reset(data); // Initialize form with data
    } catch (error) {
      console.error('Failed to fetch employer profile:', error);
      toast.error('Failed to load company profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
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
        if (data.registration_number) formData.append('registration_number', data.registration_number);
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
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <EmployerLayout>
        <div className="container-fluid p-0">
          <div className="row mb-4">
            <div className="col-12">
              <div className="skeleton skeleton-title mb-2" style={{ width: '200px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '300px' }}></div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="skeleton skeleton-text w-25 mb-4"></div>
                    </div>
                    
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="col-md-6">
                        <div className="skeleton skeleton-text w-50 mb-2"></div>
                        <div className="skeleton skeleton-input"></div>
                      </div>
                    ))}
                    
                    <div className="col-12 mt-4">
                      <div className="skeleton skeleton-text w-25 mb-4"></div>
                    </div>

                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="col-md-6">
                        <div className="skeleton skeleton-text w-50 mb-2"></div>
                        <div className="skeleton skeleton-input"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
          }
          .skeleton-title { height: 24px; width: 120px; }
          .skeleton-text { height: 16px; }
          .skeleton-input { height: 38px; width: 100%; border-radius: 4px; }
          .w-25 { width: 25%; }
          .w-50 { width: 50%; }
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </EmployerLayout>
    );
  }

  if (!employer) {
    return (
      <EmployerLayout>
        <div className="alert alert-danger">Failed to load profile data.</div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="row mb-4">
          <div className="col-12 d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark">Company Profile</h2>
              <p className="text-muted">Manage your company information and settings</p>
            </div>
            {!isEditing && (
              <button 
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="row g-3">
                      <div className="col-12">
                        <h5 className="mb-3 text-primary">Basic Information</h5>
                      </div>

                      <div className="col-12 mb-4">
                         <div className="d-flex align-items-center gap-3">
                            <div className="position-relative">
                                {logoPreview ? (
                                    <img 
                                        src={logoPreview} 
                                        alt="Logo Preview" 
                                        className="rounded-circle object-fit-cover border"
                                        style={{ width: '100px', height: '100px' }}
                                    />
                                ) : (
                                    <div 
                                        className="rounded-circle bg-light d-flex flex-column align-items-center justify-content-center text-muted border" 
                                        style={{ width: '100px', height: '100px' }}
                                    >
                                         <ImageIcon size={24} className="mb-1" />
                                         <small style={{fontSize: '10px'}}>Not Customized</small>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="form-label">Company Logo</label>
                                <input 
                                    type="file" 
                                    className="form-control form-control-sm"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                />
                                <div className="form-text small">
                                    Recommended size: 200x200px. Max size: 2MB.
                                </div>
                            </div>
                         </div>
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label">Company Name</label>
                        <div className="input-group">
                          <span className="input-group-text"><Building2 size={18} /></span>
                          <input 
                            type="text" 
                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                            {...register('name', { required: 'Company name is required' })}
                          />
                        </div>
                        {errors.name && <div className="invalid-feedback d-block">{errors.name.message}</div>}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Organization Type</label>
                        <select 
                          className="form-select"
                          {...register('organization_type')}
                        >
                          <option value="COMPANY">Private Company</option>
                          <option value="GOVERNMENT">Government</option>
                          <option value="NGO">NGO</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Official Email</label>
                        <div className="input-group">
                          <span className="input-group-text"><Mail size={18} /></span>
                          <input 
                            type="email" 
                            className={`form-control ${errors.official_email ? 'is-invalid' : ''}`}
                            {...register('official_email', { 
                              required: 'Email is required',
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Invalid email address"
                              }
                            })}
                          />
                        </div>
                        {errors.official_email && <div className="invalid-feedback d-block">{errors.official_email.message}</div>}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Domain</label>
                        <div className="input-group">
                          <span className="input-group-text"><Globe size={18} /></span>
                          <input 
                            type="text" 
                            className="form-control"
                            {...register('domain')}
                          />
                        </div>
                      </div>

                      <div className="col-12 mt-4">
                        <h5 className="mb-3 text-primary">Contact Details</h5>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Contact Person</label>
                        <div className="input-group">
                          <span className="input-group-text"><User size={18} /></span>
                          <input 
                            type="text" 
                            className={`form-control ${errors.contact_person ? 'is-invalid' : ''}`}
                            {...register('contact_person', { required: 'Contact person is required' })}
                          />
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Phone Number</label>
                        <div className="input-group">
                          <span className="input-group-text"><Phone size={18} /></span>
                          <input 
                            type="text" 
                            className="form-control"
                            {...register('phone_number')}
                          />
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Website URL</label>
                        <div className="input-group">
                          <span className="input-group-text"><Globe size={18} /></span>
                          <input 
                            type="url" 
                            className="form-control"
                            {...register('website_url')}
                            placeholder="https://"
                          />
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Registration Number</label>
                        <div className="input-group">
                          <span className="input-group-text"><FileText size={18} /></span>
                          <input 
                            type="text" 
                            className="form-control"
                            {...register('registration_number')}
                          />
                        </div>
                      </div>

                      <div className="col-12 mt-4 d-flex justify-content-end gap-2">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            reset(employer);
                            setIsEditing(false);
                          }}
                          disabled={isSaving}
                        >
                          <X size={18} className="me-2" />
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={18} className="me-2" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="row g-4">
                    <div className="col-12">
                      <div className="d-flex align-items-center mb-4">
                        <div className="me-3">
                           {employer.logo ? (
                                <img 
                                    src={employer.logo} 
                                    alt="Company Logo" 
                                    className="rounded-circle object-fit-cover border"
                                    style={{ width: '80px', height: '80px' }}
                                />
                            ) : (
                                <div 
                                    className="rounded-circle bg-light d-flex flex-column align-items-center justify-content-center text-muted border p-1 text-center" 
                                    style={{ width: '80px', height: '80px' }}
                                >
                                     <ImageIcon size={20} className="mb-1" />
                                     <small style={{fontSize: '8px', lineHeight: '1.2'}}>Not Customized</small>
                                </div>
                            )}
                        </div>
                        <div>
                          <h4 className="mb-1">{employer.name}</h4>
                          <span className="badge bg-primary bg-opacity-10 text-primary">
                            {employer.organization_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small fw-bold mb-3">Organization Details</h6>
                      <div className="mb-3">
                        <label className="small text-muted d-block">Type</label>
                        <span className="fw-medium">{employer.organization_type}</span>
                      </div>
                      <div className="mb-3">
                        <label className="small text-muted d-block">Registration Number</label>
                        <span className="fw-medium">{employer.registration_number || 'N/A'}</span>
                      </div>
                      <div className="mb-3">
                        <label className="small text-muted d-block">Domain</label>
                        <span className="fw-medium">{employer.domain}</span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <h6 className="text-muted text-uppercase small fw-bold mb-3">Contact Information</h6>
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-1">
                          <User size={16} className="text-muted me-2" />
                          <label className="small text-muted">Contact Person</label>
                        </div>
                        <span className="fw-medium ms-4">{employer.contact_person}</span>
                      </div>
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-1">
                          <Mail size={16} className="text-muted me-2" />
                          <label className="small text-muted">Email</label>
                        </div>
                        <span className="fw-medium ms-4">{employer.official_email}</span>
                      </div>
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-1">
                          <Phone size={16} className="text-muted me-2" />
                          <label className="small text-muted">Phone</label>
                        </div>
                        <span className="fw-medium ms-4">{employer.phone_number || 'N/A'}</span>
                      </div>
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-1">
                          <Globe size={16} className="text-muted me-2" />
                          <label className="small text-muted">Website</label>
                        </div>
                        {employer.website_url ? (
                          <a href={employer.website_url} target="_blank" rel="noopener noreferrer" className="ms-4 text-decoration-none">
                            {employer.website_url}
                          </a>
                        ) : (
                          <span className="fw-medium ms-4">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h5 className="card-title mb-4">Account Status</h5>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted">Status</span>
                  <span className={`badge bg-${employer.status === 'ACTIVE' ? 'success' : employer.status === 'REJECTED' ? 'danger' : 'warning'}`}>
                    {employer.status}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted">Member Since</span>
                  <span className="fw-medium">{new Date(employer.created_at).toLocaleDateString()}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Last Updated</span>
                  <span className="fw-medium">{new Date(employer.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm bg-primary text-white">
              <div className="card-body p-4">
                <h5 className="card-title mb-3">Need Help?</h5>
                <p className="card-text opacity-75 mb-4">
                  Contact our support team if you need to change sensitive information or have questions about your account.
                </p>
                <button className="btn btn-light text-primary fw-medium w-100">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerProfile;
