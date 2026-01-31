import React, { useEffect, useState } from 'react';
import { Card, Table, Badge, Button, Modal, Form, InputGroup } from 'react-bootstrap';
import { AlertTriangle, Flag, FileText, Search, RefreshCw, Users, Activity } from 'lucide-react';
import { institutionService } from '../../../services/institution/institutionService';
import { internshipService } from '../../../services/internship/internshipService';
import PlacementEvidenceModal from './PlacementEvidenceModal';
import TrustBadge, { type TrustLevel } from '../../common/TrustBadge';

interface Placement {
  id: string;
  title: string;
  student_info?: {
    name: string;
    email: string;
    trust_level?: number;
  };
  employer_id: string;
  employer_name: string;
  status: string;
  department: string;
  start_date: string;
  end_date: string;
}

const PlacementMonitoringWidget: React.FC = () => {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Evidence Modal State
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidencePlacement, setEvidencePlacement] = useState<Placement | null>(null);

  useEffect(() => {
    fetchPlacements();
  }, []);

  const fetchPlacements = async () => {
    try {
      const data = await institutionService.getPlacements();
      setPlacements(data);
    } catch (error) {
      console.error('Failed to fetch placements', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagClick = (placement: Placement) => {
    setSelectedPlacement(placement);
    setIncidentTitle('');
    setIncidentDescription('');
    setShowFlagModal(true);
  };

  const handleReviewClick = (placement: Placement) => {
    setEvidencePlacement(placement);
    setShowEvidenceModal(true);
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlacement) return;
    
    setSubmitting(true);
    try {
      await internshipService.reportIncident(
        selectedPlacement.id,
        incidentTitle,
        incidentDescription
      );
      setShowFlagModal(false);
      alert('Incident reported successfully');
      // Refresh list if needed, though incident reporting doesn't change placement status usually unless severe
    } catch (error) {
      console.error('Failed to report incident', error);
      alert('Failed to report incident');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'COMPLETED': return 'info';
      case 'TERMINATED': return 'danger';
      case 'CERTIFIED': return 'primary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 border-0">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="placeholder-glow w-25">
                         <span className="placeholder col-12 bg-secondary bg-opacity-10 rounded"></span>
                    </div>
                </div>
            </Card.Header>
            <Card.Body className="p-0">
                 <div className="p-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="d-flex mb-4 placeholder-glow">
                            <div className="me-3" style={{ width: 40, height: 40 }}>
                                <span className="placeholder col-12 h-100 rounded-circle bg-secondary bg-opacity-10"></span>
                            </div>
                            <div className="flex-grow-1">
                                <span className="placeholder col-4 bg-secondary bg-opacity-10 rounded mb-2"></span>
                                <br />
                                <span className="placeholder col-3 bg-secondary bg-opacity-10 rounded"></span>
                            </div>
                        </div>
                    ))}
                 </div>
            </Card.Body>
        </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
      <Card.Header className="bg-white py-4 px-4 border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
            <h5 className="mb-1 fw-bold d-flex align-items-center text-dark">
                <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-2">
                    <Activity className="text-primary" size={20} />
                </div>
                Placement Monitoring
            </h5>
            <p className="text-muted small mb-0">Track active students and manage incidents across all departments</p>
        </div>
        
        <div className="d-flex gap-2">
            <InputGroup className="input-group-sm" style={{ width: '250px' }}>
                <InputGroup.Text className="bg-light border-0 rounded-start-3">
                    <Search size={14} className="text-muted" />
                </InputGroup.Text>
                <Form.Control className="bg-light border-0 rounded-end-3 ps-0" placeholder="Search student name or role..." />
            </InputGroup>
            <Button variant="light" size="sm" onClick={fetchPlacements} className="rounded-3 text-muted border-0 bg-light px-3" title="Refresh">
                <RefreshCw size={14} />
            </Button>
        </div>
      </Card.Header>
      
      <div className="table-responsive">
        <Table hover className="mb-0 align-middle">
          <thead className="bg-light bg-opacity-50">
            <tr>
              <th className="border-0 ps-4 py-3 text-uppercase text-muted small fw-bold">Student</th>
              <th className="border-0 py-3 text-uppercase text-muted small fw-bold">Role</th>
              <th className="border-0 py-3 text-uppercase text-muted small fw-bold">Company</th>
              <th className="border-0 py-3 text-uppercase text-muted small fw-bold">Department</th>
              <th className="border-0 py-3 text-uppercase text-muted small fw-bold">Status</th>
              <th className="border-0 text-end pe-4 py-3 text-uppercase text-muted small fw-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {placements.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-5">
                  <div className="d-flex flex-column align-items-center justify-content-center py-4">
                      <div className="bg-light rounded-circle p-4 mb-3">
                          <Users size={32} className="text-muted opacity-50" />
                      </div>
                      <h6 className="text-muted fw-bold">No active placements found</h6>
                      <p className="text-muted small mb-0">Once students are placed, they will appear here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              placements.map((placement) => (
                <tr key={placement.id} className="border-bottom border-light">
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '36px', height: '36px', fontSize: '0.9rem', fontWeight: 600 }}>
                            {placement.student_info?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <div className="d-flex align-items-center gap-2">
                                <div className="fw-semibold text-dark">{placement.student_info?.name || 'Unknown'}</div>
                                <TrustBadge 
                                  level={(placement.student_info?.trust_level as TrustLevel) || 0} 
                                  entityType="student" 
                                  size="sm" 
                                  showLabel={false} 
                                />
                            </div>
                            <div className="small text-muted">{placement.student_info?.email}</div>
                        </div>
                    </div>
                  </td>
                  <td className="py-3 text-dark">{placement.title}</td>
                  <td className="py-3">
                    <div className="d-flex align-items-center">
                        <div className="bg-light p-1 rounded me-2">
                             <Activity size={12} className="text-muted" />
                        </div>
                        <span className="text-dark fw-medium">{placement.employer_name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted">{placement.department}</td>
                  <td className="py-3">
                    <Badge bg={getStatusBadge(placement.status)} className="px-3 py-2 rounded-pill fw-normal">
                        {placement.status}
                    </Badge>
                  </td>
                  <td className="text-end pe-4 py-3">
                    <Button 
                      variant="light" 
                      size="sm" 
                      className="d-inline-flex align-items-center me-2 text-primary bg-primary bg-opacity-10 border-0"
                      onClick={() => handleReviewClick(placement)}
                      title="Review Evidence"
                    >
                      <FileText size={14} className="me-1" /> Review
                    </Button>
                    <Button 
                      variant="light" 
                      size="sm" 
                      className="d-inline-flex align-items-center text-danger bg-danger bg-opacity-10 border-0"
                      onClick={() => handleFlagClick(placement)}
                      title="Flag Issue"
                    >
                      <Flag size={14} className="me-1" /> Report
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Flag Issue Modal */}
      <Modal show={showFlagModal} onHide={() => setShowFlagModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger d-flex align-items-center fs-5">
            <div className="bg-danger bg-opacity-10 p-2 rounded-circle me-2">
                <AlertTriangle size={20} />
            </div>
            Report Incident
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleFlagSubmit}>
          <Modal.Body className="pt-2">
            <p className="text-muted mb-4 small">
              Reporting an incident for <strong className="text-dark">{selectedPlacement?.student_info?.name}</strong>. 
              This will be permanently recorded in the ledger.
            </p>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted text-uppercase">Issue Title</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g., Unexcused Absence, Safety Violation" 
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                required
                className="bg-light border-0"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={4} 
                placeholder="Provide detailed context about the incident..." 
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                required
                className="bg-light border-0"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={() => setShowFlagModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Evidence Modal */}
      {evidencePlacement && (
        <PlacementEvidenceModal
          placement={evidencePlacement}
          show={showEvidenceModal}
          onHide={() => setShowEvidenceModal(false)}
        />
      )}
    </Card>
  );
};

export default PlacementMonitoringWidget;
