import React from 'react';
import { Shield, CheckCircle, Circle, ArrowUp } from 'lucide-react';
import TrustBadge from '../common/TrustBadge';
import type { TrustLevel } from '../common/TrustBadge';

interface Requirement {
  label: string;
  current: number;
  target: number;
  met: boolean;
}

interface TrustProgressData {
  current_level: TrustLevel;
  next_level: number | null;
  progress_percentage: number;
  requirements: Requirement[];
}

interface TrustProgressWidgetProps {
  data: TrustProgressData | null;
  isLoading: boolean;
  userType: 'institution' | 'employer';
}

const TrustProgressWidget: React.FC<TrustProgressWidgetProps> = ({ data, isLoading, userType }) => {
  if (isLoading) {
    return (
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body p-4">
          <div className="placeholder-glow">
            <div className="placeholder col-6 mb-3"></div>
            <div className="placeholder col-12 mb-2"></div>
            <div className="placeholder col-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { current_level, next_level, progress_percentage, requirements } = data;

  // Validate level against TrustLevel type
  const safeLevel = Math.min(Math.max(current_level, 0), 4) as TrustLevel;

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
        <h5 className="card-title mb-0 fw-bold d-flex align-items-center">
          <Shield size={20} className="me-2 text-primary" />
          Trust Score
        </h5>
      </div>
      <div className="card-body px-4 pt-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div className="text-muted small mb-1">Current Tier</div>
            <TrustBadge level={safeLevel} entityType={userType} showLabel={true} />
          </div>
          {next_level && (
            <div className="text-end">
              <div className="text-muted small mb-1">Next Tier</div>
              <div className="badge bg-light text-dark border">
                Tier {next_level}
              </div>
            </div>
          )}
        </div>

        {next_level ? (
          <>
            <div className="mb-2 d-flex justify-content-between align-items-end">
              <span className="small fw-semibold">Progress to Tier {next_level}</span>
              <span className="h4 mb-0 text-primary fw-bold">{progress_percentage}%</span>
            </div>
            <div className="progress mb-4" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-primary" 
                role="progressbar" 
                style={{ width: `${progress_percentage}%` }}
                aria-valuenow={progress_percentage} 
                aria-valuemin={0} 
                aria-valuemax={100}
              ></div>
            </div>

            <div className="mb-2">
              <h6 className="small text-muted text-uppercase fw-bold mb-3">Requirements</h6>
              <div className="d-flex flex-column gap-2">
                {requirements.map((req, index) => (
                  <div key={index} className="d-flex align-items-center justify-content-between p-2 rounded bg-light bg-opacity-50">
                    <div className="d-flex align-items-center">
                      {req.met ? (
                        <CheckCircle size={16} className="text-success me-2 flex-shrink-0" />
                      ) : (
                        <Circle size={16} className="text-muted me-2 flex-shrink-0" />
                      )}
                      <span className={`small ${req.met ? 'text-decoration-line-through text-muted' : ''}`}>
                        {req.label}
                      </span>
                    </div>
                    <span className="badge bg-white text-secondary border small">
                      {req.current} / {req.target}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="alert alert-success bg-opacity-10 border-success border-opacity-25 mb-0">
            <div className="d-flex">
              <ArrowUp size={20} className="text-success me-3 flex-shrink-0" />
              <div>
                <h6 className="alert-heading h6 fw-bold text-success mb-1">Top Tier Reached!</h6>
                <p className="small mb-0 text-secondary">
                  You have reached the highest trust tier available. Maintain your excellent performance to keep this status.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustProgressWidget;
