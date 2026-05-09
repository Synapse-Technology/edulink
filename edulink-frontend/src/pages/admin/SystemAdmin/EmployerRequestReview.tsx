import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Globe,
  Hash,
  Mail,
  Search,
  Shield,
  ShieldAlert,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { employerService } from '../../../services/employer/employerService';
import type {
  Employer,
  EmployerRequest,
  ReviewRequestData,
} from '../../../services/employer/employerService';
import AdminLayout from '../../../components/admin/AdminLayout';
import EmployerManagementSkeleton from '../../../components/admin/skeletons/EmployerManagementSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

type ActiveTab = 'employers' | 'requests';
type ReviewAction = 'APPROVE' | 'REJECT';

const EmployerRequestReview: React.FC = () => {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [requests, setRequests] = useState<EmployerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [selectedRequest, setSelectedRequest] =
    useState<EmployerRequest | null>(null);
  const [selectedEmployer, setSelectedEmployer] =
    useState<Employer | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showEmployerModal, setShowEmployerModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [action, setAction] = useState<ReviewAction>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonCode, setRejectionReasonCode] = useState('OTHER');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-GB').format(new Date(dateString));
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const fetchData = async () => {
    try {
      if (loading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [employersData, requestsData] = await Promise.all([
        employerService.getEmployers(),
        employerService.getRequests(),
      ]);

      setEmployers(employersData);
      setRequests(requestsData);
      setError('');
    } catch (err: any) {
      if (err.status === 404 || err.response?.status === 404) {
        setError(
          'The employer service endpoints could not be found. Please ensure the backend is running and up to date.',
        );
      } else if (err.status === 403 || err.response?.status === 403) {
        setError('You do not have permission to view this data.');
      } else {
        const sanitized = sanitizeAdminError(err);
        setError(
          sanitized.userMessage ||
            'Failed to fetch data. Please check your connection.',
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReviewClick = (
    request: EmployerRequest,
    reviewAction: ReviewAction,
  ) => {
    setSelectedRequest(request);
    setAction(reviewAction);
    setRejectionReason('');
    setRejectionReasonCode('OTHER');
    setShowReviewModal(true);
  };

  const handleViewRequest = (request: EmployerRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const handleViewEmployer = (employer: Employer) => {
    setSelectedEmployer(employer);
    setShowEmployerModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    if (action === 'REJECT' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }

    setSubmittingReview(true);

    try {
      const reviewData: ReviewRequestData = {
        action: action === 'APPROVE' ? 'approve' : 'reject',
        ...(action === 'REJECT' && {
          rejection_reason_code: rejectionReasonCode,
          rejection_reason: rejectionReason,
        }),
      };

      await employerService.reviewRequest(selectedRequest.id, reviewData);

      await fetchData();

      setShowReviewModal(false);
      setShowRequestModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setRejectionReasonCode('OTHER');

      toast.success(
        action === 'APPROVE'
          ? 'Employer request approved.'
          : 'Employer request rejected.',
      );
    } catch (err) {
      const sanitized = sanitizeAdminError(err);
      toast.error(sanitized.userMessage || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const counts = useMemo(
    () => ({
      totalEmployers: employers.length,
      activeEmployers: employers.filter((item) => item.status === 'ACTIVE')
        .length,
      pendingRequests: requests.filter((item) => item.status === 'PENDING')
        .length,
      rejectedRequests: requests.filter((item) => item.status === 'REJECTED')
        .length,
      totalCapacity: employers.reduce(
        (sum, item) => sum + Number(item.max_active_students || 0),
        0,
      ),
      activeRequests: requests.length,
    }),
    [employers, requests],
  );

  const filteredEmployers = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return employers.filter((employer) => {
      const matchesSearch =
        !query ||
        employer.name?.toLowerCase().includes(query) ||
        employer.official_email?.toLowerCase().includes(query) ||
        employer.domain?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filterStatus === 'all') return true;

      return employer.status === filterStatus;
    });
  }, [employers, filterStatus, searchTerm]);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        request.tracking_code?.toLowerCase().includes(query) ||
        request.name?.toLowerCase().includes(query) ||
        request.official_email?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filterStatus === 'all') return true;

      return request.status === filterStatus;
    });
  }, [filterStatus, requests, searchTerm]);

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: 'Active',
          className: 'status-success',
        };
      case 'APPROVED':
        return {
          label: 'Approved inactive',
          className: 'status-muted',
        };
      case 'PENDING':
      case 'REQUESTED':
        return {
          label: 'Pending',
          className: 'status-warning',
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          className: 'status-danger',
        };
      default:
        return {
          label: status || 'Unknown',
          className: 'status-muted',
        };
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <EmployerManagementSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="employer-ops-page">
        <header className="employer-ops-header">
          <div>
            <span className="employer-kicker">
              <Shield size={14} />
              Employer trust operations
            </span>

            <h1>Employer Onboarding Center</h1>

            <p>
              Review employer access requests, inspect organization credibility,
              monitor partnership status, and manage internship hosting capacity.
            </p>
          </div>

          <div className="employer-header-actions">
            <button
              type="button"
              className="employer-btn secondary"
              onClick={fetchData}
              disabled={refreshing}
            >
              <Activity size={16} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </header>

        {error && (
          <div className="employer-error" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Error loading data</strong>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}

        <section className="employer-signal-grid">
          <article>
            <div className="signal-icon neutral">
              <Building size={20} />
            </div>
            <strong>{counts.totalEmployers}</strong>
            <span>Registered employers</span>
          </article>

          <article>
            <div className="signal-icon success">
              <Users size={20} />
            </div>
            <strong>{counts.activeEmployers}</strong>
            <span>Active partners</span>
          </article>

          <article>
            <div className="signal-icon warning">
              <Clock size={20} />
            </div>
            <strong>{counts.pendingRequests}</strong>
            <span>Pending requests</span>
          </article>

          <article>
            <div className="signal-icon danger">
              <ShieldAlert size={20} />
            </div>
            <strong>{counts.rejectedRequests}</strong>
            <span>Rejected requests</span>
          </article>

          <article>
            <div className="signal-icon indigo">
              <Briefcase size={20} />
            </div>
            <strong>{counts.totalCapacity}</strong>
            <span>Hosting capacity</span>
          </article>

          <article>
            <div className="signal-icon blue">
              <Activity size={20} />
            </div>
            <strong>{counts.activeRequests}</strong>
            <span>Total request records</span>
          </article>
        </section>

        <section className="employer-panel">
          <div className="employer-panel-header">
            <div>
              <span className="employer-panel-kicker">
                Verification and partner access
              </span>

              <h2>Employer registry</h2>

              <p>
                Review onboarding history and inspect verified employer records.
              </p>
            </div>

            <div className="employer-tabs">
              <button
                type="button"
                className={activeTab === 'requests' ? 'active' : ''}
                onClick={() => setActiveTab('requests')}
              >
                Requests
                <span>{requests.length}</span>
              </button>

              <button
                type="button"
                className={activeTab === 'employers' ? 'active' : ''}
                onClick={() => setActiveTab('employers')}
              >
                Employers
                <span>{employers.length}</span>
              </button>
            </div>
          </div>

          <div className="employer-filter-bar">
            <div className="employer-search">
              <Search size={16} />
              <input
                type="text"
                placeholder={
                  activeTab === 'requests'
                    ? 'Search tracking code, organization, email...'
                    : 'Search employer, email, domain...'
                }
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved inactive</option>
              <option value="REJECTED">Rejected</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>

          {activeTab === 'requests' ? (
            <div className="employer-table-wrap">
              {filteredRequests.length === 0 ? (
                <div className="employer-empty">
                  <CheckCircle size={42} />
                  <h3>No requests found</h3>
                  <p>Try adjusting your search or status filter.</p>
                </div>
              ) : (
                <table className="employer-table">
                  <thead>
                    <tr>
                      <th>Tracking</th>
                      <th>Organization</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.map((request) => {
                      const status = getStatusMeta(request.status);

                      return (
                        <tr key={request.id}>
                          <td>
                            <span className="tracking-code">
                              <Hash size={12} />
                              {request.tracking_code || '—'}
                            </span>
                          </td>

                          <td>
                            <div className="employer-identity">
                              <div className="employer-avatar">
                                <Briefcase size={18} />
                              </div>

                              <div>
                                <strong>{request.name}</strong>
                                <span>
                                  <Globe size={12} />
                                  {request.domain || 'No domain'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="employer-contact">
                              <span>
                                <Mail size={12} />
                                {request.official_email}
                              </span>

                              <span>
                                <User size={12} />
                                {request.contact_person || 'No contact person'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className={`employer-status ${status.className}`}>
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <span className="employer-date">
                              <Calendar size={13} />
                              {formatDate(request.created_at)}
                            </span>
                          </td>

                          <td>
                            <div className="employer-row-actions">
                              <button
                                type="button"
                                onClick={() => handleViewRequest(request)}
                              >
                                <Eye size={14} />
                                View
                              </button>

                              {request.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    className="success"
                                    onClick={() =>
                                      handleReviewClick(request, 'APPROVE')
                                    }
                                  >
                                    <CheckCircle size={14} />
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={() =>
                                      handleReviewClick(request, 'REJECT')
                                    }
                                  >
                                    <XCircle size={14} />
                                    Reject
                                  </button>
                                </>
                              )}
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
            <div className="employer-table-wrap">
              {filteredEmployers.length === 0 ? (
                <div className="employer-empty">
                  <Building size={42} />
                  <h3>No employers found</h3>
                  <p>Try adjusting your search or status filter.</p>
                </div>
              ) : (
                <table className="employer-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Contact</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Capacity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployers.map((employer) => {
                      const status = getStatusMeta(employer.status);

                      return (
                        <tr key={employer.id}>
                          <td>
                            <div className="employer-identity">
                              <div className="employer-avatar">
                                <Building size={18} />
                              </div>

                              <div>
                                <strong>{employer.name}</strong>
                                <span>
                                  <Globe size={12} />
                                  {employer.domain || 'No domain'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="employer-contact">
                              <span>
                                <Mail size={12} />
                                {employer.official_email}
                              </span>

                              <span>
                                <User size={12} />
                                {employer.contact_person || 'No contact person'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="employer-type">
                              {employer.organization_type}
                            </span>
                          </td>

                          <td>
                            <span className={`employer-status ${status.className}`}>
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <div className="capacity-pill">
                              <strong>{employer.max_active_students}</strong>
                              <span>students</span>
                            </div>
                          </td>

                          <td>
                            <div className="employer-row-actions">
                              <button
                                type="button"
                                onClick={() => handleViewEmployer(employer)}
                              >
                                <Eye size={14} />
                                View
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
          )}
        </section>
      </div>

      {showRequestModal && selectedRequest && (
        <div className="employer-modal-backdrop">
          <div className="employer-modal">
            <header className="employer-modal-header">
              <div>
                <span>Employer request record</span>
                <h2>{selectedRequest.name}</h2>
              </div>

              <button type="button" onClick={() => setShowRequestModal(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="employer-modal-body">
              <aside className="employer-record-summary">
                <div className="employer-record-icon">
                  <Briefcase size={34} />
                </div>

                <h3>{selectedRequest.name}</h3>
                <p>{selectedRequest.domain}</p>

                <span
                  className={`employer-status ${
                    getStatusMeta(selectedRequest.status).className
                  }`}
                >
                  {getStatusMeta(selectedRequest.status).label}
                </span>

                {selectedRequest.tracking_code && (
                  <div className="record-tracking">
                    <span>Tracking code</span>
                    <strong>{selectedRequest.tracking_code}</strong>
                  </div>
                )}
              </aside>

              <section className="employer-record-details">
                <div className="record-block">
                  <h4>
                    <Building size={14} />
                    Organization information
                  </h4>

                  <dl>
                    <div>
                      <dt>Website</dt>
                      <dd>{selectedRequest.website_url || 'N/A'}</dd>
                    </div>

                    <div>
                      <dt>Registration number</dt>
                      <dd>{selectedRequest.registration_number || 'N/A'}</dd>
                    </div>

                    <div>
                      <dt>Organization type</dt>
                      <dd>{selectedRequest.organization_type || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Mail size={14} />
                    Contact person
                  </h4>

                  <dl>
                    <div>
                      <dt>Name</dt>
                      <dd>{selectedRequest.contact_person || 'N/A'}</dd>
                    </div>

                    <div>
                      <dt>Email</dt>
                      <dd>{selectedRequest.official_email}</dd>
                    </div>

                    <div>
                      <dt>Phone</dt>
                      <dd>{selectedRequest.phone_number || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Clock size={14} />
                    Request history
                  </h4>

                  <dl>
                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatDateTime(selectedRequest.created_at)}</dd>
                    </div>

                    {selectedRequest.rejection_reason && (
                      <div>
                        <dt>Rejection reason</dt>
                        <dd>{selectedRequest.rejection_reason}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </section>
            </div>

            <footer className="employer-modal-footer">
              <button
                type="button"
                className="employer-btn ghost"
                onClick={() => setShowRequestModal(false)}
              >
                Close
              </button>

              {selectedRequest.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    className="employer-btn danger"
                    onClick={() => handleReviewClick(selectedRequest, 'REJECT')}
                  >
                    Reject request
                  </button>

                  <button
                    type="button"
                    className="employer-btn success"
                    onClick={() => handleReviewClick(selectedRequest, 'APPROVE')}
                  >
                    Approve request
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}

      {showEmployerModal && selectedEmployer && (
        <div className="employer-modal-backdrop">
          <div className="employer-modal">
            <header className="employer-modal-header">
              <div>
                <span>Employer profile</span>
                <h2>{selectedEmployer.name}</h2>
              </div>

              <button type="button" onClick={() => setShowEmployerModal(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="employer-modal-body">
              <aside className="employer-record-summary">
                <div className="employer-record-icon">
                  <Building size={34} />
                </div>

                <h3>{selectedEmployer.name}</h3>
                <p>{selectedEmployer.domain}</p>

                <span
                  className={`employer-status ${
                    getStatusMeta(selectedEmployer.status).className
                  }`}
                >
                  {getStatusMeta(selectedEmployer.status).label}
                </span>
              </aside>

              <section className="employer-record-details">
                <div className="record-block">
                  <h4>
                    <Globe size={14} />
                    Organization details
                  </h4>

                  <dl>
                    <div>
                      <dt>Website</dt>
                      <dd>{selectedEmployer.website_url || 'N/A'}</dd>
                    </div>

                    <div>
                      <dt>Contact person</dt>
                      <dd>{selectedEmployer.contact_person || 'N/A'}</dd>
                    </div>

                    <div>
                      <dt>Email</dt>
                      <dd>{selectedEmployer.official_email}</dd>
                    </div>

                    <div>
                      <dt>Phone</dt>
                      <dd>{selectedEmployer.phone_number || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Activity size={14} />
                    Trust & hosting capacity
                  </h4>

                  <div className="record-stat-grid">
                    <div>
                      <strong>{selectedEmployer.trust_level}</strong>
                      <span>Trust level</span>
                    </div>

                    <div>
                      <strong>{selectedEmployer.max_active_students}</strong>
                      <span>Max students</span>
                    </div>

                    <div>
                      <strong>1:{selectedEmployer.supervisor_ratio}</strong>
                      <span>Staff ratio</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <footer className="employer-modal-footer">
              <button
                type="button"
                className="employer-btn ghost"
                onClick={() => setShowEmployerModal(false)}
              >
                Close profile
              </button>

              <button type="button" className="employer-btn secondary">
                Manage partnership
              </button>
            </footer>
          </div>
        </div>
      )}

      {showReviewModal && selectedRequest && (
        <div className="employer-modal-backdrop">
          <div className="employer-modal compact">
            <header className="employer-modal-header">
              <div>
                <span>
                  {action === 'APPROVE'
                    ? 'Approve employer request'
                    : 'Reject employer request'}
                </span>
                <h2>{selectedRequest.name}</h2>
              </div>

              <button type="button" onClick={() => setShowReviewModal(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="review-body">
              {action === 'APPROVE' ? (
                <div className="approval-copy">
                  <CheckCircle size={28} />
                  <p>
                    Approving this request will create an employer account and
                    send an invite to{' '}
                    <strong>{selectedRequest.official_email}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <label>
                    Rejection reason code
                    <select
                      value={rejectionReasonCode}
                      onChange={(event) =>
                        setRejectionReasonCode(event.target.value)
                      }
                    >
                      <option value="DOMAIN_MISMATCH">Domain mismatch</option>
                      <option value="INVALID_DATA">Invalid data</option>
                      <option value="DUPLICATE">Duplicate organization</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>

                  <label>
                    Detailed reason
                    <textarea
                      rows={4}
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      placeholder="Explain why this request is being rejected..."
                    />
                  </label>
                </>
              )}
            </div>

            <footer className="employer-modal-footer">
              <button
                type="button"
                className="employer-btn ghost"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  action === 'APPROVE'
                    ? 'employer-btn success'
                    : 'employer-btn danger'
                }
                onClick={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview
                  ? 'Processing'
                  : action === 'APPROVE'
                    ? 'Confirm approval'
                    : 'Confirm rejection'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        .employer-ops-page {
          color: #111827;
        }

        .employer-ops-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
        }

        .employer-kicker,
        .employer-panel-kicker {
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

        .employer-kicker svg {
          color: #047857;
        }

        .employer-ops-header h1 {
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
          margin: 0 0 8px;
        }

        .employer-ops-header p {
          color: #64748b;
          max-width: 780px;
          line-height: 1.65;
          margin: 0;
        }

        .employer-header-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .employer-btn {
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

        .employer-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .employer-btn.ghost {
          background: #ffffff;
          border-color: #e5e7eb;
          color: #475569;
        }

        .employer-btn.success {
          background: #047857;
          color: #ffffff;
        }

        .employer-btn.danger {
          background: #dc2626;
          color: #ffffff;
        }

        .employer-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .employer-error {
          margin-bottom: 18px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .employer-error strong {
          display: block;
          font-weight: 900;
          margin-bottom: 2px;
        }

        .employer-error span {
          display: block;
          font-size: .9rem;
        }

        .employer-error button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .employer-signal-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .employer-signal-grid article,
        .employer-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .employer-signal-grid article {
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

        .employer-signal-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .employer-signal-grid span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .employer-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .employer-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .employer-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
        }

        .employer-panel-header p {
          color: #64748b;
          margin: 0;
          font-size: .9rem;
          line-height: 1.55;
        }

        .employer-tabs {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .employer-tabs button {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: .82rem;
          font-weight: 850;
          cursor: pointer;
        }

        .employer-tabs button.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .employer-tabs span {
          margin-left: 6px;
          opacity: .75;
        }

        .employer-filter-bar {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 220px;
          gap: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .employer-search {
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

        .employer-search input {
          width: 100%;
          border: 0;
          outline: none;
          color: #111827;
          font-weight: 650;
          font-size: .9rem;
        }

        .employer-filter-bar select {
          min-height: 44px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          padding: 0 12px;
          font-weight: 750;
          outline: none;
        }

        .employer-table-wrap {
          overflow-x: auto;
        }

        .employer-table {
          width: 100%;
          min-width: 1060px;
          border-collapse: collapse;
        }

        .employer-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .employer-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .employer-identity {
          min-width: 260px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .employer-avatar {
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

        .employer-identity strong {
          display: block;
          color: #0f172a;
          font-size: .9rem;
          font-weight: 900;
        }

        .employer-identity span,
        .employer-contact span {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: .78rem;
          line-height: 1.5;
        }

        .tracking-code,
        .employer-status,
        .employer-type,
        .employer-date {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .tracking-code {
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .status-success { background: #ecfdf5; color: #047857; }
        .status-warning { background: #fffbeb; color: #b45309; }
        .status-danger { background: #fef2f2; color: #b91c1c; }
        .status-muted { background: #f8fafc; color: #475569; }

        .employer-type,
        .employer-date {
          background: #f8fafc;
          color: #475569;
        }

        .capacity-pill {
          display: inline-flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 12px;
          padding: 7px 10px;
        }

        .capacity-pill strong {
          color: #0f172a;
          line-height: 1;
          font-weight: 900;
        }

        .capacity-pill span {
          color: #64748b;
          font-size: .68rem;
          text-transform: uppercase;
          font-weight: 800;
        }

        .employer-row-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .employer-row-actions button {
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

        .employer-row-actions button.success {
          color: #047857;
          border-color: #bbf7d0;
        }

        .employer-row-actions button.danger {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .employer-empty {
          padding: 56px 20px;
          text-align: center;
          color: #64748b;
        }

        .employer-empty svg {
          margin-bottom: 12px;
          color: #94a3b8;
        }

        .employer-empty h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .employer-empty p {
          margin: 0;
        }

        .employer-modal-backdrop {
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

        .employer-modal {
          width: min(880px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #ffffff;
          border-radius: 22px;
          box-shadow: 0 24px 80px rgba(15,23,42,.24);
        }

        .employer-modal.compact {
          width: min(560px, 100%);
        }

        .employer-modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .employer-modal-header span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .employer-modal-header h2 {
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -.03em;
        }

        .employer-modal-header button {
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

        .employer-modal-body {
          padding: 20px;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
        }

        .employer-record-summary {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          text-align: center;
        }

        .employer-record-icon {
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

        .employer-record-summary h3 {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
          margin: 0 0 4px;
        }

        .employer-record-summary p {
          color: #64748b;
          font-size: .82rem;
          margin: 0 0 12px;
          word-break: break-word;
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

        .employer-record-details {
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
          grid-template-columns: 145px 1fr;
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
          font-size: 1.25rem;
          font-weight: 900;
        }

        .record-stat-grid span {
          color: #64748b;
          font-size: .72rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .review-body {
          padding: 20px;
          display: grid;
          gap: 14px;
        }

        .approval-copy {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          border-radius: 16px;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #047857;
          padding: 16px;
        }

        .approval-copy p {
          margin: 0;
          color: #064e3b;
          line-height: 1.6;
        }

        .review-body label {
          color: #0f172a;
          font-size: .82rem;
          font-weight: 850;
          display: grid;
          gap: 7px;
        }

        .review-body select,
        .review-body textarea {
          width: 100%;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          padding: 11px 12px;
          font: inherit;
          outline: none;
        }

        .review-body textarea {
          resize: vertical;
        }

        .employer-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eef2f7;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        @media (max-width: 1180px) {
          .employer-signal-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .employer-ops-header,
          .employer-panel-header {
            flex-direction: column;
          }

          .employer-header-actions,
          .employer-tabs {
            width: 100%;
            flex-direction: column;
          }

          .employer-btn,
          .employer-tabs button {
            width: 100%;
          }

          .employer-signal-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .employer-filter-bar {
            grid-template-columns: 1fr;
          }

          .employer-modal-body {
            grid-template-columns: 1fr;
          }

          .record-block dl > div {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .record-stat-grid {
            grid-template-columns: 1fr;
          }

          .employer-modal-footer {
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .employer-signal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default EmployerRequestReview;