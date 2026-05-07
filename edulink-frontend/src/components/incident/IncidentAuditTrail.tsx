import React, { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileSearch,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import type { Incident } from '../../services/internship/internshipService';

interface IncidentAuditTrailProps {
  incident: Incident;
}

const STYLES = `
  .iat-wrap {
    --iat-ink: #0d0f12;
    --iat-ink-2: #3a3d44;
    --iat-ink-3: #6b7280;
    --iat-ink-4: #9ca3af;
    --iat-surface: #f9f8f6;
    --iat-surface-2: #f2f0ed;
    --iat-surface-3: #e8e5e0;
    --iat-border: #e4e1dc;
    --iat-border-2: #d1ccc5;
    --iat-accent: #1a5cff;
    --iat-accent-soft: rgba(26,92,255,0.08);
    --iat-success: #12b76a;
    --iat-success-soft: rgba(18,183,106,0.10);
    --iat-danger: #ef4444;
    --iat-danger-soft: rgba(239,68,68,0.10);
    --iat-warning: #f59e0b;
    --iat-warning-soft: rgba(245,158,11,0.12);
    --iat-info: #0ea5e9;
    --iat-info-soft: rgba(14,165,233,0.10);
    --iat-radius: 15px;

    color: var(--iat-ink);
  }

  .dark-mode .iat-wrap,
  .iat-wrap.dark-mode {
    --iat-ink: #f0ede8;
    --iat-ink-2: #c9c4bc;
    --iat-ink-3: #8a8580;
    --iat-ink-4: #5a5650;
    --iat-surface: #141414;
    --iat-surface-2: #1c1c1c;
    --iat-surface-3: #252525;
    --iat-border: #2a2a2a;
    --iat-border-2: #353535;
    --iat-accent: #4d7fff;
    --iat-accent-soft: rgba(77,127,255,0.10);
    --iat-success-soft: rgba(18,183,106,0.12);
    --iat-danger-soft: rgba(239,68,68,0.12);
    --iat-warning-soft: rgba(245,158,11,0.13);
    --iat-info-soft: rgba(14,165,233,0.12);
  }

  .iat-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .iat-title {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    color: var(--iat-ink-4);
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }

  .iat-count {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 5px 9px;
    background: var(--iat-surface-3);
    border: 1px solid var(--iat-border);
    color: var(--iat-ink-4);
    font-size: 11px;
    font-weight: 800;
  }

  .iat-timeline {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .iat-timeline::before {
    content: '';
    position: absolute;
    left: 18px;
    top: 22px;
    bottom: 22px;
    width: 2px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--iat-accent-soft), var(--iat-border), var(--iat-success-soft));
  }

  .iat-event {
    position: relative;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 12px;
    align-items: flex-start;
  }

  .iat-node {
    position: relative;
    z-index: 2;
    width: 36px;
    height: 36px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--iat-surface-2);
    border: 1px solid var(--iat-border);
    color: var(--iat-ink-4);
  }

  .iat-node.danger { background: var(--iat-danger-soft); color: var(--iat-danger); border-color: rgba(239,68,68,0.18); }
  .iat-node.warning { background: var(--iat-warning-soft); color: var(--iat-warning); border-color: rgba(245,158,11,0.18); }
  .iat-node.info { background: var(--iat-info-soft); color: var(--iat-info); border-color: rgba(14,165,233,0.18); }
  .iat-node.primary { background: var(--iat-accent-soft); color: var(--iat-accent); border-color: rgba(26,92,255,0.18); }
  .iat-node.success { background: var(--iat-success-soft); color: var(--iat-success); border-color: rgba(18,183,106,0.18); }
  .iat-node.neutral { background: var(--iat-surface-3); color: var(--iat-ink-4); }

  .iat-card {
    min-width: 0;
    padding: 12px 13px;
    border-radius: var(--iat-radius);
    background: var(--iat-surface-3);
    border: 1px solid var(--iat-border);
  }

  .iat-event-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 7px;
  }

  .iat-event-label {
    margin: 0;
    color: var(--iat-ink);
    font-size: 13px;
    font-weight: 850;
    line-height: 1.35;
  }

  .iat-status {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    background: var(--iat-surface-2);
    color: var(--iat-ink-4);
    border: 1px solid var(--iat-border);
  }

  .iat-status.danger { background: var(--iat-danger-soft); color: var(--iat-danger); border-color: rgba(239,68,68,0.18); }
  .iat-status.warning { background: var(--iat-warning-soft); color: var(--iat-warning); border-color: rgba(245,158,11,0.18); }
  .iat-status.info { background: var(--iat-info-soft); color: var(--iat-info); border-color: rgba(14,165,233,0.18); }
  .iat-status.primary { background: var(--iat-accent-soft); color: var(--iat-accent); border-color: rgba(26,92,255,0.18); }
  .iat-status.success { background: var(--iat-success-soft); color: var(--iat-success); border-color: rgba(18,183,106,0.18); }

  .iat-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .iat-actor,
  .iat-time {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--iat-ink-3);
    font-size: 12px;
    line-height: 1.45;
  }

  .iat-actor strong {
    color: var(--iat-ink-2);
    font-weight: 800;
  }

  .iat-empty {
    padding: 22px;
    text-align: center;
    border-radius: var(--iat-radius);
    background: var(--iat-surface-3);
    border: 1px dashed var(--iat-border-2);
  }

  .iat-empty-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--iat-accent-soft);
    color: var(--iat-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10px;
  }

  .iat-empty-title {
    margin: 0 0 5px;
    color: var(--iat-ink);
    font-size: 13px;
    font-weight: 850;
  }

  .iat-empty-text {
    margin: 0;
    color: var(--iat-ink-3);
    font-size: 12px;
    line-height: 1.55;
  }

  @media (max-width: 560px) {
    .iat-event-top {
      flex-direction: column;
      gap: 7px;
    }

    .iat-meta {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;

type AuditEvent = {
  event_type: string;
  from_state?: string;
  to_state: string;
  actor_id?: string;
  actor_role?: string;
  actor_name?: string;
  timestamp: string;
};

const getStatusTone = (status?: string) => {
  switch (status) {
    case 'OPEN':
      return 'danger';
    case 'ASSIGNED':
      return 'warning';
    case 'INVESTIGATING':
      return 'info';
    case 'PENDING_APPROVAL':
      return 'primary';
    case 'RESOLVED':
      return 'success';
    case 'DISMISSED':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'created':
      return AlertCircle;
    case 'assigned':
      return User;
    case 'investigation_started':
      return FileSearch;
    case 'resolution_proposed':
      return MessageSquare;
    case 'resolved':
      return CheckCircle;
    case 'dismissed':
      return XCircle;
    default:
      return Clock;
  }
};

const getEventLabel = (eventType: string) => {
  const labels: Record<string, string> = {
    created: 'Incident reported',
    assigned: 'Investigator assigned',
    investigation_started: 'Investigation started',
    resolution_proposed: 'Resolution proposed',
    resolved: 'Incident resolved',
    dismissed: 'Incident dismissed',
  };

  return labels[eventType] || eventType.replace(/_/g, ' ');
};

const formatStatus = (status?: string) => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').toLowerCase();
};

const formatDateTime = (timestamp?: string) => {
  if (!timestamp) return 'Time not recorded';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'Time not recorded';
  return parsed.toLocaleString();
};

const IncidentAuditTrail: React.FC<IncidentAuditTrailProps> = ({ incident }) => {
  const allEvents = useMemo<AuditEvent[]>(() => {
    const events = (incident.metadata?.events || []) as AuditEvent[];

    const latestStatus: AuditEvent = {
      event_type: incident.status.toLowerCase(),
      from_state: '',
      to_state: incident.status,
      actor_id: incident.resolved_by || incident.investigator_id || incident.reported_by,
      actor_role: 'System',
      actor_name: 'System',
      timestamp: incident.resolved_at || incident.assigned_at || incident.created_at,
    };

    return [
      ...events,
      ...(incident.status === 'RESOLVED' || incident.status === 'DISMISSED' ? [latestStatus] : []),
    ];
  }, [incident]);

  return (
    <>
      <style>{STYLES}</style>
      <div className="iat-wrap">
        <div className="iat-head">
          <h4 className="iat-title">
            <ShieldCheck size={12} />
            Incident timeline
          </h4>
          <span className="iat-count">
            <Sparkles size={11} />
            {allEvents.length} event{allEvents.length === 1 ? '' : 's'}
          </span>
        </div>

        {allEvents.length > 0 ? (
          <div className="iat-timeline">
            {allEvents.map((event, index) => {
              const tone = getStatusTone(event.to_state);
              const Icon = getEventIcon(event.event_type);

              return (
                <div key={`${event.event_type}-${event.timestamp}-${index}`} className="iat-event">
                  <div className={`iat-node ${tone}`}>
                    <Icon size={16} />
                  </div>

                  <div className="iat-card">
                    <div className="iat-event-top">
                      <h5 className="iat-event-label">{getEventLabel(event.event_type)}</h5>
                      <span className={`iat-status ${tone}`}>{formatStatus(event.to_state)}</span>
                    </div>

                    <div className="iat-meta">
                      <span className="iat-actor">
                        <User size={13} />
                        <strong>{event.actor_name || 'System'}</strong>
                        {event.actor_role ? `• ${event.actor_role}` : ''}
                      </span>
                      <span className="iat-time">
                        <Clock size={13} />
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="iat-empty">
            <div className="iat-empty-icon">
              <Clock size={20} />
            </div>
            <h5 className="iat-empty-title">No timeline data available</h5>
            <p className="iat-empty-text">
              Audit events will appear here once the incident is assigned, investigated, or resolved.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default IncidentAuditTrail;
