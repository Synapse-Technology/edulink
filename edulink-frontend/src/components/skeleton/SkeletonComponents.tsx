/**
 * Skeleton Loading Components
 * Premium placeholder UI while data is loading.
 * Designed for EduLink's calm, trust-first product experience.
 */

import React from 'react';
import { Loader } from 'lucide-react';

const STYLES = `
  .sk-shell {
    --sk-ink: #0d0f12;
    --sk-surface: #f9f8f6;
    --sk-surface-2: #f2f0ed;
    --sk-surface-3: #e8e5e0;
    --sk-border: #e4e1dc;
    --sk-border-2: #d1ccc5;
    --sk-accent: #1a5cff;
    --sk-accent-soft: rgba(26,92,255,0.08);
    --sk-highlight: rgba(255,255,255,0.72);
    --sk-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
    color: var(--sk-ink);
  }

  .dark-mode .sk-shell,
  .sk-shell.dark-mode {
    --sk-ink: #f0ede8;
    --sk-surface: #141414;
    --sk-surface-2: #1c1c1c;
    --sk-surface-3: #252525;
    --sk-border: #2a2a2a;
    --sk-border-2: #353535;
    --sk-accent: #4d7fff;
    --sk-accent-soft: rgba(77,127,255,0.10);
    --sk-highlight: rgba(255,255,255,0.07);
    --sk-shadow: 0 4px 16px rgba(0,0,0,0.30);
  }

  .sk-base {
    position: relative;
    overflow: hidden;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--sk-surface-3), var(--sk-border), var(--sk-surface-3));
    background-size: 220% 100%;
    animation: sk-shimmer 1.35s ease-in-out infinite;
  }

  .sk-base::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, var(--sk-highlight), transparent);
    transform: translateX(-100%);
    animation: sk-sweep 1.35s ease-in-out infinite;
  }

  @keyframes sk-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes sk-sweep {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .sk-card {
    background: var(--sk-surface-2);
    border: 1px solid var(--sk-border);
    border-radius: 20px;
    box-shadow: var(--sk-shadow);
    overflow: hidden;
  }

  .sk-card-body {
    padding: 18px;
  }

  .sk-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sk-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .sk-grid {
    display: grid;
    gap: 14px;
  }

  .sk-grid.metrics {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .sk-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .sk-table-wrap {
    overflow: hidden;
    border: 1px solid var(--sk-border);
    border-radius: 18px;
    background: var(--sk-surface-2);
  }

  .sk-table {
    width: 100%;
    border-collapse: collapse;
  }

  .sk-table th,
  .sk-table td {
    padding: 15px 16px;
    border-bottom: 1px solid var(--sk-border);
  }

  .sk-table th {
    background: var(--sk-surface-3);
  }

  .sk-table tr:last-child td {
    border-bottom: none;
  }

  .sk-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .sk-page {
    padding: 24px;
  }

  .sk-page-inner {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .sk-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 24px;
    align-items: stretch;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--sk-border);
  }

  .sk-spinner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--sk-accent);
  }

  .sk-spinner svg {
    animation: sk-spin 0.85s linear infinite;
  }

  @keyframes sk-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1080px) {
    .sk-grid.metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sk-hero {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 620px) {
    .sk-page {
      padding: 16px;
    }

    .sk-grid.metrics {
      grid-template-columns: 1fr;
    }

    .sk-table th,
    .sk-table td {
      padding: 13px;
    }
  }
`;

type SkeletonProps = {
  className?: string;
  height?: string;
  width?: string;
  radius?: string;
  style?: React.CSSProperties;
};

/**
 * Generic skeleton shimmer effect.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  height = '1rem',
  width = '100%',
  radius,
  style,
}) => (
  <>
    <style>{STYLES}</style>
    <div className="sk-shell">
      <div
        className={`sk-base ${className}`}
        style={{
          height,
          width,
          borderRadius: radius,
          ...style,
        }}
      />
    </div>
  </>
);

/**
 * Text skeleton for paragraphs, titles, and descriptions.
 */
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <>
    <style>{STYLES}</style>
    <div className={`sk-shell sk-stack ${className}`}>
      {[...Array(lines)].map((_, index) => (
        <div
          key={index}
          className="sk-base"
          style={{
            height: index === 0 ? '0.95rem' : '0.78rem',
            width: index === lines - 1 ? '72%' : '100%',
          }}
        />
      ))}
    </div>
  </>
);

/**
 * User/profile card skeleton.
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <>
    <style>{STYLES}</style>
    <div className="sk-shell sk-list">
      {[...Array(count)].map((_, index) => (
        <div key={index} className="sk-card">
          <div className="sk-card-body">
            <div className="sk-row">
              <div className="sk-base" style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0 }} />
              <div className="sk-stack" style={{ flex: 1 }}>
                <div className="sk-base" style={{ width: '44%', height: 14 }} />
                <div className="sk-base" style={{ width: '32%', height: 11 }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);

/**
 * Table skeleton.
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <>
    <style>{STYLES}</style>
    <div className="sk-shell sk-table-wrap">
      <table className="sk-table">
        <thead>
          <tr>
            {[...Array(columns)].map((_, index) => (
              <th key={index}>
                <div className="sk-base" style={{ height: 12, width: index === 0 ? '70%' : '100%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex}>
                  <div
                    className="sk-base"
                    style={{
                      height: 13,
                      width: colIndex === columns - 1 ? '62%' : '100%',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

/**
 * List item skeleton.
 */
