import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, InputGroup, Row, Col, Modal, Spinner, Alert } from 'react-bootstrap';
import { Search, Plus, Mail, Trash2, AlertCircle, CheckCircle, Edit3, Zap } from 'lucide-react';
import { institutionService } from '../../../services/institution/institutionService';
import { internshipService } from '../../../services/internship/internshipService';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FeedbackModal } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import type {
  InstitutionStaffMember,
  InviteSupervisorData,
  Department,
  Cohort,
  SupervisorProfileUpdateRequest,
} from '../../../services/institution/institutionService';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';

const InstitutionStaff: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [staffMembers, setStaffMembers] = useState<InstitutionStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  
  const [formData, setFormData] = useState<InviteSupervisorData>({
    email: '',
    department_id: '',
    cohort_id: ''
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

  // Bulk Assign State
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
      console.error("Failed to fetch departments", err);
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
      console.error("Failed to fetch cohorts", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const activeDeptId = formData.department_id || bulkDeptId;
    if (activeDeptId) {
      fetchCohorts(activeDeptId);
    } else {
      setCohorts([]);
    }
  }, [formData.department_id, bulkDeptId]);

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
      setError(err.message || 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [searchTerm, roleFilter]);

  const fetchProfileRequests = async () => {
    try {
      setProfileRequestsLoading(true);
      setProfileRequestsError(null);
      const data = await institutionService.getStaffProfileRequests({ status: 'pending' });
      setProfileRequests(data);
    } catch (err: any) {
      setProfileRequestsError(err.message || 'Failed to fetch profile update requests');
    } finally {
      setProfileRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileRequests();
  }, []);

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

      const payload: { first_name?: string; last_name?: string; email?: string } = {};
      if (editFormData.first_name !== selectedStaff.first_name) {
        payload.first_name = editFormData.first_name;
      }
      if (editFormData.last_name !== selectedStaff.last_name) {
        payload.last_name = editFormData.last_name;
      }
      if (editFormData.email !== selectedStaff.email) {
        payload.email = editFormData.email;
      }

      await institutionService.updateStaffPersonalDetails(selectedStaff.id, payload);
      setEditSuccess('Staff details updated successfully');
      await fetchStaff();
      setTimeout(() => {
        setShowEditModal(false);
        setSelectedStaff(null);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update staff details');
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
      showError(
        'Action Failed',
        'Failed to process profile update request',
        err.message
      );
    } finally {
      setProfileRequestsProcessing(false);
    }
  };

  if (loading) {
    return <InstitutionTableSkeleton hasInternalTableFilter={true} tableColumns={6} />;
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInviteLoading(true);
      setInviteError(null);
      setInviteSuccess(null);
      
      await institutionService.inviteSupervisor(formData);
      
      showSuccess('Invitation Sent', 'The invitation has been sent successfully to the staff member.');
      setFormData({
        email: '',
        department_id: '',
        cohort_id: ''
      });
      fetchStaff();
      setTimeout(() => setShowInviteModal(false), 2000);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!inviteId) return;
    try {
        // Optimistic UI update or notification could go here
        await institutionService.resendInvite(inviteId);
        showSuccess('Invite Resent', 'The invitation has been resent successfully.');
    } catch (err: any) {
        showError('Resend Failed', "Failed to resend invite", err.message);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    showConfirm({
      title: 'Remove Staff Member',
      message: 'Are you sure you want to remove this staff member? This will revoke their access to the institution portal.',
      variant: 'error',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
            await institutionService.removeStaff(staffId);
            toast.success('Staff member removed successfully');
            fetchStaff();
        } catch (err: any) {
            showError('Removal Failed', "Failed to remove staff member", err.message);
        }
      }
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
      showError('Assignment Failed', 'Failed to assign supervisors', err.message);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  return (
    <div className="institution-staff">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Staff Management</h4>
          <p className="text-muted mb-0">Manage access and roles for your institution members.</p>
        </div>
        <Button 
            variant="primary" 
            className="d-flex align-items-center gap-2"
            onClick={() => setShowInviteModal(true)}
        >
          <Plus size={18} />
          Invite Supervisor
        </Button>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-0 pt-4">
            <div className="d-flex align-items-center gap-2">
              <Zap size={20} className="text-warning" />
              <h5 className="mb-0 fw-bold">Auto-Assign Supervisors</h5>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Automatically distribute unassigned students in a department/cohort to available supervisors <strong>within the same department</strong>.
            </p>
          </Card.Header>
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold">Department</Form.Label>
                <Form.Select 
                  value={bulkDeptId} 
                  onChange={(e) => setBulkDeptId(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold">Cohort (Optional)</Form.Label>
                <Form.Select 
                  value={bulkCohortId} 
                  onChange={(e) => setBulkCohortId(e.target.value)}
                  disabled={!bulkDeptId}
                >
                  <option value="">Select Cohort</option>
                  {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Button 
                variant="success" 
                className="w-100 py-2 d-flex align-items-center justify-content-center gap-2" 
                disabled={!bulkDeptId || isBulkAssigning}
                onClick={handleBulkAssign}
              >
                {isBulkAssigning ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Run Auto-Assignment</span>
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="p-3 border-bottom">
            <Row className="g-3 align-items-center">
              <div className="col-md-6">
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0">
                    <Search size={18} className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search staff by name or email..."
                    className="bg-light border-start-0 ps-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>
              <div className="col-md-6 text-md-end">
                <div className="d-flex gap-2 justify-content-md-end">
                  <Form.Select 
                    className="w-auto" 
                    style={{minWidth: '150px'}}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="institution_admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                  </Form.Select>
                </div>
              </div>
            </Row>
          </div>

          {error && <div className="p-3"><Alert variant="danger">{error}</Alert></div>}

          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 py-3">Name</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Department</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Last Active</th>
                  <th className="text-end pe-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                            No staff members found.
                        </td>
                    </tr>
                ) : (
                    staffMembers.map((staff) => (
                    <tr key={staff.id}>
                        <td className="ps-4">
                        <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                            <span className="fw-bold">{staff.first_name.charAt(0)}{staff.last_name.charAt(0)}</span>
                            </div>
                            <div>
                            <div className="fw-bold">{staff.first_name} {staff.last_name}</div>
                            <div className="text-muted small">{staff.email}</div>
                            </div>
                        </div>
                        </td>
                        <td>
                        <Badge bg="light" text="dark" className="border">
                            {staff.role_display}
                        </Badge>
                        </td>
                        <td>
                            {staff.department || '-'}
                            {staff.cohort && <div className="text-muted small">Cohort: {staff.cohort}</div>}
                        </td>
                        <td>
                        <Badge 
                            bg={staff.status === 'Active' ? 'success' : staff.status === 'Pending' ? 'warning' : 'secondary'} 
                            className="bg-opacity-10 text-reset"
                        >
                            <span className={`text-${staff.status === 'Active' ? 'success' : staff.status === 'Pending' ? 'warning' : 'secondary'}`}>
                                ● {staff.status}
                            </span>
                        </Badge>
                        </td>
                        <td className="text-muted small">{staff.last_active || '-'}</td>
                        <td className="text-end pe-4">
                        <Button 
                            variant="link" 
                            className="text-primary p-1 me-2" 
                            title="Edit Personal Details"
                            onClick={() => openEditModal(staff)}
                        >
                            <Edit3 size={18} />
                        </Button>
                        {staff.status === 'Pending' && staff.invite_id && (
                            <Button 
                                variant="link" 
                                className="text-muted p-1 me-2" 
                                title="Resend Invite"
                                onClick={() => handleResendInvite(staff.invite_id!)}
                            >
                                <Mail size={18} />
                            </Button>
                        )}
                        <Button 
                            variant="link" 
                            className="text-danger p-1" 
                            title="Remove"
                            onClick={() => handleRemoveStaff(staff.id)}
                        >
                            <Trash2 size={18} />
                        </Button>
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </Table>
          </div>
          
          <div className="p-3 border-top text-center text-muted small">
            Showing {staffMembers.length} staff members
          </div>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mt-4">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0 fw-bold">Supervisor Profile Update Requests</h5>
            <small className="text-muted">
              Review and apply requested changes to supervisor personal details.
            </small>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {profileRequestsError && (
            <div className="p-3">
              <Alert variant="danger">{profileRequestsError}</Alert>
            </div>
          )}
          {profileRequestsLoading ? (
            <div className="p-4 text-center">
              <Spinner animation="border" size="sm" className="me-2" />
              <span className="text-muted">Loading profile update requests...</span>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="ps-4 py-3">Supervisor</th>
                    <th className="py-3">Requested Changes</th>
                    <th className="py-3">Submitted At</th>
                    <th className="text-end pe-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profileRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        No pending profile update requests.
                      </td>
                    </tr>
                  ) : (
                    profileRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="ps-4">
                          <div className="fw-bold">{req.staff_name}</div>
                          <div className="text-muted small">{req.staff_email}</div>
                        </td>
                        <td>
                          <div className="small">
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
                        </td>
                        <td className="text-muted small">
                          {new Date(req.created_at).toLocaleString()}
                        </td>
                        <td className="text-end pe-4">
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            disabled={profileRequestsProcessing}
                            onClick={() => handleReviewProfileRequest(req, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={profileRequestsProcessing}
                            onClick={() => handleReviewProfileRequest(req, 'reject')}
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Invite Modal */}
      <Modal show={showInviteModal} onHide={() => setShowInviteModal(false)} centered>
        <Modal.Header closeButton>
            <Modal.Title>Invite Supervisor</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleInviteSubmit}>
            <Modal.Body>
                {inviteError && <Alert variant="danger" className="d-flex align-items-center gap-2"><AlertCircle size={16}/> {inviteError}</Alert>}
                {inviteSuccess && <Alert variant="success" className="d-flex align-items-center gap-2"><CheckCircle size={16}/> {inviteSuccess}</Alert>}
                
                <Row className="g-3">
                    <div className="col-12">
                        <Form.Group>
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="supervisor@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </Form.Group>
                    </div>
                    <div className="col-md-6">
                        <Form.Group>
                            <Form.Label>Department</Form.Label>
                            <Form.Select
                                value={formData.department_id}
                                onChange={(e) => setFormData({...formData, department_id: e.target.value, cohort_id: ''})}
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </div>
                    <div className="col-md-6">
                        <Form.Group>
                            <Form.Label>Cohort</Form.Label>
                            <Form.Select
                                value={formData.cohort_id}
                                onChange={(e) => setFormData({...formData, cohort_id: e.target.value})}
                                required
                                disabled={!formData.department_id}
                            >
                                <option value="">Select Cohort</option>
                                {cohorts.map(cohort => (
                                    <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </div>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                    Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={inviteLoading}>
                    {inviteLoading ? <Spinner animation="border" size="sm" /> : 'Send Invitation'}
                </Button>
            </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
            <Modal.Title>Edit Staff Details</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
            <Modal.Body>
                {editError && <Alert variant="danger" className="d-flex align-items-center gap-2"><AlertCircle size={16}/> {editError}</Alert>}
                {editSuccess && <Alert variant="success" className="d-flex align-items-center gap-2"><CheckCircle size={16}/> {editSuccess}</Alert>}
                
                <Row className="g-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>First Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={editFormData.first_name}
                                onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={editFormData.last_name}
                                onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={12}>
                        <Form.Group>
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                required
                            />
                        </Form.Group>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={editLoading}>
                    {editLoading ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
                </Button>
            </Modal.Footer>
        </Form>
      </Modal>

      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default InstitutionStaff;
