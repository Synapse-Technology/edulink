
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, InputGroup, Row, Col, Modal, Alert, Nav } from 'react-bootstrap';
import { Search, FileText, CheckCircle, Award, User, Download, AlertTriangle } from 'lucide-react';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';

const InstitutionCertifications: React.FC = () => {
  const { feedbackProps, showSuccess, showError } = useFeedbackModal();
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'certified'>('pending');
  
  // Modal states
  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Fetch all apps and we will filter locally for now, or backend could support better filtering
      const apps = await internshipService.getApplications({});
      // Filter only COMPLETED or CERTIFIED
      const relevantApps = apps.filter(app => ['COMPLETED', 'CERTIFIED'].includes(app.status));
      setApplications(relevantApps);
    } catch (err) {
      console.error("Failed to fetch applications", err);
      toast.error("Failed to load certifications");
    } finally {
      setLoading(false);
    }
  };

  const handleCertify = async () => {
    if (!selectedApp) return;
    
    try {
      setProcessing(true);
      await internshipService.processApplication(selectedApp.id, 'CERTIFY');
      toast.success(`Certification issued successfully`);
      setShowReviewModal(false);
      fetchApplications();
    } catch (error) {
      console.error('Failed to certify:', error);
      toast.error('Failed to issue certification');
    } finally {
      setProcessing(false);
    }
  };

  const openReviewModal = (app: InternshipApplication) => {
    setSelectedApp(app);
    setShowReviewModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge bg="warning" text="dark">Pending Certification</Badge>;
      case 'CERTIFIED': return <Badge bg="success">Certified</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.student_info?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      app.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'pending' 
      ? app.status === 'COMPLETED'
      : app.status === 'CERTIFIED';
    
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return <InstitutionTableSkeleton tableColumns={5} />;
  }

  return (
    <div className="institution-certifications">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Certifications & Records</h2>
          <p className="text-muted mb-0">Issue certifications for completed internships and view history.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col md={6}>
              <Nav variant="pills" className="bg-light p-1 rounded-3 d-inline-flex">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'pending'} 
                    onClick={() => setActiveTab('pending')}
                    className="rounded-3 px-3 py-2"
                  >
                    Pending Action <Badge bg="warning" text="dark" pill className="ms-2">{applications.filter(a => a.status === 'COMPLETED').length}</Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'certified'} 
                    onClick={() => setActiveTab('certified')}
                    className="rounded-3 px-3 py-2"
                  >
                    Certified History
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search student or position..."
                  className="bg-light border-start-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
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
                <th className="border-0 py-3">Internship Details</th>
                <th className="border-0 py-3">Status</th>
                <th className="border-0 py-3">Completion Date</th>
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
                      <small className="text-muted">{app.department} • {app.employer_details?.name || 'Unknown Employer'}</small>
                    </td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      {/* Using updated_at as proxy for completion date if end_date not exact match to status change */}
                      {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="text-end pe-4">
                      {app.status === 'COMPLETED' ? (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="d-inline-flex align-items-center gap-2"
                          onClick={() => openReviewModal(app)}
                        >
                          <Award size={14} />
                          Issue Cert
                        </Button>
                      ) : (
                        <Button 
                          variant="light" 
                          size="sm" 
                          className="text-primary d-inline-flex align-items-center gap-2"
                          onClick={() => openReviewModal(app)}
                        >
                          <FileText size={14} />
                          View Details
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <Award size={48} className="mb-3 opacity-50" />
                      <p className="mb-0">No records found in this category.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Certification Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedApp?.status === 'COMPLETED' ? 'Issue Certification' : 'Internship Record'}
          </Modal.Title>
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
                  <h6 className="text-uppercase text-muted small fw-bold mb-3">Engagement Details</h6>
                  <p className="mb-1"><strong>Title:</strong> {selectedApp.title}</p>
                  <p className="mb-1"><strong>Employer:</strong> {selectedApp.employer_details?.name}</p>
                  <p className="mb-1"><strong>Department:</strong> {selectedApp.department}</p>
                  <p className="mb-0"><strong>Period:</strong> {selectedApp.start_date ? new Date(selectedApp.start_date).toLocaleDateString() : 'N/A'} — {selectedApp.end_date ? new Date(selectedApp.end_date).toLocaleDateString() : 'N/A'}</p>
                </Col>
                <Col md={6}>
                  <h6 className="text-uppercase text-muted small fw-bold mb-3">Academic Status</h6>
                  <p className="mb-1"><strong>Logbooks:</strong> {selectedApp.logbook_count || 0} submitted</p>
                  <p className="mb-0"><strong>Current Status:</strong> {getStatusBadge(selectedApp.status)}</p>
                </Col>
              </Row>

              {selectedApp.status === 'COMPLETED' && (
                <div className="mt-4 pt-3 border-top">
                  <Alert variant="warning" className="mb-3 small d-flex align-items-center">
                    <AlertTriangle size={16} className="me-2 flex-shrink-0" />
                    <div>
                      <strong>Action Required:</strong> Please verify that all academic requirements (logbooks, final assessment) are met before issuing the certificate.
                    </div>
                  </Alert>
                  <div className="d-grid">
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={handleCertify}
                      disabled={processing}
                      className="d-flex align-items-center justify-content-center gap-2"
                    >
                      {processing ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <>
                          <Award size={20} />
                          Issue Official Certification
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedApp.status === 'CERTIFIED' && (
                 <Alert variant="success" className="mb-0 small d-flex align-items-center">
                    <CheckCircle size={16} className="me-2" />
                    This internship has been officially certified. The student can download their certificate from their dashboard.
                 </Alert>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default InstitutionCertifications;