export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <>
    <style>{STYLES}</style>
    <div className="sk-shell sk-list">
      {[...Array(count)].map((_, index) => (
        <div key={index} className="sk-card">
          <div className="sk-card-body sk-stack">
            <div className="sk-row" style={{ alignItems: 'flex-start' }}>
              <div className="sk-base" style={{ width: 46, height: 46, borderRadius: 15, flexShrink: 0 }} />
              <div className="sk-stack" style={{ flex: 1 }}>
                <div className="sk-base" style={{ width: '62%', height: 15 }} />
                <div className="sk-base" style={{ width: '92%', height: 12 }} />
                <div className="sk-base" style={{ width: '70%', height: 12 }} />
              </div>
            </div>
            <div className="sk-row" style={{ gap: 8 }}>
              <div className="sk-base" style={{ width: 86, height: 28, borderRadius: 10 }} />
              <div className="sk-base" style={{ width: 74, height: 28, borderRadius: 10 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);

/**
 * Form field skeleton.
 */
export const FormFieldSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <>
    <style>{STYLES}</style>
    <div className="sk-shell sk-form">
      {[...Array(count)].map((_, index) => (
        <div key={index} className="sk-stack" style={{ gap: 8 }}>
          <div className="sk-base" style={{ width: 110, height: 12 }} />
          <div className="sk-base" style={{ width: '100%', height: 42, borderRadius: 13 }} />
        </div>
      ))}
    </div>
  </>
);

/**
 * Dashboard card skeleton.
 */
export const DashboardCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    <style>{STYLES}</style>
    <div className="sk-shell sk-grid metrics">
      {[...Array(count)].map((_, index) => (
        <div key={index} className="sk-card">
          <div className="sk-card-body">
            <div className="sk-row">
              <div className="sk-base" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }} />
              <div className="sk-stack" style={{ flex: 1 }}>
                <div className="sk-base" style={{ width: '48%', height: 11 }} />
                <div className="sk-base" style={{ width: '64%', height: 24 }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);

/**
 * Inline loading spinner.
 */
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 16,
    md: 22,
    lg: 30,
  };

  return (
    <>
      <style>{STYLES}</style>
      <span className="sk-shell sk-spinner" aria-label="Loading" role="status">
        <Loader size={sizes[size]} />
      </span>
    </>
  );
};

/**
 * Full page loading skeleton.
 */
export const PageLoadingSkeleton: React.FC<{ type?: 'list' | 'detail' | 'form' | 'dashboard' }> = ({
  type = 'list',
}) => {
  const hero = (
    <div className="sk-hero">
      <div className="sk-stack" style={{ justifyContent: 'end' }}>
        <div className="sk-base" style={{ width: 120, height: 12 }} />
        <div className="sk-base" style={{ width: '54%', height: 42, borderRadius: 14 }} />
        <div className="sk-base" style={{ width: '76%', height: 14 }} />
        <div className="sk-row" style={{ gap: 10 }}>
          <div className="sk-base" style={{ width: 100, height: 30, borderRadius: 999 }} />
          <div className="sk-base" style={{ width: 120, height: 30, borderRadius: 999 }} />
        </div>
      </div>
      <div className="sk-card">
        <div className="sk-card-body sk-stack">
          <div className="sk-base" style={{ width: 48, height: 48, borderRadius: 16 }} />
          <div className="sk-base" style={{ width: '38%', height: 52, borderRadius: 14 }} />
          <div className="sk-base" style={{ width: '88%', height: 13 }} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="sk-shell sk-page">
        <div className="sk-page-inner">
          {type === 'dashboard' && (
            <>
              {hero}
              <DashboardCardSkeleton count={4} />
              <TableSkeleton rows={5} columns={4} />
            </>
          )}

          {type === 'detail' && (
            <>
              {hero}
              <div className="sk-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}>
                <div className="sk-card"><div className="sk-card-body"><FormFieldSkeleton count={4} /></div></div>
                <div className="sk-card"><div className="sk-card-body"><TextSkeleton lines={6} /></div></div>
              </div>
            </>
          )}

          {type === 'form' && (
            <div className="sk-card" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
              <div className="sk-card-body sk-stack" style={{ padding: 24 }}>
                <div className="sk-base" style={{ width: '46%', height: 34, borderRadius: 12 }} />
                <FormFieldSkeleton count={5} />
                <div className="sk-row" style={{ marginTop: 6 }}>
                  <div className="sk-base" style={{ flex: 1, height: 42, borderRadius: 13 }} />
                  <div className="sk-base" style={{ flex: 1, height: 42, borderRadius: 13 }} />
                </div>
              </div>
            </div>
          )}

          {type === 'list' && (
            <>
              {hero}
              <ListItemSkeleton count={5} />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListItemSkeleton,
  FormFieldSkeleton,
  DashboardCardSkeleton,
  LoadingSpinner,
  PageLoadingSkeleton,
};
