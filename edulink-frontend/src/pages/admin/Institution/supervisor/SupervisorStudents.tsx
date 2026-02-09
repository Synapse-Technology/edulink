import React, { useState } from 'react';
import { Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { Users, FileText, CheckCircle } from 'lucide-react';
import { useOutletContext, Link } from 'react-router-dom';
import { internshipService, type InternshipApplication } from '../../../../services/internship/internshipService';
import { FeedbackModal } from '../../../../components/common';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';
import type { SupervisorDashboardContext } from './SupervisorDashboard';

const SupervisorStudents: React.FC = () => {
  const { internships } = useOutletContext<SupervisorDashboardContext>();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  const handleComplete = async (internship: InternshipApplication) => {
    const isInstitutionPosted = !internship.employer_id;
    const actionText = isInstitutionPosted ? "Recommend for Verification" : "Complete Internship";
    
    showConfirm({
      title: actionText,
      message: `Are you sure you want to ${actionText.toLowerCase()} for this student? This action is irreversible.`,
      onConfirm: async () => {
        try {
          setProcessingId(internship.id);
          await internshipService.processApplication(internship.id, 'COMPLETE');
          showSuccess(
            'Action Successful',
            `${actionText} successful.`
          );
          // Ideally trigger a refresh here, for now reload to see changes
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          console.error("Failed to complete internship", err);
          showError(
            'Action Failed',
            `We encountered an error while trying to ${actionText.toLowerCase()}.`,
            err.message
          );
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const badgeStyle = "px-3 py-2 fw-medium rounded-3 d-inline-flex align-items-center gap-2";
    switch (status) {
      case 'ACTIVE': 
        return (
          <span className={`badge bg-success bg-opacity-10 text-success border border-success-subtle ${badgeStyle}`}>
            <div className="rounded-circle bg-success" style={{width: 6, height: 6}}></div>
            Active
          </span>
        );
      case 'COMPLETED': 
        return (
          <span className={`badge bg-info bg-opacity-10 text-info border border-info-subtle ${badgeStyle}`}>
            <div className="rounded-circle bg-info" style={{width: 6, height: 6}}></div>
            Completed
          </span>
        );
      case 'TERMINATED': 
        return (
          <span className={`badge bg-danger bg-opacity-10 text-danger border border-danger-subtle ${badgeStyle}`}>
             <div className="rounded-circle bg-danger" style={{width: 6, height: 6}}></div>
            Terminated
          </span>
        );
      default: 
        return (
          <span className={`badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle ${badgeStyle}`}>
            <div className="rounded-circle bg-secondary" style={{width: 6, height: 6}}></div>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="supervisor-students">
       {/* Header Section */}
       <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4">
          <div className="mb-4 mb-lg-0">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                <Users size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="h2 fw-bold mb-1">My Students</h1>
                <p className="text-muted mb-0">
                  Manage your assigned students and track their progress
                </p>
              </div>
            </div>
          </div>
       </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Card.Header className="bg-white border-bottom py-3 px-4">
            <h5 className="fw-bold mb-0">Assigned Students</h5>
        </Card.Header>
        <Card.Body className="p-0">
           <div className="table-responsive">
             <Table hover className="table align-middle mb-0">
               <thead className="bg-light">
                 <tr>
                   <th className="border-0 ps-4 py-3 text-muted small text-uppercase fw-semibold">Student</th>
                   <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Internship</th>
                   <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Department</th>
                   <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Status</th>
                   <th className="border-0 pe-4 py-3 text-end text-muted small text-uppercase fw-semibold">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {internships.length > 0 ? (
                   internships.map(internship => (
                     <tr key={internship.id} className="border-top-0 border-bottom">
                       <td className="ps-4 py-3">
                         <div className="d-flex align-items-center">
                            <div className="avatar bg-primary bg-opacity-10 rounded-circle me-3 d-flex align-items-center justify-content-center text-primary fw-bold" style={{width: '40px', height: '40px', fontSize: '1.2rem'}}>
                              {internship.student_info?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <div className="fw-bold text-dark">{internship.student_info?.name || 'Unknown Student'}</div>
                                <small className="text-muted">{internship.student_info?.email}</small>
                            </div>
                         </div>
                       </td>
                       <td className="py-3">
                          <div className="fw-medium text-dark">{internship.title}</div>
                          <Badge bg="light" text="dark" className="border fw-normal mt-1">
                            {!internship.employer_id ? 'Institution Posted' : 'Employer Posted'}
                          </Badge>
                       </td>
                       <td className="py-3 text-muted">
                          {internship.department || '-'}
                       </td>
                       <td className="py-3">{getStatusBadge(internship.status)}</td>
                       <td className="text-end pe-4 py-3">
                         <div className="d-flex justify-content-end gap-2">
                           <Link 
                             to={`/institution/supervisor-dashboard/students/${internship.id}/logbook`} 
                             className="btn btn-sm btn-light border d-flex align-items-center transition-all hover-lift"
                             title="View Logbooks"
                           >
                             <FileText size={14} className="me-2 text-muted" /> 
                             <span className="text-muted fw-medium">Logbooks</span>
                           </Link>

                           {internship.can_complete && (
                             <Button 
                               variant="outline-success" 
                               size="sm"
                               className="d-inline-flex align-items-center gap-2 transition-all hover-lift"
                               disabled={!!processingId}
                               onClick={() => handleComplete(internship)}
                             >
                               {processingId === internship.id ? <Spinner size="sm" animation="border" /> : <CheckCircle size={16} />}
                               {!internship.employer_id ? 'Recommend Verification' : 'Complete'}
                             </Button>
                           )}
                         </div>
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                      <td colSpan={4} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center py-4">
                          <div className="bg-light rounded-circle p-4 mb-3">
                            <Users size={48} className="text-muted opacity-50" />
                          </div>
                          <h5 className="fw-bold text-dark">No Students Assigned</h5>
                          <p className="text-muted mb-0">You don't have any assigned students yet.</p>
                        </div>
                      </td>
                   </tr>
                 )}
               </tbody>
             </Table>
           </div>
        </Card.Body>
      </Card>
      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default SupervisorStudents;
