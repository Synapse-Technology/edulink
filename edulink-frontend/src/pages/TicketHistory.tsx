import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportService } from '../services/support/supportService';
import { useFeedbackModal } from '../hooks/useFeedbackModal';
import { FeedbackModal } from '../components/common';
import { usePusher } from '../hooks/usePusher';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const TicketHistory: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { feedbackProps } = useFeedbackModal();

  // Fetch tickets with TanStack Query
  const { data: tickets, isLoading: loading, isError } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => supportService.getTickets(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time updates via Pusher
  const handleRealtimeUpdate = useCallback(() => {
    // Refresh the list when any ticket is updated
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }, [queryClient]);

  // Listen for updates on any ticket the user owns
  // Note: We could listen on a user-specific channel or global-support channel
  // Since this is the history page, we'll listen on the user channel for general updates
  usePusher(
    user ? `user-${user.id}` : undefined,
    'notification-received',
    handleRealtimeUpdate
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-info-subtle text-info border-info-subtle';
      case 'IN_PROGRESS': return 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
      case 'RESOLVED': return 'bg-success-subtle text-success border-success-subtle';
      case 'CLOSED': return 'bg-secondary-subtle text-secondary border-secondary-subtle';
      default: return 'bg-light text-dark border-light-subtle';
    }
  };

  return (
    <div className="container py-5">
      <div className="row mb-5">
        <div className="col-md-8">
          <h1 className="display-5 fw-bold text-dark mb-2">Support History</h1>
          <p className="lead text-muted">Track your active requests and view past resolutions in one place.</p>
        </div>
        <div className="col-md-4 d-flex align-items-center justify-content-md-end mt-3 mt-md-0">
          <Link to="/support" className="btn btn-primary btn-lg rounded-pill px-4 shadow-sm">
            <i className="bi bi-plus-circle me-2"></i>New Support Ticket
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '300px' }}>
          <div className="spinner-grow text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="alert alert-danger text-center py-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Failed to load your support history. Please try again later.
        </div>
      ) : tickets?.length === 0 ? (
        <div className="card shadow-lg border-0 rounded-4 overflow-hidden text-center py-5">
          <div className="card-body py-5">
            <div className="mb-4">
              <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle p-4" style={{ width: '100px', height: '100px' }}>
                <i className="bi bi-ticket-perforated display-4 text-primary"></i>
              </div>
            </div>
            <h3 className="fw-bold mb-2">No active tickets</h3>
            <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
              You don't have any support requests yet. If you're experiencing issues, our team is here to help!
            </p>
            <Link to="/support" className="btn btn-primary rounded-pill px-4">Create your first ticket</Link>
          </div>
        </div>
      ) : (
        <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
          <div className="table-responsive" style={{ maxHeight: '600px' }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light text-muted small text-uppercase fw-bold">
                <tr>
                  <th className="ps-4 py-3">Reference</th>
                  <th className="py-3">Subject & Priority</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Timeline</th>
                  <th className="pe-4 py-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="border-top-0">
                {tickets?.map((ticket) => (
                  <tr key={ticket.id} className="transition-all hover-bg-light">
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary-subtle text-primary rounded-3 p-2 me-3 d-none d-sm-block">
                          <i className="bi bi-hash"></i>
                        </div>
                        <span className="fw-bold text-dark">{ticket.tracking_code}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{ticket.subject}</div>
                      <div className="d-flex align-items-center mt-1">
                        <span className={`badge rounded-pill me-2 px-2 py-1 ${
                          ticket.priority === 'URGENT' ? 'bg-danger-subtle text-danger' : 
                          ticket.priority === 'HIGH' ? 'bg-warning-subtle text-warning-emphasis' : 
                          'bg-light text-muted'
                        }`} style={{ fontSize: '0.7rem' }}>
                          {ticket.priority}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge rounded-pill bg-light text-secondary border px-3 py-2 fw-medium">
                        {ticket.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge rounded-pill px-3 py-2 border fw-semibold ${getStatusBadgeClass(ticket.status)}`}>
                        <i className={`bi bi-circle-fill me-1 small`}></i>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="small text-dark fw-medium">
                        Created: {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="small text-muted mt-1">
                        Updated: {format(new Date(ticket.updated_at), 'MMM d, h:mm a')}
                      </div>
                    </td>
                    <td className="pe-4 text-end">
                      <Link 
                        to={`/support/tickets/${ticket.tracking_code}`} 
                        className="btn btn-sm btn-light border rounded-pill px-3 fw-bold text-primary shadow-sm"
                      >
                        View Ticket
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default TicketHistory;
