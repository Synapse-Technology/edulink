import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

// CSS Animations and Keyframes
const styles = `
  @keyframes slideInFromTop {
    from { 
      opacity: 0; 
      transform: translateY(-40px) scale(0.9) rotateX(10deg);
      filter: blur(4px);
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1) rotateX(0deg);
      filter: blur(0px);
    }
  }

  @keyframes slideOutToTop {
    from { 
      opacity: 1; 
      transform: translateY(0) scale(1) rotateX(0deg);
      filter: blur(0px);
    }
    to { 
      opacity: 0; 
      transform: translateY(-40px) scale(0.9) rotateX(-10deg);
      filter: blur(4px);
    }
  }

  @keyframes spin {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.1); }
    100% { transform: rotate(360deg) scale(1); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .toast-enter {
    animation: slideInFromTop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .toast-exit {
    animation: slideOutToTop 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .loading-spinner {
    animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
  }

  .loading-text {
    animation: pulse 2s ease-in-out infinite;
  }

  .forgot-password-link:hover {
    text-decoration: underline !important;
  }

  .footer-link:hover {
    text-decoration: underline !important;
  }

  input::placeholder {
    color: #555;
  }

  .form-options {
    font-size: 14px;
    color: #e0e0e0;
  }

  .submit-button:hover:not(:disabled) {
    background: linear-gradient(90deg, rgb(26, 194, 171) 0%, rgb(7, 168, 141) 100%) !important;
    box-shadow: 0 4px 16px rgba(56, 142, 60, 0.18) !important;
  }

  .back-button:hover {
    background: rgba(17, 204, 173, 0.1) !important;
    box-shadow: 0 0 0 2px rgba(17, 204, 173, 0.3) !important;
  }

  /* Responsive Media Queries */
  @media screen and (max-width: 992px) {
    .login-container {
      flex-direction: column !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 100vh !important;
      border-radius: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
    
    .login-wrapper {
      flex-direction: column !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 100vh !important;
      border-radius: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
    
    .branding-side {
      padding: 40px 25px !important;
      text-align: center !important;
      align-items: center !important;
      flex: 0 1 auto !important;
    }
    
    .form-side {
      padding: 30px 25px !important;
      flex: 1 1 auto !important;
      width: 100% !important;
      justify-content: flex-start !important;
    }
    
    .branding-title {
      font-size: 1.7rem !important;
    }
    
    .form-box {
      max-width: 100% !important;
    }
  }

  @media (max-width: 768px) {
    .error-toast, .success-toast {
      margin: 15px 10px !important;
      padding: 18px 50px 18px 20px !important;
      font-size: 13px !important;
      border-radius: 12px !important;
    }
    
    input[type="email"], input[type="password"], input[type="text"] {
      font-size: 16px !important; /* Prevents zoom on iOS */
      padding: 14px 16px !important;
    }
    
    .login-wrapper {
      max-height: none !important;
      height: auto !important;
      min-height: 100vh !important;
    }
    
    .close-btn {
      right: 15px !important;
      top: 15px !important;
      width: 26px !important;
      height: 26px !important;
      font-size: 16px !important;
    }
    
    .loading-overlay {
      border-radius: 15px !important;
    }
    
    .loading-spinner {
      width: 28px !important;
      height: 28px !important;
    }
    
    .loading-text {
      font-size: 13px !important;
    }
  }
`;

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ForgotFormData {
  email: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'forgot'>('login');
  const [loginForm, setLoginForm] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [forgotForm, setForgotForm] = useState<ForgotFormData>({
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (currentView === 'login') {
      setLoginForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    } else {
      setForgotForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const showToastMessage = (msg: string, type: 'error' | 'success') => {
    setMessage(msg);
    setMessageType(type);
    setShowToast(true);
    setToastClosing(false);
    
    // Auto-hide toast after 6 seconds for success, 10 for error
    setTimeout(() => {
      hideToast();
    }, type === 'success' ? 6000 : 10000);
  };

  const hideToast = () => {
    setToastClosing(true);
    setTimeout(() => {
      setShowToast(false);
      setToastClosing(false);
    }, 400);
  };

  const validateLoginForm = () => {
    if (!loginForm.email.trim()) {
      showToastMessage('Please enter your email address', 'error');
      return false;
    }
    if (!loginForm.password) {
      showToastMessage('Please enter your password', 'error');
      return false;
    }
    return true;
  };

  const validateForgotForm = () => {
    if (!forgotForm.email.trim()) {
      showToastMessage('Please enter your email address', 'error');
      return false;
    }
    return true;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validateLoginForm()) {
      return;
    }

    setIsSubmitting(true);

    // Create loading overlay
    const formBox = document.querySelector('.form-box');
    if (formBox) {
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Signing you in...</div>';
      (formBox as HTMLElement).style.position = 'relative';
      formBox.appendChild(loadingOverlay);
    }

    try {
      await login(loginForm.email, loginForm.password);
      navigate('/dashboard/student');
    } catch (_error) {
      showToastMessage('Login failed. Please check your credentials.', 'error');
    } finally {
      setIsSubmitting(false);
      // Remove loading overlay
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove();
      }
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validateForgotForm()) {
      return;
    }

    setIsSubmitting(true);

    // Create loading overlay
    const formBox = document.querySelector('.form-box');
    if (formBox) {
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Sending reset link...</div>';
      (formBox as HTMLElement).style.position = 'relative';
      formBox.appendChild(loadingOverlay);
    }

    try {
      // Simulate password reset request
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToastMessage('Password reset link has been sent to your email.', 'success');
      setCurrentView('login');
    } catch (_error) {
      showToastMessage('Failed to send reset link. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
      // Remove loading overlay
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove();
      }
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-screen flex login-container" style={{
        background: 'url(/src/assets/images/signin.jpeg) no-repeat center center/cover',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Overlay */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(20, 40, 30, 0.55)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <main className="login-wrapper" style={{
          display: 'flex',
          width: '100%',
          maxWidth: '920px',
          minHeight: '620px',
          backgroundColor: 'rgba(10, 25, 15, 0.55)',
          borderRadius: '20px',
          overflow: 'auto',
          boxShadow: '0 10px 35px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          zIndex: 1
        }}>
          
          {/* Branding Side */}
          <div className="branding-side" style={{
            flex: '0.9',
            background: 'linear-gradient(145deg,rgb(17, 204, 173),rgb(6, 165, 165))',
            color: '#fff',
            padding: '50px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <Link to="/">
              <img src="/src/assets/images/edulink_logo.png" alt="Edulink Logo" style={{
                maxWidth: '150px',
                marginBottom: '25px'
              }} />
            </Link>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '600',
              marginBottom: '15px',
              lineHeight: '1.3'
            }}>Welcome Back to Edulink</h1>
            <p style={{
              fontSize: '1.05rem',
              lineHeight: '1.6',
              opacity: '0.85'
            }}>Log in to access your dashboard, track applications, and discover new opportunities.</p>

            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'rgb(17, 204, 173)',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgb(17, 204, 173)'
                }} />
                <span style={{
                  color: '#fff',
                  fontSize: '14px'
                }}>
                  Access your courses and materials
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'rgb(17, 204, 173)',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgb(17, 204, 173)'
                }} />
                <span style={{
                  color: '#fff',
                  fontSize: '14px'
                }}>
                  Connect with peers and instructors
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'rgb(17, 204, 173)',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgb(17, 204, 173)'
                }} />
                <span style={{
                  color: '#fff',
                  fontSize: '14px'
                }}>
                  Track your progress and achievements
                </span>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="form-side" style={{
            flex: '1.1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px'
          }}>
            <div className="form-box" style={{
              width: '100%',
              maxWidth: '400px',
              color: '#fff'
            }}>
              
              {/* Toast Notifications */}
              {showToast && (
                <div className={`toast ${toastClosing ? 'toast-exit' : 'toast-enter'}`} style={{
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  backgroundColor: messageType === 'error' ? 'rgba(255, 179, 179, 0.1)' : '#dcfce7',
                  color: messageType === 'error' ? '#ffb3b3' : '#16a34a',
                  padding: '16px 50px 16px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                  zIndex: 1000,
                  fontSize: '14px',
                  fontWeight: '500',
                  maxWidth: '350px',
                  display: 'flex',
                  alignItems: 'center',
                  backdropFilter: 'blur(10px)',
                  border: messageType === 'error' ? '1px solid rgba(255, 179, 179, 0.3)' : '1px solid #bbf7d0'
                }}>
                  <div>{message}</div>
                  <button 
                    onClick={hideToast}
                    className="close-btn"
                    style={{
                      position: 'absolute',
                      right: '18px',
                      top: '18px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: messageType === 'error' 
                        ? 'rgba(220, 38, 38, 0.1)'
                        : 'rgba(17, 204, 173, 0.1)',
                      color: messageType === 'error' ? '#dc2626' : 'rgb(17, 204, 173)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      flexShrink: 0,
                      backdropFilter: 'blur(10px)'
                    }}
                    aria-label="Close notification"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              )}

              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                {currentView === 'login' ? 'Sign In' : 'Forgot Password'}
              </h2>
              
              <p style={{
                fontSize: '15px',
                color: '#f1f1f1',
                marginBottom: '20px',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                {currentView === 'login' 
                  ? 'Please enter your credentials to proceed.'
                  : 'Enter your email to receive a password reset link'
                }
              </p>

              {currentView === 'login' ? (
                <form onSubmit={handleLoginSubmit} id="loginForm" role="form" aria-label="Login form">
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px'
                  }}>
                    <div>
                      <label htmlFor="email" className="sr-only">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Email Address"
                        value={loginForm.email}
                        onChange={handleInputChange}
                        required
                        autoComplete="email"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: 'none',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(255, 255, 255, 0.82)',
                          color: '#222',
                          fontSize: '15px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          transition: 'box-shadow 0.2s'
                        }}
                        onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(56, 142, 60, 0.25)'}
                        onBlur={(e) => e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'}
                      />
                    </div>

                    <div style={{ position: 'relative' }}>
                      <label htmlFor="password" className="sr-only">Password</label>
                      <input
                        type={passwordVisible ? 'text' : 'password'}
                        id="password"
                        name="password"
                        placeholder="Password"
                        value={loginForm.password}
                        onChange={handleInputChange}
                        required
                        autoComplete="current-password"
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 14px',
                          border: 'none',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(255, 255, 255, 0.82)',
                          color: '#222',
                          fontSize: '15px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          transition: 'box-shadow 0.2s'
                        }}
                        onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(56, 142, 60, 0.25)'}
                        onBlur={(e) => e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'}
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#666',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                      >
                        {passwordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>

                    <div className="form-options" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '5px',
                      fontSize: '14px',
                      color: '#e0e0e0'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#e0e0e0',
                        gap: '8px'
                      }}>
                        <input
                          type="checkbox"
                          name="rememberMe"
                          checked={loginForm.rememberMe}
                          onChange={handleInputChange}
                          style={{
                          marginRight: '0'
                        }}
                        />
                        Remember me
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => setCurrentView('forgot')}
                        className="forgot-password-link"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c8e6c9',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textDecoration: 'none',
                          transition: 'text-decoration 0.2s'
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="submit-button"
                      style={{
                        width: '100%',
                        padding: '13px',
                        background: 'linear-gradient(90deg,rgb(10, 187, 163) 0%,rgb(7, 168, 141) 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '17px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '8px',
                        boxShadow: '0 2px 8px rgba(56, 142, 60, 0.10)',
                        transition: 'background 0.2s, box-shadow 0.2s',
                        opacity: isSubmitting ? '0.7' : '1'
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotSubmit} id="forgotForm" role="form" aria-label="Forgot password form">
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px'
                  }}>
                    <div>
                      <label htmlFor="email" className="sr-only">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Email Address"
                        value={forgotForm.email}
                        onChange={handleInputChange}
                        required
                        autoComplete="email"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: 'none',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(255, 255, 255, 0.82)',
                          color: '#222',
                          fontSize: '15px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          transition: 'box-shadow 0.2s'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="submit-button"
                      style={{
                        width: '100%',
                        padding: '13px',
                        background: 'linear-gradient(90deg,rgb(10, 187, 163) 0%,rgb(7, 168, 141) 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '17px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '8px',
                        boxShadow: '0 2px 8px rgba(56, 142, 60, 0.10)',
                        transition: 'background 0.2s, box-shadow 0.2s',
                        opacity: isSubmitting ? '0.7' : '1'
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentView('login')}
                      className="back-button"
                      style={{
                        width: '100%',
                        padding: '13px',
                        background: 'transparent',
                        color: '#c8e6c9',
                        border: '1px solid #c8e6c9',
                        borderRadius: '10px',
                        fontSize: '17px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              <div style={{
                textAlign: 'center',
                marginTop: '18px',
                fontSize: '14px',
                color: '#f2f2f2'
              }}>
                Don't have an account?{' '}
                <Link to="/register" className="footer-link" style={{
                  color: '#c8e6c9',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}>
                  Create one here
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Enhanced Loading State */}
        {isSubmitting && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(17, 204, 173, 0.1) 0%, rgba(6, 165, 165, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '20px',
            zIndex: 1001,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(17, 204, 173, 0.2)',
              borderTop: '3px solid rgb(17, 204, 173)',
              borderRadius: '50%',
              marginBottom: '12px',
              filter: 'drop-shadow(0 4px 8px rgba(17, 204, 173, 0.2))'
            }} />
            <div style={{
              color: 'rgb(17, 204, 173)',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
              opacity: '0.9'
            }}>
              Processing your request...
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;