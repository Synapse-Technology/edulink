import React from 'react';
import { AlertTriangle, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PilotReadinessItem {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  actionLabel?: string;
  actionTo?: string;
}

interface PilotReadinessPanelProps {
  title: string;
  subtitle: string;
  items: PilotReadinessItem[];
  variant?: 'institution' | 'employer';
}

const PilotReadinessPanel: React.FC<PilotReadinessPanelProps> = ({
  title,
  subtitle,
  items,
  variant = 'institution',
}) => {
  const completeCount = items.filter(item => item.complete).length;
  const totalCount = items.length || 1;
  const readiness = Math.round((completeCount / totalCount) * 100);
  const isReady = readiness >= 80;
  const accentClass = variant === 'employer' ? 'text-success' : 'text-primary';
  const bgClass = variant === 'employer' ? 'bg-success' : 'bg-primary';

  return (
    <section className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
      <div className="card-body p-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <div>
            <div className={`small fw-bold text-uppercase ${accentClass} mb-2`}>
              Beta pilot readiness
            </div>
            <h3 className="h5 fw-bold mb-1">{title}</h3>
            <p className="text-muted mb-0">{subtitle}</p>
          </div>

          <div className="text-lg-end">
            <div className="d-flex align-items-center justify-content-lg-end gap-2 mb-2">
              {isReady ? (
                <CheckCircle2 size={20} className="text-success" />
              ) : (
                <AlertTriangle size={20} className="text-warning" />
              )}
              <span className="fw-bold">{readiness}% ready</span>
            </div>
            <div className="progress rounded-pill" style={{ height: 8, minWidth: 180 }}>
              <div
                className={`progress-bar ${isReady ? 'bg-success' : bgClass}`}
                role="progressbar"
                style={{ width: `${readiness}%` }}
                aria-valuenow={readiness}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          {items.map(item => (
            <div className="col-md-6" key={item.id}>
              <div className="border rounded-3 p-3 h-100 bg-white">
                <div className="d-flex gap-3">
                  <div className="pt-1">
                    {item.complete ? (
                      <CheckCircle2 size={20} className="text-success" />
                    ) : (
                      <Circle size={20} className="text-muted" />
                    )}
                  </div>
                  <div className="min-width-0">
                    <div className="fw-semibold text-dark">{item.label}</div>
                    <p className="text-muted small mb-2">{item.description}</p>
                    {item.actionLabel && item.actionTo && (
                      <Link
                        to={item.actionTo}
                        className="small fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
                      >
                        {item.actionLabel}
                        <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PilotReadinessPanel;
