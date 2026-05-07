import React from 'react';

interface LogbookDetailSkeletonProps {
  isDarkMode?: boolean;
}

const LogbookDetailSkeleton: React.FC<LogbookDetailSkeletonProps> = ({ isDarkMode = false }) => {
  const themeClass = isDarkMode ? 'lds-dark' : 'lds-light';

  return (
    <div className={`lds-page ${themeClass}`}>
      <style>{STYLES}</style>

      <div className="lds-shell">
        <div className="lds-breadcrumb">
          <span className="lds-skeleton lds-breadcrumb-line" />
        </div>

        <section className="lds-hero">
          <div className="lds-hero-left">
            <span className="lds-pill-skeleton" />
            <span className="lds-skeleton lds-title-line" />
            <div className="lds-meta-row">
              <span className="lds-skeleton lds-meta-short" />
              <span className="lds-skeleton lds-meta-long" />
            </div>
          </div>

          <div className="lds-hero-actions">
            <span className="lds-skeleton lds-status-pill" />
            <span className="lds-skeleton lds-action-btn" />
          </div>
        </section>

        <div className="lds-grid">
          <main className="lds-main">
            <section className="lds-card lds-timeline-card">
              <div className="lds-card-header">
                <div>
                  <span className="lds-skeleton lds-section-kicker" />
                  <span className="lds-skeleton lds-section-title" />
                </div>
                <span className="lds-skeleton lds-filter-pill" />
              </div>

              <div className="lds-timeline">
                {[0, 1, 2].map((item) => (
                  <article className="lds-entry" key={item}>
                    <span className="lds-entry-node" />

                    <div className="lds-entry-card">
                      <div className="lds-entry-top">
                        <div>
                          <span className="lds-skeleton lds-entry-date" />
                          <span className="lds-skeleton lds-entry-subtitle" />
                        </div>
                        <span className="lds-skeleton lds-entry-badge" />
                      </div>

                      <div className="lds-entry-copy">
                        <span className="lds-skeleton lds-line-full" />
                        <span className="lds-skeleton lds-line-wide" />
                        <span className="lds-skeleton lds-line-small" />
                      </div>

                      <div className="lds-entry-footer">
                        <span className="lds-skeleton lds-mini-chip" />
                        <span className="lds-skeleton lds-mini-chip short" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className="lds-sidebar">
            <section className="lds-card lds-profile-card">
              <span className="lds-skeleton lds-section-kicker" />

              <div className="lds-profile-row">
                <span className="lds-skeleton lds-avatar" />
                <div className="lds-profile-copy">
                  <span className="lds-skeleton lds-profile-name" />
                  <span className="lds-skeleton lds-profile-role" />
                </div>
              </div>

              <div className="lds-divider" />

              <div className="lds-stat-row">
                <span className="lds-skeleton lds-stat-label" />
                <span className="lds-skeleton lds-stat-value" />
              </div>

              <div className="lds-stat-row">
                <span className="lds-skeleton lds-stat-label" />
                <span className="lds-skeleton lds-stat-pill" />
              </div>
            </section>

            <section className="lds-card lds-feedback-card">
              <div className="lds-card-header compact">
                <span className="lds-skeleton lds-section-title small" />
              </div>

              {[0, 1].map((item) => (
                <div className="lds-feedback-note" key={item}>
                  <span className="lds-note-accent" />
                  <div className="lds-note-body">
                    <span className="lds-skeleton lds-note-title" />
                    <span className="lds-skeleton lds-note-line" />
                    <span className="lds-skeleton lds-note-line short" />
                  </div>
                </div>
              ))}
            </section>

            <section className="lds-card lds-progress-card">
              <div className="lds-progress-top">
                <span className="lds-skeleton lds-section-kicker" />
                <span className="lds-skeleton lds-progress-number" />
              </div>
              <div className="lds-progress-track">
                <span className="lds-progress-fill" />
              </div>
              <span className="lds-skeleton lds-progress-copy" />
            </section>

            <span className="lds-skeleton lds-full-action" />
          </aside>
        </div>
      </div>
    </div>
  );
};

const STYLES = `
  .lds-page {
    --lds-ink: #0d0f12;
    --lds-ink-soft: #6b7280;
    --lds-surface: #f9f8f6;
    --lds-surface-2: #f2f0ed;
    --lds-surface-3: #e8e5e0;
    --lds-border: #e4e1dc;
    --lds-border-2: #d1ccc5;
    --lds-accent: #1a5cff;
    --lds-accent-soft: rgba(26, 92, 255, 0.08);
    --lds-success: #12b76a;
    --lds-warning: #f59e0b;
    --lds-radius: 26px;
    --lds-radius-sm: 16px;
    --lds-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
    --lds-shimmer-base: #ebe8e2;
    --lds-shimmer-mid: #f8f7f4;

    color: var(--lds-ink);
  }

  .lds-page.lds-dark {
    --lds-ink: #f0ede8;
    --lds-ink-soft: #8a8580;
    --lds-surface: #141414;
    --lds-surface-2: #1c1c1c;
    --lds-surface-3: #252525;
    --lds-border: #2a2a2a;
    --lds-border-2: #353535;
    --lds-accent: #4d7fff;
    --lds-accent-soft: rgba(77, 127, 255, 0.1);
    --lds-shimmer-base: #242424;
    --lds-shimmer-mid: #343434;
    --lds-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  }

  .lds-shell {
    width: 100%;
    padding: 4px 0 24px;
  }

  .lds-breadcrumb {
    margin-bottom: 18px;
  }

  .lds-hero {
    position: relative;
    overflow: hidden;
    border-radius: var(--lds-radius);
    padding: 24px;
    margin-bottom: 24px;
    background:
      radial-gradient(circle at top left, var(--lds-accent-soft), transparent 42%),
      var(--lds-surface);
    border: 1px solid var(--lds-border);
    box-shadow: var(--lds-shadow);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }

  .lds-hero::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: linear-gradient(90deg, var(--lds-accent), var(--lds-success), transparent);
  }

  .lds-hero-left,
  .lds-profile-copy,
  .lds-note-body {
    display: flex;
    flex-direction: column;
  }

  .lds-hero-left {
    gap: 12px;
    min-width: 0;
    flex: 1;
  }

  .lds-meta-row,
  .lds-hero-actions,
  .lds-entry-top,
  .lds-entry-footer,
  .lds-stat-row,
  .lds-progress-top {
    display: flex;
    align-items: center;
  }

  .lds-meta-row {
    gap: 12px;
    flex-wrap: wrap;
  }

  .lds-hero-actions {
    gap: 10px;
    flex-shrink: 0;
  }

  .lds-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 24px;
    align-items: start;
  }

  .lds-main,
  .lds-sidebar {
    min-width: 0;
  }

  .lds-sidebar {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .lds-card {
    border-radius: var(--lds-radius);
    background: var(--lds-surface);
    border: 1px solid var(--lds-border);
    box-shadow: var(--lds-shadow);
    overflow: hidden;
  }

  .lds-card-header {
    padding: 22px 24px 18px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    border-bottom: 1px solid var(--lds-border);
    background: var(--lds-surface);
  }

  .lds-card-header.compact {
    padding-bottom: 12px;
    border-bottom: 0;
  }

  .lds-timeline {
    padding: 24px 24px 8px;
  }

  .lds-entry {
    position: relative;
    padding-left: 28px;
    padding-bottom: 22px;
    border-left: 2px solid var(--lds-border);
  }

  .lds-entry:last-child {
    padding-bottom: 8px;
  }

  .lds-entry-node {
    position: absolute;
    left: -7px;
    top: 7px;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: var(--lds-accent);
    box-shadow: 0 0 0 5px var(--lds-accent-soft);
  }

  .lds-entry-card {
    padding: 18px;
    border-radius: 20px;
    background: var(--lds-surface-2);
    border: 1px solid var(--lds-border);
  }

  .lds-entry-top {
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .lds-entry-copy {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .lds-entry-footer {
    gap: 9px;
    margin-top: 16px;
  }

  .lds-profile-card,
  .lds-feedback-card,
  .lds-progress-card {
    padding: 20px;
  }

  .lds-profile-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 18px;
  }

  .lds-profile-copy {
    gap: 8px;
    flex: 1;
  }

  .lds-divider {
    height: 1px;
    background: var(--lds-border);
    margin: 20px 0;
  }

  .lds-stat-row {
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 13px;
  }

  .lds-stat-row:last-child {
    margin-bottom: 0;
  }

  .lds-feedback-note {
    position: relative;
    display: grid;
    grid-template-columns: 4px minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background: var(--lds-surface-2);
    border: 1px solid var(--lds-border);
    margin-top: 12px;
  }

  .lds-note-accent {
    width: 4px;
    min-height: 54px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--lds-accent), var(--lds-warning));
  }

  .lds-note-body {
    gap: 8px;
  }

  .lds-progress-card {
    background:
      radial-gradient(circle at top right, var(--lds-accent-soft), transparent 45%),
      var(--lds-surface);
  }

  .lds-progress-top {
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .lds-progress-track {
    height: 10px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--lds-surface-3);
    border: 1px solid var(--lds-border);
    margin-bottom: 14px;
  }

  .lds-progress-fill {
    display: block;
    width: 62%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--lds-accent), var(--lds-success));
    opacity: 0.55;
  }

  .lds-skeleton,
  .lds-pill-skeleton {
    display: block;
    background: linear-gradient(
      90deg,
      var(--lds-shimmer-base) 25%,
      var(--lds-shimmer-mid) 50%,
      var(--lds-shimmer-base) 75%
    );
    background-size: 220% 100%;
    animation: lds-loading 1.45s infinite ease;
  }

  .lds-skeleton {
    border-radius: 10px;
  }

  .lds-pill-skeleton {
    width: 132px;
    height: 24px;
    border-radius: 999px;
  }

  .lds-breadcrumb-line { width: 168px; height: 18px; }
  .lds-title-line { width: min(420px, 100%); height: 36px; border-radius: 14px; }
  .lds-meta-short { width: 118px; height: 16px; }
  .lds-meta-long { width: 176px; height: 16px; }
  .lds-status-pill { width: 108px; height: 38px; border-radius: 999px; }
  .lds-action-btn { width: 128px; height: 42px; border-radius: 15px; }

  .lds-section-kicker { width: 118px; height: 13px; margin-bottom: 10px; }
  .lds-section-title { width: 212px; height: 24px; border-radius: 12px; }
  .lds-section-title.small { width: 168px; height: 20px; }
  .lds-filter-pill { width: 92px; height: 34px; border-radius: 999px; }

  .lds-entry-date { width: 124px; height: 18px; margin-bottom: 8px; }
  .lds-entry-subtitle { width: 168px; height: 14px; }
  .lds-entry-badge { width: 86px; height: 26px; border-radius: 999px; }

  .lds-line-full { width: 100%; height: 14px; }
  .lds-line-wide { width: 88%; height: 14px; }
  .lds-line-small { width: 48%; height: 14px; }

  .lds-mini-chip { width: 92px; height: 26px; border-radius: 999px; }
  .lds-mini-chip.short { width: 68px; }

  .lds-avatar {
    width: 52px;
    height: 52px;
    border-radius: 18px;
  }

  .lds-profile-name { width: 172px; height: 18px; }
  .lds-profile-role { width: 118px; height: 14px; }

  .lds-stat-label { width: 86px; height: 14px; }
  .lds-stat-value { width: 68px; height: 14px; }
  .lds-stat-pill { width: 74px; height: 24px; border-radius: 999px; }

  .lds-note-title { width: 104px; height: 14px; }
  .lds-note-line { width: 100%; height: 14px; }
  .lds-note-line.short { width: 64%; }

  .lds-progress-number { width: 52px; height: 24px; border-radius: 12px; }
  .lds-progress-copy { width: 86%; height: 14px; }

  .lds-full-action {
    width: 100%;
    height: 48px;
    border-radius: 16px;
  }

  @keyframes lds-loading {
    0% { background-position: 220% 0; }
    100% { background-position: -220% 0; }
  }

  @media (max-width: 992px) {
    .lds-grid {
      grid-template-columns: 1fr;
    }

    .lds-sidebar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .lds-full-action {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 680px) {
    .lds-hero {
      padding: 20px;
      border-radius: 22px;
      flex-direction: column;
    }

    .lds-hero-actions {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr;
    }

    .lds-status-pill,
    .lds-action-btn {
      width: 100%;
    }

    .lds-card {
      border-radius: 22px;
    }

    .lds-card-header {
      padding: 20px;
      flex-direction: column;
    }

    .lds-timeline {
      padding: 20px 20px 6px;
    }

    .lds-sidebar {
      grid-template-columns: 1fr;
    }

    .lds-title-line {
      height: 32px;
    }

    .lds-entry {
      padding-left: 22px;
    }

    .lds-entry-card {
      padding: 16px;
      border-radius: 18px;
    }

    .lds-entry-top {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;

export default LogbookDetailSkeleton;