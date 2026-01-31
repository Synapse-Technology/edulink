import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertCircle, User, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import adminAuthService from '../../../services/auth/adminAuthService';

const AcceptInvite: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
    }
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing invitation token');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await adminAuthService.acceptInvite({
        token,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/login');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to accept invitation. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center py-3">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-5 col-lg-6 col-md-8">
              <div className="card shadow border-0 rounded-lg text-center p-5">
                <div className="mb-4">
                  <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded-circle p-3 mb-3">
                    <CheckCircle size={48} className="text-success" />
                  </div>
                  <h2 className="h4 mb-2">Account Setup Complete!</h2>
                  <p className="text-muted mb-0">
                    Your account has been successfully created. Redirecting you to the login page...
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/admin/login')} 
                  className="btn btn-primary w-100"
                >
                  Go to Login <ArrowRight size={16} className="ms-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center py-3">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-5 col-lg-6 col-md-8">
            <div className="card shadow border-0 rounded-lg">
              <div className="card-header bg-primary text-white py-3">
                <div className="text-center">
                  <div className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle p-2 mb-2">
                    <Shield size={24} className="text-primary" />
                  </div>
                  <h1 className="h5 mb-0">Complete Your Profile</h1>
                  <p className="small mb-0 opacity-75">
                    Set up your admin account details
                  </p>
                </div>
              </div>

              <div className="card-body p-4">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                    <AlertCircle size={20} className="me-2 flex-shrink-0" />
                    <div>{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">First Name</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <User size={18} className="text-muted" />
                        </span>
                        <input
                          type="text"
                          name="firstName"
                          className="form-control border-start-0 ps-0"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted">Last Name</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <User size={18} className="text-muted" />
                        </span>
                        <input
                          type="text"
                          name="lastName"
                          className="form-control border-start-0 ps-0"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Create Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <Lock size={18} className="text-muted" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        className="form-control border-start-0 border-end-0 ps-0"
                        placeholder="At least 8 characters"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="btn btn-light border border-start-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-muted">Confirm Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <Lock size={18} className="text-muted" />
                      </span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        className="form-control border-start-0 border-end-0 ps-0"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-light border border-start-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 py-2 fw-bold"
                    disabled={isLoading || !token}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Setting up account...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  export default AcceptInvite;
