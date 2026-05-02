import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Container, Alert, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { employerService } from '../../../services/employer/employerService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const ActivateAdmin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [email, setEmail] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [isPhonePreFilled, setIsPhonePreFilled] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const inviteId = searchParams.get('id');
  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      if (!inviteId || !token) {
        setError('Invalid activation link. Missing parameters.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await employerService.validateInviteToken(inviteId, token);
        if (response.valid) {
          setEmail(response.email);
          setEmployerName(response.employer_name);

          // Pre-fill names from contact_person ONLY if the role is ADMIN
          // For SUPERVISORS, we want them to enter their own details, not the employer admin's details
          if (response.role === 'ADMIN') {
             if (response.contact_person) {
                const names = response.contact_person.trim().split(' ');
                const firstName = names[0] || '';
                const lastName = names.slice(1).join(' ') || '';
                
                setFormData(prev => ({
                   ...prev,
                   firstName: firstName,
                   lastName: lastName
                }));
                setIsPreFilled(true);
             }
             
             if (response.phone_number) {
                 setFormData(prev => ({
                     ...prev,
                     phoneNumber: response.phone_number || ''
                 }));
                 setIsPhonePreFilled(true);
             }
          }
        } else {
          setError('Invalid or expired activation link.');
        }
      } catch (err: any) {
        const sanitized = sanitizeAdminError(err);
        setError(sanitized.message);
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [inviteId, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!inviteId || !token) return;

    setIsSubmitting(true);
    try {
      await employerService.activateAccount({
        invite_id: inviteId,
        token: token,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
        password: formData.password
      });

      // Redirect to login (or first time setup if we have a route for that)
      // For now, redirect to login
      navigate('/employer/login', { 
        state: { 
          message: 'Account activated successfully. Please log in with your credentials.' 
        } 
      });
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="text-center text-white">
          <Spinner animation="border" role="status" variant="light" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3" style={{ opacity: 0.9 }}>Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Container>
          <Row className="justify-content-center">
            <Col md={6} lg={5}>
              <Card className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
                <Card.Body className="text-center p-5">
                  <div className="mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="#dc3545" className="bi bi-exclamation-circle" viewBox="0 0 16 16">
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                      <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                    </svg>
                  </div>
                  <h4 className="mb-3 fw-bold">Activation Error</h4>
                  <Alert variant="danger" className="mb-4">{error}</Alert>
                  <Button variant="primary" size="lg" className="px-5 fw-bold" onClick={() => navigate('/')}>Return to Home</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <Container fluid>
        <Row className="justify-content-center">
          <Col lg={10} xl={9}>
            <Row className="g-4">
              {/* Left Panel - Visual Content */}
              <Col lg={5} className="d-flex flex-column justify-content-center mb-4 mb-lg-0">
                <div className="text-white" style={{ paddingRight: '40px' }}>
                  <div style={{ marginBottom: '40px' }}>
                    <h1 className="display-4 fw-bold mb-3">Ready to Onboard Interns?</h1>
                    <p className="lead" style={{ fontSize: '1.25rem', opacity: 0.95 }}>Activate your employer account and start building your talent pipeline with ease</p>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <div className="d-flex mb-4" style={{ alignItems: 'flex-start' }}>
                      <div className="me-3" style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" className="bi bi-star" viewBox="0 0 16 16">
                          <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.160-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.526 0z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">Trusted by Top Employers</h5>
                        <p className="mb-0" style={{ opacity: 0.9 }}>Join hundreds of companies recruiting top talent through Edulink</p>
                      </div>
                    </div>

                    <div className="d-flex mb-4" style={{ alignItems: 'flex-start' }}>
                      <div className="me-3" style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" className="bi bi-speedometer" viewBox="0 0 16 16">
                          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/>
                          <path d="M8 4.5a.5.5 0 0 1 .5.5v3.362l2.236-2.236a.5.5 0 1 1 .707.707l-3 3a.5.5 0 0 1-.707 0l-3-3a.5.5 0 1 1 .707-.707L7.5 8.362V5a.5.5 0 0 1 .5-.5z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">Quick & Simple</h5>
                        <p className="mb-0" style={{ opacity: 0.9 }}>Get set up in minutes and start posting opportunities right away</p>
                      </div>
                    </div>

                    <div className="d-flex" style={{ alignItems: 'flex-start' }}>
                      <div className="me-3" style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" className="bi bi-graph-up" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M0 0h1v15h15v1H0V0zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">Grow Your Team</h5>
                        <p className="mb-0" style={{ opacity: 0.9 }}>Access quality candidates from verified educational institutions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>

              {/* Right Panel - Form */}
              <Col lg={7}>
                <Card className="shadow-lg border-0 h-100" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                  <Card.Body className="p-5">
                    {/* Header */}
                    <div className="mb-4">
                      <div className="d-inline-flex align-items-center justify-content-center" style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        marginBottom: '20px'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-briefcase" viewBox="0 0 16 16">
                          <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1h-3zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5zm1.886 6.914L15 7.151V12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V7.15l6.614 1.763a1.5 1.5 0 0 0 .772 0z"/>
                        </svg>
                      </div>
                      <h3 className="fw-bold mb-1">Activate Your Account</h3>
                      <p className="text-muted mb-0">Complete your profile to manage internship opportunities at {employerName}</p>
                    </div>

                    {/* Employer Info */}
                    <div style={{
                      background: '#f8f9fa',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '24px',
                      borderLeft: '4px solid #667eea'
                    }}>
                      <p className="mb-2"><strong className="text-dark">{employerName}</strong></p>
                      <p className="text-muted small mb-0">{email}</p>
                    </div>

                    {/* Form */}
                    <Form onSubmit={handleSubmit}>
                      <Row className="g-3 mb-3">
                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="fw-600 mb-2" style={{ fontSize: '0.95rem' }}>First Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              isInvalid={!!formErrors.firstName}
                              placeholder="Enter first name"
                              readOnly={isPreFilled}
                              className={isPreFilled ? "bg-light" : ""}
                              style={{ borderRadius: '8px', padding: '10px 14px', border: '1.5px solid #e0e0e0' }}
                            />
                            <Form.Control.Feedback type="invalid">
                              {formErrors.firstName}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="fw-600 mb-2" style={{ fontSize: '0.95rem' }}>Last Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              isInvalid={!!formErrors.lastName}
                              placeholder="Enter last name"
                              readOnly={isPreFilled}
                              className={isPreFilled ? "bg-light" : ""}
                              style={{ borderRadius: '8px', padding: '10px 14px', border: '1.5px solid #e0e0e0' }}
                            />
                            <Form.Control.Feedback type="invalid">
                              {formErrors.lastName}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-600 mb-2" style={{ fontSize: '0.95rem' }}>Phone Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                          readOnly={isPhonePreFilled}
                          className={isPhonePreFilled ? "bg-light" : ""}
                          style={{ borderRadius: '8px', padding: '10px 14px', border: '1.5px solid #e0e0e0' }}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-600 mb-2" style={{ fontSize: '0.95rem' }}>Create Password</Form.Label>
                        <InputGroup hasValidation>
                          <Form.Control
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            isInvalid={!!formErrors.password}
                            placeholder="Min. 8 characters"
                            style={{ borderRadius: '8px 0 0 8px', padding: '10px 14px', border: '1.5px solid #e0e0e0' }}
                          />
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                            style={{ borderRadius: '0 8px 8px 0' }}
                          >
                            <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                          </Button>
                          <Form.Control.Feedback type="invalid">
                            {formErrors.password}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-600 mb-2" style={{ fontSize: '0.95rem' }}>Confirm Password</Form.Label>
                        <InputGroup hasValidation>
                          <Form.Control
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            isInvalid={!!formErrors.confirmPassword}
                            placeholder="Re-enter password"
                            style={{ borderRadius: '8px 0 0 8px', padding: '10px 14px', border: '1.5px solid #e0e0e0' }}
                          />
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                            style={{ borderRadius: '0 8px 8px 0' }}
                          >
                            <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                          </Button>
                          <Form.Control.Feedback type="invalid">
                            {formErrors.confirmPassword}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>

                      <div className="d-grid mb-3">
                        <Button 
                          type="submit" 
                          disabled={isSubmitting} 
                          className="fw-bold py-2"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem'
                          }}
                        >
                          {isSubmitting ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Activating...
                            </>
                          ) : (
                            'Activate Account'
                          )}
                        </Button>
                      </div>

                      <p className="text-center text-muted small mb-0">
                        By activating, you agree to Edulink's <a href="/terms" className="text-decoration-none" style={{ color: '#667eea' }}>Terms</a> and <a href="/privacy" className="text-decoration-none" style={{ color: '#667eea' }}>Privacy Policy</a>
                      </p>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ActivateAdmin;
