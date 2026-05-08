import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { /* useOutletContext */ } from 'react-router-dom';
import {
  CheckCircle, XCircle, FileText, Clock, RotateCcw,
  MessageSquare, Calendar, AlertCircle, ChevronLeft,
  ChevronRight, Eye, X, Lock
} from 'lucide-react';
import { internshipService } from '../../../../services/internship/internshipService';
import type { InternshipEvidence, PaginatedResponse } from '../../../../services/internship/internshipService';
import PaginationControls from '../../../../components/common/PaginationControls';
import { toast } from 'react-hot-toast';
import { DocumentPreviewModal } from '../../../../components/common';
import SupervisorTableSkeleton from '../../../../components/admin/skeletons/SupervisorTableSkeleton';
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
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;
const spin = keyframes`to { transform: rotate(360deg); }`;

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
  background: #FFFBEB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(217,119,6,0.15);
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

const RetryBtn = styled.button`
  margin-left: auto;
  padding: 5px 12px;
  background: white;
  border: 1px solid rgba(220,38,38,0.3);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #DC2626;
  cursor: pointer;
  transition: background 0.14s;
  &:hover { background: #FEF2F2; }
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
`;

const PendingPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: #FFFBEB;
  color: #92400E;
  border: 1px solid rgba(217,119,6,0.2);
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #D97706;
  }
`;

/* ─── Table ───────────────────────────────────────────────────────── */
const TableWrap = styled.div`overflow-x: auto;`;

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
  .week {
    font-size: 12px;
    color: var(--steel);
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 2px;
  }
  .student { font-size: 12px; color: var(--accent); font-weight: 600; }
`;

const DateCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--steel);
  font-size: 12.5px;
`;

const DualReview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DualRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--steel);
`;

const ReviewBtn = styled.button`
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
  ACCEPTED:         { bg: '#F0FDF4', color: '#166534', dot: '#16A34A', label: 'Approved' },
  REJECTED:         { bg: '#FEF2F2', color: '#B91C1C', dot: '#DC2626', label: 'Rejected' },
  REVISION_REQUIRED:{ bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6', label: 'Revision' },
  REVIEWED:         { bg: '#FFFBEB', color: '#92400E', dot: '#D97706', label: 'Reviewed' },
  PENDING:          { bg: '#FFFBEB', color: '#92400E', dot: '#D97706', label: 'Pending' },
};

const StatusPill = styled.span<{ $cfg: StatusConfig }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  background: ${p => p.$cfg.bg};
  color: ${p => p.$cfg.color};
  border-radius: 20px;
  font-size: 11px;
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

const getStatusPill = (status?: string) => {
  const cfg = STATUS_MAP[status ?? 'PENDING'] ?? STATUS_MAP.PENDING;
  return <StatusPill $cfg={cfg}>{cfg.label}</StatusPill>;
};

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
  max-width: 720px;
  max-height: 90vh;
  background: var(--white);
  border-radius: 14px;
  box-shadow: 0 24px 48px rgba(13,33,55,0.18);
  animation: ${slideUp} 0.22s ease both;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;

  h3 { font-size: 15px; font-weight: 600; color: var(--navy); margin: 0; }
`;

const NavGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavCounter = styled.span`
  font-size: 12px;
  color: var(--steel);
  min-width: 40px;
  text-align: center;
`;

const NavBtn = styled.button<{ disabled?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--fog);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.disabled ? 0.4 : 1};
  color: var(--slate);
  transition: background 0.13s;
  &:hover:not(:disabled) { background: var(--mist); }
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
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

/* ─── Modal sub-sections ──────────────────────────────────────────── */
const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const EntryCard = styled.div`
  background: var(--fog);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 8px;
  &:last-child { margin-bottom: 0; }
`;

const EntryDate = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;

  strong { font-size: 12.5px; font-weight: 600; color: var(--navy); }
  span   { font-size: 11px; color: var(--steel); }
