import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import {
  Briefcase,
  MapPin,
  Calendar,
  Users,
  Layers,
  Clock,
  Lock,
  FileText,
} from 'lucide-react';
import { internshipService } from '../../../services/internship/internshipService';
import type { CreateInternshipData } from '../../../services/internship/internshipService';

interface CreateInternshipModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
  institution_id?: string;
  employer_id?: string;
}

const CreateInternshipModal: React.FC<CreateInternshipModalProps> = ({
  show,
  onHide,
  onSuccess,
  institution_id,
  employer_id,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateInternshipData>({
    title: '',
    description: '',
    department: '',
    location: '',
    location_type: 'ONSITE',
    capacity: 1,
    skills: [],
    start_date: '',
    end_date: '',
    duration: '',
    application_deadline: '',
    is_institution_restricted: false,
  });

  const [skillsInput, setSkillsInput] = useState('');

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      department: '',
      location: '',
      location_type: 'ONSITE',
      capacity: 1,
      skills: [],
      start_date: '',
      end_date: '',
      duration: '',
      application_deadline: '',
      is_institution_restricted: false,
    });

    setSkillsInput('');
    setError(null);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;

    setFormData(prev => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (event.target as HTMLInputElement).checked
          : name === 'capacity'
            ? parseInt(value) || 1
            : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.title || !formData.description) {
      setError('Title and description are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const skills = skillsInput
        .split(',')
        .map(skill => skill.trim())
        .filter(Boolean);

      await internshipService.createOpportunity({
        ...formData,
        skills,
        institution_id,
        employer_id,
      });

      onSuccess();
      onHide();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create internship opportunity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      dialogClassName="create-internship-modal"
    >
      <style>{`
        .create-internship-modal .modal-content {
          border: none;
          border-radius: 28px;
          overflow: hidden;
        }

        .create-internship-modal .modal-header {
          padding: 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .create-internship-modal .modal-body {
          padding: 24px;
        }

        .create-internship-modal .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #eef2f6;
        }

        .create-modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 740;
          color: #111827;
          letter-spacing: -0.03em;
        }

        .create-modal-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-top: 6px;
          margin-bottom: 0;
        }

        .create-section {
          background: #fbfcfd;
          border: 1px solid #edf0f4;
          border-radius: 22px;
          padding: 22px;
          margin-bottom: 18px;
        }

        .create-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 740;
          color: #111827;
          margin-bottom: 18px;
        }

        .create-internship-modal .form-control,
        .create-internship-modal .form-select {
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          box-shadow: none !important;
        }

        .create-internship-modal textarea.form-control {
          min-height: auto;
        }

        .create-internship-modal .form-control:focus,
        .create-internship-modal .form-select:focus {
          border-color: #111827;
        }

        .create-internship-modal .form-label {
          font-size: 0.84rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 7px;
        }

        .create-primary-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .create-soft-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .restriction-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
        }
      `}</style>

      <Modal.Header closeButton>
        <div>
          <Modal.Title className="create-modal-title">
            <Briefcase size={20} />
            Post New Internship Opportunity
          </Modal.Title>

          <p className="create-modal-subtitle">
            Create an institution-hosted opportunity for eligible students.
          </p>
        </div>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="rounded-4">
              {error}
            </Alert>
          )}

          <div className="create-section">
            <div className="create-section-title">
              <FileText size={16} />
              Opportunity Details
            </div>

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Internship Title <span className="text-danger">*</span>
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Software Engineering Intern"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Description <span className="text-danger">*</span>
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe responsibilities, expectations, and requirements..."
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <Layers size={14} className="me-1" />
                    Department
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g. ICT Department"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <Users size={14} className="me-1" />
                    Capacity
                  </Form.Label>

                  <Form.Control
                    type="number"
                    min="1"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="create-section">
            <div className="create-section-title">
              <MapPin size={16} />
              Location & Schedule
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Location Type</Form.Label>

                  <Form.Select
                    name="location_type"
                    value={formData.location_type}
                    onChange={handleChange}
                  >
                    <option value="ONSITE">On-site</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Location</Form.Label>

                  <Form.Control
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Nairobi, Kenya"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <Calendar size={14} className="me-1" />
                    Start Date
                  </Form.Label>

                  <Form.Control
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <Calendar size={14} className="me-1" />
                    End Date
                  </Form.Label>

                  <Form.Control
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <Clock size={14} className="me-1" />
                    Duration
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 3 months"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Application Deadline</Form.Label>

                  <Form.Control
                    type="datetime-local"
                    name="application_deadline"
                    value={formData.application_deadline}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="create-section mb-0">
            <div className="create-section-title">
              <Lock size={16} />
              Eligibility & Skills
            </div>

            <Row className="g-3">
              {institution_id && (
                <Col md={12}>
                  <div className="restriction-box">
                    <Form.Check
                      type="checkbox"
                      id="is_institution_restricted"
                      name="is_institution_restricted"
                      checked={formData.is_institution_restricted}
                      onChange={handleChange}
                      label="Restrict to my institution's students only"
                    />
                  </div>
                </Col>
              )}

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Required Skills</Form.Label>

                  <Form.Control
                    type="text"
                    value={skillsInput}
                    onChange={event => setSkillsInput(event.target.value)}
                    placeholder="e.g. React, Python, Communication"
                  />

                  <Form.Text className="text-muted">
                    Separate skills using commas.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button className="create-soft-btn" onClick={onHide}>
            Cancel
          </Button>

          <Button className="create-primary-btn" type="submit" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Create Opportunity'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateInternshipModal;