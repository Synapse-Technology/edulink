import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Row, Col, Badge, Button, Modal, Spinner } from 'react-bootstrap';
import { institutionService, type Department, type Cohort, type AffiliatedStudent, type InstitutionStaffMember } from '../../../services/institution/institutionService';
import { internshipService, type InternshipApplication } from '../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { Search, Filter, Users, UserPlus, ShieldCheck, Edit2, Settings } from 'lucide-react';

const InstitutionStudents: React.FC = () => {
  const [students, setStudents] = useState<AffiliatedStudent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AffiliatedStudent | null>(null);
  const [activeApplication, setActiveApplication] = useState<InternshipApplication | null>(null);
  const [supervisors, setSupervisors] = useState<InstitutionStaffMember[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingAppData, setIsLoadingAppData] = useState(false);

  // Edit Affiliation Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDeptId, setEditDeptId] = useState('');
  const [editCohortId, setEditCohortId] = useState('');
  const [isUpdatingAffiliation, setIsUpdatingAffiliation] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [studentsData, depts, cohs] = await Promise.all([
        institutionService.getStudents(),
        institutionService.getDepartments(),
        institutionService.getCohorts()
      ]);
      setStudents(studentsData);
      setDepartments(depts);
      setCohorts(cohs);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load students data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAssignModal = async (student: AffiliatedStudent) => {
    setSelectedStudent(student);
    setShowAssignModal(true);
    setIsLoadingAppData(true);
    setSelectedSupervisorId('');
    setActiveApplication(null);

    try {
      // 1. Fetch student's active applications
      const apps = await internshipService.getApplications({ 
        student_id: student.student_id,
        status: 'ACTIVE' 
      });
      
      // If no active, try accepted or shortlisted
      let targetApp = apps.find(a => a.status === 'ACTIVE');
      if (!targetApp) {
        const otherApps = await internshipService.getApplications({ 
          student_id: student.student_id
        });
        targetApp = otherApps.find(a => ['ACCEPTED', 'SHORTLISTED'].includes(a.status));
      }

      setActiveApplication(targetApp || null);

      // 2. Fetch supervisors for the student's department
      const staff = await institutionService.getStaffList({ role: 'supervisor' });
      const deptSupervisors = staff.filter(s => s.department === student.department_name);
      setSupervisors(deptSupervisors);

      if (targetApp?.institution_supervisor_id) {
        setSelectedSupervisorId(targetApp.institution_supervisor_id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load assignment data');
    } finally {
      setIsLoadingAppData(false);
    }
  };

  const handleOpenEditModal = (student: AffiliatedStudent) => {
    setSelectedStudent(student);
    setEditDeptId(student.department_id || '');
    setEditCohortId(student.cohort_id || '');
    setShowEditModal(true);
  };

  const handleUpdateAffiliation = async () => {
    if (!selectedStudent) return;

    try {
      setIsUpdatingAffiliation(true);
      await institutionService.updateStudentAffiliation(selectedStudent.student_id, {
        department_id: editDeptId || undefined,
        cohort_id: editCohortId || undefined
      });
      toast.success('Student affiliation updated');
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update affiliation');
    } finally {
      setIsUpdatingAffiliation(false);
    }
  };

  const handleAssignSupervisor = async () => {
    if (!activeApplication || !selectedSupervisorId) return;

    try {
      setIsAssigning(true);
      await internshipService.assignSupervisor(
        activeApplication.id,
        selectedSupervisorId,
        'institution'
      );
      toast.success('Supervisor assigned successfully');
      setShowAssignModal(false);
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign supervisor');
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.student_email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         student.student_registration_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !deptFilter || student.department_id === deptFilter;
    const matchesCohort = !cohortFilter || student.cohort_id === cohortFilter;
    return matchesSearch && matchesDept && matchesCohort;
  });

  // Grouping logic
  const groupedStudents: Record<string, Record<string, AffiliatedStudent[]>> = {};

  filteredStudents.forEach(student => {
    const deptName = student.department_name || 'Unassigned Department';
    const cohortName = student.cohort_name || 'Unassigned Cohort';

    if (!groupedStudents[deptName]) {
      groupedStudents[deptName] = {};
    }
    if (!groupedStudents[deptName][cohortName]) {
      groupedStudents[deptName][cohortName] = [];
    }
    groupedStudents[deptName][cohortName].push(student);
  });

  return (
    <div className="institution-students">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Student Directory</h4>
          <p className="text-muted small mb-0">View all students affiliated with your institution.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
           <Badge bg="primary" className="px-3 py-2">
             <Users size={14} className="me-1" />
             {students.length} Total Students
           </Badge>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold text-muted">Search</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                  <Form.Control 
                    type="text" 
                    placeholder="Search by email..." 
                    className="ps-5"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold text-muted">Department</Form.Label>
                <div className="position-relative">
                  <Filter size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                  <Form.Select 
                    className="ps-5"
                    value={deptFilter}
                    onChange={(e) => {
                      setDeptFilter(e.target.value);
                      setCohortFilter('');
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Form.Select>
                </div>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold text-muted">Cohort</Form.Label>
                <Form.Select 
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  disabled={!deptFilter}
                >
                  <option value="">All Cohorts</option>
                  {cohorts.filter(c => c.department_id === deptFilter).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading ? (
        <InstitutionTableSkeleton />
      ) : Object.keys(groupedStudents).length === 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5 text-muted">
            <p className="mb-0">No students found matching your criteria.</p>
          </Card.Body>
        </Card>
      ) : (
        Object.entries(groupedStudents).map(([deptName, deptCohorts]) => (
          <div key={deptName} className="mb-5">
            <h5 className="fw-bold mb-3 border-bottom pb-2 text-primary">{deptName}</h5>
            {Object.entries(deptCohorts).map(([cohortName, cohortStudents]) => (
              <Card key={cohortName} className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-0 py-3">
                  <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                    <Badge bg="secondary" pill>{cohortStudents.length}</Badge>
                    {cohortName}
                  </h6>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    <Table hover className="align-middle mb-0">
                      <thead className="bg-light sticky-top" style={{ zIndex: 1 }}>
                        <tr>
                          <th className="ps-4">Student</th>
                          <th>Reg Number</th>
                          <th>Trust Level</th>
                          <th>Supervisor</th>
                          <th>Status</th>
                          <th>Joined On</th>
                          <th className="pe-4 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohortStudents.map((student) => (
                          <tr key={student.id}>
                            <td className="ps-4">
                              <div className="fw-medium text-dark">{student.student_email}</div>
                              {student.cohort_name === 'Unassigned Cohort' && (
                                <div className="text-danger" style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                                  Needs Cohort Assignment
                                </div>
                              )}
                            </td>
                            <td>
                              <Badge bg="light" text="dark" className="border fw-normal">
                                {student.student_registration_number || 'N/A'}
                              </Badge>
                            </td>
                            <td>
                              <TrustBadge 
                                level={(student.student_trust_level as TrustLevel) || 0} 
                                entityType="student" 
                                size="sm"
                              />
                            </td>
                            <td>
                              {student.supervisor_name ? (
                                <div className="d-flex align-items-center gap-2">
                                  <div className="bg-success bg-opacity-10 p-1 rounded-circle">
                                    <ShieldCheck size={14} className="text-success" />
                                  </div>
                                  <div>
                                    <div className="small fw-bold text-dark">{student.supervisor_name}</div>
                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{student.supervisor_email}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="d-flex align-items-center gap-2 text-muted">
                                  <div className="bg-light p-1 rounded-circle">
                                    <ShieldCheck size={14} />
                                  </div>
                                  <span className="small italic">Pending</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 fw-normal">
                                {student.status}
                              </Badge>
                            </td>
                            <td className="text-muted small">
                              {new Date(student.created_at).toLocaleDateString()}
                            </td>
                            <td className="pe-4 text-end">
                              <div className="d-flex justify-content-end gap-1">
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm" 
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1 border-0 bg-light-hover"
                                  onClick={() => handleOpenEditModal(student)}
                                  title="Edit Affiliation"
                                >
                                  <Edit2 size={14} />
                                </Button>
                                <Button 
                                  variant="outline-primary" 
                                  size="sm" 
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1 border-0 bg-light-hover"
                                  onClick={() => handleOpenAssignModal(student)}
                                  title="Assign Supervisor"
                                >
                                  <UserPlus size={14} />
                                  <span className="small fw-medium">Assign</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        ))
      )}

      {/* Assignment Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Assign Institution Supervisor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoadingAppData ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading assignment details...</p>
            </div>
          ) : selectedStudent ? (
            <>
              <div className="mb-4 p-3 bg-light rounded">
                <div className="small text-muted mb-1">Assigning for Student:</div>
                <div className="fw-bold">{selectedStudent.student_email}</div>
                <div className="small text-muted">{selectedStudent.student_registration_number}</div>
              </div>

              {!activeApplication ? (
                <div className="alert alert-warning small">
                  No active or accepted internship application found for this student. 
                  Supervisors can only be assigned to students with an ongoing internship.
                </div>
              ) : (
                <Form>
                  <div className="mb-3">
                    <div className="small text-muted mb-1">Active Internship:</div>
                    <div className="p-2 border rounded bg-white">
                      <div className="fw-medium">{activeApplication.title}</div>
                      <div className="small text-muted">{activeApplication.employer_details?.name}</div>
                    </div>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Select Supervisor</Form.Label>
                    <Form.Select 
                      value={selectedSupervisorId} 
                      onChange={(e) => setSelectedSupervisorId(e.target.value)}
                      isInvalid={!selectedSupervisorId}
                    >
                      <option value="">Select a supervisor...</option>
                      {supervisors.length > 0 ? (
                        supervisors.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name} ({s.email})
                          </option>
                        ))
                      ) : (
                        <option disabled>No supervisors found in {selectedStudent.department_name}</option>
                      )}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      Please select a supervisor.
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted small">
                      Only supervisors from the student's department ({selectedStudent.department_name}) are shown.
                    </Form.Text>
                  </Form.Group>
                </Form>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="link" onClick={() => setShowAssignModal(false)} className="text-decoration-none">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAssignSupervisor}
            disabled={!activeApplication || !selectedSupervisorId || isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Affiliation Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <Settings size={20} className="text-primary" />
            Edit Student Affiliation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <>
              <div className="mb-4 p-3 bg-light rounded border-start border-primary border-4">
                <div className="small text-muted mb-1">Student Details</div>
                <div className="fw-bold text-dark">{selectedStudent.student_email}</div>
                <div className="small text-muted">{selectedStudent.student_registration_number || 'No Reg Number'}</div>
              </div>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Department</Form.Label>
                  <Form.Select 
                    value={editDeptId} 
                    onChange={(e) => {
                      setEditDeptId(e.target.value);
                      setEditCohortId(''); // Reset cohort when dept changes
                    }}
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Cohort</Form.Label>
                  <Form.Select 
                    value={editCohortId} 
                    onChange={(e) => setEditCohortId(e.target.value)}
                    disabled={!editDeptId}
                  >
                    <option value="">Select Cohort...</option>
                    {cohorts.filter(c => c.department_id === editDeptId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Form.Select>
                  {!editDeptId && (
                    <Form.Text className="text-muted small">Please select a department first.</Form.Text>
                  )}
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="link" onClick={() => setShowEditModal(false)} className="text-decoration-none text-muted">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateAffiliation}
            disabled={isUpdatingAffiliation || !editDeptId}
            className="px-4"
          >
            {isUpdatingAffiliation ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default InstitutionStudents;