`;

const EntryText = styled.p`
  font-size: 13px;
  color: var(--slate);
  margin: 0;
  line-height: 1.55;
  white-space: pre-wrap;
`;

const DualReviewBox = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const ReviewerCard = styled.div`
  background: var(--fog);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
`;

const ReviewerTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  span { font-size: 12px; font-weight: 600; color: var(--navy); }
`;

const ReviewerNote = styled.p`
  font-size: 12px;
  color: var(--steel);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PrivateNote = styled.p`
  font-size: 11.5px;
  color: #B91C1C;
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 4px;
`;

/* ─── Review form ─────────────────────────────────────────────────── */
const ReviewSection = styled.div`
  background: #FFFBEB;
  border: 1px solid rgba(217,119,6,0.18);
  border-left: 3px solid #D97706;
  border-radius: 8px;
  padding: 14px;
`;

const ReviewSectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 600;
  color: #92400E;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 10px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const sharedInput = css`
  width: 100%;
  padding: 8px 11px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 13px;
  color: var(--navy);
  font-family: var(--font);
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  resize: vertical;
  min-height: 86px;
  line-height: 1.55;

  &::placeholder { color: var(--steel); }
  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(47,111,237,0.12);
  }
`;

const Textarea = styled.textarea`${sharedInput}`;

/* ─── Attachment pill ─────────────────────────────────────────────── */
const AttachPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: var(--accent-dim);
  color: var(--accent);
  border: none;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.13s;
  &:hover { background: #BFDBFE; }
`;

/* ─── Modal footer ────────────────────────────────────────────────── */
const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--fog);
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: wrap;
`;

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
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

const RejectBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #FEF2F2;
  color: #B91C1C;
  border: 1px solid rgba(220,38,38,0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;
  &:hover:not(:disabled) { background: #FEE2E2; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const RevisionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #EFF6FF;
  color: #1D4ED8;
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s;
  &:hover:not(:disabled) { background: #DBEAFE; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ApproveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: #16A34A;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: #15803D; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const Spinner = styled.span`
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: white;
  border-radius: 50%;
  display: inline-block;
  animation: ${spin} 0.6s linear infinite;
