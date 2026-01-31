import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Search, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Phone,
  Eye,
  Calendar,
  Hash,
  Globe,
  Clock,
  AlertTriangle,
  Users,
  User,
  ShieldAlert,
  Info,
  Activity,
  Briefcase,
  MapPinned
} from 'lucide-react';
import { Badge, Button, Modal, Form, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { employerService } from '../../../services/employer/employerService';
import type { Employer, EmployerRequest, ReviewRequestData } from '../../../services/employer/employerService';
import AdminLayout from '../../../components/admin/AdminLayout';
import EmployerManagementSkeleton from '../../../components/admin/skeletons/EmployerManagementSkeleton';

const EmployerRequestReview: React.FC = () => {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [requests, setRequests] = useState<EmployerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'employers' | 'requests'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState<EmployerRequest | null>(null);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showViewRequestModal, setShowViewRequestModal] = useState(false);
  const [showViewEmployerModal, setShowViewEmployerModal] = useState(false);
  
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonCode, setRejectionReasonCode] = useState('OTHER');
  const [submittingReview, setSubmittingReview] = useState(false);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB').format(date); // en-GB uses DD/MM/YYYY
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employersData, requestsData] = await Promise.all([
        employerService.getEmployers(),
        employerService.getRequests() // Fetches all requests (pending, approved, rejected)
      ]);
      setEmployers(employersData);
      setRequests(requestsData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      // Check for specific status codes if available in the error object
      if (err.status === 404 || (err.response && err.response.status === 404)) {
        setError('The employer service endpoints could not be found. Please ensure the backend is running and up to date.');
      } else if (err.status === 403 || (err.response && err.response.status === 403)) {
        setError('You do not have permission to view this data.');
      } else {
        setError(err.errorMessage || err.message || 'Failed to fetch data. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewClick = (request: EmployerRequest, reviewAction: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(request);
    setAction(reviewAction);
    setRejectionReason('');
    setRejectionReasonCode('OTHER');
    setShowReviewModal(true);
  };

  const handleViewRequest = (request: EmployerRequest) => {
    setSelectedRequest(request);
    setShowViewRequestModal(true);
  };

  const handleViewEmployer = (employer: Employer) => {
    setSelectedEmployer(employer);
    setShowViewEmployerModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    if (action === 'REJECT' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setSubmittingReview(true);
    try {
      const reviewData: ReviewRequestData = {
        action: action === 'APPROVE' ? 'approve' : 'reject',
        ...(action === 'REJECT' && {
          rejection_reason_code: rejectionReasonCode,
          rejection_reason: rejectionReason
        })
      };

      await employerService.reviewRequest(selectedRequest.id, reviewData);
      
      // Refresh data
      await fetchData();
      setShowReviewModal(false);
      setSelectedRequest(null);
      setShowViewRequestModal(false); // Close view modal if open
      
    } catch (err: any) {
      alert(err.errorMessage || err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25">Active</Badge>;
      case 'APPROVED':
        return <Badge bg="secondary" className="bg-opacity-10 text-secondary border border-secondary border-opacity-25">Inactive</Badge>;
      case 'PENDING':
      case 'REQUESTED':
        return <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning border-opacity-25">Pending</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25">Rejected</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const filteredEmployers = employers.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.official_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.domain.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && emp.status === filterStatus;
  });

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.official_email.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && req.status === filterStatus;
  });

  if (loading) {
    return (
      <AdminLayout>
        <EmployerManagementSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container-fluid mt-4">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1">Employer Management</h1>
            <p className="text-muted mb-0">Manage employers and onboarding requests</p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={fetchData}>
              Refresh Data
            </Button>
          </div>
        </div>
      
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} className="shadow-sm border-danger">
            <div className="d-flex align-items-center">
              <AlertTriangle className="me-3 flex-shrink-0" size={24} />
              <div>
                <h6 className="alert-heading fw-bold mb-1">Error Loading Data</h6>
                <p className="mb-0 small">{error}</p>
              </div>
            </div>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">Total Employers</h6>
                    <h2 className="mb-1">{employers.length}</h2>
                    <small className="text-muted">Registered Organizations</small>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-2 rounded">
                    <Building className="text-primary" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">Active Partners</h6>
                    <h2 className="mb-1">{employers.filter(e => e.status === 'ACTIVE').length}</h2>
                    <small className="text-success">Verified & Operational</small>
                  </div>
                  <div className="bg-success bg-opacity-10 p-2 rounded">
                    <Users className="text-success" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">Inactive/Rejected</h6>
                    <h2 className="mb-1">{employers.filter(e => e.status !== 'ACTIVE' && e.status !== 'REQUESTED').length}</h2>
                    <small className="text-danger">Suspended or Declined</small>
                  </div>
                  <div className="bg-danger bg-opacity-10 p-2 rounded">
                    <ShieldAlert className="text-danger" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2">Pending Requests</h6>
                    <h2 className="mb-1">{requests.filter(r => r.status === 'PENDING').length}</h2>
                    <small className="text-warning">Requires Attention</small>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-2 rounded">
                    <Clock className="text-warning" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent border-bottom-0 pt-4 px-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <ul className="nav nav-tabs card-header-tabs mb-0">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'employers' ? 'active fw-bold text-primary' : 'text-muted'}`}
                    onClick={() => setActiveTab('employers')}
                  >
                    Active Employers
                    <Badge bg="secondary" className="ms-2 rounded-pill bg-opacity-25 text-secondary">{employers.length}</Badge>
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'requests' ? 'active fw-bold text-primary' : 'text-muted'}`}
                    onClick={() => setActiveTab('requests')}
                  >
                    Requests History
                    <Badge bg="secondary" className="ms-2 rounded-pill bg-opacity-25 text-secondary">{requests.length}</Badge>
                  </button>
                </li>
              </ul>
              
              <div className="d-flex gap-2">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={18} className="text-muted" />
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0 bg-light" 
                    placeholder={activeTab === 'requests' ? "Search by tracking code, name..." : "Search employers..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="form-select w-auto bg-light"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Inactive (Approved)</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {activeTab === 'employers' ? (
              <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="table table-hover align-middle mb-0">
                  <thead className="sticky-top bg-white" style={{ zIndex: 1 }}>
                    <tr>
                      <th className="ps-4 py-3">Organization</th>
                      <th className="py-3">Contact</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Status</th>
                      <th className="text-end pe-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-5 text-muted">
                          No employers found.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployers.map(employer => (
                        <tr key={employer.id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center">
                              <div className="rounded-3 bg-primary bg-opacity-10 p-2 me-3">
                                <Building size={18} className="text-primary" />
                              </div>
                              <div>
                                <div className="fw-bold text-dark">{employer.name}</div>
                                <div className="small text-muted d-flex align-items-center">
                                  <Globe size={12} className="me-1" />
                                  {employer.domain}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="small">
                              <div className="d-flex align-items-center mb-1">
                                <Mail size={12} className="me-2 text-muted" />
                                <span className="text-dark">{employer.official_email}</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <User size={12} className="me-2 text-muted" />
                                <span className="text-muted">{employer.contact_person}</span>
                              </div>
                            </div>
                          </td>
                          <td><Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25">{employer.organization_type}</Badge></td>
                          <td>{getStatusBadge(employer.status)}</td>
                          <td className="text-end pe-4">
                            <Button variant="light" size="sm" className="btn-icon rounded-circle" onClick={() => handleViewEmployer(employer)}>
                              <Eye size={16} className="text-primary" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="table table-hover align-middle mb-0">
                  <thead className="sticky-top bg-white" style={{ zIndex: 1 }}>
                    <tr>
                      <th className="ps-4 py-3">Tracking Code</th>
                      <th className="py-3">Organization</th>
                      <th className="py-3">Contact</th>
                      <th className="py-3 text-center">Submitted</th>
                      <th className="text-end pe-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-5 text-muted">
                          No requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map(request => (
                        <tr key={request.id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center">
                              <Hash size={14} className="me-2 text-muted" />
                              <span className="font-monospace fw-bold text-primary">{request.tracking_code || '-'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{request.name}</div>
                            <div className="small text-muted">{request.domain}</div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <Mail size={14} className="me-2 text-muted" />
                              <span className="small text-dark">{request.official_email}</span>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="small text-muted">
                              <Calendar size={12} className="me-1" />
                              {formatDate(request.created_at)}
                            </div>
                          </td>
                          <td className="text-end pe-4">
                            <Button variant="light" size="sm" className="btn-icon rounded-circle me-1" onClick={() => handleViewRequest(request)}>
                              <Eye size={16} className="text-primary" />
                            </Button>
                            {request.status === 'PENDING' && (
                              <>
                                <OverlayTrigger placement="top" overlay={<Tooltip>Approve</Tooltip>}>
                                  <Button 
                                    variant="light" 
                                    size="sm" 
                                    className="btn-icon rounded-circle text-success me-1"
                                    onClick={() => handleReviewClick(request, 'APPROVE')}
                                  >
                                    <CheckCircle size={16} />
                                  </Button>
                                </OverlayTrigger>
                                <OverlayTrigger placement="top" overlay={<Tooltip>Reject</Tooltip>}>
                                  <Button 
                                    variant="light" 
                                    size="sm" 
                                    className="btn-icon rounded-circle text-danger"
                                    onClick={() => handleReviewClick(request, 'REJECT')}
                                  >
                                    <XCircle size={16} />
                                  </Button>
                                </OverlayTrigger>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* View Request Modal */}
        <Modal show={showViewRequestModal} onHide={() => setShowViewRequestModal(false)} size="lg" centered className="border-0">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-primary text-white py-3">
              <div className="d-flex align-items-center">
                <div className="bg-white bg-opacity-20 p-2 rounded-3 me-3">
                  <Info size={20} className="text-white" />
                </div>
                <h5 className="modal-title fw-bold mb-0">Onboarding Request Details</h5>
              </div>
              <button 
                type="button" 
                className="btn-close btn-close-white"
                onClick={() => setShowViewRequestModal(false)}
              ></button>
            </div>
            <Modal.Body className="p-4">
              {selectedRequest && (
                <div className="row g-4">
                  <div className="col-md-4">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body text-center py-4">
                        <div className="position-relative d-inline-block mb-3">
                          <div className="rounded-circle bg-primary bg-opacity-10 p-4 shadow-sm">
                            <Briefcase size={48} className="text-primary" />
                          </div>
                        </div>
                        <h5 className="fw-bold mb-1">{selectedRequest.name}</h5>
                        <p className="text-muted small mb-3">{selectedRequest.domain}</p>
                        <div className="d-flex flex-column gap-2 mt-4">
                          {getStatusBadge(selectedRequest.status)}
                          <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25">{selectedRequest.organization_type}</Badge>
                        </div>
                        
                        {selectedRequest.tracking_code && (
                          <div className="mt-4 p-3 bg-white rounded-3 border border-dashed">
                            <small className="text-muted d-block mb-1 text-uppercase fw-bold letter-spacing-1" style={{fontSize: '10px'}}>Tracking Code</small>
                            <span className="font-monospace fw-bold text-primary">
                              {selectedRequest.tracking_code}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-8">
                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                        <Building size={14} className="me-2 text-primary" />
                        Organization Information
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Official Website</label>
                            <div className="d-flex align-items-center">
                              <Globe size={14} className="me-2 text-muted" />
                              <span className="fw-semibold text-break">{selectedRequest.website_url || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Registration Number</label>
                            <div className="d-flex align-items-center">
                              <Hash size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{selectedRequest.registration_number || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                        <Mail size={14} className="me-2 text-primary" />
                        Contact Person
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Full Name</label>
                            <div className="d-flex align-items-center">
                              <User size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{selectedRequest.contact_person}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Email Address</label>
                            <div className="d-flex align-items-center">
                              <Mail size={14} className="me-2 text-muted" />
                              <span className="fw-semibold text-break">{selectedRequest.official_email}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Phone Number</label>
                            <div className="d-flex align-items-center">
                              <Phone size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{selectedRequest.phone_number || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                        <Clock size={14} className="me-2 text-primary" />
                        Request History
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Submitted On</label>
                            <div className="d-flex align-items-center">
                              <Calendar size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{formatDateTime(selectedRequest.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        {selectedRequest.rejection_reason && (
                          <div className="mt-3 p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3">
                            <div className="d-flex align-items-center text-danger mb-1">
                              <ShieldAlert size={14} className="me-2" />
                              <span className="fw-bold small text-uppercase">Rejection Reason</span>
                            </div>
                            <p className="mb-0 small text-danger">{selectedRequest.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="bg-light border-top-0 p-3">
              {selectedRequest?.status === 'PENDING' && (
                <>
                  <Button variant="outline-danger" className="px-4" onClick={() => handleReviewClick(selectedRequest, 'REJECT')}>Reject Request</Button>
                  <Button variant="success" className="px-4" onClick={() => handleReviewClick(selectedRequest, 'APPROVE')}>Approve Request</Button>
                </>
              )}
              <Button variant="outline-secondary" className="px-4" onClick={() => setShowViewRequestModal(false)}>Close</Button>
            </Modal.Footer>
          </div>
        </Modal>

        {/* View Employer Modal */}
        <Modal show={showViewEmployerModal} onHide={() => setShowViewEmployerModal(false)} size="lg" centered className="border-0">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-primary text-white py-3">
              <div className="d-flex align-items-center">
                <div className="bg-white bg-opacity-20 p-2 rounded-3 me-3">
                  <Building size={20} className="text-white" />
                </div>
                <h5 className="modal-title fw-bold mb-0">Employer Profile Details</h5>
              </div>
              <button 
                type="button" 
                className="btn-close btn-close-white"
                onClick={() => setShowViewEmployerModal(false)}
              ></button>
            </div>
            <Modal.Body className="p-4">
              {selectedEmployer && (
                <div className="row g-4">
                  <div className="col-md-4">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body text-center py-4">
                        <div className="position-relative d-inline-block mb-3">
                          <div className="rounded-circle bg-primary bg-opacity-10 p-4 shadow-sm">
                            <Building size={48} className="text-primary" />
                          </div>
                          <span className="position-absolute bottom-0 end-0 bg-success border border-white border-2 rounded-circle p-2" title="Active"></span>
                        </div>
                        <h5 className="fw-bold mb-1">{selectedEmployer.name}</h5>
                        <p className="text-muted small mb-3">{selectedEmployer.domain}</p>
                        <div className="d-flex flex-column gap-2 mt-4">
                          {getStatusBadge(selectedEmployer.status)}
                          <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25">{selectedEmployer.organization_type}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-8">
                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                        <MapPinned size={14} className="me-2 text-primary" />
                        Organization Details
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Website</label>
                            <div className="d-flex align-items-center">
                              <Globe size={14} className="me-2 text-muted" />
                              <span className="fw-semibold text-break">{selectedEmployer.website_url || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Contact Person</label>
                            <div className="d-flex align-items-center">
                              <User size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{selectedEmployer.contact_person}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Email Address</label>
                            <div className="d-flex align-items-center">
                              <Mail size={14} className="me-2 text-muted" />
                              <span className="fw-semibold text-break">{selectedEmployer.official_email}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Phone Number</label>
                            <div className="d-flex align-items-center">
                              <Phone size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{selectedEmployer.phone_number || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1">
                        <Activity size={14} className="me-2 text-primary" />
                        Trust & Operational Capacity
                      </h6>
                      <div className="row g-3">
                        <div className="col-sm-4">
                          <div className="bg-light p-3 rounded-3 text-center border">
                            <label className="text-muted small d-block mb-1 text-uppercase letter-spacing-1" style={{fontSize: '10px'}}>Trust Level</label>
                            <div className="h5 fw-bold text-primary mb-0">{selectedEmployer.trust_level}</div>
                          </div>
                        </div>
                        <div className="col-sm-4">
                          <div className="bg-light p-3 rounded-3 text-center border">
                            <label className="text-muted small d-block mb-1 text-uppercase letter-spacing-1" style={{fontSize: '10px'}}>Max Capacity</label>
                            <div className="h5 fw-bold text-success mb-0">{selectedEmployer.max_active_students}</div>
                          </div>
                        </div>
                        <div className="col-sm-4">
                          <div className="bg-light p-3 rounded-3 text-center border">
                            <label className="text-muted small d-block mb-1 text-uppercase letter-spacing-1" style={{fontSize: '10px'}}>Staff Ratio</label>
                            <div className="h5 fw-bold text-warning mb-0">1:{selectedEmployer.supervisor_ratio}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="bg-light border-top-0 p-3">
              <Button variant="outline-secondary" className="px-4" onClick={() => setShowViewEmployerModal(false)}>Close Profile</Button>
              <Button variant="primary" className="px-4">Manage Partnerships</Button>
            </Modal.Footer>
          </div>
        </Modal>

        {/* Review Modal */}
        <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{action === 'APPROVE' ? 'Approve Request' : 'Reject Request'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {action === 'APPROVE' ? (
              <p>
                Are you sure you want to approve <strong>{selectedRequest?.name}</strong>?
                This will create an employer account and send an invite to <strong>{selectedRequest?.official_email}</strong>.
              </p>
            ) : (
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Rejection Reason Code</Form.Label>
                  <Form.Select 
                    value={rejectionReasonCode} 
                    onChange={(e) => setRejectionReasonCode(e.target.value)}
                  >
                    <option value="DOMAIN_MISMATCH">Domain Mismatch</option>
                    <option value="INVALID_DATA">Invalid Data</option>
                    <option value="DUPLICATE">Duplicate Organization</option>
                    <option value="OTHER">Other</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Detailed Reason</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please explain why this request is being rejected..."
                  />
                </Form.Group>
              </Form>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button 
              variant={action === 'APPROVE' ? 'success' : 'danger'} 
              onClick={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? 'Processing...' : (action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection')}
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
    </AdminLayout>
  );
};

export default EmployerRequestReview;
