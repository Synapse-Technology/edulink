import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, InputGroup, Row, Col, Alert } from 'react-bootstrap';
import { Search, Plus, BookOpen, Users, MoreHorizontal, Briefcase } from 'lucide-react';
import { internshipService } from '../../../services/internship/internshipService';
import { institutionService } from '../../../services/institution/institutionService';
import type { InternshipOpportunity } from '../../../services/internship/internshipService';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';

import CreateInternshipModal from '../../../components/dashboard/institution/CreateInternshipModal';

const InstitutionInternships: React.FC = () => {
  const [internships, setInternships] = useState<InternshipOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const inst = await institutionService.getProfile();
        if (inst) {
          setInstitutionId(inst.id);
        }
      } catch (err) {
        console.error("Failed to fetch institution context", err);
      }
    };
    fetchInstitution();
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getInternships();
      setInternships(data);
    } catch (err: any) {
      console.error("Failed to fetch internships", err);
      setError("Failed to load internships.");
    } finally {
      setLoading(false);
    }
  };

  const filteredInternships = internships.filter(i => 
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return 'success';
      case 'DRAFT': return 'secondary';
      case 'CLOSED': return 'danger';
      default: return 'info';
    }
  };

  if (loading) {
    return <InstitutionTableSkeleton hasSummaryCards={true} hasInternalTableFilter={true} />;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="institution-internships">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Institution-Hosted Internships</h4>
          <p className="text-muted mb-0">Manage internships offered directly by your institution.</p>
        </div>
        <Button variant="primary" className="d-flex align-items-center gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          Post Internship
        </Button>
      </div>

      <CreateInternshipModal 
        show={showCreateModal} 
        onHide={() => setShowCreateModal(false)} 
        onSuccess={fetchInternships}
        institution_id={institutionId}
      />

      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 bg-primary text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-white-50 text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>Total Opportunities</h6>
                  <h2 className="mb-0 fw-bold">{internships.length}</h2>
                </div>
                <Briefcase className="text-white-50" size={24} />
              </div>
              <div className="small text-white-50">Hosted by Institution</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-muted text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>Open Positions</h6>
                  <h2 className="mb-0 fw-bold">{internships.filter(i => i.status === 'OPEN').length}</h2>
                </div>
                <BookOpen className="text-muted" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-muted text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>Closed/Draft</h6>
                  <h2 className="mb-0 fw-bold">{internships.filter(i => i.status === 'CLOSED' || i.status === 'DRAFT').length}</h2>
                </div>
                <MoreHorizontal className="text-muted" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="p-3 border-bottom">
            <Row className="g-3 align-items-center">
              <div className="col-md-6">
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0">
                    <Search size={18} className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search internships..."
                    className="bg-light border-start-0 ps-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>
            </Row>
          </div>
          
          <Table hover responsive className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="border-0 ps-4">Title</th>
                <th className="border-0">Department</th>
                <th className="border-0">Status</th>
                <th className="border-0">Capacity</th>
                <th className="border-0">Dates</th>
                <th className="border-0 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInternships.length > 0 ? (
                filteredInternships.map((internship) => (
                  <tr key={internship.id}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{internship.title}</div>
                      <div className="small text-muted">{internship.location_type}</div>
                    </td>
                    <td>{internship.department || '-'}</td>
                    <td>
                      <Badge bg={getStatusBadge(internship.status)} className="rounded-pill px-3 fw-normal">
                        {internship.status}
                      </Badge>
                    </td>
                    <td>{internship.capacity}</td>
                    <td>
                        <div className="small text-muted">
                            {internship.start_date ? new Date(internship.start_date).toLocaleDateString() : 'TBD'} - 
                            {internship.end_date ? new Date(internship.end_date).toLocaleDateString() : 'TBD'}
                        </div>
                    </td>
                    <td className="text-end pe-4">
                      <Button variant="link" className="text-muted p-0">
                        <MoreHorizontal size={18} />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    No internships found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default InstitutionInternships;
