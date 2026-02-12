import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import authService from '../../services/auth/authService';

// CSS Animations and Keyframes (Reused for consistency)
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

  .footer-link:hover {
    text-decoration: underline !important;
  }

  input::placeholder {
    color: #555;
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
  }
`;

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Toast state
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);

  const showToastMessage = (msg: string, type: 'error' | 'success') => {
    setMessage(msg);
    setMessageType(type);
    setShowToast(true);
    setToastClosing(false);
    
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

  useEffect(() => {
    if (!token) {
      showToastMessage('Invalid or missing reset token. Please request a new link.', 'error');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      showToastMessage('Invalid or missing reset token', 'error');
      return;
    }

    if (password.length < 8) {
      showToastMessage('Password must be at least 8 characters long', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToastMessage('Passwords do not match', 'error');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, password);
      setIsSuccess(true);
      showToastMessage('Password reset successful! Redirecting...', 'success');
      // Automatically redirect after a few seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      showToastMessage(err.message || 'Failed to reset password. The link may have expired.', 'error');
    } finally {
      setIsLoading(false);
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
            }}>Reset Password</h1>
            <p style={{
              fontSize: '1.05rem',
              lineHeight: '1.6',
              opacity: '0.85'
            }}>Create a strong, unique password to secure your account and access Edulink's features.</p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginTop: '40px'
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
                  End-to-end encryption
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
                  Immediate account access
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

              {isSuccess ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(17, 204, 173, 0.2)',
                    color: 'rgb(17, 204, 173)',
                    marginBottom: '20px'
                  }}>
                    <CheckCircle size={32} />
                  </div>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#ffffff',
                    marginBottom: '15px'
                  }}>
                    Password Updated
                  </h2>
                  <p style={{
                    fontSize: '15px',
                    color: '#e0e0e0',
                    marginBottom: '30px',
                    lineHeight: '1.6'
                  }}>
                    Your password has been successfully reset. You can now sign in with your new credentials.
                  </p>
                  
                  <Link 
                    to="/login"
                    className="submit-button"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '13px',
                      background: 'linear-gradient(90deg,rgb(10, 187, 163) 0%,rgb(7, 168, 141) 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(56, 142, 60, 0.10)',
                      transition: 'background 0.2s, box-shadow 0.2s'
                    }}
                  >
                    Return to Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      padding: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff'
                    }}>
                      <Lock size={24} />
                    </div>
                  </div>

                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#ffffff',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    Set New Password
                  </h2>
                  
                  <p style={{
                    fontSize: '15px',
                    color: '#f1f1f1',
                    marginBottom: '30px',
                    textAlign: 'center',
                    lineHeight: '1.5'
                  }}>
                    Enter your new password below.
                  </p>

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="password" className="sr-only">New Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          placeholder="New Password (min 8 chars)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '12px 45px 12px 14px',
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
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px'
                          }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                      <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="confirmPassword"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(56, 142, 60, 0.10)',
                        transition: 'background 0.2s, box-shadow 0.2s',
                        opacity: isLoading ? '0.7' : '1'
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </form>

                  <div style={{
                    textAlign: 'center',
                    marginTop: '25px'
                  }}>
                    <Link 
                      to="/login" 
                      className="back-button"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: '#f1f1f1',
                        textDecoration: 'none',
                        fontSize: '14px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                      Back to Sign In
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ResetPasswordPage;
