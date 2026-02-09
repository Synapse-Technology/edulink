import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contactService } from '../../../services/contact/contactService';
import type { ContactSubmission } from '../../../services/contact/contactService';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { FeedbackModal } from '../../../components/common';
import { format } from 'date-fns';
import AdminLayout from '../../../components/admin/AdminLayout';

const ContactManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({
    status: '', // 'processed' or 'unprocessed'
    search: ''
  });
  const { feedbackProps, showError, showSuccess } = useFeedbackModal();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState('');

  // Fetch submissions
  const { data: submissions = [], isLoading: loading } = useQuery({
    queryKey: ['admin-contact-submissions'],
    queryFn: () => contactService.getAdminSubmissions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const filteredSubmissions = submissions.filter(s => {
    const matchesStatus = filter.status === '' || 
      (filter.status === 'processed' ? s.is_processed : !s.is_processed);
    const matchesSearch = filter.search === '' || 
      s.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      s.email.toLowerCase().includes(filter.search.toLowerCase()) ||
      s.subject.toLowerCase().includes(filter.search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleProcess = async (id: string) => {
    try {
      await contactService.processSubmission(id, internalNotes);
      showSuccess('Processing Complete', 'Submission marked as processed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      setProcessingId(null);
      setInternalNotes('');
    } catch (err: any) {
      showError('Processing Failed', err.message || 'Failed to process submission');
    }
  };

  return (
    <AdminLayout>
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 mb-0">Contact Form Submissions</h2>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] })} 
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold">Search</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0" 
                    placeholder="Search by name, email or subject..."
                    value={filter.search}
                    onChange={(e) => setFilter({...filter, search: e.target.value})}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Status</label>
                <select 
                  className="form-select form-select-sm" 
                  value={filter.status} 
                  onChange={(e) => setFilter({...filter, status: e.target.value})}
                >
                  <option value="">All Submissions</option>
                  <option value="unprocessed">Pending Review</option>
                  <option value="processed">Processed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Date</th>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-5">Loading submissions...</td></tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-5 text-muted">No submissions found.</td></tr>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="small">{format(new Date(sub.created_at), 'MMM d, yyyy HH:mm')}</td>
                      <td>
                        <div className="fw-semibold">{sub.name}</div>
                        <small className="text-muted">{sub.email}</small>
                      </td>
                      <td><div className="text-truncate" style={{maxWidth: '150px'}}>{sub.subject}</div></td>
                      <td>
                        <div className="text-muted small text-truncate" style={{maxWidth: '250px'}}>
                          {sub.message}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${sub.is_processed ? 'bg-success' : 'bg-warning'}`}>
                          {sub.is_processed ? 'Processed' : 'Pending'}
                        </span>
                      </td>
                      <td className="text-end">
                        {!sub.is_processed ? (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => setProcessingId(sub.id)}
                          >
                            Review & Process
                          </button>
                        ) : (
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                showSuccess('Processing Details', `Processed on ${format(new Date(sub.processed_at!), 'MMM d')}. Notes: ${sub.internal_notes || 'None'}`);
                            }}
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Process Modal */}
      {processingId && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Process Contact Submission</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setProcessingId(null)}></button>
              </div>
              <div className="modal-body p-4">
                {(() => {
                  const sub = submissions.find(s => s.id === processingId);
                  if (!sub) return null;
                  return (
                    <>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="text-muted small d-block">From</label>
                          <p className="fw-bold mb-0">{sub.name} ({sub.email})</p>
                        </div>
                        <div className="col-md-6 text-md-end">
                          <label className="text-muted small d-block">Received At</label>
                          <p className="mb-0">{format(new Date(sub.created_at), 'PPP p')}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="text-muted small d-block">Subject</label>
                        <p className="fw-bold fs-5">{sub.subject}</p>
                      </div>
                      <div className="mb-4 bg-light p-3 rounded">
                        <label className="text-muted small d-block mb-2">Message Content</label>
                        <div className="white-space-pre-wrap">{sub.message}</div>
                      </div>
                      <div className="mb-0">
                        <label className="form-label fw-bold">Internal Processing Notes</label>
                        <textarea 
                          className="form-control" 
                          rows={3} 
                          placeholder="What action was taken? (e.g., Replied via email, forwarded to support...)"
                          value={internalNotes}
                          onChange={(e) => setInternalNotes(e.target.value)}
                        ></textarea>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setProcessingId(null)}>Cancel</button>
                <button type="button" className="btn btn-primary px-4" onClick={() => handleProcess(processingId)}>
                  Mark as Processed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal {...feedbackProps} />
    </AdminLayout>
  );
};

export default ContactManagement;
