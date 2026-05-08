import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Modal } from 'react-bootstrap';
import {
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  RotateCcw,
  MessageSquare,
  Calendar,
  AlertCircle,
  ArrowLeft,
  User as UserIcon,
  Eye,
  Lock,
  BookOpen,
  ChevronRight,
  Paperclip,
} from 'lucide-react';
import styled, { keyframes, css } from 'styled-components';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipEvidence, InternshipApplication, PaginatedResponse } from '../../../services/internship/internshipService';
import PaginationControls from '../../../components/common/PaginationControls';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'react-hot-toast';
import { DocumentPreviewModal } from '../../../components/common';
import SupervisorTableSkeleton from '../../../components/admin/skeletons/SupervisorTableSkeleton';

/* ─── Animations ──────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// shimmer keyframes removed (unused)

/* ─── Page Layout ─────────────────────────────────────────────────── */
const Page = styled.div`
  padding: 2rem 2.5rem;
  max-width: 1100px;
  margin: 0 auto;
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }
`;

/* ─── Back Button ─────────────────────────────────────────────────── */
const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--steel);
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 1.5rem;
  transition: color 0.14s;

  &:hover {
    color: var(--navy);
  }
`;

/* ─── Page Header ─────────────────────────────────────────────────── */
const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div``;

const HeaderTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 6px;
  letter-spacing: -0.03em;
`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--steel);
  flex-wrap: wrap;
`;

const MetaDot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border);
  display: inline-block;
`;

const StudentName = styled.span`
  font-weight: 600;
  color: var(--accent);
`;

const CountPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(47, 111, 237, 0.15);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

/* ─── Stats Row ───────────────────────────────────────────────────── */
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div<{ $delay?: number }>`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  animation: ${fadeUp} 0.35s ease both;
  animation-delay: ${p => p.$delay ?? 0}ms;
`;

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 4px;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 22px;
  font-weight: 700;
  color: ${p => p.$color || 'var(--navy)'};
  letter-spacing: -0.04em;
`;

/* ─── Table Card ──────────────────────────────────────────────────── */
const TableCard = styled.div<{ $delay?: number }>`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  animation: ${fadeUp} 0.4s ease both;
  animation-delay: ${p => p.$delay ?? 0}ms;
`;

const TableCardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);

  h5 {
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
    margin: 0;
  }
`;

/* ─── Table ───────────────────────────────────────────────────────── */
const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: var(--fog);

  th {
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    color: var(--steel);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
    border-bottom: 1px solid var(--border);
  }
`;

const TBody = styled.tbody``;

const TRow = styled.tr`
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
  cursor: default;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--fog);
  }
`;

const TD = styled.td`
  padding: 14px 16px;
  vertical-align: middle;
`;

/* ─── Status Badges ───────────────────────────────────────────────── */
const StatusBadge = styled.span<{ $variant: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;

  ${p => p.$variant === 'accepted' && css`
    background: #F0FDF4;
    color: #15803D;
    border: 1px solid #BBF7D0;
  `}
  ${p => p.$variant === 'rejected' && css`
    background: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
  `}
  ${p => p.$variant === 'revision' && css`
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
  `}
  ${p => p.$variant === 'reviewed' && css`
    background: #FFFBEB;
    color: #B45309;
    border: 1px solid #FDE68A;
  `}
  ${p => p.$variant === 'pending' && css`
    background: var(--fog);
    color: var(--steel);
    border: 1px solid var(--border);
  `}
`;

/* ─── Logbook Title Block ─────────────────────────────────────────── */
const LogTitle = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 3px;
`;

const LogSub = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--steel);
`;

/* ─── Dual Review Mini ────────────────────────────────────────────── */
const DualReviewWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const DualRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`;

const DualLabel = styled.span`
  font-size: 11px;
  color: var(--steel);
  width: 64px;
  flex-shrink: 0;
`;

/* ─── Action Button ───────────────────────────────────────────────── */
const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.14s, background 0.14s, transform 0.14s;

  &:hover {
    border-color: var(--accent);
    background: var(--accent-dim);
    transform: translateY(-1px);
  }
`;

