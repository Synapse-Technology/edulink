import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  FileText,
  Download,
  Eye,
  Check,
  X,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  User,
  Globe,
  Info,
  Activity
} from 'lucide-react';
import { adminAuthService } from '../../../services';
import AdminLayout from '../../../components/admin/AdminLayout';
import InstitutionManagementSkeleton from '../../../components/admin/skeletons/InstitutionManagementSkeleton';

interface Institution {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  tracking_code?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_website?: string;
  contact_address?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  student_count: number;
  employer_count: number;
  internship_count: number;
}

interface InstitutionRequest {
  id: string;
  institution_name: string;
  website_url: string;
  requested_domains: string[];
  representative_name: string;
  representative_email: string;
  representative_role: string;
  representative_phone: string;
  supporting_document?: string;
  department: string;
  notes: string;
  status: string;
  tracking_code: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

interface PendingRequest {
  id: string;
  institution_name: string;
  website_url: string;
  requested_domains: string[];
  representative_name: string;
  representative_email: string;
  representative_role: string;
  representative_phone: string;
  supporting_document?: string;
  department: string;
  notes: string;
  status: string;
  tracking_code: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

const InstitutionManagement: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'institutions' | 'pending'>('institutions');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPendingRequest, setSelectedPendingRequest] = useState<InstitutionRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReasonCode, setRejectionReasonCode] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchInstitutionData();
  }, []);

  const fetchInstitutionData = async () => {
    try {
      setIsLoading(true);
      
      const [institutionsData, pendingRequestsData] = await Promise.all([
        adminAuthService.getInstitutions(),
        adminAuthService.getPendingInstitutionRequests()
      ]);
      
      // Handle potential pagination wrapper
      const institutionsList = Array.isArray(institutionsData) ? institutionsData : (institutionsData.results || []);
      const pendingList = Array.isArray(pendingRequestsData) ? pendingRequestsData : (pendingRequestsData.results || []);
      
      setInstitutions(institutionsList);
      setPendingRequests(pendingList);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load institution data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await adminAuthService.approveInstitutionRequest(requestId);
      
      // Update local state to remove request
      setPendingRequests(prevRequests => 
        prevRequests.filter(request => request.id !== requestId)
      );
      
      // Refresh institution data to show the new institution
      fetchInstitutionData();
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to approve request');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const handleShowReviewModal = (request: InstitutionRequest) => {
    setSelectedPendingRequest(request);
    setShowReviewModal(true);
  };

  const handleShowRejectModal = (request: InstitutionRequest) => {
    setSelectedPendingRequest(request);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedPendingRequest || !rejectionReasonCode) return;
    
    try {
      await handleRejectRequest(selectedPendingRequest.id, rejectionReasonCode, rejectionReason);
      setShowRejectModal(false);
      setRejectionReasonCode('');
      setRejectionReason('');
      setSelectedPendingRequest(null);
    } catch (err) {
      // Error is already handled in handleRejectRequest
    }
  };

  const handleRejectRequest = async (requestId: string, reasonCode: string, reason: string) => {
    try {
      await adminAuthService.rejectInstitutionRequest(requestId, reasonCode, reason);
      
      // Remove from local state
      setPendingRequests(prevRequests => 
        prevRequests.filter(request => request.id !== requestId)
      );
    } catch (err: any) {
      let errorMessage = 'Failed to reject request';
      
      if (err.response && err.response.data) {
        const data = err.response.data;
        
        // Handle non_field_errors
        if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors.join(' ');
        } 
        // Handle specific field errors
        else if (data.rejection_reason) {
          errorMessage = Array.isArray(data.rejection_reason) 
            ? data.rejection_reason.join(' ') 
            : data.rejection_reason;
        }
        // Handle duplicate key errors (PostgreSQL specific)
        else if (data.error && data.error.includes('duplicate key value')) {
          errorMessage = 'This institution or domain is already registered.';
        }
        // Handle generic error message
        else if (data.message || data.error) {
          errorMessage = data.message || data.error;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const blob = await adminAuthService.exportInstitutions();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `institutions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to export data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (isVerified: boolean, isActive: boolean) => {
    if (!isActive) return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">Inactive</span>;
    if (isVerified) return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Verified</span>;
    return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">Pending</span>;
  };

  const filteredInstitutions = institutions.filter(institution => {
    const matchesSearch = (institution.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (institution.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (institution.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (institution.tracking_code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'verified') return matchesSearch && institution.is_verified && institution.is_active;
    if (filterStatus === 'pending') return matchesSearch && !institution.is_verified && institution.is_active;
    if (filterStatus === 'inactive') return matchesSearch && !institution.is_active;
    return matchesSearch;
  });

  const getStatusCounts = () => {
    return {
      total: institutions.length,
      verified: institutions.filter(i => i.is_verified && i.is_active).length,
      pending: pendingRequests.length + institutions.filter(i => !i.is_verified && i.is_active).length,
      inactive: institutions.filter(i => !i.is_active).length
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <AdminLayout>
        <InstitutionManagementSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container-fluid mt-4">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1">Institution Management</h1>
            <p className="text-muted mb-0">Manage institutions and verification requests</p>
          </div>
          <div className="d-flex">
            <button 
              className="btn btn-outline-primary me-2"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download size={16} className="me-2" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
            <Link to="/admin/dashboard" className="btn btn-outline-secondary">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                    <Building size={20} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="fw-bold mb-0">{statusCounts.total}</h4>
                    <p className="text-muted mb-0 small">Total Institutions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                    <Check size={20} className="text-success" />
                  </div>
                  <div>
                    <h4 className="fw-bold mb-0">{statusCounts.verified}</h4>
                    <p className="text-muted mb-0 small">Verified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                    <Clock size={20} className="text-warning" />
                  </div>
                  <div>
                    <h4 className="fw-bold mb-0">{statusCounts.pending}</h4>
                    <p className="text-muted mb-0 small">Pending Verification</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-danger bg-opacity-10 p-3 me-3">
                    <X size={20} className="text-danger" />
                  </div>
                  <div>
                    <h4 className="fw-bold mb-0">{statusCounts.inactive}</h4>
                    <p className="text-muted mb-0 small">Inactive</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="card-title mb-1">Institution Management</h4>
                    <p className="text-muted mb-0 small">Manage educational institutions and affiliation requests</p>
                  </div>
                  <div className="d-flex">
                    <span className="badge bg-primary bg-opacity-10 text-primary me-2">
                      {pendingRequests.length} Pending Requests
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <ul className="nav nav-tabs mt-3 border-bottom-0" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'institutions' ? 'active' : ''}`}
                      onClick={() => setActiveTab('institutions')}
                    >
                      <Building size={16} className="me-2" />
                      Institutions ({institutions.length})
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pending')}
                    >
                      <Clock size={16} className="me-2" />
                      Pending Requests ({pendingRequests.length})
                    </button>
                  </li>
                </ul>
              </div>

              <div className="card-body">
                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                    <AlertCircle size={18} className="me-2" />
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                )}

                {/* Search and Filter Bar */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, email, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="verified">Verified Only</option>
                      <option value="pending">Pending Verification</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <button className="btn btn-outline-secondary w-100" onClick={fetchInstitutionData}>
                      <Filter size={16} className="me-2" />
                      Refresh Data
                    </button>
                  </div>
                </div>

                {/* Content Tabs */}
                <div className="tab-content">
                  {/* Institutions Tab */}
                  {activeTab === 'institutions' && (
                    <div className="tab-pane fade show active">
                      {filteredInstitutions.length === 0 ? (
                        <div className="text-center py-5">
                          <Building size={48} className="text-muted mb-3" />
                          <h5 className="text-muted">No institutions found</h5>
                          <p className="text-muted">Try adjusting your search or filter</p>
                        </div>
                      ) : (
                        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                          <table className="table table-hover align-middle mb-0">
                            <thead className="sticky-top bg-white" style={{ zIndex: 1 }}>
                              <tr>
                                <th className="py-3">Institution</th>
                                <th className="py-3">Tracking Code</th>
                                <th className="py-3">Contact</th>
                                <th className="py-3">Statistics</th>
                                <th className="py-3">Status</th>
                                <th className="py-3 text-end">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredInstitutions.map((institution) => (
                                <tr key={institution.id}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      <div className="flex-shrink-0">
                                        <div className="rounded-3 bg-primary bg-opacity-10 p-2 me-3">
                                          <Building size={18} className="text-primary" />
                                        </div>
                                      </div>
                                      <div className="flex-grow-1">
                                        <div className="fw-bold text-dark mb-0">{institution.name}</div>
                                        <small className="text-muted d-flex align-items-center">
                                          <MapPin size={12} className="me-1" />
                                          <span className="text-truncate" style={{maxWidth: '200px'}}>{institution.address}</span>
                                        </small>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="badge bg-light text-primary font-monospace border px-2 py-1">
                                      {institution.tracking_code || '-'}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="small">
                                      <div className="d-flex align-items-center mb-1">
                                        <Mail size={12} className="me-2 text-muted" />
                                        <span className="text-dark">{institution.contact_email || institution.email}</span>
                                      </div>
                                      <div className="d-flex align-items-center">
                                        <Phone size={12} className="me-2 text-muted" />
                                        <span className="text-dark">{institution.contact_phone || institution.phone}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="d-flex gap-3">
                                      <div className="text-center bg-light rounded-2 px-2 py-1" style={{minWidth: '60px'}}>
                                        <div className="fw-bold text-primary small">{institution.student_count}</div>
                                        <div className="text-muted" style={{fontSize: '10px', textTransform: 'uppercase'}}>Students</div>
                                      </div>
                                      <div className="text-center bg-light rounded-2 px-2 py-1" style={{minWidth: '60px'}}>
                                        <div className="fw-bold text-success small">{institution.internship_count}</div>
                                        <div className="text-muted" style={{fontSize: '10px', textTransform: 'uppercase'}}>Internships</div>
                                      </div>
                                      <div className="text-center bg-light rounded-2 px-2 py-1" style={{minWidth: '60px'}}>
                                        <div className="fw-bold text-warning small">{institution.employer_count}</div>
                                        <div className="text-muted" style={{fontSize: '10px', textTransform: 'uppercase'}}>Employers</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    {getStatusBadge(institution.is_verified, institution.is_active)}
                                  </td>
                                  <td className="text-end">
                                    <div className="dropdown">
                                      <button 
                                        className="btn btn-light btn-sm rounded-circle border-0"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                      >
                                        <Info size={16} className="text-muted" />
                                      </button>
                                      <div className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                        <button 
                                          className="dropdown-item py-2"
                                          onClick={() => {
                                            setSelectedInstitution(institution);
                                            setShowDetailsModal(true);
                                          }}
                                        >
                                          <Eye size={14} className="me-2 text-primary" />
                                          View Full Profile
                                        </button>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item py-2 text-danger">
                                          <X size={14} className="me-2" />
                                          Restrict Access
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending Requests Tab */}
                  {activeTab === 'pending' && (
                    <div className="tab-pane fade show active">
                      {pendingRequests.length === 0 ? (
                        <div className="text-center py-5">
                          <CheckCircle size={48} className="text-success mb-3" />
                          <h5 className="text-success">All requests processed</h5>
                          <p className="text-muted">No pending affiliation requests</p>
                        </div>
                      ) : (
                        <div className="row g-4">
                          {pendingRequests.map((request) => (
                            <div key={request.id} className="col-md-6">
                              <div className="card border">
                                <div className="card-body">
                                  <div className="d-flex align-items-start mb-3">
                                    <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                                      <Building size={20} className="text-warning" />
                                    </div>
                                    <div className="flex-grow-1">
                                      <h6 className="card-title mb-1">{request.institution_name}</h6>
                                      <div className="d-flex align-items-center text-muted small mb-2">
                                        <User size={12} className="me-1" />
                                        {request.representative_name}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="small text-muted mb-3">
                                    <div className="d-flex align-items-center mb-1">
                                      <Mail size={12} className="me-2" />
                                      {request.representative_email}
                                    </div>
                                    <div className="d-flex align-items-center">
                                      <Calendar size={12} className="me-2" />
                                      Requested: {new Date(request.created_at).toLocaleDateString()}
                                    </div>
                                  </div>

                                  <div className="d-flex justify-content-between">
                                    <button
                                      onClick={() => handleApproveRequest(request.id)}
                                      className="btn btn-success btn-sm"
                                    >
                                      <CheckCircle size={14} className="me-1" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleShowRejectModal(request)}
                                      className="btn btn-outline-danger btn-sm"
                                    >
                                      <XCircle size={14} className="me-1" />
                                      Reject
                                    </button>
                                    <button 
                                      onClick={() => handleShowReviewModal(request)}
                                      className="btn btn-outline-secondary btn-sm"
                                    >
                                      <Eye size={14} className="me-1" />
                                      Review
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Institution Details Modal */}
      {showDetailsModal && selectedInstitution && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white py-3">
                <div className="d-flex align-items-center">
                  <div className="bg-white bg-opacity-20 p-2 rounded-3 me-3">
                    <Building size={20} className="text-white" />
                  </div>
                  <h5 className="modal-title fw-bold mb-0">Institution Profile</h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  {/* Sidebar Info */}
                  <div className="col-md-4">
                    <div className="card border-0 bg-light h-100">
                      <div className="card-body text-center py-4">
                        <div className="position-relative d-inline-block mb-3">
                          <div className="rounded-circle bg-primary bg-opacity-10 p-4 shadow-sm">
                            <Building size={48} className="text-primary" />
                          </div>
                          {selectedInstitution.is_verified ? (
                            <span className="position-absolute bottom-0 end-0 bg-success border border-white border-2 rounded-circle p-2" title="Verified"></span>
                          ) : (
                            <span className="position-absolute bottom-0 end-0 bg-warning border border-white border-2 rounded-circle p-2" title="Pending"></span>
                          )}
                        </div>
                        <h5 className="fw-bold mb-1">{selectedInstitution.name}</h5>
                        <div className="mt-3 d-flex flex-column gap-2">
                          {getStatusBadge(selectedInstitution.is_verified, selectedInstitution.is_active)}
                        </div>
                        
                        {selectedInstitution.tracking_code && (
                          <div className="mt-4 p-3 bg-white rounded-3 border border-dashed">
                            <small className="text-muted d-block mb-1 text-uppercase fw-bold letter-spacing-1" style={{fontSize: '10px'}}>Tracking Code</small>
                            <span className="font-monospace fw-bold text-primary">
                              {selectedInstitution.tracking_code}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Details */}
                  <div className="col-md-8">
                    <div className="mb-4">
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1 d-flex align-items-center">
                        <Info size={14} className="me-2 text-primary" />
                        Contact Information
                      </h6>
                      <div className="bg-white rounded-3 border p-3">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Email Address</label>
                            <div className="d-flex align-items-center">
                              <Mail size={14} className="me-2 text-muted" />
                              <span className="fw-semibold text-break">{selectedInstitution.contact_email || selectedInstitution.email}</span>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Phone Number</label>
                            <div className="d-flex align-items-center">
                              <Phone size={14} className="me-2 text-muted" />
                              <span className="fw-semibold">{selectedInstitution.contact_phone || selectedInstitution.phone}</span>
                            </div>
                          </div>
                          {(selectedInstitution.contact_website || selectedInstitution.website) && (
                            <div className="col-sm-6">
                              <label className="text-muted small d-block mb-1">Official Website</label>
                              <div className="d-flex align-items-center">
                                <Globe size={14} className="me-2 text-muted" />
                                <a href={selectedInstitution.contact_website || selectedInstitution.website} target="_blank" rel="noopener noreferrer" className="fw-semibold text-decoration-none text-truncate">
                                  {selectedInstitution.contact_website || selectedInstitution.website}
                                </a>
                              </div>
                            </div>
                          )}
                          <div className="col-sm-6">
                            <label className="text-muted small d-block mb-1">Physical Address</label>
                            <div className="d-flex align-items-center">
                              <MapPin size={14} className="me-2 text-muted" />
                              <span className="fw-semibold text-truncate">{selectedInstitution.contact_address || selectedInstitution.address}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h6 className="text-uppercase text-muted fw-bold small mb-3 letter-spacing-1 d-flex align-items-center">
                        <Activity size={14} className="me-2 text-primary" />
                        Platform Statistics
                      </h6>
                      <div className="row g-2 g-sm-3">
                        <div className="col-12 col-sm-4">
                          <div className="card border-0 bg-primary bg-opacity-10 text-center h-100 py-2">
                            <div className="card-body p-2">
                              <div className="h4 fw-bold text-primary mb-0">{selectedInstitution.student_count}</div>
                              <small className="text-primary opacity-75 fw-semibold" style={{fontSize: '10px', textTransform: 'uppercase'}}>Students</small>
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-sm-4">
                          <div className="card border-0 bg-success bg-opacity-10 text-center h-100 py-2">
                            <div className="card-body p-2">
                              <div className="h4 fw-bold text-success mb-0">{selectedInstitution.internship_count}</div>
                              <small className="text-success opacity-75 fw-semibold" style={{fontSize: '10px', textTransform: 'uppercase'}}>Internships</small>
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-sm-4">
                          <div className="card border-0 bg-warning bg-opacity-10 text-center h-100 py-2">
                            <div className="card-body p-2">
                              <div className="h4 fw-bold text-warning mb-0">{selectedInstitution.employer_count}</div>
                              <small className="text-warning opacity-75 fw-semibold" style={{fontSize: '10px', textTransform: 'uppercase'}}>Employers</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-top-0 p-3">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary px-4"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close Window
                </button>
                <button className="btn btn-primary px-4">
                  Manage Affiliations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedPendingRequest && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Review Institution Request</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowReviewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Institution Information</h6>
                    <div className="mb-3">
                      <label className="form-label text-muted small">Institution Name</label>
                      <p className="mb-1">{selectedPendingRequest.institution_name}</p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small">Website</label>
                      <p className="mb-1">
                        <a href={selectedPendingRequest.website_url} target="_blank" rel="noopener noreferrer">
                          {selectedPendingRequest.website_url}
                        </a>
                      </p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small">Requested Domains</label>
                      <div className="d-flex flex-wrap gap-1">
                        {selectedPendingRequest.requested_domains.map((domain, index) => (
                          <span key={index} className="badge bg-light text-dark">{domain}</span>
                        ))}
                      </div>
                    </div>
                    {selectedPendingRequest.notes && (
                      <div className="mb-3">
                        <label className="form-label text-muted small">Notes</label>
                        <p className="mb-1">{selectedPendingRequest.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Representative Information</h6>
                    <div className="mb-3">
                      <label className="form-label text-muted small">Name</label>
                      <p className="mb-1">{selectedPendingRequest.representative_name}</p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small">Email</label>
                      <p className="mb-1">{selectedPendingRequest.representative_email}</p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small">Role</label>
                      <p className="mb-1">{selectedPendingRequest.representative_role}</p>
                    </div>
                    {selectedPendingRequest.representative_phone && (
                      <div className="mb-3">
                        <label className="form-label text-muted small">Phone</label>
                        <p className="mb-1">{selectedPendingRequest.representative_phone}</p>
                      </div>
                    )}
                    {selectedPendingRequest.department && (
                      <div className="mb-3">
                        <label className="form-label text-muted small">Department</label>
                        <p className="mb-1">{selectedPendingRequest.department}</p>
                      </div>
                    )}
                  </div>
                </div>
                {selectedPendingRequest.supporting_document && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-3">Supporting Documents</h6>
                      <div className="d-flex align-items-center">
                        <FileText size={16} className="me-2 text-muted" />
                        <a href={selectedPendingRequest.supporting_document} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                          View Supporting Document
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                <div className="row mt-3">
                  <div className="col-12">
                    <div className="d-flex align-items-center justify-content-between bg-light p-3 rounded">
                      <div>
                        <small className="text-muted">Tracking Code</small>
                        <div className="fw-semibold">{selectedPendingRequest.tracking_code}</div>
                      </div>
                      <div>
                        <small className="text-muted">Requested</small>
                        <div className="fw-semibold">{new Date(selectedPendingRequest.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowReviewModal(false)}
                >
                  Close
                </button>
                <button 
                  onClick={() => handleShowRejectModal(selectedPendingRequest)}
                  className="btn btn-outline-danger"
                >
                  <XCircle size={14} className="me-1" />
                  Reject Request
                </button>
                <button 
                  onClick={() => handleApproveRequest(selectedPendingRequest.id)}
                  className="btn btn-success"
                >
                  <CheckCircle size={14} className="me-1" />
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPendingRequest && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject Institution Request</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowRejectModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Institution</label>
                  <p className="form-control-plaintext fw-semibold">{selectedPendingRequest.institution_name}</p>
                </div>
                <div className="mb-3">
                  <label className="form-label">Rejection Reason Code <span className="text-danger">*</span></label>
                  <select 
                    className="form-select" 
                    value={rejectionReasonCode}
                    onChange={(e) => setRejectionReasonCode(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    <option value="invalid_domain">Invalid or unverifiable email domain</option>
                    <option value="insufficient_documentation">Insufficient supporting documentation</option>
                    <option value="unverifiable_institution">Cannot verify institution legitimacy</option>
                    <option value="duplicate_request">Duplicate of existing request or institution</option>
                    <option value="spam_suspicious">Suspicious activity or spam indicators</option>
                    <option value="other">Other reason (see detailed explanation)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Detailed Explanation <span className="text-danger">*</span></label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide additional details about the rejection..."
                    required
                  />
                  {!rejectionReason && <div className="form-text text-danger">Please provide a reason for rejection.</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmReject}
                  className="btn btn-danger"
                  disabled={!rejectionReasonCode || !rejectionReason.trim()}
                >
                  <XCircle size={14} className="me-1" />
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default InstitutionManagement;