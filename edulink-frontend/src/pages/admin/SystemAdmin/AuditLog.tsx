import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  Eye,
  FileText,
  Fingerprint,
  Hash,
  LockKeyhole,
  RefreshCw,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react';

import AdminLayout from '../../../components/admin/AdminLayout';
import { ledgerService, type LedgerEvent } from '../../../services/ledger/ledgerService';
import TableSkeleton from '../../../components/admin/skeletons/TableSkeleton';

const PAGE_SIZE = 20;

const AuditLog: React.FC = () => {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<LedgerEvent | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedEventType]);

  useEffect(() => {
    if (!copyStatus) return;
    const timer = setTimeout(() => setCopyStatus(null), 1600);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  const fetchEvents = async () => {
    try {
      if (isLoading) setIsLoading(true);
      else setIsRefreshing(true);

      const response = await ledgerService.getEvents({
        page,
        page_size: PAGE_SIZE,
        search: searchQuery || undefined,
        event_type: selectedEventType || undefined,
      });

      if (Array.isArray(response)) {
        setEvents(response);
        setTotalCount(response.length);
      } else {
        setEvents(response.results || []);
        setTotalCount(response.count || 0);
      }

      setError('');
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load audit logs. Check the ledger service and try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const blob = await ledgerService.exportLogs({
        search: searchQuery || undefined,
        event_type: selectedEventType || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute(
        'download',
        `audit_logs_${new Date().toISOString().split('T')[0]}.pdf`,
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export logs:', err);
      setError('Failed to export audit logs.');
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (text?: string, label?: string) => {
    if (!text || !label) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(label);
    } catch {
      setCopyStatus('error');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(dateString));
  };

  const formatEventType = (type?: string) =>
    (type || 'UNKNOWN_EVENT').replace(/_/g, ' ');

  const compactId = (value?: string) =>
    value ? `${value.substring(0, 10)}...` : 'N/A';

  const eventSignals = useMemo(() => {
    const actors = new Set(events.map((event) => event.actor_id || event.actor_name).filter(Boolean));
    const entityTypes = new Set(events.map((event) => event.entity_type).filter(Boolean));
    const verifiable = events.filter((event) => event.hash).length;

    return {
      visible: events.length,
      actors: actors.size,
      entityTypes: entityTypes.size,
      verifiable,
    };
  }, [events]);

  const getEventTone = (eventType?: string) => {
    const type = eventType || '';

    if (type.includes('INCIDENT') || type.includes('REVOKED') || type.includes('REJECTED')) {
      return 'danger';
    }

    if (type.includes('VERIFIED') || type.includes('APPROVED') || type.includes('COMPLETED')) {
      return 'success';
    }

    if (type.includes('UPDATED') || type.includes('SUBMITTED')) {
      return 'warning';
    }

    return 'info';
  };

  const pageWindow = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    if (totalPages <= 5) return index + 1;
    if (page <= 3) return index + 1;
    if (page >= totalPages - 2) return totalPages - 4 + index;
    return page - 2 + index;
  });

  return (
    <AdminLayout>
      <div className="audit-page">
        <header className="audit-header">
          <div>
            <span className="audit-kicker">
              <Shield size={14} />
              Evidence ledger
            </span>

            <h1>Audit Evidence Console</h1>

            <p>
              Inspect append-only system events, actor activity, entity changes,
              payload evidence, and cryptographic hash-chain verification records.
            </p>
          </div>

          <div className="audit-header-actions">
            <button
              type="button"
              className="audit-btn secondary"
              onClick={fetchEvents}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? 'spin-animation' : ''}
              />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>

            <button
              type="button"
              className="audit-btn primary"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download size={16} />
              {isExporting ? 'Exporting' : 'Export evidence'}
            </button>
          </div>
        </header>

        {error && (
          <div className="audit-error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}

        <section className="audit-signal-grid">
          <article>
            <div className="signal-icon neutral">
              <FileText size={20} />
            </div>
            <strong>{totalCount.toLocaleString()}</strong>
            <span>Total ledger events</span>
          </article>

          <article>
            <div className="signal-icon blue">
              <Activity size={20} />
            </div>
            <strong>{eventSignals.visible}</strong>
            <span>Visible on page</span>
          </article>

          <article>
            <div className="signal-icon green">
              <User size={20} />
            </div>
            <strong>{eventSignals.actors}</strong>
            <span>Actors in view</span>
          </article>

          <article>
            <div className="signal-icon indigo">
              <Database size={20} />
            </div>
            <strong>{eventSignals.entityTypes}</strong>
            <span>Entity types</span>
          </article>

          <article>
            <div className="signal-icon amber">
              <Fingerprint size={20} />
            </div>
            <strong>{eventSignals.verifiable}</strong>
            <span>Hash-verifiable</span>
          </article>
        </section>

        <section className="audit-integrity-panel">
          <div>
            <span className="audit-panel-kicker">Ledger integrity</span>
            <h2>Append-only evidence trail</h2>
            <p>
              Each event should preserve actor, entity, timestamp, payload, hash,
              and previous hash references for review and dispute handling.
            </p>
          </div>

          <div className="integrity-steps">
            <span>
              <LockKeyhole size={15} />
              Immutable event record
            </span>
            <span>
              <Hash size={15} />
              Hash-chain verification
            </span>
            <span>
              <Eye size={15} />
              Forensic inspection
            </span>
          </div>
        </section>

        <section className="audit-panel">
          <div className="audit-panel-header">
            <div>
              <span className="audit-panel-kicker">Ledger registry</span>
              <h2>System events</h2>
              <p>Search, filter, inspect, copy IDs, and export audit evidence.</p>
            </div>

            <span className="audit-count">
              Page {page} of {totalPages}
            </span>
          </div>

          <form onSubmit={handleSearch} className="audit-filter-bar">
            <div className="audit-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search event ID, entity ID, actor, payload..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <select
              value={selectedEventType}
              onChange={(event) => {
                setSelectedEventType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All event types</option>
              <option value="USER_CREATED">User Created</option>
              <option value="USER_UPDATED">User Updated</option>
              <option value="INSTITUTION_VERIFIED">Institution Verified</option>
              <option value="TRUST_LEVEL_UPDATED">Trust Level Updated</option>
              <option value="INTERNSHIP_APPLIED">Internship Applied</option>
              <option value="EVIDENCE_SUBMITTED">Evidence Submitted</option>
              <option value="INCIDENT_REPORTED">Incident Reported</option>
            </select>

            <button type="submit" className="audit-btn dark">
              Apply filters
            </button>
          </form>

          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Integrity</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="audit-loading">
                        <TableSkeleton rows={5} />
                      </div>
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="audit-empty">
                        <Shield size={38} />
                        <h3>No audit events found</h3>
                        <p>No ledger records match the current filter criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  events.map((event) => {
                    const tone = getEventTone(event.event_type);

                    return (
                      <tr key={event.id}>
                        <td>
                          <div className="audit-event-cell">
                            <div className={`audit-event-icon ${tone}`}>
                              <Activity size={16} />
                            </div>

                            <div>
                              <strong>{formatEventType(event.event_type)}</strong>

                              <span>
                                ID: {compactId(event.id)}
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(event.id, `event-${event.id}`)}
                                >
                                  {copyStatus === `event-${event.id}` ? (
                                    <Check size={11} />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="audit-actor">
                            <User size={14} />
                            <span>{event.actor_name || event.actor_id || 'System'}</span>
                          </div>
                        </td>

                        <td>
                          <div className="audit-entity">
                            <Database size={14} />
                            <div>
                              <strong>{event.entity_type || 'Unknown'}</strong>
                              <span>
                                {compactId(event.entity_id)}
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(event.entity_id, `entity-${event.id}`)
                                  }
                                >
                                  {copyStatus === `entity-${event.id}` ? (
                                    <Check size={11} />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`integrity-pill ${
                              event.hash ? 'verified' : 'missing'
                            }`}
                          >
                            <Fingerprint size={13} />
                            {event.hash ? 'Hash recorded' : 'Hash missing'}
                          </span>
                        </td>

                        <td>
                          <span className="audit-date">
                            <Calendar size={13} />
                            {formatDate(event.occurred_at)}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="audit-row-action"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <Eye size={14} />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && totalCount > 0 && (
            <div className="audit-pagination">
              <span>
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)} to{' '}
                {Math.min(page * PAGE_SIZE, totalCount)} of{' '}
                {totalCount.toLocaleString()} events
              </span>

              <div>
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={15} />
                </button>

                {pageWindow.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={page === item ? 'active' : ''}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedEvent && (
        <div className="audit-modal-backdrop">
          <div className="audit-modal">
            <header className="audit-modal-header">
              <div>
                <span>Forensic event inspection</span>
                <h2>{formatEventType(selectedEvent.event_type)}</h2>
              </div>

              <button type="button" onClick={() => setSelectedEvent(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="audit-modal-body">
              <aside className="audit-record-summary">
                <div className="record-icon">
                  <Fingerprint size={34} />
                </div>

                <h3>Ledger Event</h3>

                <span className={`integrity-pill ${selectedEvent.hash ? 'verified' : 'missing'}`}>
                  <Fingerprint size={13} />
                  {selectedEvent.hash ? 'Hash recorded' : 'Hash missing'}
                </span>

                <div className="record-id-box">
                  <span>Event ID</span>
                  <strong>{selectedEvent.id}</strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedEvent.id, 'modal-event')}
                  >
                    {copyStatus === 'modal-event' ? <Check size={13} /> : <Copy size={13} />}
                    Copy event ID
                  </button>
                </div>
              </aside>

              <section className="audit-record-details">
                <div className="record-block">
                  <h4>
                    <Activity size={14} />
                    Event metadata
                  </h4>

                  <dl>
                    <div>
                      <dt>Event type</dt>
                      <dd>{formatEventType(selectedEvent.event_type)}</dd>
                    </div>

                    <div>
                      <dt>Timestamp</dt>
                      <dd>{formatDate(selectedEvent.occurred_at)}</dd>
                    </div>

                    <div>
                      <dt>Actor</dt>
                      <dd>{selectedEvent.actor_name || selectedEvent.actor_id || 'System'}</dd>
                    </div>

                    <div>
                      <dt>Entity</dt>
                      <dd>
                        {selectedEvent.entity_type || 'Unknown'} ·{' '}
                        {selectedEvent.entity_id || 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="record-block">
                  <h4>
                    <Shield size={14} />
                    Cryptographic verification
                  </h4>

                  <div className="hash-grid">
                    <div>
                      <span>Current hash</span>
                      <code>{selectedEvent.hash || 'N/A'}</code>
                    </div>

                    <div>
                      <span>Previous hash</span>
                      <code>{selectedEvent.previous_hash || 'N/A'}</code>
                    </div>
                  </div>
                </div>

                <div className="record-block payload">
                  <h4>
                    <Database size={14} />
                    Payload evidence
                  </h4>

                  <pre>{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
                </div>
              </section>
            </div>

            <footer className="audit-modal-footer">
              <button
                type="button"
                className="audit-btn secondary"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        .audit-page {
          color: #111827;
        }

        .audit-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .audit-kicker,
        .audit-panel-kicker {
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

        .audit-kicker svg {
          color: #047857;
        }

        .audit-header h1 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: clamp(1.85rem, 3vw, 2.6rem);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -.055em;
        }

        .audit-header p {
          max-width: 780px;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        .audit-header-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .audit-btn {
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
        }

        .audit-btn.primary,
        .audit-btn.dark {
          background: #0f172a;
          color: #ffffff;
        }

        .audit-btn.secondary {
          background: #ffffff;
          border-color: #dbe3ea;
          color: #334155;
        }

        .audit-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .audit-error {
          margin-bottom: 18px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .audit-error button {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .audit-signal-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .audit-signal-grid article,
        .audit-integrity-panel,
        .audit-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 26px rgba(15,23,42,.04);
        }

        .audit-signal-grid article {
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
        .signal-icon.green { color: #047857; background: #ecfdf5; }
        .signal-icon.indigo { color: #4338ca; background: #eef2ff; }
        .signal-icon.amber { color: #b45309; background: #fffbeb; }

        .audit-signal-grid strong {
          display: block;
          color: #0f172a;
          font-size: 1.7rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.05em;
          margin-bottom: 6px;
        }

        .audit-signal-grid span {
          color: #64748b;
          font-size: .78rem;
          font-weight: 700;
        }

        .audit-integrity-panel {
          border-radius: 20px;
          padding: 18px 20px;
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
        }

        .audit-integrity-panel h2 {
          color: #0f172a;
          font-size: 1.15rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .audit-integrity-panel p {
          color: #64748b;
          margin: 0;
          line-height: 1.55;
          max-width: 720px;
          font-size: .9rem;
        }

        .integrity-steps {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .integrity-steps span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #334155;
          padding: 8px 10px;
          font-size: .76rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .audit-panel {
          border-radius: 20px;
          overflow: hidden;
        }

        .audit-panel-header {
          padding: 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .audit-panel-header h2 {
          color: #0f172a;
          font-size: 1.22rem;
          font-weight: 900;
          margin: 0 0 5px;
        }

        .audit-panel-header p {
          color: #64748b;
          margin: 0;
          font-size: .9rem;
        }

        .audit-count {
          border: 1px solid #dbe3ea;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: .78rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .audit-filter-bar {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 240px auto;
          gap: 10px;
          border-bottom: 1px solid #eef2f7;
        }

        .audit-search {
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

        .audit-search input {
          width: 100%;
          border: 0;
          outline: none;
          color: #111827;
          font-weight: 650;
          font-size: .9rem;
        }

        .audit-filter-bar select {
          min-height: 44px;
          border: 1px solid #dbe3ea;
          border-radius: 12px;
          background: #ffffff;
          color: #334155;
          padding: 0 12px;
          font-weight: 750;
          outline: none;
        }

        .audit-table-wrap {
          overflow-x: auto;
        }

        .audit-table {
          width: 100%;
          min-width: 1120px;
          border-collapse: collapse;
        }

        .audit-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .audit-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          vertical-align: middle;
        }

        .audit-event-cell,
        .audit-entity {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 260px;
        }

        .audit-event-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .audit-event-icon.info { background: #eff6ff; color: #2563eb; }
        .audit-event-icon.success { background: #ecfdf5; color: #047857; }
        .audit-event-icon.warning { background: #fffbeb; color: #b45309; }
        .audit-event-icon.danger { background: #fef2f2; color: #b91c1c; }

        .audit-event-cell strong,
        .audit-entity strong {
          display: block;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
          text-transform: capitalize;
        }

        .audit-event-cell span,
        .audit-entity span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: .76rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .audit-event-cell button,
        .audit-entity button {
          border: 0;
          background: transparent;
          color: #64748b;
          display: inline-flex;
          cursor: pointer;
          padding: 0;
        }

        .audit-actor,
        .audit-date,
        .integrity-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: .74rem;
          font-weight: 850;
          white-space: nowrap;
        }

        .audit-actor,
        .audit-date {
          color: #475569;
          background: #f8fafc;
        }

        .integrity-pill.verified {
          background: #ecfdf5;
          color: #047857;
        }

        .integrity-pill.missing {
          background: #fef2f2;
          color: #b91c1c;
        }

        .audit-row-action {
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid #dbe3ea;
          background: #ffffff;
          color: #334155;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: .78rem;
          font-weight: 850;
          cursor: pointer;
        }

        .audit-loading {
          padding: 22px;
        }

        .audit-empty {
          padding: 52px 20px;
          text-align: center;
          color: #64748b;
        }

        .audit-empty svg {
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .audit-empty h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .audit-pagination {
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .audit-pagination span {
          color: #64748b;
          font-size: .82rem;
          font-weight: 650;
        }

        .audit-pagination div {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .audit-pagination button {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid #dbe3ea;
          background: #ffffff;
          color: #334155;
          font-size: .78rem;
          font-weight: 850;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .audit-pagination button.active {
          background: #0f172a;
          border-color: #0f172a;
          color: #ffffff;
        }

        .audit-pagination button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .audit-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15,23,42,.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .audit-modal {
          width: min(1040px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 24px 80px rgba(15,23,42,.24);
        }

        .audit-modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .audit-modal-header span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          letter-spacing: .09em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .audit-modal-header h2 {
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -.03em;
          text-transform: capitalize;
        }

        .audit-modal-header button {
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
          flex-shrink: 0;
        }

        .audit-modal-body {
          padding: 20px;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
        }

        .audit-record-summary {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          text-align: center;
          align-self: start;
        }

        .record-icon {
          width: 76px;
          height: 76px;
          margin: 0 auto 14px;
          border-radius: 22px;
          background: #ecfdf5;
          color: #047857;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .audit-record-summary h3 {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 900;
          margin: 0 0 14px;
        }

        .record-id-box {
          margin-top: 16px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 14px;
          padding: 12px;
          text-align: left;
        }

        .record-id-box span {
          display: block;
          color: #64748b;
          font-size: .68rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 6px;
        }

        .record-id-box strong {
          display: block;
          color: #0f172a;
          font-size: .76rem;
          word-break: break-all;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          margin-bottom: 10px;
        }

        .record-id-box button {
          width: 100%;
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid #dbe3ea;
          background: #ffffff;
          color: #334155;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: .78rem;
          font-weight: 850;
          cursor: pointer;
        }

        .audit-record-details {
          display: grid;
          gap: 14px;
        }

        .record-block {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
        }

        .record-block h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          font-size: .88rem;
          font-weight: 900;
          margin: 0 0 14px;
        }

        .record-block dl {
          margin: 0;
          display: grid;
          gap: 12px;
        }

        .record-block dl > div {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 14px;
        }

        .record-block dt {
          color: #64748b;
          font-size: .78rem;
          font-weight: 800;
        }

        .record-block dd {
          margin: 0;
          color: #111827;
          font-size: .88rem;
          font-weight: 750;
          word-break: break-word;
        }

        .hash-grid {
          display: grid;
          gap: 10px;
        }

        .hash-grid div {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
        }

        .hash-grid span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          font-weight: 850;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .hash-grid code {
          color: #0f172a;
          font-size: .76rem;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .record-block.payload pre {
          margin: 0;
          max-height: 340px;
          overflow: auto;
          background: #0f172a;
          color: #e5e7eb;
          border-radius: 14px;
          padding: 14px;
          font-size: .78rem;
          line-height: 1.6;
        }

        .audit-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eef2f7;
          display: flex;
          justify-content: flex-end;
        }

        .spin-animation {
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1180px) {
          .audit-signal-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .audit-integrity-panel {
            flex-direction: column;
            align-items: flex-start;
          }

          .integrity-steps {
            justify-content: flex-start;
          }
        }

        @media (max-width: 760px) {
          .audit-header,
          .audit-panel-header,
          .audit-pagination {
            flex-direction: column;
            align-items: flex-start;
          }

          .audit-header-actions {
            width: 100%;
            flex-direction: column;
          }

          .audit-btn {
            width: 100%;
          }

          .audit-signal-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .audit-filter-bar {
            grid-template-columns: 1fr;
          }

          .audit-modal-body {
            grid-template-columns: 1fr;
          }

          .record-block dl > div {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }

        @media (max-width: 520px) {
          .audit-signal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AuditLog;