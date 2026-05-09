import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User2,
  X,
} from 'lucide-react';

import { contactService } from '../../../services/contact/contactService';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';
import AdminLayout from '../../../components/admin/AdminLayout';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const ContactManagement: React.FC = () => {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState({
    status: '',
    search: '',
  });

  const { feedbackProps, showError, showSuccess } =
    useFeedbackModal();

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [internalNotes, setInternalNotes] = useState('');

  const {
    data: submissions = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['admin-contact-submissions'],
    queryFn: () => contactService.getAdminSubmissions(),
    staleTime: 1000 * 60 * 5,
  });

  const filteredSubmissions = submissions.filter(
    (submission) => {
      const matchesStatus =
        filter.status === '' ||
        (filter.status === 'processed'
          ? submission.is_processed
          : !submission.is_processed);

      const matchesSearch =
        filter.search === '' ||
        submission.name
          .toLowerCase()
          .includes(filter.search.toLowerCase()) ||
        submission.email
          .toLowerCase()
          .includes(filter.search.toLowerCase()) ||
        submission.subject
          .toLowerCase()
          .includes(filter.search.toLowerCase());

      return matchesStatus && matchesSearch;
    },
  );

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter(
        (s) => !s.is_processed,
      ).length,
      processed: submissions.filter(
        (s) => s.is_processed,
      ).length,
      today: submissions.filter((s) => {
        const today = new Date().toDateString();

        return (
          new Date(s.created_at).toDateString() ===
          today
        );
      }).length,
    };
  }, [submissions]);

  const handleProcess = async (id: string) => {
    try {
      await contactService.processSubmission(
        id,
        internalNotes,
      );

      showSuccess(
        'Submission Processed',
        'Communication record updated successfully.',
      );

      queryClient.invalidateQueries({
        queryKey: ['admin-contact-submissions'],
      });

      setProcessingId(null);
      setInternalNotes('');
    } catch (err: any) {
      const sanitized =
        sanitizeAdminError(err);

      showError(
        'Processing Failed',
        sanitized.userMessage ||
          'Failed to process submission.',
      );
    }
  };

  return (
    <AdminLayout>
      <div className="contact-ops-page">
        {/* Header */}
        <header className="contact-header">
          <div>
            <span className="contact-kicker">
              <Mail size={14} />
              Communication operations
            </span>

            <h1>Contact Communication Center</h1>

            <p>
              Review inbound communication from
              students, institutions, employers, and
              external users interacting with the
              platform.
            </p>
          </div>

          <button
            type="button"
            className="contact-btn secondary"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: [
                  'admin-contact-submissions',
                ],
              })
            }
          >
            <RefreshCw size={16} />
            Refresh inbox
          </button>
        </header>

        {/* Stats */}
        <section className="contact-stats-grid">
          <article>
            <div className="stat-icon neutral">
              <Inbox size={20} />
            </div>

            <strong>{stats.total}</strong>

            <span>Total submissions</span>
          </article>

          <article>
            <div className="stat-icon warning">
              <Clock3 size={20} />
            </div>

            <strong>{stats.pending}</strong>

            <span>Pending review</span>
          </article>

          <article>
            <div className="stat-icon success">
              <CheckCircle2 size={20} />
            </div>

            <strong>{stats.processed}</strong>

            <span>Processed records</span>
          </article>

          <article>
            <div className="stat-icon blue">
              <Sparkles size={20} />
            </div>

            <strong>{stats.today}</strong>

            <span>Received today</span>
          </article>
        </section>

        {/* Main Panel */}
        <section className="contact-panel">
          <div className="contact-panel-header">
            <div>
              <span className="contact-panel-kicker">
                Communication queue
              </span>

              <h2>Inbound submissions</h2>

              <p>
                Search and review contact requests
                submitted through the public platform.
              </p>
            </div>

            <span className="submission-count">
              {filteredSubmissions.length} visible
            </span>
          </div>

          {/* Filters */}
          <div className="contact-filter-bar">
            <div className="contact-search">
              <Search size={16} />

              <input
                type="text"
                placeholder="Search by sender, email or subject..."
                value={filter.search}
                onChange={(event) =>
                  setFilter({
                    ...filter,
                    search: event.target.value,
                  })
                }
              />
            </div>

            <select
              value={filter.status}
              onChange={(event) =>
                setFilter({
                  ...filter,
                  status: event.target.value,
                })
              }
            >
              <option value="">
                All submissions
              </option>

              <option value="unprocessed">
                Pending review
              </option>

              <option value="processed">
                Processed
              </option>
            </select>
          </div>

          {/* Table */}
          <div className="contact-table-wrap">
            <table className="contact-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Preview</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="contact-empty">
                        Loading submissions...
                      </div>
                    </td>
                  </tr>
                ) : filteredSubmissions.length ===
                  0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="contact-empty">
                        <ShieldCheck size={36} />

                        <h3>
                          No submissions found
                        </h3>

                        <p>
                          No communication records
                          match the current filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map(
                    (submission) => (
                      <tr key={submission.id}>
                        <td>
                          <span className="submission-date">
                            {format(
                              new Date(
                                submission.created_at,
                              ),
                              'MMM d, HH:mm',
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="sender-cell">
                            <div className="sender-avatar">
                              <User2 size={15} />
                            </div>

                            <div>
                              <strong>
                                {submission.name}
                              </strong>

                              <span>
                                {submission.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="submission-subject">
                            {submission.subject}
                          </div>
                        </td>

                        <td>
                          <div className="submission-preview">
                            {submission.message}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`submission-status ${
                              submission.is_processed
                                ? 'status-success'
                                : 'status-warning'
                            }`}
                          >
                            {submission.is_processed
                              ? 'Processed'
                              : 'Pending'}
                          </span>
                        </td>

                        <td>
                          {!submission.is_processed ? (
                            <button
                              className="contact-action-btn"
                              onClick={() =>
                                setProcessingId(
                                  submission.id,
                                )
                              }
                            >
                              Review
                            </button>
                          ) : (
                            <button
                              className="contact-action-btn secondary"
                              onClick={() => {
                                showSuccess(
                                  'Processing Details',
                                  `Processed on ${format(
                                    new Date(
                                      submission.processed_at!,
                                    ),
                                    'MMM d',
                                  )}. Notes: ${
                                    submission.internal_notes ||
                                    'None'
                                  }`,
                                );
                              }}
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer Note */}
        <section className="contact-policy">
          <AlertTriangle size={18} />

          <div>
            <strong>
              Communication handling note
            </strong>

            <p>
              Institutional partnership inquiries,
              account recovery requests, technical
              platform issues, and placement-related
              communication should be reviewed with
              higher priority.
            </p>
          </div>
        </section>
      </div>

      {/* Modal */}
      {processingId && (
        <div className="contact-modal-backdrop">
          <div className="contact-modal">
            {(() => {
              const submission = submissions.find(
                (s) => s.id === processingId,
              );

              if (!submission) return null;

              return (
                <>
                  <header className="contact-modal-header">
                    <div>
                      <span>
                        Submission review
                      </span>

                      <h2>
                        {submission.subject}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setProcessingId(null)
                      }
                    >
                      <X size={18} />
                    </button>
                  </header>

                  <div className="contact-modal-body">
                    <div className="message-meta">
                      <div>
                        <span>Sender</span>

                        <strong>
                          {submission.name}
                        </strong>

                        <small>
                          {submission.email}
                        </small>
                      </div>

                      <div>
                        <span>Received</span>

                        <strong>
                          {format(
                            new Date(
                              submission.created_at,
                            ),
                            'PPP p',
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="message-card">
                      <div className="message-header">
                        <MessageSquare size={16} />

                        <span>
                          Message content
                        </span>
                      </div>

                      <p>{submission.message}</p>
                    </div>

                    <div className="notes-section">
                      <label>
                        Internal processing notes
                      </label>

                      <textarea
                        rows={5}
                        placeholder="Document the action taken, escalation details, response outcome, or internal handling notes..."
                        value={internalNotes}
                        onChange={(event) =>
                          setInternalNotes(
                            event.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <footer className="contact-modal-footer">
                    <button
                      type="button"
                      className="contact-btn secondary"
                      onClick={() =>
                        setProcessingId(null)
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="contact-btn primary"
                      onClick={() =>
                        handleProcess(
                          processingId,
                        )
                      }
                    >
                      Mark as processed
                    </button>
                  </footer>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <FeedbackModal {...feedbackProps} />

      <style>{`
        .contact-ops-page {
          color: #111827;
        }

        .contact-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .contact-kicker,
        .contact-panel-kicker {
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

        .contact-kicker svg {
          color: #2563eb;
        }

        .contact-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .contact-header p {
          max-width: 760px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .contact-btn {
          min-height: 42px;
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

        .contact-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .contact-btn.primary {
          background: #0f172a;
          color: #ffffff;
        }

        .contact-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .contact-stats-grid article,
        .contact-panel,
        .contact-policy {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .contact-stats-grid article {
          border-radius: 18px;
          padding: 16px;
        }

        .stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .neutral {
          background: #f1f5f9;
          color: #334155;
        }

        .warning {
          background: #fffbeb;
          color: #b45309;
        }

        .success {
          background: #ecfdf5;
          color: #047857;
        }

        .blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .contact-stats-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .contact-stats-grid span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
        }

        .contact-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .contact-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .contact-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
        }

        .contact-panel-header p {
          color: #64748b;
          margin: 0;
          font-size: .9rem;
        }

        .submission-count {
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: .78rem;
          font-weight: 850;
        }

        .contact-filter-bar {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .contact-search {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #94a3b8;
        }

        .contact-search input {
          width: 100%;
          border: 0;
          outline: none;
          color: #111827;
          font-weight: 650;
          font-size: .9rem;
        }

        .contact-filter-bar select {
          min-height: 44px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          padding: 0 12px;
          font-weight: 750;
        }

        .contact-table-wrap {
          overflow-x: auto;
        }

        .contact-table {
          width: 100%;
          min-width: 980px;
          border-collapse: collapse;
        }

        .contact-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .contact-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .submission-date,
        .submission-status {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .submission-date {
          background: #f8fafc;
          color: #475569;
        }

        .sender-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sender-avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sender-cell strong {
          display: block;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
        }

        .sender-cell span {
          display: block;
          color: #64748b;
          font-size: .78rem;
        }

        .submission-subject {
          max-width: 220px;
          font-weight: 800;
          color: #334155;
        }

        .submission-preview {
          max-width: 320px;
          color: #64748b;
          font-size: .82rem;
          line-height: 1.55;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-success {
          background: #ecfdf5;
          color: #047857;
        }

        .status-warning {
          background: #fffbeb;
          color: #b45309;
        }

        .contact-action-btn {
          min-height: 34px;
          border-radius: 10px;
          border: 0;
          background: #0f172a;
          color: #ffffff;
          padding: 0 12px;
          font-size: .78rem;
          font-weight: 850;
          cursor: pointer;
        }

        .contact-action-btn.secondary {
          background: #f8fafc;
          color: #334155;
          border: 1px solid #dbe3ea;
        }

        .contact-empty {
          padding: 52px 20px;
          text-align: center;
          color: #64748b;
        }

        .contact-empty svg {
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .contact-empty h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .contact-policy {
          margin-top: 18px;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .contact-policy svg {
          color: #b45309;
          flex-shrink: 0;
        }

        .contact-policy strong {
          display: block;
          font-weight: 900;
          margin-bottom: 4px;
          color: #0f172a;
        }

        .contact-policy p {
          margin: 0;
          color: #64748b;
          line-height: 1.6;
          font-size: .88rem;
        }

        .contact-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15,23,42,.48);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .contact-modal {
          width: min(760px, 100%);
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(15,23,42,.24);
        }

        .contact-modal-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .contact-modal-header span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .contact-modal-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 1.28rem;
          font-weight: 900;
        }

        .contact-modal-header button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .contact-modal-body {
          padding: 20px;
          display: grid;
          gap: 18px;
        }

        .message-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
        }

        .message-meta div {
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 16px;
          padding: 14px;
        }

        .message-meta span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .message-meta strong {
          display: block;
          color: #0f172a;
          font-size: .92rem;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .message-meta small {
          color: #64748b;
          font-size: .78rem;
        }

        .message-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-size: .82rem;
          font-weight: 850;
          margin-bottom: 14px;
        }

        .message-card p {
          color: #475569;
          line-height: 1.75;
          margin: 0;
          white-space: pre-wrap;
        }

        .notes-section label {
          display: block;
          color: #0f172a;
          font-size: .82rem;
          font-weight: 850;
          margin-bottom: 8px;
        }

        .notes-section textarea {
          width: 100%;
          border: 1px solid #dbe3ea;
          border-radius: 16px;
          padding: 14px;
          font: inherit;
          resize: vertical;
          outline: none;
        }

        .contact-modal-footer {
          padding: 18px 20px;
          border-top: 1px solid #eef2f7;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        @media (max-width: 980px) {
          .contact-stats-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 760px) {
          .contact-header,
          .contact-panel-header {
            flex-direction: column;
          }

          .contact-btn {
            width: 100%;
          }

          .contact-filter-bar {
            grid-template-columns: 1fr;
          }

          .message-meta {
            grid-template-columns: 1fr;
          }

          .contact-modal-footer {
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .contact-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default ContactManagement;