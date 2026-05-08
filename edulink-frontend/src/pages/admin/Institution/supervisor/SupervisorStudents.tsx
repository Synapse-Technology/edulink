import React, { useState } from 'react';
import { Spinner, Modal, Form } from 'react-bootstrap';
import {
  Users, FileText, CheckCircle, Star,
  GraduationCap, Building2
} from 'lucide-react';
import { useOutletContext, Link } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { internshipService, type InternshipApplication } from '../../../../services/internship/internshipService';
import { FeedbackModal } from '../../../../components/common';
import { useFeedbackModal } from '../../../../hooks/useFeedbackModal';
import type { SupervisorDashboardContext } from './SupervisorDashboard';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';

/* ─── Animations ──────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// shimmer keyframes removed (unused)

/* ─── Page Layout ─────────────────────────────────────────────────── */
const Page = styled.div`
  animation: ${fadeUp} 0.3s ease both;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin: 0 0 4px;
    letter-spacing: -0.025em;
  }
  p {
    font-size: 13.5px;
    color: var(--steel);
    margin: 0;
  }
`;

const CountPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(47, 111, 237, 0.15);
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
`;

/* ─── Card Shell ──────────────────────────────────────────────────── */
const Card = styled.div`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
`;

const CardHead = styled.div`
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

/* ─── Student Row (replaces table for richer layout) ─────────────── */
const StudentList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StudentRow = styled.div<{ $i: number }>`
  display: grid;
  grid-template-columns: 2.4fr 2fr 1.2fr 1.6fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.14s;
  animation: ${fadeUp} 0.35s ease both;
  animation-delay: ${p => p.$i * 55}ms;
  cursor: default;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--fog);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2.4fr 2fr 1.2fr 1.6fr auto;
  gap: 1rem;
  padding: 9px 1.5rem;
  background: var(--fog);
  border-bottom: 1px solid var(--border);

  span {
    font-size: 11px;
    font-weight: 600;
    color: var(--steel);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  span:last-child {
    text-align: right;
  }

  @media (max-width: 900px) {
    display: none;
  }
`;

