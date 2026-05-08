import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  ExternalLink,
  FileText,
  XCircle,
  ClipboardCheck,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
} from 'lucide-react';

import InstitutionLayout from '../../../components/admin/institution/InstitutionLayout';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';
import {
  internshipService,
  type ExternalPlacementDeclaration,
} from '../../../services/internship/internshipService';
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

  const review = async (
    id: string,
    action: 'approve' | 'changes' | 'reject'
  ) => {
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

  const getStatusClass = (status: ExternalPlacementDeclaration['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'external-status-approved';
      case 'REJECTED':
        return 'external-status-rejected';
      case 'CHANGES_REQUESTED':
        return 'external-status-changes';
      default:
        return 'external-status-pending';
    }
  };

  const pendingCount = declarations.filter(d => d.status === 'PENDING').length;
  const approvedCount = declarations.filter(d => d.status === 'APPROVED').length;
  const needsActionCount = declarations.filter(
    d => d.status === 'PENDING' || d.status === 'CHANGES_REQUESTED'
  ).length;

  return (
    <InstitutionLayout>
      <InstitutionWorkspacePage className="external-placements-page">
        <style>{`
          .external-hero {
            background: #ffffff;
            border: 1px solid #e7eaf0;
            border-radius: 30px;
            padding: 30px;
            margin-bottom: 24px;
          }

          .external-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 999px;
            background: #f4f6f8;
            border: 1px solid #e6e9ee;
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 18px;
          }

          .external-title {
            font-size: clamp(1.8rem, 3vw, 2.45rem);
            font-weight: 760;
            letter-spacing: -0.06em;
            line-height: 1.05;
            color: #111827;
            margin-bottom: 12px;
          }

          .external-subtitle {
            color: #64748b;
            max-width: 760px;
            line-height: 1.75;
            margin-bottom: 0;
          }

          .external-stat-card {
            background: #ffffff;
            border: 1px solid #e7eaf0;
            border-radius: 24px;
            padding: 22px;
            height: 100%;
          }

          .external-stat-icon {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            background: #f6f7f9;
            border: 1px solid #edf0f4;
            color: #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
          }

          .external-stat-label {
            font-size: 0.74rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
            margin-bottom: 8px;
          }

          .external-stat-value {
            font-size: 1.85rem;
            font-weight: 760;
            letter-spacing: -0.05em;
            color: #111827;
            line-height: 1;
            margin-bottom: 6px;
          }

          .external-stat-sub {
            color: #64748b;
            font-size: 0.86rem;
            margin-bottom: 0;
          }

          .external-card {
            background: #ffffff;
            border: 1px solid #e7eaf0;
            border-radius: 26px;
            overflow: hidden;
          }

          .external-card-header {
            padding: 22px 24px;
            border-bottom: 1px solid #eef2f6;
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: flex-start;
          }

          .external-card-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.05rem;
            font-weight: 730;
            letter-spacing: -0.03em;
            color: #111827;
            margin-bottom: 4px;
          }

          .external-card-subtitle {
            color: #64748b;
            font-size: 0.88rem;
            margin-bottom: 0;
          }

          .external-table-wrap {
            width: 100%;
            overflow-x: auto;
            overflow-y: auto;
            max-height: 650px;
          }

          .external-table {
            width: 100%;
            min-width: 1200px;
            margin-bottom: 0;
            table-layout: fixed;
          }

          .external-table thead th {
            position: sticky;
            top: 0;
            z-index: 3;
            border: none !important;
            background: #f8fafc;
            color: #64748b;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
            padding: 16px 18px;
            white-space: nowrap;
          }

          .external-table tbody td {
            border-top: 1px solid #f1f5f9;
            padding: 18px;
            vertical-align: top;
            background: #ffffff;
          }

          .external-table tbody tr:hover td {
            background: #fbfcfd;
          }

          .student-col {
            width: 250px;
          }

          .placement-col {
            width: 300px;
          }

          .contact-col {
            width: 260px;
          }

          .status-col {
            width: 160px;
          }

          .review-col {
            width: 330px;
          }

          .external-primary-text {
            font-weight: 720;
            color: #111827;
            line-height: 1.3;
          }

          .external-muted {
            color: #64748b;
            font-size: 0.8rem;
            margin-top: 5px;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .external-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 12px;
            border-radius: 999px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #475569;
            font-size: 0.78rem;
            font-weight: 700;
            white-space: nowrap;
          }

          .external-status-approved {
            background: #f0fdf4;
            border-color: #dcfce7;
            color: #166534;
          }

          .external-status-rejected {
            background: #fef2f2;
            border-color: #fee2e2;
            color: #991b1b;
          }

          .external-status-changes {
            background: #fffbeb;
            border-color: #fde68a;
            color: #92400e;
          }

          .external-status-pending {
            background: #f8fafc;
            border-color: #e2e8f0;
            color: #475569;
          }

          .external-source-link {
            color: #111827;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin-top: 8px;
          }

          .external-source-link:hover {
            text-decoration: underline;
          }

          .external-review-box {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .external-notes {
            border-radius: 14px !important;
            border: 1px solid #dbe2ea !important;
            box-shadow: none !important;
            resize: vertical;
            font-size: 0.86rem;
          }

          .external-notes:focus {
            border-color: #111827 !important;
          }

          .external-action-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .external-approve-btn,
          .external-changes-btn,
          .external-reject-btn {
            min-height: 36px;
            border-radius: 12px !important;
            font-weight: 700 !important;
            font-size: 0.8rem !important;
            box-shadow: none !important;
            display: inline-flex !important;
            align-items: center;
            gap: 6px;
          }

          .external-approve-btn {
            background: #111827 !important;
            border: 1px solid #111827 !important;
            color: #ffffff !important;
          }

          .external-changes-btn {
            background: #ffffff !important;
            border: 1px solid #fde68a !important;
            color: #92400e !important;
          }

          .external-reject-btn {
            background: #ffffff !important;
            border: 1px solid #fee2e2 !important;
            color: #dc2626 !important;
          }

          .external-empty-state,
          .external-loading-state {
            background: #ffffff;
            border: 1px dashed #dbe2ea;
            border-radius: 22px;
            padding: 56px 24px;
            text-align: center;
          }

          @media (max-width: 768px) {
            .external-hero {
              padding: 22px;
            }

            .external-card-header {
              flex-direction: column;
            }
          }
        `}</style>

        <div className="external-hero">
          <div>
            <div className="external-eyebrow">
              <ClipboardCheck size={15} />
              External Placement Review
            </div>

            <h1 className="external-title">
              Review student-declared placements secured outside EduLink.
            </h1>

            <p className="external-subtitle">
              Validate company details, confirm declared roles, approve credible placements,
              or request corrections before activating logbooks and cohort monitoring.
            </p>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="external-stat-card">
              <div className="external-stat-icon">
                <FileText size={21} />
              </div>
              <div className="external-stat-label">Total Declarations</div>
              <div className="external-stat-value">{declarations.length}</div>
              <p className="external-stat-sub">Student-submitted external placements</p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="external-stat-card">
              <div className="external-stat-icon">
                <MessageSquare size={21} />
              </div>
              <div className="external-stat-label">Needs Review</div>
              <div className="external-stat-value">{needsActionCount}</div>
              <p className="external-stat-sub">Pending or awaiting changes</p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="external-stat-card">
              <div className="external-stat-icon">
                <CheckCircle size={21} />
              </div>
              <div className="external-stat-label">Approved</div>
              <div className="external-stat-value">{approvedCount}</div>
              <p className="external-stat-sub">Activated for monitoring</p>
            </div>
          </div>
        </div>

        <div className="external-card">
          <div className="external-card-header">
            <div>
              <div className="external-card-title">
                <Building2 size={18} />
                Declaration Queue
              </div>

              <p className="external-card-subtitle">
                Review placement claims before they become official institution-monitored records.
              </p>
            </div>

            <span className="external-pill">
              {pendingCount} Pending
            </span>
          </div>

          {loading ? (
            <div className="p-4">
              <div className="external-loading-state">
                <FileText size={42} className="text-muted mb-3" />
                <h6 className="fw-semibold mb-2">Loading declarations</h6>
                <p className="text-muted mb-0">
                  Fetching external placement submissions.
                </p>
              </div>
            </div>
          ) : declarations.length === 0 ? (
            <div className="p-4">
              <div className="external-empty-state">
                <FileText size={44} className="text-muted mb-3" />
                <h5 className="fw-semibold mb-2">No declarations</h5>
                <p className="text-muted mb-0">
                  Student external placement declarations will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="external-table-wrap">
              <table className="table external-table align-middle">
                <thead>
                  <tr>
                    <th className="student-col">Student</th>
                    <th className="placement-col">Placement</th>
                    <th className="contact-col">Company Contact</th>
                    <th className="status-col">Status</th>
                    <th className="review-col">Review</th>
                  </tr>
                </thead>

                <tbody>
                  {declarations.map(declaration => {
                    const isApproved = declaration.status === 'APPROVED';
                    const isBusy = busyId === declaration.id;

                    return (
                      <tr key={declaration.id}>
                        <td className="student-col">
                          <div className="external-primary-text d-flex align-items-center gap-2">
                            <User size={15} className="text-muted" />
                            {declaration.student_info?.name || 'Student'}
                          </div>

                          <div className="external-muted">
                            <Mail size={13} />
                            {declaration.student_info?.email || 'No email'}
                          </div>

                          <div className="external-muted">
                            {declaration.student_info?.registration_number || 'No registration number'}
                          </div>
                        </td>

                        <td className="placement-col">
                          <div className="external-primary-text">
                            {declaration.role_title}
                          </div>

                          <div className="external-muted">
                            <Building2 size={13} />
                            {declaration.company_name}
                          </div>

                          <div className="external-muted">
                            <Calendar size={13} />
                            {declaration.start_date}
                            {declaration.end_date ? ` to ${declaration.end_date}` : ''}
                          </div>

                          {declaration.source_url && (
                            <a
                              href={declaration.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="external-source-link"
                            >
                              View source
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </td>

                        <td className="contact-col">
                          <div className="external-primary-text">
                            {declaration.company_contact_name || 'Not provided'}
                          </div>

                          <div className="external-muted">
                            <Mail size={13} />
                            {declaration.company_contact_email || 'No email'}
                          </div>

                          <div className="external-muted">
                            <Phone size={13} />
                            {declaration.company_contact_phone || 'No phone'}
                          </div>
                        </td>

                        <td className="status-col">
                          <span className={`external-pill ${getStatusClass(declaration.status)}`}>
                            {declaration.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="review-col">
                          <div className="external-review-box">
                            <textarea
                              className="form-control external-notes"
                              rows={2}
                              placeholder="Add review notes"
                              value={reviewNotes[declaration.id] || ''}
                              onChange={event =>
                                setReviewNotes(prev => ({
                                  ...prev,
                                  [declaration.id]: event.target.value,
                                }))
                              }
                              disabled={isApproved}
                            />

                            <div className="external-action-row">
                              <button
                                className="btn external-approve-btn"
                                disabled={isBusy || isApproved}
                                onClick={() => review(declaration.id, 'approve')}
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>

                              <button
                                className="btn external-changes-btn"
                                disabled={isBusy || isApproved}
                                onClick={() => review(declaration.id, 'changes')}
                              >
                                Changes
                              </button>

                              <button
                                className="btn external-reject-btn"
                                disabled={isBusy || isApproved}
                                onClick={() => review(declaration.id, 'reject')}
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </InstitutionWorkspacePage>
    </InstitutionLayout>
  );
};

export default ExternalPlacements;
