import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Container, Row, Col, ProgressBar, Modal } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { institutionService } from '../../../services';
import { ApiError } from '../../../services/errors';

interface InstitutionRequestForm {
  institution_name: string;
  website_url: string;
  requested_domains: string;
  representative_name: string;
  representative_email: string;
  representative_role: string;
  representative_phone: string;
  department: string;
  notes: string;
}

interface InstitutionRequestResponse {
  tracking_code: string;
}

const InstitutionRequest: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InstitutionRequestForm>({
    institution_name: '',
    website_url: '',
    requested_domains: '',
    representative_name: '',
    representative_email: '',
    representative_role: '',
    representative_phone: '',
    department: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [responseData, setResponseData] = useState<InstitutionRequestResponse | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [progress, setProgress] = useState(33);

  const totalSteps = 3;

  useEffect(() => {
    const progressPercentage = (currentStep / totalSteps) * 100;
    setProgress(progressPercentage);
  }, [currentStep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.institution_name.trim()) {
        newErrors.institution_name = 'Institution name is required';
      }

      if (!formData.website_url.trim()) {
        newErrors.website_url = 'Website URL is required';
      } else if (!formData.website_url.startsWith('http')) {
        newErrors.website_url = 'Please enter a valid URL starting with http:// or https://';
      }

      if (!formData.requested_domains.trim()) {
        newErrors.requested_domains = 'At least one email domain is required';
      } else {
        const domains = formData.requested_domains.split(',').map(d => d.trim());
        const invalidDomains = domains.filter(d => !d.includes('.') || d.length < 3);
        if (invalidDomains.length > 0) {
          newErrors.requested_domains = 'Invalid domain format. Use comma-separated domains like "university.edu, department.university.edu"';
        }
      }
    }

    if (step === 2) {
      if (!formData.representative_name.trim()) {
        newErrors.representative_name = 'Representative name is required';
      }

      if (!formData.representative_email.trim()) {
        newErrors.representative_email = 'Representative email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.representative_email)) {
        newErrors.representative_email = 'Please enter a valid email address';
      }

      if (!formData.representative_role.trim()) {
        newErrors.representative_role = 'Representative role is required';
      }

      if (formData.representative_email && formData.requested_domains) {
        const emailDomain = formData.representative_email.split('@')[1]?.toLowerCase();
        const requestedDomains = formData.requested_domains.split(',').map(d => d.trim().toLowerCase());
        const domainMatch = requestedDomains.some(domain => 
          emailDomain === domain || emailDomain.endsWith('.' + domain)
        );
        
        if (!domainMatch) {
          newErrors.representative_email = 'Your email domain must match one of the requested institution domains';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.institution_name.trim()) {
      newErrors.institution_name = 'Institution name is required';
    }

    if (!formData.website_url.trim()) {
      newErrors.website_url = 'Website URL is required';
    } else if (!formData.website_url.startsWith('http')) {
      newErrors.website_url = 'Please enter a valid URL starting with http:// or https://';
    }

    if (!formData.requested_domains.trim()) {
      newErrors.requested_domains = 'At least one email domain is required';
    } else {
      const domains = formData.requested_domains.split(',').map(d => d.trim());
      const invalidDomains = domains.filter(d => !d.includes('.') || d.length < 3);
      if (invalidDomains.length > 0) {
        newErrors.requested_domains = 'Invalid domain format. Use comma-separated domains like "university.edu, department.university.edu"';
      }
    }

    if (!formData.representative_name.trim()) {
      newErrors.representative_name = 'Representative name is required';
    }

    if (!formData.representative_email.trim()) {
      newErrors.representative_email = 'Representative email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.representative_email)) {
      newErrors.representative_email = 'Please enter a valid email address';
    }

    if (!formData.representative_role.trim()) {
      newErrors.representative_role = 'Representative role is required';
    }

    if (formData.representative_email && formData.requested_domains) {
      const emailDomain = formData.representative_email.split('@')[1]?.toLowerCase();
      const requestedDomains = formData.requested_domains.split(',').map(d => d.trim().toLowerCase());
      const domainMatch = requestedDomains.some(domain => 
        emailDomain === domain || emailDomain.endsWith('.' + domain)
      );
      
      if (!domainMatch) {
        newErrors.representative_email = 'Your email domain must match one of the requested institution domains';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const domains = formData.requested_domains.split(',').map(d => d.trim());
      
      const payload = {
        institution_name: formData.institution_name.trim(),
        website_url: formData.website_url.trim(),
        requested_domains: domains,
        representative_name: formData.representative_name.trim(),
        representative_email: formData.representative_email.trim().toLowerCase(),
        representative_role: formData.representative_role.trim(),
        representative_phone: formData.representative_phone.trim(),
        department: formData.department.trim(),
        notes: formData.notes.trim(),
      };

      const data = await institutionService.submitRequest(payload);
      setResponseData(data);
      setSubmitSuccess(true);

    } catch (error) {
      let apiErrorTitle = 'Unexpected Error';
      let apiErrorMessage = 'An unexpected error occurred';
      let apiErrorDetails = '';

      if (error instanceof ApiError) {
        apiErrorTitle = 'Submission Failed';
        apiErrorMessage = error.message;

        if (error.data && error.data.conflicts && Array.isArray(error.data.conflicts) && error.data.conflicts.length > 0) {
          const conflictDomains = error.data.conflicts.map((c: any) => c.domain).join(', ');
          apiErrorTitle = 'Domain Conflict';
          apiErrorMessage = 'Some requested domains are already in use.';
          apiErrorDetails = `Conflicting domains: ${conflictDomains}. Please use different official domains or contact our support team.`;
        } else if (error.data && error.data.detail) {
          apiErrorMessage = error.data.detail;
        }
      } else if (error instanceof Error) {
        apiErrorMessage = error.message;
      }

      setSubmitError(apiErrorMessage);
      setErrorTitle(apiErrorTitle);
      setErrorDetails(apiErrorDetails);
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    'Institution Details',
    'Contact Information',
    'Review & Submit'
  ];

  if (submitSuccess) {
    return (
      <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center p-0 bg-light">
        <Row className="w-100 g-0">
          <Col lg={6} className="d-none d-lg-block">
            <div className="success-branding h-100 d-flex flex-column justify-content-center align-items-center p-5">
              <div className="text-center mb-5">
                <div className="success-icon mb-4">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="45" stroke="#0dcaf0" strokeWidth="3" fill="none"/>
                    <circle cx="50" cy="50" r="35" fill="#0dcaf0" fillOpacity="0.1"/>
                    <path d="M35 50 L45 60 L65 40" stroke="#0dcaf0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h1 className="display-4 fw-bold mb-3 text-white">Success!</h1>
                <p className="lead mb-4 text-white-75">Your request has been submitted successfully</p>
              </div>
              
              <div className="features-list">
                <div className="feature-item mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <div className="feature-icon me-3">
                      <i className="bi bi-clock fs-4"></i>
                    </div>
                    <h5 className="mb-0 text-white">3-5 Business Days</h5>
                  </div>
                  <p className="text-white-75 ms-5">Our team will review your submission within 3-5 business days</p>
                </div>
                
                <div className="feature-item mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <div className="feature-icon me-3">
                      <i className="bi bi-envelope fs-4"></i>
                    </div>
                    <h5 className="mb-0 text-white">Email Notification</h5>
                  </div>
                  <p className="text-white-75 ms-5">You'll receive an email confirmation and updates</p>
                </div>
                
                <div className="feature-item mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <div className="feature-icon me-3">
                      <i className="bi bi-headset fs-4"></i>
                    </div>
                    <h5 className="mb-0 text-white">Dedicated Support</h5>
                  </div>
                  <p className="text-white-75 ms-5">Our team is ready to assist you throughout the process</p>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={6} xs={12}>
            <div className="success-container h-100 d-flex flex-column justify-content-center p-4 p-lg-5">
              <div className="modern-success-card p-4 p-lg-5">
                <div className="text-center">
                  <div className="success-animation mb-4">
                    <div className="success-checkmark">
                      <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                      </svg>
                    </div>
                  </div>
                  <h2 className="mb-3 fw-bold" style={{ color: '#0dcaf0' }}>Request Submitted Successfully!</h2>
                  <p className="text-muted mb-4 fs-5">
                    Thank you for your institution onboarding request. Our team will review your submission and contact you within 3-5 business days.
                  </p>
                  {responseData?.tracking_code && (
                    <div className="mb-4">
                      <div className="alert alert-teal border-teal bg-teal-light rounded-3 d-inline-block text-start">
                        <div className="fw-bold mb-1">Your Tracking Code</div>
                        <div className="display-6 fw-bold text-teal">{responseData.tracking_code}</div>
                        <div className="text-muted small mt-2">
                          Keep this code for your records. It is also included in your confirmation email and helps our support team locate your request.
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                    <Button 
                      variant="outline-teal" 
                      onClick={() => navigate('/')} 
                      size="lg"
                      className="px-4"
                    >
                      Return to Home
                    </Button>
                    <Button 
                      variant="teal" 
                      onClick={() => {
                        setSubmitSuccess(false);
                        setCurrentStep(1);
                        setFormData({
                          institution_name: '',
                          website_url: '',
                          requested_domains: '',
                          representative_name: '',
                          representative_email: '',
                          representative_role: '',
                          representative_phone: '',
                          department: '',
                          notes: '',
                        });
                        setErrors({});
                        setResponseData(null);
                        setSubmitError('');
                      }}
                      size="lg"
                      className="px-4"
                    >
                      Submit Another Request
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center p-0 bg-light">
      <Row className="w-100 g-0 shadow-lg">
        <Col lg={6} className="d-none d-lg-block">
          <div className="branding-side h-100 d-flex flex-column justify-content-center align-items-center p-5 position-relative">
            <div className="text-center mb-5 z-2">
              <div className="brand-icon mb-4">
                
              </div>
              <h1 className="display-4 fw-bold mb-3 text-white">EduLink</h1>
              <p className="lead mb-4 text-white-75">Connecting Education Institutions Worldwide</p>
            </div>
            
            <div className="features-list z-2">
              <div className="feature-card p-4 mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="feature-icon me-3">
                    <i className="bi bi-shield-check fs-4"></i>
                  </div>
                  <h5 className="mb-0 text-white">Secure Verification</h5>
                </div>
                <p className="text-white-75 ms-5 mb-0">All institutions undergo thorough verification for security</p>
              </div>
              
              <div className="feature-card p-4 mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="feature-icon me-3">
                    <i className="bi bi-lightning fs-4"></i>
                  </div>
                  <h5 className="mb-0 text-white">Quick Setup</h5>
                </div>
                <p className="text-white-75 ms-5 mb-0">Get started in minutes with our streamlined process</p>
              </div>
              
              <div className="feature-card p-4">
                <div className="d-flex align-items-center mb-2">
                  <div className="feature-icon me-3">
                    <i className="bi bi-people fs-4"></i>
                  </div>
                  <h5 className="mb-0 text-white">Global Network</h5>
                </div>
                <p className="text-white-75 ms-5 mb-0">Join thousands of institutions already connected</p>
              </div>
            </div>
          </div>
        </Col>

        <Col lg={6} xs={12}>
          <div className="form-side h-100 d-flex flex-column justify-content-center p-4 p-lg-5 bg-white">
            <div className="form-header mb-4 d-flex justify-content-between align-items-center">
              <div>
                <h2 className="fw-bold mb-2" style={{ color: '#0dcaf0' }}>Institution Onboarding</h2>
                <p className="text-muted mb-0">Complete this form to join our educational network</p>
              </div>
              <div className="text-end">
                <span className="text-muted small d-block">Already registered?</span>
                <Link to="/institution/login" className="fw-bold text-decoration-none" style={{ color: '#0dcaf0' }}>Login here</Link>
              </div>
            </div>

            {submitError && (
              <Alert variant="danger" dismissible onClose={() => setSubmitError('')} className="mb-4 border-0 rounded-3 shadow-sm">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {submitError}
              </Alert>
            )}

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Step {currentStep} of {totalSteps}</span>
                <span className="fw-bold" style={{ color: '#0dcaf0' }}>{stepTitles[currentStep - 1]}</span>
              </div>
              <ProgressBar 
                now={progress} 
                style={{ height: '6px' }}
                className="rounded-pill"
                variant="teal"
              />
            </div>

            <Form onSubmit={handleSubmit} className="modern-form">
              {/* Step 1: Institution Information */}
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                <div className="section-header mb-4">
                  <div className="step-number">1</div>
                  <div>
                    <h5 className="mb-1" style={{ color: '#0dcaf0' }}>Institution Details</h5>
                    <p className="text-muted small mb-0">Tell us about your institution</p>
                  </div>
                </div>
                
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Institution Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="institution_name"
                    value={formData.institution_name}
                    onChange={handleInputChange}
                    isInvalid={!!errors.institution_name}
                    placeholder="University of Technology"
                    className="rounded-3 border-2"
                  />
                  <Form.Control.Feedback type="invalid">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.institution_name}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Website URL <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    isInvalid={!!errors.website_url}
                    placeholder="https://www.university.ac.ke"
                    className="rounded-3 border-2"
                  />
                  <Form.Control.Feedback type="invalid">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.website_url}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Official Email Domains <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="requested_domains"
                    value={formData.requested_domains}
                    onChange={handleInputChange}
                    isInvalid={!!errors.requested_domains}
                    placeholder="university.edu, department.university.edu"
                    className="rounded-3 border-2"
                  />
                  <Form.Text className="text-muted small">
                    <i className="bi bi-info-circle me-1"></i>
                    Enter official email domains separated by commas
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.requested_domains}
                  </Form.Control.Feedback>
                </Form.Group>

                <div className="d-flex justify-content-end mb-4">
                  <Button 
                    variant="teal" 
                    onClick={nextStep}
                    className="rounded-3 px-4"
                  >
                    Continue <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </div>

              {/* Step 2: Representative Information */}
              <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                <div className="section-header mb-4">
                  <div className="step-number">2</div>
                  <div>
                    <h5 className="mb-1" style={{ color: '#0dcaf0' }}>Contact Information</h5>
                    <p className="text-muted small mb-0">Tell us about the primary contact</p>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Full Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="representative_name"
                    value={formData.representative_name}
                    onChange={handleInputChange}
                    isInvalid={!!errors.representative_name}
                    placeholder="John Smith"
                    className="rounded-3 border-2"
                  />
                  <Form.Control.Feedback type="invalid">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.representative_name}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Email Address <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="email"
                        name="representative_email"
                        value={formData.representative_email}
                        onChange={handleInputChange}
                        isInvalid={!!errors.representative_email}
                        placeholder="john.smith@university.ac.ke"
                        className="rounded-3 border-2"
                      />
                      <Form.Control.Feedback type="invalid">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {errors.representative_email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="representative_phone"
                        value={formData.representative_phone}
                        onChange={handleInputChange}
                        placeholder="0712345678"
                        className="rounded-3 border-2"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Role/Title <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="representative_role"
                        value={formData.representative_role}
                        onChange={handleInputChange}
                        isInvalid={!!errors.representative_role}
                        placeholder="Director of Student Affairs"
                        className="rounded-3 border-2"
                      />
                      <Form.Control.Feedback type="invalid">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {errors.representative_role}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Department</Form.Label>
                      <Form.Control
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        placeholder="Student Services"
                        className="rounded-3 border-2"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between mb-4">
                  <Button 
                    variant="outline-secondary" 
                    onClick={prevStep}
                    className="rounded-3 px-4"
                  >
                    <i className="bi bi-arrow-left me-2"></i> Back
                  </Button>
                  <Button 
                    variant="teal" 
                    onClick={nextStep}
                    className="rounded-3 px-4"
                  >
                    Continue <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </div>

              {/* Step 3: Additional Information & Review */}
              <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                <div className="section-header mb-4">
                  <div className="step-number">3</div>
                  <div>
                    <h5 className="mb-1" style={{ color: '#0dcaf0' }}>Review & Submit</h5>
                    <p className="text-muted small mb-0">Review your information and add any final notes</p>
                  </div>
                </div>

                <div className="review-card p-4 mb-4 rounded-3 border">
                  <h6 className="mb-3" style={{ color: '#0dcaf0' }}>Institution Details</h6>
                  <div className="row mb-2">
                    <div className="col-4 text-muted">Institution:</div>
                    <div className="col-8 fw-semibold">{formData.institution_name || 'Not provided'}</div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-4 text-muted">Website:</div>
                    <div className="col-8">{formData.website_url || 'Not provided'}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-4 text-muted">Domains:</div>
                    <div className="col-8">{formData.requested_domains || 'Not provided'}</div>
                  </div>

                  <h6 className="mb-3 mt-4" style={{ color: '#0dcaf0' }}>Contact Information</h6>
                  <div className="row mb-2">
                    <div className="col-4 text-muted">Name:</div>
                    <div className="col-8 fw-semibold">{formData.representative_name || 'Not provided'}</div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-4 text-muted">Email:</div>
                    <div className="col-8">{formData.representative_email || 'Not provided'}</div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-4 text-muted">Role:</div>
                    <div className="col-8">{formData.representative_role || 'Not provided'}</div>
                  </div>
                  <div className="row mb-2">
                    <div className="col-4 text-muted">Phone:</div>
                    <div className="col-8">{formData.representative_phone || 'Not provided'}</div>
                  </div>
                  <div className="row">
                    <div className="col-4 text-muted">Department:</div>
                    <div className="col-8">{formData.department || 'Not provided'}</div>
                  </div>
                </div>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Additional Notes (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional information that might help with the review process..."
                    className="rounded-3 border-2"
                  />
                </Form.Group>

                <div className="d-flex justify-content-between mb-4">
                  <Button 
                    variant="outline-secondary" 
                    onClick={prevStep}
                    className="rounded-3 px-4"
                  >
                    <i className="bi bi-arrow-left me-2"></i> Back
                  </Button>
                </div>

                <div className="alert alert-teal border-teal bg-teal-light rounded-3 mb-4">
                  <div className="d-flex">
                    <i className="bi bi-info-circle fs-5 me-3" style={{ color: '#0dcaf0' }}></i>
                    <div>
                      <strong>Important:</strong> Submitting this form does not create an institution account on EduLink. 
                      All requests are reviewed by our team before activation. You will receive an email notification 
                      within 3-5 business days.
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-3">
                  <Button 
                    variant="teal" 
                    type="submit" 
                    size="lg"
                    disabled={isSubmitting}
                    className="rounded-3 px-4 flex-grow-1"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-check me-2"></i>
                        Submit Request
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate('/')}
                    size="lg"
                    className="rounded-3 px-4"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Form>

            <div className="mt-4 pt-3 border-top text-center">
              <p className="text-muted small mb-0">
                Need help? <a href="/contact" style={{ color: '#0dcaf0', textDecoration: 'none' }}>Contact our support team</a>
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{errorTitle || 'Submission Error'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">{submitError}</p>
          {errorDetails && (
            <p className="text-muted small mt-3 mb-0">{errorDetails}</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="teal" onClick={() => setShowErrorModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style>
        {`
          /* Import unique font for EduLink */
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
          
          :root {
            --teal-primary: #0dcaf0;
            --teal-light: #e3f7fa;
            --teal-dark: #0aa2c0;
            --brand-gradient-start: #0dcaf0;
            --brand-gradient-end: #0aa2c0;
            --brand-accent: #06b6d4;
          }
          
          .btn-teal {
            background-color: var(--teal-primary);
            border-color: var(--teal-primary);
            color: white;
          }
          
          .btn-teal:hover {
            background-color: var(--teal-dark);
            border-color: var(--teal-dark);
            color: white;
          }
          
          .btn-outline-teal {
            color: var(--teal-primary);
            border-color: var(--teal-primary);
          }
          
          .btn-outline-teal:hover {
            background-color: var(--teal-primary);
            border-color: var(--teal-primary);
            color: white;
          }
          
          .progress-bar-teal {
            background-color: var(--teal-primary);
          }
          
          .alert-teal {
            border-color: var(--teal-primary);
            background-color: var(--teal-light);
          }
          
          .bg-teal-light {
            background-color: var(--teal-light);
          }
          
          .border-teal {
            border-color: var(--teal-primary) !important;
          }
          
          .text-teal {
            color: var(--teal-primary) !important;
          }
          
          .branding-side {
            background: linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%);
            position: relative;
            overflow: hidden;
          }
          
          .branding-side::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          }
          
          .brand-icon {
            animation: float 3s ease-in-out infinite;
          }
          
          .feature-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
          }
          
          .feature-card:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.15);
          }
          
          .feature-icon {
            background: rgba(255, 255, 255, 0.2);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .form-side {
            position: relative;
          }
          
          /* Wavy curved divider line */
          .wavy-divider {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            pointer-events: none;
            z-index: 1;
          }
          
          .wavy-divider::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              to right,
              transparent 0%,
              transparent 45%,
              rgba(13, 202, 240, 0.1) 50%,
              transparent 55%,
              transparent 100%
            );
            clip-path: polygon(
              0% 0%,
              45% 0%,
              50% 5%,
              55% 0%,
              100% 0%,
              100% 100%,
              55% 100%,
              50% 95%,
              45% 100%,
              0% 100%
            );
          }
          
          .wavy-divider::after {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 100%;
            background: linear-gradient(
              to bottom,
              var(--teal-primary) 0%,
              var(--teal-dark) 50%,
              var(--teal-primary) 100%
            );
            clip-path: polygon(
              0% 0%,
              100% 0%,
              100% 5%,
              0% 10%,
              0% 20%,
              100% 25%,
              100% 35%,
              0% 40%,
              0% 50%,
              100% 55%,
              100% 65%,
              0% 70%,
              0% 80%,
              100% 85%,
              100% 95%,
              0% 100%
            );
          }
          
          .section-header {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          
          .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--teal-primary), var(--teal-dark));
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2rem;
          }
          
          .review-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
            border: 1px solid #e9ecef;
          }
          
          .modern-form .form-control {
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 16px;
            transition: all 0.3s ease;
          }
          
          .modern-form .form-control:focus {
            border-color: var(--teal-primary);
            box-shadow: 0 0 0 0.2rem rgba(13, 202, 240, 0.25);
          }
          
          .modern-form .form-control.is-invalid {
            border-color: #dc3545;
          }
          
          .modern-success-card {
            background: linear-gradient(135deg, #f8fafc 0%, var(--teal-light) 100%);
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          
          .success-branding {
            background: linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%);
          }
          
          .success-container {
            background: linear-gradient(135deg, #f8fafc 0%, var(--teal-light) 100%);
          }
          
          .success-icon {
            animation: bounce 1s ease infinite;
          }
          
          .success-checkmark .checkmark__circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke-width: 2;
            stroke-miterlimit: 10;
            stroke: var(--teal-primary);
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          
          .success-checkmark .checkmark__check {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            stroke: var(--teal-primary);
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
          }
          
          .z-2 {
            z-index: 2;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          
          @keyframes stroke {
            100% { stroke-dashoffset: 0; }
          }
          
          @keyframes scale {
            0%, 100% { transform: none; }
            50% { transform: scale3d(1.1, 1.1, 1); }
          }
          
          @keyframes fill {
            100% { box-shadow: inset 0px 0px 0px 30px var(--teal-primary); }
          }
          
          @media (max-width: 991px) {
            .form-side {
              padding: 2rem !important;
            }
            
            .branding-side {
              display: none !important;
            }
          }
          
          @media (max-width: 576px) {
            .form-side {
              padding: 1.5rem !important;
            }
            
            .form-header h2 {
              font-size: 1.75rem;
            }
            
            .step-number {
              width: 32px;
              height: 32px;
              font-size: 1rem;
            }
          }
        `}
      </style>
    </Container>
  );
};

export default InstitutionRequest;
