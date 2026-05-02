import React, { useState } from 'react';
import { Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { employerService } from '../../../services/employer/employerService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import type { EmployerRequestData } from '../../../services/employer/employerService';
import '../../../styles/onboarding-request.css';

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
  const totalSteps = 3;

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
      const sanitized = sanitizeAdminError(error);
      setSubmitError(sanitized.message);
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
      <Container fluid className="onboarding-page">
        <Row className="onboarding-shell g-0">
          <Col lg={6} className="d-none d-lg-block">
            <div className="onboarding-brand-panel employer">
              <div className="onboarding-brand-content">
                <div>
                  <div className="onboarding-kicker"><i className="bi bi-briefcase"></i> Employer review queued</div>
                  <h1 className="onboarding-brand-title">Your employer request is ready for review.</h1>
                  <p className="onboarding-brand-copy">EduLink checks organization identity and official domains before employers can publish trusted opportunities.</p>
                </div>
                <div className="onboarding-checklist">
                  <div className="onboarding-check">
                    <i className="bi bi-clock-history"></i>
                    <div>
                      <h5>3-5 business days</h5>
                      <p>Review covers organization legitimacy, contact details, and hiring readiness.</p>
                    </div>
                  </div>
                  <div className="onboarding-check">
                    <i className="bi bi-envelope-check"></i>
                    <div>
                      <h5>Email confirmation</h5>
                      <p>Your contact person receives the activation instructions after approval.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={6} xs={12}>
            <div className="onboarding-form-panel">
              <div className="onboarding-success-card text-center">
                <div className="onboarding-success-icon">
                  <i className="bi bi-check2"></i>
                </div>
                <h2 className="mb-3 fw-bold">Request Submitted</h2>
                <p className="text-muted mb-4 fs-5">
                  Thank you for your interest. Save your tracking code and use it to check review progress.
                </p>
                <div className="mb-4">
                  <div className="onboarding-tracking-code text-start">
                    <span className="text-muted small fw-bold text-uppercase">Tracking code</span>
                    <strong>{trackingCode}</strong>
                  </div>
                </div>
                <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                  <Button variant="outline-primary" onClick={() => navigate('/')}>Return Home</Button>
                  <Button variant="link" className="onboarding-primary-btn" onClick={() => navigate('/employer/track')}>Track Request</Button>
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
          <div className="onboarding-brand-panel employer w-100">
            <div className="onboarding-brand-content">
              <div>
                <div className="onboarding-kicker"><i className="bi bi-patch-check"></i> Employer onboarding</div>
                <h1 className="onboarding-brand-title">Publish trusted internships students can believe in.</h1>
                <p className="onboarding-brand-copy">Request access for your organization, verify official contact channels, and prepare to manage applications, interns, supervisors, and placement evidence.</p>
                <div className="onboarding-proof-grid">
                  <div className="onboarding-proof"><strong>Trust</strong><span>organization review</span></div>
                  <div className="onboarding-proof"><strong>Talent</strong><span>verified students</span></div>
                  <div className="onboarding-proof"><strong>Control</strong><span>supervisor workflows</span></div>
                </div>
              </div>
              <div className="onboarding-checklist">
                <div className="onboarding-check">
                  <i className="bi bi-shield-check"></i>
                  <div>
                    <h5>Verified employer profile</h5>
                    <p>Official domain and organization details are reviewed before activation.</p>
                  </div>
                </div>
                <div className="onboarding-check">
                  <i className="bi bi-kanban"></i>
                  <div>
                    <h5>Placement pipeline</h5>
                    <p>Manage opportunities, applicants, supervisors, reviews, and completion decisions.</p>
                  </div>
                </div>
                <div className="onboarding-check">
                  <i className="bi bi-person-check"></i>
                  <div>
                    <h5>Student-ready workflows</h5>
                    <p>Build trust with students and institutions before the pilot starts.</p>
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
              <div className="onboarding-kicker"><i className="bi bi-patch-check"></i> Employer onboarding</div>
              <h1>Publish trusted internships students can believe in.</h1>
              <p>Request access for your organization, verify official contact channels, and prepare to manage applications, interns, supervisors, and placement evidence.</p>
            </div>
            <div className="onboarding-form-top">
              <div>
                <div className="onboarding-eyebrow">Request access</div>
                <h2>Employer Onboarding</h2>
                <p>Submit organization details for review and trusted opportunity publishing.</p>
              </div>
              <div className="onboarding-login-link">
                <span>Already registered?</span>
                <Link to="/employer/login">Login here</Link>
              </div>
            </div>

            {submitError && (
              <Alert variant="danger" dismissible onClose={() => setSubmitError('')} className="mb-4 border-0 rounded-3 shadow-sm">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {submitError}
              </Alert>
            )}

            <div className="onboarding-steps" aria-label="Employer onboarding progress">
              {stepTitles.map((title, index) => (
                <div key={title} className={`onboarding-step ${currentStep >= index + 1 ? 'active' : ''}`}>
                  <span>{index + 1}</span>
                  {title}
                </div>
              ))}
            </div>

            <Form onSubmit={handleSubmit}>
              {currentStep === 1 && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Organization Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      isInvalid={!!errors.name}
                      placeholder="e.g. Acme Corp"
                      className="rounded-3"
                    />
                    <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Organization Type <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      name="organization_type"
                      value={formData.organization_type}
                      onChange={handleInputChange}
                      isInvalid={!!errors.organization_type}
                      className="rounded-3"
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
                    <Form.Label className="fw-semibold">Official Domain <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="domain"
                      value={formData.domain}
                      onChange={handleInputChange}
                      isInvalid={!!errors.domain}
                      placeholder="e.g. acme.com"
                      className="rounded-3"
                    />
                    <Form.Text className="text-muted small">
                      Your organization's primary domain name.
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">{errors.domain}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Official Email <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="email"
                      name="official_email"
                      value={formData.official_email}
                      onChange={handleInputChange}
                      isInvalid={!!errors.official_email}
                      placeholder="admin@acme.com"
                      className="rounded-3"
                    />
                    <Form.Text className="text-muted small">
                      Must match the domain provided above.
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">{errors.official_email}</Form.Control.Feedback>
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
                </>
              )}

              {currentStep === 2 && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Contact Person Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      isInvalid={!!errors.contact_person}
                      className="rounded-3"
                    />
                    <Form.Control.Feedback type="invalid">{errors.contact_person}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Phone Number <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      isInvalid={!!errors.phone_number}
                      placeholder="+1 234 567 8900"
                      className="rounded-3"
                    />
                    <Form.Control.Feedback type="invalid">{errors.phone_number}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Website URL</Form.Label>
                    <Form.Control
                      type="url"
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleInputChange}
                      isInvalid={!!errors.website_url}
                      placeholder="https://www.acme.com"
                      className="rounded-3"
                    />
                    <Form.Control.Feedback type="invalid">{errors.website_url}</Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Registration Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="registration_number"
                      value={formData.registration_number}
                      onChange={handleInputChange}
                      placeholder="e.g. Tax ID or Company Reg No."
                      className="rounded-3"
                    />
                  </Form.Group>

                  <div className="d-flex justify-content-between">
                    <Button variant="outline-secondary" onClick={prevStep} type="button" className="rounded-3 px-4">
                      Back
                    </Button>
                    <Button 
                      onClick={nextStep}
                      type="button"
                      variant="link"
                      className="rounded-3 px-4 onboarding-primary-btn"
                    >
                      Continue <i className="bi bi-arrow-right ms-2"></i>
                    </Button>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <div>
                  <div className="onboarding-section-title">
                    <div className="step-number">3</div>
                    <div>
                      <h5>Review & Submit</h5>
                      <p>Confirm organization details before sending the request.</p>
                    </div>
                  </div>
                  
                  <div className="onboarding-review-card mb-4">
                    <h6 className="mb-3">Organization Details</h6>
                    <div>
                      <p className="mb-1"><strong>Name:</strong> {formData.name}</p>
                      <p className="mb-1"><strong>Type:</strong> {formData.organization_type}</p>
                      <p className="mb-1"><strong>Domain:</strong> {formData.domain}</p>
                      <p className="mb-1"><strong>Official Email:</strong> {formData.official_email}</p>
                    </div>
                  </div>

                  <div className="onboarding-review-card mb-4">
                    <h6 className="mb-3">Contact & Additional Info</h6>
                    <div>
                      <p className="mb-1"><strong>Contact Person:</strong> {formData.contact_person}</p>
                      <p className="mb-1"><strong>Phone:</strong> {formData.phone_number}</p>
                      <p className="mb-1"><strong>Website:</strong> {formData.website_url || 'N/A'}</p>
                      <p className="mb-1"><strong>Registration No:</strong> {formData.registration_number || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <Alert variant="info" className="onboarding-note d-flex align-items-center">
                    <i className="bi bi-info-circle-fill me-3 fs-4"></i>
                    <div>
                      By submitting this request, you confirm that you are authorized to represent this organization.
                    </div>
                  </Alert>
                </div>
              )}

              {currentStep === totalSteps && (
                <div className="d-flex justify-content-between mt-5">
                  <Button variant="outline-secondary" onClick={prevStep} type="button" className="rounded-3 px-4">
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    variant="link"
                    className="rounded-3 px-4 onboarding-primary-btn"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              )}
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
    </Container>
  );
};

export default RequestSubmission;
