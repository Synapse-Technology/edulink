import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthStore } from '../../stores/authStore';
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

  .toast-enter {
    animation: slideInFromTop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .toast-exit {
    animation: slideOutToTop 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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
  }
`;

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginForm, setLoginForm] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validateLoginForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(loginForm.email, loginForm.password);
      
      const user = useAuthStore.getState().user;
      if (user?.role === 'student') {
        navigate('/dashboard/student');
      } else {
        showToastMessage('Access restricted to Students. Please use the appropriate portal.', 'error');
        await useAuthStore.getState().logout();
      }
    } catch (_error) {
      showToastMessage('Login failed. Please check your credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
        {/* Toast Notifications */}
        <div style={{
          position: 'fixed',
          top: '20px',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          {showToast && (
            <div className={`toast ${toastClosing ? 'toast-exit' : 'toast-enter'}`} style={{
              pointerEvents: 'auto',
              backgroundColor: messageType === 'error' ? 'rgba(255, 179, 179, 0.1)' : '#dcfce7',
              color: messageType === 'error' ? '#ffb3b3' : '#16a34a',
              padding: '16px 50px 16px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
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
        </div>
        <div className="min-h-screen flex login-container" style={{
        background: 'url(/images/signin.jpeg) no-repeat center center/cover',
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
              <img src="/images/edulink_logo.png" alt="Edulink Logo" style={{
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
              


              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                Sign In
              </h2>
              
              <p style={{
                fontSize: '15px',
                color: '#f1f1f1',
                marginBottom: '20px',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Please enter your credentials to proceed.
              </p>

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
                      
                      <Link
                        to="/forgot-password"
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
                      </Link>
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
      </div>
    </>
  );
};

export default Login;