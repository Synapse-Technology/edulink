import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { UserCog, FileText, CheckSquare, Briefcase, ExternalLink, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmployerLayout } from '../../../components/admin/employer';
import { employerService } from '../../../services/employer/employerService';
import { internshipService } from '../../../services/internship/internshipService';

const EmployerReviews: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    profileRequests: 0,
    applications: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Parallel fetching for performance
      const [profileRequests, allApplications] = await Promise.all([
        employerService.getProfileUpdateRequests('pending'),
        internshipService.getApplications()
      ]);

      // Filter applications (APPLIED status)
      const pendingApps = allApplications.filter(i => i.student_id && (i.status === 'APPLIED' || i.status === 'PENDING'));

      setStats({
        profileRequests: profileRequests.length,
        applications: pendingApps.length
      });

    } catch (err: any) {
      console.error("Failed to fetch review stats", err);
      // We don't block UI for stats failure, just show 0 or error state if critical
    } finally {
      setLoading(false);
    }
  };

  const ReviewCard = ({ 
    title, 
    count, 
    icon: Icon, 
    color, 
    description, 
    actionLabel, 
    link,
    disabled = false,
    infoText
  }: any) => (
    <Card className="border-0 shadow-sm h-100 hover-lift transition-all">
      <Card.Body className="p-4 d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className={`p-3 rounded-3 bg-${color} bg-opacity-10`}>
            <Icon size={24} className={`text-${color}`} />
          </div>
          <Badge bg={count > 0 ? color : 'light'} text={count > 0 ? 'white' : 'muted'} className="px-3 py-2 rounded-pill">
            {count !== undefined ? `${count} Pending` : 'N/A'}
          </Badge>
        </div>
        
        <h5 className="fw-bold text-dark mb-1">{title}</h5>
        <p className="text-muted small mb-4 flex-grow-1">{description}</p>
        
        {infoText && (
          <Alert variant="info" className="py-2 px-3 small d-flex align-items-start mb-3 bg-opacity-10 border-0">
            <Info size={16} className="me-2 mt-1 flex-shrink-0" />
            <span>{infoText}</span>
          </Alert>
        )}

        {link ? (
           <Button 
             variant={count > 0 ? color : `outline-${color}`} 
             className="w-100 d-flex align-items-center justify-content-center"
             onClick={() => navigate(link)}
             disabled={disabled}
           >
             {actionLabel} <ExternalLink size={16} className="ms-2" />
           </Button>
        ) : (
          <Button variant="light" className="w-100 text-muted" disabled>
            {actionLabel}
          </Button>
        )}
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <EmployerLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-1">Reviews & Approvals</h2>
          <p className="text-muted mb-0">Overview of items requiring your attention.</p>
        </div>

        <Row className="g-4">
          {/* Profile Requests */}
          <Col md={6} lg={4}>
            <ReviewCard 
              title="Profile Update Requests" 
              count={stats.profileRequests}
              icon={UserCog}
              color="primary"
              description="Review and approve personal detail changes requested by your staff members."
              actionLabel="Manage Requests"
              link="/employer/dashboard/profile-requests"
            />
          </Col>

          {/* Applications */}
          <Col md={6} lg={4}>
            <ReviewCard 
              title="Internship Applications" 
              count={stats.applications}
              icon={Briefcase}
              color="success"
              description="Review incoming applications from students for your posted opportunities."
              actionLabel="View Applications"
              link="/employer/dashboard/applications"
            />
          </Col>

          {/* Logbooks (Informational) */}
          <Col md={6} lg={4}>
            <ReviewCard 
              title="Student Logbooks" 
              count={0} // Always 0 for admin view
              icon={FileText}
              color="secondary"
              description="Daily logbooks submitted by interns."
              actionLabel="Managed by Supervisors"
              infoText="Logbook reviews are handled directly by assigned Supervisors, not Administrators."
              disabled
            />
          </Col>
        </Row>

        {/* Empty State / All Caught Up */}
        {stats.profileRequests === 0 && stats.applications === 0 && (
           <div className="text-center py-5 mt-4">
             <div className="bg-light rounded-circle p-4 d-inline-block mb-3">
               <CheckSquare size={48} className="text-muted opacity-50" />
             </div>
             <h5 className="fw-bold text-muted">All Caught Up!</h5>
             <p className="text-muted mb-0">You have no pending approvals at this time.</p>
           </div>
        )}
      </div>
    </EmployerLayout>
  );
};

export default EmployerReviews;
