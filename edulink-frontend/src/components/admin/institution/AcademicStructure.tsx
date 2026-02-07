import React, { useState, useEffect } from 'react';
import { Button, Table, Badge, Modal, Form, Alert, Card, Row, Col } from 'react-bootstrap';
import { Plus, Edit2, Trash2, School, Users, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FeedbackModal } from '../../common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { institutionService, type Department, type Cohort } from '../../../services/institution/institutionService';
import AcademicStructureSkeleton, { CohortTableSkeleton } from '../skeletons/AcademicStructureSkeleton';

const AcademicStructure: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', aliases: '', is_active: true });
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Cohort Modal State
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [selectedDeptForCohort, setSelectedDeptForCohort] = useState<string | null>(null);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [cohortForm, setCohortForm] = useState({ name: '', start_year: new Date().getFullYear(), end_year: '', intake_label: '' });
  const [cohortSubmitting, setCohortSubmitting] = useState(false);

  // Cohorts Data Cache (map departmentId to cohorts)
  const [cohortsMap, setCohortsMap] = useState<Record<string, Cohort[]>>({});
  const [loadingCohorts, setLoadingCohorts] = useState<Record<string, boolean>>({});
  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch cohorts whenever departments are loaded
  useEffect(() => {
    if (departments.length > 0) {
      departments.forEach(dept => {
        if (!cohortsMap[dept.id] && !loadingCohorts[dept.id]) {
          fetchCohorts(dept.id);
        }
      });
    }
  }, [departments]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await institutionService.getDepartments();
      setDepartments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCohorts = async (deptId: string) => {
    try {
      setLoadingCohorts(prev => ({ ...prev, [deptId]: true }));
      const data = await institutionService.getCohorts(deptId);
      setCohortsMap(prev => ({ ...prev, [deptId]: data }));
    } catch (err: any) {
      console.error('Failed to load cohorts', err);
    } finally {
      setLoadingCohorts(prev => ({ ...prev, [deptId]: false }));
    }
  };

  const handleCreateDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '', aliases: '', is_active: true });
    setShowDeptModal(true);
  };

  const handleEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({ 
      name: dept.name, 
      code: dept.code, 
      aliases: dept.aliases.join(', '),
      is_active: dept.is_active !== undefined ? dept.is_active : true
    });
    setShowDeptModal(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptSubmitting(true);
    try {
      const payload = {
        name: deptForm.name,
        code: deptForm.code,
        aliases: deptForm.aliases.split(',').map(a => a.trim()).filter(a => a),
        is_active: deptForm.is_active
      };

      if (editingDept) {
        await institutionService.updateDepartment(editingDept.id, payload);
      } else {
        await institutionService.createDepartment(payload);
      }
      showSuccess(
        'Department Saved',
        `The department has been ${editingDept ? 'updated' : 'created'} successfully.`
      );
      fetchDepartments();
      setShowDeptModal(false);
    } catch (err: any) {
      showError('Save Failed', 'We could not save the department.', err.message);
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleCreateCohort = (deptId: string) => {
    setSelectedDeptForCohort(deptId);
    setEditingCohort(null);
    setCohortForm({ name: '', start_year: new Date().getFullYear(), end_year: '', intake_label: '' });
    setShowCohortModal(true);
  };

  const handleEditCohort = (cohort: Cohort) => {
    setSelectedDeptForCohort(cohort.department_id);
    setEditingCohort(cohort);
    setCohortForm({
      name: cohort.name,
      start_year: cohort.start_year,
      end_year: cohort.end_year ? cohort.end_year.toString() : '',
      intake_label: cohort.intake_label || ''
    });
    setShowCohortModal(true);
  };

  const handleCohortSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptForCohort) return;
    
    setCohortSubmitting(true);
    try {
      const payload = {
        department_id: selectedDeptForCohort,
        name: cohortForm.name,
        start_year: Number(cohortForm.start_year),
        end_year: cohortForm.end_year ? Number(cohortForm.end_year) : undefined,
        intake_label: cohortForm.intake_label
      };

      if (editingCohort) {
        await institutionService.updateCohort(editingCohort.id, payload);
      } else {
        await institutionService.createCohort(payload);
      }
      showSuccess(
        'Cohort Saved',
        `The cohort has been ${editingCohort ? 'updated' : 'created'} successfully.`
      );
      fetchCohorts(selectedDeptForCohort);
      setShowCohortModal(false);
    } catch (err: any) {
      showError('Save Failed', 'We could not save the cohort.', err.message);
    } finally {
      setCohortSubmitting(false);
    }
  };

  const handleDeleteDept = async (id: string) => {
    showConfirm({
      title: 'Delete Department',
      message: 'Are you sure? This will delete all associated cohorts and student affiliations. This action cannot be undone.',
      variant: 'error',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await institutionService.deleteDepartment(id);
          toast.success('Department deleted successfully');
          fetchDepartments();
        } catch (err: any) {
          showError('Delete Failed', 'Failed to delete department', err.message);
        }
      }
    });
  };

  const handleDeleteCohort = async (id: string, deptId: string) => {
    showConfirm({
      title: 'Delete Cohort',
      message: 'Are you sure you want to delete this cohort? This will affect students assigned to it.',
      variant: 'error',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await institutionService.deleteCohort(id);
          toast.success('Cohort deleted successfully');
          fetchCohorts(deptId);
        } catch (err: any) {
          showError('Delete Failed', 'Failed to delete cohort', err.message);
        }
      }
    });
  };

  if (loading) return <AcademicStructureSkeleton />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="academic-structure">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Academic Structure</h4>
          <p className="text-muted mb-0">Manage your institution's departments and cohorts.</p>
        </div>
        <Button variant="primary" onClick={handleCreateDept} className="d-flex align-items-center gap-2">
          <Plus size={18} />
          Add Department
        </Button>
      </div>

      <div className="d-flex flex-column gap-3">
        {departments.map(dept => (
          <Card key={dept.id} className="border rounded shadow-sm">
            <Card.Header className="bg-white py-3">
              <div className="d-flex align-items-center gap-3 w-100 pe-3">
                <School size={20} className={dept.is_active !== false ? "text-primary" : "text-muted"} />
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="fw-bold">{dept.name}</div>
                    {dept.is_active === false && (
                      <Badge bg="secondary" className="d-flex align-items-center gap-1">
                        <EyeOff size={10} /> Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted small">
                    {dept.code && <Badge bg="light" text="dark" className="me-2">{dept.code}</Badge>}
                    {dept.aliases.length > 0 && (
                      <span className="text-muted fst-italic">Aliases: {dept.aliases.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="d-flex gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => handleEditDept(dept)}>
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteDept(dept.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body style={{ backgroundColor: '#f8f9fa', position: 'relative' }}>
              <div className="d-flex justify-content-between align-items-center mb-3 position-relative" style={{ zIndex: 20 }}>
                <h6 className="mb-0 text-secondary d-flex align-items-center gap-2">
                  <Users size={16} /> Cohorts
                </h6>
                <Button variant="outline-primary" size="sm" onClick={() => handleCreateCohort(dept.id)}>
                  <Plus size={14} /> Add Cohort
                </Button>
              </div>

              <div style={{ position: 'relative', zIndex: 5 }}>
                {loadingCohorts[dept.id] ? (
                  <CohortTableSkeleton />
                ) : (
                  <>
                    {cohortsMap[dept.id]?.length === 0 ? (
                      <div className="text-center text-muted py-3 small border rounded bg-white">
                        No cohorts defined yet.
                      </div>
                    ) : (
                      <Table hover size="sm" className="mb-0 bg-white rounded shadow-sm">
                        <thead className="table-light">
                          <tr>
                            <th>Name</th>
                            <th>Period</th>
                            <th>Intake</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cohortsMap[dept.id]?.map(cohort => (
                            <tr key={cohort.id}>
                              <td className="fw-medium">{cohort.name}</td>
                              <td>{cohort.start_year} {cohort.end_year ? `- ${cohort.end_year}` : ''}</td>
                              <td>{cohort.intake_label || '-'}</td>
                              <td className="text-end">
                                <Button variant="link" size="sm" className="p-0 me-2 text-muted" onClick={() => handleEditCohort(cohort)}>
                                  <Edit2 size={14} />
                                </Button>
                                <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteCohort(cohort.id, dept.id)}>
                                  <Trash2 size={14} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}
              </div>
            </Card.Body>
          </Card>
        ))}
        
        {departments.length === 0 && (
          <div className="text-center py-5 border rounded bg-light">
            <School size={48} className="text-muted mb-3" />
            <h5>No Departments Found</h5>
            <p className="text-muted">Start by adding your institution's departments.</p>
            <Button variant="primary" onClick={handleCreateDept}>Create Department</Button>
          </div>
        )}
      </div>

      {/* Department Modal */}
      <Modal show={showDeptModal} onHide={() => setShowDeptModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingDept ? 'Edit Department' : 'Create Department'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleDeptSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Department Name <span className="text-danger">*</span></Form.Label>
              <Form.Control 
                type="text" 
                required 
                value={deptForm.name} 
                onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                placeholder="e.g. Computer Science"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department Code</Form.Label>
              <Form.Control 
                type="text" 
                value={deptForm.code} 
                onChange={e => setDeptForm({...deptForm, code: e.target.value})}
                placeholder="e.g. CS"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Aliases</Form.Label>
              <Form.Control 
                type="text" 
                value={deptForm.aliases} 
                onChange={e => setDeptForm({...deptForm, aliases: e.target.value})}
                placeholder="e.g. computer tech, comp sci (comma separated)"
              />
              <Form.Text className="text-muted">
                These help match student inputs like "comp sci" to this official department.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check 
                type="switch"
                id="dept-active-switch"
                label="Active"
                checked={deptForm.is_active}
                onChange={e => setDeptForm({...deptForm, is_active: e.target.checked})}
              />
              <Form.Text className="text-muted">
                Inactive departments won't be suggested to new students.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeptModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={deptSubmitting}>
              {deptSubmitting ? 'Saving...' : 'Save Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Cohort Modal */}
      <Modal show={showCohortModal} onHide={() => setShowCohortModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingCohort ? 'Edit Cohort' : 'Create Cohort'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCohortSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Cohort Name <span className="text-danger">*</span></Form.Label>
              <Form.Control 
                type="text" 
                required 
                value={cohortForm.name} 
                onChange={e => setCohortForm({...cohortForm, name: e.target.value})}
                placeholder="e.g. Class of 2024"
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Year <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="number" 
                    required 
                    value={cohortForm.start_year} 
                    onChange={e => setCohortForm({...cohortForm, start_year: Number(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Year</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={cohortForm.end_year} 
                    onChange={e => setCohortForm({...cohortForm, end_year: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Intake Label</Form.Label>
              <Form.Control 
                type="text" 
                value={cohortForm.intake_label} 
                onChange={e => setCohortForm({...cohortForm, intake_label: e.target.value})}
                placeholder="e.g. September Intake"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCohortModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={cohortSubmitting}>
              {cohortSubmitting ? 'Saving...' : 'Save Cohort'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default AcademicStructure;
