import React, { useState, useEffect } from 'react';
import {
  Form,
  Row,
  Col,
  Button,
  Modal,
  Spinner,
  Alert,
} from 'react-bootstrap';
import {
  Search,
  Filter,
  Users,
  UserPlus,
  ShieldCheck,
  Edit2,
  Settings,
  GraduationCap,
  Calendar,
  Building2,
  Layers,
} from 'lucide-react';

import {
  institutionService,
  type Department,
  type Cohort,
  type AffiliatedStudent,
  type InstitutionStaffMember,
} from '../../../services/institution/institutionService';

import {
  internshipService,
  type InternshipApplication,
} from '../../../services/internship/internshipService';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

import { showToast } from '../../../utils/toast';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const InstitutionStudents: React.FC = () => {
  const [students, setStudents] = useState<AffiliatedStudent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AffiliatedStudent | null>(null);
  const [activeApplication, setActiveApplication] = useState<InternshipApplication | null>(null);
  const [supervisors, setSupervisors] = useState<InstitutionStaffMember[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingAppData, setIsLoadingAppData] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDeptId, setEditDeptId] = useState('');
  const [editCohortId, setEditCohortId] = useState('');
  const [isUpdatingAffiliation, setIsUpdatingAffiliation] = useState(false);

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
        institutionService.getCohorts(),
      ]);

      setStudents(studentsData);
      setDepartments(depts);
      setCohorts(cohs);
    } catch (error) {
      console.error(error);
      showToast.error('An error occurred. Please try again.');
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
      const apps = await internshipService.getApplications({
        student_id: student.student_id,
        status: 'ACTIVE',
      });

      let targetApp = apps.find(a => a.status === 'ACTIVE');

      if (!targetApp) {
        const otherApps = await internshipService.getApplications({
          student_id: student.student_id,
        });

        targetApp = otherApps.find(a =>
          ['ACCEPTED', 'SHORTLISTED'].includes(a.status)
        );
      }

      setActiveApplication(targetApp || null);

      const staff = await institutionService.getStaffList({
        role: 'supervisor',
      });

      setSupervisors(staff.filter(s => s.department === student.department_name));

      if (targetApp?.institution_supervisor_id) {
        setSelectedSupervisorId(targetApp.institution_supervisor_id);
      }
    } catch (error) {
      showToast.error('Failed to load assignment data');
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

      await institutionService.updateStudentAffiliation(
        selectedStudent.student_id,
        {
          department_id: editDeptId || undefined,
          cohort_id: editCohortId || undefined,
        }
      );

      showToast.success('Student affiliation updated');
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);
      showToast.error(sanitized.userMessage || 'Failed to update affiliation');
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

      showToast.success('Supervisor assigned successfully');
      setShowAssignModal(false);
      fetchData();
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);
      showToast.error(sanitized.userMessage || 'Failed to assign supervisor');
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      student.student_email.toLowerCase().includes(search) ||
      student.student_registration_number?.toLowerCase().includes(search);

    const matchesDept = !deptFilter || student.department_id === deptFilter;
    const matchesCohort = !cohortFilter || student.cohort_id === cohortFilter;

    return matchesSearch && matchesDept && matchesCohort;
  });

  const groupedStudents: Record<string, Record<string, AffiliatedStudent[]>> = {};

  filteredStudents.forEach(student => {
    const deptName = student.department_name || 'Unassigned Department';
    const cohortName = student.cohort_name || 'Unassigned Cohort';

    if (!groupedStudents[deptName]) groupedStudents[deptName] = {};
    if (!groupedStudents[deptName][cohortName]) groupedStudents[deptName][cohortName] = [];

    groupedStudents[deptName][cohortName].push(student);
  });

  return (
    <InstitutionWorkspacePage className="institution-students-page">
      <style>{`
        .students-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .students-eyebrow {
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

        .students-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .students-subtitle {
          color: #64748b;
          max-width: 720px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .students-count-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .students-filter-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 26px;
        }

        .students-input,
        .students-select {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .students-input:focus,
        .students-select:focus {
          border-color: #111827 !important;
        }

        .students-group-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #111827;
          font-weight: 740;
          letter-spacing: -0.04em;
          margin-bottom: 16px;
        }

        .students-cohort-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 22px;
        }

        .students-cohort-header {
          padding: 18px 22px;
          border-bottom: 1px solid #eef2f6;
          background: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
        }

        .students-cohort-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .students-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 520px;
          border-top: 1px solid #eef2f6;
        }

        .students-table {
          width: 100%;
          min-width: 1180px;
          margin-bottom: 0;
          table-layout: fixed;
        }

        .students-table thead th {
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

        .students-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .students-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .student-col {
          width: 260px;
        }

        .reg-col {
          width: 150px;
        }

        .trust-col {
          width: 210px;
        }

        .supervisor-col {
          width: 260px;
        }

        .status-col {
          width: 130px;
        }

        .joined-col {
          width: 140px;
        }

        .actions-col {
          width: 150px;
        }

        .student-email {
          font-weight: 700;
          color: #111827;
          line-height: 1.35;
          word-break: normal;
          overflow-wrap: anywhere;
          max-width: 230px;
        }

        .student-warning-note {
          color: #dc2626;
          font-size: 0.72rem;
          font-weight: 700;
          margin-top: 6px;
        }

        .students-soft-pill {
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

        .students-status-pill {
          display: inline-flex;
          padding: 7px 13px;
          border-radius: 999px;
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #dcfce7;
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .supervisor-box {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .supervisor-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .supervisor-email {
          font-size: 0.73rem;
          color: #64748b;
          white-space: nowrap;
        }

        .students-action-group {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          white-space: nowrap;
        }

        .students-icon-btn {
          height: 36px;
          min-width: 36px;
          border-radius: 12px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #475569 !important;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-weight: 650 !important;
          box-shadow: none !important;
        }

        .students-primary-btn {
          height: 42px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: none !important;
          color: #ffffff !important;
          font-weight: 650 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .students-soft-btn {
          height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 650 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .students-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 24px;
          padding: 52px 24px;
          text-align: center;
        }

        .students-modal .modal-content {
          border: none;
          border-radius: 24px;
          overflow: hidden;
        }

        .students-modal .modal-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .students-modal .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #eef2f6;
        }

        .students-modal .form-select,
        .students-modal .form-control {
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .students-modal .form-select:focus,
        .students-modal .form-control:focus {
          border-color: #111827;
        }

        .student-detail-panel {
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 18px;
          padding: 18px;
        }

        @media (max-width: 768px) {
          .students-hero,
          .students-filter-card {
            padding: 22px;
          }

          .students-cohort-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="students-hero">
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
          <div>
            <div className="students-eyebrow">
              <GraduationCap size={15} />
              Student Directory
            </div>

            <h1 className="students-title">
              Manage affiliated students, cohorts, and supervision.
            </h1>

            <p className="students-subtitle">
              View verified institution students, update academic affiliations,
              assign supervisors, and monitor cohort structure from one clean workspace.
            </p>
          </div>

          <div className="students-count-pill align-self-xl-start">
            <Users size={16} />
            {students.length} Total Students
          </div>
        </div>
      </div>

      <div className="students-filter-card">
        <Row className="g-3">
          <Col lg={4}>
            <Form.Group>
              <Form.Label className="small fw-semibold text-muted">
                Search
              </Form.Label>

              <div className="position-relative">
                <Search
                  size={16}
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                />

                <Form.Control
                  type="text"
                  placeholder="Search email or registration number"
                  className="students-input ps-5"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </Form.Group>
          </Col>

          <Col lg={4}>
            <Form.Group>
              <Form.Label className="small fw-semibold text-muted">
                Department
              </Form.Label>

              <div className="position-relative">
                <Filter
                  size={16}
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                />

                <Form.Select
                  className="students-select ps-5"
                  value={deptFilter}
                  onChange={e => {
                    setDeptFilter(e.target.value);
                    setCohortFilter('');
                  }}
                >
                  <option value="">All Departments</option>

                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </Form.Group>
          </Col>

          <Col lg={4}>
            <Form.Group>
              <Form.Label className="small fw-semibold text-muted">
                Cohort
              </Form.Label>

              <Form.Select
                className="students-select"
                value={cohortFilter}
                onChange={e => setCohortFilter(e.target.value)}
                disabled={!deptFilter}
              >
                <option value="">All Cohorts</option>

                {cohorts
                  .filter(c => c.department_id === deptFilter)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </div>

      {isLoading ? (
        <InstitutionTableSkeleton />
      ) : Object.keys(groupedStudents).length === 0 ? (
        <div className="students-empty-state">
          <Users size={48} className="text-muted mb-3" />

          <h5 className="fw-semibold mb-2">
            No students found
          </h5>

          <p className="text-muted mb-0">
            No students match the current search or filter criteria.
          </p>
        </div>
      ) : (
        Object.entries(groupedStudents).map(([deptName, deptCohorts]) => (
          <div key={deptName} className="mb-5">
            <h5 className="students-group-title">
              <Building2 size={19} />
              {deptName}
            </h5>

            {Object.entries(deptCohorts).map(([cohortName, cohortStudents]) => (
              <div key={cohortName} className="students-cohort-card">
                <div className="students-cohort-header">
                  <div className="d-flex align-items-center gap-2">
                    <Layers size={17} className="text-muted" />

                    <div className="fw-semibold text-dark">
                      {cohortName}
                    </div>
                  </div>

                  <div className="students-cohort-badge">
                    <Users size={14} />
                    {cohortStudents.length} Students
                  </div>
                </div>

                <div className="students-table-wrap">
                  <table className="table students-table align-middle">
                    <thead>
                      <tr>
                        <th className="student-col">Student</th>
                        <th className="reg-col">Reg Number</th>
                        <th className="trust-col">Trust Level</th>
                        <th className="supervisor-col">Supervisor</th>
                        <th className="status-col">Status</th>
                        <th className="joined-col">Joined</th>
                        <th className="actions-col text-end">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {cohortStudents.map(student => (
                        <tr key={student.id}>
                          <td className="student-col">
                            <div className="student-email">
                              {student.student_email}
                            </div>

                            {student.cohort_name === 'Unassigned Cohort' && (
                              <div className="student-warning-note">
                                Needs cohort assignment
                              </div>
                            )}
                          </td>

                          <td className="reg-col">
                            <span className="students-soft-pill">
                              {student.student_registration_number || 'N/A'}
                            </span>
                          </td>

                          <td className="trust-col">
                            <TrustBadge
                              level={(student.student_trust_level as TrustLevel) || 0}
                              entityType="student"
                              size="sm"
                            />
                          </td>

                          <td className="supervisor-col">
                            {student.supervisor_name ? (
                              <div className="supervisor-box">
                                <span className="students-soft-pill">
                                  <ShieldCheck size={13} />
                                  Assigned
                                </span>

                                <div>
                                  <div className="supervisor-name">
                                    {student.supervisor_name}
                                  </div>

                                  <div className="supervisor-email">
                                    {student.supervisor_email}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="students-soft-pill">
                                <ShieldCheck size={13} />
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="status-col">
                            <span className="students-status-pill">
                              {student.status}
                            </span>
                          </td>

                          <td className="joined-col">
                            <span className="students-soft-pill">
                              <Calendar size={13} />
                              {new Date(student.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="actions-col text-end">
                            <div className="students-action-group">
                              <Button
                                className="students-icon-btn"
                                onClick={() => handleOpenEditModal(student)}
                                title="Edit affiliation"
                              >
                                <Edit2 size={14} />
                              </Button>

                              <Button
                                className="students-icon-btn"
                                onClick={() => handleOpenAssignModal(student)}
                                title="Assign supervisor"
                              >
                                <UserPlus size={14} />
                                <span className="small">Assign</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      <Modal
        show={showAssignModal}
        onHide={() => setShowAssignModal(false)}
        centered
        dialogClassName="students-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Assign Institution Supervisor</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {isLoadingAppData ? (
            <div className="text-center py-4">
              <Spinner animation="border" />

              <p className="mt-3 text-muted mb-0">
                Loading assignment details...
              </p>
            </div>
          ) : selectedStudent ? (
            <>
              <div className="student-detail-panel mb-4">
                <div className="small text-muted mb-1">
                  Assigning for student
                </div>

                <div className="fw-semibold text-dark">
                  {selectedStudent.student_email}
                </div>

                <div className="small text-muted">
                  {selectedStudent.student_registration_number || 'No registration number'}
                </div>
              </div>

              {!activeApplication ? (
                <Alert variant="warning" className="rounded-4 small mb-0">
                  No active or accepted internship application found for this student.
                  Supervisors can only be assigned to students with an ongoing internship.
                </Alert>
              ) : (
                <Form>
                  <div className="student-detail-panel mb-3">
                    <div className="small text-muted mb-1">
                      Active internship
                    </div>

                    <div className="fw-semibold text-dark">
                      {activeApplication.title}
                    </div>

                    <div className="small text-muted">
                      {activeApplication.employer_details?.name}
                    </div>
                  </div>

                  <Form.Group>
                    <Form.Label className="small fw-semibold">
                      Select Supervisor
                    </Form.Label>

                    <Form.Select
                      value={selectedSupervisorId}
                      onChange={e => setSelectedSupervisorId(e.target.value)}
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
                        <option disabled>
                          No supervisors found in {selectedStudent.department_name}
                        </option>
                      )}
                    </Form.Select>

                    <Form.Control.Feedback type="invalid">
                      Please select a supervisor.
                    </Form.Control.Feedback>

                    <Form.Text className="text-muted small">
                      Only supervisors from {selectedStudent.department_name} are shown.
                    </Form.Text>
                  </Form.Group>
                </Form>
              )}
            </>
          ) : null}
        </Modal.Body>

        <Modal.Footer>
          <Button
            className="students-soft-btn"
            onClick={() => setShowAssignModal(false)}
          >
            Cancel
          </Button>

          <Button
            className="students-primary-btn"
            onClick={handleAssignSupervisor}
            disabled={!activeApplication || !selectedSupervisorId || isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
        dialogClassName="students-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <Settings size={20} />
            Edit Student Affiliation
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {selectedStudent && (
            <>
              <div className="student-detail-panel mb-4">
                <div className="small text-muted mb-1">
                  Student details
                </div>

                <div className="fw-semibold text-dark">
                  {selectedStudent.student_email}
                </div>

                <div className="small text-muted">
                  {selectedStudent.student_registration_number || 'No registration number'}
                </div>
              </div>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">
                    Department
                  </Form.Label>

                  <Form.Select
                    value={editDeptId}
                    onChange={e => {
                      setEditDeptId(e.target.value);
                      setEditCohortId('');
                    }}
                  >
                    <option value="">Select Department...</option>

                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Cohort
                  </Form.Label>

                  <Form.Select
                    value={editCohortId}
                    onChange={e => setEditCohortId(e.target.value)}
                    disabled={!editDeptId}
                  >
                    <option value="">Select Cohort...</option>

                    {cohorts
                      .filter(c => c.department_id === editDeptId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </Form.Select>

                  {!editDeptId && (
                    <Form.Text className="text-muted small">
                      Please select a department first.
                    </Form.Text>
                  )}
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            className="students-soft-btn"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </Button>

          <Button
            className="students-primary-btn"
            onClick={handleUpdateAffiliation}
            disabled={isUpdatingAffiliation || !editDeptId}
          >
            {isUpdatingAffiliation ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </InstitutionWorkspacePage>
  );
};

export default InstitutionStudents;
