import React from 'react';
import {
  Award,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { getTrustLabel, normalizeTrustLevel } from '../../services/trust/trustService';
import type { EntityType, TrustLevel } from '../../services/trust/trustService';

export type { TrustLevel, EntityType };

interface TrustBadgeProps {
  level: TrustLevel;
  entityType: EntityType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STYLES = `
  .tb-badge {
    --tb-ink: #0d0f12;
    --tb-ink-2: #3a3d44;
    --tb-ink-3: #6b7280;
    --tb-surface: #f2f0ed;
    --tb-border: rgba(13,15,18,0.08);
    --tb-level-bg: #f2f0ed;
    --tb-level-fg: #3a3d44;
    --tb-level-ring: rgba(13,15,18,0.08);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 999px;
    border: 1px solid var(--tb-level-ring);
    background: var(--tb-level-bg);
    color: var(--tb-level-fg);
    font-weight: 800;
    letter-spacing: 0.01em;
    line-height: 1;
    white-space: nowrap;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .dark-mode .tb-badge {
    --tb-ink: #f0ede8;
    --tb-ink-2: #c9c4bc;
    --tb-ink-3: #8a8580;
    --tb-surface: #252525;
    --tb-border: rgba(255,255,255,0.08);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .tb-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.22);
  }

  .dark-mode .tb-badge:hover {
    box-shadow: 0 4px 14px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .tb-sm {
    min-height: 24px;
    padding: 5px 9px;
    font-size: 11px;
  }

  .tb-md {
    min-height: 30px;
    padding: 7px 11px;
    font-size: 12px;
  }

  .tb-lg {
    min-height: 38px;
    padding: 9px 14px;
    font-size: 14px;
    gap: 8px;
  }

  .tb-icon-only.tb-sm {
    width: 24px;
    padding: 0;
  }

  .tb-icon-only.tb-md {
    width: 30px;
    padding: 0;
  }

  .tb-icon-only.tb-lg {
    width: 38px;
    padding: 0;
  }

  .tb-level-0 {
    --tb-level-bg: rgba(107,114,128,0.12);
    --tb-level-fg: #6b7280;
    --tb-level-ring: rgba(107,114,128,0.18);
  }

  .tb-level-1 {
    --tb-level-bg: rgba(14,165,233,0.12);
    --tb-level-fg: #0284c7;
    --tb-level-ring: rgba(14,165,233,0.22);
  }

  .tb-level-2 {
    --tb-level-bg: rgba(26,92,255,0.12);
    --tb-level-fg: #1a5cff;
    --tb-level-ring: rgba(26,92,255,0.24);
  }

  .tb-level-3 {
    --tb-level-bg: rgba(18,183,106,0.12);
    --tb-level-fg: #12b76a;
    --tb-level-ring: rgba(18,183,106,0.24);
  }

  .tb-level-4 {
    --tb-level-bg: linear-gradient(135deg, rgba(245,158,11,0.20), rgba(255,255,255,0.45));
    --tb-level-fg: #92400e;
    --tb-level-ring: rgba(245,158,11,0.30);
  }

  .dark-mode .tb-level-0 {
    --tb-level-bg: rgba(156,163,175,0.12);
    --tb-level-fg: #9ca3af;
    --tb-level-ring: rgba(156,163,175,0.18);
  }

  .dark-mode .tb-level-1 {
    --tb-level-bg: rgba(14,165,233,0.15);
    --tb-level-fg: #38bdf8;
    --tb-level-ring: rgba(14,165,233,0.22);
  }

  .dark-mode .tb-level-2 {
    --tb-level-bg: rgba(77,127,255,0.16);
    --tb-level-fg: #7da0ff;
    --tb-level-ring: rgba(77,127,255,0.26);
  }

  .dark-mode .tb-level-3 {
    --tb-level-bg: rgba(18,183,106,0.15);
    --tb-level-fg: #32d583;
    --tb-level-ring: rgba(18,183,106,0.24);
  }

  .dark-mode .tb-level-4 {
    --tb-level-bg: linear-gradient(135deg, rgba(245,158,11,0.22), rgba(255,255,255,0.08));
    --tb-level-fg: #fbbf24;
    --tb-level-ring: rgba(245,158,11,0.32);
  }

  .tb-label {
    display: inline-flex;
    align-items: center;
  }
`;

const getIconForLevel = (level: TrustLevel) => {
  const icons = {
    0: Shield,
    1: ShieldCheck,
    2: ShieldCheck,
    3: Award,
    4: Star,
  } as const;

  return icons[level] || Shield;
};

const getIconSize = (size: TrustBadgeProps['size']) => {
  switch (size) {
    case 'sm':
      return 12;
    case 'lg':
      return 18;
    case 'md':
    default:
      return 15;
  }
};

const TrustBadge: React.FC<TrustBadgeProps> = ({
  level,
  entityType,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const safeLevel = normalizeTrustLevel(level);
  const label = getTrustLabel(entityType, safeLevel);
  const Icon = getIconForLevel(safeLevel);
  const iconSize = getIconSize(size);

  return (
    <>
      <style>{STYLES}</style>
      <span
        className={`tb-badge tb-${size} tb-level-${safeLevel}${!showLabel ? ' tb-icon-only' : ''}${className ? ` ${className}` : ''}`}
        title={`Trust Level ${safeLevel}: ${label}`}
        aria-label={`Trust Level ${safeLevel}: ${label}`}
      >
        {safeLevel === 4 ? <Sparkles size={iconSize} /> : <Icon size={iconSize} />}
        {showLabel && <span className="tb-label">{label}</span>}
      </span>
    </>
  );
};

export default TrustBadge;
