import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SupervisorLayout from '../../../../components/admin/employer/supervisor/SupervisorLayout';
import { useAuth } from '../../../../contexts/AuthContext';
import { employerService, type EmployerStaffProfileRequestCreate } from '../../../../services/employer/employerService';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../../components/common';

const SupervisorProfile: React.FC = () => {
  const { user } = useAuth();
  const { feedbackProps } = useFeedbackModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<EmployerStaffProfileRequestCreate>({
    defaultValues: {
      first_name: user?.firstName || '',
      last_name: user?.lastName || '',
      email: user?.email || '',
    }
  });

  const onSubmit = async (data: EmployerStaffProfileRequestCreate) => {
    // Check if data is different from current
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
      toast.success('Profile update request submitted successfully. An admin will review your changes.');
      // Optional: Reset form or keep it? Keeping it shows what they requested.
    } catch (error: any) {
      console.error('Failed to submit profile update request:', error);
      // Backend returns validation errors in detail usually
      const message = error.response?.data?.detail || 'Failed to submit request';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SupervisorLayout>
      <div className="container-fluid p-0">
        <h2 className="fw-bold text-dark mb-4">My Profile</h2>

        <div className="row">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3 border-bottom">
                <h5 className="card-title mb-0 fw-bold">Personal Details</h5>
              </div>
              <div className="card-body p-4">
                <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                  <AlertCircle className="flex-shrink-0 me-2" size={20} />
                  <div>
                    Changes to your profile details require approval from an institution administrator.
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <User size={18} className="text-muted" />
                        </span>
                        <input
                          type="text"
                          className={`form-control border-start-0 ps-0 ${errors.first_name ? 'is-invalid' : ''}`}
                          {...register('first_name', { required: 'First name is required' })}
                        />
                      </div>
                      {errors.first_name && <div className="invalid-feedback d-block">{errors.first_name.message}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <User size={18} className="text-muted" />
                        </span>
                        <input
                          type="text"
                          className={`form-control border-start-0 ps-0 ${errors.last_name ? 'is-invalid' : ''}`}
                          {...register('last_name', { required: 'Last name is required' })}
                        />
                      </div>
                      {errors.last_name && <div className="invalid-feedback d-block">{errors.last_name.message}</div>}
                    </div>

                    <div className="col-12">
                      <label className="form-label">Email Address</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <Mail size={18} className="text-muted" />
                        </span>
                        <input
                          type="email"
                          className={`form-control border-start-0 ps-0 ${errors.email ? 'is-invalid' : ''}`}
                          {...register('email', { 
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: "Invalid email address"
                            }
                          })}
                        />
                      </div>
                      {errors.email && <div className="invalid-feedback d-block">{errors.email.message}</div>}
                    </div>

                    <div className="col-12 mt-4">
                      <button 
                        type="submit" 
                        className="btn btn-primary d-flex align-items-center"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Submitting Request...
                          </>
                        ) : (
                          <>
                            <Save size={18} className="me-2" />
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

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm bg-light">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Account Information</h6>
                <div className="mb-3">
                  <small className="text-muted d-block">Role</small>
                  <span className="fw-medium">Supervisor</span>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block">Status</small>
                  <span className="badge bg-success bg-opacity-10 text-success">Active</span>
                </div>
                <div className="mb-0">
                  <small className="text-muted d-block">Joined</small>
                  <span className="fw-medium">{new Date().toLocaleDateString()}</span> {/* Placeholder for joined date if not available */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeedbackModal {...feedbackProps} />
    </SupervisorLayout>
  );
};

export default SupervisorProfile;
