import React, { useState } from 'react';
import { Form, Button, Alert, Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { employerService } from '../../../services/employer/employerService';
import type { EmployerRequestStatusResponse } from '../../../services/employer/employerService';

const RequestTracking: React.FC = () => {
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState('');
  const [statusData, setStatusData] = useState<EmployerRequestStatusResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) {
      setError('Please enter a tracking code');
      return;
    }

    setIsLoading(true);
    setError('');
    setStatusData(null);

    try {
      const data = await employerService.getRequestStatus(trackingCode.trim());
      setStatusData(data);
    } catch (err: any) {
      setError(err.errorMessage || err.message || 'Could not find request with this tracking code');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge bg="success" className="fs-6">Approved</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="fs-6">Rejected</Badge>;
      case 'PENDING':
        return <Badge bg="warning" text="dark" className="fs-6">Pending Review</Badge>;
      default:
        return <Badge bg="secondary" className="fs-6">{status}</Badge>;
    }
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center p-0 bg-light">
      <Row className="w-100 g-0 shadow-lg">
        <Col lg={6} className="d-none d-lg-block">
          <div className="branding-side h-100 d-flex flex-column justify-content-center align-items-center p-5 position-relative" style={{ background: 'linear-gradient(135deg, #6610f2 0%, #6f42c1 100%)' }}>
             <div className="text-center mb-5 text-white">
              <h1 className="display-4 fw-bold mb-3">Track Request</h1>
              <p className="lead mb-4">Check the status of your employer onboarding request.</p>
            </div>
          </div>
        </Col>

        <Col lg={6} xs={12}>
          <div className="form-side h-100 d-flex flex-column justify-content-center p-4 p-lg-5 bg-white">
            <div className="mb-5">
              <Button variant="link" className="p-0 text-decoration-none mb-4" onClick={() => navigate('/')}>
                <i className="bi bi-arrow-left me-2"></i> Back to Home
              </Button>
              <h2 className="fw-bold mb-2">Request Status</h2>
              <p className="text-muted">Enter your tracking code to see the current status.</p>
            </div>

            <Form onSubmit={handleTrack} className="mb-5">
              <Form.Group className="mb-3">
                <Form.Label>Tracking Code</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="EMP-XXXXXX"
                    size="lg"
                  />
                  <Button variant="primary" type="submit" size="lg" disabled={isLoading}>
                    {isLoading ? 'Checking...' : 'Track'}
                  </Button>
                </div>
              </Form.Group>
            </Form>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {statusData && (
              <Card className="border-0 shadow-sm bg-light">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="mb-1 fw-bold">{statusData.name}</h5>
                      <small className="text-muted">Submitted on {new Date(statusData.submitted_at).toLocaleDateString()}</small>
                    </div>
                    {getStatusBadge(statusData.status)}
                  </div>

                  <div className="mt-4">
                    <h6 className="text-muted small text-uppercase fw-bold mb-3">Timeline</h6>
                    <div className="timeline">
                       {/* Simple visualization */}
                       <div className="d-flex align-items-center mb-3 text-success">
                         <i className="bi bi-check-circle-fill me-3"></i>
                         <div>Request Received</div>
                       </div>
                       
                       <div className={`d-flex align-items-center mb-3 ${statusData.status !== 'PENDING' ? 'text-success' : 'text-primary fw-bold'}`}>
                         {statusData.status !== 'PENDING' ? <i className="bi bi-check-circle-fill me-3"></i> : <i className="bi bi-circle me-3"></i>}
                         <div>Under Review</div>
                       </div>

                       {statusData.status === 'APPROVED' && (
                         <div className="d-flex align-items-center mb-3 text-success fw-bold">
                           <i className="bi bi-check-circle-fill me-3"></i>
                           <div>Approved & Invite Sent</div>
                         </div>
                       )}

                       {statusData.status === 'REJECTED' && (
                         <div className="d-flex align-items-center mb-3 text-danger fw-bold">
                           <i className="bi bi-x-circle-fill me-3"></i>
                           <div>Rejected</div>
                         </div>
                       )}
                    </div>
                  </div>

                  {statusData.status === 'REJECTED' && statusData.rejection_reason && (
                    <Alert variant="danger" className="mt-3">
                      <strong>Reason:</strong> {statusData.rejection_reason}
                    </Alert>
                  )}

                  {statusData.status === 'APPROVED' && (
                    <Alert variant="success" className="mt-3">
                      Your request has been approved! An invite has been sent to the official email address. Please follow the link in the email to activate your account.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default RequestTracking;
