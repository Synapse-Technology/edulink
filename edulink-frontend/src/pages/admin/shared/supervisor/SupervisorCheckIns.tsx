import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Video,
  XCircle,
  Link2,
  Clock3,
  ShieldCheck,
  UserRound,
  MapPin,
  Phone,
  Monitor,
  MoreHorizontal,
} from 'lucide-react';
import {
  internshipService,
  type InternshipApplication,
  type SupervisionCheckIn,
} from '../../../../services/internship/internshipService';
import { showToast } from '../../../../utils/toast';
import { dateFormatter } from '../../../../utils/dateFormatter';

const modeOptions: Array<SupervisionCheckIn['mode']> = [
  'VIRTUAL',
  'PHONE',
  'ONSITE',
  'OTHER',
];

const modeIcons: Record<string, React.ReactNode> = {
  VIRTUAL: <Monitor size={14} />,
  PHONE: <Phone size={14} />,
  ONSITE: <MapPin size={14} />,
  OTHER: <MoreHorizontal size={14} />,
};

const SupervisorCheckIns: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [mode, setMode] = useState<SupervisionCheckIn['mode']>('VIRTUAL');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['supervisor-checkins'],
    queryFn: async () => {
      const applications = await internshipService.getApplications();
      const activeApplications = applications.filter((app) => app.status === 'ACTIVE');

      const checkIns = (
        await Promise.all(
          activeApplications.map((app) =>
            internshipService.getSupervisionCheckIns(app.id).catch(() => [])
          )
        )
      ).flat();

      return { applications: activeApplications, checkIns };
    },
    staleTime: 1000 * 60,
  });

  const applications = data?.applications || [];
  const checkIns = data?.checkIns || [];

  const sortedCheckIns = useMemo(
    () =>
      [...checkIns].sort(
        (a, b) =>
          new Date(a.scheduled_for).getTime() -
          new Date(b.scheduled_for).getTime()
      ),
    [checkIns]
  );

  const scheduledCount = sortedCheckIns.filter(
    (item) => item.status === 'SCHEDULED'
  ).length;

  const completedCount = sortedCheckIns.filter(
    (item) => item.status === 'COMPLETED'
  ).length;

  const confirmedCount = sortedCheckIns.filter(
    (item) => item.student_confirmed_at
  ).length;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['supervisor-checkins'] });
    queryClient.invalidateQueries({ queryKey: ['supervisor-dashboard-data'] });
  };

  const scheduleCheckIn = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedApplicationId || !scheduledFor) {
      showToast.error('Select a placement and scheduled time.');
      return;
    }

    try {
      await internshipService.scheduleSupervisionCheckIn(selectedApplicationId, {
        scheduled_for: new Date(scheduledFor).toISOString(),
        mode,
        meeting_url: meetingUrl,
        supervisor_notes: supervisorNotes,
        private_notes: privateNotes,
      });

      showToast.success('Supervision check-in scheduled.');

      setSelectedApplicationId('');
      setScheduledFor('');
      setMode('VIRTUAL');
      setMeetingUrl('');
      setSupervisorNotes('');
      setPrivateNotes('');

      refresh();
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to schedule check-in.');
    }
  };

  const completeCheckIn = async (checkIn: SupervisionCheckIn) => {
    const notes =
      window.prompt(
        'Completion notes visible to the student',
        checkIn.supervisor_notes || ''
      ) || '';

    const privateCompletionNotes =
      window.prompt(
        'Private notes for institution/supervisor review',
        checkIn.private_notes || ''
      ) || '';

    try {
      setActingId(checkIn.id);

      await internshipService.completeSupervisionCheckIn(
        checkIn.application,
        checkIn.id,
        {
          supervisor_notes: notes,
          private_notes: privateCompletionNotes,
        }
      );

      showToast.success('Check-in marked complete.');
      refresh();
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to complete check-in.');
    } finally {
      setActingId(null);
    }
  };

  const cancelCheckIn = async (checkIn: SupervisionCheckIn) => {
    const reason = window.prompt('Reason for cancellation, if any') || '';

    try {
      setActingId(checkIn.id);

      await internshipService.cancelSupervisionCheckIn(
        checkIn.application,
        checkIn.id,
        reason
      );

      showToast.success('Check-in cancelled.');
      refresh();
    } catch (error: any) {
      showToast.error(error?.message || 'Failed to cancel check-in.');
    } finally {
      setActingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="supervisor-checkins-page">
        <div className="loading-card">
          <div className="loading-pulse" />
          <p>Loading supervision check-ins...</p>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="supervisor-checkins-page">
      <section className="checkins-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Video size={15} />
            Remote supervision workspace
          </div>

          <h1>Supervision check-ins</h1>

          <p>
            Schedule placement reviews, track student confirmations, and maintain
            a clean supervision record across active attachments.
          </p>
        </div>

        <div className="hero-stats">
          <div className="metric-card">
            <div className="metric-icon blue">
              <CalendarClock size={18} />
            </div>
            <div>
              <strong>{scheduledCount}</strong>
              <span>Scheduled</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon green">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <strong>{completedCount}</strong>
              <span>Completed</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon violet">
              <ClipboardCheck size={18} />
            </div>
            <div>
              <strong>{confirmedCount}</strong>
              <span>Confirmed</span>
            </div>
          </div>
        </div>
      </section>

      <div className="checkins-layout">
        <aside className="schedule-panel">
          <div className="panel-heading">
            <div>
              <h2>New check-in</h2>
              <p>{applications.length} active placements available</p>
            </div>

            <div className="panel-icon">
              <ShieldCheck size={18} />
            </div>
          </div>

          <form onSubmit={scheduleCheckIn} className="checkin-form">
            <div className="form-group">
              <label>Placement</label>
              <select
                value={selectedApplicationId}
                onChange={(event) =>
                  setSelectedApplicationId(event.target.value)
                }
                required
              >
                <option value="">Select active placement</option>

                {applications.map((app: InternshipApplication) => (
                  <option key={app.id} value={app.id}>
                    {app.student_info?.name || 'Student'} — {app.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Scheduled time</label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Mode</label>
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as SupervisionCheckIn['mode'])
                }
              >
                {modeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Meeting link</label>
              <div className="input-with-icon">
                <Link2 size={15} />
                <input
                  value={meetingUrl}
                  onChange={(event) => setMeetingUrl(event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Student-visible notes</label>
              <textarea
                rows={3}
                value={supervisorNotes}
                onChange={(event) => setSupervisorNotes(event.target.value)}
                placeholder="Add agenda, preparation notes, or review focus..."
              />
            </div>

            <div className="form-group">
              <label>Private notes</label>
              <textarea
                rows={3}
                value={privateNotes}
                onChange={(event) => setPrivateNotes(event.target.value)}
                placeholder="Internal context for supervisor or institution..."
              />
            </div>

            <button type="submit" className="primary-action">
              <CalendarClock size={16} />
              Schedule check-in
            </button>
          </form>
        </aside>

        <main className="sessions-area">
          <div className="sessions-header">
            <div>
              <h2>Upcoming and past sessions</h2>
              <p>
                {sortedCheckIns.length > 0
                  ? `${sortedCheckIns.length} supervision record${
                      sortedCheckIns.length === 1 ? '' : 's'
                    } found`
                  : 'No supervision records yet'}
              </p>
            </div>
          </div>

          {sortedCheckIns.length > 0 ? (
            <div className="session-list">
              {sortedCheckIns.map((checkIn) => {
                const statusClass = checkIn.status.toLowerCase();
                const isBusy = actingId === checkIn.id;

                return (
                  <article
                    key={checkIn.id}
                    className={`session-card ${statusClass}`}
                  >
                    <div className="session-timeline">
                      <div className="timeline-dot">
                        <Clock3 size={14} />
                      </div>
                    </div>

                    <div className="session-content">
                      <div className="session-top">
                        <div className="session-main-info">
                          <div className="session-pills">
                            <span className={`status-pill ${statusClass}`}>
                              {checkIn.status}
                            </span>

                            <span className="mode-pill">
                              {modeIcons[checkIn.mode] || modeIcons.OTHER}
                              {checkIn.mode_display || checkIn.mode}
                            </span>

                            {checkIn.metadata?.owner_side && (
                              <span className="owner-pill">
                                {checkIn.metadata.owner_side}
                              </span>
                            )}
                          </div>

                          <h3>
                            <UserRound size={18} />
                            {checkIn.student_info?.name || 'Student'}
                          </h3>

                          <p className="placement-title">
                            {checkIn.internship_title || 'Attachment placement'}
                          </p>

                          <p className="session-date">
                            {dateFormatter.shortDate(checkIn.scheduled_for)}
                            <span>
                              {checkIn.student_confirmed_at
                                ? 'Student confirmed'
                                : 'Awaiting student confirmation'}
                            </span>
                          </p>
                        </div>

                        <div className="session-actions">
                          {checkIn.meeting_url &&
                            checkIn.status === 'SCHEDULED' && (
                              <a
                                className="soft-action"
                                href={checkIn.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Join
                              </a>
                            )}

                          {checkIn.status === 'SCHEDULED' && (
                            <>
                              {checkIn.can_complete && (
                                <button
                                  type="button"
                                  className="soft-action success"
                                  disabled={isBusy}
                                  onClick={() => completeCheckIn(checkIn)}
                                >
                                  <CheckCircle2 size={15} />
                                  Complete
                                </button>
                              )}

                              {checkIn.can_cancel && (
                                <button
                                  type="button"
                                  className="soft-action danger"
                                  disabled={isBusy}
                                  onClick={() => cancelCheckIn(checkIn)}
                                >
                                  <XCircle size={15} />
                                  Cancel
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {checkIn.supervisor_notes && (
                        <div className="session-note">
                          {checkIn.supervisor_notes}
                        </div>
                      )}

                      {checkIn.private_notes && (
                        <div className="session-note private">
                          <strong>Private:</strong> {checkIn.private_notes}
                        </div>
                      )}

                      {checkIn.cancellation_reason && (
                        <div className="session-note danger">
                          <strong>Cancelled:</strong>{' '}
                          {checkIn.cancellation_reason}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <CalendarClock size={26} />
              </div>

              <h3>No supervision check-ins yet</h3>

              <p>
                Create a virtual, phone, or on-site check-in from an active
                placement to begin tracking supervision activity.
              </p>
            </div>
          )}
        </main>
      </div>

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .supervisor-checkins-page {
    min-height: 100%;
    padding: 1.5rem;
    background:
      radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 34%),
      linear-gradient(180deg, #f8fafc 0%, #eef3f8 100%);
    color: #0f172a;
  }

  .checkins-hero {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .hero-copy {
    flex: 1;
    background: rgba(255, 255, 255, 0.84);
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 28px;
    padding: 1.6rem;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.055);
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.85rem;
    color: #2563eb;
    background: rgba(37, 99, 235, 0.08);
    border: 1px solid rgba(37, 99, 235, 0.12);
    padding: 0.38rem 0.75rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .hero-copy h1 {
    margin: 0;
    font-size: clamp(1.7rem, 3vw, 2.25rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    color: #0f172a;
  }

  .hero-copy p {
    max-width: 680px;
    margin: 0.65rem 0 0;
    color: #64748b;
    line-height: 1.65;
    font-size: 0.95rem;
  }

  .hero-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(135px, 1fr));
    gap: 0.85rem;
    min-width: 460px;
  }

  .metric-card {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 24px;
    padding: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
  }

  .metric-icon {
    width: 42px;
    height: 42px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .metric-icon.blue {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
  }

  .metric-icon.green {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
  }

  .metric-icon.violet {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
  }

  .metric-card strong {
    display: block;
    color: #0f172a;
    font-size: 1.35rem;
    line-height: 1;
    font-weight: 800;
  }

  .metric-card span {
    display: block;
    margin-top: 0.2rem;
    color: #64748b;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .checkins-layout {
    display: grid;
    grid-template-columns: minmax(320px, 410px) 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .schedule-panel {
    position: sticky;
    top: 1rem;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 28px;
    padding: 1.25rem;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .panel-heading h2 {
    margin: 0;
    color: #0f172a;
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .panel-heading p {
    margin: 0.25rem 0 0;
    color: #64748b;
    font-size: 0.8rem;
  }

  .panel-icon {
    width: 40px;
    height: 40px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    background: #0f172a;
    color: #ffffff;
    flex-shrink: 0;
  }

  .checkin-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.42rem;
    color: #334155;
    font-size: 0.78rem;
    font-weight: 800;
  }

  .form-group input,
  .form-group select,
  .form-group textarea,
  .input-with-icon {
    width: 100%;
    border: 1px solid #dbe3ef;
    background: #f8fafc;
    border-radius: 16px;
    color: #0f172a;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 0.85rem 0.95rem;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 92px;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus,
  .input-with-icon:focus-within {
    outline: none;
    border-color: #2563eb;
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
  }

  .input-with-icon {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0 0.85rem;
  }

  .input-with-icon svg {
    color: #94a3b8;
    flex-shrink: 0;
  }

  .input-with-icon input {
    border: none;
    box-shadow: none;
    background: transparent;
    padding-left: 0;
    padding-right: 0;
  }

  .input-with-icon input:focus {
    box-shadow: none;
    background: transparent;
  }

  .primary-action {
    margin-top: 0.25rem;
    width: 100%;
    border: none;
    border-radius: 18px;
    background: #0f172a;
    color: #ffffff;
    padding: 0.95rem 1rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.16);
    transition: all 0.2s ease;
  }

  .primary-action:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 35px rgba(15, 23, 42, 0.2);
  }

  .sessions-area {
    min-width: 0;
  }

  .sessions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0 0.15rem;
  }

  .sessions-header h2 {
    margin: 0;
    color: #0f172a;
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .sessions-header p {
    margin: 0.25rem 0 0;
    color: #64748b;
    font-size: 0.85rem;
  }

  .session-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .session-card {
    position: relative;
    display: grid;
    grid-template-columns: 52px 1fr;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(226, 232, 240, 0.95);
    border-radius: 26px;
    overflow: hidden;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.055);
    transition: all 0.2s ease;
  }

  .session-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 22px 55px rgba(15, 23, 42, 0.075);
  }

  .session-card::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: #2563eb;
  }

  .session-card.completed::before {
    background: #059669;
  }

  .session-card.cancelled::before {
    background: #dc2626;
  }

  .session-timeline {
    position: relative;
    display: flex;
    justify-content: center;
    padding-top: 1.45rem;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.7), rgba(241, 245, 249, 0.7));
  }

  .timeline-dot {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #ffffff;
    color: #2563eb;
    border: 1px solid #dbeafe;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  }

  .session-content {
    padding: 1.35rem;
  }

  .session-top {
    display: flex;
    justify-content: space-between;
    gap: 1.25rem;
  }

  .session-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.75rem;
  }

  .status-pill,
  .mode-pill,
  .owner-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 999px;
    padding: 0.35rem 0.65rem;
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1;
  }

  .status-pill.scheduled {
    color: #92400e;
    background: rgba(245, 158, 11, 0.13);
    border: 1px solid rgba(245, 158, 11, 0.18);
  }

  .status-pill.completed {
    color: #047857;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.18);
  }

  .status-pill.cancelled {
    color: #b91c1c;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.16);
  }

  .mode-pill {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.08);
    border: 1px solid rgba(37, 99, 235, 0.12);
  }

  .owner-pill {
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
  }

  .session-main-info h3 {
    margin: 0;
    color: #0f172a;
    font-size: 1.08rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .session-main-info h3 svg {
    color: #64748b;
  }

  .placement-title {
    margin: 0.4rem 0 0;
    color: #475569;
    font-size: 0.92rem;
  }

  .session-date {
    margin: 0.55rem 0 0;
    color: #64748b;
    font-size: 0.82rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
  }

  .session-date span {
    color: #334155;
    background: #f1f5f9;
    border-radius: 999px;
    padding: 0.22rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .session-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-content: flex-start;
    gap: 0.55rem;
  }

  .soft-action {
    border: 1px solid #dbe3ef;
    background: #ffffff;
    color: #0f172a;
    border-radius: 999px;
    padding: 0.55rem 0.78rem;
    font-size: 0.78rem;
    font-weight: 800;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    transition: all 0.2s ease;
  }

  .soft-action:hover {
    background: #f8fafc;
    color: #0f172a;
    transform: translateY(-1px);
  }

  .soft-action.success {
    color: #047857;
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .soft-action.danger {
    color: #b91c1c;
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.18);
  }

  .soft-action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  .session-note {
    margin-top: 1rem;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 18px;
    padding: 0.9rem 1rem;
    color: #475569;
    font-size: 0.86rem;
    line-height: 1.6;
  }

  .session-note.private {
    background: rgba(37, 99, 235, 0.055);
    border-color: rgba(37, 99, 235, 0.14);
    color: #334155;
  }

  .session-note.danger {
    background: rgba(239, 68, 68, 0.07);
    border-color: rgba(239, 68, 68, 0.14);
    color: #991b1b;
  }

  .empty-state,
  .loading-card {
    min-height: 360px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(226, 232, 240, 0.95);
    border-radius: 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
    text-align: center;
    padding: 2rem;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.055);
  }

  .empty-icon {
    width: 60px;
    height: 60px;
    border-radius: 22px;
    display: grid;
    place-items: center;
    color: #2563eb;
    background: rgba(37, 99, 235, 0.08);
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0;
    color: #0f172a;
    font-size: 1.15rem;
    font-weight: 800;
  }

  .empty-state p {
    max-width: 420px;
    margin: 0.55rem 0 0;
    line-height: 1.6;
    font-size: 0.9rem;
  }

  .loading-pulse {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: rgba(37, 99, 235, 0.12);
    margin-bottom: 1rem;
    animation: pulse 1.2s infinite ease-in-out;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(0.92);
      opacity: 0.55;
    }
    50% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 1199.98px) {
    .checkins-hero {
      flex-direction: column;
    }

    .hero-stats {
      min-width: 0;
    }

    .checkins-layout {
      grid-template-columns: 1fr;
    }

    .schedule-panel {
      position: relative;
      top: auto;
    }
  }

  @media (max-width: 767.98px) {
    .supervisor-checkins-page {
      padding: 1rem;
    }

    .hero-stats {
      grid-template-columns: 1fr;
    }

    .session-card {
      grid-template-columns: 1fr;
    }

    .session-timeline {
      display: none;
    }

    .session-top {
      flex-direction: column;
    }

    .session-actions {
      justify-content: flex-start;
    }
  }
`;

export default SupervisorCheckIns;