/* ─── Empty State ─────────────────────────────────────────────────── */
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--steel);
`;

const EmptyIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--fog);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

/* ─── Error Banner ────────────────────────────────────────────────── */
const ErrorBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  background: #FEF2F2;
  color: #B91C1C;
  border: 1px solid #FECACA;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  animation: ${slideIn} 0.2s ease both;

  h6 {
    font-size: 13px;
    font-weight: 700;
    margin: 0 0 3px;
  }

  p {
    font-size: 12.5px;
    margin: 0;
    opacity: 0.85;
  }
`;

const RetryBtn = styled.button`
  margin-top: 10px;
  background: none;
  border: 1px solid #FECACA;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #B91C1C;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;

  &:hover {
    background: #fee2e2;
  }
`;

/* ─── Modal Overrides ─────────────────────────────────────────────── */
const ModalSectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
`;

const DayEntry = styled.div`
  background: var(--fog);
  border-radius: 10px;
  border-left: 3px solid var(--accent);
  padding: 12px 14px;
  margin-bottom: 10px;
`;

const DayEntryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const DayName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: var(--navy);
`;

const DayDate = styled.span`
  font-size: 11px;
  color: var(--steel);
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 7px;
`;

const DayContent = styled.p`
  font-size: 12.5px;
  color: var(--navy);
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
`;

const ReviewPanelWrap = styled.div<{ $isEmployer: boolean }>`
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid ${p => p.$isEmployer ? 'rgba(47,111,237,0.18)' : 'rgba(234,179,8,0.2)'};
  background: ${p => p.$isEmployer ? 'var(--accent-dim)' : 'rgba(234,179,8,0.05)'};
  margin-top: 1rem;
`;

const ReviewPanelTitle = styled.div<{ $isEmployer: boolean }>`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${p => p.$isEmployer ? 'var(--accent)' : '#B45309'};
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TextAreaField = styled.textarea`
  width: 100%;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--navy);
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  resize: vertical;
  min-height: 90px;
  font-family: inherit;
  line-height: 1.55;
  transition: border-color 0.14s, box-shadow 0.14s;

  &::placeholder { color: var(--steel); opacity: 0.6; }
  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(47,111,237,0.1);
  }
  &:disabled { background: var(--fog); opacity: 0.7; }
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 5px;
`;

const ModalFooterBtns = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const ModalActionGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const MdBtn = styled.button<{ $variant: 'light' | 'danger' | 'info' | 'success' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: none;
  transition: opacity 0.14s, transform 0.14s;

  &:hover:not(:disabled) { opacity: 0.87; transform: translateY(-1px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  ${p => p.$variant === 'light' && css`
    background: var(--fog);
    color: var(--navy);
    border: 1px solid var(--border);
  `}
  ${p => p.$variant === 'danger' && css`
    background: #FEF2F2;
    color: #B91C1C;
    border: 1px solid #FECACA;
  `}
  ${p => p.$variant === 'info' && css`
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
  `}
  ${p => p.$variant === 'success' && css`
    background: #16A34A;
    color: white;
    border: none;
  `}
`;

const DualReviewGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 6px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const MiniReviewCard = styled.div`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 11px 13px;
`;

const MiniReviewTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const MiniNote = styled.div`
  font-size: 12px;
  color: var(--steel);
  line-height: 1.5;
  margin-top: 4px;
`;

const PrivateNote = styled.div`
  font-size: 11px;
  color: #B91C1C;
  background: #FEF2F2;
  border-radius: 5px;
  padding: 3px 7px;
  margin-top: 5px;
`;

/* ─── Helper: Status Badge ────────────────────────────────────────── */
function getStatusBadge(status?: string) {
  if (!status) return <StatusBadge $variant="pending"><Clock size={9} /> Pending</StatusBadge>;
  switch (status) {
    case 'ACCEPTED': return <StatusBadge $variant="accepted"><CheckCircle size={9} /> Approved</StatusBadge>;
    case 'REJECTED': return <StatusBadge $variant="rejected"><XCircle size={9} /> Rejected</StatusBadge>;
    case 'REVISION_REQUIRED': return <StatusBadge $variant="revision"><RotateCcw size={9} /> Revision</StatusBadge>;
    case 'REVIEWED': return <StatusBadge $variant="reviewed"><Eye size={9} /> Reviewed</StatusBadge>;
    default: return <StatusBadge $variant="pending"><Clock size={9} /> Pending</StatusBadge>;
  }
}

