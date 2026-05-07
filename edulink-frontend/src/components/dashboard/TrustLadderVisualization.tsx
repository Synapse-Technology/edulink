import React from 'react';
import {
  Check,
  Circle,
  FileCheck,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { getTrustLabel } from '../../services/trust/trustService';

interface TrustLadderVisualizationProps {
  currentTier: number;
}

const STYLES = `
  .tlv-card {
    --tlv-ink: #0d0f12;
    --tlv-ink-2: #3a3d44;
    --tlv-ink-3: #6b7280;
    --tlv-ink-4: #9ca3af;
    --tlv-surface: #f9f8f6;
    --tlv-surface-2: #f2f0ed;
    --tlv-surface-3: #e8e5e0;
    --tlv-border: #e4e1dc;
    --tlv-border-2: #d1ccc5;
    --tlv-accent: #1a5cff;
    --tlv-accent-soft: rgba(26,92,255,0.08);
    --tlv-success: #12b76a;
    --tlv-success-soft: rgba(18,183,106,0.10);
    --tlv-warning: #f59e0b;
    --tlv-warning-soft: rgba(245,158,11,0.10);
    --tlv-radius: 18px;
    --tlv-radius-sm: 13px;
    --tlv-shadow: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);

    position: relative;
    background: var(--tlv-surface-2);
    border: 1px solid var(--tlv-border);
    border-radius: var(--tlv-radius);
    overflow: hidden;
    color: var(--tlv-ink);
    transition: box-shadow 0.2s ease, transform 0.18s ease, border-color 0.18s ease;
  }

  .dark-mode .tlv-card {
    --tlv-ink: #f0ede8;
    --tlv-ink-2: #c9c4bc;
    --tlv-ink-3: #8a8580;
    --tlv-ink-4: #5a5650;
    --tlv-surface: #141414;
    --tlv-surface-2: #1c1c1c;
    --tlv-surface-3: #252525;
    --tlv-border: #2a2a2a;
    --tlv-border-2: #353535;
    --tlv-accent: #4d7fff;
    --tlv-accent-soft: rgba(77,127,255,0.10);
    --tlv-success-soft: rgba(18,183,106,0.12);
    --tlv-warning-soft: rgba(245,158,11,0.12);
    --tlv-shadow: 0 4px 16px rgba(0,0,0,0.30);
  }

  .tlv-card:hover {
    box-shadow: var(--tlv-shadow);
    transform: translateY(-1px);
    border-color: var(--tlv-border-2);
  }

  .tlv-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--tlv-border);
  }

  .tlv-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--tlv-accent);
    margin-bottom: 5px;
  }

  .tlv-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--tlv-ink);
    margin: 0;
    line-height: 1.2;
  }

  .tlv-subtitle {
    font-size: 12px;
    color: var(--tlv-ink-3);
    line-height: 1.55;
    margin: 7px 0 0;
  }

  .tlv-header-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--tlv-accent-soft);
    color: var(--tlv-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tlv-body {
    position: relative;
    padding: 22px;
  }

  .tlv-track {
    position: absolute;
    left: 40px;
    top: 30px;
    bottom: 30px;
    width: 2px;
    border-radius: 999px;
    background: var(--tlv-surface-3);
    overflow: hidden;
  }

  .tlv-track-fill {
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--tlv-accent), var(--tlv-success));
    transition: height 0.7s ease;
  }

  .tlv-steps {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .tlv-step {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 14px;
    align-items: flex-start;
    position: relative;
  }

  .tlv-node {
    position: relative;
    z-index: 2;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--tlv-surface-2);
    border: 2px solid var(--tlv-border-2);
    color: var(--tlv-ink-4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .tlv-step.complete .tlv-node {
    background: var(--tlv-success);
    color: #fff;
    border-color: var(--tlv-success);
    box-shadow: 0 0 0 5px var(--tlv-success-soft);
  }

  .tlv-step.current .tlv-node {
    background: var(--tlv-accent);
    color: #fff;
    border-color: var(--tlv-accent);
    box-shadow: 0 0 0 5px var(--tlv-accent-soft);
  }

  .tlv-step.locked .tlv-node {
    background: var(--tlv-surface-3);
  }

  .tlv-content {
    background: var(--tlv-surface-3);
    border: 1px solid var(--tlv-border);
    border-radius: var(--tlv-radius-sm);
    padding: 13px 14px;
    min-width: 0;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .tlv-step.complete .tlv-content {
    background: var(--tlv-success-soft);
    border-color: rgba(18,183,106,0.20);
  }

  .tlv-step.current .tlv-content {
    background: var(--tlv-accent-soft);
    border-color: rgba(26,92,255,0.24);
  }

  .tlv-step-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 4px;
  }

  .tlv-label {
    font-size: 13px;
    font-weight: 800;
    color: var(--tlv-ink);
    line-height: 1.35;
  }

  .tlv-description {
    font-size: 12px;
    color: var(--tlv-ink-3);
    line-height: 1.5;
    margin: 0;
  }

  .tlv-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    background: var(--tlv-surface-2);
    color: var(--tlv-ink-4);
    border: 1px solid var(--tlv-border);
  }

  .tlv-step.current .tlv-pill {
    background: var(--tlv-accent);
    color: #fff;
    border-color: var(--tlv-accent);
  }

  .tlv-step.complete .tlv-pill {
    background: var(--tlv-success);
    color: #fff;
    border-color: var(--tlv-success);
  }

  .tlv-summary {
    margin-top: 16px;
    padding: 13px 14px;
    border-radius: var(--tlv-radius-sm);
    background: linear-gradient(135deg, var(--tlv-accent-soft), var(--tlv-surface-3));
    border: 1px solid var(--tlv-border);
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .tlv-summary-icon {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: var(--tlv-accent-soft);
    color: var(--tlv-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tlv-summary-title {
    font-size: 12px;
    font-weight: 800;
    color: var(--tlv-ink);
    margin: 0 0 3px;
  }

  .tlv-summary-text {
    font-size: 12px;
    color: var(--tlv-ink-3);
    line-height: 1.5;
    margin: 0;
  }

  @media (max-width: 520px) {
    .tlv-header,
    .tlv-body {
      padding-left: 18px;
      padding-right: 18px;
    }

    .tlv-track {
      left: 36px;
    }

    .tlv-step-head {
      flex-direction: column;
      gap: 7px;
    }
  }
`;

const clampTier = (tier: number) => Math.min(Math.max(Number.isFinite(tier) ? tier : 0, 0), 3);

const TrustLadderVisualization: React.FC<TrustLadderVisualizationProps> = ({ currentTier }) => {
  const safeTier = clampTier(currentTier);

  const tiers = [
    {
      level: 0,
      label: getTrustLabel('student', 0),
      description: 'Create your student record and begin verification.',
      icon: Circle,
    },
    {
      level: 1,
      label: getTrustLabel('student', 1),
      description: 'Upload your student ID, admission letter, or required verification documents.',
      icon: FileCheck,
    },
    {
      level: 2,
      label: getTrustLabel('student', 2),
      description: 'Get confirmed by your institution to unlock trusted application workflows.',
      icon: ShieldCheck,
    },
    {
      level: 3,
      label: getTrustLabel('student', 3),
      description: 'Complete your internship and earn a certified experience record.',
      icon: Trophy,
    },
  ];

  const progressHeight = `${(safeTier / (tiers.length - 1)) * 100}%`;
  const currentLabel = getTrustLabel('student', safeTier);

  return (
    <>
      <style>{STYLES}</style>
      <section className="tlv-card" aria-label="Student trust ladder">
        <div className="tlv-header">
          <div>
            <div className="tlv-eyebrow">
              <Sparkles size={11} />
              Student trust journey
            </div>
            <h3 className="tlv-title">Verification Ladder</h3>
            <p className="tlv-subtitle">
              Track how your student record becomes trusted enough for applications, internship tracking, and certification.
            </p>
          </div>
          <div className="tlv-header-icon">
            <GraduationCap size={21} />
          </div>
        </div>

        <div className="tlv-body">
          <div className="tlv-track" aria-hidden="true">
            <div className="tlv-track-fill" style={{ height: progressHeight }} />
          </div>

          <div className="tlv-steps">
            {tiers.map((tier) => {
              const complete = tier.level < safeTier;
              const current = tier.level === safeTier;
              const locked = tier.level > safeTier;
              const Icon = tier.icon;

              return (
                <div
                  key={tier.level}
                  className={`tlv-step${complete ? ' complete' : ''}${current ? ' current' : ''}${locked ? ' locked' : ''}`}
                >
                  <div className="tlv-node">
                    {complete ? <Check size={16} /> : locked ? <Lock size={14} /> : <Icon size={15} />}
                  </div>

                  <div className="tlv-content">
                    <div className="tlv-step-head">
                      <div>
                        <div className="tlv-label">{tier.label}</div>
                        <p className="tlv-description">{tier.description}</p>
                      </div>

                      <span className="tlv-pill">
                        {complete ? 'Done' : current ? 'Current' : `Tier ${tier.level}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tlv-summary">
            <div className="tlv-summary-icon">
              <ShieldCheck size={15} />
            </div>
            <div>
              <h4 className="tlv-summary-title">Current trust level: {currentLabel}</h4>
              <p className="tlv-summary-text">
                {safeTier >= 3
                  ? 'Your record is internship-complete and ready to support certification workflows.'
                  : 'Complete the next trust step to increase credibility across institution and employer workflows.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default TrustLadderVisualization;
