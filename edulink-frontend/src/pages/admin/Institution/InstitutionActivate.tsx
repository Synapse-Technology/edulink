import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Container, Alert, Row, Col, InputGroup, Spinner } from 'react-bootstrap';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { institutionService } from '../../../services';
import FullPageFormSkeleton from '../../../components/admin/skeletons/FullPageFormSkeleton';

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
        setError(err.message || 'Failed to validate activation link.');
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
      setError(err.message || 'Failed to activate account.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FullPageFormSkeleton />;
  }

  if (error) {
    return (
      <Container className="d-flex justify-content-center align-items-center bg-light" style={{ minHeight: '100vh' }}>
        <Card className="shadow border-0" style={{ maxWidth: '500px', width: '100%' }}>
          <Card.Body className="text-center p-5">
            <div className="mb-4 text-danger">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-exclamation-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
              </svg>
            </div>
            <h4 className="mb-3 fw-bold">Activation Error</h4>
            <Alert variant="danger" className="mb-4">{error}</Alert>
            <Button variant="primary" size="lg" className="px-5" onClick={() => navigate('/')}>Return to Home</Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <div className="bg-light min-vh-100 d-flex flex-column justify-content-center py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <div className="text-center mb-4">
              <h2 className="fw-bold text-primary">Edulink</h2>
              <p className="text-muted">Institution Admin Activation</p>
            </div>
            
            <Card className="shadow border-0 rounded-3">
              <Card.Header className="bg-white border-bottom-0 pt-4 pb-0 px-4 text-center">
                <div className="avatar-placeholder mb-3 d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle" style={{ width: '64px', height: '64px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-building" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M14.763.075A.5.5 0 0 1 15 .5v15a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V14h-1v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V10a.5.5 0 0 1 .342-.474L6 7.64V4.5a.5.5 0 0 1 .276-.447l8-4a.5.5 0 0 1 .487.022zM6 8.691 1 10.363V15h5V8.691zM1 4.5v2.959L6 8.98V4.184l-5-2.5V4.5z"/>
                  </svg>
                </div>
                <h4 className="mb-1">{institutionName}</h4>
                {websiteUrl && (
                  <div className="mb-2">
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none small">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="bi bi-link-45deg me-1" viewBox="0 0 16 16">
                        <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/>
                        <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/>
                      </svg>
                      {websiteUrl}
                    </a>
                  </div>
                )}
                <p className="text-muted small mb-3">{email}</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                <Form onSubmit={handleSubmit}>
                  <Row className="g-3 mb-3">
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label className="small text-muted mb-1">First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.firstName}
                          placeholder="Enter first name"
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.firstName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label className="small text-muted mb-1">Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          isInvalid={!!formErrors.lastName}
                          placeholder="Enter last name"
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.lastName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted mb-1">Phone Number (Optional)</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted mb-1">Create Password</Form.Label>
                    <InputGroup hasValidation>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        isInvalid={!!formErrors.password}
                        placeholder="Min. 8 characters"
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
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
                    <Form.Label className="small text-muted mb-1">Confirm Password</Form.Label>
                    <InputGroup hasValidation>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        isInvalid={!!formErrors.confirmPassword}
                        placeholder="Re-enter password"
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
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

                  <div className="d-grid">
                    <Button variant="primary" type="submit" size="lg" disabled={isSubmitting} className="fw-bold">
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
                          Activating Account...
                        </>
                      ) : (
                        'Activate Account'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
              <Card.Footer className="bg-light text-center py-3 border-top-0">
                <small className="text-muted">
                  By activating, you agree to Edulink's <a href="#" className="text-decoration-none">Terms</a> and <a href="#" className="text-decoration-none">Privacy Policy</a>
                </small>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default InstitutionActivate;
