import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportService } from '../services/support/supportService';
import type { SupportTicket, TicketCommunication } from '../services/support/supportService';
import { useFeedbackModal } from '../hooks/useFeedbackModal';
import { FeedbackModal } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { usePusher } from '../hooks/usePusher';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TicketDetail: React.FC = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const { feedbackProps } = useFeedbackModal();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch ticket with TanStack Query
  const { data: ticket, isLoading: loading } = useQuery({
    queryKey: ['ticket', trackingCode],
    queryFn: () => supportService.getTicketByCode(trackingCode!),
    enabled: !!trackingCode,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time updates via Pusher
  const handleRealtimeUpdate = useCallback(() => {
    // Invalidate the query to fetch the latest state (new messages, status changes)
    queryClient.invalidateQueries({ queryKey: ['ticket', trackingCode] });
  }, [queryClient, trackingCode]);

  usePusher(
    trackingCode ? `ticket-${trackingCode}` : undefined,
    'ticket-updated',
    handleRealtimeUpdate
  );

  // Mutation for replying with Optimistic Updates
  const replyMutation = useMutation({
    mutationFn: (message: string) => supportService.replyToTicket(trackingCode!, message),
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['ticket', trackingCode] });

      // Snapshot the previous value
      const previousTicket = queryClient.getQueryData<SupportTicket>(['ticket', trackingCode]);

      // Optimistically update to the new value
      if (previousTicket) {
        const optimisticComm: TicketCommunication = {
          id: `temp-${Date.now()}`,
          sender_name: user ? (`${user.firstName} ${user.lastName}`.trim() || user.email) : 'You',
          message: newMessage,
          is_internal: false,
          is_staff: false,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData(['ticket', trackingCode], {
          ...previousTicket,
          status: 'IN_PROGRESS',
          communications: [...previousTicket.communications, optimisticComm],
        });
      }

      return { previousTicket };
    },
    onError: (_err, _newMessage, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', trackingCode], context.previousTicket);
      }
      toast.error('Failed to send message');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct server state
      queryClient.invalidateQueries({ queryKey: ['ticket', trackingCode] });
    },
    onSuccess: () => {
      setReplyMessage('');
      toast.success('Message sent');
    }
  });

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.communications]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || replyMutation.isPending) return;
    replyMutation.mutate(replyMessage);
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '400px' }}>
      <div className="spinner-grow text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );

  if (!ticket) return (
    <div className="container py-5 text-center">
      <div className="mb-4">
        <i className="bi bi-exclamation-circle display-1 text-muted"></i>
      </div>
      <h3 className="fw-bold">Ticket not found</h3>
      <p className="text-muted mb-4">The ticket you're looking for doesn't exist or has been removed.</p>
      <Link to="/support/history" className="btn btn-primary rounded-pill px-4">
        Back to Support History
      </Link>
    </div>
  );

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="container">
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb bg-transparent p-0">
            <li className="breadcrumb-item"><Link to="/support/history" className="text-decoration-none text-muted">Support History</Link></li>
            <li className="breadcrumb-item active fw-bold text-dark">{ticket.tracking_code}</li>
          </ol>
        </nav>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden h-100 d-flex flex-column">
              <div className="card-header bg-white border-bottom p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div className="bg-primary-subtle text-primary rounded-circle p-3 me-3">
                      <i className="bi bi-chat-dots-fill fs-4"></i>
                    </div>
                    <div>
                      <h4 className="fw-bold mb-0 text-dark">{ticket.subject}</h4>
                      <div className="d-flex align-items-center mt-1">
                        <span className={`badge rounded-pill px-3 py-1 me-2 border ${
                          ticket.status === 'RESOLVED' ? 'bg-success-subtle text-success border-success-subtle' : 
                          'bg-primary-subtle text-primary border-primary-subtle'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <small className="text-muted">
                          Opened {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card-body p-0 d-flex flex-column flex-grow-1" style={{ minHeight: '500px' }}>
                <div className="flex-grow-1 p-4 overflow-auto" style={{ maxHeight: '500px', backgroundColor: '#f8f9fa' }}>
                  {ticket.communications.map((comm) => (
                    <div 
                      key={comm.id} 
                      className={`d-flex mb-4 ${comm.is_staff ? 'justify-content-start' : 'justify-content-end'}`}
                    >
                      {comm.is_staff && (
                        <div className="flex-shrink-0 me-3 mt-auto mb-1">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px' }}>
                            <i className="bi bi-headset small"></i>
                          </div>
                        </div>
                      )}
                      
                      <div 
                        className={`p-3 rounded-4 shadow-sm position-relative ${
                          comm.is_staff ? 'bg-white border-light-subtle rounded-bottom-start-0' : 'bg-primary text-white rounded-bottom-end-0'
                        }`}
                        style={{ maxWidth: '75%' }}
                      >
                        <div className="d-flex flex-column">
                          <div className={`fw-bold small mb-1 ${comm.is_staff ? 'text-primary' : 'text-white'}`} style={{ fontSize: '0.75rem' }}>
                            {comm.is_staff ? (ticket.assigned_to_name || 'Support Staff') : 'You'}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{comm.message}</div>
                          <div className={`mt-2 small text-end ${comm.is_staff ? 'text-muted' : 'text-white-50'}`} style={{ fontSize: '0.7rem' }}>
                            {format(new Date(comm.created_at), 'h:mm a')}
                          </div>
                        </div>
                      </div>

                      {!comm.is_staff && (
                        <div className="flex-shrink-0 ms-3 mt-auto mb-1">
                          <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px' }}>
                            <i className="bi bi-person-fill small"></i>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-white border-top">
                  {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' ? (
                    <form onSubmit={handleReply}>
                      <div className="input-group shadow-sm rounded-4 overflow-hidden border">
                        <textarea 
                          className="form-control border-0 py-3 px-4 shadow-none" 
                          rows={1} 
                          style={{ resize: 'none' }}
                          placeholder="Type your message here..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(e as any);
                            }
                          }}
                          required
                        ></textarea>
                        <button 
                          type="submit" 
                          className="btn btn-primary border-0 px-4 d-flex align-items-center justify-content-center"
                          disabled={replyMutation.isPending || !replyMessage.trim()}
                        >
                          {replyMutation.isPending ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <i className="bi bi-send-fill fs-5"></i>
                          )}
                        </button>
                      </div>
                      <div className="mt-2 text-muted small ps-2">
                        Press Enter to send, Shift + Enter for new line
                      </div>
                    </form>
                  ) : (
                    <div className="alert alert-info border-0 rounded-4 d-flex align-items-center mb-0 shadow-sm">
                      <i className="bi bi-info-circle-fill me-3 fs-4"></i>
                      <div>
                        This ticket is marked as <strong>{ticket.status}</strong>. 
                        Please create a new ticket if you need more help.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-lg border-0 rounded-4 mb-4 overflow-hidden">
              <div className="card-header bg-white border-bottom py-3 px-4">
                <h5 className="fw-bold mb-0 text-dark">Ticket Information</h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1">Reference Code</label>
                  <div className="d-flex align-items-center">
                    <span className="fw-bold text-primary fs-5">{ticket.tracking_code}</span>
                    <button 
                      className="btn btn-link btn-sm text-muted p-0 ms-2"
                      onClick={() => {
                        navigator.clipboard.writeText(ticket.tracking_code);
                        toast.success('Code copied!');
                      }}
                    >
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="text-muted small text-uppercase fw-bold d-block mb-1">Category</label>
                    <span className="badge bg-light text-dark border px-3 py-2 w-100">{ticket.category}</span>
                  </div>
                  <div className="col-6">
                    <label className="text-muted small text-uppercase fw-bold d-block mb-1">Priority</label>
                    <span className={`badge px-3 py-2 w-100 border ${
                      ticket.priority === 'URGENT' ? 'bg-danger-subtle text-danger border-danger-subtle' : 
                      'bg-light text-dark border-light-subtle'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>

                {ticket.assigned_to_name && (
                  <div className="mb-4 p-3 bg-light rounded-3 border border-light-subtle">
                    <label className="text-muted small text-uppercase fw-bold d-block mb-1">Assigned Agent</label>
                    <div className="d-flex align-items-center mt-2">
                      <div className="bg-white rounded-circle p-2 me-2 shadow-sm">
                        <i className="bi bi-person-check text-primary"></i>
                      </div>
                      <span className="fw-bold text-dark">{ticket.assigned_to_name}</span>
                    </div>
                  </div>
                )}

                {ticket.attachments.length > 0 && (
                  <div>
                    <label className="text-muted small text-uppercase fw-bold d-block mb-2">Files & Documents</label>
                    <div className="list-group list-group-flush border rounded-3 overflow-hidden">
                      {ticket.attachments.map((file) => (
                        <a 
                          key={file.id} 
                          href={file.file} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="list-group-item list-group-item-action border-light-subtle py-3 d-flex align-items-center transition-all"
                        >
                          <div className="bg-primary-subtle text-primary rounded-3 p-2 me-3">
                            <i className="bi bi-file-earmark-arrow-down fs-5"></i>
                          </div>
                          <div className="text-truncate">
                            <div className="text-dark fw-medium small text-truncate">{file.file_name}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>Click to view</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {ticket.status === 'RESOLVED' && ticket.resolution_notes && (
              <div className="card shadow-lg border-0 rounded-4 overflow-hidden border-start border-4 border-success">
                <div className="card-header bg-success text-white py-3 px-4">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <h5 className="fw-bold mb-0">Resolution Notes</h5>
                  </div>
                </div>
                <div className="card-body p-4 bg-success-subtle bg-opacity-10">
                  <p className="mb-3 text-dark-emphasis">{ticket.resolution_notes}</p>
                  <div className="pt-3 border-top border-success border-opacity-25 d-flex justify-content-between align-items-center">
                    <span className="small text-success fw-bold">Issue Resolved</span>
                    <span className="small text-muted">{format(new Date(ticket.resolved_at!), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <FeedbackModal {...feedbackProps} />
    </div>
  );
};

export default TicketDetail;
