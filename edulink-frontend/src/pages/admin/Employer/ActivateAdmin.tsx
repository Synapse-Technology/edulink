import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Container, Alert, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { employerService } from '../../../services/employer/employerService';

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
      setError(err.message || 'Failed to activate account.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center bg-light" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3 text-muted">Verifying invitation...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="d-flex justify-content-center align-items-center bg-light" style={{ minHeight: '100vh' }}>
        <Card className="shadow border-0" style={{ maxWidth: '500px', width: '100%' }}>
          <Card.Body className="text-center p-5">
            <div className="mb-4 text-danger">
              <i className="bi bi-exclamation-circle" style={{ fontSize: '4rem' }}></i>
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
              <p className="text-muted">Account Activation</p>
            </div>
            
            <Card className="shadow border-0 rounded-3">
              <Card.Header className="bg-white border-bottom-0 pt-4 pb-0 px-4 text-center">
                <div className="mb-3 d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle" style={{ width: '64px', height: '64px' }}>
                  <i className="bi bi-building fs-3"></i>
                </div>
                <h4 className="mb-1">{employerName}</h4>
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
                          readOnly={isPreFilled}
                          className={isPreFilled ? "bg-light" : ""}
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
                          readOnly={isPreFilled}
                          className={isPreFilled ? "bg-light" : ""}
                        />
                        <Form.Control.Feedback type="invalid">
                          {formErrors.lastName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted mb-1">Phone Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      readOnly={isPhonePreFilled}
                      className={isPhonePreFilled ? "bg-light" : ""}
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
                        <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
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
                         <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
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
                          Activating...
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

export default ActivateAdmin;