/* ─── Student Info Cell ───────────────────────────────────────────── */
const StudentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
`;

const Avatar = styled.div<{ $char: string }>`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: -0.02em;
`;

const StudentMeta = styled.div`
  min-width: 0;
  strong {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--navy);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  span {
    font-size: 12px;
    color: var(--steel);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
`;

/* ─── Internship Cell ─────────────────────────────────────────────── */
const InternshipInfo = styled.div`
  min-width: 0;
`;

const InternTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--navy);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
`;

const SourcePill = styled.span<{ $institution?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${p => p.$institution ? 'var(--accent-dim)' : 'var(--fog)'};
  color: ${p => p.$institution ? 'var(--accent)' : 'var(--slate)'};
  border: 1px solid ${p => p.$institution ? 'rgba(47,111,237,0.15)' : 'var(--border)'};
`;

/* ─── Department Cell ─────────────────────────────────────────────── */
const DeptText = styled.div`
  font-size: 13px;
  color: var(--steel);
`;

/* ─── Status Pill ─────────────────────────────────────────────────── */
const statusConfig: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  ACTIVE: { bg: '#F0FDF4', color: '#15803D', dot: '#16A34A', label: 'Active' },
  COMPLETED: { bg: '#ECFEFF', color: '#0E7490', dot: '#0891B2', label: 'Completed' },
  TERMINATED: { bg: '#FEF2F2', color: '#B91C1C', dot: '#DC2626', label: 'Terminated' },
  CERTIFIED: { bg: '#FFF7ED', color: '#C2410C', dot: '#EA580C', label: 'Certified' },
};

const StatusPill = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  background: ${p => p.$bg};
  color: ${p => p.$color};
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

/* ─── Action Buttons ──────────────────────────────────────────────── */
const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

const ActionBtn = styled.button<{ $variant?: 'ghost' | 'success' | 'primary' | 'muted' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  border: 1px solid transparent;
  text-decoration: none;

  ${p => p.$variant === 'ghost' && css`
    background: var(--fog);
    color: var(--slate);
    border-color: var(--border);
    &:hover { background: var(--border); color: var(--navy); }
  `}
  ${p => p.$variant === 'success' && css`
    background: #F0FDF4;
    color: #15803D;
    border-color: #BBF7D0;
    &:hover { background: #DCFCE7; }
  `}
  ${p => p.$variant === 'primary' && css`
    background: var(--accent-dim);
    color: var(--accent);
    border-color: rgba(47,111,237,0.2);
    &:hover { background: rgba(47,111,237,0.15); }
  `}
  ${p => p.$variant === 'muted' && css`
    background: var(--fog);
    color: var(--steel);
    border-color: var(--border);
    opacity: 0.7;
    cursor: default;
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LogbookLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  border: 1px solid var(--border);
  background: var(--fog);
  color: var(--slate);
  text-decoration: none;

  &:hover {
    background: var(--border);
    color: var(--navy);
    text-decoration: none;
  }
`;

/* ─── Empty State ─────────────────────────────────────────────────── */
const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 1rem;
  text-align: center;

  .icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--fog);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.1rem;
  }

  h5 {
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
    margin: 0 0 5px;
  }

  p {
    font-size: 12.5px;
    color: var(--steel);
    margin: 0;
  }
`;

/* ─── Modal Overrides (keep native modal, style inner elements) ───── */
const ModalStudentHeader = styled.div`
  padding: 12px 16px;
  background: var(--fog);
  border-radius: 8px;
  margin-bottom: 1.1rem;

  strong {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 2px;
  }

  small {
    font-size: 12px;
    color: var(--steel);
  }
`;

const FieldLabel = styled.label`
  font-size: 11.5px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: block;
  margin-bottom: 6px;
`;

/* ─── Helpers ─────────────────────────────────────────────────────── */
const getStatusConfig = (status: string) =>
  statusConfig[status] ?? { bg: 'var(--fog)', color: 'var(--slate)', dot: 'var(--steel)', label: status };

/* ─── Component ───────────────────────────────────────────────────── */
const SupervisorStudents: React.FC = () => {
  const { internships } = useOutletContext<SupervisorDashboardContext>();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [assessmentApplication, setAssessmentApplication] = useState<InternshipApplication | null>(null);
  const [finalFeedback, setFinalFeedback] = useState('');
  const [finalRating, setFinalRating] = useState(5);
  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  const openAssessmentModal = (internship: InternshipApplication) => {
    setAssessmentApplication(internship);
    setFinalFeedback(internship.institution_final_feedback || '');
    setFinalRating(internship.institution_final_rating || 5);
  };

  const handleSubmitFinalAssessment = async () => {
    if (!assessmentApplication || !finalFeedback.trim()) {
      showError('Assessment Required', 'Add your final assessment before saving.');
      return;
    }
    try {
      setProcessingId(assessmentApplication.id);
      await internshipService.submitFinalFeedback(
        assessmentApplication.id,
        finalFeedback.trim(),
        finalRating
      );
      showSuccess('Assessment Saved', 'Institution final assessment has been saved.');
      setAssessmentApplication(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      showError('Assessment Failed', sanitized.userMessage || 'We could not save the final assessment.', sanitized.details);
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (internship: InternshipApplication) => {
    const isInstitutionPosted = !internship.employer_id;
    const actionText = isInstitutionPosted ? 'Recommend for Verification' : 'Complete Internship';

    showConfirm({
      title: actionText,
      message: `Are you sure you want to ${actionText.toLowerCase()} for this student? This action is irreversible.`,
      onConfirm: async () => {
        try {
          setProcessingId(internship.id);
          await internshipService.processApplication(internship.id, 'COMPLETE');
          showSuccess('Action Successful', `${actionText} successful.`);
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          const sanitized = sanitizeAdminError(err);
          showError('Action Failed', `We encountered an error while trying to ${actionText.toLowerCase()}.`, sanitized.details);
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  return (
    <Page>
      {/* Header */}
      <PageHeader>
        <HeaderLeft>
          <h2>My Students</h2>
          <p>Manage your assigned students and track their progress.</p>
        </HeaderLeft>
        {internships.length > 0 && (
          <CountPill>
            <Users size={13} />
            {internships.length} student{internships.length !== 1 ? 's' : ''} assigned
          </CountPill>
        )}
      </PageHeader>

      {/* Main Card */}
      <Card>
        <CardHead>
          <h5>Assigned Students</h5>
        </CardHead>

        {internships.length > 0 ? (
          <>
            <TableHeader>
              <span>Student</span>
              <span>Internship</span>
              <span>Department</span>
              <span>Status</span>
              <span>Actions</span>
            </TableHeader>

            <StudentList>
              {internships.map((internship, i) => {
                const st = getStatusConfig(internship.status);
                const initials = internship.student_info?.name?.charAt(0) ?? 'U';
                const isInstitutionPosted = !internship.employer_id;

                return (
                  <StudentRow key={internship.id} $i={i}>
                    {/* Student */}
                    <StudentInfo>
                      <Avatar $char={initials}>{initials}</Avatar>
                      <StudentMeta>
                        <strong>{internship.student_info?.name ?? 'Unknown Student'}</strong>
                        <span>{internship.student_info?.email}</span>
                      </StudentMeta>
                    </StudentInfo>

                    {/* Internship */}
                    <InternshipInfo>
                      <InternTitle>{internship.title}</InternTitle>
                      <SourcePill $institution={isInstitutionPosted}>
                        {isInstitutionPosted ? <Building2 size={9} /> : <GraduationCap size={9} />}
                        {isInstitutionPosted ? 'Institution Posted' : 'Employer Posted'}
                      </SourcePill>
                    </InternshipInfo>

                    {/* Department */}
                    <DeptText>{internship.department || '—'}</DeptText>

                    {/* Status */}
                    <div>
                      <StatusPill $bg={st.bg} $color={st.color}>
                        <StatusDot $color={st.dot} />
                        {st.label}
                      </StatusPill>
                    </div>

                    {/* Actions */}
                    <Actions>
                      <LogbookLink
                        to={`/institution/supervisor-dashboard/students/${internship.id}/logbook`}
                        title="View Logbooks"
                      >
                        <FileText size={13} />
                        Logbooks
                      </LogbookLink>

                      {internship.can_complete && (
                        <ActionBtn
                          $variant="success"
                          disabled={!!processingId}
                          onClick={() => handleComplete(internship)}
                        >
                          {processingId === internship.id
                            ? <Spinner size="sm" animation="border" />
                            : <CheckCircle size={13} />}
                          {isInstitutionPosted ? 'Recommend' : 'Complete'}
                        </ActionBtn>
                      )}

                      {internship.can_feedback &&
                        ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(internship.status) && (
                          <ActionBtn
                            $variant={
                              internship.status === 'CERTIFIED'
                                ? 'muted'
                                : internship.institution_final_feedback
                                  ? 'ghost'
                                  : 'primary'
                            }
                            disabled={!!processingId || internship.status === 'CERTIFIED'}
                            onClick={() => openAssessmentModal(internship)}
                          >
                            <Star size={13} />
                            {internship.institution_final_feedback ? 'Edit' : 'Assess'}
                          </ActionBtn>
                        )}
                    </Actions>
                  </StudentRow>
                );
              })}
            </StudentList>
          </>
        ) : (
          <Empty>
            <div className="icon">
              <Users size={26} color="var(--steel)" />
            </div>
            <h5>No students assigned</h5>
            <p>When students are assigned to you, they'll appear here.</p>
          </Empty>
        )}
      </Card>

      {/* Assessment Modal */}
      <Modal show={!!assessmentApplication} onHide={() => setAssessmentApplication(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold" style={{ fontSize: 15 }}>
            Institution Final Assessment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ModalStudentHeader>
            <strong>{assessmentApplication?.student_info?.name ?? 'Assigned student'}</strong>
            <small>{assessmentApplication?.title}</small>
          </ModalStudentHeader>

          <div className="mb-3">
            <FieldLabel>Rating</FieldLabel>
            <Form.Select
              value={finalRating}
              onChange={e => setFinalRating(Number(e.target.value))}
              disabled={!!processingId}
              style={{ fontSize: 13 }}
            >
              {[5, 4, 3, 2, 1].map(r => (
                <option key={r} value={r}>{r} / 5</option>
              ))}
            </Form.Select>
          </div>

          <div>
            <FieldLabel>Academic assessment</FieldLabel>
            <Form.Control
              as="textarea"
              rows={5}
              value={finalFeedback}
              onChange={e => setFinalFeedback(e.target.value)}
              placeholder="Summarize attendance, logbook quality, professional conduct, learning outcomes, and readiness for certification."
              disabled={!!processingId}
              style={{ fontSize: 13, resize: 'none' }}
            />
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid var(--border)', gap: 8 }}>
          <ActionBtn $variant="ghost" onClick={() => setAssessmentApplication(null)} disabled={!!processingId}>
            Cancel
          </ActionBtn>
          <ActionBtn
            $variant="primary"
            onClick={handleSubmitFinalAssessment}
            disabled={!!processingId || !finalFeedback.trim()}
          >
            {processingId === assessmentApplication?.id
              ? <Spinner size="sm" animation="border" className="me-1" />
              : null}
            Save Assessment
          </ActionBtn>
        </Modal.Footer>
      </Modal>

      <FeedbackModal {...feedbackProps} />
    </Page>
  );
};

export default SupervisorStudents;