import React from 'react';
import { Modal, Button, Badge, Row, Col } from 'react-bootstrap';
import { MapPin, Users, Calendar, Briefcase, Building } from 'lucide-react';
import type { Internship } from '../../services/internship/internshipService';

interface InternshipDetailsModalProps {
  show: boolean;
  onHide: () => void;
  internship: Internship | null;
}

const InternshipDetailsModal: React.FC<InternshipDetailsModalProps> = ({ show, onHide, internship }) => {
  if (!internship) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return 'success';
      case 'DRAFT': return 'secondary';
      case 'CLOSED': return 'danger';
      case 'ACTIVE': return 'primary';
      default: return 'info';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <Briefcase size={20} className="text-primary" />
          <span className="fw-bold">{internship.title}</span>
          <Badge bg={getStatusBadge(internship.status)} className="ms-2">
            {internship.status}
          </Badge>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <h6 className="fw-bold text-uppercase text-muted small mb-2">Description</h6>
          <p className="text-secondary">{internship.description}</p>
        </div>

        <Row className="g-4 mb-4">
          <Col md={6}>
            <div className="d-flex align-items-start gap-3">
              <div className="p-2 bg-light rounded">
                <Building size={20} className="text-muted" />
              </div>
              <div>
                <h6 className="fw-bold mb-1">Department</h6>
                <p className="text-muted mb-0">{internship.department || 'Not specified'}</p>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex align-items-start gap-3">
              <div className="p-2 bg-light rounded">
                <MapPin size={20} className="text-muted" />
              </div>
              <div>
                <h6 className="fw-bold mb-1">Location</h6>
                <p className="text-muted mb-0">
                  {internship.location_type === 'ONSITE' ? internship.location : internship.location_type}
                </p>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex align-items-start gap-3">
              <div className="p-2 bg-light rounded">
                <Users size={20} className="text-muted" />
              </div>
              <div>
                <h6 className="fw-bold mb-1">Capacity</h6>
                <p className="text-muted mb-0">{internship.capacity} Positions</p>
              </div>
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex align-items-start gap-3">
              <div className="p-2 bg-light rounded">
                <Calendar size={20} className="text-muted" />
              </div>
              <div>
                <h6 className="fw-bold mb-1">Duration</h6>
                <p className="text-muted mb-0">
                  {internship.start_date ? new Date(internship.start_date).toLocaleDateString() : 'TBD'} - 
                  {internship.end_date ? new Date(internship.end_date).toLocaleDateString() : 'TBD'}
                </p>
              </div>
            </div>
          </Col>
        </Row>

        <div>
          <h6 className="fw-bold text-uppercase text-muted small mb-3">Required Skills</h6>
          <div className="d-flex flex-wrap gap-2">
            {(internship.skills || []).map((skill, index) => (
              <Badge key={index} bg="light" text="dark" className="border px-3 py-2 fw-normal">
                {skill}
              </Badge>
            ))}
            {(!internship.skills || internship.skills.length === 0) && (
              <span className="text-muted fst-italic">No specific skills listed</span>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InternshipDetailsModal;
