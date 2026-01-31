import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Container, Row, Col, ProgressBar } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { employerService } from '../../../services/employer/employerService';
import type { EmployerRequestData } from '../../../services/employer/employerService';

interface EmployerRequestForm {
  name: string;
  official_email: string;
  domain: string;
  organization_type: string;
  contact_person: string;
  phone_number: string;
  website_url: string;
  registration_number: string;
}

const RequestSubmission: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmployerRequestForm>({
    name: '',
    official_email: '',
    domain: '',
    organization_type: '',
    contact_person: '',
    phone_number: '',
    website_url: '',
    registration_number: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [progress, setProgress] = useState(33);

  const totalSteps = 3;

  useEffect(() => {
    const progressPercentage = (currentStep / totalSteps) * 100;
    setProgress(progressPercentage);
  }, [currentStep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Organization name is required';
      }

      if (!formData.organization_type) {
        newErrors.organization_type = 'Organization type is required';
      }

      if (!formData.official_email.trim()) {
        newErrors.official_email = 'Official email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.official_email)) {
        newErrors.official_email = 'Please enter a valid email address';
      }

      if (!formData.domain.trim()) {
        newErrors.domain = 'Domain is required';
      } else if (formData.domain.includes(',')) {
         // Simple check, backend handles more complex validation
         // But for UX, let's keep it simple. User might enter comma separated, but backend expects single string?
         // The backend model has `domain` as CharField, but prompt said "Claimed domain(s)".
         // Let's assume single domain for now as primary identifier, or comma separated string.
         // Let's stick to single domain for simplicity as per model definition `domain = models.CharField(max_length=255)`.
      }
      
      // Check if email matches domain
      if (formData.official_email && formData.domain) {
        const emailDomain = formData.official_email.split('@')[1]?.toLowerCase();
        const claimedDomain = formData.domain.trim().toLowerCase();
        if (emailDomain !== claimedDomain && !emailDomain.endsWith('.' + claimedDomain)) {
           newErrors.official_email = 'Email domain must match the claimed domain';
        }
      }
    }

    if (step === 2) {
      if (!formData.contact_person.trim()) {
        newErrors.contact_person = 'Contact person name is required';
      }

      if (!formData.phone_number.trim()) {
        newErrors.phone_number = 'Phone number is required';
      } else if (!/^\+?[\d\s-]{8,}$/.test(formData.phone_number.trim())) {
         newErrors.phone_number = 'Please enter a valid phone number';
      }
      
      // Website URL is optional but if provided should be valid
      if (formData.website_url.trim()) {
        if (!formData.website_url.startsWith('http')) {
          newErrors.website_url = 'URL must start with http:// or https://';
        } else if (formData.domain.trim() && !formData.website_url.toLowerCase().includes(formData.domain.trim().toLowerCase())) {
          newErrors.website_url = 'Website URL must match the official domain';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent auto-submit on earlier steps
    if (currentStep !== totalSteps) return;
    
    // Final validation
    if (!validateStep(1) || !validateStep(2)) {
       // If step 2 validation fails but we are on step 3 (review), we should probably go back or just show error.
       // But let's assume valid state if they reached here.
       // Re-running validation for all steps is safer.
       const step1Valid = validateStep(1);
       const step2Valid = validateStep(2);
       if (!step1Valid) { setCurrentStep(1); return; }
       if (!step2Valid) { setCurrentStep(2); return; }
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload: EmployerRequestData = {
        name: formData.name.trim(),
        official_email: formData.official_email.trim(),
        domain: formData.domain.trim(),
        organization_type: formData.organization_type,
        contact_person: formData.contact_person.trim(),
        phone_number: formData.phone_number.trim(),
        website_url: formData.website_url.trim(),
        registration_number: formData.registration_number.trim(),
      };

      const response = await employerService.submitRequest(payload);
      setTrackingCode(response.tracking_code);
      setSubmitSuccess(true);

    } catch (error: any) {
      const errorMessage = error.errorMessage || error.message || 'An unexpected error occurred';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    'Organization Details',
    'Contact & Additional Info',
    'Review & Submit'
  ];

  if (submitSuccess) {
    return (
      <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center p-0 bg-light">
        <Row className="w-100 g-0">
          <Col lg={6} className="d-none d-lg-block">
            <div className="success-branding h-100 d-flex flex-column justify-content-center align-items-center p-5" style={{ background: 'linear-gradient(135deg, #0dcaf0 0%, #0d6efd 100%)' }}>
              <div className="text-center mb-5">
                <h1 className="display-4 fw-bold mb-3 text-white">Success!</h1>
                <p className="lead mb-4 text-white-75">Your request has been submitted successfully</p>
              </div>
              
              <div className="features-list text-white">
                 <div className="mb-4"><i className="bi bi-clock me-2"></i> Review within 3-5 business days</div>
                 <div className="mb-4"><i className="bi bi-envelope me-2"></i> Email confirmation sent</div>
              </div>
            </div>
          </Col>

          <Col lg={6} xs={12}>
            <div className="success-container h-100 d-flex flex-column justify-content-center p-4 p-lg-5">
              <div className="text-center">
                <h2 className="mb-3 fw-bold text-primary">Request Submitted!</h2>
                <p className="text-muted mb-4 fs-5">
                  Thank you for your interest. Please save your tracking code below.
                </p>
                <div className="mb-4">
                  <div className="alert alert-info d-inline-block text-start p-4">
                    <div className="fw-bold mb-1">Your Tracking Code</div>
                    <div className="display-6 fw-bold text-primary">{trackingCode}</div>
                  </div>
                </div>
                <div className="d-flex justify-content-center gap-3">
                  <Button variant="outline-primary" onClick={() => navigate('/')}>Return Home</Button>
                  <Button variant="primary" onClick={() => navigate('/employer/track')}>Track Request</Button>
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
          <div className="branding-side h-100 d-flex flex-column justify-content-center align-items-center p-5 position-relative" style={{ background: 'linear-gradient(135deg, #0dcaf0 0%, #0d6efd 100%)' }}>
            <div className="text-center mb-5 text-white">
              <h1 className="display-4 fw-bold mb-3">EduLink for Employers</h1>
              <p className="lead mb-4">Connect with top talent from leading institutions.</p>
            </div>
            <div className="text-white-75">
               <p><i className="bi bi-check-circle me-2"></i> Verified Talent Pool</p>
               <p><i className="bi bi-check-circle me-2"></i> Streamlined Recruitment</p>
               <p><i className="bi bi-check-circle me-2"></i> Integrated Workflow</p>
            </div>
          </div>
        </Col>

        <Col lg={6} xs={12}>
          <div className="form-side h-100 d-flex flex-column justify-content-center p-4 p-lg-5 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="fw-bold mb-2 text-primary">Employer Onboarding</h2>
                <p className="text-muted mb-0">Register your organization to start hiring.</p>
              </div>
              <div className="text-end">
                <span className="text-muted small d-block">Already have an account?</span>
                <Link to="/employer/login" className="fw-bold text-decoration-none text-primary">Sign In</Link>
              </div>
            </div>

            {submitError && (
              <Alert variant="danger" dismissible onClose={() => setSubmitError('')}>
                {submitError}
              </Alert>
            )}

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Step {currentStep} of {totalSteps}</span>
                <span className="fw-bold text-primary">{stepTitles[currentStep - 1]}</span>
              </div>
              <ProgressBar now={progress} style={{ height: '6px' }} variant="info" />
            </div>

            <Form onSubmit={handleSubmit}>
              {currentStep === 1 && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Organization Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      isInvalid={!!errors.name}
                      placeholder="e.g. Acme Corp"
                    />
                    <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Organization Type <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      name="organization_type"
                      value={formData.organization_type}
                      onChange={handleInputChange}
                      isInvalid={!!errors.organization_type}
                    >
                      <option value="">Select Type...</option>
                      <option value="Private Company">Private Company</option>
                      <option value="Public Company">Public Company</option>
                      <option value="Non-Profit">Non-Profit</option>
                      <option value="Government">Government</option>
                      <option value="Startup">Startup</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.organization_type}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Official Domain <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="domain"
                      value={formData.domain}
                      onChange={handleInputChange}
                      isInvalid={!!errors.domain}
                      placeholder="e.g. acme.com"
                    />
                    <Form.Text className="text-muted">
                      Your organization's primary domain name.
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">{errors.domain}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Official Email <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="email"
                      name="official_email"
                      value={formData.official_email}
                      onChange={handleInputChange}
                      isInvalid={!!errors.official_email}
                      placeholder="admin@acme.com"
                    />
                    <Form.Text className="text-muted">
                      Must match the domain provided above.
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">{errors.official_email}</Form.Control.Feedback>
                  </Form.Group>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact Person Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      isInvalid={!!errors.contact_person}
                    />
                    <Form.Control.Feedback type="invalid">{errors.contact_person}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Phone Number <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      isInvalid={!!errors.phone_number}
                      placeholder="+1 234 567 8900"
                    />
                    <Form.Control.Feedback type="invalid">{errors.phone_number}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Website URL</Form.Label>
                    <Form.Control
                      type="url"
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleInputChange}
                      isInvalid={!!errors.website_url}
                      placeholder="https://www.acme.com"
                    />
                    <Form.Control.Feedback type="invalid">{errors.website_url}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Registration Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="registration_number"
                      value={formData.registration_number}
                      onChange={handleInputChange}
                      placeholder="e.g. Tax ID or Company Reg No."
                    />
                  </Form.Group>
                </>
              )}

              {currentStep === 3 && (
                <div className="review-section">
                  <h5 className="mb-4">Please review your information</h5>
                  
                  <div className="mb-4">
                    <h6 className="text-muted text-uppercase small fw-bold">Organization Details</h6>
                    <div className="ps-3 border-start border-3 border-primary">
                      <p className="mb-1"><strong>Name:</strong> {formData.name}</p>
                      <p className="mb-1"><strong>Type:</strong> {formData.organization_type}</p>
                      <p className="mb-1"><strong>Domain:</strong> {formData.domain}</p>
                      <p className="mb-1"><strong>Official Email:</strong> {formData.official_email}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="text-muted text-uppercase small fw-bold">Additional Info</h6>
                    <div className="ps-3 border-start border-3 border-primary">
                      <p className="mb-1"><strong>Contact Person:</strong> {formData.contact_person}</p>
                      <p className="mb-1"><strong>Phone:</strong> {formData.phone_number}</p>
                      <p className="mb-1"><strong>Website:</strong> {formData.website_url || 'N/A'}</p>
                      <p className="mb-1"><strong>Registration No:</strong> {formData.registration_number || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <Alert variant="info" className="d-flex align-items-center">
                    <i className="bi bi-info-circle-fill me-3 fs-4"></i>
                    <div>
                      By submitting this request, you confirm that you are authorized to represent this organization.
                    </div>
                  </Alert>
                </div>
              )}

              <div className="d-flex justify-content-between mt-5">
                {currentStep > 1 ? (
                  <Button variant="outline-secondary" onClick={prevStep} type="button">
                    Back
                  </Button>
                ) : (
                  <div></div>
                )}
                
                {currentStep < totalSteps ? (
                  <Button variant="primary" onClick={nextStep} type="button">
                    Next Step
                  </Button>
                ) : (
                  <Button variant="success" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                )}
              </div>
            </Form>

            <div className="mt-4 pt-3 border-top text-center">
              <p className="text-muted small mb-0">
                Need help? <a href="/contact" className="text-decoration-none text-primary">Contact our support team</a>
              </p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default RequestSubmission;
