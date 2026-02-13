import React from 'react';
import { Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { FileText, Clock, ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { InternshipEvidence } from '../../services/internship/internshipService';

interface PendingLogbooksWidgetProps {
  logbooks: InternshipEvidence[];
  isLoading: boolean;
  viewAllLink: string;
  reviewLinkPrefix: string;
}

const PendingLogbooksWidget: React.FC<PendingLogbooksWidgetProps> = ({ 
  logbooks, 
  isLoading, 
  viewAllLink,
  reviewLinkPrefix
}) => {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm mb-4 rounded-4 overflow-hidden">
        <Card.Body className="p-4">
          <div className="placeholder-glow">
            <div className="placeholder col-6 mb-3" style={{ height: '24px' }}></div>
            <div className="placeholder col-12 mb-2" style={{ height: '60px' }}></div>
            <div className="placeholder col-12 mb-2" style={{ height: '60px' }}></div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  const pendingCount = logbooks.length;

  return (
    <Card className="border-0 shadow-sm mb-4 rounded-4 overflow-hidden bg-white">
      <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom-0">
        <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
          <FileText size={20} className="text-warning" />
          Pending Logbooks
        </h5>
        <Badge bg="warning" text="dark" className="rounded-pill px-3 py-2 bg-opacity-10 text-warning border border-warning-subtle">
          {pendingCount} Pending
        </Badge>
      </Card.Header>
      <Card.Body className="p-0">
        {pendingCount === 0 ? (
          <div className="text-center py-5 text-muted px-3">
            <div className="bg-success bg-opacity-10 rounded-circle p-3 d-inline-block mb-3">
              <Clock size={32} className="text-success" />
            </div>
            <p className="mb-0 fw-medium">All logbooks have been reviewed!</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {logbooks.slice(0, 5).map((logbook) => (
              <ListGroup.Item 
                key={logbook.id} 
                className="py-3 px-4 border-0 border-bottom hover-bg-light transition-all cursor-pointer"
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <User size={14} className="text-muted" />
                      <span className="fw-bold text-dark text-truncate small text-uppercase">
                        {logbook.student_info?.name || 'Unknown Student'}
                      </span>
                    </div>
                    <div className="small text-muted text-truncate mb-2 fw-medium">
                      {logbook.title}
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <Badge bg="light" text="dark" className="border fw-normal rounded-pill px-2">
                        {logbook.metadata?.week_start_date || logbook.metadata?.weekStartDate ? `Week of ${logbook.metadata?.week_start_date || logbook.metadata?.weekStartDate}` : 'Logbook'}
                      </Badge>
                      <small className="text-muted d-flex align-items-center gap-1 extra-small">
                        <Clock size={12} />
                        {new Date(logbook.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    as={Link} 
                    to={`${reviewLinkPrefix}`}
                    className="text-primary p-0 ms-2 flex-shrink-0 align-self-center"
                  >
                    <ChevronRight size={20} />
                  </Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
      {pendingCount > 0 && (
        <Card.Footer className="bg-light bg-opacity-50 border-0 py-3 text-center">
          <Link to={viewAllLink} className="text-decoration-none small fw-bold d-flex align-items-center justify-content-center gap-1 text-primary">
            View All Pending Submissions <ChevronRight size={14} />
          </Link>
        </Card.Footer>
      )}
    </Card>
  );
};

export default PendingLogbooksWidget;
