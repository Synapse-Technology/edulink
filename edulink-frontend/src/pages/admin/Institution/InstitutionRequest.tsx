import React, { useState } from 'react';
import { Form, Button, Alert, Container, Row, Col, Modal } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { institutionService } from '../../../services';
import { ApiError } from '../../../services/errors';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import '../../../styles/onboarding-request.css';

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
  const totalSteps = 3;

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
      // Sanitize error for safe display
      const sanitized = sanitizeAdminError(error);
      setErrorTitle(sanitized.title);
      setErrorDetails(sanitized.message);
      
      // Handle specific error cases
      if (error instanceof ApiError) {
        if (error.data && error.data.conflicts && Array.isArray(error.data.conflicts) && error.data.conflicts.length > 0) {
          const conflictDomains = error.data.conflicts.map((c: any) => c.domain).join(', ');
          setErrorTitle('Domain Conflict');
          setErrorDetails(`Some requested domains are already in use: ${conflictDomains}. Please use different official domains or contact our support team.`);
        }
      }

      setSubmitError(sanitized.message);
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
      <Container fluid className="onboarding-page">
        <Row className="onboarding-shell g-0">
          <Col lg={6} className="d-none d-lg-block">
            <div className="onboarding-brand-panel">
              <div className="onboarding-brand-content">
                <div>
                  <div className="onboarding-kicker"><i className="bi bi-shield-check"></i> Institution review queued</div>
                  <h1 className="onboarding-brand-title">Your institution request is in review.</h1>
                  <p className="onboarding-brand-copy">EduLink checks official domains, representative details, and activation readiness before institutions begin verifying students.</p>
                </div>
                <div className="onboarding-checklist">
                  <div className="onboarding-check">
                    <i className="bi bi-clock-history"></i>
                    <div>
                      <h5>3-5 business days</h5>
                      <p>Our team reviews institutional identity and domain ownership.</p>
                    </div>
                  </div>
                  <div className="onboarding-check">
                    <i className="bi bi-envelope-check"></i>
                    <div>
                      <h5>Email updates</h5>
                      <p>The listed representative receives the next activation steps.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={6} xs={12}>
            <div className="onboarding-form-panel">
              <div className="onboarding-success-card">
                <div className="text-center">
                  <div className="onboarding-success-icon">
                    <i className="bi bi-check2"></i>
                  </div>
                  <h2 className="mb-3 fw-bold">Request Submitted Successfully</h2>
                  <p className="text-muted mb-4 fs-5">
                    Thank you for your institution onboarding request. Our team will review it and contact the listed representative within 3-5 business days.
                  </p>
                  {responseData?.tracking_code && (
                    <div className="mb-4">
                      <div className="onboarding-tracking-code text-start">
                        <span className="text-muted small fw-bold text-uppercase">Tracking code</span>
                        <strong>{responseData.tracking_code}</strong>
                        <div className="text-muted small">Keep this code for support and follow-up.</div>
                      </div>
                    </div>
                  )}
                  <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => navigate('/')} 
                      size="lg"
                      className="px-4"
                    >
                      Return to Home
                    </Button>
                    <Button 
                      className="px-4 onboarding-primary-btn"
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
    <Container fluid className="onboarding-page">
      <Row className="onboarding-shell g-0">
        <Col lg={6} className="d-none d-lg-flex">
          <div className="onboarding-brand-panel w-100">
            <div className="onboarding-brand-content">
              <div>
                <div className="onboarding-kicker"><i className="bi bi-building-check"></i> Institution onboarding</div>
                <h1 className="onboarding-brand-title">Bring verified student attachment workflows online.</h1>
                <p className="onboarding-brand-copy">Claim your official institution profile, connect student domains, and prepare your team to verify placements with a trusted Kenya-first workflow.</p>
                <div className="onboarding-proof-grid">
                  <div className="onboarding-proof"><strong>Domain</strong><span>ownership check</span></div>
                  <div className="onboarding-proof"><strong>Admin</strong><span>representative review</span></div>
                  <div className="onboarding-proof"><strong>Pilot</strong><span>activation support</span></div>
                </div>
              </div>
              <div className="onboarding-checklist">
                <div className="onboarding-check">
                  <i className="bi bi-shield-lock"></i>
                  <div>
                    <h5>Verified access</h5>
                    <p>Institution accounts are approved before staff can manage students or placements.</p>
                  </div>
                </div>
                <div className="onboarding-check">
                  <i className="bi bi-diagram-3"></i>
                  <div>
                    <h5>Academic structure ready</h5>
                    <p>Departments, cohorts, supervisors, and verification controls are prepared for pilot use.</p>
                  </div>
                </div>
                <div className="onboarding-check">
                  <i className="bi bi-people"></i>
                  <div>
                    <h5>Student trust layer</h5>
                    <p>Students can affiliate with verified institutions instead of relying on untrusted profiles.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Col>

        <Col lg={6} xs={12}>
          <div className="onboarding-form-panel bg-white">
            <div className="onboarding-form-inner">
            <div className="onboarding-mobile-brief">
              <div className="onboarding-kicker"><i className="bi bi-building-check"></i> Institution onboarding</div>
              <h1>Bring verified student attachment workflows online.</h1>
              <p>Claim your official institution profile, connect student domains, and prepare your team to verify placements with a trusted Kenya-first workflow.</p>
            </div>
            <div className="onboarding-form-top">
              <div>
                <div className="onboarding-eyebrow">Request access</div>
                <h2>Institution Onboarding</h2>
                <p>Submit official institution details for review and beta activation.</p>
              </div>
              <div className="onboarding-login-link">
                <span>Already registered?</span>
                <Link to="/institution/login">Login here</Link>
              </div>
            </div>

            {submitError && (
              <Alert variant="danger" dismissible onClose={() => setSubmitError('')} className="mb-4 border-0 rounded-3 shadow-sm">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {submitError}
              </Alert>
            )}

            <div className="onboarding-steps" aria-label="Institution onboarding progress">
              {stepTitles.map((title, index) => (
                <div key={title} className={`onboarding-step ${currentStep >= index + 1 ? 'active' : ''}`}>
                  <span>{index + 1}</span>
                  {title}
                </div>
              ))}
            </div>

            <Form onSubmit={handleSubmit} className="modern-form">
              {/* Step 1: Institution Information */}
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                <div className="onboarding-section-title">
                  <div className="step-number">1</div>
                  <div>
                    <h5>Institution Details</h5>
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
                    className="rounded-3"
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
                    className="rounded-3"
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
                    className="rounded-3"
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
                    onClick={nextStep}
                    type="button"
                    variant="link"
                    className="rounded-3 px-4 onboarding-primary-btn"
                  >
                    Continue <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </div>

              {/* Step 2: Representative Information */}
              <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                <div className="onboarding-section-title">
                  <div className="step-number">2</div>
                  <div>
                    <h5>Contact Information</h5>
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
                    variant="link"
                    onClick={nextStep}
                    type="button"
                    className="rounded-3 px-4 onboarding-primary-btn"
                  >
                    Continue <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </div>

              {/* Step 3: Additional Information & Review */}
              <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                <div className="onboarding-section-title">
                  <div className="step-number">3</div>
                  <div>
                    <h5>Review & Submit</h5>
                    <p className="text-muted small mb-0">Review your information and add any final notes</p>
                  </div>
                </div>

                <div className="onboarding-review-card mb-4">
                  <h6 className="mb-3">Institution Details</h6>
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

                  <h6 className="mb-3 mt-4">Contact Information</h6>
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

                <div className="onboarding-note p-3 mb-4">
                  <div className="d-flex">
                    <i className="bi bi-info-circle fs-5 me-3"></i>
                    <div>
                      <strong>Important:</strong> Submitting this form does not create an institution account on EduLink. 
                      All requests are reviewed by our team before activation. You will receive an email notification 
                      within 3-5 business days.
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-3">
                  <Button 
                    variant="link"
                    type="submit" 
                    size="lg"
                    disabled={isSubmitting}
                    className="rounded-3 px-4 flex-grow-1 onboarding-primary-btn"
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
                Need help? <a href="/contact" className="text-decoration-none fw-semibold">Contact our support team</a>
              </p>
            </div>
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
          <Button variant="link" className="onboarding-primary-btn" onClick={() => setShowErrorModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default InstitutionRequest;
