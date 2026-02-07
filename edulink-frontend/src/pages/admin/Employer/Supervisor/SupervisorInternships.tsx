import React, { useState, useEffect } from 'react';
import { Table, Badge, Alert } from 'react-bootstrap';
import { Users, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { InternshipApplication } from '../../../../services/internship/internshipService';
import { Link } from 'react-router-dom';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';
import { toast } from 'react-hot-toast';
import { FeedbackModal } from '../../../../components/common';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';

const SupervisorInternships: React.FC = () => {
  const [internships, setInternships] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  useEffect(() => {
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getApplications();
      setInternships(data);
    } catch (err: any) {
      console.error("Failed to fetch internships", err);
      setError("Failed to load internships.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    showConfirm({
      title: 'Complete Internship',
      message: 'Are you sure you want to mark this internship as completed? This will allow the student to generate their certificate and is irreversible.',
      onConfirm: async () => {
        try {
          await internshipService.processApplication(id, 'COMPLETE');
          showSuccess('Internship Completed', "The internship has been marked as completed successfully!");
          fetchInternships(); // Refresh list
        } catch (err: any) {
          const message = err.response?.data?.detail || "Failed to complete internship. Ensure there is at least one accepted logbook.";
          showError('Completion Failed', "We could not mark the internship as completed.", message);
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': 
        return (
          <Badge bg="success" className="bg-success bg-opacity-10 text-success border border-success-subtle px-3 py-2 fw-medium rounded-3">
            Active
          </Badge>
        );
      case 'COMPLETED': 
        return (
          <Badge bg="info" className="bg-info bg-opacity-10 text-info border border-info-subtle px-3 py-2 fw-medium rounded-3">
            Completed
          </Badge>
        );
      case 'TERMINATED': 
        return (
          <Badge bg="danger" className="bg-danger bg-opacity-10 text-danger border border-danger-subtle px-3 py-2 fw-medium rounded-3">
            Terminated
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
      <SupervisorLayout>
        <SupervisorTableSkeleton />
      </SupervisorLayout>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <SupervisorLayout>
      <div className="container-fluid px-4 px-lg-5 py-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-5">
          <div className="mb-4 mb-lg-0">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                <Users size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="h2 fw-bold mb-1">My Interns</h1>
                <p className="text-muted mb-0">
                  Manage your assigned students and track their progress
                </p>
              </div>
            </div>
          </div>
        </div>
      
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 pt-4 pb-3 px-4">
            <h5 className="fw-bold mb-1">Assigned Students</h5>
            <p className="text-muted small mb-0">List of all interns currently under your supervision</p>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <Table hover className="table align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 ps-4 py-3 text-muted small text-uppercase fw-semibold">Student</th>
                    <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Internship Title</th>
                    <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Department</th>
                    <th className="border-0 py-3 text-muted small text-uppercase fw-semibold">Status</th>
                    <th className="border-0 pe-4 py-3 text-end text-muted small text-uppercase fw-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {internships.length > 0 ? (
                    internships.map((internship) => (
                      <tr key={internship.id} className="border-top">
                        <td className="ps-4 py-3">
                          <div className="d-flex align-items-center">
                            <div className="avatar bg-primary bg-opacity-10 rounded-circle me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                              <span className="fw-bold text-primary">{internship.student_info?.name?.charAt(0) || 'U'}</span>
                            </div>
                            <div>
                              <div className="fw-bold text-dark">{internship.student_info?.name || 'Unknown'}</div>
                              <div className="small text-muted">{internship.student_info?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="fw-medium text-dark">{internship.title}</div>
                        </td>
                        <td className="py-3 text-muted">{internship.department || '-'}</td>
                        <td className="py-3">{getStatusBadge(internship.status)}</td>
                        <td className="text-end pe-4 py-3">
                           <div className="d-flex justify-content-end gap-2">
                             {internship.can_complete && (
                               <button 
                                 onClick={() => handleComplete(internship.id)}
                                 className="btn btn-sm btn-success d-flex align-items-center transition-all hover-lift"
                                 title="Mark as Completed"
                               >
                                 <CheckCircle size={14} className="me-2" />
                                 <span className="fw-medium">Complete</span>
                               </button>
                             )}
                             <Link 
                               to={`/employer/supervisor/internships/${internship.id}/logbook`}
                               className="btn btn-sm btn-light border d-flex align-items-center transition-all hover-lift"
                               title="View Logbooks"
                             >
                               <FileText size={14} className="me-2 text-muted" /> 
                               <span className="text-muted fw-medium">Logbooks</span>
                             </Link>
                             <Link 
                               to="/employer/supervisor/incidents" 
                               className="btn btn-sm btn-light border d-flex align-items-center transition-all hover-lift text-danger"
                               title="Report Incident"
                             >
                               <AlertTriangle size={14} className="me-2" />
                               <span className="fw-medium">Report</span>
                             </Link>
                           </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center">
                          <div className="bg-light rounded-circle p-4 mb-3">
                            <Users size={48} className="text-muted opacity-50" />
                          </div>
                          <h5 className="fw-bold text-dark">No Interns Assigned</h5>
                          <p className="text-muted mb-0">You don't have any assigned students yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
      <FeedbackModal {...feedbackProps} />
      
      <style>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .transition-all {
          transition: all 0.2s ease;
        }
      `}</style>
    </SupervisorLayout>
  );
};

export default SupervisorInternships;
