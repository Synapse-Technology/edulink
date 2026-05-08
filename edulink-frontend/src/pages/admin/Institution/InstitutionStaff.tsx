import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  Row,
  Col,
  Modal,
  Spinner,
  Alert,
} from 'react-bootstrap';
import {
  Search,
  Plus,
  Mail,
  Trash2,
  AlertCircle,
  CheckCircle,
  Edit3,
  Zap,
  Users,
  ShieldCheck,
  ClipboardCheck,
  Building2,
  Filter,
  Clock,
} from 'lucide-react';

import { institutionService } from '../../../services/institution/institutionService';
import { internshipService } from '../../../services/internship/internshipService';
import { useAuth } from '../../../contexts/AuthContext';
import { showToast } from '../../../utils/toast';
import { FeedbackModal } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

import type {
  InstitutionStaffMember,
  InviteSupervisorData,
  Department,
  Cohort,
  SupervisorProfileUpdateRequest,
} from '../../../services/institution/institutionService';

import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const InstitutionStaff: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [staffMembers, setStaffMembers] = useState<InstitutionStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const [formData, setFormData] = useState<InviteSupervisorData>({
    email: '',
    department_id: '',
    cohort_id: '',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<InstitutionStaffMember | null>(null);

  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  const [profileRequests, setProfileRequests] = useState<SupervisorProfileUpdateRequest[]>([]);
  const [profileRequestsLoading, setProfileRequestsLoading] = useState(false);
  const [profileRequestsError, setProfileRequestsError] = useState<string | null>(null);
  const [profileRequestsProcessing, setProfileRequestsProcessing] = useState(false);

  const { user } = useAuth();

  const [bulkDeptId, setBulkDeptId] = useState('');
  const [bulkCohortId, setBulkCohortId] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  const fetchDepartments = async () => {
    try {
      const data = await institutionService.getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  const fetchCohorts = async (deptId: string) => {
    if (!deptId) {
      setCohorts([]);
      return;
    }

    try {
      const data = await institutionService.getCohorts(deptId);
      setCohorts(data);
    } catch (err) {
      console.error('Failed to fetch cohorts', err);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};

      if (searchTerm) params.search = searchTerm;
      if (roleFilter !== 'all') params.role = roleFilter;

      const data = await institutionService.getStaffList(params);
      setStaffMembers(data);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.userMessage || 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileRequests = async () => {
    try {
      setProfileRequestsLoading(true);
      setProfileRequestsError(null);

      const data = await institutionService.getStaffProfileRequests({
        status: 'pending',
      });

      setProfileRequests(data);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setProfileRequestsError(
        sanitized.userMessage || 'Failed to fetch profile update requests'
      );
    } finally {
      setProfileRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchProfileRequests();
  }, []);

  useEffect(() => {
    const activeDeptId = formData.department_id || bulkDeptId;

    if (activeDeptId) {
      fetchCohorts(activeDeptId);
    } else {
      setCohorts([]);
    }
  }, [formData.department_id, bulkDeptId]);

  useEffect(() => {
    fetchStaff();
  }, [searchTerm, roleFilter]);

  const openEditModal = (staff: InstitutionStaffMember) => {
    setSelectedStaff(staff);

    setEditFormData({
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
    });

    setEditError(null);
    setEditSuccess(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStaff) return;

    try {
      setEditLoading(true);
      setEditError(null);
      setEditSuccess(null);

      const payload: {
        first_name?: string;
        last_name?: string;
        email?: string;
      } = {};

      if (editFormData.first_name !== selectedStaff.first_name) {
        payload.first_name = editFormData.first_name;
      }

      if (editFormData.last_name !== selectedStaff.last_name) {
        payload.last_name = editFormData.last_name;
      }

      if (editFormData.email !== selectedStaff.email) {
        payload.email = editFormData.email;
      }

      await institutionService.updateStaffPersonalDetails(
        selectedStaff.id,
        payload
      );

      setEditSuccess('Staff details updated successfully');
      await fetchStaff();

      setTimeout(() => {
        setShowEditModal(false);
        setSelectedStaff(null);
      }, 1200);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setEditError(sanitized.userMessage || 'Failed to update staff details');
    } finally {
      setEditLoading(false);
    }
  };

  const handleReviewProfileRequest = async (
    request: SupervisorProfileUpdateRequest,
    action: 'approve' | 'reject'
  ) => {
    let adminFeedback = '';

    if (action === 'reject') {
      adminFeedback = window.prompt('Enter reason for rejection (optional):') || '';
    }

    try {
      setProfileRequestsProcessing(true);

      await institutionService.reviewStaffProfileRequest(request.id, {
        action,
        admin_feedback: adminFeedback,
      });

      await fetchProfileRequests();
      await fetchStaff();

      showSuccess(
        action === 'approve' ? 'Request Approved' : 'Request Rejected',
        `The profile update request has been ${action}d successfully.`
      );
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      showError(
        'Action Failed',
        'Failed to process profile update request',
        sanitized.details
      );
    } finally {
      setProfileRequestsProcessing(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setInviteLoading(true);
      setInviteError(null);
      setInviteSuccess(null);

      await institutionService.inviteSupervisor(formData);

      showSuccess(
        'Invitation Sent',
        'The invitation has been sent successfully to the staff member.'
      );

      setInviteSuccess('Invitation sent successfully.');

      setFormData({
        email: '',
        department_id: '',
        cohort_id: '',
      });

      fetchStaff();

      setTimeout(() => setShowInviteModal(false), 1400);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setInviteError(sanitized.userMessage || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!inviteId) return;

    try {
      await institutionService.resendInvite(inviteId);

      showSuccess('Invite Resent', 'The invitation has been resent successfully.');
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      showError('Resend Failed', 'Failed to resend invite', sanitized.details);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    showConfirm({
      title: 'Remove Staff Member',
      message:
        'Are you sure you want to remove this staff member? This will revoke their access to the institution portal.',
      variant: 'error',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await institutionService.removeStaff(staffId);

          showToast.success('Staff member removed successfully');

          fetchStaff();
        } catch (err: any) {
          const sanitized = sanitizeAdminError(err);

          showError('Removal Failed', 'Failed to remove staff member', sanitized.details);
        }
      },
    });
  };

  const handleBulkAssign = async () => {
    if (!bulkDeptId || !user?.institution_id) return;

    try {
      setIsBulkAssigning(true);

      const result = await internshipService.bulkAssignSupervisors(
        user.institution_id,
        bulkDeptId,
        bulkCohortId || undefined
      );

      showSuccess('Auto-Assignment Complete', result.message);

      setBulkDeptId('');
      setBulkCohortId('');
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      showError('Assignment Failed', 'Failed to assign supervisors', sanitized.details);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const totalSupervisors = staffMembers.filter(
    staff => staff.role === 'supervisor' || staff.role_display?.toLowerCase().includes('supervisor')
  ).length;

  const pendingStaff = staffMembers.filter(staff => staff.status === 'Pending').length;

  if (loading) {
    return (
      <InstitutionTableSkeleton
        hasInternalTableFilter={true}
        tableColumns={6}
      />
    );
  }

  return (
    <InstitutionWorkspacePage className="institution-staff-page">
      <style>{`
        .staff-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .staff-eyebrow {
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

        .staff-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .staff-subtitle {
          color: #64748b;
          max-width: 760px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .staff-primary-btn {
          min-height: 44px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: none !important;
          color: #ffffff !important;
          font-weight: 650 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .staff-soft-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 650 !important;
          padding-inline: 16px !important;
          box-shadow: none !important;
        }

        .staff-danger-btn {
          min-height: 38px;
          border-radius: 12px !important;
          background: #ffffff !important;
          border: 1px solid #fee2e2 !important;
          color: #dc2626 !important;
          font-weight: 650 !important;
          box-shadow: none !important;
        }

        .staff-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 22px;
          padding: 20px;
          height: 100%;
        }

        .staff-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 15px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .staff-stat-label {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 8px;
        }

        .staff-stat-value {
          font-size: 1.75rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          line-height: 1;
          margin-bottom: 6px;
        }

        .staff-stat-sub {
          color: #64748b;
          font-size: 0.86rem;
          margin-bottom: 0;
        }

        .staff-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .staff-card-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
          background: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .staff-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 730;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .staff-card-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .staff-input,
        .staff-select {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .staff-input:focus,
        .staff-select:focus {
          border-color: #111827 !important;
        }

        .staff-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 560px;
        }

        .staff-table {
          width: 100%;
          min-width: 980px;
          margin-bottom: 0;
          table-layout: fixed;
        }

        .staff-table thead th {
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

        .staff-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .staff-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .name-col {
          width: 310px;
        }

        .role-col {
          width: 150px;
        }

        .department-col {
          width: 230px;
        }

        .status-col {
          width: 140px;
        }

        .active-col {
          width: 160px;
        }

        .actions-col {
          width: 160px;
        }

        .staff-avatar {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          background: #111827;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 750;
          flex-shrink: 0;
        }

        .staff-name {
          font-weight: 720;
          color: #111827;
          line-height: 1.25;
        }

        .staff-email {
          color: #64748b;
          font-size: 0.78rem;
          margin-top: 3px;
          word-break: break-word;
        }

        .staff-pill {
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

        .staff-status-active {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .staff-status-pending {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .staff-status-muted {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #64748b;
        }

        .staff-action-group {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          white-space: nowrap;
        }

        .staff-icon-btn {
          height: 36px;
          min-width: 36px;
          border-radius: 12px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #475569 !important;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          box-shadow: none !important;
        }

        .staff-icon-btn.danger {
          border-color: #fee2e2 !important;
          color: #dc2626 !important;
        }

        .profile-request-row {
          display: grid;
          grid-template-columns: 1.4fr 1.7fr 1fr auto;
          gap: 18px;
          align-items: center;
          padding: 18px 24px;
          border-top: 1px solid #f1f5f9;
        }

        .profile-change-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 0.86rem;
          color: #475569;
        }

        .staff-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 22px;
          padding: 48px 24px;
          text-align: center;
        }

        .staff-modal .modal-content {
          border: none;
          border-radius: 24px;
          overflow: hidden;
        }

        .staff-modal .modal-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .staff-modal .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #eef2f6;
        }

        .staff-modal .form-select,
        .staff-modal .form-control {
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .staff-modal .form-select:focus,
        .staff-modal .form-control:focus {
          border-color: #111827;
        }

        @media (max-width: 992px) {
          .profile-request-row {
            grid-template-columns: 1fr;
            align-items: flex-start;
          }
        }

        @media (max-width: 768px) {
          .staff-hero {
            padding: 22px;
          }

          .staff-card-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="staff-hero">
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
          <div>
            <div className="staff-eyebrow">
              <Users size={15} />
              Staff Management
            </div>

            <h1 className="staff-title">
              Manage institution access, supervisors, and staff updates.
            </h1>

            <p className="staff-subtitle">
              Invite supervisors, control staff access, automate supervision coverage,
              and review profile update requests from one institutional workspace.
            </p>
          </div>

          <Button
            className="staff-primary-btn d-flex align-items-center gap-2 align-self-xl-start"
            onClick={() => setShowInviteModal(true)}
          >
            <Plus size={17} />
            Invite Supervisor
          </Button>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col xl={3} md={6}>
          <div className="staff-stat-card">
            <div className="staff-stat-icon">
              <Users size={21} />
            </div>
            <div className="staff-stat-label">Total Staff</div>
            <div className="staff-stat-value">{staffMembers.length}</div>
            <p className="staff-stat-sub">Portal users and invited staff</p>
          </div>
        </Col>

        <Col xl={3} md={6}>
          <div className="staff-stat-card">
            <div className="staff-stat-icon">
              <ShieldCheck size={21} />
            </div>
            <div className="staff-stat-label">Supervisors</div>
            <div className="staff-stat-value">{totalSupervisors}</div>
            <p className="staff-stat-sub">Available for student supervision</p>
          </div>
        </Col>

        <Col xl={3} md={6}>
          <div className="staff-stat-card">
            <div className="staff-stat-icon">
              <Clock size={21} />
            </div>
            <div className="staff-stat-label">Pending Invites</div>
            <div className="staff-stat-value">{pendingStaff}</div>
            <p className="staff-stat-sub">Awaiting account activation</p>
          </div>
        </Col>

        <Col xl={3} md={6}>
          <div className="staff-stat-card">
            <div className="staff-stat-icon">
              <ClipboardCheck size={21} />
            </div>
            <div className="staff-stat-label">Profile Requests</div>
            <div className="staff-stat-value">{profileRequests.length}</div>
            <p className="staff-stat-sub">Pending admin review</p>
          </div>
        </Col>
      </Row>

      <div className="staff-card">
        <div className="staff-card-header">
          <div>
            <div className="staff-card-title">
              <Zap size={18} />
              Auto-Assign Supervisors
            </div>
            <p className="staff-card-subtitle">
              Distribute unassigned students to available supervisors within the same department.
            </p>
          </div>
        </div>

        <div className="p-4">
          <Row className="g-3 align-items-end">
            <Col lg={4}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Department
                </Form.Label>
                <Form.Select
                  className="staff-select"
                  value={bulkDeptId}
                  onChange={e => {
                    setBulkDeptId(e.target.value);
                    setBulkCohortId('');
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col lg={4}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Cohort Optional
                </Form.Label>
                <Form.Select
                  className="staff-select"
                  value={bulkCohortId}
                  onChange={e => setBulkCohortId(e.target.value)}
                  disabled={!bulkDeptId}
                >
                  <option value="">All Cohorts</option>
                  {cohorts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col lg={4}>
              <Button
                className="staff-primary-btn w-100 d-flex align-items-center justify-content-center gap-2"
                disabled={!bulkDeptId || isBulkAssigning}
                onClick={handleBulkAssign}
              >
                {isBulkAssigning ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle size={17} />
                    Run Auto-Assignment
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      <div className="staff-card">
        <div className="staff-card-header">
          <div>
            <div className="staff-card-title">
              <Building2 size={18} />
              Staff Directory
            </div>
            <p className="staff-card-subtitle">
              Search, filter, edit details, resend invites, or revoke portal access.
            </p>
          </div>
        </div>

        <div className="p-4 border-bottom">
          <Row className="g-3 align-items-end">
            <Col lg={7}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Search Staff
                </Form.Label>

                <div className="position-relative">
                  <Search
                    size={16}
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  />

                  <Form.Control
                    placeholder="Search staff by name or email"
                    className="staff-input ps-5"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>

            <Col lg={5}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Role Filter
                </Form.Label>

                <div className="position-relative">
                  <Filter
                    size={16}
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  />

                  <Form.Select
                    className="staff-select ps-5"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="institution_admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                  </Form.Select>
                </div>
              </Form.Group>
            </Col>
          </Row>
        </div>

        {error && (
          <div className="p-4">
            <Alert variant="danger" className="rounded-4 mb-0">
              {error}
            </Alert>
          </div>
        )}

        <div className="staff-table-wrap">
          <table className="table staff-table align-middle">
            <thead>
              <tr>
                <th className="name-col">Name</th>
                <th className="role-col">Role</th>
                <th className="department-col">Department</th>
                <th className="status-col">Status</th>
                <th className="active-col">Last Active</th>
                <th className="actions-col text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="staff-empty-state">
                      <Users size={42} className="text-muted mb-3" />
                      <h6 className="fw-semibold mb-2">No staff members found</h6>
                      <p className="text-muted mb-0">
                        Try changing your search or invite a supervisor.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                staffMembers.map(staff => {
                  const initials = `${staff.first_name?.charAt(0) || ''}${staff.last_name?.charAt(0) || ''}`;
                  const statusClass =
                    staff.status === 'Active'
                      ? 'staff-status-active'
                      : staff.status === 'Pending'
                        ? 'staff-status-pending'
                        : 'staff-status-muted';

                  return (
                    <tr key={staff.id}>
                      <td className="name-col">
                        <div className="d-flex align-items-center gap-3">
                          <div className="staff-avatar">
                            {initials || 'S'}
                          </div>

                          <div>
                            <div className="staff-name">
                              {staff.first_name} {staff.last_name}
                            </div>
                            <div className="staff-email">
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="role-col">
                        <span className="staff-pill">
                          {staff.role_display}
                        </span>
                      </td>

                      <td className="department-col">
                        <div className="fw-semibold text-dark">
                          {staff.department || '-'}
                        </div>
                        {staff.cohort && (
                          <div className="text-muted small">
                            Cohort: {staff.cohort}
                          </div>
                        )}
                      </td>

                      <td className="status-col">
                        <span className={`staff-pill ${statusClass}`}>
                          ● {staff.status}
                        </span>
                      </td>

                      <td className="active-col">
                        <span className="staff-pill">
                          {staff.last_active || '-'}
                        </span>
                      </td>

                      <td className="actions-col text-end">
                        <div className="staff-action-group">
                          <Button
                            className="staff-icon-btn"
                            title="Edit Personal Details"
                            onClick={() => openEditModal(staff)}
                          >
                            <Edit3 size={16} />
                          </Button>

                          {staff.status === 'Pending' && staff.invite_id && (
                            <Button
                              className="staff-icon-btn"
                              title="Resend Invite"
                              onClick={() => handleResendInvite(staff.invite_id!)}
                            >
                              <Mail size={16} />
                            </Button>
                          )}

                          <Button
                            className="staff-icon-btn danger"
                            title="Remove Staff"
                            onClick={() => handleRemoveStaff(staff.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-top text-center text-muted small">
          Showing {staffMembers.length} staff members
        </div>
      </div>

      <div className="staff-card">
        <div className="staff-card-header">
          <div>
            <div className="staff-card-title">
              <ClipboardCheck size={18} />
              Supervisor Profile Update Requests
            </div>
            <p className="staff-card-subtitle">
              Review and apply requested changes to supervisor personal details.
            </p>
          </div>

          <span className="staff-pill">
            {profileRequests.length} Pending
          </span>
        </div>

        {profileRequestsError && (
          <div className="p-4">
            <Alert variant="danger" className="rounded-4 mb-0">
              {profileRequestsError}
            </Alert>
          </div>
        )}

        {profileRequestsLoading ? (
          <div className="p-5 text-center">
            <Spinner animation="border" size="sm" className="me-2" />
            <span className="text-muted">Loading profile update requests...</span>
          </div>
        ) : profileRequests.length === 0 ? (
          <div className="p-4">
            <div className="staff-empty-state">
              <ClipboardCheck size={42} className="text-muted mb-3" />
              <h6 className="fw-semibold mb-2">No pending requests</h6>
              <p className="text-muted mb-0">
                Supervisor profile update requests will appear here.
              </p>
            </div>
          </div>
        ) : (
          profileRequests.map(req => (
            <div key={req.id} className="profile-request-row">
              <div>
                <div className="staff-name">{req.staff_name}</div>
                <div className="staff-email">{req.staff_email}</div>
              </div>

              <div className="profile-change-list">
                {req.requested_changes.first_name && (
                  <div>
                    First name → <strong>{req.requested_changes.first_name}</strong>
                  </div>
                )}

                {req.requested_changes.last_name && (
                  <div>
                    Last name → <strong>{req.requested_changes.last_name}</strong>
                  </div>
                )}

                {req.requested_changes.email && (
                  <div>
                    Email → <strong>{req.requested_changes.email}</strong>
                  </div>
                )}
              </div>

              <span className="staff-pill">
                {new Date(req.created_at).toLocaleString()}
              </span>

              <div className="d-flex gap-2 justify-content-end">
                <Button
                  className="staff-soft-btn"
                  disabled={profileRequestsProcessing}
                  onClick={() => handleReviewProfileRequest(req, 'approve')}
                >
                  Approve
                </Button>

                <Button
                  className="staff-danger-btn"
                  disabled={profileRequestsProcessing}
                  onClick={() => handleReviewProfileRequest(req, 'reject')}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        show={showInviteModal}
        onHide={() => setShowInviteModal(false)}
        centered
        dialogClassName="staff-modal"
      >
        <Form onSubmit={handleInviteSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Invite Supervisor</Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {inviteError && (
              <Alert variant="danger" className="rounded-4 d-flex align-items-center gap-2">
                <AlertCircle size={16} />
                {inviteError}
              </Alert>
            )}

            {inviteSuccess && (
              <Alert variant="success" className="rounded-4 d-flex align-items-center gap-2">
                <CheckCircle size={16} />
                {inviteSuccess}
              </Alert>
            )}

            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="supervisor@example.com"
                    value={formData.email}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Department
                  </Form.Label>
                  <Form.Select
                    value={formData.department_id}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        department_id: e.target.value,
                        cohort_id: '',
                      })
                    }
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Cohort
                  </Form.Label>
                  <Form.Select
                    value={formData.cohort_id}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        cohort_id: e.target.value,
                      })
                    }
                    required
                    disabled={!formData.department_id}
                  >
                    <option value="">Select Cohort</option>
                    {cohorts.map(cohort => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              className="staff-soft-btn"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>

            <Button
              className="staff-primary-btn"
              type="submit"
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                'Send Invitation'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
        dialogClassName="staff-modal"
      >
        <Form onSubmit={handleEditSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Staff Details</Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {editError && (
              <Alert variant="danger" className="rounded-4 d-flex align-items-center gap-2">
                <AlertCircle size={16} />
                {editError}
              </Alert>
            )}

            {editSuccess && (
              <Alert variant="success" className="rounded-4 d-flex align-items-center gap-2">
                <CheckCircle size={16} />
                {editSuccess}
              </Alert>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    First Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.first_name}
                    onChange={e =>
                      setEditFormData({
                        ...editFormData,
                        first_name: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Last Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.last_name}
                    onChange={e =>
                      setEditFormData({
                        ...editFormData,
                        last_name: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={editFormData.email}
                    onChange={e =>
                      setEditFormData({
                        ...editFormData,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              className="staff-soft-btn"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>

            <Button
              className="staff-primary-btn"
              type="submit"
              disabled={editLoading}
            >
              {editLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <FeedbackModal {...feedbackProps} />
    </InstitutionWorkspacePage>
  );
};

export default InstitutionStaff;
