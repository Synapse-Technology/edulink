import React, { useState } from 'react';
import { Form, Button, Card, Container, Alert, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';

const InstitutionLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  
  const { loginInstitution, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (apiError) setApiError(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await loginInstitution({ email: formData.email, password: formData.password });
      
      // Check role after login (assuming the store updates the user state)
      // Note: In a real app, we might need to check the user from the store or response
      // But useAuthStore.login usually handles the state update.
      // We can redirect based on role, or the store might handle it.
      // For now, let's assume successful login leads to dashboard if it's an institution admin.
      // We might need to verify the role here if the login action doesn't return the user directly
      // or if we need to enforce "Institution Admin only" on this specific page.
      
      const user = useAuthStore.getState().user;
      if (user?.role === 'institution_admin') {
         navigate('/institution/dashboard');
      } else if (user?.role === 'supervisor') {
         if (user && user.institution_id) {
             navigate('/institution/supervisor-dashboard');
         } else {
             setApiError('Access restricted to Institution Supervisors.');
             await useAuthStore.getState().logout();
         }
      } else {
         if (user) {
             setApiError('Access restricted to Institution Administrators and Supervisors.');
             await useAuthStore.getState().logout();
         }
      }

    } catch (error: any) {
      setApiError(error.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center institution-login-bg py-5">
      <style>
        {`
          .institution-login-bg {
            background-color: #f0f2f5;
          }
          .login-card {
            border: 1px solid #0d6efd;
          }
          .btn-custom-primary {
            background-color: #0d6efd;
            border-color: #0d6efd;
            color: white;
            transition: all 0.2s ease-in-out;
          }
          .btn-custom-primary:hover, 
          .btn-custom-primary:focus, 
          .btn-custom-primary:active {
            background-color: #0b5ed7 !important;
            border-color: #0a58ca !important;
            color: white !important;
          }
        `}
      </style>
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <div className="text-center mb-4">
              <h2 className="fw-bold text-primary">EduLink</h2>
              <p className="text-muted">Institution Administration</p>
            </div>
            
            <Card className="shadow login-card">
              <Card.Body className="p-4">
                <h4 className="card-title text-center mb-4 fw-bold">Admin Login</h4>
                
                {apiError && (
                  <Alert variant="danger" onClose={() => setApiError(null)} dismissible>
                    {apiError}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small text-muted mb-1">Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      isInvalid={!!formErrors.email}
                      placeholder="name@institution.edu"
                      autoFocus
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="small text-muted mb-0">Password</Form.Label>
                      <a href="/forgot-password" className="small text-decoration-none">Forgot password?</a>
                    </div>
                    <InputGroup hasValidation>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        isInvalid={!!formErrors.password}
                        placeholder="Enter your password"
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

                  <div className="d-grid">
                    <Button variant="primary" type="submit" size="lg" disabled={isLoading} className="fw-bold btn-custom-primary">
                      {isLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
              <Card.Footer className="bg-light text-center py-3 border-top-0">
                <small className="text-muted">
                  Don't have an account? <a href="/institution/request" className="text-decoration-none">Register your institution</a>
                </small>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default InstitutionLogin;
