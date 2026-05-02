import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Container, Alert, Row, Col, InputGroup, Spinner } from 'react-bootstrap';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { institutionService } from '../../../services';
import FullPageFormSkeleton from '../../../components/admin/skeletons/FullPageFormSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const InstitutionActivate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isSupervisor = location.pathname.includes('/staff/activate');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
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
        const response = await institutionService.validateInviteToken(inviteId, token);
        if (response.valid) {
          setEmail(response.email);
          setInstitutionName(response.institution_name);
          if (response.website_url) setWebsiteUrl(response.website_url);
          
          // Pre-fill names and phone ONLY if role is INSTITUTION_ADMIN (creator of the request)
          if (response.role === 'INSTITUTION_ADMIN') {
            if (response.representative_name) {
               const names = response.representative_name.trim().split(' ');
               const firstName = names[0] || '';
               const lastName = names.slice(1).join(' ') || '';
               
               setFormData(prev => ({
                  ...prev,
                  firstName: firstName,
                  lastName: lastName
               }));
            }
            
            if (response.contact_phone) {
              setFormData(prev => ({
                ...prev,
                phone: response.contact_phone || ''
              }));
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
    // Clear error for this field
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
      if (isSupervisor) {
        await institutionService.activateSupervisorAccount({
          invite_id: inviteId,
          token: token,
          first_name: formData.firstName,
          last_name: formData.lastName,
          password: formData.password,
          phone_number: formData.phone
        });
      } else {
        await institutionService.activateAccount({
          invite_id: inviteId,
          token: token,
          first_name: formData.firstName,
          last_name: formData.lastName,
          password: formData.password,
          phone_number: formData.phone
        });
      }

      // Redirect to login with success message
      navigate('/institution/login', { 
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
    return <FullPageFormSkeleton />;
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
                  <div className="mb-4" style={{ fontSize: '4rem' }}>
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
                    <h1 className="display-4 fw-bold mb-3">Welcome!</h1>
                    <p className="lead" style={{ fontSize: '1.25rem', opacity: 0.95 }}>Activate your institution admin account and start managing your organization's internship program</p>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" className="bi bi-shield-check" viewBox="0 0 16 16">
                          <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.856C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.864a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.89.24s-.61-.108-.89-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.424 62.118 62.118 0 0 1 5.072.56z"/>
                          <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">Secure & Protected</h5>
                        <p className="mb-0" style={{ opacity: 0.9 }}>Your data is encrypted and protected with enterprise-grade security</p>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" className="bi bi-lightning-charge" viewBox="0 0 16 16">
                          <path d="M11.046.646a.5.5 0 0 1 .032.852l-8 4.999a.5.5 0 0 1-.48-.864l8-4.999a.5.5 0 0 1 .448.012zm.068 13.995a.5.5 0 0 1-.432.748H5.5a.5.5 0 0 1-.447-.276l-1.974-3.323a.5.5 0 0 1 .447-.724H6.5l-2.97-4.62a.5.5 0 0 1 .532-.816l8 5a.5.5 0 0 1-.504.832l-7.953-4.97L8.5 12.5H5.5a.5.5 0 0 1-.447-.724l1.974-3.323z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">Fast & Efficient</h5>
                        <p className="mb-0" style={{ opacity: 0.9 }}>Manage internships, placements, and student artifacts seamlessly</p>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" className="bi bi-people-fill" viewBox="0 0 16 16">
                          <path d="M7 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm4-6a2.868 2.868 0 0 0-1.884-.789c.081.789.645 1.453 1.384 1.953.299.292.6.58.908.86.11.027.216.051.318.071A2.01 2.01 0 0 0 11 12.5a2 2 0 1 1-2-2z"/>
                          <path d="M16 12.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">Collaboration Ready</h5>
                        <p className="mb-0" style={{ opacity: 0.9 }}>Invite staff members and manage roles effectively</p>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-building" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V10a.5.5 0 0 1 .342-.474L6 7.64V4.5a.5.5 0 0 1 .276-.447l8-4a.5.5 0 0 1 .487.022zM6 8.691 1 10.363V15h5V8.691zM1 4.5v2.959L6 8.98V4.184l-5-2.5V4.5z"/>
                        </svg>
                      </div>
                      <h3 className="fw-bold mb-1">Activate Your Account</h3>
                      <p className="text-muted mb-0">Complete your profile to get started with {institutionName}</p>
                    </div>

                    {/* Institution Info */}
                    <div style={{
                      background: '#f8f9fa',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '24px',
                      borderLeft: '4px solid #667eea'
                    }}>
                      <p className="mb-2"><strong className="text-dark">{institutionName}</strong></p>
                      <p className="text-muted small mb-0">{email}</p>
                      {websiteUrl && (
                        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none small d-block mt-2" style={{ color: '#667eea' }}>
                          Visit Website →
                        </a>
                      )}
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
                              style={{ borderRadius: '8px', padding: '10px 14px', border: '1.5px solid #e0e0e0' }}
                            />
                            <Form.Control.Feedback type="invalid">
                              {formErrors.lastName}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-600 mb-2" style={{ fontSize: '0.95rem' }}>Phone Number (Optional)</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
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
                            {showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye-slash" viewBox="0 0 16 16">
                                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                                <path d="M11.297 9.377 8.5 6.581 6.581 8.5l2.716 2.716.747-.716.747-.746zm-.441 1.549-2.716-2.716-2.716 2.716 2.716 2.716 2.716-2.716z"/>
                                <path d="M11.297 9.377 8.5 6.581 6.581 8.5l2.716 2.716.747-.716.747-.746zm-2.797 2.124-2.716-2.716-2.716 2.716 2.716 2.716 2.716-2.716z" fill="none"/>
                                <path d="M1.333 2.667 3.667 5l9.666 9.666 2.334-2.333L3.667 2.667 1.333 5z" fill="none"/>
                                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709zM11.297 9.377 8.5 6.581 6.581 8.5l2.716 2.716.747-.716.747-.746zm-9.964-6.71 2.334 2.333c-.76.75-1.465 1.574-2.036 2.399-.195.288-.335.48-.465.666 1.168 1.638 3.12 3.879 5.834 3.879.79 0 1.53-.138 2.22-.387l.95.95A7.04 7.04 0 0 1 8 13.5c-4.997 0-8-5.5-8-5.5 0-.58.196-1.125.545-1.623l.788-.71z"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.316.43-.628.813-.93 1.16-.93 1.06-2.69 2.22-4.898 2.22-2.21 0-3.969-1.16-4.898-2.22A13.133 13.133 0 0 1 1.173 8z"/>
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                              </svg>
                            )}
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
                            {showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye-slash" viewBox="0 0 16 16">
                                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                                <path d="M11.297 9.377 8.5 6.581 6.581 8.5l2.716 2.716.747-.716.747-.746zm-.441 1.549-2.716-2.716-2.716 2.716 2.716 2.716 2.716-2.716z"/>
                                <path d="M11.297 9.377 8.5 6.581 6.581 8.5l2.716 2.716.747-.716.747-.746zm-2.797 2.124-2.716-2.716-2.716 2.716 2.716 2.716 2.716-2.716z" fill="none"/>
                                <path d="M1.333 2.667 3.667 5l9.666 9.666 2.334-2.333L3.667 2.667 1.333 5z" fill="none"/>
                                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709zM11.297 9.377 8.5 6.581 6.581 8.5l2.716 2.716.747-.716.747-.746zm-9.964-6.71 2.334 2.333c-.76.75-1.465 1.574-2.036 2.399-.195.288-.335.48-.465.666 1.168 1.638 3.12 3.879 5.834 3.879.79 0 1.53-.138 2.22-.387l.95.95A7.04 7.04 0 0 1 8 13.5c-4.997 0-8-5.5-8-5.5 0-.58.196-1.125.545-1.623l.788-.71z"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.316.43-.628.813-.93 1.16-.93 1.06-2.69 2.22-4.898 2.22-2.21 0-3.969-1.16-4.898-2.22A13.133 13.133 0 0 1 1.173 8z"/>
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                              </svg>
                            )}
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

export default InstitutionActivate;
