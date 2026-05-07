import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
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
  const completeCount = items.filter((item) => item.complete).length;
  const totalCount = items.length || 1;
  const readiness = Math.round((completeCount / totalCount) * 100);
  const isReady = readiness >= 80;
  const isEmployer = variant === 'employer';

  return (
    <section className={`prp-card ${isEmployer ? 'employer' : 'institution'}`}>
      <style>{STYLES}</style>

      <div className="prp-header">
        <div className="prp-heading">
          <div className="prp-kicker">
            <ShieldCheck size={13} />
            Beta pilot readiness
          </div>
          <h3 className="prp-title">{title}</h3>
          <p className="prp-subtitle">{subtitle}</p>
        </div>

        <div className="prp-score-card">
          <div className="prp-score-top">
            {isReady ? (
              <CheckCircle2 size={19} className="prp-success" />
            ) : (
              <AlertTriangle size={19} className="prp-warning" />
            )}
            <span>{readiness}% ready</span>
          </div>

          <div className="prp-track">
            <div
              className="prp-fill"
              style={{ width: `${readiness}%` }}
              role="progressbar"
              aria-valuenow={readiness}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="prp-score-meta">
            {completeCount} of {totalCount} checks complete
          </div>
        </div>
      </div>

      <div className="prp-grid">
        {items.map((item) => (
          <article
            className={`prp-item ${item.complete ? 'complete' : 'pending'}`}
            key={item.id}
          >
            <div className="prp-item-icon">
              {item.complete ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </div>

            <div className="prp-item-body">
              <div className="prp-item-title">{item.label}</div>
              <p className="prp-item-copy">{item.description}</p>

              {item.actionLabel && item.actionTo && (
                <Link to={item.actionTo} className="prp-link">
                  {item.actionLabel}
                  {isEmployer ? <ArrowRight size={13} /> : <ExternalLink size={13} />}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const STYLES = `
  .prp-card {
    --prp-surface: var(--el-surface, #ffffff);
    --prp-surface-2: var(--el-surface-2, #f0eeea);
    --prp-border: var(--el-border, #e2ded7);
    --prp-ink: var(--el-ink, #101316);
    --prp-muted: var(--el-muted, #6f747b);
    --prp-accent: var(--el-accent, #1a5cff);
    --prp-accent-soft: var(--el-accent-soft, rgba(26,92,255,0.1));
    --prp-success: #12b76a;
    --prp-warning: #f59e0b;

    border: 1px solid var(--prp-border);
    border-radius: 22px;
    background:
      radial-gradient(circle at top right, var(--prp-accent-soft), transparent 38%),
      var(--prp-surface);
    overflow: hidden;
    margin-bottom: 0;
  }

  .prp-header {
    padding: 22px;
    border-bottom: 1px solid var(--prp-border);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .prp-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--prp-accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .prp-title {
    color: var(--prp-ink);
    font-size: 1.05rem;
    font-weight: 820;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }

  .prp-subtitle {
    color: var(--prp-muted);
    font-size: 13px;
    line-height: 1.65;
    margin: 0;
    max-width: 720px;
  }

  .prp-score-card {
    min-width: 210px;
    border: 1px solid var(--prp-border);
    border-radius: 18px;
    background: var(--prp-surface-2);
    padding: 14px;
  }

  .prp-score-top {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--prp-ink);
    font-size: 13px;
    font-weight: 820;
    margin-bottom: 10px;
  }

  .prp-success {
    color: var(--prp-success);
  }

  .prp-warning {
    color: var(--prp-warning);
  }

  .prp-track {
    height: 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--prp-muted), transparent 82%);
    overflow: hidden;
  }

  .prp-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--prp-accent), var(--prp-success));
    transition: width 0.25s ease;
  }

  .prp-score-meta {
    color: var(--prp-muted);
    font-size: 11px;
    margin-top: 8px;
  }

  .prp-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    background: var(--prp-border);
  }

  .prp-item {
    background: var(--prp-surface);
    padding: 18px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-height: 150px;
  }

  .prp-item-icon {
    width: 34px;
    height: 34px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .prp-item.complete .prp-item-icon {
    background: rgba(18,183,106,0.12);
    color: var(--prp-success);
  }

  .prp-item.pending .prp-item-icon {
    background: var(--prp-surface-2);
    color: var(--prp-muted);
  }

  .prp-item-title {
    color: var(--prp-ink);
    font-size: 13px;
    font-weight: 820;
    margin-bottom: 5px;
  }

  .prp-item-copy {
    color: var(--prp-muted);
    font-size: 12px;
    line-height: 1.55;
    margin: 0 0 10px;
  }

  .prp-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--prp-accent);
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
  }

  .prp-link:hover {
    color: var(--prp-accent);
    text-decoration: underline;
  }

  @media (max-width: 1100px) {
    .prp-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .prp-header {
      flex-direction: column;
    }

    .prp-score-card {
      width: 100%;
      min-width: 0;
    }
  }

  @media (max-width: 640px) {
    .prp-grid {
      grid-template-columns: 1fr;
    }

    .prp-header,
    .prp-item {
      padding: 18px;
    }
  }
`;

export default PilotReadinessPanel;