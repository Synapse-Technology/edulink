import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Lock, ShieldAlert, Save, Eye, EyeOff } from 'lucide-react';
import { EmployerLayout } from '../../../components/admin/employer';
import { authService } from '../../../services/auth/authService';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const EmployerSettings: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  
  const navigate = useNavigate();

  const { 
    register: registerPassword, 
    handleSubmit: handleSubmitPassword, 
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors }
  } = useForm();

  const onChangePassword = async (data: any) => {
    try {
      setIsChangingPassword(true);
      await authService.changePassword({
        old_password: data.currentPassword,
        new_password: data.newPassword,
        new_password_confirm: data.confirmPassword
      });
      toast.success('Password changed successfully');
      resetPassword();
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onDeactivateAccount = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account? This action cannot be undone immediately.')) {
      return;
    }

    try {
      setIsDeactivating(true);
      await authService.deactivateAccount(deactivateReason);
      toast.success('Account deactivated successfully');
      authService.logout(); // Logout after deactivation
      navigate('/employer/login');
    } catch (error: any) {
      console.error('Failed to deactivate account:', error);
      toast.error(error.message || 'Failed to deactivate account');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="row mb-4">
          <div className="col-12">
            <h2 className="fw-bold text-dark">Settings</h2>
            <p className="text-muted">Manage your security preferences and account settings</p>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            {/* Change Password Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white p-4 border-bottom-0">
                <div className="d-flex align-items-center">
                  <div className="bg-light rounded-circle p-2 me-3">
                    <Lock size={20} className="text-primary" />
                  </div>
                  <h5 className="mb-0">Change Password</h5>
                </div>
              </div>
              <div className="card-body p-4 pt-0">
                <form onSubmit={handleSubmitPassword(onChangePassword)}>
                  <div className="mb-3">
                    <label className="form-label">Current Password</label>
                    <div className="input-group">
                      <input 
                        type={showCurrentPassword ? "text" : "password"} 
                        className={`form-control ${passwordErrors.currentPassword ? 'is-invalid' : ''}`}
                        {...registerPassword('currentPassword', { required: 'Current password is required' })}
                      />
                      <button 
                        className="btn btn-outline-secondary" 
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <div className="invalid-feedback d-block">{passwordErrors.currentPassword.message as string}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">New Password</label>
                    <div className="input-group">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        className={`form-control ${passwordErrors.newPassword ? 'is-invalid' : ''}`}
                        {...registerPassword('newPassword', { 
                          required: 'New password is required',
                          minLength: { value: 8, message: 'Password must be at least 8 characters' }
                        })}
                      />
                      <button 
                        className="btn btn-outline-secondary" 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <div className="invalid-feedback d-block">{passwordErrors.newPassword.message as string}</div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Confirm New Password</label>
                    <div className="input-group">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        className={`form-control ${passwordErrors.confirmPassword ? 'is-invalid' : ''}`}
                        {...registerPassword('confirmPassword', { 
                          required: 'Please confirm your password',
                          validate: (val: string) => {
                            if (watch('newPassword') != val) {
                              return "Your passwords do no match";
                            }
                          }
                        })}
                      />
                      <button 
                        className="btn btn-outline-secondary" 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <div className="invalid-feedback d-block">{passwordErrors.confirmPassword.message as string}</div>
                    )}
                  </div>

                  <div className="d-flex justify-content-end">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <Save size={18} className="me-2" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Deactivate Account Card */}
            <div className="card border-0 shadow-sm border-danger border-start border-3">
              <div className="card-header bg-white p-4 border-bottom-0">
                <div className="d-flex align-items-center">
                  <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-3">
                    <ShieldAlert size={20} className="text-danger" />
                  </div>
                  <h5 className="mb-0 text-danger">Deactivate Account</h5>
                </div>
              </div>
              <div className="card-body p-4 pt-0">
                <p className="text-muted mb-4">
                  Deactivating your account will disable your access to the platform. Your data will be preserved but you won't be able to log in.
                  If you are the only admin for this employer, the employer profile might become inaccessible.
                </p>
                
                <div className="mb-3">
                  <label className="form-label">Reason for leaving (Optional)</label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    placeholder="Please tell us why you are leaving..."
                  ></textarea>
                </div>

                <div className="d-flex justify-content-end">
                  <button 
                    className="btn btn-outline-danger"
                    onClick={onDeactivateAccount}
                    disabled={isDeactivating}
                  >
                    {isDeactivating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Deactivating...
                      </>
                    ) : (
                      'Deactivate Account'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm bg-light">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Security Tips</h6>
                <ul className="list-unstyled text-muted small mb-0">
                  <li className="mb-2 d-flex">
                    <span className="me-2">•</span>
                    Use a strong password with at least 8 characters, including numbers and symbols.
                  </li>
                  <li className="mb-2 d-flex">
                    <span className="me-2">•</span>
                    Don't share your password with anyone.
                  </li>
                  <li className="mb-2 d-flex">
                    <span className="me-2">•</span>
                    If you suspect unauthorized access, change your password immediately.
                  </li>
                  <li className="d-flex">
                    <span className="me-2">•</span>
                    Contact support if you have trouble accessing your account.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EmployerLayout>
  );
};

export default EmployerSettings;
