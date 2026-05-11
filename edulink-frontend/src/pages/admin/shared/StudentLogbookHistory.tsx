import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Spinner } from 'react-bootstrap';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Lock,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import styled, { css, keyframes } from 'styled-components';
import { toast } from 'react-hot-toast';

import { internshipService } from '../../../services/internship/internshipService';
import type {
  InternshipApplication,
  InternshipEvidence,
  PaginatedResponse,
} from '../../../services/internship/internshipService';

import PaginationControls from '../../../components/common/PaginationControls';
import { DocumentPreviewModal } from '../../../components/common';
import SupervisorTableSkeleton from '../../../components/admin/skeletons/SupervisorTableSkeleton';
import { useAuthStore } from '../../../stores/authStore';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 2rem 2.5rem;
  color: #111827;
  animation: ${fadeUp} .3s ease both;

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }
`;

const BackBtn = styled.button`
  border: 0;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 750;
  margin-bottom: 1.35rem;
  cursor: pointer;

  &:hover {
    color: #0f172a;
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 1.25rem;

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const Kicker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #047857;
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  color: #0f172a;
  font-size: clamp(1.7rem, 3vw, 2.45rem);
  font-weight: 950;
  letter-spacing: -.055em;
  line-height: 1.08;
`;

const SubText = styled.p`
  margin: 0;
  max-width: 720px;
  color: #64748b;
  line-height: 1.65;
  font-size: .92rem;
`;

const StudentStrip = styled.div`
  min-width: 260px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, .04);

  span {
    display: block;
    color: #64748b;
    font-size: .72rem;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 5px;
  }

  strong {
    display: block;
    color: #0f172a;
    font-size: .95rem;
    font-weight: 900;
  }

  small {
    color: #64748b;
    font-size: .8rem;
  }
`;

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: 1.35fr repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 1.25rem;

  @media (max-width: 1050px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.article`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, .04);

  span {
    display: block;
    color: #64748b;
    font-size: .72rem;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 7px;
  }

  strong {
    color: #0f172a;
    font-size: 1.55rem;
    font-weight: 950;
    letter-spacing: -.04em;
    line-height: 1;
  }

  p {
    color: #64748b;
    margin: 8px 0 0;
    font-size: .84rem;
    line-height: 1.5;
  }
