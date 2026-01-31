import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

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

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
    50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
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

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%);
    background-size: 200% 200%;
    animation: gradientShift 8s ease infinite;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 40px rgba(59, 130, 246, 0.1);
    z-index: 1000;
  }

  .loading-content {
    text-align: center;
    padding: 40px;
    background: rgba(15, 23, 42, 0.8);
    border-radius: 15px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
    animation: float 3s ease-in-out infinite;
  }

  .loading-spinner-enhanced {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(59, 130, 246, 0.1);
    border-top: 4px solid #3b82f6;
    border-right: 4px solid #60a5fa;
    border-radius: 50%;
    animation: spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
    margin: 0 auto 20px;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    position: relative;
  }

  .loading-spinner-enhanced::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top: 2px solid rgba(96, 165, 250, 0.3);
    animation: spin 2s linear infinite reverse;
  }

  .loading-title {
    font-size: 18px;
    font-weight: 600;
    color: #f8fafc;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
  }

  .loading-subtitle {
    font-size: 14px;
    color: #94a3b8;
    margin-bottom: 20px;
    line-height: 1.4;
  }

  .loading-shimmer {
    height: 6px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.6), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
    border-radius: 3px;
    margin: 15px 0;
  }

  .loading-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 15px;
  }

  .loading-dot {
    width: 8px;
    height: 8px;
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  .loading-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  .loading-progress {
    width: 100%;
    height: 2px;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 1px;
    overflow: hidden;
    margin-top: 20px;
  }

  .loading-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd);
    border-radius: 1px;
    animation: shimmer 3s infinite;
    width: 60%;
  }

  /* Responsive Media Queries */
  @media screen and (max-width: 992px) {
    .registration-container {
      flex-direction: column !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 100vh !important;
      border-radius: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
    
    .registration-wrapper {
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
    
    .registration-wrapper {
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
    
    .loading-shimmer {
      height: 4px !important;
    }
  }
`;

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  registrationNumber: string;
  role: 'student' | 'employer' | 'institution';
}

const Register: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    registrationNumber: '',
    role: 'student'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [availableInstitutions, setAvailableInstitutions] = useState<any[]>([]);
  const [isSearchingInstitutions, setIsSearchingInstitutions] = useState(false);
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showInstitutionInterestModal, setShowInstitutionInterestModal] = useState(false);
  const [institutionInterestName, setInstitutionInterestName] = useState('');
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [interestSubmissionStatus, setInterestSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };





  // const handleInstitutionSkip = () => {
  //   setSelectedInstitution(null);
  // };

  const handleInstitutionSearch = async (query: string) => {
    setIsSearchingInstitutions(true);
    try {
      const response = await fetch(`/api/institutions/institutions/public_list/?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        console.error('Failed to fetch institutions:', response.status);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response format for institutions');
        return;
      }

      const data = await response.json();
      setAvailableInstitutions(data.results || data);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    } finally {
      setIsSearchingInstitutions(false);
    }
  };

  const handleInstitutionSearchInput = (query: string) => {
    setInstitutionSearchQuery(query);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Don't search if query is too short
    if (query.length < 2) {
      setAvailableInstitutions([]);
      return;
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      handleInstitutionSearch(query);
    }, 500); // 500ms debounce
    
    setSearchTimeout(timeout);
  };

  const handleSkipInstitution = () => {
    setSelectedInstitution(null);
    setInstitutionSearchQuery('');
    setAvailableInstitutions([]);
    setInterestSubmissionStatus('idle');
    setShowInstitutionInterestModal(true);
  };

  const handleInstitutionInterestSubmit = async () => {
    if (!institutionInterestName.trim()) {
      setShowInstitutionInterestModal(false);
      return;
    }

    setIsSubmittingInterest(true);
    setInterestSubmissionStatus('idle');

    try {
      const response = await fetch('/api/institutions/institutions/record_interest/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_name: institutionInterestName.trim(),
          user_email: formData.email.trim(),
          email_domain: formData.email.split('@')[1] || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record interest');
      }

      setInterestSubmissionStatus('success');
      setInstitutionInterestName('');
      
      // Close modal after 2 seconds on success
      setTimeout(() => {
        setShowInstitutionInterestModal(false);
        setInterestSubmissionStatus('idle');
      }, 2500);

    } catch (error) {
      console.error('Failed to record institution interest:', error);
      setInterestSubmissionStatus('error');
    } finally {
      setIsSubmittingInterest(false);
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

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setPasswordVisible(!passwordVisible);
    } else {
      setConfirmPasswordVisible(!confirmPasswordVisible);
    }
  };



  const validateStep = (step: number): boolean => {
    // Clear previous errors
    setMessage('');
    setMessageType('');

    if (step === 0) {
      // Step 1: Account Credentials
      if (!formData.email.trim()) {
        showToastMessage('Please enter your email address', 'error');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        showToastMessage('Please enter a valid email address', 'error');
        return false;
      }
      if (!formData.password) {
        showToastMessage('Please enter a password', 'error');
        return false;
      }
      if (formData.password.length < 8) {
        showToastMessage('Password must be at least 8 characters long', 'error');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        showToastMessage('Passwords do not match', 'error');
        return false;
      }
    }

    if (step === 1) {
      // Step 2: Personal Details
      if (!formData.firstName.trim()) {
        showToastMessage('Please enter your first name', 'error');
        return false;
      }
      if (!formData.lastName.trim()) {
        showToastMessage('Please enter your last name', 'error');
        return false;
      }
      if (!formData.phone.trim()) {
        showToastMessage('Please enter your phone number', 'error');
        return false;
      }
      // Basic phone validation for Kenyan numbers
      if (!/^(\+254|0)[17]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
        showToastMessage('Please enter a valid Kenyan phone number', 'error');
        return false;
      }

      if (!formData.gender) {
        showToastMessage('Please select your gender', 'error');
        return false;
      }
    }

    if (step === 2) {
      // Step 3: Academic Information
      if (!formData.registrationNumber.trim()) {
        showToastMessage('Registration number is required', 'error');
        return false;
      }
      
      // Validate registration number format
      if (!/^[A-Z0-9/-]{6,20}$/i.test(formData.registrationNumber)) {
        showToastMessage('Registration number must be 6-20 characters (letters, numbers, /, - only)', 'error');
        return false;
      }
      
      // Validate institution selection
      if (!selectedInstitution) {
        showToastMessage('Please select your institution', 'error');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setMessage('Please enter your first name');
      return false;
    }
    if (!formData.lastName.trim()) {
      setMessage('Please enter your last name');
      return false;
    }
    if (!formData.email.trim()) {
      setMessage('Please enter your email address');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setMessage('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setMessage('Please enter your phone number');
      return false;
    }
    if (!formData.password) {
      setMessage('Please enter a password');
      return false;
    }
    if (formData.password.length < 8) {
      setMessage('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Create loading overlay
    const formBox = document.querySelector('.form-box');
    if (formBox) {
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner-enhanced"></div>
          <div class="loading-title">Creating Your Account</div>
          <div class="loading-subtitle">Please wait while we set up your profile...</div>
          <div class="loading-shimmer"></div>
          <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
          <div class="loading-progress">
            <div class="loading-progress-bar"></div>
          </div>
        </div>
      `;
      (formBox as HTMLElement).style.position = 'relative';
      formBox.appendChild(loadingOverlay);
    }

    try {
      const payload = {
        email: formData.email.trim(),
        username: formData.email.trim().split('@')[0],
        password: formData.password,
        password_confirm: formData.confirmPassword,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone_number: formData.phone.trim(),
        gender: formData.gender,
        role: 'student',
        registration_number: formData.registrationNumber.trim(),
        institution_id: selectedInstitution ? selectedInstitution.id : null,
      };

      const response = await fetch('/api/auth/users/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed. Please try again.';
        try {
          const data = await response.json();
          if (typeof data.error === 'string' && data.error) {
            errorMessage = data.error;
          }
        } catch (parseError) {
          console.error('Failed to parse registration error response', parseError);
        }
        setMessage(errorMessage);
        showToastMessage(errorMessage, 'error');
        return;
      }

      setRegistrationComplete(true);
      setRegisteredEmail(formData.email.trim());
      showToastMessage(
        'Registration successful. Please check your email to verify your account.',
        'success',
      );
      setCurrentStep(0);
    } catch (_error) {
      setMessage('Registration failed. Please try again.');
      showToastMessage('Registration failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
      // Remove loading overlay
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove();
      }
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) {
      showToastMessage('Please complete registration first.', 'error');
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch('/api/notifications/email-verification/resend/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: registeredEmail }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to resend verification email.';
        try {
          const data = await response.json();
          if (typeof data.error === 'string' && data.error) {
            errorMessage = data.error;
          }
        } catch (parseError) {
          console.error('Failed to parse resend verification error response', parseError);
        }
        showToastMessage(errorMessage, 'error');
        return;
      }

      showToastMessage('Verification email resent successfully.', 'success');
    } catch (_error) {
      showToastMessage('Failed to resend verification email.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-screen flex registration-container" style={{
      background: 'url(/src/assets/images/background_2.jpeg) no-repeat center center/cover',
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

      <main className="registration-wrapper" style={{
        display: 'flex',
        width: '100%',
        maxWidth: '920px',
        minHeight: '620px',
        maxHeight: '90vh',
        backgroundColor: 'rgba(10, 25, 15, 0.55)',
        borderRadius: '20px',
        boxShadow: '0 10px 35px rgba(0,0,0,0.3)',
        overflow: 'auto',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
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
              marginBottom: '15px'
            }} />
          </Link>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '600',
            marginBottom: '10px',
            lineHeight: '1.3'
          }}>Join Edulink Today</h1>
          <p style={{
            fontSize: '1.05rem',
            lineHeight: '1.6',
            opacity: '0.85'
          }}>The bridge to your professional future. Sign up to unlock exclusive internship and job opportunities.</p>
        </div>

        {/* Form Side */}
        <div className="form-side" style={{
          flex: '1.1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="form-box" style={{
            position: 'static',
            backdropFilter: 'none',
            background: 'transparent',
            border: 'none',
            padding: '0',
            width: '100%',
            maxWidth: '400px',
            borderRadius: '0',
            boxShadow: 'none',
            color: '#fff',
            margin: '0',
            alignItems: 'center',
            marginBottom: '25px'
          }}>
            <h2 style={{
              color: '#ffffff',
              marginBottom: '5px',
              textAlign: 'center',
              fontSize: '26px',
              letterSpacing: '0.5px'
            }}>Account Registration</h2>
            <p style={{
              color: '#f1f1f1',
              marginBottom: '15px',
              textAlign: 'center',
              fontSize: '15px'
            }}>To sign up, please complete all steps</p>

            {registrationComplete && (
              <div
                style={{
                  borderRadius: '16px',
                  padding: '18px 20px',
                  marginBottom: '15px',
                  boxShadow:
                    '0 12px 40px rgba(17, 204, 173, 0.15), 0 4px 16px rgba(17, 204, 173, 0.1)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background:
                    'linear-gradient(135deg, rgba(17, 204, 173, 0.15) 0%, rgba(6, 165, 165, 0.15) 100%)',
                  color: '#0d9488',
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  A verification link has been sent to{' '}
                  <span style={{ fontWeight: 600 }}>{registeredEmail}</span>. Check your inbox
                  and follow the link to activate your account.
                </div>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #c8e6c9',
                    backgroundColor: 'transparent',
                    color: '#c8e6c9',
                    cursor: isResending ? 'default' : 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {isResending ? 'Resending email...' : 'Resend verification email'}
                </button>
              </div>
            )}

            {/* Enhanced Error/Success Toast */}
            {showToast && (
              <div 
                className={`${messageType === 'error' ? 'error-toast' : 'success-toast'} ${toastClosing ? 'toast-exit' : 'toast-enter'}`}
                style={{
                  position: 'relative',
                  borderRadius: '16px',
                  padding: '20px 55px 20px 24px',
                  marginBottom: '15px',
                  boxShadow: messageType === 'error' 
                    ? '0 12px 40px rgba(220, 38, 38, 0.12), 0 4px 16px rgba(220, 38, 38, 0.08)'
                    : '0 12px 40px rgba(17, 204, 173, 0.15), 0 4px 16px rgba(17, 204, 173, 0.1)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  display: 'flex',
                  alignItems: 'flex-start',
                  minHeight: '60px',
                  zIndex: 1000,
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: messageType === 'error'
                    ? 'linear-gradient(135deg, rgba(255, 245, 245, 0.95) 0%, rgba(254, 242, 242, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(17, 204, 173, 0.15) 0%, rgba(6, 165, 165, 0.15) 100%)',
                  color: messageType === 'error' ? '#dc2626' : '#0d9488',
                  borderLeft: messageType === 'error' ? '4px solid #dc2626' : '4px solid rgb(17, 204, 173)'
                }}
                role="alert"
                aria-live="polite"
              >
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

            {/* Step Indicator */}
            <div className="step-indicator" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              {[0, 1, 2].map((step) => (
                <span
                  key={step}
                  className={`step-dot ${currentStep === step ? 'active' : ''}`}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: currentStep === step ? 'rgb(11, 184, 161)' : 'rgba(255, 255, 255, 0.3)',
                    margin: '0 10px',
                    transition: 'all 0.3s ease',
                    transform: currentStep === step ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: currentStep === step ? '0 0 10px rgb(11, 184, 161)' : 'none'
                  }}
                  aria-current={currentStep === step ? 'step' : undefined}
                />
              ))}
            </div>

            <form onSubmit={handleSubmit} id="registerForm" role="form" aria-label="Student registration form">
              {/* Step 1: Account Credentials */}
              <fieldset className="form-step" style={{
                display: currentStep === 0 ? 'flex' : 'none',
                flexDirection: 'column',
                gap: '10px',
                border: 'none',
                padding: '0',
                margin: '0'
              }}>
                <legend className="sr-only">Account Credentials</legend>
                
                <div>
                  <label htmlFor="email" className="sr-only">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
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
                      transition: 'box-shadow 0.2s',
                      marginBottom: '0'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    We'll use this email for account verification and important updates.
                  </div>
                  

                  

                  
                  {selectedInstitution && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(17, 204, 173, 0.15)',
                      borderRadius: '6px',
                      border: '1px solid rgba(17, 204, 173, 0.3)',
                      fontSize: '12px',
                      color: '#c8e6c9'
                    }}>
                      ✓ Institution: {selectedInstitution.name}
                    </div>
                  )}
                  

                   

                </div>

                <div style={{ position: 'relative' }}>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 14px',
                      border: 'none',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      color: '#222',
                      fontSize: '15px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'box-shadow 0.2s',
                      marginBottom: '0'
                    }}
                  />
                  <span
                    onClick={() => togglePasswordVisibility('password')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      color: '#333',
                      opacity: '0.7',
                      fontSize: '18px'
                    }}
                  >
                    <i className={passwordVisible ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'}></i>
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                  Password must be at least 8 characters long.
                </div>

                <div style={{ position: 'relative' }}>
                  <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                  <input
                    type={confirmPasswordVisible ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 14px',
                      border: 'none',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      color: '#222',
                      fontSize: '15px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'box-shadow 0.2s',
                      marginBottom: '0'
                    }}
                  />
                  <span
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      color: '#333',
                      opacity: '0.7',
                      fontSize: '18px'
                    }}
                  >
                    <i className={confirmPasswordVisible ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'}></i>
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                  Re-enter your password to confirm.
                </div>
              </fieldset>

              {/* Step 2: Personal Details */}
              <fieldset className="form-step" style={{
                display: currentStep === 1 ? 'flex' : 'none',
                flexDirection: 'column',
                gap: '10px',
                border: 'none',
                padding: '0',
                margin: '0'
              }}>
                <legend className="sr-only">Personal Details</legend>
                
                <div>
                  <label htmlFor="firstName" className="sr-only">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    autoComplete="given-name"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: 'none',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      color: '#222',
                      fontSize: '15px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'box-shadow 0.2s',
                      marginBottom: '0'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    Enter your legal first name as it appears on official documents.
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="sr-only">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    autoComplete="family-name"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: 'none',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      color: '#222',
                      fontSize: '15px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'box-shadow 0.2s',
                      marginBottom: '0'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    Enter your legal last name as it appears on official documents.
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="sr-only">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    autoComplete="tel"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: 'none',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.82)',
                      color: '#222',
                      fontSize: '15px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'box-shadow 0.2s',
                      marginBottom: '0'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    Format: +254XXXXXXXXX or 07XXXXXXXX (Kenyan numbers only).
                  </div>
                </div>



                <div>
                  <label htmlFor="gender" className="sr-only">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
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
                      transition: 'box-shadow 0.2s',
                      marginBottom: '8px'
                    }}
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    Select your gender identity.
                  </div>
                </div>
              </fieldset>

              {/* Step 3: Academic Information */}
              <fieldset className="form-step" style={{
                display: currentStep === 2 ? 'flex' : 'none',
                flexDirection: 'column',
                gap: '10px',
                border: 'none',
                padding: '0',
                margin: '0'
              }}>
                <legend className="sr-only">Academic Information</legend>
                
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(200, 230, 201, 0.1)', borderRadius: '8px', border: '1px solid rgba(200, 230, 201, 0.3)' }}>
                  <div style={{ color: '#c8e6c9', fontSize: '13px', lineHeight: '1.4' }}>
                    <strong>Institution Auto-Detection:</strong> Your institution will be automatically detected based on your email address (e.g., student@university.ac.ke). Use your institutional email for automatic linking.
                  </div>
                </div>

                <div>
                  <label htmlFor="registrationNumber" className="sr-only">Registration Number</label>
                  <input
                    type="text"
                    id="registrationNumber"
                    name="registrationNumber"
                    placeholder="Registration Number"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
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
                      transition: 'box-shadow 0.2s',
                      marginBottom: '0'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    Your university registration number.
                  </div>
                </div>

                {/* Institution Search with Auto-complete */}
                <div>
                  <label htmlFor="institutionSearch" className="sr-only">Search Institution</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      id="institutionSearch"
                      placeholder="Search for your institution..."
                      value={institutionSearchQuery}
                      onChange={(e) => handleInstitutionSearchInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 40px',
                        border: 'none',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.82)',
                        color: '#222',
                        fontSize: '15px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'box-shadow 0.2s'
                      }}
                    />
                    <Search 
                      size={18} 
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#666'
                      }}
                    />
                  </div>
                  
                  {/* Search Results */}
                  {isSearchingInstitutions && (
                    <div style={{ 
                      marginTop: '8px',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      textAlign: 'center'
                    }}>
                      <div className="loading-spinner" style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #c8e6c9',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 8px'
                      }}></div>
                      <div style={{ fontSize: '13px', color: '#c8e6c9' }}>Searching institutions...</div>
                    </div>
                  )}
                  
                  {availableInstitutions.length > 0 && !isSearchingInstitutions && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div style={{ fontSize: '13px', color: '#c8e6c9', marginBottom: '8px' }}>
                        Select your institution:
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {availableInstitutions.map((institution) => (
                          <div
                            key={institution.id}
                            onClick={() => {
                              setSelectedInstitution(institution);
                              setAvailableInstitutions([]);
                              setInstitutionSearchQuery(institution.name);
                            }}
                            style={{
                              padding: '8px 12px',
                              marginBottom: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#222',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(200, 230, 201, 0.3)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                            }}
                          >
                            {institution.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results Found Message */}
                  {institutionSearchQuery.length >= 2 && availableInstitutions.length === 0 && !isSearchingInstitutions && !selectedInstitution && (
                    <div style={{ 
                      marginTop: '8px',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '13px', color: '#ffcdd2', fontWeight: '500' }}>
                        No institutions found matching "{institutionSearchQuery}"
                      </div>
                      <div style={{ fontSize: '11px', color: '#c8e6c9', marginTop: '4px', opacity: 0.8 }}>
                        Try a different name or use the skip option below to record your interest.
                      </div>
                    </div>
                  )}
                  
                  {selectedInstitution && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(17, 204, 173, 0.15)',
                      borderRadius: '6px',
                      border: '1px solid rgba(17, 204, 173, 0.3)',
                      fontSize: '12px',
                      color: '#c8e6c9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✓ {selectedInstitution.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInstitution(null);
                            setInstitutionSearchQuery('');
                            setAvailableInstitutions([]);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(17, 204, 173, 0.5)',
                            color: '#c8e6c9',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Change
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                        Your affiliation request will be sent automatically upon registration. No further action needed.
                      </div>
                    </div>
                  )}
                  
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    Type to search for your institution. Start typing to see available options.
                  </div>
                  
                  {/* Skip for now option */}
                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={handleSkipInstitution}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(17, 204, 173, 0.3)',
                        color: '#c8e6c9',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        opacity: '0.8',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                    >
                      Can't find your institution? Skip for now
                    </button>
                  </div>
                </div>




              </fieldset>

              {/* Navigation Buttons */}
              <div className="form-navigation" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '10px'
              }}>
                <button
                  type="button"
                  id="prevBtn"
                  onClick={prevStep}
                  style={{
                    display: currentStep > 0 ? 'inline-block' : 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #c8e6c9',
                    backgroundColor: 'transparent',
                    color: '#c8e6c9',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  id="nextBtn"
                  onClick={nextStep}
                  style={{
                    display: currentStep < 2 ? 'inline-block' : 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(90deg,rgb(56, 142, 135) 0%,rgb(69, 197, 159) 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Next
                </button>
                <button
                  type="submit"
                  style={{
                    display: currentStep === 2 ? 'inline-block' : 'none',
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
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>

            <div style={{
              textAlign: 'center',
              marginTop: '18px',
              fontSize: '14px',
              color: '#f2f2f2'
            }}>
              Already have an account?{' '}
              <Link to="/login" style={{
                color: '#c8e6c9',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}>
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Loading State */}
      

      {/* Animations and responsive styles moved to CSS file */}
      
      {/* Institution Interest Modal */}
      {showInstitutionInterestModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center'
          }}>
            {interestSubmissionStatus === 'success' ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: '#10b981'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 style={{ marginBottom: '12px', color: '#111827', fontSize: '20px', fontWeight: '600' }}>Thank you!</h3>
                <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.5' }}>
                  We've recorded your interest. Our team will look into adding your institution to Edulink.
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ marginBottom: '16px', color: '#111827', fontSize: '20px', fontWeight: '600', textAlign: 'left' }}>Help us expand!</h3>
                <p style={{ marginBottom: '20px', color: '#4b5563', fontSize: '15px', lineHeight: '1.5', textAlign: 'left' }}>
                  We couldn't find your institution. Would you like to tell us which institution you're from so we can add it to our platform?
                </p>
                
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <input
                    type="text"
                    placeholder="Enter your institution name"
                    value={institutionInterestName}
                    onChange={(e) => {
                      setInstitutionInterestName(e.target.value);
                      if (interestSubmissionStatus === 'error') setInterestSubmissionStatus('idle');
                    }}
                    disabled={isSubmittingInterest}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: interestSubmissionStatus === 'error' ? '2px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '10px',
                      fontSize: '15px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      backgroundColor: isSubmittingInterest ? '#f9fafb' : 'white'
                    }}
                    onFocus={(e) => {
                      if (interestSubmissionStatus !== 'error') e.currentTarget.style.borderColor = '#10b981';
                    }}
                    onBlur={(e) => {
                      if (interestSubmissionStatus !== 'error') e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  />
                  {interestSubmissionStatus === 'error' && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', textAlign: 'left', fontWeight: '500' }}>
                      Something went wrong. Please try again.
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInstitutionInterestModal(false);
                      setInstitutionInterestName('');
                      setInterestSubmissionStatus('idle');
                    }}
                    disabled={isSubmittingInterest}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: 'white',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '1px solid #d1d5db',
                      transition: 'all 0.2s'
                    }}
                  >
                    Maybe later
                  </button>
                  <button
                    type="button"
                    onClick={handleInstitutionInterestSubmit}
                    disabled={isSubmittingInterest || !institutionInterestName.trim()}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '10px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      cursor: (isSubmittingInterest || !institutionInterestName.trim()) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      opacity: (isSubmittingInterest || !institutionInterestName.trim()) ? 0.7 : 1
                    }}
                  >
                    {isSubmittingInterest ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }}></div>
                        Submitting...
                      </>
                    ) : 'Submit Interest'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  </>);
};

export default Register;
