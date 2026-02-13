import React from 'react';
import { Card, Table, Badge, Button, Dropdown } from 'react-bootstrap';
import { UserPlus, UserCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Intern {
  id: string;
  student_info?: {
    name: string;
    email: string;
  };
  title: string;
  status: string;
  employer_supervisor_id?: string | null;
  employer_supervisor_name?: string | null;
}

interface SupervisionPipelineProps {
  interns: Intern[];
  supervisors: any[];
  onAssignSupervisor: (internId: string, supervisorId: string) => Promise<void>;
}

const SupervisionPipeline: React.FC<SupervisionPipelineProps> = ({ 
  interns, 
  supervisors,
  onAssignSupervisor 
}) => {
  const needsMentor = interns.filter(i => 
    (i.status === 'ACCEPTED' || i.status === 'ACTIVE') && !i.employer_supervisor_id
  );

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
          <UserPlus size={20} className="text-primary" />
          Supervision Pipeline
        </h5>
        <Badge bg="warning" text="dark" className="rounded-pill">
          {needsMentor.length} Need Mentors
        </Badge>
      </Card.Header>
      <Card.Body className="p-0">
        {/* Table View (Desktop) */}
        <div className="table-responsive d-none d-md-block">
          <Table hover className="align-middle mb-0">
            <thead className="bg-light text-muted small uppercase">
              <tr>
                <th className="border-0 ps-4">Intern</th>
                <th className="border-0">Position</th>
                <th className="border-0">Assigned Mentor</th>
                <th className="border-0 text-end pe-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {needsMentor.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <UserCheck size={32} className="text-success mb-2 opacity-50" />
                      <p className="mb-0">All active interns have assigned mentors!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                needsMentor.map((intern) => (
                  <tr key={intern.id}>
                    <td className="ps-4">
                      <div className="fw-semibold">{intern.student_info?.name}</div>
                      <div className="small text-muted">{intern.student_info?.email}</div>
                    </td>
                    <td>
                      <Badge bg="light" text="dark" className="border">
                        {intern.title}
                      </Badge>
                    </td>
                    <td>
                      <Dropdown>
                        <Dropdown.Toggle 
                          variant="outline-secondary" 
                          size="sm" 
                          className="d-flex align-items-center gap-2"
                        >
                          <UserPlus size={14} /> Assign Mentor
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="shadow-sm border-0">
                          <Dropdown.Header>Available Supervisors</Dropdown.Header>
                          {supervisors.length === 0 ? (
                            <Dropdown.Item disabled>No supervisors found</Dropdown.Item>
                          ) : (
                            supervisors.map(s => (
                              <Dropdown.Item 
                                key={s.id} 
                                onClick={() => onAssignSupervisor(intern.id, s.id)}
                              >
                                {s.user?.first_name} {s.user?.last_name}
                              </Dropdown.Item>
                            ))
                          )}
                          <Dropdown.Divider />
                          <Dropdown.Item as={Link as any} to="/employer/dashboard/supervisors">
                            <PlusCircle size={14} className="me-2" /> Invite New Supervisor
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                    <td className="text-end pe-4">
                      <Button 
                        variant="link" 
                        size="sm" 
                        as={Link as any} 
                        to={`/employer/dashboard/applications/${intern.id}`}
                        className="text-primary p-0"
                      >
                        <ExternalLink size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Card View (Mobile) */}
        <div className="d-md-none">
          {needsMentor.length === 0 ? (
            <div className="text-center py-5 text-muted px-3">
              <UserCheck size={32} className="text-success mb-2 opacity-50" />
              <p className="mb-0">All active interns have assigned mentors!</p>
            </div>
          ) : (
            <div className="p-3">
              {needsMentor.map((intern) => (
                <div key={intern.id} className="border rounded-3 p-3 mb-3 bg-light bg-opacity-10">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="fw-bold">{intern.student_info?.name}</div>
                      <div className="small text-muted mb-2">{intern.student_info?.email}</div>
                      <Badge bg="white" text="dark" className="border">
                        {intern.title}
                      </Badge>
                    </div>
                    <Button 
                      variant="link" 
                      size="sm" 
                      as={Link as any} 
                      to={`/employer/dashboard/applications/${intern.id}`}
                      className="text-primary p-0"
                    >
                      <ExternalLink size={18} />
                    </Button>
                  </div>
                  
                  <div className="pt-2 border-top">
                    <Dropdown className="w-100">
                      <Dropdown.Toggle 
                        variant="primary" 
                        size="sm" 
                        className="w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                      >
                        <UserPlus size={16} /> Assign Mentor
                      </Dropdown.Toggle>

                      <Dropdown.Menu className="shadow border-0 w-100">
                        <Dropdown.Header>Available Supervisors</Dropdown.Header>
                        {supervisors.length === 0 ? (
                          <Dropdown.Item disabled>No supervisors found</Dropdown.Item>
                        ) : (
                          supervisors.map(s => (
                            <Dropdown.Item 
                              key={s.id} 
                              onClick={() => onAssignSupervisor(intern.id, s.id)}
                              className="py-2"
                            >
                              {s.user?.first_name} {s.user?.last_name}
                            </Dropdown.Item>
                          ))
                        )}
                        <Dropdown.Divider />
                        <Dropdown.Item as={Link as any} to="/employer/dashboard/supervisors" className="py-2 text-primary">
                          <PlusCircle size={14} className="me-2" /> Invite New Supervisor
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

// Helper for the PlusCircle icon which was missing in the import
const PlusCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export default SupervisionPipeline;
