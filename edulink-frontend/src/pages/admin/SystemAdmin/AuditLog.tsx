import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  User,
  Database,
  Copy,
  Check,
  X as XIcon
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { ledgerService, type LedgerEvent } from '../../../services/ledger/ledgerService';
import TableSkeleton from '../../../components/admin/skeletons/TableSkeleton';

const AuditLog: React.FC = () => {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<LedgerEvent | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null); // 'ID' | 'Entity ID' | null
  const [isExporting, setIsExporting] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    fetchEvents();
  }, [page, searchQuery, selectedEventType]);

  useEffect(() => {
    if (copyStatus) {
      const timer = setTimeout(() => setCopyStatus(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await ledgerService.getEvents({
        page,
        page_size: pageSize,
        search: searchQuery,
        event_type: selectedEventType || undefined
      });
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setEvents(response);
        setTotalCount(response.length);
      } else {
        setEvents(response.results || []);
        setTotalCount(response.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on search
    fetchEvents();
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await ledgerService.exportLogs({
        search: searchQuery,
        event_type: selectedEventType || undefined
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      // You could add a toast here
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopyStatus(label);
    }).catch(() => {
        setCopyStatus('error');
    });
  };

  const formatEventType = (type: string) => {
    return (type || 'UNKNOWN_EVENT').replace(/_/g, ' ');
  };

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Audit Log</h1>
          <p className="text-muted mb-0">Track all system events and changes</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} className="me-2" />
                Export Logs
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <form onSubmit={handleSearch} className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <Search size={18} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 bg-light"
                  placeholder="Search by ID, entity, or actor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select 
                className="form-select"
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
              >
                <option value="">All Event Types</option>
                <option value="USER_CREATED">User Created</option>
                <option value="USER_UPDATED">User Updated</option>
                <option value="INSTITUTION_VERIFIED">Institution Verified</option>
                <option value="TRUST_LEVEL_UPDATED">Trust Level Updated</option>
                <option value="INTERNSHIP_APPLIED">Internship Applied</option>
                <option value="EVIDENCE_SUBMITTED">Evidence Submitted</option>
                <option value="INCIDENT_REPORTED">Incident Reported</option>
              </select>
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-primary w-100">
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Events Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light bg-opacity-50 position-sticky top-0" style={{ zIndex: 10 }}>
                <tr>
                  <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-semibold">Event Type</th>
                  <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-semibold">Actor</th>
                  <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-semibold">Entity</th>
                  <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-semibold">Timestamp</th>
                  <th className="px-4 py-3 border-0 text-muted small text-uppercase fw-semibold text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="p-4">
                        <TableSkeleton rows={5} />
                      </div>
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      No events found matching your criteria
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                            <Activity size={16} className="text-primary" />
                          </div>
                          <div>
                            <div className="fw-semibold">{formatEventType(event.event_type)}</div>
                            <div className="small text-muted d-flex align-items-center" style={{ fontSize: '11px' }}>
                                ID: {event.id?.substring(0, 8) || 'N/A'}...
                                <button 
                                    className="btn btn-link p-0 ms-1 text-muted" 
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(event.id || '', `ID-${event.id}`); }}
                                    title="Copy ID"
                                >
                                    {copyStatus === `ID-${event.id}` ? (
                                        <Check size={10} className="text-success" />
                                    ) : copyStatus === 'error' ? (
                                        <XIcon size={10} className="text-danger" />
                                    ) : (
                                        <Copy size={10} />
                                    )}
                                </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="d-flex align-items-center">
                            <User size={14} className="me-2 text-muted" />
                            <span>{event.actor_name || event.actor_id || 'System'}</span>
                         </div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="d-flex align-items-center">
                            <Database size={14} className="me-2 text-muted" />
                            <div>
                                <div>{event.entity_type || 'Unknown'}</div>
                                <div className="small text-muted d-flex align-items-center" style={{ fontSize: '11px' }}>
                                    {event.entity_id?.substring(0, 8) || 'N/A'}...
                                    <button 
                                        className="btn btn-link p-0 ms-1 text-muted" 
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(event.entity_id || '', `Entity-${event.id}`); }}
                                        title="Copy Entity ID"
                                    >
                                        {copyStatus === `Entity-${event.id}` ? (
                                            <Check size={10} className="text-success" />
                                        ) : copyStatus === 'error' ? (
                                            <XIcon size={10} className="text-danger" />
                                        ) : (
                                            <Copy size={10} />
                                        )}
                                    </button>
                                </div>
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center text-muted">
                          <Calendar size={14} className="me-2" />
                          {formatDate(event.occurred_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setSelectedEvent(event)}
                        >
                          <Eye size={14} className="me-1" /> Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        {!isLoading && totalCount > 0 && (
          <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} events
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link border-0" onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Logic to show window of pages around current page
                  let p = page;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  
                  return (
                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                      <button className="page-link border-0 rounded-circle mx-1" onClick={() => setPage(p)}>
                        {p}
                      </button>
                    </li>
                  );
                })}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link border-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight size={16} />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Event Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedEvent(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                    <div className="col-md-6">
                        <h6 className="fw-bold text-muted text-uppercase small">Event Info</h6>
                        <table className="table table-sm table-borderless">
                            <tbody>
                                <tr>
                                    <td className="text-muted">Type:</td>
                                    <td className="fw-semibold">{formatEventType(selectedEvent.event_type)}</td>
                                </tr>
                                <tr>
                                    <td className="text-muted">ID:</td>
                                    <td className="font-monospace small">{selectedEvent.id}</td>
                                </tr>
                                <tr>
                                    <td className="text-muted">Timestamp:</td>
                                    <td>{formatDate(selectedEvent.occurred_at)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="col-md-6">
                        <h6 className="fw-bold text-muted text-uppercase small">Actor & Entity</h6>
                        <table className="table table-sm table-borderless">
                            <tbody>
                                <tr>
                                    <td className="text-muted">Actor:</td>
                                    <td>{selectedEvent.actor_name || selectedEvent.actor_id || 'System'}</td>
                                </tr>
                                <tr>
                                    <td className="text-muted">Entity Type:</td>
                                    <td>{selectedEvent.entity_type}</td>
                                </tr>
                                <tr>
                                    <td className="text-muted">Entity ID:</td>
                                    <td className="font-monospace small">
                                        {selectedEvent.entity_id}
                                        <button 
                                            className="btn btn-link p-0 ms-2 text-muted" 
                                            onClick={() => copyToClipboard(selectedEvent.entity_id, 'Modal-Entity')}
                                            title="Copy Entity ID"
                                        >
                                            {copyStatus === 'Modal-Entity' ? (
                                                <Check size={12} className="text-success" />
                                            ) : copyStatus === 'error' ? (
                                                <XIcon size={12} className="text-danger" />
                                            ) : (
                                                <Copy size={12} />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h6 className="fw-bold text-muted text-uppercase small mb-2">Payload Data</h6>
                <div className="bg-light p-3 rounded font-monospace small" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <pre className="mb-0">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
                </div>

                <div className="mt-4 pt-3 border-top">
                    <h6 className="fw-bold text-muted text-uppercase small mb-2">Cryptographic Verification</h6>
                    <div className="alert alert-light border d-flex align-items-center">
                        <Shield size={20} className="text-success me-3" />
                        <div className="text-break font-monospace small" style={{ fontSize: '11px' }}>
                            <strong>Hash:</strong> {selectedEvent.hash}
                            <br />
                            <strong>Prev:</strong> {selectedEvent.previous_hash}
                        </div>
                    </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AuditLog;
