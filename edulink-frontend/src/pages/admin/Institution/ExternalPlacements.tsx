import React, { useEffect, useState } from 'react';
import { CheckCircle, ExternalLink, FileText, XCircle } from 'lucide-react';
import InstitutionLayout from '../../../components/admin/institution/InstitutionLayout';
import { internshipService, type ExternalPlacementDeclaration } from '../../../services/internship/internshipService';
import { showToast } from '../../../utils/toast';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const ExternalPlacements: React.FC = () => {
  const [declarations, setDeclarations] = useState<ExternalPlacementDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDeclarations = async () => {
    try {
      setLoading(true);
      setDeclarations(await internshipService.getExternalPlacementDeclarations());
    } catch (error) {
      showToast.error('Failed to load external placement declarations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeclarations();
  }, []);

  const review = async (id: string, action: 'approve' | 'changes' | 'reject') => {
    try {
      setBusyId(id);
      const notes = reviewNotes[id] || '';
      if (action === 'approve') {
        await internshipService.approveExternalPlacementDeclaration(id, notes);
        showToast.success('Placement approved and activated.');
      } else if (action === 'changes') {
        await internshipService.requestExternalPlacementChanges(id, notes);
        showToast.success('Changes requested from student.');
      } else {
        await internshipService.rejectExternalPlacementDeclaration(id, notes);
        showToast.success('Placement declaration rejected.');
      }
      await loadDeclarations();
    } catch (error: any) {
      const sanitized = sanitizeAdminError(error);
      showToast.error(sanitized.userMessage || 'Review action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const badge = (status: ExternalPlacementDeclaration['status']) => {
    const variant = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : status === 'CHANGES_REQUESTED' ? 'warning' : 'secondary';
    return <span className={`badge bg-${variant}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <InstitutionLayout>
      <div className="container-fluid p-0">
        <div className="mb-4">
          <h2 className="fw-bold mb-1">External Placements</h2>
          <p className="text-muted mb-0">Review student-declared placements secured outside EduLink. Approval activates logbooks and cohort monitoring.</p>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            {loading ? (
              <p className="text-muted mb-0">Loading declarations...</p>
            ) : declarations.length === 0 ? (
              <div className="text-center py-5">
                <FileText size={40} className="text-muted mb-3" />
                <h5>No declarations</h5>
                <p className="text-muted mb-0">Student external placement declarations will appear here.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Placement</th>
                      <th>Company Contact</th>
                      <th>Status</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {declarations.map(declaration => (
                      <tr key={declaration.id}>
                        <td>
                          <div className="fw-semibold">{declaration.student_info?.name || 'Student'}</div>
                          <div className="text-muted small">{declaration.student_info?.email}</div>
                          <div className="text-muted small">{declaration.student_info?.registration_number}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{declaration.role_title}</div>
                          <div className="text-muted small">{declaration.company_name}</div>
                          <div className="text-muted small">{declaration.start_date} {declaration.end_date ? `to ${declaration.end_date}` : ''}</div>
                          {declaration.source_url && (
                            <a href={declaration.source_url} target="_blank" rel="noreferrer" className="small d-inline-flex align-items-center gap-1">
                              Source <ExternalLink size={12} />
                            </a>
                          )}
                        </td>
                        <td>
                          <div>{declaration.company_contact_name || 'Not provided'}</div>
                          <div className="text-muted small">{declaration.company_contact_email}</div>
                          <div className="text-muted small">{declaration.company_contact_phone}</div>
                        </td>
                        <td>{badge(declaration.status)}</td>
                        <td style={{ minWidth: 280 }}>
                          <textarea
                            className="form-control form-control-sm mb-2"
                            rows={2}
                            placeholder="Review notes"
                            value={reviewNotes[declaration.id] || ''}
                            onChange={(event) => setReviewNotes(prev => ({ ...prev, [declaration.id]: event.target.value }))}
                            disabled={declaration.status === 'APPROVED'}
                          />
                          <div className="d-flex flex-wrap gap-2">
                            <button className="btn btn-sm btn-success" disabled={busyId === declaration.id || declaration.status === 'APPROVED'} onClick={() => review(declaration.id, 'approve')}>
                              <CheckCircle size={14} className="me-1" /> Approve
                            </button>
                            <button className="btn btn-sm btn-outline-warning" disabled={busyId === declaration.id || declaration.status === 'APPROVED'} onClick={() => review(declaration.id, 'changes')}>
                              Changes
                            </button>
                            <button className="btn btn-sm btn-outline-danger" disabled={busyId === declaration.id || declaration.status === 'APPROVED'} onClick={() => review(declaration.id, 'reject')}>
                              <XCircle size={14} className="me-1" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </InstitutionLayout>
  );
};

export default ExternalPlacements;
