import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, InputGroup, Row, Col, Modal } from 'react-bootstrap';
import { Search, FileText, CheckCircle, XCircle, User } from 'lucide-react';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import toast from 'react-hot-toast';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';

const InstitutionApplications: React.FC = () => {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modal states
  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Explicitly filter for institution-hosted internships
      const apps = await internshipService.getApplications({ is_institutional: true });
      setApplications(apps);
    } catch (err) {
      console.error("Failed to fetch applications", err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApplication = async (action: 'SHORTLIST' | 'REJECT' | 'ACCEPT' | 'START' | 'CERTIFY') => {
    if (!selectedApp) return;
    
    try {
      setProcessing(true);
      await internshipService.processApplication(selectedApp.id, action, action === 'REJECT' ? rejectionReason : undefined);
      toast.success(`Application processed successfully`);
      setShowReviewModal(false);
      setRejectionReason('');
      fetchApplications();
    } catch (error) {
      console.error('Failed to process application:', error);
      toast.error('Failed to process application');
    } finally {
      setProcessing(false);
    }
  };

  const openReviewModal = (app: InternshipApplication) => {
    setSelectedApp(app);
    setRejectionReason('');
    setShowReviewModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED': return <Badge bg="warning" text="dark">Pending</Badge>;
      case 'SHORTLISTED': return <Badge bg="info">Shortlisted</Badge>;
      case 'ACCEPTED': return <Badge bg="primary">Accepted</Badge>;
      case 'ACTIVE': return <Badge bg="success">Active</Badge>;
      case 'REJECTED': return <Badge bg="danger">Rejected</Badge>;
      case 'COMPLETED': return <Badge bg="dark">Completed</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.student_info?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      app.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' 
      ? !['COMPLETED', 'CERTIFIED'].includes(app.status) 
      : app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <InstitutionTableSkeleton tableColumns={5} />;
  }

  return (
    <div className="institution-applications">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Internship Applications</h2>
          <p className="text-muted mb-0">Manage applications for institution-hosted internships.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search applicant or position..."
                  className="bg-light border-start-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">All Active Statuses</option>
                <option value="APPLIED">Pending</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="ACTIVE">Active</option>
                <option value="REJECTED">Rejected</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="border-0 ps-4 py-3">Candidate</th>
                <th className="border-0 py-3">Position</th>
                <th className="border-0 py-3">Status</th>
                <th className="border-0 py-3">Applied Date</th>
                <th className="border-0 py-3 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.length > 0 ? (
                filteredApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                          <span className="fw-bold text-primary">
                            {app.student_info?.name?.charAt(0) || <User size={18} />}
                          </span>
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold">{app.student_info?.name || 'Unknown Student'}</span>
                            <TrustBadge 
                              level={(app.student_info?.trust_level as TrustLevel) || 0} 
                              entityType="student" 
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                          <small className="text-muted d-block">{app.student_info?.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium">{app.title}</div>
                      <small className="text-muted">{app.department}</small>
                    </td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="text-end pe-4">
                      <Button 
                        variant="light" 
                        size="sm" 
                        className="text-primary"
                        onClick={() => openReviewModal(app)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <FileText size={48} className="mb-3 opacity-50" />
                      <p className="mb-0">No applications found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Review Application</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedApp && (
            <div>
              <div className="d-flex align-items-center mb-4 p-3 bg-light rounded">
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{width: '60px', height: '60px'}}>
                  <span className="fs-4 fw-bold text-primary">
                    {selectedApp.student_info?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <h5 className="mb-1">{selectedApp.student_info?.name}</h5>
                  <div className="d-flex align-items-center gap-2 text-muted">
                    <small>{selectedApp.student_info?.email}</small>
                    <span>•</span>
                    <TrustBadge 
                      level={(selectedApp.student_info?.trust_level as TrustLevel) || 0} 
                      entityType="student" 
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-uppercase text-muted small fw-bold mb-3">Position Details</h6>
                  <p className="mb-1"><strong>Title:</strong> {selectedApp.title}</p>
                  <p className="mb-1"><strong>Department:</strong> {selectedApp.department}</p>
                  <p className="mb-0"><strong>Status:</strong> {getStatusBadge(selectedApp.status)}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-uppercase text-muted small fw-bold mb-3">Skills Match</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedApp.skills?.map((skill, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="border">
                        {skill}
                      </Badge>
                    )) || <span className="text-muted small">No skills listed</span>}
                  </div>
                </Col>
              </Row>

              {selectedApp.status === 'APPLIED' && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="mb-3">Take Action</h6>
                  <div className="d-flex gap-3">
                    <Button 
                      variant="outline-danger" 
                      className="flex-grow-1"
                      onClick={() => handleProcessApplication('REJECT')}
                      disabled={processing}
                    >
                      <XCircle size={18} className="me-2" />
                      Reject
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      className="flex-grow-1"
                      onClick={() => handleProcessApplication('SHORTLIST')}
                      disabled={processing}
                    >
                      <CheckCircle size={18} className="me-2" />
                      Shortlist
                    </Button>
                  </div>
                </div>
              )}

              {selectedApp.status === 'SHORTLISTED' && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="mb-3">Final Decision</h6>
                  <div className="d-flex gap-3">
                    <Button 
                      variant="outline-danger" 
                      className="flex-grow-1"
                      onClick={() => handleProcessApplication('REJECT')}
                      disabled={processing}
                    >
                      <XCircle size={18} className="me-2" />
                      Reject
                    </Button>
                    <Button 
                      variant="success" 
                      className="flex-grow-1"
                      onClick={() => handleProcessApplication('ACCEPT')}
                      disabled={processing}
                    >
                      <CheckCircle size={18} className="me-2" />
                      Accept Candidate
                    </Button>
                  </div>
                </div>
              )}
              {selectedApp.status === 'ACCEPTED' && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="mb-3">Start Internship</h6>
                  <div className="d-flex gap-3">
                    <Button 
                      variant="success" 
                      className="flex-grow-1"
                      onClick={() => handleProcessApplication('START')}
                      disabled={processing}
                    >
                      <CheckCircle size={18} className="me-2" />
                      Start Internship
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default InstitutionApplications;
