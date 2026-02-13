import React from 'react';
import { Badge } from 'react-bootstrap';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  Award,
  FileText,
  Lock
} from 'lucide-react';
import type { LedgerEvent } from '../../../services/ledger/ledgerService';

interface TrustTimelineProps {
  events: LedgerEvent[];
  isDarkMode: boolean;
}

const TrustTimeline: React.FC<TrustTimelineProps> = ({ events, isDarkMode }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'TRUST_LEVEL_INCREASED':
        return <Award className="text-success" size={18} />;
      case 'TRUST_LEVEL_DECREASED':
        return <AlertCircle className="text-danger" size={18} />;
      case 'LOGBOOK_APPROVED':
        return <CheckCircle className="text-primary" size={18} />;
      case 'VERIFICATION_SUCCESSFUL':
        return <Shield className="text-info" size={18} />;
      case 'PROFILE_COMPLETED':
        return <UserCheck className="text-success" size={18} />;
      case 'ARTIFACT_GENERATED':
        return <FileText className="text-warning" size={18} />;
      default:
        return <Clock className="text-muted" size={18} />;
    }
  };

  const formatEventName = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (!events || events.length === 0) {
    return (
      <div className={`text-center py-5 ${isDarkMode ? 'text-info opacity-50' : 'text-muted'}`}>
        <Clock size={32} className="mb-2 opacity-25" />
        <p className="small mb-0">No trust events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="position-relative ps-4 ps-md-5 py-2">
      {/* Vertical Line */}
      <div 
        className="position-absolute h-100 border-start border-2 opacity-10" 
        style={{ left: '15px', top: '0px' }}
      ></div>

      {events.map((event) => (
        <div key={event.id} className="position-relative mb-4">
          {/* Dot */}
          <div 
            className={`position-absolute rounded-circle bg-white shadow-sm d-flex align-items-center justify-content-center`}
            style={{ 
              left: '-32px', 
              top: '0px', 
              width: '32px', 
              height: '32px', 
              zIndex: 2,
              border: `2px solid ${isDarkMode ? '#2d3748' : '#e2e8f0'}`
            }}
          >
            {React.cloneElement(getEventIcon(event.event_type) as React.ReactElement<any>, { size: 16 })}
          </div>

          <div className="ms-2 ms-md-3">
            <div className="d-flex justify-content-between align-items-start mb-1">
              <h6 className={`mb-0 fw-bold small ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.8rem' }}>
                {formatEventName(event.event_type)}
              </h6>
              <span className="text-muted flex-shrink-0 ms-2" style={{ fontSize: '0.65rem' }}>
                {new Date(event.occurred_at).toLocaleDateString()}
              </span>
            </div>
            <p className={`small mb-1 ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`} style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
              {event.payload?.reason || 'System verification event recorded in ledger.'}
            </p>
            <div className="d-flex align-items-center gap-2">
              <Badge 
                bg={isDarkMode ? 'dark' : 'light'} 
                text={isDarkMode ? 'info' : 'muted'} 
                className="border small fw-normal d-flex align-items-center gap-1 py-1"
                style={{ fontSize: '0.6rem' }}
              >
                <Lock size={8} /> {event.hash.substring(0, 8)}...
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrustTimeline;
