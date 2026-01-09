import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
  }
`;

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  gender: string;
  institution: string;
  registrationNumber: string;
  yearOfStudy: string;
  courseCode?: string;
  role: 'student' | 'employer' | 'institution';
}

interface Institution {
  id: string;
  name: string;
  code?: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    nationalId: '',
    gender: '',
    institution: '',
    registrationNumber: '',
    yearOfStudy: '',
    courseCode: '',
    role: 'student'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);
  const [registrationMethod, setRegistrationMethod] = useState<'search' | 'code'>('search');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [institutionResults, setInstitutionResults] = useState<Institution[]>([]);
  const [showInstitutionResults, setShowInstitutionResults] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [universityCodeValidated, setUniversityCodeValidated] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setPasswordVisible(!passwordVisible);
    } else {
      setConfirmPasswordVisible(!confirmPasswordVisible);
    }
  };

  const searchInstitutions = async (query: string) => {
    if (query.length < 2) {
      setInstitutionResults([]);
      setShowInstitutionResults(false);
      return;
    }

    try {
      // Simulate API call - replace with actual endpoint
      const response = await fetch(`/api/institutions/search/?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setInstitutionResults(data.results || []);
        setShowInstitutionResults(true);
      }
    } catch (_error) {
      console.error('Institution search error:', _error);
    }
  };

  const selectInstitution = (institution: Institution) => {
    setSelectedInstitution(institution);
    setFormData(prev => ({ ...prev, institution: institution.name }));
    setInstitutionSearch(institution.name);
    setShowInstitutionResults(false);
  };

  const validateUniversityCode = async (code: string) => {
    if (!code.trim()) return;
    
    try {
      const response = await fetch(`/api/universities/validate-code/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() })
      });
      
      const data = await response.json();
      if (data.valid) {
        setUniversityCodeValidated(true);
        showToastMessage('University code validated successfully!', 'success');
      } else {
        setUniversityCodeValidated(false);
        showToastMessage(data.message || 'Invalid university code', 'error');
      }
    } catch (_error) {
      setUniversityCodeValidated(false);
      showToastMessage('Failed to validate university code', 'error');
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
      if (!formData.nationalId.trim()) {
        showToastMessage('Please enter your national ID number', 'error');
        return false;
      }
      // Basic national ID validation (Kenya format)
      if (!/^\d{7,8}$/.test(formData.nationalId)) {
        showToastMessage('Please enter a valid National ID number (7-8 digits)', 'error');
        return false;
      }
      if (!formData.gender) {
        showToastMessage('Please select your gender', 'error');
        return false;
      }
    }

    if (step === 2) {
      // Step 3: Academic Information
      if (registrationMethod === 'search') {
        if (!selectedInstitution) {
          showToastMessage('Please search and select your institution', 'error');
          return false;
        }
        if (!formData.registrationNumber.trim()) {
          showToastMessage('Registration number is required', 'error');
          return false;
        }
      } else if (registrationMethod === 'code') {
        if (!universityCodeValidated) {
          showToastMessage('Please validate your university code first', 'error');
          return false;
        }
        if (!formData.registrationNumber.trim()) {
          showToastMessage('Registration number is required', 'error');
          return false;
        }
      }
      
      if (!formData.registrationNumber.trim()) {
        showToastMessage('Registration number is required', 'error');
        return false;
      }
      
      // Validate registration number format
      if (!/^[A-Z0-9/-]{6,20}$/i.test(formData.registrationNumber)) {
        showToastMessage('Registration number must be 6-20 characters (letters, numbers, /, - only)', 'error');
        return false;
      }
      
      if (!formData.yearOfStudy) {
        showToastMessage('Year of study is required', 'error');
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
    if (!formData.role) {
      setMessage('Please select your role');
      return false;
    }
    if (!formData.institution.trim()) {
      setMessage('Please enter your institution');
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
      loadingOverlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Processing your registration...</div>';
      (formBox as HTMLElement).style.position = 'relative';
      formBox.appendChild(loadingOverlay);
    }

    try {
      const registerData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        institution: formData.institution,
        phone: formData.phone
      };
      await register(registerData);
      navigate('/dashboard/student');
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
                  <label htmlFor="nationalId" className="sr-only">National ID Number</label>
                  <input
                    type="text"
                    id="nationalId"
                    name="nationalId"
                    placeholder="National ID Number"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                    required
                    autoComplete="off"
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
                    Enter your Kenyan National ID number (7-8 digits).
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
                
                {/* Registration Method Selection */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#fff', fontSize: '14px' }}>
                    How would you like to register?
                  </label>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="registrationMethod"
                        value="search"
                        checked={registrationMethod === 'search'}
                        onChange={(e) => setRegistrationMethod(e.target.value as 'search' | 'code')}
                        style={{ marginRight: '5px' }}
                      />
                      Search Institution
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="registrationMethod"
                        value="code"
                        checked={registrationMethod === 'code'}
                        onChange={(e) => setRegistrationMethod(e.target.value as 'search' | 'code')}
                        style={{ marginRight: '5px' }}
                      />
                      University Code
                    </label>
                  </div>
                </div>

                {registrationMethod === 'search' ? (
                  <div>
                    <label htmlFor="institutionSearch" className="sr-only">Search Institution</label>
                    <input
                      type="text"
                      id="institutionSearch"
                      name="institutionSearch"
                      placeholder="Search for your institution..."
                      value={institutionSearch}
                      onChange={(e) => {
                        setInstitutionSearch(e.target.value);
                        searchInstitutions(e.target.value);
                      }}
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
                    {showInstitutionResults && institutionResults.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        marginTop: '5px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        width: '100%',
                        maxWidth: '400px'
                      }}>
                        {institutionResults.map((institution) => (
                          <div
                            key={institution.id}
                            onClick={() => selectInstitution(institution)}
                            style={{
                              padding: '10px 15px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(0,0,0,0.05)',
                              color: '#222'
                            }}
                          >
                            {institution.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedInstitution && (
                      <div style={{ fontSize: '12px', color: '#c8e6c9', marginTop: '5px', opacity: '0.9' }}>
                        Selected: {selectedInstitution.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label htmlFor="institution" className="sr-only">University Code</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        id="institution"
                        name="institution"
                        placeholder="University Code"
                        value={formData.institution}
                        onChange={handleInputChange}
                        style={{
                          flex: 1,
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
                      <button
                        type="button"
                        onClick={() => validateUniversityCode(formData.institution)}
                        disabled={!formData.institution.trim() || isSubmitting}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '8px',
                          border: '1px solid #c8e6c9',
                          backgroundColor: 'transparent',
                          color: '#c8e6c9',
                          cursor: 'pointer',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Validate
                      </button>
                    </div>
                    {universityCodeValidated && (
                      <div style={{ fontSize: '12px', color: '#c8e6c9', marginTop: '5px', opacity: '0.9' }}>
                        ✓ Code validated successfully
                      </div>
                    )}
                  </div>
                )}

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

                <div>
                  <label htmlFor="yearOfStudy" className="sr-only">Year of Study</label>
                  <select
                    id="yearOfStudy"
                    name="yearOfStudy"
                    value={formData.yearOfStudy}
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
                    <option value="" disabled>Select Year of Study</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                    <option value="6">6th Year</option>
                  </select>
                  <div style={{ fontSize: '12px', color: '#c8e6c9', marginBottom: '8px', marginTop: '4px', lineHeight: '1.4', opacity: '0.9' }}>
                    Select your current year of study.
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
            // Animation removed for now - can be added to CSS file later
            marginBottom: '12px',
            filter: 'drop-shadow(0 4px 8px rgba(17, 204, 173, 0.2))'
          }} />
          <div style={{
            color: 'rgb(17, 204, 173)',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center',
            opacity: '0.9',
            // Animation removed for now - can be added to CSS file later
          }}>
            Processing your registration...
          </div>
        </div>
      )}

      {/* Animations and responsive styles moved to CSS file */}
    </div>
  </>);
};

export default Register;