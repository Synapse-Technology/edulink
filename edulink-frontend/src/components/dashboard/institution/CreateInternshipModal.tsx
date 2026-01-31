import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Briefcase, MapPin, Calendar, Users, Layers, Clock, Lock } from 'lucide-react';
import { internshipService } from '../../../services/internship/internshipService';
import type { CreateInternshipData } from '../../../services/internship/internshipService';

interface CreateInternshipModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
  institution_id?: string;
  employer_id?: string;
}

const CreateInternshipModal: React.FC<CreateInternshipModalProps> = ({ show, onHide, onSuccess, institution_id, employer_id }) => {
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
    is_institution_restricted: false
  });
  const [skillsInput, setSkillsInput] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: CreateInternshipData) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (name === 'capacity' ? parseInt(value) || 1 : value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setError("Title and description are required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const skills = skillsInput.split(',').map(s => s.trim()).filter(s => s);
      
      await internshipService.createOpportunity({
        ...formData,
        skills,
        institution_id: institution_id,
        employer_id: employer_id
      });
      
      onSuccess();
      onHide();
      // Reset form
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
        is_institution_restricted: false
      });
      setSkillsInput('');
    } catch (err: any) {
      console.error("Failed to create internship", err);
      setError(err.message || "Failed to create internship opportunity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <Briefcase className="me-2" size={20} />
          Post New Internship Opportunity
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Row className="g-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Internship Title <span className="text-danger">*</span></Form.Label>
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
                <Form.Label>Description <span className="text-danger">*</span></Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={4} 
                  name="description"
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="Describe the role, responsibilities, and requirements..."
                  required 
                />
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group>
                <Form.Label><Layers size={14} className="me-1" /> Department</Form.Label>
                <Form.Control 
                  type="text" 
                  name="department"
                  value={formData.department} 
                  onChange={handleChange} 
                  placeholder="e.g. IT, Marketing"
                />
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group>
                <Form.Label><Users size={14} className="me-1" /> Capacity</Form.Label>
                <Form.Control 
                  type="number" 
                  min="1"
                  name="capacity"
                  value={formData.capacity} 
                  onChange={handleChange} 
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label><MapPin size={14} className="me-1" /> Location Type</Form.Label>
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
                <Form.Label>Location (City/Address)</Form.Label>
                <Form.Control 
                  type="text" 
                  name="location"
                  value={formData.location} 
                  onChange={handleChange} 
                  placeholder="e.g. New York, NY"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label><Calendar size={14} className="me-1" /> Start Date</Form.Label>
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
                <Form.Label><Calendar size={14} className="me-1" /> End Date</Form.Label>
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
                <Form.Label><Clock size={14} className="me-1" /> Duration</Form.Label>
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
                <Form.Label><Calendar size={14} className="me-1" /> Application Deadline</Form.Label>
                <Form.Control 
                  type="datetime-local" 
                  name="application_deadline"
                  value={formData.application_deadline} 
                  onChange={handleChange} 
                />
              </Form.Group>
            </Col>

            {institution_id && (
              <Col md={12}>
                <Form.Group className="d-flex align-items-center">
                  <Form.Check 
                    type="checkbox"
                    id="is_institution_restricted"
                    name="is_institution_restricted"
                    checked={formData.is_institution_restricted}
                    onChange={handleChange}
                    label={
                      <span className="d-flex align-items-center">
                        <Lock size={14} className="me-1" /> 
                        Restrict to my institution's students only
                      </span>
                    }
                  />
                </Form.Group>
              </Col>
            )}

            <Col md={12}>
              <Form.Group>
                <Form.Label>Required Skills (Comma separated)</Form.Label>
                <Form.Control 
                  type="text" 
                  value={skillsInput} 
                  onChange={(e) => setSkillsInput(e.target.value)} 
                  placeholder="e.g. React, Python, Communication"
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Create Opportunity'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateInternshipModal;
