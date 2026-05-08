import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Alert,
  Row,
  Col,
} from 'react-bootstrap';
import {
  Plus,
  Edit2,
  Trash2,
  School,
  Users,
  EyeOff,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { FeedbackModal } from '../../common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';

import {
  institutionService,
  type Department,
  type Cohort,
} from '../../../services/institution/institutionService';

import AcademicStructureSkeleton, {
  CohortTableSkeleton,
} from '../skeletons/AcademicStructureSkeleton';

import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const AcademicStructure: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    aliases: '',
    is_active: true,
  });

  const [deptSubmitting, setDeptSubmitting] = useState(false);

  const [showCohortModal, setShowCohortModal] = useState(false);

  const [selectedDeptForCohort, setSelectedDeptForCohort] =
    useState<string | null>(null);

  const [editingCohort, setEditingCohort] =
    useState<Cohort | null>(null);

  const [cohortForm, setCohortForm] = useState({
    name: '',
    start_year: new Date().getFullYear(),
    end_year: '',
    intake_label: '',
  });

  const [cohortSubmitting, setCohortSubmitting] =
    useState(false);

  const [cohortsMap, setCohortsMap] = useState<
    Record<string, Cohort[]>
  >({});

  const [loadingCohorts, setLoadingCohorts] = useState<
    Record<string, boolean>
  >({});

  const {
    feedbackProps,
    showError,
    showSuccess,
    showConfirm,
  } = useFeedbackModal();

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (departments.length > 0) {
      departments.forEach(dept => {
        if (
          !cohortsMap[dept.id] &&
          !loadingCohorts[dept.id]
        ) {
          fetchCohorts(dept.id);
        }
      });
    }
  }, [departments]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);

      const data =
        await institutionService.getDepartments();

      setDepartments(data);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      setError(
        sanitized.userMessage ||
          'Failed to load departments'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCohorts = async (deptId: string) => {
    try {
      setLoadingCohorts(prev => ({
        ...prev,
        [deptId]: true,
      }));

      const data =
        await institutionService.getCohorts(deptId);

      setCohortsMap(prev => ({
        ...prev,
        [deptId]: data,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCohorts(prev => ({
        ...prev,
        [deptId]: false,
      }));
    }
  };

  const handleCreateDept = () => {
    setEditingDept(null);

    setDeptForm({
      name: '',
      code: '',
      aliases: '',
      is_active: true,
    });

    setShowDeptModal(true);
  };

  const handleEditDept = (dept: Department) => {
    setEditingDept(dept);

    setDeptForm({
      name: dept.name,
      code: dept.code,
      aliases: dept.aliases.join(', '),
      is_active:
        dept.is_active !== undefined
          ? dept.is_active
          : true,
    });

    setShowDeptModal(true);
  };

  const handleDeptSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setDeptSubmitting(true);

    try {
      const payload = {
        name: deptForm.name,
        code: deptForm.code,
        aliases: deptForm.aliases
          .split(',')
          .map(a => a.trim())
          .filter(a => a),
        is_active: deptForm.is_active,
      };

      if (editingDept) {
        await institutionService.updateDepartment(
          editingDept.id,
          payload
        );
      } else {
        await institutionService.createDepartment(
          payload
        );
      }

      showSuccess(
        'Department Saved',
        `The department has been ${
          editingDept ? 'updated' : 'created'
        } successfully.`
      );

      fetchDepartments();

      setShowDeptModal(false);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      showError(
        'Save Failed',
        'We could not save the department.',
        sanitized.details
      );
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleCreateCohort = (deptId: string) => {
    setSelectedDeptForCohort(deptId);

    setEditingCohort(null);

    setCohortForm({
      name: '',
      start_year: new Date().getFullYear(),
      end_year: '',
      intake_label: '',
    });

    setShowCohortModal(true);
  };

  const handleEditCohort = (cohort: Cohort) => {
    setSelectedDeptForCohort(cohort.department_id);

    setEditingCohort(cohort);

    setCohortForm({
      name: cohort.name,
      start_year: cohort.start_year,
      end_year: cohort.end_year
        ? cohort.end_year.toString()
        : '',
      intake_label: cohort.intake_label || '',
    });

    setShowCohortModal(true);
  };

  const handleCohortSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selectedDeptForCohort) return;

    setCohortSubmitting(true);

    try {
      const payload = {
        department_id: selectedDeptForCohort,
        name: cohortForm.name,
        start_year: Number(cohortForm.start_year),
        end_year: cohortForm.end_year
          ? Number(cohortForm.end_year)
          : undefined,
        intake_label: cohortForm.intake_label,
      };

      if (editingCohort) {
        await institutionService.updateCohort(
          editingCohort.id,
          payload
        );
      } else {
        await institutionService.createCohort(
          payload
        );
      }

      showSuccess(
        'Cohort Saved',
        `The cohort has been ${
          editingCohort ? 'updated' : 'created'
        } successfully.`
      );

      fetchCohorts(selectedDeptForCohort);

      setShowCohortModal(false);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);

      showError(
        'Save Failed',
        'We could not save the cohort.',
        sanitized.details
      );
    } finally {
      setCohortSubmitting(false);
    }
  };

  const handleDeleteDept = async (id: string) => {
    showConfirm({
      title: 'Delete Department',
      message:
        'Are you sure? This will delete all associated cohorts and student affiliations.',
      variant: 'error',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await institutionService.deleteDepartment(id);

          toast.success(
            'Department deleted successfully'
          );

          fetchDepartments();
        } catch (err: any) {
          const sanitized = sanitizeAdminError(err);

          showError(
            'Delete Failed',
            'Failed to delete department',
            sanitized.details
          );
        }
      },
    });
  };

  const handleDeleteCohort = async (
    id: string,
    deptId: string
  ) => {
    showConfirm({
      title: 'Delete Cohort',
      message:
        'Are you sure you want to delete this cohort?',
      variant: 'error',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await institutionService.deleteCohort(id);

          toast.success(
            'Cohort deleted successfully'
          );

          fetchCohorts(deptId);
        } catch (err: any) {
          const sanitized = sanitizeAdminError(err);

          showError(
            'Delete Failed',
            'Failed to delete cohort',
            sanitized.details
          );
        }
      },
    });
  };

  if (loading) return <AcademicStructureSkeleton />;

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="academic-structure-page">

      <style>{`
        .academic-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 28px;
          padding: 28px;
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }

        .academic-eyebrow {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 14px;
        }

        .academic-title {
          font-size: clamp(1.7rem, 3vw, 2.3rem);
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          margin-bottom: 12px;
        }

        .academic-subtitle {
          max-width: 680px;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 0;
        }

        .academic-primary-btn {
          height: 46px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: none !important;
          font-weight: 650 !important;
          padding-inline: 18px !important;
        }

        .department-shell {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          overflow: hidden;
        }

        .department-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid #eef2f6;
        }

        .department-icon {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
        }

        .department-title {
          font-weight: 730;
          letter-spacing: -0.03em;
          color: #111827;
        }

        .department-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: #64748b;
        }

        .department-code {
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 600;
        }

        .department-inactive {
          background: #f3f4f6;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .cohort-area {
          padding: 22px;
          background: #fbfcfd;
        }

        .cohort-area-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .cohort-row {
          background: #ffffff;
          border: 1px solid #edf0f4;
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cohort-name {
          font-weight: 650;
          color: #111827;
          margin-bottom: 4px;
        }

        .cohort-meta {
          font-size: 0.82rem;
          color: #64748b;
        }

        .icon-action-btn {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .icon-action-btn.danger {
          color: #dc2626;
        }

        .cohort-empty-state,
        .academic-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 18px;
          padding: 40px 24px;
          text-align: center;
        }

        .academic-soft-btn {
          border-radius: 12px !important;
          border: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
        }

        .academic-modal .modal-content {
          border: none;
          border-radius: 24px;
          overflow: hidden;
        }

        .academic-modal .modal-header {
          border-bottom: 1px solid #eef2f6;
          padding: 22px 24px;
        }

        .academic-modal .modal-footer {
          border-top: 1px solid #eef2f6;
          padding: 20px 24px;
        }

        .academic-modal .form-control {
          border-radius: 14px;
          min-height: 48px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .academic-modal .form-control:focus {
          border-color: #111827;
        }

        @media (max-width: 768px) {
          .academic-hero {
            flex-direction: column;
          }

          .department-header,
          .cohort-row,
          .cohort-area-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="academic-hero mb-4">
        <div>
          <div className="academic-eyebrow">
            Academic Operations
          </div>

          <h1 className="academic-title">
            Manage departments and cohort structure.
          </h1>

          <p className="academic-subtitle">
            Organize academic units, intake groups,
            and cohort mapping for cleaner placement
            reporting and institutional oversight.
          </p>
        </div>

        <Button
          onClick={handleCreateDept}
          className="academic-primary-btn d-flex align-items-center gap-2"
        >
          <Plus size={17} />
          Add Department
        </Button>
      </div>

      <div className="d-flex flex-column gap-4">

        {departments.map(dept => (
          <div
            key={dept.id}
            className="department-shell"
          >
            <div className="department-header">

              <div className="d-flex align-items-start gap-3">

                <div className="department-icon">
                  <School size={20} />
                </div>

                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="department-title mb-0">
                      {dept.name}
                    </h5>

                    {dept.is_active === false && (
                      <div className="department-inactive">
                        <EyeOff size={12} />
                        Inactive
                      </div>
                    )}
                  </div>

                  <div className="department-meta mt-2">
                    {dept.code && (
                      <span className="department-code">
                        {dept.code}
                      </span>
                    )}

                    {dept.aliases.length > 0 && (
                      <span>
                        Aliases:{' '}
                        {dept.aliases.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  className="icon-action-btn"
                  onClick={() =>
                    handleEditDept(dept)
                  }
                >
                  <Edit2 size={16} />
                </button>

                <button
                  className="icon-action-btn danger"
                  onClick={() =>
                    handleDeleteDept(dept.id)
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="cohort-area">

              <div className="cohort-area-header">
                <div className="d-flex align-items-center gap-2">
                  <Users size={16} />
                  <span className="fw-semibold">
                    Cohorts
                  </span>
                </div>

                <Button
                  variant="light"
                  size="sm"
                  className="academic-soft-btn d-flex align-items-center gap-2"
                  onClick={() =>
                    handleCreateCohort(dept.id)
                  }
                >
                  <Plus size={14} />
                  Add Cohort
                </Button>
              </div>

              {loadingCohorts[dept.id] ? (
                <CohortTableSkeleton />
              ) : (
                <>
                  {cohortsMap[dept.id]
                    ?.length === 0 ? (
                    <div className="cohort-empty-state">
                      <Users
                        size={28}
                        className="mb-2 text-muted"
                      />

                      <div className="fw-semibold mb-1">
                        No cohorts added
                      </div>

                      <p className="text-muted small mb-0">
                        Create intake groups for
                        this department.
                      </p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {cohortsMap[dept.id]?.map(
                        cohort => (
                          <div
                            key={cohort.id}
                            className="cohort-row"
                          >
                            <div>
                              <div className="cohort-name">
                                {cohort.name}
                              </div>

                              <div className="cohort-meta">
                                {cohort.start_year}

                                {cohort.end_year
                                  ? ` - ${cohort.end_year}`
                                  : ''}

                                {cohort.intake_label && (
                                  <>
                                    {' • '}
                                    {
                                      cohort.intake_label
                                    }
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              <button
                                className="icon-action-btn"
                                onClick={() =>
                                  handleEditCohort(
                                    cohort
                                  )
                                }
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                className="icon-action-btn danger"
                                onClick={() =>
                                  handleDeleteCohort(
                                    cohort.id,
                                    dept.id
                                  )
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div className="academic-empty-state">
            <School
              size={48}
              className="mb-3 text-muted"
            />

            <h5 className="mb-2">
              No departments configured
            </h5>

            <p className="text-muted mb-4">
              Start by creating academic
              departments and organizing cohorts.
            </p>

            <Button
              onClick={handleCreateDept}
              className="academic-primary-btn"
            >
              Create Department
            </Button>
          </div>
        )}
      </div>

      {/* Department Modal */}

      <Modal
        show={showDeptModal}
        onHide={() => setShowDeptModal(false)}
        centered
        dialogClassName="academic-modal"
      >
        <Form onSubmit={handleDeptSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingDept
                ? 'Edit Department'
                : 'Create Department'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">

            <Form.Group className="mb-3">
              <Form.Label>
                Department Name
              </Form.Label>

              <Form.Control
                type="text"
                required
                value={deptForm.name}
                onChange={e =>
                  setDeptForm({
                    ...deptForm,
                    name: e.target.value,
                  })
                }
                placeholder="e.g. Computer Science"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Department Code
              </Form.Label>

              <Form.Control
                type="text"
                value={deptForm.code}
                onChange={e =>
                  setDeptForm({
                    ...deptForm,
                    code: e.target.value,
                  })
                }
                placeholder="e.g. CS"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Aliases
              </Form.Label>

              <Form.Control
                type="text"
                value={deptForm.aliases}
                onChange={e =>
                  setDeptForm({
                    ...deptForm,
                    aliases: e.target.value,
                  })
                }
                placeholder="e.g. comp sci, computer tech"
              />
            </Form.Group>

            <Form.Check
              type="switch"
              label="Department active"
              checked={deptForm.is_active}
              onChange={e =>
                setDeptForm({
                  ...deptForm,
                  is_active:
                    e.target.checked,
                })
              }
            />
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="light"
              onClick={() =>
                setShowDeptModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="academic-primary-btn"
              disabled={deptSubmitting}
            >
              {deptSubmitting
                ? 'Saving...'
                : 'Save Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Cohort Modal */}

      <Modal
        show={showCohortModal}
        onHide={() => setShowCohortModal(false)}
        centered
        dialogClassName="academic-modal"
      >
        <Form onSubmit={handleCohortSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingCohort
                ? 'Edit Cohort'
                : 'Create Cohort'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">

            <Form.Group className="mb-3">
              <Form.Label>
                Cohort Name
              </Form.Label>

              <Form.Control
                type="text"
                required
                value={cohortForm.name}
                onChange={e =>
                  setCohortForm({
                    ...cohortForm,
                    name: e.target.value,
                  })
                }
                placeholder="e.g. Class of 2027"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Start Year
                  </Form.Label>

                  <Form.Control
                    type="number"
                    required
                    value={
                      cohortForm.start_year
                    }
                    onChange={e =>
                      setCohortForm({
                        ...cohortForm,
                        start_year: Number(
                          e.target.value
                        ),
                      })
                    }
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    End Year
                  </Form.Label>

                  <Form.Control
                    type="number"
                    value={
                      cohortForm.end_year
                    }
                    onChange={e =>
                      setCohortForm({
                        ...cohortForm,
                        end_year:
                          e.target.value,
                      })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group>
              <Form.Label>
                Intake Label
              </Form.Label>

              <Form.Control
                type="text"
                value={
                  cohortForm.intake_label
                }
                onChange={e =>
                  setCohortForm({
                    ...cohortForm,
                    intake_label:
                      e.target.value,
                  })
                }
                placeholder="e.g. September Intake"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="light"
              onClick={() =>
                setShowCohortModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="academic-primary-btn"
              disabled={cohortSubmitting}
            >
              {cohortSubmitting
                ? 'Saving...'
                : 'Save Cohort'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default AcademicStructure;