import React from 'react';
import {
  ArrowUp,
  CheckCircle,
  Circle,
  Lock,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import TrustBadge from '../common/TrustBadge';
import type { TrustLevel } from '../common/TrustBadge';

interface Requirement {
  label: string;
  current?: number;
  target?: number;
  current_value?: number;
  target_value?: number;
  met?: boolean;
  completed?: boolean;
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

const STYLES = `
  .tpw-card {
    --tpw-ink: #0d0f12;
    --tpw-ink-2: #3a3d44;
    --tpw-ink-3: #6b7280;
    --tpw-ink-4: #9ca3af;
    --tpw-surface: #f9f8f6;
    --tpw-surface-2: #f2f0ed;
    --tpw-surface-3: #e8e5e0;
    --tpw-border: #e4e1dc;
    --tpw-border-2: #d1ccc5;
    --tpw-accent: #1a5cff;
    --tpw-accent-soft: rgba(26,92,255,0.08);
    --tpw-success: #12b76a;
    --tpw-success-soft: rgba(18,183,106,0.10);
    --tpw-warning: #f59e0b;
    --tpw-warning-soft: rgba(245,158,11,0.10);
    --tpw-radius: 18px;
    --tpw-radius-sm: 12px;
    --tpw-shadow: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);

    height: 100%;
    background: var(--tpw-surface-2);
    border: 1px solid var(--tpw-border);
    border-radius: var(--tpw-radius);
    overflow: hidden;
    color: var(--tpw-ink);
    transition: box-shadow 0.2s ease, transform 0.18s ease, border-color 0.18s ease;
  }

  .dark-mode .tpw-card {
    --tpw-ink: #f0ede8;
    --tpw-ink-2: #c9c4bc;
    --tpw-ink-3: #8a8580;
    --tpw-ink-4: #5a5650;
    --tpw-surface: #141414;
    --tpw-surface-2: #1c1c1c;
    --tpw-surface-3: #252525;
    --tpw-border: #2a2a2a;
    --tpw-border-2: #353535;
    --tpw-accent: #4d7fff;
    --tpw-accent-soft: rgba(77,127,255,0.10);
    --tpw-success-soft: rgba(18,183,106,0.12);
    --tpw-warning-soft: rgba(245,158,11,0.12);
    --tpw-shadow: 0 4px 16px rgba(0,0,0,0.30);
  }

  .tpw-card:hover {
    box-shadow: var(--tpw-shadow);
    transform: translateY(-1px);
    border-color: var(--tpw-border-2);
  }

  .tpw-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--tpw-border);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .tpw-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--tpw-accent);
    margin-bottom: 5px;
  }

  .tpw-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--tpw-ink);
    margin: 0;
    line-height: 1.2;
  }

  .tpw-icon-shell {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--tpw-accent-soft);
    color: var(--tpw-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tpw-body {
    padding: 20px 22px 22px;
  }

  .tpw-tier-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 14px;
    align-items: center;
    margin-bottom: 18px;
  }

  .tpw-small-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--tpw-ink-4);
    margin-bottom: 7px;
  }

  .tpw-next-tier {
    min-width: 84px;
    text-align: right;
  }

  .tpw-next-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 7px 10px;
    background: var(--tpw-surface-3);
    color: var(--tpw-ink-2);
    border: 1px solid var(--tpw-border);
    font-size: 12px;
    font-weight: 700;
  }

  .tpw-progress-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 9px;
  }

  .tpw-progress-title {
    font-size: 12px;
    font-weight: 800;
    color: var(--tpw-ink-2);
  }

  .tpw-progress-value {
    font-size: 28px;
    font-weight: 800;
    color: var(--tpw-accent);
    line-height: 1;
  }

  .tpw-progress-track {
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: var(--tpw-surface-3);
    border: 1px solid var(--tpw-border);
    overflow: hidden;
    margin-bottom: 18px;
  }

  .tpw-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--tpw-accent), #12b76a);
    transition: width 0.35s ease;
  }

  .tpw-requirements-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .tpw-requirements-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--tpw-ink-4);
    margin: 0;
  }

  .tpw-requirements-count {
    font-size: 11px;
    font-weight: 700;
    color: var(--tpw-ink-4);
  }

  .tpw-requirements-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tpw-requirement {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 11px 12px;
    background: var(--tpw-surface-3);
    border: 1px solid var(--tpw-border);
    border-radius: var(--tpw-radius-sm);
  }

  .tpw-req-icon {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--tpw-surface-2);
    color: var(--tpw-ink-4);
    border: 1px solid var(--tpw-border);
  }

  .tpw-requirement.complete {
    background: var(--tpw-success-soft);
    border-color: rgba(18,183,106,0.18);
  }

  .tpw-requirement.complete .tpw-req-icon {
    background: var(--tpw-success-soft);
    color: var(--tpw-success);
    border-color: transparent;
  }

  .tpw-req-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--tpw-ink-2);
    line-height: 1.4;
  }

  .tpw-requirement.complete .tpw-req-label {
    color: var(--tpw-ink-3);
    text-decoration: line-through;
  }

  .tpw-req-count {
    border-radius: 999px;
    padding: 5px 8px;
    background: var(--tpw-surface-2);
    color: var(--tpw-ink-3);
    border: 1px solid var(--tpw-border);
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .tpw-max-tier {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    background: linear-gradient(135deg, var(--tpw-success-soft), var(--tpw-surface-3));
    border: 1px solid rgba(18,183,106,0.20);
    border-radius: var(--tpw-radius-sm);
    padding: 15px;
  }

  .tpw-max-icon {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    background: var(--tpw-success-soft);
    color: var(--tpw-success);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tpw-max-title {
    font-size: 13px;
    font-weight: 800;
    color: var(--tpw-success);
    margin: 0 0 4px;
  }

  .tpw-max-text {
    font-size: 12px;
    color: var(--tpw-ink-3);
    line-height: 1.55;
    margin: 0;
  }

  .tpw-skeleton-line {
    height: 12px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--tpw-surface-3), var(--tpw-border), var(--tpw-surface-3));
    background-size: 200% 100%;
    animation: tpw-loading 1.2s ease-in-out infinite;
  }

  .tpw-skeleton-block {
    height: 72px;
    border-radius: var(--tpw-radius-sm);
    background: linear-gradient(90deg, var(--tpw-surface-3), var(--tpw-border), var(--tpw-surface-3));
    background-size: 200% 100%;
    animation: tpw-loading 1.2s ease-in-out infinite;
  }

  @keyframes tpw-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const clampTrustLevel = (level: number): TrustLevel => Math.min(Math.max(level, 0), 4) as TrustLevel;

const getRequirementProgress = (req: Requirement) => {
  const current = req.current ?? req.current_value;
  const target = req.target ?? req.target_value;

  if (current === undefined || target === undefined) return null;

  return { current, target };
};

const TrustProgressWidget: React.FC<TrustProgressWidgetProps> = ({ data, isLoading, userType }) => {
  if (isLoading) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="tpw-card">
          <div className="tpw-header">
            <div style={{ flex: 1 }}>
              <div className="tpw-skeleton-line" style={{ width: '42%', marginBottom: 12 }} />
              <div className="tpw-skeleton-line" style={{ width: '64%' }} />
            </div>
            <div className="tpw-icon-shell"><Shield size={19} /></div>
          </div>
          <div className="tpw-body">
            <div className="tpw-skeleton-block" style={{ marginBottom: 14 }} />
            <div className="tpw-skeleton-line" style={{ width: '100%', height: 10, marginBottom: 18 }} />
            <div className="tpw-skeleton-line" style={{ width: '50%', marginBottom: 12 }} />
            <div className="tpw-skeleton-block" style={{ height: 54, marginBottom: 8 }} />
            <div className="tpw-skeleton-block" style={{ height: 54 }} />
          </div>
        </div>
      </>
    );
  }

  if (!data) return null;

  const { current_level, next_level, progress_percentage, requirements } = data;
  const safeLevel = clampTrustLevel(current_level);
  const safeProgress = Math.min(Math.max(progress_percentage || 0, 0), 100);
  const completedCount = requirements.filter(req => req.met ?? req.completed).length;

  return (
    <>
      <style>{STYLES}</style>
      <div className="tpw-card">
        <div className="tpw-header">
          <div>
            <div className="tpw-eyebrow">
              <Sparkles size={11} />
              Trust engine
            </div>
            <h3 className="tpw-title">Trust Score</h3>
          </div>
          <div className="tpw-icon-shell">
            <Shield size={20} />
          </div>
        </div>

        <div className="tpw-body">
          <div className="tpw-tier-grid">
            <div>
              <div className="tpw-small-label">Current tier</div>
              <TrustBadge level={safeLevel} entityType={userType} showLabel={true} />
            </div>

            {next_level && (
              <div className="tpw-next-tier">
                <div className="tpw-small-label">Next</div>
                <span className="tpw-next-pill">
                  <Lock size={12} /> Tier {next_level}
                </span>
              </div>
            )}
          </div>

          {next_level ? (
            <>
              <div className="tpw-progress-head">
                <span className="tpw-progress-title">Progress to Tier {next_level}</span>
                <span className="tpw-progress-value">{safeProgress}%</span>
              </div>

              <div
                className="tpw-progress-track"
                role="progressbar"
                aria-valuenow={safeProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="tpw-progress-fill" style={{ width: `${safeProgress}%` }} />
              </div>

              <div className="tpw-requirements-head">
                <h4 className="tpw-requirements-title">
                  <TrendingUp size={12} />
                  Requirements
                </h4>
                <span className="tpw-requirements-count">
                  {completedCount}/{requirements.length} complete
                </span>
              </div>

              <div className="tpw-requirements-list">
                {requirements.map((req, index) => {
                  const complete = req.met ?? req.completed;
                  const progress = getRequirementProgress(req);

                  return (
                    <div key={`${req.label}-${index}`} className={`tpw-requirement${complete ? ' complete' : ''}`}>
                      <div className="tpw-req-icon">
                        {complete ? <CheckCircle size={15} /> : <Circle size={15} />}
                      </div>

                      <div className="tpw-req-label">{req.label}</div>

                      {progress && (
                        <span className="tpw-req-count">
                          {progress.current} / {progress.target}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="tpw-max-tier">
              <div className="tpw-max-icon">
                <ArrowUp size={19} />
              </div>
              <div>
                <h4 className="tpw-max-title">Top tier reached</h4>
                <p className="tpw-max-text">
                  You have reached the highest trust tier available. Maintain strong verification,
                  activity, and performance signals to protect this status.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TrustProgressWidget;
