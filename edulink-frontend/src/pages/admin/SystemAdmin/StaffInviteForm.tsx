import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Shield, AlertCircle, CheckCircle, ArrowLeft, Key, Lock, UserCheck, Eye, Crown } from 'lucide-react';
import { adminAuthService } from '../../../services/auth/adminAuthService';
import AdminLayout from '../../../components/admin/AdminLayout';

interface InviteFormData {
  email: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR';
  message?: string;
}

const StaffInviteForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    role: 'MODERATOR',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [activeRole, setActiveRole] = useState<'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MODERATOR' | 'AUDITOR'>('MODERATOR');
  const [isHovered, setIsHovered] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (name === 'role') {
      setActiveRole(value as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email) {
      setError('Email address is required');
      return;
    }

    setIsLoading(true);

    try {
      await adminAuthService.inviteStaff(formData);

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/staff');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const roleConfigs = {
    SUPER_ADMIN: {
      title: 'Super Administrator',
      icon: Crown,
      color: 'danger',
      description: 'Complete system access and control',
      permissions: [
        'Full platform administration',
        'User and institution management',
        'System configuration',
        'Staff role management',
        'Database administration',
        'API management'
      ]
    },
    PLATFORM_ADMIN: {
      title: 'Platform Administrator',
      icon: Shield,
      color: 'primary',
      description: 'Full platform administration access',
      permissions: [
        'User and institution management',
        'Content moderation',
        'System configuration',
        'Report management',
        'Basic analytics access'
      ]
    },
    MODERATOR: {
      title: 'Moderator',
      icon: UserCheck,
      color: 'success',
      description: 'Content moderation and user management',
      permissions: [
        'Content moderation',
        'User account management',
        'Report review and action',
        'Basic user support'
      ]
    },
    AUDITOR: {
      title: 'Auditor',
      icon: Eye,
      color: 'warning',
      description: 'Read-only access to system logs and analytics',
      permissions: [
        'Read-only system logs',
        'Analytics and reporting',
        'Audit trail review',
        'No modification capabilities'
      ]
    }
  };

  if (success) {
    return (
      <AdminLayout>
        <div className="d-flex align-items-center justify-content-center min-vh-100 py-5">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5">
            <div className="card border-0 shadow-lg text-center">
              <div className="card-body p-5">
                <div className="rounded-circle bg-success bg-opacity-10 p-4 d-inline-block mb-4">
                  <CheckCircle size={64} className="text-success" />
                </div>
                <h2 className="card-title h3 mb-3">Invitation Sent Successfully!</h2>
                <div className="alert alert-success bg-success bg-opacity-10 border border-success border-opacity-25 mb-4">
                  <p className="mb-0 fs-5">
                    An invitation has been sent to <strong>{formData.email}</strong>
                  </p>
                </div>
                <p className="text-muted mb-5 lead fs-6">
                  The recipient will receive an email with instructions to join the platform staff.
                  The invitation will expire in 7 days.
                </p>
                <div className="d-grid gap-3">
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => navigate('/admin/staff/invite')}
                  >
                    <UserPlus size={20} className="me-2" />
                    Send Another Invitation
                  </button>
                  <button 
                    className="btn btn-outline-secondary btn-lg"
                    onClick={() => navigate('/admin/staff')}
                  >
                    <ArrowLeft size={20} className="me-2" />
                    Back to Staff Management
                  </button>
                </div>
              </div>
              <div className="card-footer bg-transparent border-0 py-3">
                <p className="text-muted small mb-0">
                  Redirecting to staff management in 3 seconds...
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="container-fluid px-0 mb-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h1 className="h2 fw-bold mb-2">Invite Platform Staff</h1>
            <p className="text-muted lead fs-6 mb-0">Send invitation to new platform administrators</p>
          </div>
          <div>
            <button
              className="btn btn-outline-primary"
              onClick={() => navigate('/admin/staff')}
            >
              <ArrowLeft size={18} className="me-2" />
              Back to Staff
            </button>
          </div>
        </div>
      </div>

      <div className="row justify-content-center">
        {/* Widened container to col-12 for full width usage */}
        <div className="col-12"> 
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 p-4 p-md-5 pb-0">
              <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
                <div>
                  <h4 className="card-title h4 mb-2">New Staff Invitation</h4>
                  <p className="text-muted mb-0">
                    Send invitation to join platform administration team
                  </p>
                </div>
                <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                  <Shield size={16} className="me-2" />
                  Secure Invitation
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show mt-4" role="alert">
                  <div className="d-flex align-items-center">
                    <AlertCircle size={24} className="me-3 flex-shrink-0" />
                    <div>{error}</div>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}
            </div>

            <div className="card-body p-4 p-md-5">
              <form onSubmit={handleSubmit}>
                <div className="row g-5">
                  {/* Email Input */}
                  <div className="col-12">
                    <label className="form-label fw-bold fs-5 mb-3">
                      <Mail size={20} className="me-2 text-primary" />
                      Email Address
                    </label>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-white border-end-0">
                        <Mail size={20} className="text-muted" />
                      </span>
                      <input
                        type="email"
                        name="email"
                        className="form-control border-start-0 ps-0"
                        placeholder="staff.email@organization.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        style={{ boxShadow: 'none' }}
                      />
                    </div>
                    <div className="form-text mt-2 ms-1">
                      The invitation link will be sent to this email address
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="col-12">
                    <label className="form-label fw-bold fs-5 mb-4">
                      <Key size={20} className="me-2 text-primary" />
                      Role Assignment
                    </label>
                    <div className="row g-4">
                      {Object.entries(roleConfigs).map(([key, config]) => {
                        const Icon = config.icon;
                        const isActive = formData.role === key;
                        return (
                          <div key={key} className="col-12 col-md-6 col-lg-3">
                            <div 
                              className={`card cursor-pointer h-100 transition-all ${
                                isActive 
                                  ? 'border-primary shadow bg-primary bg-opacity-10' 
                                  : 'border-light hover-shadow'
                              }`}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, role: key as any }));
                                setActiveRole(key as any);
                              }}
                              style={{ 
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                transform: isActive ? 'translateY(-2px)' : 'none'
                              }}
                            >
                              <div className="card-body text-center p-4">
                                <div className={`rounded-circle bg-${config.color} bg-opacity-10 p-3 d-inline-block mb-3`}>
                                  <Icon size={28} className={`text-${config.color}`} />
                                </div>
                                <h6 className="fw-bold mb-2">{config.title}</h6>
                                <p className="text-muted small mb-0">{config.description}</p>
                                {isActive && (
                                  <div className="mt-3">
                                    <span className="badge bg-primary rounded-pill px-3">Selected</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Permissions Preview */}
                  <div className="col-12">
                    <div className="card border bg-light bg-opacity-25">
                      <div className="card-header bg-transparent border-bottom-0 pt-4 px-4">
                        <div className="d-flex align-items-center">
                          <Lock size={20} className="me-2 text-primary" />
                          <h5 className="mb-0 fw-bold">Role Permissions Preview</h5>
                        </div>
                      </div>
                      <div className="card-body p-4">
                        <div className="row g-4">
                          <div className="col-12 col-lg-8">
                            <div className="bg-white p-4 rounded border h-100">
                                <h6 className="mb-4 fw-bold text-dark border-bottom pb-2">
                                {roleConfigs[activeRole].title} <span className="text-muted fw-normal">- {roleConfigs[activeRole].description}</span>
                                </h6>
                                <div className="row g-3">
                                {roleConfigs[activeRole].permissions.map((permission, index) => (
                                    <div key={index} className="col-md-6">
                                    <div className="d-flex align-items-start">
                                        <div className="rounded-circle bg-success bg-opacity-10 p-1 me-2 mt-1 flex-shrink-0">
                                        <CheckCircle size={14} className="text-success" />
                                        </div>
                                        <span className="text-secondary">{permission}</span>
                                    </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                          </div>
                          <div className="col-12 col-lg-4">
                            <div className="card bg-white border h-100">
                              <div className="card-body p-4">
                                <h6 className="mb-4 fw-bold">Access Level</h6>
                                <div className="mb-4">
                                  <div className="d-flex justify-content-between mb-2">
                                    <span className="small fw-semibold text-muted">Security Level</span>
                                    <span className={`small fw-bold text-${roleConfigs[activeRole].color}`}>
                                        {activeRole === 'SUPER_ADMIN' ? 'Critical' : 
                                         activeRole === 'PLATFORM_ADMIN' ? 'High' :
                                         activeRole === 'MODERATOR' ? 'Medium' : 'Low'}
                                    </span>
                                  </div>
                                  <div className="progress" style={{height: '8px'}}>
                                      <div 
                                        className={`progress-bar bg-${roleConfigs[activeRole].color}`} 
                                        style={{
                                          width: activeRole === 'SUPER_ADMIN' ? '100%' : 
                                                 activeRole === 'PLATFORM_ADMIN' ? '80%' :
                                                 activeRole === 'MODERATOR' ? '60%' : '40%'
                                        }}
                                      ></div>
                                    </div>
                                </div>
                                <div className="d-flex flex-column gap-3">
                                  <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light">
                                    <span className="small text-muted">Read Access</span>
                                    <span className="badge bg-success bg-opacity-10 text-success rounded-pill">Full</span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light">
                                    <span className="small text-muted">Write Access</span>
                                    <span className={`badge bg-${activeRole === 'AUDITOR' ? 'warning' : 'success'} bg-opacity-10 text-${activeRole === 'AUDITOR' ? 'warning' : 'success'} rounded-pill`}>
                                      {activeRole === 'AUDITOR' ? 'None' : 'Full'}
                                    </span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light">
                                    <span className="small text-muted">Admin Access</span>
                                    <span className={`badge bg-${activeRole === 'AUDITOR' || activeRole === 'MODERATOR' ? 'warning' : 'success'} bg-opacity-10 text-${activeRole === 'AUDITOR' || activeRole === 'MODERATOR' ? 'warning' : 'success'} rounded-pill`}>
                                      {activeRole === 'AUDITOR' || activeRole === 'MODERATOR' ? 'Limited' : 'Full'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Message */}
                  <div className="col-12">
                    <label className="form-label fw-bold fs-5 mb-3">
                      <Mail size={20} className="me-2 text-primary" />
                      Personal Message (Optional)
                    </label>
                    <textarea
                      name="message"
                      className="form-control form-control-lg"
                      rows={5}
                      placeholder="Add a personal welcome message for the recipient..."
                      value={formData.message}
                      onChange={handleInputChange}
                    />
                    <div className="form-text mt-2">
                      This message will be included in the invitation email
                    </div>
                  </div>

                  {/* Security Guidelines */}
                  <div className="col-12">
                    <div className="alert alert-info bg-info bg-opacity-10 border border-info border-opacity-25 rounded-3 p-4">
                      <div className="d-flex">
                        <Shield size={24} className="me-4 flex-shrink-0 text-info mt-1" />
                        <div>
                          <h6 className="alert-heading fw-bold mb-3">Security Guidelines</h6>
                          <div className="row g-2">
                             <div className="col-md-6">
                                <ul className="mb-0 small ps-3">
                                    <li className="mb-2">Only invite trusted individuals who need platform access</li>
                                    <li className="mb-2">Assign the minimum role required for their responsibilities</li>
                                </ul>
                             </div>
                             <div className="col-md-6">
                                <ul className="mb-0 small ps-3">
                                    <li className="mb-2">Invitations expire after 7 days for security</li>
                                    <li>All invitation activities are logged for audit purposes</li>
                                </ul>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="col-12">
                    <div className="d-flex justify-content-end pt-4 border-top gap-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-lg px-4"
                        onClick={() => navigate('/admin/staff')}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg px-5"
                        disabled={isLoading}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{ 
                          minWidth: '200px',
                          opacity: isLoading ? 0.65 : 1,
                          backgroundColor: isHovered ? '#0b5ed7' : 'var(--bs-primary)',
                          borderColor: isHovered ? '#0a58ca' : 'var(--bs-primary)',
                          color: '#fff',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {isLoading ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <span className="spinner-border spinner-border-sm me-2 text-white" role="status"></span>
                            <span className="text-white">Sending...</span>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center">
                            <UserPlus size={18} className="me-2" />
                            <span>Send Invitation</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Invitation Details Footer */}
            <div className="card-footer bg-light bg-opacity-50 border-top p-4">
              <div className="row g-4 justify-content-center">
                <div className="col-md-5">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-start">
                    <div className="rounded-circle bg-white shadow-sm p-2 me-3">
                      <Mail size={20} className="text-primary" />
                    </div>
                    <div>
                      <div className="small fw-bold text-dark">Invitation Delivery</div>
                      <div className="small text-muted">Email sent immediately upon submission</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-5">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-start">
                    <div className="rounded-circle bg-white shadow-sm p-2 me-3">
                      <AlertCircle size={20} className="text-warning" />
                    </div>
                    <div>
                      <div className="small fw-bold text-dark">Expiration Period</div>
                      <div className="small text-muted">Valid for 7 days from invitation date</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StaffInviteForm;
