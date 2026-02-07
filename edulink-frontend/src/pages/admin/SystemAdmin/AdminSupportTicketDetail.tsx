import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportService } from '../../../services/support/supportService';

import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';
import { usePusher } from '../../../hooks/usePusher';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AdminLayout from '../../../components/admin/AdminLayout';

const AdminSupportTicketDetail: React.FC = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { feedbackProps, showError, showConfirm, showSuccess } = useFeedbackModal();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch ticket with TanStack Query for better caching and sync
  const { data: ticket, isLoading: loading } = useQuery({
    queryKey: ['admin-ticket', trackingCode],
    queryFn: () => supportService.getTicketByCode(trackingCode!),
    enabled: !!trackingCode,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time updates via Pusher
  const handleRealtimeUpdate = useCallback(() => {
    // Invalidate the query to fetch the latest state
    queryClient.invalidateQueries({ queryKey: ['admin-ticket', trackingCode] });
    // Also invalidate the main tickets list
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
  }, [queryClient, trackingCode]);

  usePusher(
    trackingCode ? `ticket-${trackingCode}` : undefined,
    'ticket-updated',
    handleRealtimeUpdate
  );

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.communications]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await supportService.replyToTicket(trackingCode!, replyMessage, isInternal);
      
      // Invalidate queries instead of manual state management for consistency
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', trackingCode] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      
      setReplyMessage('');
      setIsInternal(false);
      toast.success(isInternal ? 'Internal note added' : 'Reply sent to user');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = () => {
    showConfirm({
      title: 'Resolve Ticket',
      message: 'Please provide resolution notes for this ticket.',
      onConfirm: async () => {
        // This is a simplified prompt-based resolution for now
        const notes = prompt('Enter resolution notes:');
        if (notes === null) return;
        
        try {
          await supportService.resolveTicket(trackingCode!, notes);
          
          // Invalidate queries to refresh the ticket state
          queryClient.invalidateQueries({ queryKey: ['admin-ticket', trackingCode] });
          queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
          
          showSuccess('Ticket Resolved', 'The ticket has been marked as resolved and the user has been notified.');
        } catch (error: any) {
          showError('Action Failed', 'Could not resolve ticket.', error.message);
        }
      }
    });
  };

  if (loading) return <AdminLayout><div className="text-center py-5"><div className="spinner-border text-primary"></div></div></AdminLayout>;
  if (!ticket) return <AdminLayout><div className="p-4"><h3>Ticket not found</h3><Link to="/admin/support">Back to Management</Link></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-4">
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/admin/support">Support Management</Link></li>
            <li className="breadcrumb-item active">{ticket.tracking_code}</li>
          </ol>
        </nav>

        <div className="row">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3 px-4">
                <h5 className="mb-0">{ticket.subject}</h5>
                <div className="d-flex gap-2">
                  {ticket.status !== 'RESOLVED' && (
                    <button onClick={handleResolve} className="btn btn-success btn-sm">
                      <i className="bi bi-check-circle me-1"></i> Resolve Ticket
                    </button>
                  )}
                  <span className={`badge ${ticket.status === 'OPEN' ? 'bg-info' : ticket.status === 'RESOLVED' ? 'bg-success' : 'bg-warning'}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="chat-container bg-light rounded p-3 mb-4" style={{ height: '500px', overflowY: 'auto' }}>
                  {ticket.communications.map((comm) => (
                    <div 
                      key={comm.id} 
                      className={`d-flex mb-3 ${comm.is_staff ? 'justify-content-end' : 'justify-content-start'}`}
                    >
                      <div 
                        className={`p-3 rounded shadow-sm ${
                          comm.is_internal ? 'bg-warning-subtle border-warning border' : 
                          comm.is_staff ? 'bg-primary text-white' : 'bg-white border'
                        }`}
                        style={{ maxWidth: '85%' }}
                      >
                        <div className="d-flex justify-content-between mb-1 small">
                          <span className="fw-bold">
                            {comm.is_internal ? 'INTERNAL NOTE' : comm.sender_name || 'User'}
                            {comm.is_staff && !comm.is_internal && ' (Staff)'}
                          </span>
                          <span className="ms-3 opacity-75">
                            {format(new Date(comm.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{comm.message}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {ticket.status !== 'RESOLVED' && (
                  <form onSubmit={handleReply}>
                    <div className="form-group mb-3">
                      <textarea 
                        className={`form-control ${isInternal ? 'bg-warning-subtle' : ''}`} 
                        rows={4} 
                        placeholder={isInternal ? "Add an internal note (only staff can see)..." : "Type your reply to the user..."}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="internalCheck" 
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                        />
                        <label className="form-check-label small" htmlFor="internalCheck">
                          Internal Note (Hidden from user)
                        </label>
                      </div>
                      <button 
                        type="submit" 
                        className={`btn ${isInternal ? 'btn-warning' : 'btn-primary'} px-4`}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white fw-bold py-3">User Information</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="text-muted small text-uppercase fw-bold d-block">Name</label>
                  <span>{ticket.name}</span>
                </div>
                <div className="mb-3">
                  <label className="text-muted small text-uppercase fw-bold d-block">Email</label>
                  <a href={`mailto:${ticket.email}`} className="text-decoration-none">{ticket.email}</a>
                </div>
                {ticket.related_entity_type && (
                  <div className="mb-0">
                    <label className="text-muted small text-uppercase fw-bold d-block">Related Entity</label>
                    <span className="small text-muted">{ticket.related_entity_type}</span>
                    <div className="small mt-1 text-truncate">{ticket.related_entity_id}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white fw-bold py-3">Ticket Details</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="text-muted small text-uppercase fw-bold d-block">Tracking Code</label>
                  <span className="fw-bold text-primary">{ticket.tracking_code}</span>
                </div>
                <div className="mb-3">
                  <label className="text-muted small text-uppercase fw-bold d-block">Category</label>
                  <span className="badge bg-light text-dark border">{ticket.category}</span>
                </div>
                <div className="mb-3">
                  <label className="text-muted small text-uppercase fw-bold d-block">Priority</label>
                  <span className={`fw-bold ${ticket.priority === 'URGENT' ? 'text-danger' : 'text-dark'}`}>
                    {ticket.priority}
                  </span>
                </div>
                {ticket.attachments.length > 0 && (
                  <div className="mb-0">
                    <label className="text-muted small text-uppercase fw-bold d-block mb-2">Attachments</label>
                    <div className="list-group list-group-flush">
                      {ticket.attachments.map((file) => (
                        <a 
                          key={file.id} 
                          href={file.file} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action px-0 py-2 border-0 d-flex align-items-center"
                        >
                          <i className="bi bi-file-earmark-arrow-down me-2 text-primary"></i>
                          <span className="text-truncate small">{file.file_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <FeedbackModal {...feedbackProps} />
    </AdminLayout>
  );
};

export default AdminSupportTicketDetail;
