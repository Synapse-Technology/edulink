import React from 'react';
import { Badge } from 'react-bootstrap';
import { User, CheckCircle, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import type { Incident } from '../../services/internship/internshipService';

interface IncidentAuditTrailProps {
  incident: Incident;
}

const IncidentAuditTrail: React.FC<IncidentAuditTrailProps> = ({ incident }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'danger';
      case 'ASSIGNED': return 'warning';
      case 'INVESTIGATING': return 'info';
      case 'PENDING_APPROVAL': return 'primary';
      case 'RESOLVED': return 'success';
      case 'DISMISSED': return 'secondary';
      default: return 'secondary';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created': return <AlertCircle size={16} className="text-danger" />;
      case 'assigned': return <User size={16} className="text-warning" />;
      case 'investigation_started': return <Clock size={16} className="text-info" />;
      case 'resolution_proposed': return <MessageSquare size={16} className="text-primary" />;
      case 'resolved': return <CheckCircle size={16} className="text-success" />;
      case 'dismissed': return <CheckCircle size={16} className="text-secondary" />;
      default: return <Clock size={16} className="text-muted" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      created: 'Incident Reported',
      assigned: 'Investigator Assigned',
      investigation_started: 'Investigation Started',
      resolution_proposed: 'Resolution Proposed',
      resolved: 'Incident Resolved',
      dismissed: 'Incident Dismissed',
    };
    return labels[eventType] || eventType;
  };

  const events = incident.metadata?.events || [];

  // Add current status as latest event if not in metadata
  const latestStatus = {
    event_type: incident.status.toLowerCase(),
    from_state: '',
    to_state: incident.status,
    actor_id: incident.resolved_by || incident.investigator_id || incident.reported_by,
    actor_role: 'System',
    actor_name: 'System',
    timestamp: incident.resolved_at || incident.assigned_at || incident.created_at,
  };

  const allEvents = [
    ...events,
    ...(incident.status === 'RESOLVED' || incident.status === 'DISMISSED' ? [latestStatus] : []),
  ];

  return (
    <div>
      <h6 className="fw-bold text-uppercase text-muted small mb-3">Incident Timeline</h6>
      <div className="position-relative">
        {/* Vertical line */}
        <div 
          className="position-absolute" 
          style={{
            left: '15px',
            top: '25px',
            bottom: '-10px',
            width: '2px',
            backgroundColor: '#dee2e6',
          }}
        />

        {/* Events */}
        <div className="d-flex flex-column gap-3">
          {allEvents.length > 0 ? (
            allEvents.map((event, idx) => (
              <div key={idx} className="d-flex gap-3 position-relative">
                {/* Event icon circle */}
                <div 
                  className="d-flex align-items-center justify-content-center rounded-circle bg-white border-2 flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderColor: `var(--bs-${getStatusColor(event.to_state)})`,
                    zIndex: 1,
                  }}
                >
                  {getEventIcon(event.event_type)}
                </div>

                {/* Event details */}
                <div className="flex-grow-1 pt-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-bold small">{getEventLabel(event.event_type)}</span>
                    <Badge bg={getStatusColor(event.to_state)} className="bg-opacity-10 text-capitalize px-2 py-1 small">
                      {event.to_state.replace('_', ' ').toLowerCase()}
                    </Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {event.actor_name || 'System'} • {event.actor_role}
                    </small>
                    <small className="text-muted">
                      {new Date(event.timestamp).toLocaleString()}
                    </small>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted small p-3 bg-light rounded text-center">
              No timeline data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentAuditTrail;
