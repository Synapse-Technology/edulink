import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, Clock, XCircle } from 'lucide-react';
import { internshipService, type SupervisorAssignment } from '../../../../services/internship/internshipService';
import { showToast } from '../../../../utils/toast';
import { dateFormatter } from '../../../../utils/dateFormatter';

const statusClass: Record<SupervisorAssignment['status'], string> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
};

const SupervisorAssignments: React.FC = () => {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['supervisor-assignments'],
    queryFn: () => internshipService.getSupervisorAssignments(),
    staleTime: 1000 * 60,
  });

  const pendingAssignments = useMemo(
    () => data.filter((assignment) => assignment.status === 'PENDING'),
    [data]
  );

  const completedAssignments = useMemo(
    () => data.filter((assignment) => assignment.status !== 'PENDING'),
    [data]
  );

  const refreshAssignments = () => {
    queryClient.invalidateQueries({ queryKey: ['supervisor-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['supervisor-dashboard-data'] });
  };

  const acceptAssignment = async (assignmentId: string) => {
    try {
      setActingId(assignmentId);
      await internshipService.acceptSupervisorAssignment(assignmentId);
      showToast.success('Assignment accepted.');
      refreshAssignments();
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to accept assignment.');
    } finally {
      setActingId(null);
    }
  };

  const rejectAssignment = async (assignmentId: string) => {
    const reason = window.prompt('Reason for rejection, if any') || '';
    try {
      setActingId(assignmentId);
      await internshipService.rejectSupervisorAssignment(assignmentId, reason);
      showToast.success('Assignment rejected.');
      refreshAssignments();
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to reject assignment.');
    } finally {
      setActingId(null);
    }
  };

  const renderAssignment = (assignment: SupervisorAssignment) => {
    const application = assignment.application;
    const studentName = application?.student_info?.name || 'Student';
    const title = application?.title || 'Attachment placement';
    const isPending = assignment.status === 'PENDING';

    return (
      <div key={assignment.id} className="card border-0 shadow-sm mb-3">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className={`badge text-bg-${statusClass[assignment.status]}`}>
                  {assignment.status}
                </span>
                <span className="small text-muted">{assignment.assignment_type.toLowerCase()} supervisor</span>
              </div>
              <h3 className="h5 mb-1">{studentName}</h3>
              <p className="text-muted mb-2">{title}</p>
              <div className="d-flex flex-wrap gap-3 small text-muted">
                <span>Assigned {dateFormatter.shortDate(assignment.assigned_at || assignment.created_at)}</span>
                <span>Placement status {application?.status || 'Unknown'}</span>
              </div>
            </div>

            {isPending ? (
              <div className="d-flex flex-wrap align-items-start gap-2">
                <button
                  type="button"
                  className="btn btn-success btn-sm d-inline-flex align-items-center gap-2"
                  disabled={actingId === assignment.id}
                  onClick={() => acceptAssignment(assignment.id)}
                >
                  <CheckCircle2 size={16} />
                  Accept
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-2"
                  disabled={actingId === assignment.id}
                  onClick={() => rejectAssignment(assignment.id)}
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            ) : (
              <div className="small text-muted">
                {assignment.status === 'ACCEPTED' && assignment.accepted_at
                  ? `Accepted ${dateFormatter.shortDate(assignment.accepted_at)}`
                  : assignment.rejection_reason || 'No further action required'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container-fluid px-3 px-lg-5 py-4">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-muted">Loading assignments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
      <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-4">
        <div>
          <div className="text-uppercase small fw-semibold text-primary d-flex align-items-center gap-2 mb-2">
            <ClipboardCheck size={16} />
            Assignment inbox
          </div>
          <h1 className="h3 mb-2">Supervisor Assignments</h1>
          <p className="text-muted mb-0">
            Accept or reject placement supervision requests before students appear in your active review queue.
          </p>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-body py-3 px-4 d-flex align-items-center gap-3">
            <Clock size={18} className="text-warning" />
            <div>
              <div className="fw-semibold">{pendingAssignments.length}</div>
              <div className="small text-muted">Pending</div>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-4">
        <h2 className="h5 mb-3">Pending Review</h2>
        {pendingAssignments.length > 0 ? (
          pendingAssignments.map(renderAssignment)
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 text-muted">No pending assignments.</div>
          </div>
        )}
      </section>

      <section>
        <h2 className="h5 mb-3">Recent Decisions</h2>
        {completedAssignments.length > 0 ? (
          completedAssignments.slice(0, 8).map(renderAssignment)
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 text-muted">No accepted or rejected assignments yet.</div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SupervisorAssignments;
