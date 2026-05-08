import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Plus, CheckCircle, Clock, X, ChevronRight, Info } from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { Incident } from '../../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import type { SupervisorDashboardContext } from './SupervisorDashboard';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';
import IncidentDetailsModal from '../../../../components/incident/IncidentDetailsModal';
import styled, { keyframes, css } from 'styled-components';

/* ─── Animations ──────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
`;

/* ─── Layout ──────────────────────────────────────────────────────── */
const Page = styled.div`
  animation: ${fadeUp} 0.3s ease both;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const IconBox = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #FEF2F2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(220,53,69,0.12);
`;

const TitleText = styled.div`
  h1 {
    font-size: 20px;
    font-weight: 600;
    color: var(--navy);
    margin: 0 0 3px;
    letter-spacing: -0.02em;
  }
  p {
    font-size: 13px;
    color: var(--steel);
    margin: 0;
  }
`;

/* ─── Primary action button ───────────────────────────────────────── */
const ReportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: #DC2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.12s;
  letter-spacing: -0.01em;
  white-space: nowrap;

  &:hover  { background: #B91C1C; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

/* ─── Error banner ────────────────────────────────────────────────── */
const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #FEF2F2;
  border: 1px solid rgba(220,38,38,0.18);
  border-left: 3px solid #DC2626;
  border-radius: 8px;
  font-size: 13px;
  color: #7F1D1D;
  margin-bottom: 1.25rem;
`;

/* ─── Card ────────────────────────────────────────────────────────── */
const Card = styled.div`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
`;

const CardHead = styled.div`
  padding: 1.1rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: baseline;
  justify-content: space-between;

  h5 { font-size: 14px; font-weight: 600; color: var(--navy); margin: 0; }
  span { font-size: 12px; color: var(--steel); }
`;

/* ─── Table ───────────────────────────────────────────────────────── */
const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
`;

const Thead = styled.thead`
  background: var(--fog);

  th {
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    color: var(--steel);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  th:first-child { padding-left: 1.5rem; }
  th:last-child  { padding-right: 1.5rem; text-align: right; }
`;

const Tbody = styled.tbody`
  tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
    &:last-child { border-bottom: none; }
    &:hover { background: var(--fog); }
  }

  td {
    padding: 13px 16px;
    vertical-align: middle;
  }

  td:first-child { padding-left: 1.5rem; }
  td:last-child  { padding-right: 1.5rem; text-align: right; }
`;

const TitleCell = styled.div`
  p { font-size: 13.5px; font-weight: 600; color: var(--navy); margin: 0 0 2px; }
  span {
    font-size: 12px;
    color: var(--steel);
    display: block;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const DateCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--steel);
  font-size: 12.5px;
`;

const StudentCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { font-size: 13px; font-weight: 600; color: var(--navy); }
  span   { font-size: 11.5px; color: var(--steel); }
`;

const ViewBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--accent-dim);
  color: var(--accent);
  border: none;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;

  &:hover { background: #BFDBFE; }
`;

/* ─── Status badges ───────────────────────────────────────────────── */
type StatusConfig = { bg: string; color: string; dot: string; label: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  OPEN:             { bg: '#FEF2F2', color: '#B91C1C', dot: '#DC2626',  label: 'Open' },
  ASSIGNED:         { bg: '#FFFBEB', color: '#92400E', dot: '#D97706',  label: 'Assigned' },
  INVESTIGATING:    { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6',  label: 'Investigating' },
  PENDING_APPROVAL: { bg: '#F5F3FF', color: '#5B21B6', dot: '#7C3AED',  label: 'Pending Approval' },
  RESOLVED:         { bg: '#F0FDF4', color: '#166534', dot: '#16A34A',  label: 'Resolved' },
  DISMISSED:        { bg: '#F9FAFB', color: '#4B5563', dot: '#9CA3AF',  label: 'Dismissed' },
};

const StatusPill = styled.span<{ $cfg: StatusConfig }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: ${p => p.$cfg.bg};
  color: ${p => p.$cfg.color};
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${p => p.$cfg.dot};
    flex-shrink: 0;
  }
`;

/* ─── Empty state ─────────────────────────────────────────────────── */
const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 1rem;
  text-align: center;

  div.icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #F0FDF4;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  h5 { font-size: 15px; font-weight: 600; color: var(--navy); margin: 0 0 6px; }
  p  { font-size: 13px; color: var(--steel); margin: 0; }
`;

/* ─── Modal overlay ───────────────────────────────────────────────── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(13, 33, 55, 0.42);
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: ${overlayIn} 0.2s ease;
  backdrop-filter: blur(2px);
`;

const ModalBox = styled.div`
  width: 100%;
  max-width: 500px;
  background: var(--white);
  border-radius: 14px;
  box-shadow: 0 24px 48px rgba(13,33,55,0.18);
  animation: ${slideUp} 0.22s ease both;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--border);

  h3 { font-size: 15px; font-weight: 600; color: var(--navy); margin: 0; }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--steel);
  border-radius: 6px;
  display: flex;
  transition: background 0.14s, color 0.14s;

  &:hover { background: var(--mist); color: var(--navy); }
`;

const ModalBody = styled.div`
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const WarnNote = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  background: #FFFBEB;
  border: 1px solid rgba(217,119,6,0.18);
  border-left: 3px solid #D97706;
  border-radius: 8px;
  font-size: 12.5px;
  color: #78350F;
  line-height: 1.5;

  svg { flex-shrink: 0; margin-top: 1px; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const sharedInput = css`
  width: 100%;
  padding: 9px 12px;
  background: var(--fog);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--navy);
  font-family: var(--font);
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;

  &::placeholder { color: var(--steel); }

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(47,111,237,0.12);
    background: var(--white);
  }
`;

const Select = styled.select`${sharedInput}`;
const Input  = styled.input`${sharedInput}`;
const Textarea = styled.textarea`
  ${sharedInput}
  resize: vertical;
  min-height: 100px;
  line-height: 1.55;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--fog);
`;

const CancelBtn = styled.button`
  padding: 8px 18px;
  background: var(--white);
  border: 1px solid var(--border-md);
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--slate);
  cursor: pointer;
  transition: background 0.14s;

  &:hover { background: var(--mist); }
`;

const SubmitBtn = styled.button`
  padding: 8px 20px;
  background: #DC2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: #B91C1C; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const Spinner = styled.span`
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: white;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.6s linear infinite;

  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ─── Component ───────────────────────────────────────────────────── */
const SupervisorIncidents: React.FC = () => {
  const { internships, incidents: initialIncidents } = useOutletContext<SupervisorDashboardContext>();
  const activeInternships = internships.filter(i => i.status === 'ACTIVE');

  const [incidents, setIncidents]               = useState(initialIncidents);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [selectedInternship, setSelectedInternship] = useState('');
  const [incidentTitle, setIncidentTitle]       = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getIncidents();
      setIncidents(Array.isArray(data) ? data : (data as any)?.results ?? []);
    } catch {
      setError('Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternship || !incidentTitle || !incidentDescription) return;
    try {
      setSubmitting(true);
      await internshipService.reportIncident(selectedInternship, incidentTitle, incidentDescription);
      toast.success('Incident reported successfully');
      setShowCreateModal(false);
      setIncidentTitle('');
      setIncidentDescription('');
      setSelectedInternship('');
      fetchData();
    } catch {
      toast.error('Failed to report incident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowDetailsModal(true);
  };

  const handleIncidentUpdate = (updated: Incident) => {
    setIncidents(prev => prev.map(inc => inc.id === updated.id ? updated : inc));
    setSelectedIncident(updated);
  };

  const getStatusPill = (status: string) => {
    const cfg = STATUS_MAP[status] ?? { bg: '#F9FAFB', color: '#4B5563', dot: '#9CA3AF', label: status };
    return <StatusPill $cfg={cfg}>{cfg.label}</StatusPill>;
  };

  if (loading) return <SupervisorTableSkeleton hasAction />;

  return (
    <Page>
      <PageHeader>
        <TitleGroup>
          <IconBox>
            <AlertTriangle size={22} color="#DC2626" />
          </IconBox>
          <TitleText>
            <h1>Incidents &amp; Misconduct</h1>
            <p>Report and track student incidents during their placement</p>
          </TitleText>
        </TitleGroup>

        <ReportBtn onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Report incident
        </ReportBtn>
      </PageHeader>

      {error && (
        <ErrorBanner>
          <AlertTriangle size={15} />
          {error}
        </ErrorBanner>
      )}

      <Card>
        <CardHead>
          <h5>Reported incidents</h5>
          <span>{incidents.length} total</span>
        </CardHead>

        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <th>Title / Description</th>
                <th>Status</th>
                <th>Reported</th>
                <th>Student</th>
                <th>Action</th>
              </tr>
            </Thead>
            <Tbody>
              {incidents.length > 0 ? incidents.map(incident => (
                <tr key={incident.id}>
                  <td>
                    <TitleCell>
                      <p>{incident.title}</p>
                      <span>{incident.description}</span>
                    </TitleCell>
                  </td>
                  <td>{getStatusPill(incident.status)}</td>
                  <td>
                    <DateCell>
                      <Clock size={13} />
                      {new Date(incident.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </DateCell>
                  </td>
                  <td>
                    <StudentCell>
                      <strong>{incident.student_info?.name ?? 'Unknown'}</strong>
                      <span>{incident.internship_title ?? 'Untitled placement'}</span>
                    </StudentCell>
                  </td>
                  <td>
                    <ViewBtn onClick={() => handleViewDetails(incident)}>
                      Details <ChevronRight size={12} />
                    </ViewBtn>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5}>
                    <Empty>
                      <div className="icon">
                        <CheckCircle size={28} color="#16A34A" />
                      </div>
                      <h5>No incidents reported</h5>
                      <p>There are no incidents on record at this time.</p>
                    </Empty>
                  </td>
                </tr>
              )}
            </Tbody>
          </Table>
        </TableWrap>
      </Card>

      {/* ── Report incident modal ── */}
      {showCreateModal && createPortal(
        <Overlay onClick={() => setShowCreateModal(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateSubmit}>
              <ModalHeader>
                <h3>Report new incident</h3>
                <CloseBtn type="button" onClick={() => setShowCreateModal(false)} aria-label="Close">
                  <X size={17} />
                </CloseBtn>
              </ModalHeader>

              <ModalBody>
                <WarnNote>
                  <Info size={15} color="#D97706" />
                  This report will be escalated to the Institution Admin and will appear on the student's record.
                </WarnNote>

                <FormGroup>
                  <Label htmlFor="internship-select">Internship / Student</Label>
                  <Select
                    id="internship-select"
                    required
                    value={selectedInternship}
                    onChange={e => setSelectedInternship(e.target.value)}
                  >
                    <option value="">Select a placement…</option>
                    {activeInternships.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.student_info?.name ?? 'Unknown student'} — {i.title}
                      </option>
                    ))}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="incident-title">Incident title</Label>
                  <Input
                    id="incident-title"
                    type="text"
                    required
                    placeholder="Brief summary of the incident"
                    value={incidentTitle}
                    onChange={e => setIncidentTitle(e.target.value)}
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="incident-desc">Description</Label>
                  <Textarea
                    id="incident-desc"
                    required
                    placeholder="Describe what happened in detail…"
                    value={incidentDescription}
                    onChange={e => setIncidentDescription(e.target.value)}
                  />
                </FormGroup>
              </ModalBody>

              <ModalFooter>
                <CancelBtn type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </CancelBtn>
                <SubmitBtn type="submit" disabled={submitting}>
                  {submitting ? <><Spinner /> Submitting…</> : 'Report incident'}
                </SubmitBtn>
              </ModalFooter>
            </form>
          </ModalBox>
        </Overlay>,
        document.body
      )}

      {selectedIncident && (
        <IncidentDetailsModal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          incident={selectedIncident}
          onUpdate={handleIncidentUpdate}
          isAdmin={false}
        />
      )}
    </Page>
  );
};

export default SupervisorIncidents;
