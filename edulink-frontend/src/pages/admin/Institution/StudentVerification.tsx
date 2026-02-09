import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Form, Tab, Tabs, Modal, Alert } from 'react-bootstrap';
import { institutionService, type Department, type Cohort, type PendingVerification, type BulkPreviewResult } from '../../../services/institution/institutionService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import FeedbackModal from '../../../components/common/FeedbackModal';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { Info } from 'lucide-react';
import toast from 'react-hot-toast';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';

const StudentVerification: React.FC = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [trustFilter, setTrustFilter] = useState<string>('ALL');
  
  // Data State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  // const [isLoadingData, setIsLoadingData] = useState(true);

  // Queue State
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Verification Modal State
  const [verifyModal, setVerifyModal] = useState<{
    show: boolean;
    student: PendingVerification | null;
    departmentId: string;
    cohortId: string;
  }>({ show: false, student: null, departmentId: '', cohortId: '' });
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // Bulk State
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
      // setIsLoadingData(true);
      const [depts, coh] = await Promise.all([
        institutionService.getDepartments(),
        institutionService.getCohorts()
      ]);
      setDepartments(depts);
      setCohorts(coh);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load departments and cohorts');
    } finally {
      // setIsLoadingData(false);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      setIsLoadingQueue(true);
      const data = await institutionService.getPendingVerifications();
      setPendingVerifications(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load pending verifications');
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Smart Assist Logic
  const findSuggestedDepartment = (rawInput?: string): string => {
    if (!rawInput) return '';
    const normalizedInput = rawInput.toLowerCase().trim();
    
    // 1. Direct match with name
    const exactMatch = departments.find(d => d.name.toLowerCase() === normalizedInput && d.is_active !== false);
    if (exactMatch) return exactMatch.id;

    // 2. Match with aliases
    for (const dept of departments) {
      if (dept.is_active === false) continue;
      if (dept.aliases && dept.aliases.some(alias => alias.toLowerCase() === normalizedInput)) {
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
      cohortId: '' // Cohort usually needs manual selection or smarter matching if we had cohort aliases
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
      setVerifyModal({ show: false, student: null, departmentId: '', cohortId: '' });
      fetchPendingVerifications();
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to verify student';
      toast.error(message);
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return; // Cancelled

    try {
      await institutionService.rejectVerification(id, reason || 'No reason provided');
      toast.success('Verification request rejected');
      fetchPendingVerifications();
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject request');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBulkFile(e.target.files[0]);
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
    } catch (error) {
      console.error(error);
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
        registration_number: r.registration_number
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
          console.error(error);
          const message = error.response?.data?.error || error.response?.data?.detail || error.message;
          showError(
            'Bulk Verification Failed',
            'An error occurred while processing the bulk verification file.',
            message
          );
        } finally {
          setIsConfirmingBulk(false);
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
      case 'ready_domain_match':
        return <Badge bg="success">Ready</Badge>;
      case 'already_verified':
        return <Badge bg="info">Verified</Badge>;
      case 'conflict':
        return <Badge bg="danger">Conflict</Badge>;
      case 'not_found':
        return <Badge bg="warning" text="dark">Not Found</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const filteredQueue = pendingVerifications.filter(item => {
    if (trustFilter === 'ALL') return true;
    const tier = item.student_trust_level || 0;
    return tier === parseInt(trustFilter);
  });

  // Filter cohorts based on selected department
  const getCohortsForDept = (deptId: string) => {
    return cohorts.filter(c => c.department_id === deptId);
  };

  return (
    <div className="institution-verification">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Student Verification</h4>
          <p className="text-muted small mb-0">Verify and assign students to your academic structure.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k || 'queue')}
            className="mb-4"
          >
            <Tab eventKey="queue" title="Verification Queue">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                   {/* Filter Placeholder */}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <label className="text-muted small">Filter Trust:</label>
                  <Form.Select 
                    size="sm" 
                    value={trustFilter} 
                    onChange={(e) => setTrustFilter(e.target.value)}
                    style={{ width: '200px' }}
                  >
                    <option value="ALL">All Tiers</option>
                    <option value="0">Tier 0 (Unverified)</option>
                    <option value="1">Tier 1 (Basic)</option>
                  </Form.Select>
                </div>
              </div>

              {isLoadingQueue ? (
                <InstitutionTableSkeleton hasSummaryCards={false} hasInternalTableFilter={false} tableColumns={5} />
              ) : filteredQueue.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p className="mb-0">No pending verification requests matching criteria.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th>Student</th>
                        <th>Trust Tier</th>
                        <th>Claimed Info</th>
                        <th>Method</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueue.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div>
                              <div className="fw-medium">{item.student_email}</div>
                              <div className="small text-muted">{item.student_id}</div>
                            </div>
                          </td>
                          <td>
                            <TrustBadge 
                              level={(item.student_trust_level as TrustLevel) || 0} 
                              entityType="student" 
                              size="sm"
                              showLabel={false}
                            />
                          </td>
                          <td>
                            {(item.raw_department_input || item.raw_cohort_input) ? (
                              <div className="small">
                                {item.raw_department_input && (
                                  <div className="text-primary">
                                    Dept: {item.raw_department_input}
                                  </div>
                                )}
                                {item.raw_cohort_input && (
                                  <div className="text-muted">
                                    Cohort: {item.raw_cohort_input}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td>
                            <Badge bg="light" text="dark" className="border">
                              {item.claimed_via}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              className="me-2"
                              onClick={() => handleReject(item.id)}
                            >
                              Reject
                            </Button>
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={() => handleOpenVerifyModal(item)}
                            >
                              Verify & Assign
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>
            
            <Tab eventKey="bulk" title="Bulk Verification">
              <div className="mb-4">
                <h5>Upload CSV</h5>
                <p className="text-muted small">
                  Upload a CSV file containing student emails. All valid students will be assigned to the selected Department and Cohort below.
                  <br />
                  Required columns: <code>email</code>.
                </p>
                
                <div className="d-flex gap-3 mb-4">
                  <Form.Control 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    style={{ maxWidth: '400px' }}
                  />
                  <Button 
                    variant="primary" 
                    disabled={!bulkFile || isLoadingBulk}
                    onClick={handleBulkPreview}
                  >
                    {isLoadingBulk ? 'Processing...' : 'Preview Results'}
                  </Button>
                </div>

                {bulkPreview.length > 0 && (
                  <div className="border rounded p-3 bg-light">
                    <h6 className="fw-bold mb-3">Bulk Assignment Settings</h6>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <Form.Label>Assign Department (Optional)</Form.Label>
                        <Form.Select 
                          value={bulkDepartmentId}
                          onChange={(e) => {
                            setBulkDepartmentId(e.target.value);
                            setBulkCohortId(''); // Reset cohort when dept changes
                          }}
                        >
                          <option value="">-- No Department Assignment --</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </Form.Select>
                      </div>
                      <div className="col-md-6">
                        <Form.Label>Assign Cohort (Optional)</Form.Label>
                        <Form.Select 
                          value={bulkCohortId}
                          onChange={(e) => setBulkCohortId(e.target.value)}
                          disabled={!bulkDepartmentId}
                        >
                          <option value="">-- No Cohort Assignment --</option>
                          {getCohortsForDept(bulkDepartmentId).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </Form.Select>
                      </div>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                      <div>
                        <strong>{bulkPreview.filter(r => r.status.startsWith('ready')).length}</strong> students ready for verification.
                      </div>
                      <Button 
                        variant="success" 
                        disabled={isConfirmingBulk || !bulkPreview.some(r => r.status.startsWith('ready'))}
                        onClick={handleBulkConfirm}
                      >
                        {isConfirmingBulk ? 'Verifying...' : 'Confirm Bulk Verification'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {bulkPreview.length > 0 && (
                <div className="table-responsive mt-4">
                  <Table size="sm" hover>
                    <thead className="bg-light">
                      <tr>
                        <th>Email</th>
                        <th>Reg Number</th>
                        <th>Status</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.email}</td>
                          <td>{item.registration_number || '-'}</td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td className="small text-muted">{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Verification Modal */}
      <Modal show={verifyModal.show} onHide={() => setVerifyModal(prev => ({ ...prev, show: false }))}>
        <Modal.Header closeButton>
          <Modal.Title>Verify Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {verifyModal.student && (
            <>
              <div className="mb-4 p-3 bg-light rounded border">
                <div className="d-flex justify-content-between mb-2">
                   <span className="text-muted">Student:</span>
                   <span className="fw-medium">{verifyModal.student.student_email}</span>
                </div>
                {verifyModal.student.raw_department_input && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Claimed Dept:</span>
                    <span className="fw-bold text-primary">{verifyModal.student.raw_department_input}</span>
                  </div>
                )}
                {verifyModal.student.raw_cohort_input && (
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Claimed Cohort:</span>
                    <span>{verifyModal.student.raw_cohort_input}</span>
                  </div>
                )}
              </div>

              {verifyModal.student.raw_department_input && verifyModal.departmentId && (
                 <Alert variant="info" className="d-flex align-items-center gap-2 py-2">
                    <Info size={16} />
                    <small>Smart Match: We found a matching department for "<strong>{verifyModal.student.raw_department_input}</strong>"</small>
                 </Alert>
              )}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Assign Department</Form.Label>
                  <Form.Select
                    value={verifyModal.departmentId}
                    onChange={(e) => setVerifyModal(prev => ({ 
                      ...prev, 
                      departmentId: e.target.value,
                      cohortId: '' // Reset cohort
                    }))}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Assign Cohort</Form.Label>
                  <Form.Select
                    value={verifyModal.cohortId}
                    onChange={(e) => setVerifyModal(prev => ({ ...prev, cohortId: e.target.value }))}
                    disabled={!verifyModal.departmentId}
                  >
                    <option value="">-- Select Cohort --</option>
                    {getCohortsForDept(verifyModal.departmentId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setVerifyModal(prev => ({ ...prev, show: false }))}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleConfirmVerify} 
            disabled={isSubmittingVerify}
          >
            {isSubmittingVerify ? 'Verifying...' : 'Confirm Verification'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Shared Feedback Modal */}
      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default StudentVerification;