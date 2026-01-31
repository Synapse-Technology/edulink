import React, { useState } from 'react';
import { Form, Button, Card, Container, Alert, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';

const EmployerLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  
  const { loginEmployer, isLoading } = useAuthStore();
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
      await loginEmployer({ email: formData.email, password: formData.password });
      
      const user = useAuthStore.getState().user;
      if (user?.role === 'employer_admin') {
         navigate('/employer/dashboard');
      } else if (user?.role === 'supervisor') {
         navigate('/employer/supervisor/dashboard');
      } else {
         if (user) {
             setApiError('Access restricted to Employer Administrators and Supervisors.');
             await useAuthStore.getState().logout();
         }
      }

    } catch (error: any) {
      setApiError(error.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center employer-login-bg py-5">
      <style>
        {`
          .employer-login-bg {
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
              <p className="text-muted">Employer Portal</p>
            </div>
            
            <Card className="shadow login-card">
              <Card.Body className="p-4">
                <h4 className="card-title text-center mb-4 fw-bold">Employer Login</h4>
                
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
                      placeholder="name@company.com"
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
                           <i className="bi bi-eye-slash"></i>
                        ) : (
                           <i className="bi bi-eye"></i>
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
                  Don't have an account? <a href="/employer/onboarding" className="text-decoration-none">Register your organization</a>
                </small>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default EmployerLogin;