function getStatCount(list: InternshipEvidence[], status: string) {
  return list.filter(e => e.status === status).length;
}

/* ─── Component ───────────────────────────────────────────────────── */
const StudentLogbookHistory: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [evidenceList, setEvidenceList] = useState<InternshipEvidence[]>([]);
  const [evidencePage, setEvidencePage] = useState<PaginatedResponse<InternshipEvidence> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<InternshipEvidence | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isEmployerSupervisor =
    user?.id === application?.employer_supervisor_details?.user_id ||
    user?.id === application?.employer_supervisor_id ||
    user?.role === 'employer_admin';

  const isReadOnly =
    application?.status === 'COMPLETED' ||
    application?.status === 'CERTIFIED' ||
    application?.status === 'TERMINATED';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const fetchData = async (pageNumber = page) => {
    try {
      setLoading(true);
      const [appData, evidenceResp] = await Promise.all([
        internshipService.getApplication(applicationId!),
        internshipService.getEvidencePaginated(applicationId!, { page: pageNumber, page_size: pageSize }),
      ]);

      setApplication(appData);
      setEvidencePage(evidenceResp);
      const logbooks = (evidenceResp.results || [])
        .filter((e: InternshipEvidence) => e.evidence_type === 'LOGBOOK')
        .sort((a: InternshipEvidence, b: InternshipEvidence) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      setEvidenceList(logbooks);
    } catch (err: any) {
      setError('Failed to load logbook history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) fetchData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, page]);

  const handleReviewClick = (evidence: InternshipEvidence) => {
    setSelectedEvidence(evidence);
    if (isEmployerSupervisor) {
      setReviewNotes(evidence.employer_review_notes || '');
      setPrivateNotes(evidence.employer_private_notes || '');
    } else {
      setReviewNotes(evidence.institution_review_notes || '');
      setPrivateNotes(evidence.institution_private_notes || '');
    }
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (action: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED') => {
    if (!selectedEvidence || !applicationId) return;
    try {
      setSubmitting(true);
      await internshipService.reviewEvidence(applicationId, selectedEvidence.id, action, reviewNotes, privateNotes);
      toast.success('Review submitted successfully');
      setShowReviewModal(false);
      fetchData(page);
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <SupervisorTableSkeleton />
      </Page>
    );
  }

  const approvedCount = getStatCount(evidenceList, 'ACCEPTED');
  const rejectedCount = getStatCount(evidenceList, 'REJECTED');
  const pendingCount = evidenceList.filter(
    e => !e.status
  ).length;

  return (
    <Page>
      {/* Back */}
      <BackBtn onClick={() => navigate(-1)}>
        <ArrowLeft size={14} />
        Back to Students
      </BackBtn>

      {/* Header */}
      <PageHeader>
        <HeaderLeft>
          <HeaderTitle>Logbook History</HeaderTitle>
          <HeaderMeta>
            <UserIcon size={13} />
            <StudentName>{application?.student_info?.name}</StudentName>
            <MetaDot />
            <span>{application?.title}</span>
          </HeaderMeta>
        </HeaderLeft>
        <CountPill>
          <BookOpen size={12} />
          {evidencePage?.count ?? evidenceList.length} Submissions
        </CountPill>
      </PageHeader>

      {/* Stats */}
      <StatsRow>
        <StatCard $delay={0}>
          <StatLabel>Total</StatLabel>
          <StatValue>{evidenceList.length}</StatValue>
        </StatCard>
        <StatCard $delay={40}>
          <StatLabel>Approved</StatLabel>
          <StatValue $color="#15803D">{approvedCount}</StatValue>
        </StatCard>
        <StatCard $delay={80}>
          <StatLabel>Pending</StatLabel>
          <StatValue $color="#B45309">{pendingCount}</StatValue>
        </StatCard>
        <StatCard $delay={120}>
          <StatLabel>Rejected</StatLabel>
          <StatValue $color="#B91C1C">{rejectedCount}</StatValue>
        </StatCard>
      </StatsRow>

      {/* Error */}
      {error && (
        <ErrorBanner>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <h6>Error Loading History</h6>
            <p>{error}</p>
            <RetryBtn onClick={() => fetchData(page)}>Try Again</RetryBtn>
          </div>
        </ErrorBanner>
      )}

      {/* Table */}
      {!error && (
        <TableCard $delay={160}>
          <TableCardHead>
            <h5>Submission History</h5>
          </TableCardHead>

          <StyledTable>
            <THead>
              <tr>
                <th style={{ paddingLeft: '24px' }}>Week / Period</th>
                <th>Overall Status</th>
                <th>Dual Review</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Action</th>
              </tr>
            </THead>
            <TBody>
              {evidenceList.length > 0 ? (
                evidenceList.map((evidence, i) => (
                  <TRow key={evidence.id} style={{ animationDelay: `${i * 30}ms` }}>
                    <TD style={{ paddingLeft: '24px' }}>
                      <LogTitle>{evidence.title}</LogTitle>
                      <LogSub>
                        <Calendar size={11} />
                        {evidence.metadata?.weekStartDate || evidence.metadata?.week_start_date
                          ? `Week of ${evidence.metadata.weekStartDate || evidence.metadata.week_start_date}`
                          : evidence.description || '—'}
                      </LogSub>
                    </TD>
                    <TD>{getStatusBadge(evidence.status)}</TD>
                    <TD>
                      <DualReviewWrap>
                        <DualRow>
                          <DualLabel>Employer</DualLabel>
                          {getStatusBadge(evidence.employer_review_status)}
                        </DualRow>
                        <DualRow>
                          <DualLabel>Institution</DualLabel>
                          {getStatusBadge(evidence.institution_review_status)}
                        </DualRow>
                      </DualReviewWrap>
                    </TD>
                    <TD>
                      <LogSub>
                        <Clock size={11} />
                        {new Date(evidence.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </LogSub>
                    </TD>
                    <TD style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <ActionBtn onClick={() => handleReviewClick(evidence)}>
                        <FileText size={12} />
                        {isReadOnly ? 'View' : 'Review'}
                        <ChevronRight size={11} />
                      </ActionBtn>
                    </TD>
                  </TRow>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>
                      <EmptyIcon>
                        <BookOpen size={22} color="var(--steel)" />
                      </EmptyIcon>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                        No Logbooks Found
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--steel)' }}>
                        This student hasn't submitted any logbooks yet.
                      </div>
                    </EmptyState>
                  </td>
                </tr>
              )}
            </TBody>
          </StyledTable>
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
        </TableCard>
      )}

      {/* ── Review Modal ── */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy)' }}>
            Review Weekly Logbook
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: '1.5rem' }}>

          {/* Week label + attachment */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <ModalSectionLabel style={{ margin: 0 }}>Daily Entries</ModalSectionLabel>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedEvidence?.file && (
                <ActionBtn
                  onClick={() => {
                    setPreviewTitle('Attachment');
                    setPreviewUrl(selectedEvidence.file);
                    setPreviewOpen(true);
                  }}
                >
                  <Paperclip size={12} />
                  Attachment
                </ActionBtn>
              )}
              <StatusBadge $variant="pending" style={{ fontSize: '11px', padding: '4px 10px' }}>
                {selectedEvidence?.metadata?.weekStartDate || selectedEvidence?.metadata?.week_start_date
                  ? `Week of ${selectedEvidence.metadata.weekStartDate || selectedEvidence.metadata.week_start_date}`
                  : 'Weekly Submission'}
              </StatusBadge>
            </div>
          </div>

          {/* Daily entries */}
          {selectedEvidence?.metadata?.entries ? (
            Object.entries(selectedEvidence.metadata.entries as Record<string, string>)
              .sort()
              .map(([date, content]) => (
                <DayEntry key={date}>
                  <DayEntryHeader>
                    <DayName>
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </DayName>
                    <DayDate>{date}</DayDate>
                  </DayEntryHeader>
                  <DayContent>{content as string}</DayContent>
                </DayEntry>
              ))
          ) : (
            <div style={{
              textAlign: 'center', padding: '1.5rem', background: 'var(--fog)',
              borderRadius: '8px', color: 'var(--steel)', fontSize: '13px',
            }}>
              No daily logs found in this submission.
            </div>
          )}

          {/* Dual review status */}
          <div style={{ marginTop: '1.25rem' }}>
            <ModalSectionLabel>Review Status</ModalSectionLabel>
            <DualReviewGrid>
              <MiniReviewCard>
                <MiniReviewTitle>
                  Employer Supervisor
                  {getStatusBadge(selectedEvidence?.employer_review_status)}
                </MiniReviewTitle>
                <MiniNote>{selectedEvidence?.employer_review_notes || 'No feedback yet.'}</MiniNote>
                {selectedEvidence?.employer_private_notes && (
                  <PrivateNote>
                    <Lock size={9} style={{ marginRight: 4 }} />
                    {selectedEvidence.employer_private_notes}
                  </PrivateNote>
                )}
              </MiniReviewCard>
              <MiniReviewCard>
                <MiniReviewTitle>
                  Institution Supervisor
                  {getStatusBadge(selectedEvidence?.institution_review_status)}
                </MiniReviewTitle>
                <MiniNote>{selectedEvidence?.institution_review_notes || 'No feedback yet.'}</MiniNote>
                {selectedEvidence?.institution_private_notes && (
                  <PrivateNote>
                    <Lock size={9} style={{ marginRight: 4 }} />
                    {selectedEvidence.institution_private_notes}
                  </PrivateNote>
                )}
              </MiniReviewCard>
            </DualReviewGrid>
          </div>

          {/* Your review */}
          <ReviewPanelWrap $isEmployer={isEmployerSupervisor} style={{ marginTop: '1.25rem' }}>
            <ReviewPanelTitle $isEmployer={isEmployerSupervisor}>
              <MessageSquare size={13} />
              Your Review — As {isEmployerSupervisor ? 'Employer' : 'Institution'} Supervisor
              {isReadOnly && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.7 }}>Read Only</span>
              )}
            </ReviewPanelTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <FieldLabel>Student Feedback (Public)</FieldLabel>
                <TextAreaField
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Feedback visible to the student..."
                  disabled={isReadOnly || submitting}
                />
              </div>
              <div>
                <FieldLabel>Private Notes (Internal)</FieldLabel>
                <TextAreaField
                  value={privateNotes}
                  onChange={e => setPrivateNotes(e.target.value)}
                  placeholder="Notes visible only to you..."
                  disabled={isReadOnly || submitting}
                />
              </div>
            </div>
          </ReviewPanelWrap>
        </Modal.Body>

        <Modal.Footer style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
          <ModalFooterBtns>
            <MdBtn $variant="light" onClick={() => setShowReviewModal(false)} disabled={submitting}>
              {isReadOnly ? 'Close' : 'Cancel'}
            </MdBtn>

            {!isReadOnly && (
              <ModalActionGroup>
                <MdBtn $variant="danger" onClick={() => handleReviewSubmit('REJECTED')} disabled={submitting}>
                  <XCircle size={14} /> Reject
                </MdBtn>
                <MdBtn $variant="info" onClick={() => handleReviewSubmit('REVISION_REQUIRED')} disabled={submitting}>
                  <RotateCcw size={14} /> Request Revision
                </MdBtn>
                <MdBtn $variant="success" onClick={() => handleReviewSubmit('ACCEPTED')} disabled={submitting}>
                  {submitting
                    ? <Spinner animation="border" size="sm" />
                    : <><CheckCircle size={14} /> Update Review</>}
                </MdBtn>
              </ModalActionGroup>
            )}
          </ModalFooterBtns>
        </Modal.Footer>
      </Modal>

      <DocumentPreviewModal
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
      />
    </Page>
  );
};

export default StudentLogbookHistory;