`;

/* ─── Component ───────────────────────────────────────────────────── */
const SupervisorLogbooks: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<InternshipEvidence[]>([]);
  const [evidencePage, setEvidencePage] = useState<PaginatedResponse<InternshipEvidence> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<InternshipEvidence | null>(null);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const fetchEvidence = async (p = 1) => {
    try {
      setLoading(true);
      setError(null);
      const resp = await internshipService.getPendingEvidencePaginated({ page: p, page_size: pageSize });
      const data = resp.results || [];
      setEvidencePage(resp);
      setEvidenceList(data.filter((e: InternshipEvidence) => e.evidence_type === 'LOGBOOK'));
    } catch (err) {
      console.error('Failed to load pending logbooks.', err);
      setError('Failed to load logbooks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const openModal = (evidence: InternshipEvidence, index: number) => {
    setSelectedEvidence(evidence);
    setSelectedEvidenceIndex(index);
    setReviewNotes(evidence.institution_review_notes || '');
    setPrivateNotes(evidence.institution_private_notes || '');
    setShowReviewModal(true);
  };

  const navigateTo = (index: number) => {
    if (index < 0 || index >= evidenceList.length) return;
    openModal(evidenceList[index], index);
  };

  const handleReviewSubmit = async (action: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED') => {
    if (!selectedEvidence) return;
    try {
      setSubmitting(true);
      await internshipService.reviewEvidence(
        selectedEvidence.application,
        selectedEvidence.id,
        action,
        reviewNotes,
        privateNotes
      );
      const label = action === 'ACCEPTED' ? 'approved' : action === 'REVISION_REQUIRED' ? 'sent for revision' : 'rejected';
      toast.success(`Logbook ${label} successfully`);
      setShowReviewModal(false);
      fetchEvidence(page);
    } catch (err: any) {
      toast.error(err?.response?.status === 403
        ? 'You cannot review this logbook (internship may be completed).'
        : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SupervisorTableSkeleton hasAction />;

  return (
    <Page>
      <PageHeader>
        <TitleGroup>
          <IconBox>
            <FileText size={22} color="#D97706" />
          </IconBox>
          <TitleText>
            <h1>Pending Logbooks</h1>
            <p>Review and approve weekly logbook submissions from your students</p>
          </TitleText>
        </TitleGroup>
      </PageHeader>

      {error && (
        <ErrorBanner>
          <AlertCircle size={15} />
          {error}
          <RetryBtn onClick={() => fetchEvidence(page)}>Retry</RetryBtn>
        </ErrorBanner>
      )}

      <Card>
        <CardHead>
          <h5>Submission queue</h5>
          <PendingPill>{evidenceList.length} pending</PendingPill>
        </CardHead>

        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <th>Student / Title</th>
                <th>Overall Status</th>
                <th>Dual Review</th>
                <th>Date Submitted</th>
                <th>Action</th>
              </tr>
            </Thead>
            <Tbody>
              {evidenceList.length > 0 ? evidenceList.map((evidence, idx) => (
                <tr key={evidence.id}>
                  <td>
                    <TitleCell>
                      <p>{evidence.title}</p>
                      <div className="week">
                        <Calendar size={11} />
                        {evidence.metadata?.week_start_date
                          ? `Week of ${evidence.metadata.week_start_date}`
                          : evidence.description}
                      </div>
                      <span className="student">{evidence.student_info?.name || 'Unknown Intern'}</span>
                    </TitleCell>
                  </td>
                  <td>{getStatusPill(evidence.status)}</td>
                  <td>
                    <DualReview>
                      <DualRow>
                        <span style={{ minWidth: 60 }}>Employer</span>
                        {getStatusPill(evidence.employer_review_status)}
                      </DualRow>
                      <DualRow>
                        <span style={{ minWidth: 60 }}>Institution</span>
                        {getStatusPill(evidence.institution_review_status)}
                      </DualRow>
                    </DualReview>
                  </td>
                  <td>
                    <DateCell>
                      <Clock size={13} />
                      {new Date(evidence.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </DateCell>
                  </td>
                  <td>
                    <ReviewBtn onClick={() => openModal(evidence, idx)}>
                      <Eye size={13} /> Review
                    </ReviewBtn>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5}>
                    <Empty>
                      <div className="icon">
                        <CheckCircle size={28} color="#16A34A" />
                      </div>
                      <h5>All caught up!</h5>
                      <p>No pending logbooks to review at the moment.</p>
                    </Empty>
                  </td>
                </tr>
              )}
            </Tbody>
          </Table>
        </TableWrap>
          {evidencePage && (
            <PaginationControls
              count={evidencePage.count}
              page={page}
              pageSize={pageSize}
              next={evidencePage.next}
              previous={evidencePage.previous}
              onPageChange={(p) => setPage(p)}
            />
          )}
      </Card>

      {/* ── Review Modal ── */}
      {showReviewModal && selectedEvidence && createPortal(
        <Overlay onClick={() => setShowReviewModal(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h3>Review weekly logbook</h3>
              <NavGroup>
                <NavBtn
                  type="button"
                  disabled={selectedEvidenceIndex === 0}
                  onClick={() => navigateTo(selectedEvidenceIndex - 1)}
                >
                  <ChevronLeft size={14} />
                </NavBtn>
                <NavCounter>{selectedEvidenceIndex + 1} / {evidenceList.length}</NavCounter>
                <NavBtn
                  type="button"
                  disabled={selectedEvidenceIndex >= evidenceList.length - 1}
                  onClick={() => navigateTo(selectedEvidenceIndex + 1)}
                >
                  <ChevronRight size={14} />
                </NavBtn>
                <CloseBtn type="button" onClick={() => setShowReviewModal(false)} aria-label="Close">
                  <X size={17} />
                </CloseBtn>
              </NavGroup>
            </ModalHeader>

            <ModalBody>
              {/* Daily entries */}
              <div>
                <SectionLabel>
                  <span>Daily entries</span>
                  {selectedEvidence.file && (
                    <AttachPill
                      type="button"
                      onClick={() => {
                        setPreviewTitle('Attachment');
                        setPreviewUrl(selectedEvidence.file);
                        setPreviewOpen(true);
                      }}
                    >
                      <FileText size={12} /> View attachment
                    </AttachPill>
                  )}
                </SectionLabel>

                {selectedEvidence.metadata?.entries
                  ? Object.entries(selectedEvidence.metadata.entries as Record<string, string>)
                      .sort()
                      .map(([date, content]) => (
                        <EntryCard key={date}>
                          <EntryDate>
                            <strong>
                              {new Date(date).toLocaleDateString('en-US', {
                                weekday: 'long', month: 'short', day: 'numeric'
                              })}
                            </strong>
                            <span>{date}</span>
                          </EntryDate>
                          <EntryText>{content as string}</EntryText>
                        </EntryCard>
                      ))
                  : <p style={{ fontSize: 13, color: 'var(--steel)', margin: 0 }}>No daily logs found in this submission.</p>
                }
              </div>

              {/* Dual review status */}
              <div>
                <SectionLabel><span>Dual review status</span></SectionLabel>
                <DualReviewBox>
                  {[
                    {
                      label: 'Employer Supervisor',
                      status: selectedEvidence.employer_review_status,
                      notes: selectedEvidence.employer_review_notes,
                      private: selectedEvidence.employer_private_notes,
                    },
                    {
                      label: 'Institution Supervisor',
                      status: selectedEvidence.institution_review_status,
                      notes: selectedEvidence.institution_review_notes,
                      private: selectedEvidence.institution_private_notes,
                    },
                  ].map(r => (
                    <ReviewerCard key={r.label}>
                      <ReviewerTop>
                        <span>{r.label}</span>
                        {getStatusPill(r.status)}
                      </ReviewerTop>
                      <ReviewerNote>{r.notes || 'No feedback yet'}</ReviewerNote>
                      {r.private && (
                        <PrivateNote>
                          <Lock size={10} /> {r.private}
                        </PrivateNote>
                      )}
                    </ReviewerCard>
                  ))}
                </DualReviewBox>
              </div>

              {/* Your review */}
              <ReviewSection>
                <ReviewSectionHead>
                  <MessageSquare size={13} />
                  Your review (Institution Supervisor)
                </ReviewSectionHead>
                <FormGrid>
                  <FormGroup>
                    <Label>Student feedback (public)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      placeholder="Feedback visible to the student…"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Private notes (internal)</Label>
                    <Textarea
                      value={privateNotes}
                      onChange={e => setPrivateNotes(e.target.value)}
                      placeholder="Notes visible only to you…"
                    />
                  </FormGroup>
                </FormGrid>
              </ReviewSection>
            </ModalBody>

            <ModalFooter>
              <CancelBtn type="button" onClick={() => setShowReviewModal(false)}>
                Cancel
              </CancelBtn>
              <FooterActions>
                <RejectBtn type="button" disabled={submitting} onClick={() => handleReviewSubmit('REJECTED')}>
                  <XCircle size={14} /> Reject
                </RejectBtn>
                <RevisionBtn type="button" disabled={submitting} onClick={() => handleReviewSubmit('REVISION_REQUIRED')}>
                  <RotateCcw size={14} /> Request revision
                </RevisionBtn>
                <ApproveBtn type="button" disabled={submitting} onClick={() => handleReviewSubmit('ACCEPTED')}>
                  {submitting ? <Spinner /> : <CheckCircle size={14} />}
                  {submitting ? 'Submitting…' : 'Approve logbook'}
                </ApproveBtn>
              </FooterActions>
            </ModalFooter>
          </ModalBox>
        </Overlay>,
        document.body
      )}

      <DocumentPreviewModal
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
      />
    </Page>
  );
};

export default SupervisorLogbooks;