`;

const VerificationCard = styled(SummaryCard)`
  background: #0f172a;
  color: #ffffff;

  span,
  p {
    color: rgba(255,255,255,.72);
  }

  strong {
    color: #ffffff;
    font-size: 1.05rem;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 1.25rem;

  strong {
    display: block;
    margin-bottom: 3px;
  }

  p {
    margin: 0;
    font-size: .86rem;
  }
`;

const RetryBtn = styled.button`
  margin-top: 10px;
  border: 1px solid #fecaca;
  background: #ffffff;
  color: #991b1b;
  border-radius: 9px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
`;

const Panel = styled.section`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 10px 26px rgba(15, 23, 42, .04);
`;

const PanelHead = styled.div`
  padding: 18px 20px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;

  h2 {
    margin: 0 0 5px;
    color: #0f172a;
    font-size: 1.1rem;
    font-weight: 950;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: .88rem;
  }
`;

const CountPill = styled.span`
  white-space: nowrap;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  color: #334155;
  padding: 7px 11px;
  font-size: .76rem;
  font-weight: 850;
`;

const EvidenceList = styled.div`
  padding: 18px;
  display: grid;
  gap: 12px;
`;

const EvidenceCard = styled.article`
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 18px;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;

  &:hover {
    background: #f8fafc;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const EvidenceTitle = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;

  .icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: #ecfdf5;
    color: #047857;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  h3 {
    margin: 0 0 5px;
    color: #0f172a;
    font-size: .96rem;
    font-weight: 900;
  }

  p {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: #64748b;
    font-size: .8rem;
  }
`;

const ReviewGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const ReviewChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 999px;
  padding: 6px 9px;
  font-size: .74rem;
  font-weight: 850;
  color: #475569;

  span {
    color: #64748b;
    font-weight: 750;
  }
`;

const ActionBtn = styled.button`
  min-height: 38px;
  border-radius: 12px;
  border: 1px solid #dbe3ea;
  background: #ffffff;
  color: #047857;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  font-size: .8rem;
  font-weight: 850;
  cursor: pointer;

  &:hover {
    border-color: #047857;
    background: #ecfdf5;
  }
`;

const StatusBadge = styled.span<{ $variant: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 6px 9px;
  font-size: .72rem;
  font-weight: 900;
  white-space: nowrap;

  ${({ $variant }) => $variant === 'accepted' && css`
    background: #ecfdf5;
    color: #047857;
  `}

  ${({ $variant }) => $variant === 'rejected' && css`
    background: #fef2f2;
    color: #b91c1c;
  `}

  ${({ $variant }) => $variant === 'revision' && css`
    background: #fffbeb;
    color: #b45309;
  `}

  ${({ $variant }) => $variant === 'reviewed' && css`
    background: #eff6ff;
    color: #2563eb;
  `}

  ${({ $variant }) => $variant === 'pending' && css`
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e5e7eb;
  `}
`;

const EmptyState = styled.div`
  padding: 52px 20px;
  text-align: center;
  color: #64748b;

  .empty-icon {
    width: 58px;
    height: 58px;
    margin: 0 auto 14px;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  strong {
    display: block;
    color: #0f172a;
    font-size: 1rem;
    font-weight: 900;
    margin-bottom: 5px;
  }
`;

const SectionLabel = styled.div`
  color: #64748b;
  font-size: .72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-bottom: 10px;
`;

const DayEntry = styled.div`
  border-left: 3px solid #047857;
  background: #f8fafc;
  border-radius: 12px;
  padding: 13px;
  margin-bottom: 10px;
`;

const DayHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;

  strong {
    color: #0f172a;
    font-size: .84rem;
  }

  span {
    color: #64748b;
    font-size: .76rem;
  }
`;

const DayText = styled.p`
  margin: 0;
  color: #334155;
  line-height: 1.6;
  font-size: .86rem;
  white-space: pre-wrap;
`;

const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr);
  gap: 18px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const ModalCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  background: #ffffff;
`;

const FeedbackBox = styled.div`
  display: grid;
  gap: 10px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  border: 1px solid #dbe3ea;
  border-radius: 13px;
  padding: 12px;
  color: #111827;
  outline: none;
  resize: vertical;
  font: inherit;
  line-height: 1.55;

  &:focus {
    border-color: #047857;
    box-shadow: 0 0 0 4px rgba(4, 120, 87, .08);
  }

  &:disabled {
    background: #f8fafc;
    color: #94a3b8;
  }
`;

const FieldLabel = styled.label`
  color: #334155;
  font-size: .78rem;
  font-weight: 850;
`;

const ReviewHistory = styled.div`
  display: grid;
  gap: 10px;
`;

const ReviewHistoryCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;

  .top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }

  strong {
    color: #0f172a;
    font-size: .84rem;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: .82rem;
    line-height: 1.5;
  }

  .private {
    margin-top: 8px;
    background: #fef2f2;
    color: #991b1b;
    border-radius: 10px;
    padding: 8px;
    font-size: .78rem;
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
`;

const ModalFooterBtns = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const ModalActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MdBtn = styled.button<{ $variant: 'light' | 'danger' | 'warning' | 'success' }>`
  min-height: 38px;
  border-radius: 11px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: .82rem;
  font-weight: 850;
  cursor: pointer;
  border: 1px solid transparent;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  ${({ $variant }) => $variant === 'light' && css`
    background: #ffffff;
    color: #334155;
    border-color: #dbe3ea;
  `}

  ${({ $variant }) => $variant === 'danger' && css`
    background: #fef2f2;
    color: #b91c1c;
    border-color: #fecaca;
  `}

  ${({ $variant }) => $variant === 'warning' && css`
    background: #fffbeb;
    color: #b45309;
    border-color: #fde68a;
  `}

  ${({ $variant }) => $variant === 'success' && css`
    background: #047857;
    color: #ffffff;
  `}
`;

function getStatusBadge(status?: string) {
  switch (status) {
    case 'ACCEPTED':
      return (
        <StatusBadge $variant="accepted">
          <CheckCircle size={11} />
          Approved
        </StatusBadge>
      );
    case 'REJECTED':
      return (
        <StatusBadge $variant="rejected">
          <XCircle size={11} />
          Rejected
        </StatusBadge>
      );
    case 'REVISION_REQUIRED':
      return (
        <StatusBadge $variant="revision">
          <RotateCcw size={11} />
          Revision
        </StatusBadge>
      );
    case 'REVIEWED':
      return (
        <StatusBadge $variant="reviewed">
          <Eye size={11} />
          Reviewed
        </StatusBadge>
      );
    default:
      return (
        <StatusBadge $variant="pending">
          <Clock size={11} />
          Pending
        </StatusBadge>
      );
  }
}

function getStatCount(list: InternshipEvidence[], status: string) {
  return list.filter((item) => item.status === status).length;
}

const StudentLogbookHistory: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [evidenceList, setEvidenceList] = useState<InternshipEvidence[]>([]);
  const [evidencePage, setEvidencePage] =
    useState<PaginatedResponse<InternshipEvidence> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] =
    useState<InternshipEvidence | null>(null);

  const [reviewNotes, setReviewNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const isEmployerSupervisor =
    user?.id === application?.employer_supervisor_details?.user_id ||
    user?.id === application?.employer_supervisor_id ||
    user?.role === 'employer_admin';

  const isReadOnly =
    application?.status === 'COMPLETED' ||
    application?.status === 'CERTIFIED' ||
    application?.status === 'TERMINATED';

  const fetchData = async (pageNumber = page) => {
    try {
      setLoading(true);
      setError(null);

      const [appData, evidenceResp] = await Promise.all([
        internshipService.getApplication(applicationId!),
        internshipService.getEvidencePaginated(applicationId!, {
          page: pageNumber,
          page_size: pageSize,
        }),
      ]);

      setApplication(appData);
      setEvidencePage(evidenceResp);

      const logbooks = (evidenceResp.results || [])
        .filter((item: InternshipEvidence) => item.evidence_type === 'LOGBOOK')
        .sort(
          (a: InternshipEvidence, b: InternshipEvidence) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      setEvidenceList(logbooks);
    } catch {
      setError('Failed to load logbook history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) fetchData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, page]);

  const approvedCount = getStatCount(evidenceList, 'ACCEPTED');
  const rejectedCount = getStatCount(evidenceList, 'REJECTED');
  const revisionCount = getStatCount(evidenceList, 'REVISION_REQUIRED');
  const pendingCount = evidenceList.filter((item) => !item.status).length;

  const verificationSummary = useMemo(() => {
    const employerDone = evidenceList.filter((item) => item.employer_review_status).length;
    const institutionDone = evidenceList.filter((item) => item.institution_review_status).length;

    return {
      employerDone,
      institutionDone,
      total: evidenceList.length,
    };
  }, [evidenceList]);

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

  const handleReviewSubmit = async (
    action: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED',
  ) => {
    if (!selectedEvidence || !applicationId) return;

    try {
      setSubmitting(true);

      await internshipService.reviewEvidence(
        applicationId,
        selectedEvidence.id,
        action,
        reviewNotes,
        privateNotes,
      );

      toast.success('Review submitted successfully.');
      setShowReviewModal(false);
      fetchData(page);
    } catch {
      toast.error('Failed to submit review.');
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

  return (
    <Page>
      <BackBtn onClick={() => navigate(-1)}>
        <ArrowLeft size={14} />
        Back to students
      </BackBtn>

      <Header>
        <div>
          <Kicker>
            <ShieldCheck size={14} />
            Evidence verification
          </Kicker>

          <Title>Student Evidence Review Workspace</Title>

          <SubText>
            Review weekly logbook evidence, validate placement activity, and
            record supervisor feedback for institutional verification.
          </SubText>
        </div>

        <StudentStrip>
          <span>Student record</span>
          <strong>{application?.student_info?.name || 'Student'}</strong>
          <small>{application?.title || 'Placement application'}</small>
        </StudentStrip>
      </Header>

      <SummaryGrid>
        <VerificationCard>
          <span>Verification summary</span>
          <strong>
            {verificationSummary.employerDone}/{verificationSummary.total} employer ·{' '}
            {verificationSummary.institutionDone}/{verificationSummary.total} institution
          </strong>
          <p>Dual-supervisor review progress across visible submissions.</p>
        </VerificationCard>

        <SummaryCard>
          <span>Total</span>
          <strong>{evidenceList.length}</strong>
          <p>Logbook submissions</p>
        </SummaryCard>

        <SummaryCard>
          <span>Approved</span>
          <strong>{approvedCount}</strong>
          <p>Accepted records</p>
        </SummaryCard>

        <SummaryCard>
          <span>Pending</span>
          <strong>{pendingCount}</strong>
          <p>Awaiting review</p>
        </SummaryCard>

        <SummaryCard>
          <span>Revision / rejected</span>
          <strong>{revisionCount + rejectedCount}</strong>
          <p>Needs attention</p>
        </SummaryCard>
      </SummaryGrid>

      {error && (
        <ErrorBanner>
          <AlertCircle size={18} />
          <div>
            <strong>Error loading history</strong>
            <p>{error}</p>
            <RetryBtn onClick={() => fetchData(page)}>Try again</RetryBtn>
          </div>
        </ErrorBanner>
      )}

      {!error && (
        <Panel>
          <PanelHead>
            <div>
              <h2>Weekly evidence submissions</h2>
              <p>Inspect activity records, attachments, and supervisor reviews.</p>
            </div>

            <CountPill>{evidencePage?.count ?? evidenceList.length} submissions</CountPill>
          </PanelHead>

          <EvidenceList>
            {evidenceList.length > 0 ? (
              evidenceList.map((evidence) => (
                <EvidenceCard key={evidence.id}>
                  <div>
                    <EvidenceTitle>
                      <div className="icon">
                        <BookOpen size={18} />
                      </div>

                      <div>
                        <h3>{evidence.title}</h3>
                        <p>
                          <Calendar size={13} />
                          {evidence.metadata?.weekStartDate || evidence.metadata?.week_start_date
                            ? `Week of ${
                                evidence.metadata.weekStartDate ||
                                evidence.metadata.week_start_date
                              }`
                            : evidence.description || 'Weekly logbook evidence'}
                        </p>

                        <ReviewGrid>
                          <ReviewChip>
                            <span>Overall</span>
                            {getStatusBadge(evidence.status)}
                          </ReviewChip>

                          <ReviewChip>
                            <span>Employer</span>
                            {getStatusBadge(evidence.employer_review_status)}
                          </ReviewChip>

                          <ReviewChip>
                            <span>Institution</span>
                            {getStatusBadge(evidence.institution_review_status)}
                          </ReviewChip>

                          <ReviewChip>
                            <Clock size={13} />
                            {new Date(evidence.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </ReviewChip>
                        </ReviewGrid>
                      </div>
                    </EvidenceTitle>
                  </div>

                  <ActionBtn onClick={() => handleReviewClick(evidence)}>
                    <FileText size={14} />
                    {isReadOnly ? 'View evidence' : 'Review evidence'}
                    <ChevronRight size={13} />
                  </ActionBtn>
                </EvidenceCard>
              ))
            ) : (
              <EmptyState>
                <div className="empty-icon">
                  <BookOpen size={24} />
                </div>

                <strong>No logbooks found</strong>
                <p>This student has not submitted any logbooks yet.</p>
              </EmptyState>
            )}
          </EvidenceList>

          {evidencePage && (
            <PaginationControls
              count={evidencePage.count}
              page={page}
              pageSize={pageSize}
              next={evidencePage.next}
              previous={evidencePage.previous}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </Panel>
      )}

      <Modal
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        centered
        size="xl"
      >
        <Modal.Header closeButton style={{ borderBottom: '1px solid #e5e7eb' }}>
          <Modal.Title style={{ color: '#0f172a', fontWeight: 900, fontSize: '1rem' }}>
            Weekly Evidence Verification
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: '1.25rem' }}>
          <ModalGrid>
            <div>
              <SectionLabel>Daily activity entries</SectionLabel>

              {selectedEvidence?.metadata?.entries ? (
                Object.entries(
                  selectedEvidence.metadata.entries as Record<string, string>,
                )
                  .sort()
                  .map(([date, content]) => (
                    <DayEntry key={date}>
                      <DayHead>
                        <strong>
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </strong>
                        <span>{date}</span>
                      </DayHead>

                      <DayText>{content}</DayText>
                    </DayEntry>
                  ))
              ) : (
                <EmptyState>
                  <strong>No daily logs found</strong>
                  <p>This submission has no structured daily entries.</p>
                </EmptyState>
              )}

              {selectedEvidence?.file && (
                <ActionBtn
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    setPreviewTitle('Logbook attachment');
                    setPreviewUrl(selectedEvidence.file);
                    setPreviewOpen(true);
                  }}
                >
                  <Paperclip size={14} />
                  View attachment
                </ActionBtn>
              )}
            </div>

            <div>
              <ModalCard>
                <SectionLabel>Review history</SectionLabel>

                <ReviewHistory>
                  <ReviewHistoryCard>
                    <div className="top">
                      <strong>Employer supervisor</strong>
                      {getStatusBadge(selectedEvidence?.employer_review_status)}
                    </div>

                    <p>{selectedEvidence?.employer_review_notes || 'No feedback yet.'}</p>

                    {selectedEvidence?.employer_private_notes && (
                      <div className="private">
                        <Lock size={13} />
                        {selectedEvidence.employer_private_notes}
                      </div>
                    )}
                  </ReviewHistoryCard>

                  <ReviewHistoryCard>
                    <div className="top">
                      <strong>Institution supervisor</strong>
                      {getStatusBadge(selectedEvidence?.institution_review_status)}
                    </div>

                    <p>{selectedEvidence?.institution_review_notes || 'No feedback yet.'}</p>

                    {selectedEvidence?.institution_private_notes && (
                      <div className="private">
                        <Lock size={13} />
                        {selectedEvidence.institution_private_notes}
                      </div>
                    )}
                  </ReviewHistoryCard>
                </ReviewHistory>
              </ModalCard>

              <ModalCard style={{ marginTop: 14 }}>
                <SectionLabel>
                  {isEmployerSupervisor
                    ? 'Employer verification review'
                    : 'Institution verification review'}
                </SectionLabel>

                <FeedbackBox>
                  <FieldLabel>Student feedback</FieldLabel>
                  <TextArea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="Feedback visible to the student..."
                    disabled={isReadOnly || submitting}
                  />

                  <FieldLabel>Private internal notes</FieldLabel>
                  <TextArea
                    value={privateNotes}
                    onChange={(event) => setPrivateNotes(event.target.value)}
                    placeholder="Internal notes for review context..."
                    disabled={isReadOnly || submitting}
                  />
                </FeedbackBox>
              </ModalCard>
            </div>
          </ModalGrid>
        </Modal.Body>

        <Modal.Footer style={{ borderTop: '1px solid #e5e7eb' }}>
          <ModalFooterBtns>
            <MdBtn
              $variant="light"
              onClick={() => setShowReviewModal(false)}
              disabled={submitting}
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </MdBtn>

            {!isReadOnly && (
              <ModalActionGroup>
                <MdBtn
                  $variant="danger"
                  onClick={() => handleReviewSubmit('REJECTED')}
                  disabled={submitting}
                >
                  <XCircle size={14} />
                  Reject
                </MdBtn>

                <MdBtn
                  $variant="warning"
                  onClick={() => handleReviewSubmit('REVISION_REQUIRED')}
                  disabled={submitting}
                >
                  <RotateCcw size={14} />
                  Request revision
                </MdBtn>

                <MdBtn
                  $variant="success"
                  onClick={() => handleReviewSubmit('ACCEPTED')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Approve
                    </>
                  )}
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