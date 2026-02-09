import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportService } from '../../../services/support/supportService';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';
import { usePusher } from '../../../hooks/usePusher';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';

const SupportManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({
    status: '',
    category: '',
    priority: '',
    trackingCode: ''
  });
  const { feedbackProps } = useFeedbackModal();

  // Fetch tickets with TanStack Query
  const { data: tickets = [], isLoading: loading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => supportService.getTickets(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Real-time updates via Pusher
  const handleRealtimeUpdate = useCallback(() => {
    // Refresh the list when any ticket is created or updated
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
  }, [queryClient]);

  // Listen for updates on a global support channel for staff
  usePusher(
    'support-global', 
    'ticket-activity',
    handleRealtimeUpdate
  );

  const filteredTickets = tickets.filter(t => {
    return (
      (filter.status === '' || t.status === filter.status) &&
      (filter.category === '' || t.category === filter.category) &&
      (filter.priority === '' || t.priority === filter.priority) &&
      (filter.trackingCode === '' || t.tracking_code.toLowerCase().includes(filter.trackingCode.toLowerCase()))
    );
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-danger';
      case 'HIGH': return 'text-warning';
      case 'MEDIUM': return 'text-primary';
      default: return 'text-muted';
    }
  };

  return (
    <AdminLayout>
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 mb-0">Support Ticket Management</h2>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })} 
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label small fw-bold">Search Code</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0" 
                    placeholder="EL-SUP-XXXXXX"
                    value={filter.trackingCode}
                    onChange={(e) => setFilter({...filter, trackingCode: e.target.value})}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Status</label>
                <select 
                  className="form-select form-select-sm" 
                  value={filter.status} 
                  onChange={(e) => setFilter({...filter, status: e.target.value})}
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Category</label>
                <select 
                  className="form-select form-select-sm" 
                  value={filter.category} 
                  onChange={(e) => setFilter({...filter, category: e.target.value})}
                >
                  <option value="">All Categories</option>
                  <option value="TECHNICAL">Technical Issue</option>
                  <option value="AFFILIATION">Affiliation Query</option>
                  <option value="INTERNSHIP">Internship Assistance</option>
                  <option value="ACCOUNT">Account Management</option>
                  <option value="OTHER">General Inquiry</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Priority</label>
                <select 
                  className="form-select form-select-sm" 
                  value={filter.priority} 
                  onChange={(e) => setFilter({...filter, priority: e.target.value})}
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Code</th>
                  <th>Requester</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-5">Loading tickets...</td></tr>
                ) : filteredTickets.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-5 text-muted">No tickets found matching filters.</td></tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td><span className="fw-bold">{ticket.tracking_code}</span></td>
                      <td>
                        <div className="fw-semibold">{ticket.name}</div>
                        <small className="text-muted">{ticket.email}</small>
                      </td>
                      <td>
                        <div className="text-truncate" style={{maxWidth: '200px'}}>{ticket.subject}</div>
                      </td>
                      <td><span className="badge bg-light text-dark border">{ticket.category}</span></td>
                      <td>
                        <span className={`fw-bold small ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${ticket.status === 'OPEN' ? 'bg-info' : ticket.status === 'RESOLVED' ? 'bg-success' : 'bg-warning'}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>{format(new Date(ticket.created_at), 'MMM d, h:mm a')}</td>
                      <td className="text-end">
                        <Link 
                          to={`/admin/support/tickets/${ticket.tracking_code}`} 
                          className="btn btn-sm btn-primary"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FeedbackModal {...feedbackProps} />
    </AdminLayout>
  );
};

export default SupportManagement;
