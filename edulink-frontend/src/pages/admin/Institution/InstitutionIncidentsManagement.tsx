import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, InputGroup, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Search, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import { internshipService } from '../../../services/internship/internshipService';
import type { Incident } from '../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import IncidentDetailsModal from '../../../components/incident/IncidentDetailsModal';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';

const InstitutionIncidentsManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getIncidents();
      setIncidents(data);
    } catch (err: any) {
      console.error('Failed to fetch incidents', err);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowDetailsModal(true);
  };

  const handleIncidentUpdate = (updated: Incident) => {
    setIncidents(prev => prev.map(inc => (inc.id === updated.id ? updated : inc)));
    setSelectedIncident(updated);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      OPEN: 'danger',
      ASSIGNED: 'warning',
      INVESTIGATING: 'info',
      PENDING_APPROVAL: 'primary',
      RESOLVED: 'success',
      DISMISSED: 'secondary',
    };
    return variants[status] || 'secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'DISMISSED':
        return <CheckCircle size={16} className="me-1" />;
      case 'OPEN':
        return <AlertTriangle size={16} className="me-1" />;
      default:
        return <Clock size={16} className="me-1" />;
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (incident.student_info?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || incident.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'OPEN').length,
    investigating: incidents.filter(i => i.status === 'INVESTIGATING').length,
    resolved: incidents.filter(i => i.status === 'RESOLVED' || i.status === 'DISMISSED').length,
  };

  if (loading) {
    return <InstitutionTableSkeleton tableColumns={6} />;
  }

  return (
    <div className="institution-incidents-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Incident Management</h2>
          <p className="text-muted small mb-0">
            Monitor, investigate, and resolve reported incidents
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="fw-bold text-danger mb-1">{stats.total}</h3>
              <small className="text-muted">Total Incidents</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="fw-bold text-warning mb-1">{stats.open}</h3>
              <small className="text-muted">Open</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="fw-bold text-info mb-1">{stats.investigating}</h3>
              <small className="text-muted">Investigating</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <h3 className="fw-bold text-success mb-1">{stats.resolved}</h3>
              <small className="text-muted">Closed</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-0 ps-0">
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by title, description, or student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 ps-0"
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light border-0"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Incidents Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 ps-4 py-3 text-muted small text-uppercase fw-semibold">
                    Status
                  </th>
                  <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">
                    Title / Description
                  </th>
                  <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">
                    Student
                  </th>
                  <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">
                    Internship
                  </th>
                  <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">
                    Reported
                  </th>
                  <th className="border-0 pe-4 py-3 text-end text-muted small text-uppercase fw-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length > 0 ? (
                  filteredIncidents.map(incident => (
                    <tr key={incident.id} className="border-top">
                      <td className="ps-4 py-3">
                        <Badge 
                          bg={getStatusBadge(incident.status)}
                          className="text-uppercase d-inline-flex align-items-center"
                        >
                          {getStatusIcon(incident.status)}
                          {incident.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="fw-bold text-dark">{incident.title}</div>
                        <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }}>
                          {incident.description}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="small fw-medium">{incident.student_info?.name || 'Unknown'}</span>
                        <br />
                        <small className="text-muted">{incident.student_info?.email}</small>
                      </td>
                      <td className="py-3">
                        <small className="text-muted bg-light px-2 py-1 rounded border">
                          {incident.internship_title || 'N/A'}
                        </small>
                      </td>
                      <td className="py-3">
                        <small className="text-muted">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </small>
                      </td>
                      <td className="pe-4 py-3 text-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewDetails(incident)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="d-flex flex-column align-items-center">
                        <CheckCircle size={48} className="text-success opacity-50 mb-3" />
                        <h5 className="fw-bold text-dark">No Incidents Found</h5>
                        <p className="text-muted mb-0">
                          {statusFilter !== 'ALL'
                            ? `No incidents with status "${statusFilter.replace('_', ' ')}"`
                            : 'No incidents reported yet'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <IncidentDetailsModal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          incident={selectedIncident}
          onUpdate={handleIncidentUpdate}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default InstitutionIncidentsManagement;
