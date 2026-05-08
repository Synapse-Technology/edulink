import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  ShieldAlert,
  ClipboardList,
  RefreshCcw,
} from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type {
  InternshipApplication,
  Incident,
} from '../../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import { SupervisorLayout } from '../../../../components/admin/employer';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';
import {
  SupervisorWorkspaceEmpty,
  SupervisorWorkspacePage,
  SupervisorWorkspaceTable,
} from '../../../../components/employer/supervisor/workspace';

const SupervisorIncidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [internships, setInternships] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<string>('');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const normalizeList = <T,>(response: T[] | { results?: T[] }): T[] => {
    return Array.isArray(response) ? response : response?.results || [];
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [incidentsData, internshipsData] = await Promise.all([
        internshipService.getIncidents(),
        internshipService.getApplications(),
      ]);

      setIncidents(normalizeList<Incident>(incidentsData as any));
      setInternships(normalizeList<InternshipApplication>(internshipsData as any));
    } catch (err: any) {
      console.error('Failed to fetch data', err);
      setError('Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setIncidentTitle('');
    setIncidentDescription('');
    setSelectedInternship('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInternship || !incidentTitle.trim() || !incidentDescription.trim()) {
      return;
    }

    try {
      setSubmitting(true);

      await internshipService.reportIncident(
        selectedInternship,
        incidentTitle.trim(),
        incidentDescription.trim()
      );

      toast.success('Incident reported successfully');
      setShowCreateModal(false);
      resetCreateForm();
      fetchData();
    } catch (err: any) {
      console.error('Failed to report incident', err);
      toast.error('Failed to report incident');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'danger';
      case 'RESOLVED':
        return 'success';
      case 'DISMISSED':
        return 'muted';
      default:
        return 'muted';
    }
  };

  const openIncidents = incidents.filter((incident) => incident.status === 'OPEN').length;
  const resolvedIncidents = incidents.filter(
    (incident) => incident.status === 'RESOLVED'
  ).length;
  const dismissedIncidents = incidents.filter(
    (incident) => incident.status === 'DISMISSED'
  ).length;

  if (loading) {
    return (
      <SupervisorLayout>
        <SupervisorTableSkeleton hasAction />
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <SupervisorWorkspacePage className="incidents-page">
        <div className="container-fluid px-3 px-lg-5 py-4 py-lg-5">
          <div className="incidents-hero mb-4">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
              <div>
                <div className="eyebrow mb-3">
                  <ShieldAlert size={15} />
                  Incident Accountability
                </div>

                <h1 className="page-title mb-2">Incidents & Misconduct</h1>

                <p className="page-subtitle mb-0">
                  Report workplace concerns, track escalation status, and maintain a clear
                  supervision record for institution review.
                </p>
              </div>

              <div className="hero-actions">
                <button className="hero-refresh-btn" onClick={fetchData}>
                  <RefreshCcw size={16} />
                  Refresh
                </button>

                <button
                  className="hero-report-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={17} />
                  Report Incident
                </button>
              </div>
            </div>

            <div className="summary-grid mt-4">
              <div className="summary-card dark">
                <span>Total Reports</span>
                <h2>{incidents.length}</h2>
                <p>Incidents reported from your supervision workspace</p>
              </div>

              <div className="summary-card">
                <span>Open</span>
                <h2>{openIncidents}</h2>
                <p>Require institutional or employer attention</p>
              </div>

              <div className="summary-card">
                <span>Resolved</span>
                <h2>{resolvedIncidents}</h2>
                <p>Reports closed after review</p>
              </div>

              <div className="summary-card">
                <span>Dismissed</span>
                <h2>{dismissedIncidents}</h2>
                <p>Reports closed without action</p>
              </div>
            </div>
          </div>

          {error ? (
            <Alert variant="danger" className="incident-alert">
              <AlertTriangle size={24} />

              <div>
                <h6>Failed to load incidents</h6>
                <p>{error}</p>

                <Button variant="outline-danger" size="sm" onClick={fetchData}>
                  Try Again
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="workspace-card">
              <div className="workspace-header">
                <div>
                  <div className="section-kicker">
                    <ClipboardList size={14} />
                    Report History
                  </div>

                  <h5>Reported Incidents</h5>

                  <p>
                    These reports form part of the student’s workplace supervision and
                    escalation trail.
                  </p>
                </div>

                <span className="mini-count">
                  {incidents.length} report{incidents.length === 1 ? '' : 's'}
                </span>
              </div>

              {incidents.length > 0 ? (
                <SupervisorWorkspaceTable>
                  <table className="sv-table">
                    <thead>
                      <tr>
                        <th>Incident</th>
                        <th>Description</th>
                        <th>Placement</th>
                        <th>Reported</th>
                        <th>Status</th>
                        <th>Resolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident) => {
                        const tone = getStatusTone(incident.status);
                        const resolution =
                          incident.status === 'RESOLVED'
                            ? 'Resolved'
                            : incident.status === 'DISMISSED'
                            ? 'Dismissed'
                            : 'Pending review';

                        return (
                          <tr key={incident.id}>
                            <td>
                              <div className="sv-person">
                                <span className="sv-avatar">
                                  {(incident.student_info?.name || 'I').charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <p className="sv-primary">{incident.title}</p>
                                  <p className="sv-muted">
                                    {incident.student_info?.name || 'Unknown Student'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <p className="sv-muted" style={{ maxWidth: 380 }}>
                                {incident.description}
                              </p>
                            </td>
                            <td>
                              <p className="sv-primary">
                                {incident.internship_title || 'Untitled'}
                              </p>
                            </td>
                            <td>
                              <p className="sv-primary">
                                {new Date(incident.created_at).toLocaleDateString()}
                              </p>
                            </td>
                            <td>
                              <span className={`sv-pill ${tone}`}>{incident.status}</span>
                            </td>
                            <td>
                              <span className={`sv-pill ${tone}`}>{resolution}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </SupervisorWorkspaceTable>
              ) : (
                <SupervisorWorkspaceEmpty
                  icon={<CheckCircle size={30} />}
                  title="No incidents reported"
                  message="No incident reports exist yet. Use the report action only for genuine workplace concerns that require an accountable record."
                />
              )}
            </div>
          )}
        </div>

        <Modal
          show={showCreateModal}
          onHide={() => {
            setShowCreateModal(false);
            resetCreateForm();
          }}
          centered
          className="incident-modal"
        >
          <Form onSubmit={handleCreateSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>Report New Incident</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <div className="escalation-warning mb-4">
                <AlertTriangle size={20} />

                <div>
                  <strong>Formal escalation record</strong>
                  <p>
                    This report may be visible to institution administrators and can become
                    part of the student’s supervision history. Keep the report factual,
                    specific, and professional.
                  </p>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Select Internship / Student</Form.Label>

                <Form.Select
                  required
                  value={selectedInternship}
                  onChange={(e) => setSelectedInternship(e.target.value)}
                >
                  <option value="">Select internship</option>

                  {internships.map((internship) => (
                    <option key={internship.id} value={internship.id}>
                      {internship.student_info?.name || 'Unknown Student'} —{' '}
                      {internship.title}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Incident Title</Form.Label>

                <Form.Control
                  type="text"
                  required
                  placeholder="Brief, factual summary of the issue"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Description</Form.Label>

                <Form.Control
                  as="textarea"
                  rows={5}
                  required
                  placeholder="Describe what happened, when it happened, who was involved, and any immediate action taken."
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                />
              </Form.Group>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="light"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                type="submit"
                disabled={
                  submitting ||
                  !selectedInternship ||
                  !incidentTitle.trim() ||
                  !incidentDescription.trim()
                }
              >
                {submitting ? <Spinner animation="border" size="sm" /> : <Plus size={16} />}
                Submit Report
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <style>{`
          .incidents-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(220, 38, 38, 0.055), transparent 32rem),
              linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%);
            color: #0f172a;
          }

          .incidents-hero,
          .workspace-card {
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.045);
          }

          .incidents-hero {
            padding: 1.5rem;
            backdrop-filter: blur(14px);
          }

          .eyebrow,
          .section-kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #dc2626;
          }

          .page-title {
            font-size: clamp(1.75rem, 3vw, 2.35rem);
            font-weight: 850;
            letter-spacing: -0.045em;
            color: #0f172a;
          }

          .page-subtitle {
            max-width: 720px;
            color: #64748b;
            font-size: 0.98rem;
            line-height: 1.65;
          }

          .hero-actions {
            display: flex;
            align-items: flex-start;
            gap: 0.7rem;
            flex-wrap: wrap;
          }

          .hero-refresh-btn,
          .hero-report-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.72rem 0.95rem;
            border-radius: 999px;
            font-size: 0.84rem;
            font-weight: 800;
            border: 0;
          }

          .hero-refresh-btn {
            color: #334155;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
          }

          .hero-report-btn {
            color: #ffffff;
            background: #dc2626;
            box-shadow: 0 12px 24px rgba(220, 38, 38, 0.18);
          }

          .summary-grid {
            display: grid;
            grid-template-columns: 1.25fr 1fr 1fr 1fr;
            gap: 1rem;
          }

          .summary-card {
            padding: 1rem;
            border-radius: 20px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .summary-card.dark {
            background: linear-gradient(135deg, #7f1d1d 0%, #0f172a 100%);
            color: #ffffff;
          }

          .summary-card span {
            display: block;
            margin-bottom: 0.4rem;
            color: #64748b;
            font-size: 0.74rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.045em;
          }

          .summary-card.dark span,
          .summary-card.dark p {
            color: rgba(255, 255, 255, 0.74);
          }

          .summary-card h2 {
            margin: 0;
            font-size: 2rem;
            font-weight: 850;
            letter-spacing: -0.04em;
          }

          .summary-card p {
            margin: 0.2rem 0 0;
            color: #64748b;
            font-size: 0.84rem;
            line-height: 1.4;
          }

          .incident-alert {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem;
            border: 0;
            border-radius: 20px;
            box-shadow: 0 14px 35px rgba(15, 23, 42, 0.06);
          }

          .incident-alert h6 {
            margin-bottom: 0.2rem;
            font-weight: 850;
          }

          .incident-alert p {
            margin-bottom: 0.8rem;
            font-size: 0.88rem;
          }

          .workspace-card {
            overflow: hidden;
          }

          .workspace-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.35rem 1.35rem 1rem;
            border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          }

          .workspace-header h5 {
            margin: 0.35rem 0 0.25rem;
            color: #0f172a;
            font-size: 1.08rem;
            font-weight: 850;
            letter-spacing: -0.02em;
          }

          .workspace-header p {
            margin: 0;
            color: #64748b;
            font-size: 0.88rem;
          }

          .mini-count {
            padding: 0.55rem 0.75rem;
            border-radius: 999px;
            color: #475569;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
            font-size: 0.78rem;
            font-weight: 800;
            white-space: nowrap;
          }

          .incident-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            padding: 1.1rem;
          }

          .incident-card {
            position: relative;
            padding: 1rem;
            border-radius: 22px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.07);
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04);
            overflow: hidden;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .incident-card::before {
            content: '';
            position: absolute;
            inset: 0 auto 0 0;
            width: 4px;
            background: #94a3b8;
          }

          .incident-card.danger::before {
            background: #dc2626;
          }

          .incident-card.success::before {
            background: #059669;
          }

          .incident-card.muted::before {
            background: #64748b;
          }

          .incident-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 22px 42px rgba(15, 23, 42, 0.075);
            border-color: rgba(220, 38, 38, 0.16);
          }

          .incident-top {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: flex-start;
            gap: 0.85rem;
          }

          .incident-icon {
            width: 44px;
            height: 44px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #dc2626;
            background: #fef2f2;
            border: 1px solid rgba(220, 38, 38, 0.12);
            flex-shrink: 0;
          }

          .incident-card h6 {
            margin: 0 0 0.35rem;
            color: #0f172a;
            font-size: 0.98rem;
            font-weight: 850;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .incident-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            color: #64748b;
            font-size: 0.78rem;
          }

          .incident-meta span {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
          }

          .status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.42rem 0.65rem;
            border-radius: 999px;
            font-size: 0.68rem;
            font-weight: 850;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .status-pill.danger {
            color: #b91c1c;
            background: #fef2f2;
          }

          .status-pill.success {
            color: #047857;
            background: #ecfdf5;
          }

          .status-pill.muted {
            color: #475569;
            background: #f1f5f9;
          }

          .incident-description {
            margin-top: 1rem;
            padding: 0.9rem;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.05);
          }

          .incident-description span,
          .incident-context span {
            display: block;
            margin-bottom: 0.25rem;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 850;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .incident-description p {
            margin: 0;
            color: #334155;
            font-size: 0.86rem;
            line-height: 1.55;
          }

          .incident-context {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            margin-top: 0.85rem;
          }

          .incident-context div {
            padding: 0.8rem;
            border-radius: 17px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            color: #64748b;
          }

          .incident-context strong {
            display: block;
            color: #0f172a;
            font-size: 0.84rem;
            font-weight: 850;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .empty-state {
            padding: 4.5rem 1.5rem;
            text-align: center;
          }

          .empty-icon {
            width: 76px;
            height: 76px;
            margin: 0 auto 1rem;
            border-radius: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #059669;
            background: #ecfdf5;
          }

          .empty-state h5 {
            margin-bottom: 0.4rem;
            color: #0f172a;
            font-weight: 850;
          }

          .empty-state p {
            max-width: 440px;
            margin: 0 auto;
            color: #64748b;
            font-size: 0.9rem;
            line-height: 1.55;
          }

          .incident-modal .modal-content {
            border: 0;
            border-radius: 26px;
            overflow: hidden;
            box-shadow: 0 28px 90px rgba(15, 23, 42, 0.22);
          }

          .incident-modal .modal-header,
          .incident-modal .modal-footer {
            padding: 1.2rem 1.35rem;
            border-color: rgba(15, 23, 42, 0.06);
          }

          .incident-modal .modal-title {
            color: #0f172a;
            font-size: 1.08rem;
            font-weight: 850;
          }

          .incident-modal .modal-body {
            padding: 1.35rem;
          }

          .escalation-warning {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.95rem;
            border-radius: 20px;
            color: #92400e;
            background: #fffbeb;
            border: 1px solid #fde68a;
          }

          .escalation-warning strong {
            display: block;
            font-size: 0.9rem;
            font-weight: 850;
          }

          .escalation-warning p {
            margin: 0.18rem 0 0;
            font-size: 0.8rem;
            line-height: 1.45;
          }

          .incident-modal .form-label {
            color: #475569;
            font-size: 0.8rem;
            font-weight: 850;
          }

          .incident-modal .form-control,
          .incident-modal .form-select {
            border-radius: 16px;
            border-color: rgba(15, 23, 42, 0.09);
            font-size: 0.88rem;
            line-height: 1.55;
          }

          .incident-modal textarea {
            resize: vertical;
          }

          .incident-modal .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            border-radius: 999px;
            font-size: 0.82rem;
            font-weight: 800;
            padding: 0.55rem 0.9rem;
          }

          .min-w-0 {
            min-width: 0;
          }

          @media (max-width: 1199.98px) {
            .summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .incident-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 767.98px) {
            .incidents-hero {
              padding: 1.1rem;
              border-radius: 20px;
            }

            .summary-grid,
            .incident-context {
              grid-template-columns: 1fr;
            }

            .workspace-header {
              flex-direction: column;
            }

            .incident-top {
              grid-template-columns: auto minmax(0, 1fr);
            }

            .incident-top .status-pill {
              grid-column: 1 / -1;
              width: fit-content;
            }

            .hero-actions,
            .hero-actions button {
              width: 100%;
            }

            .hero-actions button {
              justify-content: center;
            }

            .incident-modal .modal-footer {
              flex-direction: column;
              align-items: stretch;
            }

            .incident-modal .modal-footer .btn {
              justify-content: center;
              width: 100%;
            }
          }
        `}</style>
      </SupervisorWorkspacePage>
    </SupervisorLayout>
  );
};

export default SupervisorIncidents;
