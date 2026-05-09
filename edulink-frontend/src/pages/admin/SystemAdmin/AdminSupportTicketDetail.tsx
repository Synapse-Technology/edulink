import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Hash,
  Inbox,
  LifeBuoy,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supportService } from '../../../services/support/supportService';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';
import { usePusher } from '../../../hooks/usePusher';
import AdminLayout from '../../../components/admin/AdminLayout';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const AdminSupportTicketDetail: React.FC = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const queryClient = useQueryClient();

  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { feedbackProps, showError, showConfirm, showSuccess } =
    useFeedbackModal();

  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading: loading } = useQuery({
    queryKey: ['admin-ticket', trackingCode],
    queryFn: () => supportService.getTicketByCode(trackingCode!),
    enabled: !!trackingCode,
    staleTime: 1000 * 60 * 5,
  });

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-ticket', trackingCode] });
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
  }, [queryClient, trackingCode]);

  usePusher(
    trackingCode ? `ticket-${trackingCode}` : undefined,
    'ticket-updated',
    handleRealtimeUpdate,
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.communications]);

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!replyMessage.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      await supportService.replyToTicket(
        trackingCode!,
        replyMessage,
        isInternal,
      );

      queryClient.invalidateQueries({ queryKey: ['admin-ticket', trackingCode] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });

      setReplyMessage('');
      setIsInternal(false);

      toast.success(isInternal ? 'Internal note added.' : 'Reply sent to user.');
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);
      toast.error(sanitized.userMessage || 'Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = () => {
    showConfirm({
      title: 'Resolve Ticket',
      message: 'Please provide resolution notes for this ticket.',
      onConfirm: async () => {
        const notes = prompt('Enter resolution notes:');

        if (notes === null) return;

        try {
          await supportService.resolveTicket(trackingCode!, notes);

          queryClient.invalidateQueries({
            queryKey: ['admin-ticket', trackingCode],
          });
          queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });

          showSuccess(
            'Ticket Resolved',
            'The ticket has been marked as resolved and the user has been notified.',
          );
        } catch (error: any) {
          const sanitized = sanitizeAdminError(error);

          showError(
            'Action Failed',
            'Could not resolve ticket.',
            sanitized.details,
          );
        }
      },
    });
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', className: 'status-info' };
      case 'IN_PROGRESS':
        return { label: 'In progress', className: 'status-warning' };
      case 'RESOLVED':
        return { label: 'Resolved', className: 'status-success' };
      case 'CLOSED':
        return { label: 'Closed', className: 'status-muted' };
      default:
        return { label: status, className: 'status-muted' };
    }
  };

  const getPriorityMeta = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { label: 'Urgent', className: 'priority-danger' };
      case 'HIGH':
        return { label: 'High', className: 'priority-warning' };
      case 'MEDIUM':
        return { label: 'Medium', className: 'priority-info' };
      default:
        return { label: priority || 'Low', className: 'priority-muted' };
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="ticket-loading">
          <LifeBuoy size={26} />
          <span>Loading support case...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="ticket-not-found">
          <AlertTriangle size={28} />
          <h2>Ticket not found</h2>
          <Link to="/admin/support">Back to support queue</Link>
        </div>
      </AdminLayout>
    );
  }

  const status = getStatusMeta(ticket.status);
  const priority = getPriorityMeta(ticket.priority);
  const isResolved = ticket.status === 'RESOLVED';

  return (
    <AdminLayout>
      <div className="ticket-detail-page">
        <div className="ticket-breadcrumb">
          <Link to="/admin/support">
            <ArrowLeft size={15} />
            Support queue
          </Link>

          <span>/</span>
          <strong>{ticket.tracking_code}</strong>
        </div>

        <header className="ticket-header">
          <div>
            <span className="ticket-kicker">
              <LifeBuoy size={14} />
              Support case workspace
            </span>

            <h1>{ticket.subject}</h1>

            <p>
              Review requester context, conversation history, attachments,
              internal notes, and resolution state for this support case.
            </p>
          </div>

          <div className="ticket-header-actions">
            <span className={`ticket-status ${status.className}`}>
              {status.label}
            </span>

            <span className={`ticket-priority ${priority.className}`}>
              {priority.label}
            </span>

            {!isResolved && (
              <button type="button" className="ticket-btn success" onClick={handleResolve}>
                <CheckCircle2 size={16} />
                Resolve ticket
              </button>
            )}
          </div>
        </header>

        <section className="ticket-signal-grid">
          <article>
            <div className="signal-icon neutral">
              <Hash size={20} />
            </div>
            <strong>{ticket.tracking_code}</strong>
            <span>Tracking code</span>
          </article>

          <article>
            <div className="signal-icon blue">
              <MessageSquare size={20} />
            </div>
            <strong>{ticket.communications.length}</strong>
            <span>Conversation entries</span>
          </article>

          <article>
            <div className="signal-icon amber">
              <Paperclip size={20} />
            </div>
            <strong>{ticket.attachments.length}</strong>
            <span>Attachments</span>
          </article>

          <article>
            <div className="signal-icon green">
              <Clock size={20} />
            </div>
            <strong>{format(new Date(ticket.created_at), 'MMM d')}</strong>
            <span>Created</span>
          </article>
        </section>

        <div className="ticket-layout">
          <main className="ticket-main">
            <section className="conversation-panel">
              <div className="panel-header">
                <div>
                  <span>Conversation timeline</span>
                  <h2>Messages and notes</h2>
                </div>

                <span className="live-pill">
                  <Inbox size={13} />
                  Realtime sync
                </span>
              </div>

              <div className="conversation-list">
                {ticket.communications.map((comm) => (
                  <article
                    key={comm.id}
                    className={`message-item ${
                      comm.is_internal
                        ? 'internal'
                        : comm.is_staff
                          ? 'staff'
                          : 'user'
                    }`}
                  >
                    <div className="message-meta">
                      <strong>
                        {comm.is_internal
                          ? 'Internal note'
                          : comm.sender_name || 'User'}
                        {comm.is_staff && !comm.is_internal ? ' · Staff' : ''}
                      </strong>

                      <span>{format(new Date(comm.created_at), 'MMM d, h:mm a')}</span>
                    </div>

                    <p>{comm.message}</p>
                  </article>
                ))}

                <div ref={chatEndRef} />
              </div>

              {!isResolved ? (
                <form onSubmit={handleReply} className="reply-composer">
                  <div className={`composer-box ${isInternal ? 'internal' : ''}`}>
                    <textarea
                      rows={5}
                      placeholder={
                        isInternal
                          ? 'Add an internal note. Only staff can see this...'
                          : 'Write a clear reply to the user...'
                      }
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      required
                    />

                    <div className="composer-footer">
                      <label className="internal-toggle">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(event) => setIsInternal(event.target.checked)}
                        />

                        <span>
                          <Lock size={14} />
                          Internal note
                        </span>
                      </label>

                      <button
                        type="submit"
                        className={isInternal ? 'ticket-btn warning' : 'ticket-btn primary'}
                        disabled={isSubmitting}
                      >
                        <Send size={15} />
                        {isSubmitting
                          ? 'Sending...'
                          : isInternal
                            ? 'Add note'
                            : 'Send reply'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="resolved-state">
                  <CheckCircle2 size={18} />
                  This ticket is resolved. Replies are disabled unless the case is reopened.
                </div>
              )}
            </section>
          </main>

          <aside className="ticket-sidebar">
            <section className="side-card">
              <div className="side-card-header">
                <User size={16} />
                <h3>Requester</h3>
              </div>

              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{ticket.name}</dd>
                </div>

                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${ticket.email}`}>{ticket.email}</a>
                  </dd>
                </div>
              </dl>
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <ShieldCheck size={16} />
                <h3>Case details</h3>
              </div>

              <dl>
                <div>
                  <dt>Category</dt>
                  <dd>
                    <span className="detail-pill">{ticket.category}</span>
                  </dd>
                </div>

                <div>
                  <dt>Priority</dt>
                  <dd>
                    <span className={`ticket-priority ${priority.className}`}>
                      {priority.label}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`ticket-status ${status.className}`}>
                      {status.label}
                    </span>
                  </dd>
                </div>

                {ticket.related_entity_type && (
                  <div>
                    <dt>Related entity</dt>
                    <dd>
                      <span className="entity-ref">
                        {ticket.related_entity_type}
                        <small>{ticket.related_entity_id}</small>
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="side-card">
              <div className="side-card-header">
                <Paperclip size={16} />
                <h3>Attachments</h3>
              </div>

              {ticket.attachments.length > 0 ? (
                <div className="attachment-list">
                  {ticket.attachments.map((file) => (
                    <a
                      key={file.id}
                      href={file.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attachment-item"
                    >
                      <FileText size={15} />
                      <span>{file.file_name}</span>
                      <Download size={14} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">No attachments submitted.</p>
              )}
            </section>

            <section className="side-card warning">
              <div className="side-card-header">
                <AlertTriangle size={16} />
                <h3>Handling guidance</h3>
              </div>

              <p>
                Prioritize account access blockers, active placement issues,
                affiliation disputes, and urgent technical failures. Keep internal
                notes factual for audit review.
              </p>
            </section>
          </aside>
        </div>
      </div>

      <FeedbackModal {...feedbackProps} />

      <style>{`
        .ticket-detail-page {
          color: #111827;
        }

        .ticket-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          color: #64748b;
          font-size: .84rem;
          font-weight: 750;
        }

        .ticket-breadcrumb a {
          color: #334155;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ticket-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 18px;
        }

        .ticket-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .ticket-kicker svg {
          color: #047857;
        }

        .ticket-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.7rem, 3vw, 2.45rem);
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .ticket-header p {
          max-width: 760px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .ticket-header-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .ticket-btn {
          min-height: 40px;
          border-radius: 12px;
          padding: 0 14px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          cursor: pointer;
        }

        .ticket-btn.primary {
          background: #0f172a;
          color: #ffffff;
        }

        .ticket-btn.success {
          background: #047857;
          color: #ffffff;
        }

        .ticket-btn.warning {
          background: #f59e0b;
          color: #111827;
        }

        .ticket-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .ticket-status,
        .ticket-priority,
        .detail-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: .75rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .status-info { background: #e0f2fe; color: #0369a1; }
        .status-warning { background: #fffbeb; color: #b45309; }
        .status-success { background: #ecfdf5; color: #047857; }
        .status-muted { background: #f8fafc; color: #64748b; }

        .priority-danger { background: #fef2f2; color: #b91c1c; }
        .priority-warning { background: #fffbeb; color: #b45309; }
        .priority-info { background: #eff6ff; color: #2563eb; }
        .priority-muted,
        .detail-pill {
          background: #f8fafc;
          color: #475569;
        }

        .ticket-signal-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .ticket-signal-grid article,
        .conversation-panel,
        .side-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .ticket-signal-grid article {
          border-radius: 18px;
          padding: 16px;
        }

        .signal-icon {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .signal-icon.neutral { color: #334155; background: #f1f5f9; }
        .signal-icon.blue { color: #2563eb; background: #eff6ff; }
        .signal-icon.amber { color: #b45309; background: #fffbeb; }
        .signal-icon.green { color: #047857; background: #ecfdf5; }

        .ticket-signal-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.25rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 6px;
          word-break: break-word;
        }

        .ticket-signal-grid span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
        }

        .ticket-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 18px;
        }

        .conversation-panel,
        .side-card {
          border-radius: 20px;
          overflow: hidden;
        }

        .panel-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .panel-header span {
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .panel-header h2 {
          color: #0f172a;
          font-size: 1.12rem;
          font-weight: 900;
          margin: 5px 0 0;
        }

        .live-pill {
          display: inline-flex !important;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          color: #047857 !important;
          border-radius: 999px;
          padding: 7px 10px;
          white-space: nowrap;
        }

        .conversation-list {
          height: 520px;
          overflow-y: auto;
          padding: 20px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .message-item {
          max-width: 82%;
          border-radius: 18px;
          padding: 14px;
          border: 1px solid #e5e7eb;
        }

        .message-item.user {
          align-self: flex-start;
          background: #ffffff;
        }

        .message-item.staff {
          align-self: flex-end;
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .message-item.internal {
          align-self: center;
          width: 92%;
          max-width: 92%;
          background: #fffbeb;
          color: #92400e;
          border-color: #fde68a;
        }

        .message-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
          font-size: .75rem;
        }

        .message-meta strong {
          font-weight: 900;
        }

        .message-meta span {
          opacity: .75;
          white-space: nowrap;
        }

        .message-item p {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.65;
          font-size: .9rem;
        }

        .reply-composer {
          padding: 18px 20px;
          border-top: 1px solid #eef2f7;
        }

        .composer-box {
          border: 1px solid #dbe3ea;
          border-radius: 16px;
          overflow: hidden;
          background: #ffffff;
        }

        .composer-box.internal {
          border-color: #fde68a;
          background: #fffbeb;
        }

        .composer-box textarea {
          width: 100%;
          border: 0;
          outline: none;
          resize: vertical;
          padding: 14px;
          font: inherit;
          background: transparent;
          color: #111827;
        }

        .composer-footer {
          padding: 12px;
          border-top: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .internal-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: .84rem;
          font-weight: 800;
          cursor: pointer;
        }

        .internal-toggle input {
          accent-color: #0f172a;
        }

        .internal-toggle span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .resolved-state {
          margin: 18px 20px;
          border-radius: 14px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #bbf7d0;
          padding: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 850;
        }

        .ticket-sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .side-card {
          padding: 18px;
        }

        .side-card.warning {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .side-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          margin-bottom: 14px;
        }

        .side-card-header h3 {
          margin: 0;
          color: #0f172a;
          font-size: .95rem;
          font-weight: 900;
        }

        .side-card dl {
          margin: 0;
          display: grid;
          gap: 13px;
        }

        .side-card dt {
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 4px;
        }

        .side-card dd {
          margin: 0;
          color: #111827;
          font-size: .9rem;
          font-weight: 750;
          word-break: break-word;
        }

        .side-card a {
          color: #047857;
          text-decoration: none;
        }

        .entity-ref {
          display: grid;
          gap: 4px;
        }

        .entity-ref small {
          color: #64748b;
          font-size: .76rem;
          word-break: break-all;
        }

        .attachment-list {
          display: grid;
          gap: 8px;
        }

        .attachment-item {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          color: #334155 !important;
          padding: 0 10px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          font-size: .82rem;
          font-weight: 800;
        }

        .attachment-item span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-copy,
        .side-card.warning p {
          margin: 0;
          color: #64748b;
          line-height: 1.6;
          font-size: .88rem;
        }

        .ticket-loading,
        .ticket-not-found {
          min-height: 320px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 850;
        }

        .ticket-not-found h2 {
          color: #0f172a;
          margin: 0;
        }

        .ticket-not-found a {
          color: #047857;
          font-weight: 850;
          text-decoration: none;
        }

        @media (max-width: 1120px) {
          .ticket-layout {
            grid-template-columns: 1fr;
          }

          .ticket-sidebar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .ticket-header {
            flex-direction: column;
          }

          .ticket-header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .ticket-signal-grid,
          .ticket-sidebar {
            grid-template-columns: 1fr;
          }

          .message-item {
            max-width: 100%;
          }

          .composer-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .ticket-btn {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminSupportTicketDetail;