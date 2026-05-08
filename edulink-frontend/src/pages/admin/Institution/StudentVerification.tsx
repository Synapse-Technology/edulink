import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  Modal,
  Alert,
  Nav,
} from 'react-bootstrap';
import {
  Info,
  ShieldCheck,
  Upload,
  Users,
  CheckCircle,
  XCircle,
  Layers,
  Building2,
  ClipboardCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  institutionService,
  type Department,
  type Cohort,
  type PendingVerification,
  type BulkPreviewResult,
} from '../../../services/institution/institutionService';

import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import FeedbackModal from '../../../components/common/FeedbackModal';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

const StudentVerification: React.FC = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [trustFilter, setTrustFilter] = useState<string>('ALL');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const [verifyModal, setVerifyModal] = useState<{
    show: boolean;
    student: PendingVerification | null;
    departmentId: string;
    cohortId: string;
  }>({
    show: false,
    student: null,
    departmentId: '',
    cohortId: '',
  });

  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewResult[]>([]);
  const [isLoadingBulk, setIsLoadingBulk] = useState(false);
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);
  const [bulkDepartmentId, setBulkDepartmentId] = useState('');
  const [bulkCohortId, setBulkCohortId] = useState('');

  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchPendingVerifications();
    }
  }, [activeTab]);

  const fetchReferenceData = async () => {
    try {
      const [depts, coh] = await Promise.all([
        institutionService.getDepartments(),
        institutionService.getCohorts(),
      ]);

      setDepartments(depts);
      setCohorts(coh);
    } catch {
      toast.error('Failed to load departments and cohorts');
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      setIsLoadingQueue(true);
      const data = await institutionService.getPendingVerifications();
      setPendingVerifications(data);
    } catch {
      toast.error('Failed to load pending verifications');
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const findSuggestedDepartment = (rawInput?: string): string => {
    if (!rawInput) return '';

    const normalizedInput = rawInput.toLowerCase().trim();

    const exactMatch = departments.find(
      d => d.name.toLowerCase() === normalizedInput && d.is_active !== false
    );

    if (exactMatch) return exactMatch.id;

    for (const dept of departments) {
      if (dept.is_active === false) continue;

      if (
        dept.aliases &&
        dept.aliases.some(alias => alias.toLowerCase() === normalizedInput)
      ) {
        return dept.id;
      }
    }

    return '';
  };

  const handleOpenVerifyModal = (student: PendingVerification) => {
    const suggestedDept = findSuggestedDepartment(student.raw_department_input);

    setVerifyModal({
      show: true,
      student,
      departmentId: suggestedDept,
      cohortId: '',
    });
  };

  const handleConfirmVerify = async () => {
    if (!verifyModal.student) return;

    try {
      setIsSubmittingVerify(true);

      await institutionService.approveVerification(
        verifyModal.student.id,
        verifyModal.departmentId || undefined,
        verifyModal.cohortId || undefined
      );

      toast.success('Student verified successfully');

      setVerifyModal({
        show: false,
        student: null,
        departmentId: '',
        cohortId: '',
      });

      fetchPendingVerifications();
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);
      toast.error(sanitized.userMessage || 'Failed to verify student');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return;

    try {
      await institutionService.rejectVerification(id, reason || 'No reason provided');
      toast.success('Verification request rejected');
      fetchPendingVerifications();
    } catch {
      toast.error('Failed to reject request');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setBulkFile(event.target.files[0]);
    }
  };

  const handleBulkPreview = async () => {
    if (!bulkFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    try {
      setIsLoadingBulk(true);
      const data = await institutionService.bulkPreview(bulkFile);
      setBulkPreview(data);
    } catch {
      toast.error('Failed to process file');
    } finally {
      setIsLoadingBulk(false);
    }
  };

  const handleBulkConfirm = async () => {
    const readyEntries = bulkPreview
      .filter(r => r.status.startsWith('ready'))
      .map(r => ({
        student_id: r.student_id || undefined,
        email: r.email,
        registration_number: r.registration_number,
      }));

    if (readyEntries.length === 0) {
      toast.error('No students ready for verification');
      return;
    }

    showConfirm({
      title: 'Bulk Verification',
      message: `Are you sure you want to verify/pre-register ${readyEntries.length} students? This action will create user accounts and send credentials.`,
      onConfirm: async () => {
        try {
          setIsConfirmingBulk(true);

          const response = await institutionService.bulkConfirm(
            readyEntries,
            bulkDepartmentId || undefined,
            bulkCohortId || undefined
          );

          showSuccess(
            'Bulk Processing Complete',
            response.message || 'Students have been processed successfully.'
          );

          setBulkFile(null);
          setBulkPreview([]);
          setActiveTab('queue');
        } catch (error: any) {
          const sanitized = sanitizeAdminError(error);

          showError(
            'Bulk Verification Failed',
            'An error occurred while processing the bulk verification file.',
            sanitized.details
          );
        } finally {
          setIsConfirmingBulk(false);
        }
      },
    });
  };

  const getPreviewStatusClass = (status: string) => {
    switch (status) {
      case 'ready':
      case 'ready_domain_match':
        return 'verification-status-ready';
      case 'already_verified':
        return 'verification-status-verified';
      case 'conflict':
        return 'verification-status-conflict';
      case 'not_found':
        return 'verification-status-warning';
      default:
        return 'verification-status-default';
    }
  };

  const filteredQueue = pendingVerifications.filter(item => {
    if (trustFilter === 'ALL') return true;
    const tier = item.student_trust_level || 0;
    return tier === parseInt(trustFilter);
  });

  const getCohortsForDept = (deptId: string) => {
    return cohorts.filter(c => c.department_id === deptId);
  };

  const readyBulkCount = bulkPreview.filter(r => r.status.startsWith('ready')).length;
  const conflictBulkCount = bulkPreview.filter(r => r.status === 'conflict').length;

  return (
    <InstitutionWorkspacePage className="student-verification-page">
      <style>{`
        .verification-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .verification-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #f4f6f8;
          border: 1px solid #e6e9ee;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 18px;
        }

        .verification-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .verification-subtitle {
          color: #64748b;
          max-width: 780px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .verification-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
          height: 100%;
        }

        .verification-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .verification-stat-label {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 8px;
        }

        .verification-stat-value {
          font-size: 1.9rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          line-height: 1;
          margin-bottom: 6px;
        }

        .verification-stat-sub {
          color: #64748b;
          font-size: 0.86rem;
          margin-bottom: 0;
        }

        .verification-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .verification-workspace-header {
          padding: 24px;
          border-bottom: 1px solid #eef2f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .verification-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 730;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .verification-card-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .verification-controls {
          display: flex;
          align-items: end;
          justify-content: flex-end;
          gap: 14px;
          flex-wrap: wrap;
        }

        .verification-tabs {
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 16px;
          padding: 5px;
          display: inline-flex;
          gap: 4px;
          white-space: nowrap;
        }

        .verification-tabs .nav-link {
          color: #64748b;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.86rem;
          padding: 9px 14px;
          cursor: pointer;
        }

        .verification-tabs .nav-link.active {
          background: #111827;
          color: #ffffff;
        }

        .verification-filter-control {
          min-width: 210px;
        }

        .verification-filter-control label {
          font-size: 0.74rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
        }

        .verification-select,
        .verification-input {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .verification-select:focus,
        .verification-input:focus {
          border-color: #111827 !important;
        }

        .verification-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 600px;
        }

        .verification-table {
          width: 100%;
          min-width: 1040px;
          table-layout: fixed;
          margin-bottom: 0;
        }

        .verification-table thead th {
          position: sticky;
          top: 0;
          z-index: 3;
          border: none !important;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          padding: 16px 18px;
          white-space: nowrap;
        }

        .verification-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .verification-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .student-col { width: 300px; }
        .trust-col { width: 180px; }
        .claimed-col { width: 260px; }
        .method-col { width: 170px; }
        .actions-col { width: 230px; }
        .status-col { width: 180px; }

        .verification-primary-text {
          font-weight: 720;
          color: #111827;
          line-height: 1.3;
        }

        .verification-muted {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 5px;
        }

        .verification-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .verification-status-ready {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .verification-status-verified {
          background: #eff6ff;
          border-color: #dbeafe;
          color: #1d4ed8;
        }

        .verification-status-conflict {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #991b1b;
        }

        .verification-status-warning {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .verification-status-default {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #64748b;
        }

        .verification-primary-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .verification-soft-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .verification-danger-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #fee2e2 !important;
          color: #dc2626 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .verification-empty-state,
        .verification-upload-zone {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 22px;
          padding: 52px 24px;
          text-align: center;
        }

        .verification-upload-zone {
          background: #fbfcfd;
        }

        .bulk-settings-box {
          background: #fbfcfd;
          border: 1px solid #edf0f4;
          border-radius: 22px;
          padding: 22px;
        }

        .verification-modal .modal-content {
          border: none;
          border-radius: 26px;
          overflow: hidden;
        }

        .verification-modal .modal-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .verification-modal .form-select {
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .verification-modal .form-select:focus {
          border-color: #111827;
        }

        .verify-student-card {
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 20px;
          padding: 18px;
        }

        @media (max-width: 992px) {
          .verification-workspace-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .verification-controls {
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 768px) {
          .verification-hero {
            padding: 22px;
          }

          .verification-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .verification-tabs,
          .verification-filter-control {
            width: 100%;
          }

          .verification-tabs {
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="verification-hero">
        <div>
          <div className="verification-eyebrow">
            <ShieldCheck size={15} />
            Student Verification
          </div>

          <h1 className="verification-title">
            Verify student identity and assign academic structure.
          </h1>

          <p className="verification-subtitle">
            Review student claims, approve verified learners, map them to departments
            and cohorts, or process trusted CSV batches for institution-wide onboarding.
          </p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="verification-stat-card">
            <div className="verification-stat-icon">
              <ClipboardCheck size={22} />
            </div>
            <div className="verification-stat-label">Pending Queue</div>
            <div className="verification-stat-value">{pendingVerifications.length}</div>
            <p className="verification-stat-sub">Student requests awaiting review</p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="verification-stat-card">
            <div className="verification-stat-icon">
              <Building2 size={22} />
            </div>
            <div className="verification-stat-label">Departments</div>
            <div className="verification-stat-value">{departments.length}</div>
            <p className="verification-stat-sub">Available academic destinations</p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="verification-stat-card">
            <div className="verification-stat-icon">
              <Layers size={22} />
            </div>
            <div className="verification-stat-label">Cohorts</div>
            <div className="verification-stat-value">{cohorts.length}</div>
            <p className="verification-stat-sub">Academic groups available for mapping</p>
          </div>
        </div>
      </div>

      <div className="verification-card">
        <div className="verification-workspace-header">
          <div>
            <div className="verification-card-title">
              <Users size={18} />
              Verification Workspace
            </div>

            <p className="verification-card-subtitle">
              Approve individual claims or process CSV batches for onboarding.
            </p>
          </div>

          <div className="verification-controls">
            <Nav className="verification-tabs">
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'queue'}
                  onClick={() => setActiveTab('queue')}
                >
                  Verification Queue
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'bulk'}
                  onClick={() => setActiveTab('bulk')}
                >
                  Bulk Verification
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {activeTab === 'queue' && (
              <div className="verification-filter-control">
                <label>Filter Trust Tier</label>

                <Form.Select
                  className="verification-select"
                  value={trustFilter}
                  onChange={event => setTrustFilter(event.target.value)}
                >
                  <option value="ALL">All Tiers</option>
                  <option value="0">Tier 0 Unverified</option>
                  <option value="1">Tier 1 Basic</option>
                </Form.Select>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'queue' && (
          <>
            {isLoadingQueue ? (
              <div className="p-4">
                <InstitutionTableSkeleton
                  hasSummaryCards={false}
                  hasInternalTableFilter={false}
                  tableColumns={5}
                />
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-4">
                <div className="verification-empty-state">
                  <ShieldCheck size={48} className="text-muted mb-3" />
                  <h5 className="fw-semibold mb-2">No pending requests</h5>
                  <p className="text-muted mb-0">
                    No student verification requests match the current criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="verification-table-wrap">
                <table className="table verification-table align-middle">
                  <thead>
                    <tr>
                      <th className="student-col">Student</th>
                      <th className="trust-col">Trust Tier</th>
                      <th className="claimed-col">Claimed Info</th>
                      <th className="method-col">Method</th>
                      <th className="actions-col text-end">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredQueue.map(item => (
                      <tr key={item.id}>
                        <td className="student-col">
                          <div className="verification-primary-text">
                            {item.student_email}
                          </div>
                          <div className="verification-muted">
                            {item.student_id}
                          </div>
                        </td>

                        <td className="trust-col">
                          <TrustBadge
                            level={(item.student_trust_level as TrustLevel) || 0}
                            entityType="student"
                            size="sm"
                            showLabel={false}
                          />
                        </td>

                        <td className="claimed-col">
                          {item.raw_department_input || item.raw_cohort_input ? (
                            <div>
                              {item.raw_department_input && (
                                <div className="verification-pill mb-2">
                                  Dept: {item.raw_department_input}
                                </div>
                              )}

                              {item.raw_cohort_input && (
                                <div className="verification-pill">
                                  Cohort: {item.raw_cohort_input}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="verification-pill">No claim</span>
                          )}
                        </td>

                        <td className="method-col">
                          <span className="verification-pill">
                            {item.claimed_via}
                          </span>
                        </td>

                        <td className="actions-col text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <Button
                              className="verification-danger-btn"
                              onClick={() => handleReject(item.id)}
                            >
                              <XCircle size={15} />
                              Reject
                            </Button>

                            <Button
                              className="verification-primary-btn"
                              onClick={() => handleOpenVerifyModal(item)}
                            >
                              <CheckCircle size={15} />
                              Verify
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'bulk' && (
          <div className="p-4">
            <div className="verification-upload-zone mb-4">
              <Upload size={48} className="text-muted mb-3" />

              <h5 className="fw-semibold mb-2">Upload student CSV</h5>

              <p className="text-muted mb-4">
                Upload a CSV containing student emails. Required column:
                <code className="ms-1">email</code>.
              </p>

              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
                <Form.Control
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="verification-input"
                  style={{ maxWidth: 420 }}
                />

                <Button
                  className="verification-primary-btn"
                  disabled={!bulkFile || isLoadingBulk}
                  onClick={handleBulkPreview}
                >
                  {isLoadingBulk ? 'Processing...' : 'Preview Results'}
                </Button>
              </div>
            </div>

            {bulkPreview.length > 0 && (
              <>
                <div className="bulk-settings-box mb-4">
                  <div className="d-flex justify-content-between gap-3 flex-wrap mb-4">
                    <div>
                      <h6 className="fw-bold mb-1">Bulk Assignment Settings</h6>
                      <p className="text-muted small mb-0">
                        Apply an optional department and cohort to all ready students.
                      </p>
                    </div>

                    <span className="verification-pill verification-status-ready">
                      {readyBulkCount} ready
                    </span>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <Form.Label className="small fw-semibold text-muted">
                        Assign Department Optional
                      </Form.Label>

                      <Form.Select
                        className="verification-select"
                        value={bulkDepartmentId}
                        onChange={event => {
                          setBulkDepartmentId(event.target.value);
                          setBulkCohortId('');
                        }}
                      >
                        <option value="">No Department Assignment</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </Form.Select>
                    </div>

                    <div className="col-md-6">
                      <Form.Label className="small fw-semibold text-muted">
                        Assign Cohort Optional
                      </Form.Label>

                      <Form.Select
                        className="verification-select"
                        value={bulkCohortId}
                        onChange={event => setBulkCohortId(event.target.value)}
                        disabled={!bulkDepartmentId}
                      >
                        <option value="">No Cohort Assignment</option>

                        {getCohortsForDept(bulkDepartmentId).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 pt-3 border-top">
                    <div className="text-muted small">
                      <strong className="text-dark">{readyBulkCount}</strong> students ready.
                      {conflictBulkCount > 0 && (
                        <>
                          {' '}
                          <strong className="text-danger">{conflictBulkCount}</strong> conflicts detected.
                        </>
                      )}
                    </div>

                    <Button
                      className="verification-primary-btn"
                      disabled={isConfirmingBulk || !bulkPreview.some(r => r.status.startsWith('ready'))}
                      onClick={handleBulkConfirm}
                    >
                      {isConfirmingBulk ? 'Verifying...' : 'Confirm Bulk Verification'}
                    </Button>
                  </div>
                </div>

                <div className="verification-table-wrap">
                  <table className="table verification-table align-middle">
                    <thead>
                      <tr>
                        <th className="student-col">Email</th>
                        <th className="method-col">Reg Number</th>
                        <th className="status-col">Status</th>
                        <th>Message</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bulkPreview.map((item, idx) => (
                        <tr key={idx}>
                          <td className="student-col">
                            <div className="verification-primary-text">
                              {item.email}
                            </div>
                          </td>

                          <td className="method-col">
                            <span className="verification-pill">
                              {item.registration_number || '-'}
                            </span>
                          </td>

                          <td className="status-col">
                            <span className={`verification-pill ${getPreviewStatusClass(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>

                          <td>
                            <div className="verification-muted">
                              {item.message}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        show={verifyModal.show}
        onHide={() => setVerifyModal(prev => ({ ...prev, show: false }))}
        centered
        dialogClassName="verification-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Verify Student</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {verifyModal.student && (
            <>
              <div className="verify-student-card mb-4">
                <div className="d-flex justify-content-between gap-3 mb-2">
                  <span className="text-muted">Student</span>
                  <span className="fw-semibold text-dark text-end">
                    {verifyModal.student.student_email}
                  </span>
                </div>

                {verifyModal.student.raw_department_input && (
                  <div className="d-flex justify-content-between gap-3 mb-2">
                    <span className="text-muted">Claimed Dept</span>
                    <span className="fw-semibold text-dark text-end">
                      {verifyModal.student.raw_department_input}
                    </span>
                  </div>
                )}

                {verifyModal.student.raw_cohort_input && (
                  <div className="d-flex justify-content-between gap-3">
                    <span className="text-muted">Claimed Cohort</span>
                    <span className="fw-semibold text-dark text-end">
                      {verifyModal.student.raw_cohort_input}
                    </span>
                  </div>
                )}
              </div>

              {verifyModal.student.raw_department_input && verifyModal.departmentId && (
                <Alert variant="info" className="rounded-4 d-flex align-items-center gap-2 py-2">
                  <Info size={16} />
                  <small>
                    Smart match found for “
                    <strong>{verifyModal.student.raw_department_input}</strong>”.
                  </small>
                </Alert>
              )}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">
                    Assign Department
                  </Form.Label>

                  <Form.Select
                    value={verifyModal.departmentId}
                    onChange={event =>
                      setVerifyModal(prev => ({
                        ...prev,
                        departmentId: event.target.value,
                        cohortId: '',
                      }))
                    }
                  >
                    <option value="">Select Department</option>

                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Assign Cohort
                  </Form.Label>

                  <Form.Select
                    value={verifyModal.cohortId}
                    onChange={event =>
                      setVerifyModal(prev => ({
                        ...prev,
                        cohortId: event.target.value,
                      }))
                    }
                    disabled={!verifyModal.departmentId}
                  >
                    <option value="">Select Cohort</option>

                    {getCohortsForDept(verifyModal.departmentId).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            className="verification-soft-btn"
            onClick={() => setVerifyModal(prev => ({ ...prev, show: false }))}
          >
            Cancel
          </Button>

          <Button
            className="verification-primary-btn"
            onClick={handleConfirmVerify}
            disabled={isSubmittingVerify}
          >
            {isSubmittingVerify ? 'Verifying...' : 'Confirm Verification'}
          </Button>
        </Modal.Footer>
      </Modal>

      <FeedbackModal {...feedbackProps} />
    </InstitutionWorkspacePage>
  );
};

export default StudentVerification;
