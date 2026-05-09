import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  LifeBuoy,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  Zap,
} from 'lucide-react';

import { supportService } from '../../../services/support/supportService';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';
import { usePusher } from '../../../hooks/usePusher';
import AdminLayout from '../../../components/admin/AdminLayout';

const SupportManagement: React.FC = () => {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState({
    status: '',
    category: '',
    priority: '',
    trackingCode: '',
  });

  const { feedbackProps } = useFeedbackModal();

  const { data: ticketsData = [], isLoading: loading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => supportService.getTickets(),
    staleTime: 1000 * 60 * 2,
  });

  const tickets = useMemo(() => {
    if (Array.isArray(ticketsData)) {
      return ticketsData;
    }

    if (ticketsData && typeof ticketsData === 'object') {
      const wrapped = ticketsData as {
        results?: typeof ticketsData;
        data?: typeof ticketsData;
      };

      if (Array.isArray(wrapped.results)) {
        return wrapped.results;
      }

      if (Array.isArray(wrapped.data)) {
        return wrapped.data;
      }
    }

    return [];
  }, [ticketsData]);

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
  }, [queryClient]);

  usePusher('support-global', 'ticket-activity', handleRealtimeUpdate);

  const filteredTickets = tickets.filter((ticket) => {
    return (
      (filter.status === '' || ticket.status === filter.status) &&
      (filter.category === '' || ticket.category === filter.category) &&
      (filter.priority === '' || ticket.priority === filter.priority) &&
      (filter.trackingCode === '' ||
        ticket.tracking_code
          .toLowerCase()
          .includes(filter.trackingCode.toLowerCase()))
    );
  });

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === 'OPEN').length;
    const inProgress = tickets.filter(
      (ticket) => ticket.status === 'IN_PROGRESS',
    ).length;
    const urgent = tickets.filter((ticket) => ticket.priority === 'URGENT').length;
    const resolved = tickets.filter((ticket) => ticket.status === 'RESOLVED').length;

    return {
      total: tickets.length,
      open,
      inProgress,
      urgent,
      resolved,
    };
  }, [tickets]);

  const getPriorityMeta = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { label: 'Urgent', className: 'priority-danger' };
      case 'HIGH':
        return { label: 'High', className: 'priority-warning' };
      case 'MEDIUM':
        return { label: 'Medium', className: 'priority-blue' };
      default:
        return { label: priority || 'Low', className: 'priority-muted' };
    }
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

  const applyScope = (scope: string) => {
    switch (scope) {
      case 'open':
        setFilter((prev) => ({ ...prev, status: 'OPEN' }));
        break;
      case 'urgent':
        setFilter((prev) => ({ ...prev, priority: 'URGENT' }));
        break;
      case 'progress':
        setFilter((prev) => ({ ...prev, status: 'IN_PROGRESS' }));
        break;
      case 'resolved':
        setFilter((prev) => ({ ...prev, status: 'RESOLVED' }));
        break;
      default:
        setFilter({
          status: '',
          category: '',
          priority: '',
          trackingCode: '',
        });
    }
  };

  return (
    <AdminLayout>
      <div className="support-ops-page">
        <header className="support-header">
          <div>
            <span className="support-kicker">
              <LifeBuoy size={14} />
              Support operations
            </span>

            <h1>Support & Care Queue</h1>

            <p>
              Monitor user support tickets, triage urgent issues, track
              resolution progress, and respond to account, affiliation,
              internship, and technical requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
            }
            className="support-btn secondary"
          >
            <RefreshCw size={16} />
            Refresh queue
          </button>
        </header>

        <section className="support-signal-grid">
          <article>
            <div className="signal-icon neutral">
              <Ticket size={20} />
            </div>
            <strong>{stats.total}</strong>
            <span>Total tickets</span>
          </article>

          <article>
            <div className="signal-icon info">
              <Inbox size={20} />
            </div>
            <strong>{stats.open}</strong>
            <span>Open requests</span>
          </article>

          <article>
            <div className="signal-icon warning">
              <Clock size={20} />
            </div>
            <strong>{stats.inProgress}</strong>
            <span>In progress</span>
          </article>

          <article>
            <div className="signal-icon danger">
              <Zap size={20} />
            </div>
            <strong>{stats.urgent}</strong>
            <span>Urgent tickets</span>
          </article>

          <article>
            <div className="signal-icon success">
              <CheckCircle2 size={20} />
            </div>
            <strong>{stats.resolved}</strong>
            <span>Resolved</span>
          </article>
        </section>

        <section className="support-panel">
          <div className="support-panel-header">
            <div>
              <span className="support-panel-kicker">
                Ticket registry
              </span>

              <h2>Support tickets</h2>

              <p>
                Filter by tracking code, status, category, or priority.
              </p>
            </div>

            <span className="support-count">
              {filteredTickets.length} visible
            </span>
          </div>

          <div className="support-scopes">
            {[
              { label: 'All', value: 'all' },
              { label: 'Open', value: 'open' },
              { label: 'Urgent', value: 'urgent' },
              { label: 'In progress', value: 'progress' },
              { label: 'Resolved', value: 'resolved' },
            ].map((scope) => (
              <button
                key={scope.value}
                type="button"
                onClick={() => applyScope(scope.value)}
                className={
                  (scope.value === 'all' &&
                    !filter.status &&
                    !filter.priority &&
                    !filter.category &&
                    !filter.trackingCode) ||
                  (scope.value === 'open' && filter.status === 'OPEN') ||
                  (scope.value === 'urgent' && filter.priority === 'URGENT') ||
                  (scope.value === 'progress' &&
                    filter.status === 'IN_PROGRESS') ||
                  (scope.value === 'resolved' && filter.status === 'RESOLVED')
                    ? 'active'
                    : ''
                }
              >
                {scope.label}
              </button>
            ))}
          </div>

          <div className="support-filter-bar">
            <div className="support-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search tracking code..."
                value={filter.trackingCode}
                onChange={(event) =>
                  setFilter({ ...filter, trackingCode: event.target.value })
                }
              />
            </div>

            <select
              value={filter.status}
              onChange={(event) =>
                setFilter({ ...filter, status: event.target.value })
              }
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={filter.category}
              onChange={(event) =>
                setFilter({ ...filter, category: event.target.value })
              }
            >
              <option value="">All categories</option>
              <option value="TECHNICAL">Technical issue</option>
              <option value="AFFILIATION">Affiliation query</option>
              <option value="INTERNSHIP">Internship assistance</option>
              <option value="ACCOUNT">Account management</option>
              <option value="OTHER">General inquiry</option>
            </select>

            <select
              value={filter.priority}
              onChange={(event) =>
                setFilter({ ...filter, priority: event.target.value })
              }
            >
              <option value="">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <button type="button" className="support-filter-btn">
              <Filter size={16} />
              Filters
            </button>
          </div>

          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requester</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="support-empty">
                        Loading support tickets...
                      </div>
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="support-empty">
                        <ShieldCheck size={36} />
                        <h3>No tickets found</h3>
                        <p>No support tickets match the selected filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const priority = getPriorityMeta(ticket.priority);
                    const status = getStatusMeta(ticket.status);

                    return (
                      <tr key={ticket.id}>
                        <td>
                          <span className="ticket-code">
                            {ticket.tracking_code}
                          </span>
                        </td>

                        <td>
                          <div className="requester-cell">
                            <strong>{ticket.name}</strong>
                            <span>{ticket.email}</span>
                          </div>
                        </td>

                        <td>
                          <div className="ticket-subject">
                            {ticket.subject}
                          </div>
                        </td>

                        <td>
                          <span className="ticket-category">
                            {ticket.category}
                          </span>
                        </td>

                        <td>
                          <span className={`ticket-priority ${priority.className}`}>
                            {priority.label}
                          </span>
                        </td>

                        <td>
                          <span className={`ticket-status ${status.className}`}>
                            {status.label}
                          </span>
                        </td>

                        <td>
                          <span className="ticket-date">
                            {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                          </span>
                        </td>

                        <td>
                          <Link
                            to={`/admin/support/tickets/${ticket.tracking_code}`}
                            className="support-manage-link"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="support-policy">
          <AlertTriangle size={18} />
          <div>
            <strong>Support handling note</strong>
            <p>
              Urgent account access, placement blockers, affiliation issues, and
              technical incidents should be handled first. Ticket actions should
              remain clear enough for audit review.
            </p>
          </div>
        </section>
      </div>

      <FeedbackModal {...feedbackProps} />

      <style>{`
        .support-ops-page {
          color: #111827;
        }

        .support-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .support-kicker,
        .support-panel-kicker {
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

        .support-kicker svg {
          color: #047857;
        }

        .support-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .support-header p {
          max-width: 760px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .support-btn {
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
          text-decoration: none;
          white-space: nowrap;
        }

        .support-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .support-signal-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .support-signal-grid article,
        .support-panel,
        .support-policy {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .support-signal-grid article {
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
        .signal-icon.info { color: #0369a1; background: #e0f2fe; }
        .signal-icon.warning { color: #b45309; background: #fffbeb; }
        .signal-icon.danger { color: #b91c1c; background: #fef2f2; }
        .signal-icon.success { color: #047857; background: #ecfdf5; }

        .support-signal-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .support-signal-grid span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .support-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .support-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .support-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
        }

        .support-panel-header p {
          color: #64748b;
          margin: 0;
          font-size: .9rem;
          line-height: 1.55;
        }

        .support-count {
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: .78rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .support-scopes {
          padding: 14px 20px 0;
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }

        .support-scopes button {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: .82rem;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .support-scopes button.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .support-filter-bar {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: minmax(230px, 1fr) 170px 210px 170px auto;
          gap: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .support-search {
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

        .support-search input {
          width: 100%;
          border: 0;
          outline: none;
          color: #111827;
          font-weight: 650;
          font-size: .9rem;
        }

        .support-filter-bar select,
        .support-filter-btn {
          min-height: 44px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          padding: 0 12px;
          font-weight: 750;
          outline: none;
        }

        .support-filter-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
        }

        .support-table-wrap {
          overflow-x: auto;
        }

        .support-table {
          width: 100%;
          min-width: 1040px;
          border-collapse: collapse;
        }

        .support-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #eef2f7;
          white-space: nowrap;
        }

        .support-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .ticket-code,
        .ticket-category,
        .ticket-priority,
        .ticket-status,
        .ticket-date {
          display: inline-flex;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .ticket-code {
          background: #f8fafc;
          border: 1px solid #dbe3ea;
          color: #334155;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .requester-cell strong {
          display: block;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
        }

        .requester-cell span {
          display: block;
          color: #64748b;
          font-size: .78rem;
        }

        .ticket-subject {
          color: #334155;
          max-width: 260px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 700;
        }

        .ticket-category,
        .ticket-date {
          background: #f8fafc;
          color: #475569;
        }

        .priority-danger { background: #fef2f2; color: #b91c1c; }
        .priority-warning { background: #fffbeb; color: #b45309; }
        .priority-blue { background: #eff6ff; color: #2563eb; }
        .priority-muted { background: #f8fafc; color: #64748b; }

        .status-info { background: #e0f2fe; color: #0369a1; }
        .status-warning { background: #fffbeb; color: #b45309; }
        .status-success { background: #ecfdf5; color: #047857; }
        .status-muted { background: #f8fafc; color: #64748b; }

        .support-manage-link {
          min-height: 34px;
          border-radius: 10px;
          background: #0f172a;
          color: #ffffff;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: .78rem;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
        }

        .support-manage-link:hover {
          color: #ffffff;
        }

        .support-empty {
          padding: 48px 20px;
          text-align: center;
          color: #64748b;
        }

        .support-empty svg {
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .support-empty h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .support-empty p {
          margin: 0;
        }

        .support-policy {
          margin-top: 18px;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          color: #334155;
        }

        .support-policy svg {
          color: #b45309;
          flex-shrink: 0;
        }

        .support-policy strong {
          display: block;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .support-policy p {
          margin: 0;
          color: #64748b;
          line-height: 1.6;
          font-size: .88rem;
        }

        @media (max-width: 1180px) {
          .support-signal-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .support-filter-bar {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 760px) {
          .support-header,
          .support-panel-header {
            flex-direction: column;
          }

          .support-btn {
            width: 100%;
          }

          .support-signal-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .support-filter-bar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .support-signal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default SupportManagement;