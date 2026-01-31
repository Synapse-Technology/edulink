import React, { useState } from 'react';
import { Table, Button, Badge, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import { AlertTriangle, Plus, CheckCircle, Clock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { internshipService } from '../../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import type { SupervisorDashboardContext } from './SupervisorDashboard';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';

const SupervisorIncidents: React.FC = () => {
  const { internships, incidents: initialIncidents } = useOutletContext<SupervisorDashboardContext>();
  const [incidents, setIncidents] = useState(initialIncidents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<string>('');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getIncidents();
      setIncidents(data);
    } catch (err: any) {
      console.error("Failed to fetch incidents", err);
      setError("Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternship || !incidentTitle || !incidentDescription) return;

    try {
      setSubmitting(true);
      await internshipService.reportIncident(selectedInternship, incidentTitle, incidentDescription);
      toast.success("Incident reported successfully");
      setShowCreateModal(false);
      
      // Reset form
      setIncidentTitle('');
      setIncidentDescription('');
      setSelectedInternship('');
      
      fetchData(); // Refresh list
    } catch (err: any) {
      console.error("Failed to report incident", err);
      toast.error("Failed to report incident");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': 
        return (
          <Badge bg="danger" className="bg-danger bg-opacity-10 text-danger border border-danger-subtle px-3 py-2 fw-medium rounded-3">
            Open
          </Badge>
        );
      case 'RESOLVED': 
        return (
          <Badge bg="success" className="bg-success bg-opacity-10 text-success border border-success-subtle px-3 py-2 fw-medium rounded-3">
            Resolved
          </Badge>
        );
      case 'DISMISSED': 
        return (
          <Badge bg="secondary" className="bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle px-3 py-2 fw-medium rounded-3">
            Dismissed
          </Badge>
        );
      default: 
        return (
          <Badge bg="secondary" className="bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle px-3 py-2 fw-medium rounded-3">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="container-fluid px-4 px-lg-5 py-4">
        <SupervisorTableSkeleton hasAction={true} />
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 px-lg-5 py-4">
      {/* Header Section */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-5">
        <div className="mb-4 mb-lg-0">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="bg-danger bg-opacity-10 p-3 rounded-3">
              <AlertTriangle size={28} className="text-danger" />
            </div>
            <div>
              <h1 className="h2 fw-bold mb-1">Incidents & Misconduct</h1>
              <p className="text-muted mb-0">
                Report and track student incidents
              </p>
            </div>
          </div>
        </div>
        <div>
          <Button 
            variant="danger" 
            onClick={() => setShowCreateModal(true)}
            className="d-flex align-items-center px-4 py-2 rounded-3 shadow-sm hover-lift"
          >
            <Plus size={18} className="me-2" />
            Report Incident
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 pt-4 pb-3 px-4">
          <h5 className="fw-bold mb-1">Reported Incidents</h5>
          <p className="text-muted small mb-0">History of all incidents reported by you</p>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <Table hover className="table align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 ps-4 py-3 text-muted small text-uppercase fw-semibold">Title / Description</th>
                  <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Status</th>
                  <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Reported Date</th>
                  <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Internship / Student</th>
                  <th className="border-0 pe-4 py-3 text-end text-muted small text-uppercase fw-semibold">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length > 0 ? (
                  incidents.map((incident) => (
                    <tr key={incident.id} className="border-top">
                      <td className="ps-4 py-3">
                        <div className="fw-bold text-dark">{incident.title}</div>
                        <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }}>
                          {incident.description}
                        </div>
                      </td>
                      <td className="py-3">{getStatusBadge(incident.status)}</td>
                      <td className="py-3">
                        <div className="d-flex align-items-center text-muted">
                          <Clock size={14} className="me-2" />
                          {new Date(incident.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted bg-light px-2 py-1 rounded border">
                            {incident.internship_title || 'Untitled'}
                          </small>
                          <span className="small text-muted">-</span>
                          <span className="small fw-medium text-dark">
                            {incident.student_info?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="text-end pe-4 py-3">
                        {incident.status === 'RESOLVED' ? (
                           <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-3">
                             <CheckCircle size={14} className="me-1 mb-1"/> Resolved
                           </span>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center">
                        <div className="bg-light rounded-circle p-4 mb-3">
                          <CheckCircle size={48} className="text-success opacity-50" />
                        </div>
                        <h5 className="fw-bold text-dark">No Incidents Reported</h5>
                        <p className="text-muted mb-0">There are no open incidents to display.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* Create Incident Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Report New Incident</Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-3">
            <Alert variant="warning" className="d-flex align-items-start border-warning-subtle bg-warning bg-opacity-10 rounded-3 mb-4">
              <AlertTriangle size={20} className="me-2 flex-shrink-0 mt-1" />
              <div className="small">
                This report will be escalated to the Institution Admin and will be visible on the student's record.
              </div>
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium small text-uppercase text-muted">Select Internship / Student</Form.Label>
              <Form.Select 
                required
                value={selectedInternship}
                onChange={(e) => setSelectedInternship(e.target.value)}
                className="bg-light border-0 py-2"
              >
                <option value="">-- Select Internship --</option>
                {internships.map(internship => (
                  <option key={internship.id} value={internship.id}>
                    {internship.student_info?.name || 'Unknown Student'} - {internship.title}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium small text-uppercase text-muted">Incident Title</Form.Label>
              <Form.Control 
                type="text" 
                required
                placeholder="Brief summary of the issue"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                className="bg-light border-0 py-2"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium small text-uppercase text-muted">Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={4} 
                required
                placeholder="Detailed description of the incident..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className="bg-light border-0"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={() => setShowCreateModal(false)} className="px-4 rounded-3">
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={submitting} className="px-4 rounded-3">
              {submitting ? <Spinner animation="border" size="sm" /> : 'Report Incident'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
};

export default SupervisorIncidents;
