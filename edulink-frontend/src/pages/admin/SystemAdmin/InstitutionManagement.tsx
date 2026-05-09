import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  User,
  X,
  XCircle,
} from 'lucide-react';

import { adminAuthService } from '../../../services';
import AdminLayout from '../../../components/admin/AdminLayout';
import InstitutionManagementSkeleton from '../../../components/admin/skeletons/InstitutionManagementSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

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

type ActiveTab = 'institutions' | 'pending';

const InstitutionManagement: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [pendingRequests, setPendingRequests] = useState<InstitutionRequest[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('institutions');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [selectedPendingRequest, setSelectedPendingRequest] =
    useState<InstitutionRequest | null>(null);
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
        adminAuthService.getPendingInstitutionRequests(),
      ]);

      const institutionsList = Array.isArray(institutionsData)
        ? institutionsData
        : institutionsData.results || [];

      const pendingList = Array.isArray(pendingRequestsData)
        ? pendingRequestsData
        : pendingRequestsData.results || [];

      setInstitutions(institutionsList);
      setPendingRequests(pendingList);
      setError('');
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to load institution data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setIsProcessing(requestId);

      await adminAuthService.approveInstitutionRequest(requestId);

      setPendingRequests((prev) =>
        prev.filter((request) => request.id !== requestId),
      );

      setShowReviewModal(false);
      setSelectedPendingRequest(null);

      await fetchInstitutionData();
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to approve request.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectRequest = async (
    requestId: string,
    reasonCode: string,
    reason: string,
  ) => {
    try {
      await adminAuthService.rejectInstitutionRequest(
        requestId,
        reasonCode,
        reason,
      );

      setPendingRequests((prev) =>
        prev.filter((request) => request.id !== requestId),
      );
    } catch (err: any) {
      let errorMessage = 'Failed to reject request.';

      if (err.response?.data) {
        const data = err.response.data;

        if (Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors.join(' ');
        } else if (data.rejection_reason) {
          errorMessage = Array.isArray(data.rejection_reason)
            ? data.rejection_reason.join(' ')
            : data.rejection_reason;
        } else if (data.error?.includes('duplicate key value')) {
          errorMessage = 'This institution or domain is already registered.';
        } else if (data.message || data.error) {
          errorMessage = data.message || data.error;
        }
      } else {
        const sanitized = sanitizeAdminError(err);
        errorMessage = sanitized.userMessage || errorMessage;
      }

      setError(errorMessage);
      throw err;
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedPendingRequest || !rejectionReasonCode || !rejectionReason.trim()) {
      return;
    }

    try {
      setIsProcessing(selectedPendingRequest.id);

      await handleRejectRequest(
        selectedPendingRequest.id,
        rejectionReasonCode,
        rejectionReason,
      );

      setShowRejectModal(false);
      setShowReviewModal(false);
      setRejectionReasonCode('');
      setRejectionReason('');
      setSelectedPendingRequest(null);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);

    try {
      const blob = await adminAuthService.exportInstitutions();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute(
        'download',
        `institutions_${new Date().toISOString().split('T')[0]}.csv`,
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  const statusCounts = useMemo(
    () => ({
      total: institutions.length,
      verified: institutions.filter((item) => item.is_verified && item.is_active)
        .length,
      pending:
        pendingRequests.length +
        institutions.filter((item) => !item.is_verified && item.is_active).length,
      inactive: institutions.filter((item) => !item.is_active).length,
      students: institutions.reduce((sum, item) => sum + item.student_count, 0),
      internships: institutions.reduce(
        (sum, item) => sum + item.internship_count,
        0,
      ),
    }),
    [institutions, pendingRequests.length],
  );

  const filteredInstitutions = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    return institutions.filter((institution) => {
      const matchesSearch =
        !normalizedSearch ||
        institution.name?.toLowerCase().includes(normalizedSearch) ||
        institution.email?.toLowerCase().includes(normalizedSearch) ||
        institution.address?.toLowerCase().includes(normalizedSearch) ||
        institution.tracking_code?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;

      if (filterStatus === 'verified') {
        return institution.is_verified && institution.is_active;
      }

      if (filterStatus === 'pending') {
        return !institution.is_verified && institution.is_active;
      }

      if (filterStatus === 'inactive') {
        return !institution.is_active;
      }

      return true;
    });
  }, [filterStatus, institutions, searchTerm]);

  const getInstitutionStatus = (institution: Institution) => {
    if (!institution.is_active) {
      return {
        label: 'Inactive',
        className: 'status-danger',
      };
    }

    if (institution.is_verified) {
      return {
        label: 'Verified',
        className: 'status-success',
      };
    }

    return {
      label: 'Pending',
      className: 'status-warning',
    };
  };

  const openReviewModal = (request: InstitutionRequest) => {
    setSelectedPendingRequest(request);
    setShowReviewModal(true);
  };

  const openRejectModal = (request: InstitutionRequest) => {
    setSelectedPendingRequest(request);
    setShowRejectModal(true);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <InstitutionManagementSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="institution-page">
        <header className="institution-header">
          <div>
            <span className="institution-kicker">
              <Shield size={14} />
              Institution operations
            </span>

            <h1>Institution Verification Center</h1>

            <p>
              Review institution access requests, verify domains, inspect
              institution records, and monitor institutional participation across
              students, employers, and placements.
            </p>
          </div>

          <div className="institution-actions">
            <button
              type="button"
              className="institution-btn secondary"
              onClick={fetchInstitutionData}
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              className="institution-btn ghost"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download size={16} />
              {isExporting ? 'Exporting' : 'Export'}
            </button>
          </div>
        </header>

        {error && (
          <div className="institution-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}

        <section className="institution-signal-grid">
          <article>
            <div className="signal-icon neutral">
              <Building size={20} />
            </div>
            <strong>{statusCounts.total}</strong>
            <span>Total institutions</span>
          </article>

          <article>
            <div className="signal-icon success">
              <CheckCircle size={20} />
            </div>
            <strong>{statusCounts.verified}</strong>
            <span>Verified institutions</span>
          </article>

          <article>
            <div className="signal-icon warning">
              <Clock size={20} />
            </div>
            <strong>{statusCounts.pending}</strong>
            <span>Pending verification</span>
          </article>

          <article>
            <div className="signal-icon danger">
              <XCircle size={20} />
            </div>
            <strong>{statusCounts.inactive}</strong>
            <span>Inactive institutions</span>
          </article>

          <article>
            <div className="signal-icon indigo">
              <User size={20} />
            </div>
            <strong>{statusCounts.students}</strong>
            <span>Linked students</span>
          </article>

          <article>
            <div className="signal-icon blue">
              <Activity size={20} />
            </div>
            <strong>{statusCounts.internships}</strong>
            <span>Tracked internships</span>
          </article>
        </section>

        <section className="institution-panel">
          <div className="institution-panel-header">
            <div>
              <span className="institution-panel-kicker">
                Access and verification
              </span>

              <h2>Institution registry</h2>

              <p>
                Manage verified institutions and review pending onboarding
                requests.
              </p>
            </div>

            <div className="institution-tabs">
              <button
                type="button"
                className={activeTab === 'institutions' ? 'active' : ''}
                onClick={() => setActiveTab('institutions')}
              >
                Institutions
                <span>{institutions.length}</span>
              </button>

              <button
                type="button"
                className={activeTab === 'pending' ? 'active' : ''}
                onClick={() => setActiveTab('pending')}
              >
                Pending requests
                <span>{pendingRequests.length}</span>
              </button>
            </div>
          </div>

          <div className="institution-filter-bar">
            <div className="institution-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search institution, email, address, tracking code..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              disabled={activeTab === 'pending'}
            >
              <option value="all">All statuses</option>
              <option value="verified">Verified only</option>
              <option value="pending">Pending only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          {activeTab === 'institutions' ? (
            <div className="institution-table-wrap">
              {filteredInstitutions.length === 0 ? (
                <div className="institution-empty">
                  <Building size={42} />
                  <h3>No institutions found</h3>
                  <p>Try adjusting your search or status filter.</p>
                </div>
              ) : (
                <table className="institution-table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Tracking</th>
                      <th>Contact</th>
                      <th>Operational scope</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInstitutions.map((institution) => {
                      const status = getInstitutionStatus(institution);

                      return (
                        <tr key={institution.id}>
                          <td>
                            <div className="institution-identity">
                              <div className="institution-avatar">
                                <Building size={18} />
                              </div>

                              <div>
                                <strong>{institution.name}</strong>
                                <span>
                                  <MapPin size={12} />
                                  {institution.contact_address ||
                                    institution.address ||
                                    'No address provided'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="tracking-code">
                              {institution.tracking_code || '—'}
                            </span>
                          </td>

                          <td>
                            <div className="institution-contact">
                              <span>
                                <Mail size={12} />
                                {institution.contact_email || institution.email}
                              </span>

                              <span>
                                <Phone size={12} />
                                {institution.contact_phone ||
                                  institution.phone ||
                                  'No phone'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="scope-grid">
                              <span>
                                <strong>{institution.student_count}</strong>
                                Students
                              </span>

                              <span>
                                <strong>{institution.internship_count}</strong>
                                Internships
                              </span>

                              <span>
                                <strong>{institution.employer_count}</strong>
                                Employers
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className={`institution-status ${status.className}`}>
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <div className="institution-row-actions">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInstitution(institution);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <Eye size={14} />
                                View
                              </button>

                              <button type="button" className="danger">
                                <XCircle size={14} />
                                Restrict
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="request-grid">
              {pendingRequests.length === 0 ? (
                <div className="institution-empty">
                  <CheckCircle size={42} />
                  <h3>All requests processed</h3>
                  <p>No pending institution access requests.</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <article className="request-card" key={request.id}>
                    <div className="request-card-top">
                      <div>
                        <span className="request-tag">Pending review</span>
                        <h3>{request.institution_name}</h3>
                      </div>

                      <span className="tracking-code">
                        {request.tracking_code}
                      </span>
                    </div>

                    <div className="request-meta">
                      <span>
                        <User size={13} />
                        {request.representative_name}
                      </span>

                      <span>
                        <Mail size={13} />
                        {request.representative_email}
                      </span>

                      <span>
                        <Calendar size={13} />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="request-domains">
                      {request.requested_domains?.slice(0, 3).map((domain) => (
                        <span key={domain}>{domain}</span>
                      ))}
                    </div>

                    <div className="request-actions">
                      <button
                        type="button"
                        className="success"
                        disabled={isProcessing === request.id}
                        onClick={() => handleApproveRequest(request.id)}
                      >
                        <CheckCircle size={14} />
                        {isProcessing === request.id ? 'Approving' : 'Approve'}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        disabled={isProcessing === request.id}
                        onClick={() => openRejectModal(request)}
                      >
                        <XCircle size={14} />
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing === request.id}
                        onClick={() => openReviewModal(request)}
                      >
                        <Eye size={14} />
                        Review
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      {showDetailsModal && selectedInstitution && (
        <div className="institution-modal-backdrop">
          <div className="institution-modal">
            <header className="institution-modal-header">
              <div>
                <span>Institution profile</span>
                <h2>{selectedInstitution.name}</h2>
              </div>

              <button type="button" onClick={() => setShowDetailsModal(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="institution-modal-body">
              <aside className="institution-record-summary">
                <div className="institution-record-icon">
                  <Building size={34} />
                </div>

                <h3>{selectedInstitution.name}</h3>

                <span
                  className={`institution-status ${
                    getInstitutionStatus(selectedInstitution).className
                  }`}
                >
                  {getInstitutionStatus(selectedInstitution).label}
                </span>

                {selectedInstitution.tracking_code && (
                  <div className="record-tracking">
                    <span>Tracking code</span>
                    <strong>{selectedInstitution.tracking_code}</strong>
                  </div>
                )}
              </aside>

              <section className="institution-record-details">
                <div className="record-block">
                  <h4>
                    <Mail size={14} />
                    Contact information
                  </h4>

                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        {selectedInstitution.contact_email ||
                          selectedInstitution.email}
                      </dd>
                    </div>

                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {selectedInstitution.contact_phone ||
                          selectedInstitution.phone ||
                          'N/A'}
                      </dd>
                    </div>

                    <div>
                      <dt>Website</dt>
                      <dd>
                        {selectedInstitution.contact_website ||
                        selectedInstitution.website ? (
                          <a
                            href={
                              selectedInstitution.contact_website ||
                              selectedInstitution.website
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selectedInstitution.contact_website ||
                              selectedInstitution.website}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Address</dt>
                      <dd>
                        {selectedInstitution.contact_address ||
                          selectedInstitution.address ||
                          'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Activity size={14} />
                    Platform statistics
                  </h4>

                  <div className="record-stat-grid">
                    <div>
                      <strong>{selectedInstitution.student_count}</strong>
                      <span>Students</span>
                    </div>

                    <div>
                      <strong>{selectedInstitution.internship_count}</strong>
                      <span>Internships</span>
                    </div>

                    <div>
                      <strong>{selectedInstitution.employer_count}</strong>
                      <span>Employers</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <footer className="institution-modal-footer">
              <button
                type="button"
                className="institution-btn ghost"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>

              <button type="button" className="institution-btn secondary">
                Manage affiliations
              </button>
            </footer>
          </div>
        </div>
      )}

      {showReviewModal && selectedPendingRequest && (
        <div className="institution-modal-backdrop">
          <div className="institution-modal large">
            <header className="institution-modal-header">
              <div>
                <span>Access request review</span>
                <h2>{selectedPendingRequest.institution_name}</h2>
              </div>

              <button type="button" onClick={() => setShowReviewModal(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="institution-modal-body review-grid">
              <section className="record-block">
                <h4>
                  <Building size={14} />
                  Institution information
                </h4>

                <dl>
                  <div>
                    <dt>Name</dt>
                    <dd>{selectedPendingRequest.institution_name}</dd>
                  </div>

                  <div>
                    <dt>Website</dt>
                    <dd>
                      <a
                        href={selectedPendingRequest.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedPendingRequest.website_url}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt>Domains</dt>
                    <dd>
                      <div className="domain-list">
                        {selectedPendingRequest.requested_domains.map(
                          (domain) => (
                            <span key={domain}>{domain}</span>
                          ),
                        )}
                      </div>
                    </dd>
                  </div>

                  <div>
                    <dt>Notes</dt>
                    <dd>{selectedPendingRequest.notes || 'No notes provided.'}</dd>
                  </div>
                </dl>
              </section>

              <section className="record-block">
                <h4>
                  <User size={14} />
                  Representative information
                </h4>

                <dl>
                  <div>
                    <dt>Name</dt>
                    <dd>{selectedPendingRequest.representative_name}</dd>
                  </div>

                  <div>
                    <dt>Email</dt>
                    <dd>{selectedPendingRequest.representative_email}</dd>
                  </div>

                  <div>
                    <dt>Role</dt>
                    <dd>{selectedPendingRequest.representative_role}</dd>
                  </div>

                  <div>
                    <dt>Phone</dt>
                    <dd>{selectedPendingRequest.representative_phone || 'N/A'}</dd>
                  </div>

                  <div>
                    <dt>Department</dt>
                    <dd>{selectedPendingRequest.department || 'N/A'}</dd>
                  </div>
                </dl>
              </section>

              {selectedPendingRequest.supporting_document && (
                <section className="record-block full">
                  <h4>
                    <FileText size={14} />
                    Supporting document
                  </h4>

                  <a
                    href={selectedPendingRequest.supporting_document}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    View supporting document
                  </a>
                </section>
              )}
            </div>

            <footer className="institution-modal-footer">
              <button
                type="button"
                className="institution-btn ghost"
                onClick={() => setShowReviewModal(false)}
                disabled={isProcessing === selectedPendingRequest.id}
              >
                Close
              </button>

              <button
                type="button"
                className="institution-btn danger"
                onClick={() => openRejectModal(selectedPendingRequest)}
                disabled={isProcessing === selectedPendingRequest.id}
              >
                <XCircle size={15} />
                Reject request
              </button>

              <button
                type="button"
                className="institution-btn success"
                onClick={() => handleApproveRequest(selectedPendingRequest.id)}
                disabled={isProcessing === selectedPendingRequest.id}
              >
                <CheckCircle size={15} />
                {isProcessing === selectedPendingRequest.id
                  ? 'Approving'
                  : 'Approve request'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {showRejectModal && selectedPendingRequest && (
        <div className="institution-modal-backdrop">
          <div className="institution-modal compact">
            <header className="institution-modal-header">
              <div>
                <span>Reject institution request</span>
                <h2>{selectedPendingRequest.institution_name}</h2>
              </div>

              <button type="button" onClick={() => setShowRejectModal(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="reject-body">
              <label>
                Rejection reason code
                <select
                  value={rejectionReasonCode}
                  onChange={(event) =>
                    setRejectionReasonCode(event.target.value)
                  }
                >
                  <option value="">Select a reason...</option>
                  <option value="invalid_domain">
                    Invalid or unverifiable email domain
                  </option>
                  <option value="insufficient_documentation">
                    Insufficient supporting documentation
                  </option>
                  <option value="unverifiable_institution">
                    Cannot verify institution legitimacy
                  </option>
                  <option value="duplicate_request">
                    Duplicate request or institution
                  </option>
                  <option value="spam_suspicious">
                    Suspicious activity or spam indicators
                  </option>
                  <option value="other">Other reason</option>
                </select>
              </label>

              <label>
                Detailed explanation
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explain why this request is being rejected..."
                />
              </label>
            </div>

            <footer className="institution-modal-footer">
              <button
                type="button"
                className="institution-btn ghost"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="institution-btn danger"
                onClick={handleConfirmReject}
                disabled={
                  !rejectionReasonCode ||
                  !rejectionReason.trim() ||
                  isProcessing === selectedPendingRequest.id
                }
              >
                <XCircle size={15} />
                {isProcessing === selectedPendingRequest.id
                  ? 'Rejecting'
                  : 'Confirm rejection'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        .institution-page {
          color: #111827;
        }

        .institution-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
        }

        .institution-kicker,
        .institution-panel-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .institution-kicker svg {
          color: #047857;
        }

        .institution-header h1 {
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
          margin: 0 0 8px;
        }

        .institution-header p {
          color: #64748b;
          max-width: 780px;
          line-height: 1.65;
          margin: 0;
        }

        .institution-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .institution-btn {
          min-height: 42px;
          border-radius: 12px;
          padding: 0 14px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          cursor: pointer;
          text-decoration: none;
        }

        .institution-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .institution-btn.ghost {
          background: #ffffff;
          border-color: #e5e7eb;
          color: #475569;
        }

        .institution-btn.success {
          background: #047857;
          color: #ffffff;
        }

        .institution-btn.danger {
          background: #dc2626;
          color: #ffffff;
        }

        .institution-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .institution-error {
          margin-bottom: 18px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .institution-error button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .institution-signal-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .institution-signal-grid article,
        .institution-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .institution-signal-grid article {
          border-radius: 18px;
          padding: 16px;
        }

        .signal-icon {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .signal-icon.neutral { color: #334155; background: #f1f5f9; }
        .signal-icon.success { color: #047857; background: #ecfdf5; }
        .signal-icon.warning { color: #b45309; background: #fffbeb; }
        .signal-icon.danger { color: #b91c1c; background: #fef2f2; }
        .signal-icon.indigo { color: #4338ca; background: #eef2ff; }
        .signal-icon.blue { color: #0369a1; background: #e0f2fe; }

        .institution-signal-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .institution-signal-grid span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .institution-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .institution-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .institution-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
        }

        .institution-panel-header p {
          color: #64748b;
          margin: 0;
          font-size: .9rem;
          line-height: 1.55;
        }

        .institution-tabs {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .institution-tabs button {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: .82rem;
          font-weight: 850;
          cursor: pointer;
        }

        .institution-tabs button.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .institution-tabs span {
          margin-left: 6px;
          opacity: .75;
        }

        .institution-filter-bar {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 220px;
          gap: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .institution-search {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #94a3b8;
        }

        .institution-search input {
          width: 100%;
          border: 0;
          outline: none;
          color: #111827;
          font-weight: 650;
          font-size: .9rem;
        }

        .institution-filter-bar select {
          min-height: 44px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          padding: 0 12px;
          font-weight: 750;
          outline: none;
        }

        .institution-table-wrap {
          overflow-x: auto;
        }

        .institution-table {
          width: 100%;
          min-width: 1120px;
          border-collapse: collapse;
        }

        .institution-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .institution-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .institution-identity {
          min-width: 260px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .institution-avatar {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #f1f5f9;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .institution-identity strong {
          color: #0f172a;
          display: block;
          font-size: .9rem;
          font-weight: 900;
        }

        .institution-identity span,
        .institution-contact span {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: .78rem;
          line-height: 1.5;
        }

        .tracking-code {
          display: inline-flex;
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .75rem;
          font-weight: 850;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          white-space: nowrap;
        }

        .institution-contact {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .scope-grid {
          display: flex;
          gap: 8px;
        }

        .scope-grid span {
          min-width: 74px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 12px;
          padding: 7px 8px;
          color: #64748b;
          font-size: .68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .scope-grid strong {
          display: block;
          color: #0f172a;
          font-size: .98rem;
          font-weight: 900;
        }

        .institution-status {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .status-success { background: #ecfdf5; color: #047857; }
        .status-warning { background: #fffbeb; color: #b45309; }
        .status-danger { background: #fef2f2; color: #b91c1c; }

        .institution-row-actions,
        .request-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .institution-row-actions button,
        .request-actions button {
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid #dbe3ea;
          background: #ffffff;
          color: #334155;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: .78rem;
          font-weight: 850;
          cursor: pointer;
        }

        .institution-row-actions button.danger,
        .request-actions button.danger {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .request-actions button.success {
          color: #047857;
          border-color: #bbf7d0;
        }

        .institution-empty {
          padding: 56px 20px;
          text-align: center;
          color: #64748b;
          grid-column: 1 / -1;
        }

        .institution-empty svg {
          margin-bottom: 12px;
          color: #94a3b8;
        }

        .institution-empty h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .institution-empty p {
          margin: 0;
        }

        .request-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .request-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          background: #ffffff;
        }

        .request-card-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .request-tag {
          display: inline-flex;
          color: #b45309;
          background: #fffbeb;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: .68rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 8px;
        }

        .request-card h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
        }

        .request-meta {
          display: grid;
          gap: 7px;
          margin-bottom: 12px;
        }

        .request-meta span {
          color: #64748b;
          font-size: .82rem;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .request-domains {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 14px;
        }

        .request-domains span,
        .domain-list span {
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #334155;
          padding: 5px 8px;
          font-size: .72rem;
          font-weight: 800;
        }

        .institution-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15,23,42,.48);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .institution-modal {
          width: min(880px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #ffffff;
          border-radius: 22px;
          box-shadow: 0 24px 80px rgba(15,23,42,.24);
        }

        .institution-modal.compact {
          width: min(560px, 100%);
        }

        .institution-modal.large {
          width: min(940px, 100%);
        }

        .institution-modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .institution-modal-header span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .institution-modal-header h2 {
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -.03em;
        }

        .institution-modal-header button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .institution-modal-body {
          padding: 20px;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
        }

        .institution-modal-body.review-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .record-block.full {
          grid-column: 1 / -1;
        }

        .institution-record-summary {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          text-align: center;
        }

        .institution-record-icon {
          width: 76px;
          height: 76px;
          margin: 0 auto 14px;
          border-radius: 22px;
          background: #f1f5f9;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .institution-record-summary h3 {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
          margin: 0 0 12px;
        }

        .record-tracking {
          margin-top: 16px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 14px;
          padding: 12px;
        }

        .record-tracking span {
          display: block;
          color: #64748b;
          font-size: .68rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 4px;
        }

        .record-tracking strong {
          color: #0f172a;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: .82rem;
        }

        .institution-record-details {
          display: grid;
          gap: 14px;
        }

        .record-block {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
        }

        .record-block h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
          margin: 0 0 14px;
        }

        .record-block dl {
          margin: 0;
          display: grid;
          gap: 12px;
        }

        .record-block dl > div {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 14px;
        }

        .record-block dt {
          color: #64748b;
          font-size: .78rem;
          font-weight: 800;
        }

        .record-block dd {
          margin: 0;
          color: #111827;
          font-size: .88rem;
          font-weight: 750;
          word-break: break-word;
        }

        .record-block a,
        .document-link {
          color: #047857;
          font-weight: 850;
          text-decoration: none;
        }

        .record-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .record-stat-grid div {
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          padding: 12px;
        }

        .record-stat-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.4rem;
          font-weight: 900;
        }

        .record-stat-grid span {
          color: #64748b;
          font-size: .74rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .domain-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .reject-body {
          padding: 20px;
          display: grid;
          gap: 14px;
        }

        .reject-body label {
          color: #0f172a;
          font-size: .82rem;
          font-weight: 850;
          display: grid;
          gap: 7px;
        }

        .reject-body select,
        .reject-body textarea {
          width: 100%;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          padding: 11px 12px;
          font: inherit;
          outline: none;
        }

        .reject-body textarea {
          resize: vertical;
        }

        .institution-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eef2f7;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        @media (max-width: 1180px) {
          .institution-signal-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .request-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .institution-header,
          .institution-panel-header {
            flex-direction: column;
          }

          .institution-actions,
          .institution-tabs {
            width: 100%;
            flex-direction: column;
          }

          .institution-btn,
          .institution-tabs button {
            width: 100%;
          }

          .institution-signal-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .institution-filter-bar {
            grid-template-columns: 1fr;
          }

          .institution-modal-body,
          .institution-modal-body.review-grid {
            grid-template-columns: 1fr;
          }

          .record-block dl > div {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .record-stat-grid {
            grid-template-columns: 1fr;
          }

          .institution-modal-footer {
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .institution-signal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default InstitutionManagement;