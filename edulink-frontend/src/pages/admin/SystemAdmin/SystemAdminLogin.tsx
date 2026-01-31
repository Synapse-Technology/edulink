import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertCircle, LogIn, Building2, Lock } from 'lucide-react';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

const SystemAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Frontend validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Password length validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard/admin');
    } catch (err) {
      let errorMessage = 'Invalid email or password. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Improve user-friendliness for common errors
        if (errorMessage.toLowerCase().includes('network error') || errorMessage.toLowerCase().includes('failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (errorMessage === 'Login failed') {
            errorMessage = 'Invalid credentials. Please check your email and password.';
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center py-3">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-4 col-lg-5 col-md-7">
            {/* Login Card */}
            <div className="card shadow border-0 rounded-lg">
              {/* Card Header */}
              <div className="card-header bg-primary text-white py-2">
                <div className="text-center mb-1">
                  <div className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle p-1 mb-1">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <h1 className="h6 mb-0">Staff Admin Portal</h1>
                  <p className="small mb-0 opacity-75">
                    <Building2 size={12} className="me-1" />
                    Secure Access
                  </p>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="card-body p-3 p-md-4">
                {/* Alert Message */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                    <AlertCircle size={16} className="me-2 flex-shrink-0" />
                    <div className="small">{error}</div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                  {/* Email Input */}
                  <div className="mb-2">
                    <label htmlFor="email" className="form-label fw-semibold small">
                      <span className="text-primary">*</span> Staff Email
                    </label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light">
                        <svg width="14" height="14" fill="currentColor" className="text-muted" viewBox="0 0 16 16">
                          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                        </svg>
                      </span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="form-control form-control-sm"
                        placeholder="staff@org.com"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label fw-semibold small">
                      <span className="text-primary">*</span> Password
                    </label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light">
                        <Lock size={16} className="text-muted" />
                      </span>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="form-control"
                        placeholder="Enter password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="input-group-text bg-light"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff size={16} className="text-muted" />
                        ) : (
                          <Eye size={16} className="text-muted" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="form-check">
                      <input
                        id="rememberMe"
                        type="checkbox"
                        className="form-check-input form-check-input-sm"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isLoading}
                      />
                      <label htmlFor="rememberMe" className="form-check-label small">
                        Keep me signed in
                      </label>
                    </div>
                    <div>
                      <a href="/admin/forgot-password" className="text-decoration-none small text-primary">
                        Forgot Password?
                      </a>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="d-grid gap-2 mb-3">
                    <button
                      type="submit"
                      disabled={isLoading || !formData.email || !formData.password}
                      className="btn btn-primary btn-sm fw-semibold"
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <LogIn size={16} className="me-2" />
                          Sign In
                        </>
                      )}
                    </button>
                  </div>

                  {/* Security Notice */}
                  <div className="alert alert-light border small mb-0 py-2">
                    <div className="d-flex">
                      <Shield size={14} className="text-primary me-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong className="d-block small mb-1">Security Notice:</strong>
                        <p className="mb-0 small">
                          Authorized staff only. Activities are monitored.
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Card Footer */}
              <div className="card-footer bg-light py-3">
                <div className="d-flex justify-content-between align-items-center small">
                  <a href="/" className="text-decoration-none text-muted">
                    ← Return to Main Site
                  </a>
                  <span className="text-muted">
                    v1.0.0 • {new Date().getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="text-center mt-4">
              <p className="small text-muted">
                Need assistance? Contact IT Support at{' '}
                <a href="mailto:support@organization.com" className="text-decoration-none">
                  support@edulink.com
                </a>
                <br />
                <span className="d-inline-flex align-items-center mt-1">
                  <svg width="12" height="12" fill="currentColor" className="text-success me-1" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="8"/>
                  </svg>
                  System Status: <strong className="text-success ms-1">Operational</strong>
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="position-fixed top-0 end-0 bottom-0 start-0 bg-pattern opacity-10"></div>
      
      <style>{`
        .bg-pattern {
          background-image: radial-gradient(#007bff33 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
        }
        
        .card {
          border: 1px solid rgba(0,0,0,0.1);
          transition: transform 0.2s ease-in-out;
        }
        
        .card:hover {
          transform: translateY(-2px);
        }
        
        .card-header {
          border-radius: 0.375rem 0.375rem 0 0 !important;
        }
        
        .form-control:focus {
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
        }
        
        .btn-primary:disabled {
          background-color: #86b7fe;
          border-color: #86b7fe;
        }
        
        .btn-primary:hover {
          background-color: #0056b3;
          border-color: #0056b3;
        }
        
        .btn-primary:active {
          background-color: #004085;
          border-color: #004085;
        }
      `}</style>
    </div>
  );
};

export default SystemAdminLogin;